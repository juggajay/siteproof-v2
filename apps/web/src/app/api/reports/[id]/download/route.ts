import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { SupabaseClient } from '@supabase/supabase-js';
import { log } from '@/lib/logger';
import type { ReportQueueEntry, ReportGenerationData } from '@/types/database';

// Supported report formats
const SUPPORTED_FORMATS = ['pdf', 'excel', 'csv', 'json'] as const;
type ReportFormat = (typeof SUPPORTED_FORMATS)[number];

// Type guard for format validation
function isValidFormat(format: string | null): format is ReportFormat {
  return format !== null && SUPPORTED_FORMATS.includes(format as ReportFormat);
}

function coerceDateValue(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  const parsed = new Date(value as string);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function formatDateSafe(
  value: string | Date | null | undefined,
  pattern = 'dd/MM/yyyy',
  fallback = 'N/A'
): string {
  if (!value) {
    return fallback;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  try {
    return format(date, pattern);
  } catch {
    return fallback;
  }
}

function sanitizeFileName(value: string | null | undefined, fallback = 'report'): string {
  const base = (value || '').trim();
  const filtered = base
    // Replace non-ASCII characters with hyphen
    .replace(/[^\x20-\x7E]/g, '-')
    // Collapse spaces
    .replace(/\s+/g, ' ')
    // Remove characters not allowed in filenames
    .replace(/[\\/:*?"<>|]/g, '-')
    .trim();

  const safe = filtered || fallback;
  // Limit length to avoid header issues
  return safe.length > 200 ? safe.slice(0, 200) : safe;
}

// GET /api/reports/[id]/download - Generate and download report directly
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const { id: reportId } = params;
  let reportRecord: ReportQueueEntry | null = null;

  try {
    const supabase = await createClient();

    // Get format from query parameter if provided
    const { searchParams } = new URL(request.url);
    const formatParam = searchParams.get('format');

    // Validate format parameter if provided
    if (formatParam && !isValidFormat(formatParam)) {
      return NextResponse.json(
        {
          error: `Unsupported format: ${formatParam}. Supported formats: ${SUPPORTED_FORMATS.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const formatOverride = formatParam as ReportFormat | null;

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the report details without organization join to avoid RLS issues
    const { data: report, error: reportError } = await supabase
      .from('report_queue')
      .select('*')
      .eq('id', reportId)
      .maybeSingle();

    if (reportError) {
      log.error('Failed to fetch report for download', reportError, { reportId });
      return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 });
    }

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    reportRecord = report as ReportQueueEntry;

    // Fetch organization separately to avoid RLS JOIN issues
    let organizationName = 'Unknown';
    if (report.organization_id) {
      try {
        const { data: org } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', report.organization_id)
          .maybeSingle();

        if (org?.name) {
          organizationName = org.name;
        }
      } catch (orgError) {
        log.warn('Unable to fetch organization name for report download', {
          error: orgError,
          reportId,
          organizationId: report.organization_id,
        });
      }
    }

    // Add organization name to report object for compatibility
    report.organization = { name: organizationName };

    // Use format override from query parameter if provided, otherwise use report's format
    const finalFormat = formatOverride || report.format;
    log.debug('Report download started', {
      reportId,
      reportType: report.report_type,
      dbFormat: report.format,
      formatOverride,
      finalFormat,
    });

    // If the report is still being processed, inform the caller
    if (report.status === 'queued' || report.status === 'processing') {
      return NextResponse.json(
        {
          error: 'Report is still being generated. Please try again shortly.',
          status: report.status,
          progress: report.progress,
        },
        { status: 202 }
      );
    }

    // Check if report can be generated
    if (report.status === 'failed') {
      return NextResponse.json(
        {
          error: report.error_message || 'Report generation failed',
        },
        { status: 400 }
      );
    }

    if (report.report_type === 'daily_diary_entry') {
      return downloadDailyDiaryEntry(report, supabase);
    }

    // Handle ITP reports differently
    if (report.report_type === 'itp_report') {
      return generateITPReport(report, supabase);
    }

    if (report.report_type === 'financial_summary') {
      return downloadFinancialSummaryReport({
        report,
        supabase,
        format: finalFormat,
      });
    }
    // Normalize parameters to support legacy payloads
    const parameters = report.parameters ?? {};
    const projectId = parameters.project_id ?? parameters.projectId;
    const rawDateRange = parameters.date_range ?? parameters.dateRange;
    const rawStart = rawDateRange?.start ?? rawDateRange?.from ?? rawDateRange?.date ?? null;
    const rawEnd = rawDateRange?.end ?? rawDateRange?.to ?? rawDateRange?.date ?? rawStart ?? null;
    const normalizedStart = coerceDateValue(rawStart);
    const normalizedEnd = coerceDateValue(rawEnd) ?? normalizedStart;
    const normalizedDateRange = normalizedStart
      ? {
          start: normalizedStart,
          end: normalizedEnd ?? normalizedStart,
        }
      : null;

    if (!projectId) {
      log.error('Report download missing project_id parameter', { reportId, parameters });
      return NextResponse.json(
        { error: 'Report is missing required project information' },
        { status: 400 }
      );
    }

    if (!normalizedDateRange?.start) {
      log.error('Report download missing date_range.start parameter', { reportId, parameters });
      return NextResponse.json(
        { error: 'Report is missing required date range information' },
        { status: 400 }
      );
    }

    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Fetch report data
    const [diariesResult, inspectionsResult, ncrsResult] = await Promise.all([
      supabase
        .from('daily_diaries')
        .select('*')
        .eq('project_id', projectId)
        .gte('diary_date', normalizedDateRange.start)
        .lte('diary_date', normalizedDateRange.end),

      supabase
        .from('inspections')
        .select('*')
        .eq('project_id', projectId)
        .gte('created_at', normalizedDateRange.start)
        .lte('created_at', normalizedDateRange.end),

      supabase
        .from('ncrs')
        .select('*')
        .eq('project_id', projectId)
        .gte('created_at', normalizedDateRange.start)
        .lte('created_at', normalizedDateRange.end),
    ]);

    const diaries = diariesResult.data || [];
    const inspections = inspectionsResult.data || [];
    const ncrs = ncrsResult.data || [];

    if (diariesResult.error || inspectionsResult.error || ncrsResult.error) {
      log.error('Failed to load report source data', {
        reportId,
        projectId,
        diaryError: diariesResult.error,
        inspectionError: inspectionsResult.error,
        ncrError: ncrsResult.error,
      });
      return NextResponse.json(
        { error: 'Failed to load project data for report' },
        { status: 500 }
      );
    }

    log.debug('Report download source data loaded', {
      reportId,
      projectId,
      diaryCount: diaries.length,
      inspectionCount: inspections.length,
      ncrCount: ncrs.length,
      normalizedDateRange,
    });

    // Generate report based on format
    let fileBuffer: Buffer;
    let fileName: string;
    let mimeType: string;
    const extensionMap: Record<ReportFormat, string> = {
      pdf: 'pdf',
      excel: 'xlsx',
      csv: 'csv',
      json: 'json',
    };

    switch (finalFormat) {
      case 'pdf':
        fileBuffer = await generateSimplePDF({
          project,
          organization: report.organization?.name || 'Unknown',
          dateRange: normalizedDateRange,
          diaries,
          inspections,
          ncrs,
        });
        fileName = `${report.report_name}.pdf`;
        mimeType = 'application/pdf';
        break;

      case 'excel':
        fileBuffer = generateExcel({
          project,
          organization: report.organization?.name || 'Unknown',
          dateRange: normalizedDateRange,
          diaries,
          inspections,
          ncrs,
        });
        fileName = `${report.report_name}.xlsx`;
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;

      case 'csv':
        fileBuffer = generateCSV({
          project,
          diaries,
          inspections,
          ncrs,
        });
        fileName = `${report.report_name}.csv`;
        mimeType = 'text/csv';
        break;

      case 'json':
        fileBuffer = Buffer.from(
          JSON.stringify(
            {
              project,
              diaries,
              inspections,
              ncrs,
            },
            null,
            2
          )
        );
        fileName = `${report.report_name}.json`;
        mimeType = 'application/json';
        break;

      default:
        return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
    }

    const safeReportName = sanitizeFileName(report.report_name);
    const fileExtension = extensionMap[finalFormat as ReportFormat];
    fileName = `${safeReportName}.${fileExtension}`;
    // Return the file directly as a response
    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${sanitizeFileName(fileName, fileName)}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    log.error('Error generating report download', error, {
      reportId,
      reportType: reportRecord?.report_type,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function generateSimplePDF(data: ReportGenerationData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
  const { width, height } = page.getSize();

  const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  let y = height - 50;

  // Title
  page.drawText('Project Summary Report', {
    x: 50,
    y,
    size: 24,
    font: titleFont,
    color: rgb(0, 0, 0),
  });
  y -= 40;

  // Project info
  page.drawText(`Project: ${data.project.name}`, {
    x: 50,
    y,
    size: 14,
    font: titleFont,
    color: rgb(0, 0, 0),
  });
  y -= 20;

  page.drawText(`Organization: ${data.organization}`, {
    x: 50,
    y,
    size: 12,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });
  y -= 20;

  const periodLabel = `${formatDateSafe(data.dateRange.start)} to ${formatDateSafe(
    data.dateRange.end
  )}`;
  page.drawText(`Period: ${periodLabel}`, {
    x: 50,
    y,
    size: 12,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });
  y -= 30;

  // Line separator
  page.drawLine({
    start: { x: 50, y },
    end: { x: width - 50, y },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });
  y -= 30;

  // Statistics
  page.drawText('Statistics', {
    x: 50,
    y,
    size: 16,
    font: titleFont,
    color: rgb(0, 0, 0),
  });
  y -= 25;

  const stats = [
    `Daily Diaries: ${data.diaries.length}`,
    `Inspections: ${data.inspections.length}`,
    `NCRs: ${data.ncrs.length}`,
  ];

  for (const stat of stats) {
    page.drawText(stat, {
      x: 70,
      y,
      size: 12,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 20;
  }

  // Recent Daily Diaries
  if (data.diaries.length > 0) {
    y -= 20;
    page.drawText('Recent Daily Diaries', {
      x: 50,
      y,
      size: 16,
      font: titleFont,
      color: rgb(0, 0, 0),
    });
    y -= 25;

    const recentDiaries = data.diaries.slice(0, 5);
    for (const diary of recentDiaries) {
      page.drawText(
        `• ${formatDateSafe(diary.diary_date)} - ${diary.activities || 'No activities'}`.substring(
          0,
          80
        ),
        {
          x: 70,
          y,
          size: 10,
          font,
          color: rgb(0.3, 0.3, 0.3),
        }
      );
      y -= 18;
    }
  }

  // Footer
  page.drawText(`Generated on ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, {
    x: 50,
    y: 30,
    size: 9,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

function generateExcel(data: ReportGenerationData): Buffer {
  const workbook = XLSX.utils.book_new();

  // Summary sheet
  const summaryData = [
    ['Project Summary Report'],
    [],
    ['Project:', data.project.name],
    ['Organization:', data.organization],
    ['Period:', `${formatDateSafe(data.dateRange.start)} to ${formatDateSafe(data.dateRange.end)}`],
    [],
    ['Statistics'],
    ['Daily Diaries:', data.diaries.length],
    ['Inspections:', data.inspections.length],
    ['NCRs:', data.ncrs.length],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Daily Diaries sheet
  if (data.diaries.length > 0) {
    const diarySheet = XLSX.utils.json_to_sheet(
      data.diaries.map((d: any) => ({
        Date: formatDateSafe(d.diary_date),
        Activities: d.activities || 'N/A',
        Workers: d.workforce_count || 0,
      }))
    );
    XLSX.utils.book_append_sheet(workbook, diarySheet, 'Daily Diaries');
  }

  // Inspections sheet
  if (data.inspections.length > 0) {
    const inspectionSheet = XLSX.utils.json_to_sheet(
      data.inspections.map((i: any) => ({
        Date: formatDateSafe(i.created_at),
        Status: i.status,
        Result: i.result || 'N/A',
      }))
    );
    XLSX.utils.book_append_sheet(workbook, inspectionSheet, 'Inspections');
  }

  // NCRs sheet
  if (data.ncrs.length > 0) {
    const ncrSheet = XLSX.utils.json_to_sheet(
      data.ncrs.map((n: any) => ({
        'NCR Number': n.ncr_number,
        Title: n.title,
        Status: n.status,
        Severity: n.severity,
        'Created Date': formatDateSafe(n.created_at),
      }))
    );
    XLSX.utils.book_append_sheet(workbook, ncrSheet, 'NCRs');
  }

  const output = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return Buffer.from(output as ArrayBuffer);
}

function generateCSV(data: Omit<ReportGenerationData, 'organization' | 'dateRange'>): Buffer {
  const rows: string[] = [];

  rows.push('Project Summary Report');
  rows.push(`Project: ${data.project.name}`);
  rows.push('');

  rows.push('Statistics');
  rows.push(`Daily Diaries,${data.diaries.length}`);
  rows.push(`Inspections,${data.inspections.length}`);
  rows.push(`NCRs,${data.ncrs.length}`);
  rows.push('');

  if (data.diaries.length > 0) {
    rows.push('Daily Diaries');
    rows.push('Date,Activities,Workers');
    data.diaries.forEach((d: any) => {
      const date = formatDateSafe(d.diary_date);
      const activities = (d.activities || 'N/A').replace(/,/g, ';');
      rows.push(`${date},"${activities}",${d.workforce_count || 0}`);
    });
  }

  return Buffer.from(rows.join('\n'));
}

async function generateITPReport(
  report: ReportQueueEntry,
  _supabase: SupabaseClient
): Promise<NextResponse> {
  try {
    // For ITP reports, generate a simple PDF summary
    const { lot_number, project_name, organization_name, itp_instances } = report.parameters;

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
    const { width, height } = page.getSize();

    const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    let y = height - 50;

    // Title
    page.drawText('ITP Report', {
      x: 50,
      y,
      size: 24,
      font: titleFont,
      color: rgb(0, 0, 0),
    });
    y -= 40;

    // Project and Lot info
    page.drawText(`Project: ${project_name || 'Unknown'}`, {
      x: 50,
      y,
      size: 14,
      font: titleFont,
      color: rgb(0, 0, 0),
    });
    y -= 25;

    page.drawText(`Lot Number: ${lot_number || 'N/A'}`, {
      x: 50,
      y,
      size: 12,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
    y -= 20;

    page.drawText(`Organization: ${organization_name || 'Unknown'}`, {
      x: 50,
      y,
      size: 12,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
    y -= 30;

    // Line separator
    page.drawLine({
      start: { x: 50, y },
      end: { x: width - 50, y },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });
    y -= 30;

    // ITP Summary
    page.drawText('Inspection Summary', {
      x: 50,
      y,
      size: 16,
      font: titleFont,
      color: rgb(0, 0, 0),
    });
    y -= 25;

    if (itp_instances && itp_instances.length > 0) {
      page.drawText(`Total Inspections: ${itp_instances.length}`, {
        x: 70,
        y,
        size: 12,
        font,
        color: rgb(0.2, 0.2, 0.2),
      });
      y -= 20;

      const completed = itp_instances.filter(
        (i: any) => i.inspection_status === 'completed'
      ).length;
      page.drawText(`Completed: ${completed}`, {
        x: 70,
        y,
        size: 12,
        font,
        color: rgb(0.2, 0.2, 0.2),
      });
      y -= 30;

      // List ITPs
      page.drawText('Inspection Details:', {
        x: 50,
        y,
        size: 14,
        font: titleFont,
        color: rgb(0, 0, 0),
      });
      y -= 25;

      for (const itp of itp_instances.slice(0, 10)) {
        // Show first 10
        const date = formatDateSafe(itp.inspection_date);
        const name = itp.template_name || 'Unnamed Inspection';
        const status = itp.inspection_status || 'pending';

        page.drawText(`• ${name}`, {
          x: 70,
          y,
          size: 11,
          font: titleFont,
          color: rgb(0.1, 0.1, 0.1),
        });
        y -= 18;

        page.drawText(`  Date: ${date} | Status: ${status}`, {
          x: 70,
          y,
          size: 10,
          font,
          color: rgb(0.4, 0.4, 0.4),
        });
        y -= 22;

        if (y < 100) break; // Stop if running out of space
      }
    } else {
      page.drawText('No inspection data available', {
        x: 70,
        y,
        size: 12,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
    }

    // Footer
    page.drawText(`Generated on ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, {
      x: 50,
      y: 30,
      size: 9,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });

    const pdfBytes = await pdfDoc.save();
    const fileBuffer = Buffer.from(pdfBytes);

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${report.report_name}.pdf"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    log.error('Error generating ITP report', error, { reportId: report.id });
    return NextResponse.json({ error: 'Failed to generate ITP report' }, { status: 500 });
  }
}
async function downloadDailyDiaryEntry(report: ReportQueueEntry, supabase: SupabaseClient) {
  try {
    const diaryId = report.parameters?.diary_id;
    const projectId = report.parameters?.project_id ?? (report.parameters as any)?.projectId;
    const projectName = report.parameters?.project_name || 'Unknown Project';

    if (!diaryId || !projectId) {
      return NextResponse.json(
        { error: 'Diary reference is missing from report parameters' },
        { status: 400 }
      );
    }

    const { data: diary, error: diaryError } = await supabase
      .from('daily_diaries')
      .select('*')
      .eq('id', diaryId)
      .eq('project_id', projectId)
      .single();

    if (diaryError || !diary) {
      return NextResponse.json({ error: 'Diary not found' }, { status: 404 });
    }

    const [{ data: labour }, { data: plant }, { data: materials }] = await Promise.all([
      supabase.from('diary_labour_entries').select('*').eq('diary_id', diaryId),
      supabase.from('diary_plant_entries').select('*').eq('diary_id', diaryId),
      supabase.from('diary_material_entries').select('*').eq('diary_id', diaryId),
    ]);

    // Handle non-PDF formats
    if (report.format === 'json') {
      const diaryData = {
        diary,
        labour_entries: labour || [],
        plant_entries: plant || [],
        material_entries: materials || [],
      };

      const jsonBuffer = Buffer.from(JSON.stringify(diaryData, null, 2));
      const filename = (report.report_name || 'daily-diary') + '.json';

      return new NextResponse(jsonBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': jsonBuffer.length.toString(),
        },
      });
    }

    if (report.format === 'csv' || report.format === 'excel') {
      const wb = XLSX.utils.book_new();

      // Diary Info Sheet
      const diaryInfo = [
        ['Field', 'Value'],
        ['Diary Number', diary.diary_number || ''],
        ['Date', diary.diary_date || ''],
        ['Project', projectName],
        ['Weather Conditions', diary.weather?.conditions || ''],
        ['Temperature Min', diary.weather?.temperature?.min || ''],
        ['Temperature Max', diary.weather?.temperature?.max || ''],
        ['Wind', diary.weather?.wind || ''],
        ['Site Conditions', diary.site_conditions || ''],
        ['Access Issues', diary.access_issues || ''],
        ['Work Summary', diary.work_summary || ''],
        ['Total Workers', diary.total_workers || 0],
        ['Trades', Array.isArray(diary.trades_on_site) ? diary.trades_on_site.join(', ') : ''],
        ['General Notes', diary.general_notes || ''],
        ['Planned Work Tomorrow', diary.planned_work_tomorrow || ''],
      ];
      const diarySheet = XLSX.utils.aoa_to_sheet(diaryInfo);
      XLSX.utils.book_append_sheet(wb, diarySheet, 'Diary Info');

      // Labour Entries Sheet
      if (labour && labour.length > 0) {
        const labourSheet = XLSX.utils.json_to_sheet(labour);
        XLSX.utils.book_append_sheet(wb, labourSheet, 'Labour');
      }

      // Plant Entries Sheet
      if (plant && plant.length > 0) {
        const plantSheet = XLSX.utils.json_to_sheet(plant);
        XLSX.utils.book_append_sheet(wb, plantSheet, 'Plant');
      }

      // Material Entries Sheet
      if (materials && materials.length > 0) {
        const materialsSheet = XLSX.utils.json_to_sheet(materials);
        XLSX.utils.book_append_sheet(wb, materialsSheet, 'Materials');
      }

      const excelBuffer = XLSX.write(wb, {
        type: 'buffer',
        bookType: report.format === 'excel' ? 'xlsx' : 'csv',
      }) as Buffer;
      const fileBuffer = excelBuffer;
      const extension = report.format === 'excel' ? 'xlsx' : 'csv';
      const filename = (report.report_name || 'daily-diary') + '.' + extension;
      const mimeType =
        report.format === 'excel'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/csv';

      return new NextResponse(new Uint8Array(fileBuffer), {
        status: 200,
        headers: {
          'Content-Type': mimeType,
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': fileBuffer.length.toString(),
        },
      });
    }

    // Generate comprehensive PDF with all diary data
    const pdfDoc = await PDFDocument.create();
    let currentPage = pdfDoc.addPage([595.28, 841.89]); // A4 size
    const { width, height } = currentPage.getSize();

    const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    let y = height - 50;

    const addNewPageIfNeeded = (requiredSpace: number) => {
      if (y < requiredSpace) {
        currentPage = pdfDoc.addPage([595.28, 841.89]);
        y = height - 50;
        return true;
      }
      return false;
    };

    const drawText = (text: string, options: any) => {
      currentPage.drawText(text, { ...options, y });
    };

    const drawLine = () => {
      currentPage.drawLine({
        start: { x: 50, y },
        end: { x: width - 50, y },
        thickness: 1,
        color: rgb(0.8, 0.8, 0.8),
      });
    };

    // Header
    drawText('DAILY DIARY REPORT', {
      x: 50,
      size: 24,
      font: titleFont,
      color: rgb(0, 0, 0),
    });
    y -= 40;

    drawText(`Project: ${projectName}`, {
      x: 50,
      size: 14,
      font: titleFont,
      color: rgb(0, 0, 0),
    });
    y -= 25;

    const diaryDate = formatDateSafe(diary.diary_date, 'EEEE, dd MMMM yyyy');
    drawText(`Date: ${diaryDate}`, {
      x: 50,
      size: 12,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
    y -= 18;

    drawText(`Diary Number: ${diary.diary_number || 'N/A'}`, {
      x: 50,
      size: 12,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
    y -= 25;

    drawLine();
    y -= 25;

    // Weather Conditions
    addNewPageIfNeeded(100);
    drawText('WEATHER CONDITIONS', {
      x: 50,
      size: 14,
      font: titleFont,
      color: rgb(0, 0, 0),
    });
    y -= 20;

    if (diary.weather) {
      if (diary.weather.conditions) {
        drawText(`Conditions: ${diary.weather.conditions}`, {
          x: 70,
          size: 11,
          font,
          color: rgb(0.2, 0.2, 0.2),
        });
        y -= 16;
      }
      if (diary.weather.temperature) {
        const temp = diary.weather.temperature;
        drawText(`Temperature: ${temp.min}°C - ${temp.max}°C`, {
          x: 70,
          size: 11,
          font,
          color: rgb(0.2, 0.2, 0.2),
        });
        y -= 16;
      }
      if (diary.weather.wind) {
        drawText(`Wind: ${diary.weather.wind}`, {
          x: 70,
          size: 11,
          font,
          color: rgb(0.2, 0.2, 0.2),
        });
        y -= 16;
      }
    }
    if (diary.weather_notes) {
      drawText(`Notes: ${String(diary.weather_notes).substring(0, 80)}`, {
        x: 70,
        size: 11,
        font,
        color: rgb(0.2, 0.2, 0.2),
      });
      y -= 16;
    }
    y -= 10;

    // Site Conditions
    addNewPageIfNeeded(80);
    drawText('SITE CONDITIONS', {
      x: 50,
      size: 14,
      font: titleFont,
      color: rgb(0, 0, 0),
    });
    y -= 20;

    if (diary.site_conditions) {
      const lines = String(diary.site_conditions).match(/.{1,75}/g) || [
        String(diary.site_conditions),
      ];
      for (const line of lines.slice(0, 3)) {
        drawText(line, {
          x: 70,
          size: 11,
          font,
          color: rgb(0.2, 0.2, 0.2),
        });
        y -= 16;
      }
    } else {
      drawText('No site conditions recorded', {
        x: 70,
        size: 11,
        font: font,
        color: rgb(0.5, 0.5, 0.5),
      });
      y -= 16;
    }
    y -= 10;

    // Access Issues
    if (diary.access_issues) {
      addNewPageIfNeeded(60);
      drawText('ACCESS ISSUES', {
        x: 50,
        size: 14,
        font: titleFont,
        color: rgb(0, 0, 0),
      });
      y -= 20;

      const lines = String(diary.access_issues).match(/.{1,75}/g) || [String(diary.access_issues)];
      for (const line of lines.slice(0, 2)) {
        drawText(line, {
          x: 70,
          size: 11,
          font,
          color: rgb(0.2, 0.2, 0.2),
        });
        y -= 16;
      }
      y -= 10;
    }

    // Work Summary
    addNewPageIfNeeded(80);
    drawText('WORK SUMMARY', {
      x: 50,
      size: 14,
      font: titleFont,
      color: rgb(0, 0, 0),
    });
    y -= 20;

    if (diary.work_summary) {
      const lines = String(diary.work_summary).match(/.{1,75}/g) || [String(diary.work_summary)];
      for (const line of lines.slice(0, 5)) {
        addNewPageIfNeeded(50);
        drawText(line, {
          x: 70,
          size: 11,
          font,
          color: rgb(0.2, 0.2, 0.2),
        });
        y -= 16;
      }
    } else {
      drawText('No work summary recorded', {
        x: 70,
        size: 11,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
      y -= 16;
    }
    y -= 10;

    // Workforce Summary
    addNewPageIfNeeded(60);
    drawText('WORKFORCE', {
      x: 50,
      size: 14,
      font: titleFont,
      color: rgb(0, 0, 0),
    });
    y -= 20;

    drawText(`Total Workers: ${diary.total_workers || 0}`, {
      x: 70,
      size: 11,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 16;

    if (
      diary.trades_on_site &&
      Array.isArray(diary.trades_on_site) &&
      diary.trades_on_site.length > 0
    ) {
      drawText(`Trades: ${diary.trades_on_site.join(', ')}`, {
        x: 70,
        size: 11,
        font,
        color: rgb(0.2, 0.2, 0.2),
      });
      y -= 16;
    }
    y -= 10;

    // Labour Entries
    if (labour && labour.length > 0) {
      addNewPageIfNeeded(80);
      drawText('LABOUR ENTRIES', {
        x: 50,
        size: 14,
        font: titleFont,
        color: rgb(0, 0, 0),
      });
      y -= 20;

      for (const entry of labour) {
        addNewPageIfNeeded(50);
        const trade = entry.trade || 'N/A';
        const hours = entry.total_hours || 0;
        const company = entry.company_id ? ' (Subcontractor)' : '';
        drawText(`• ${trade}${company} - ${hours} hours`, {
          x: 70,
          size: 11,
          font,
          color: rgb(0.2, 0.2, 0.2),
        });
        y -= 16;
      }
      y -= 10;
    }

    // Plant & Equipment
    if (plant && plant.length > 0) {
      addNewPageIfNeeded(80);
      drawText('PLANT & EQUIPMENT', {
        x: 50,
        size: 14,
        font: titleFont,
        color: rgb(0, 0, 0),
      });
      y -= 20;

      for (const entry of plant) {
        addNewPageIfNeeded(50);
        const name = entry.equipment_name || 'Unknown';
        const hours = entry.total_hours || 0;
        drawText(`• ${name} - ${hours} hours`, {
          x: 70,
          size: 11,
          font,
          color: rgb(0.2, 0.2, 0.2),
        });
        y -= 16;
      }
      y -= 10;
    }

    // Materials
    if (materials && materials.length > 0) {
      addNewPageIfNeeded(80);
      drawText('MATERIALS DELIVERED', {
        x: 50,
        size: 14,
        font: titleFont,
        color: rgb(0, 0, 0),
      });
      y -= 20;

      for (const entry of materials) {
        addNewPageIfNeeded(50);
        const name = entry.material_name || 'Unknown';
        const quantity = entry.quantity || 0;
        const unit = entry.unit_of_measure || '';
        drawText(`• ${name} - ${quantity} ${unit}`, {
          x: 70,
          size: 11,
          font,
          color: rgb(0.2, 0.2, 0.2),
        });
        y -= 16;
      }
      y -= 10;
    }

    // Safety & Inspections
    if (
      diary.safety_incidents &&
      Array.isArray(diary.safety_incidents) &&
      diary.safety_incidents.length > 0
    ) {
      addNewPageIfNeeded(80);
      drawText('SAFETY INCIDENTS', {
        x: 50,
        size: 14,
        font: titleFont,
        color: rgb(0.8, 0, 0),
      });
      y -= 20;

      drawText(`Total Incidents: ${diary.safety_incidents.length}`, {
        x: 70,
        size: 11,
        font,
        color: rgb(0.2, 0.2, 0.2),
      });
      y -= 20;
    }

    if (diary.inspections && Array.isArray(diary.inspections) && diary.inspections.length > 0) {
      addNewPageIfNeeded(60);
      drawText(`Inspections: ${diary.inspections.length} completed`, {
        x: 70,
        size: 11,
        font,
        color: rgb(0.2, 0.2, 0.2),
      });
      y -= 20;
    }

    // Notes
    if (diary.general_notes) {
      addNewPageIfNeeded(80);
      drawText('GENERAL NOTES', {
        x: 50,
        size: 14,
        font: titleFont,
        color: rgb(0, 0, 0),
      });
      y -= 20;

      const lines = String(diary.general_notes).match(/.{1,75}/g) || [String(diary.general_notes)];
      for (const line of lines.slice(0, 4)) {
        addNewPageIfNeeded(50);
        drawText(line, {
          x: 70,
          size: 11,
          font,
          color: rgb(0.2, 0.2, 0.2),
        });
        y -= 16;
      }
      y -= 10;
    }

    if (diary.tomorrow_planned_work || diary.notes_for_tomorrow) {
      addNewPageIfNeeded(80);
      drawText('PLANNED WORK FOR TOMORROW', {
        x: 50,
        size: 14,
        font: titleFont,
        color: rgb(0, 0, 0),
      });
      y -= 20;

      const tomorrowNotes = diary.tomorrow_planned_work || diary.notes_for_tomorrow;
      const lines = String(tomorrowNotes).match(/.{1,75}/g) || [String(tomorrowNotes)];
      for (const line of lines.slice(0, 4)) {
        addNewPageIfNeeded(50);
        drawText(line, {
          x: 70,
          size: 11,
          font,
          color: rgb(0.2, 0.2, 0.2),
        });
        y -= 16;
      }
    }

    // Footer on every page
    const pages = pdfDoc.getPages();
    pages.forEach((page, index) => {
      page.drawText(`Page ${index + 1} of ${pages.length}`, {
        x: width / 2 - 30,
        y: 30,
        size: 9,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
      page.drawText(`Generated on ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, {
        x: 50,
        y: 30,
        size: 9,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
    });

    const pdfBytes = await pdfDoc.save();
    const fileBuffer = Buffer.from(pdfBytes);
    const filename = (report.report_name || 'daily-diary') + '.pdf';

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    log.error('Error generating daily diary PDF', error);
    return NextResponse.json({ error: 'Failed to generate daily diary PDF' }, { status: 500 });
  }
}

type FinancialSummaryDateRange = {
  start: string;
  end: string;
};

type FinancialSummaryTotals = {
  labourHours: number;
  labourCost: number;
  plantHours: number;
  plantCost: number;
  materialCost: number;
  materialQuantity: number;
  totalCost: number;
};

type FinancialSummaryLabourEntry = {
  id: string;
  workerId: string | null;
  workerName: string;
  company: string | null;
  jobTitle: string | null;
  hoursWorked: number;
  hourlyRate: number;
  cost: number;
  notes: string | null;
};

type FinancialSummaryPlantEntry = {
  id: string;
  plantId: string | null;
  plantName: string;
  company: string | null;
  hoursUsed: number;
  hourlyRate: number;
  cost: number;
  notes: string | null;
};

type FinancialSummaryMaterialEntry = {
  id: string;
  materialId: string | null;
  materialName: string;
  supplierName: string | null;
  quantity: number;
  unit: string | null;
  unitCost: number;
  totalCost: number;
  notes: string | null;
};

type FinancialSummaryDiary = {
  id: string;
  diaryDate: string;
  diaryNumber: string | null | undefined;
  workSummary: string | null | undefined;
  labour: FinancialSummaryLabourEntry[];
  plant: FinancialSummaryPlantEntry[];
  materials: FinancialSummaryMaterialEntry[];
  totals: FinancialSummaryTotals;
};

type FinancialSummaryData = {
  project: any;
  organization: string;
  dateRange: FinancialSummaryDateRange;
  totals: FinancialSummaryTotals;
  diaries: FinancialSummaryDiary[];
};

async function downloadFinancialSummaryReport({
  report,
  supabase,
  format,
}: {
  report: any;
  supabase: SupabaseClient;
  format: 'pdf' | 'excel' | 'csv' | 'json';
}) {
  try {
    const parameters = (report.parameters || {}) as {
      project_id?: string;
      projectId?: string;
      date_range?: { start?: string; end?: string; from?: string; to?: string; date?: string };
      dateRange?: { start?: string; end?: string; from?: string; to?: string; date?: string };
    };

    const projectId = parameters.project_id ?? parameters.projectId;
    const rawDateRange = parameters.date_range ?? parameters.dateRange;
    const rawStart = rawDateRange?.start ?? rawDateRange?.from ?? rawDateRange?.date ?? null;
    const rawEnd = rawDateRange?.end ?? rawDateRange?.to ?? rawDateRange?.date ?? rawStart ?? null;
    const startDate = coerceDateValue(rawStart);
    const endDate = coerceDateValue(rawEnd) ?? startDate;

    if (!projectId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Financial reports require project_id and date_range parameters' },
        { status: 400 }
      );
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, client_name, code')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      log.error('Financial report project lookup failed', projectError, { projectId });
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const { data: diaries, error: diariesError } = await supabase
      .from('daily_diaries')
      .select('id, diary_number, diary_date, work_summary')
      .eq('project_id', projectId)
      .gte('diary_date', startDate)
      .lte('diary_date', endDate)
      .order('diary_date', { ascending: true });

    if (diariesError) {
      log.error('Financial report diary lookup failed', diariesError, {
        projectId,
        startDate,
        endDate,
      });
      return NextResponse.json(
        { error: 'Failed to load diary entries for financial report' },
        { status: 500 }
      );
    }

    const diaryList = diaries || [];
    const diaryIds = diaryList.map((d: any) => d.id);

    let laborEntries: any[] = [];
    let plantEntries: any[] = [];
    let materialEntries: any[] = [];

    if (diaryIds.length > 0) {
      const [laborResult, plantResult, materialResult] = await Promise.all([
        supabase
          .from('diary_labor')
          .select(
            `
            id,
            diary_id,
            hours_worked,
            notes,
            worker:workers(
              id,
              name,
              full_name,
              first_name,
              last_name,
              job_title,
              role,
              hourly_rate,
              standard_hourly_rate,
              contractor:contractors(name)
            )
          `
          )
          .in('diary_id', diaryIds),
        supabase
          .from('diary_plant')
          .select(
            `
            id,
            diary_id,
            hours_used,
            total_hours,
            hourly_rate,
            notes,
            name,
            plant_item:plant_items(
              id,
              name,
              hourly_rate,
              standard_hourly_rate,
              contractor:contractors(name)
            )
          `
          )
          .in('diary_id', diaryIds),
        supabase
          .from('diary_materials')
          .select(
            `
            id,
            diary_id,
            material_id,
            material_name,
            quantity,
            unit,
            unit_cost,
            notes,
            supplier_name,
            material:materials(
              id,
              name,
              unit_cost,
              unit_of_measure,
              costs:material_costs(unit_cost, effective_from, created_at)
            )
          `
          )
          .in('diary_id', diaryIds),
      ]);

      if (laborResult.error) {
        log.error('Financial report labour lookup failed', laborResult.error);
        return NextResponse.json(
          { error: 'Failed to load labour data for financial report' },
          { status: 500 }
        );
      }

      if (plantResult.error) {
        log.error('Financial report plant lookup failed', plantResult.error);
        return NextResponse.json(
          { error: 'Failed to load plant data for financial report' },
          { status: 500 }
        );
      }

      if (materialResult.error) {
        log.error('Financial report materials lookup failed', materialResult.error);
        return NextResponse.json(
          { error: 'Failed to load materials data for financial report' },
          { status: 500 }
        );
      }

      laborEntries = laborResult.data || [];
      plantEntries = plantResult.data || [];
      materialEntries = materialResult.data || [];
    }

    const reportData = buildFinancialSummaryData({
      project,
      organizationName: report.organization?.name || 'Unknown',
      dateRange: { start: startDate, end: endDate },
      diaries: diaryList,
      laborEntries,
      plantEntries,
      materialEntries,
    });

    let fileBuffer: Buffer;
    let fileName: string;
    let mimeType: string;

    switch (format) {
      case 'pdf':
        fileBuffer = await generateFinancialSummaryPDF(reportData);
        fileName = `${report.report_name || 'financial-summary'}.pdf`;
        mimeType = 'application/pdf';
        break;
      case 'excel':
        fileBuffer = generateFinancialSummaryExcel(reportData);
        fileName = `${report.report_name || 'financial-summary'}.xlsx`;
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      case 'csv':
        fileBuffer = generateFinancialSummaryCSV(reportData);
        fileName = `${report.report_name || 'financial-summary'}.csv`;
        mimeType = 'text/csv';
        break;
      case 'json':
      default:
        fileBuffer = Buffer.from(JSON.stringify(reportData, null, 2));
        fileName = `${report.report_name || 'financial-summary'}.json`;
        mimeType = 'application/json';
        break;
    }

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    log.error('Financial summary report generation failed', error);
    return NextResponse.json(
      { error: 'Failed to generate financial summary report' },
      { status: 500 }
    );
  }
}

function buildFinancialSummaryData({
  project,
  organizationName,
  dateRange,
  diaries,
  laborEntries,
  plantEntries,
  materialEntries,
}: {
  project: any;
  organizationName: string;
  dateRange: FinancialSummaryDateRange;
  diaries: any[];
  laborEntries: any[];
  plantEntries: any[];
  materialEntries: any[];
}): FinancialSummaryData {
  const diarySummaries: FinancialSummaryDiary[] = (diaries || []).map((diary: any) => ({
    id: diary.id,
    diaryDate: diary.diary_date,
    diaryNumber: diary.diary_number,
    workSummary: diary.work_summary,
    labour: [],
    plant: [],
    materials: [],
    totals: {
      labourHours: 0,
      labourCost: 0,
      plantHours: 0,
      plantCost: 0,
      materialCost: 0,
      materialQuantity: 0,
      totalCost: 0,
    },
  }));

  const diaryMap = new Map<string, FinancialSummaryDiary>();
  diarySummaries.forEach((summary) => diaryMap.set(summary.id, summary));

  for (const entry of laborEntries || []) {
    const diary = diaryMap.get(entry.diary_id);
    if (!diary) continue;

    const hours = resolveNumeric(entry.hours_worked);
    const rate = resolveNumeric(entry.worker?.hourly_rate ?? entry.worker?.standard_hourly_rate);
    const cost = hours * rate;

    diary.labour.push({
      id: entry.id,
      workerId: entry.worker?.id ?? null,
      workerName: resolveWorkerName(entry.worker),
      company: entry.worker?.contractor?.name ?? null,
      jobTitle: entry.worker?.job_title ?? entry.worker?.role ?? null,
      hoursWorked: hours,
      hourlyRate: rate,
      cost,
      notes: entry.notes ?? null,
    });

    diary.totals.labourHours += hours;
    diary.totals.labourCost += cost;
  }

  for (const entry of plantEntries || []) {
    const diary = diaryMap.get(entry.diary_id);
    if (!diary) continue;

    const hours = resolveNumeric(entry.hours_used ?? entry.total_hours);
    const rate = resolveNumeric(
      entry.plant_item?.hourly_rate ?? entry.plant_item?.standard_hourly_rate ?? entry.hourly_rate
    );
    const cost = hours * rate;

    diary.plant.push({
      id: entry.id,
      plantId: entry.plant_item?.id ?? null,
      plantName: entry.plant_item?.name ?? entry.name ?? 'Plant/Equipment',
      company: entry.plant_item?.contractor?.name ?? null,
      hoursUsed: hours,
      hourlyRate: rate,
      cost,
      notes: entry.notes ?? null,
    });

    diary.totals.plantHours += hours;
    diary.totals.plantCost += cost;
  }

  for (const entry of materialEntries || []) {
    const diary = diaryMap.get(entry.diary_id);
    if (!diary) continue;

    const quantity = resolveNumeric(entry.quantity);
    const unitCostFromEntry = resolveNumeric(entry.unit_cost);
    const unitCost =
      unitCostFromEntry > 0 ? unitCostFromEntry : resolveMaterialUnitCost(entry.material);
    const totalCost = quantity * unitCost;

    diary.materials.push({
      id: entry.id,
      materialId: entry.material_id ?? entry.material?.id ?? null,
      materialName: entry.material_name || entry.material?.name || 'Material',
      supplierName: entry.supplier_name ?? null,
      quantity,
      unit: entry.unit ?? entry.material?.unit_of_measure ?? null,
      unitCost,
      totalCost,
      notes: entry.notes ?? null,
    });

    diary.totals.materialCost += totalCost;
    diary.totals.materialQuantity += quantity;
  }

  diarySummaries.forEach((summary) => {
    summary.totals.totalCost =
      summary.totals.labourCost + summary.totals.plantCost + summary.totals.materialCost;
  });

  const overallTotals = diarySummaries.reduce<FinancialSummaryTotals>(
    (acc, diary) => {
      acc.labourHours += diary.totals.labourHours;
      acc.labourCost += diary.totals.labourCost;
      acc.plantHours += diary.totals.plantHours;
      acc.plantCost += diary.totals.plantCost;
      acc.materialCost += diary.totals.materialCost;
      acc.materialQuantity += diary.totals.materialQuantity;
      acc.totalCost += diary.totals.totalCost;
      return acc;
    },
    {
      labourHours: 0,
      labourCost: 0,
      plantHours: 0,
      plantCost: 0,
      materialCost: 0,
      materialQuantity: 0,
      totalCost: 0,
    }
  );

  return {
    project,
    organization: organizationName,
    dateRange,
    totals: overallTotals,
    diaries: diarySummaries,
  };
}

function resolveNumeric(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return 0;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function resolveWorkerName(worker: any): string {
  if (!worker) {
    return 'Unknown worker';
  }

  if (worker.name) {
    return worker.name;
  }

  if (worker.full_name) {
    return worker.full_name;
  }

  const parts = [worker.first_name, worker.last_name].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(' ');
  }

  return worker.id ? `Worker ${worker.id}` : 'Unknown worker';
}

function resolveMaterialUnitCost(material: any): number {
  if (!material) {
    return 0;
  }

  const direct = resolveNumeric(material.unit_cost);
  if (direct > 0) {
    return direct;
  }

  const costs = material.costs;
  if (Array.isArray(costs) && costs.length > 0) {
    const sorted = [...costs].sort((a, b) => {
      const aDate = new Date(a.effective_from ?? a.created_at ?? 0).getTime();
      const bDate = new Date(b.effective_from ?? b.created_at ?? 0).getTime();
      return bDate - aDate;
    });

    for (const record of sorted) {
      const value = resolveNumeric(record.unit_cost);
      if (value > 0) {
        return value;
      }
    }
  }

  return 0;
}

function safeFormatDateString(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return format(date, 'dd MMM yyyy');
}

function formatCurrency(value: number): string {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  const isNegative = rounded < 0;
  const absolute = Math.abs(rounded).toFixed(2);
  return `${isNegative ? '-' : ''}$${absolute}`;
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function generateFinancialSummaryCSV(data: FinancialSummaryData): Buffer {
  const rows: string[] = [];

  rows.push('Financial Summary Report');
  rows.push(`Project,${escapeCsv(data.project?.name || '')}`);
  rows.push(`Organization,${escapeCsv(data.organization)}`);
  rows.push(
    `Date Range,${escapeCsv(
      `${safeFormatDateString(data.dateRange.start)} - ${safeFormatDateString(data.dateRange.end)}`
    )}`
  );
  rows.push('');

  rows.push('Summary Totals');
  rows.push('Metric,Value');
  rows.push(`Total Labour Hours,${data.totals.labourHours.toFixed(2)}`);
  rows.push(`Total Labour Cost,${data.totals.labourCost.toFixed(2)}`);
  rows.push(`Total Plant Hours,${data.totals.plantHours.toFixed(2)}`);
  rows.push(`Total Plant Cost,${data.totals.plantCost.toFixed(2)}`);
  rows.push(`Total Materials Cost,${data.totals.materialCost.toFixed(2)}`);
  rows.push(`Total Materials Quantity,${data.totals.materialQuantity.toFixed(2)}`);
  rows.push(`Overall Cost,${data.totals.totalCost.toFixed(2)}`);
  rows.push('');

  rows.push('Diary Totals');
  rows.push(
    'Diary Date,Diary Number,Labour Hours,Labour Cost,Plant Hours,Plant Cost,Materials Cost,Total Cost'
  );

  if (data.diaries.length === 0) {
    rows.push('No diary entries in range,,,,,,,');
  } else {
    for (const diary of data.diaries) {
      rows.push(
        [
          escapeCsv(safeFormatDateString(diary.diaryDate)),
          escapeCsv(diary.diaryNumber ?? 'N/A'),
          diary.totals.labourHours.toFixed(2),
          diary.totals.labourCost.toFixed(2),
          diary.totals.plantHours.toFixed(2),
          diary.totals.plantCost.toFixed(2),
          diary.totals.materialCost.toFixed(2),
          diary.totals.totalCost.toFixed(2),
        ].join(',')
      );
    }
  }

  rows.push('');
  rows.push('Labour Entries');
  rows.push('Diary Date,Diary Number,Worker,Company,Hours Worked,Hourly Rate,Cost,Notes');

  const hasLabour = data.diaries.some((diary) => diary.labour.length > 0);
  if (!hasLabour) {
    rows.push('No labour entries,,,,,,,');
  } else {
    for (const diary of data.diaries) {
      for (const entry of diary.labour) {
        rows.push(
          [
            escapeCsv(safeFormatDateString(diary.diaryDate)),
            escapeCsv(diary.diaryNumber ?? 'N/A'),
            escapeCsv(entry.workerName),
            escapeCsv(entry.company ?? ''),
            entry.hoursWorked.toFixed(2),
            entry.hourlyRate.toFixed(2),
            entry.cost.toFixed(2),
            escapeCsv(entry.notes ?? ''),
          ].join(',')
        );
      }
    }
  }

  rows.push('');
  rows.push('Plant Entries');
  rows.push('Diary Date,Diary Number,Plant,Company,Hours Used,Hourly Rate,Cost,Notes');

  const hasPlant = data.diaries.some((diary) => diary.plant.length > 0);
  if (!hasPlant) {
    rows.push('No plant entries,,,,,,,');
  } else {
    for (const diary of data.diaries) {
      for (const entry of diary.plant) {
        rows.push(
          [
            escapeCsv(safeFormatDateString(diary.diaryDate)),
            escapeCsv(diary.diaryNumber ?? 'N/A'),
            escapeCsv(entry.plantName),
            escapeCsv(entry.company ?? ''),
            entry.hoursUsed.toFixed(2),
            entry.hourlyRate.toFixed(2),
            entry.cost.toFixed(2),
            escapeCsv(entry.notes ?? ''),
          ].join(',')
        );
      }
    }
  }

  rows.push('');
  rows.push('Material Entries');
  rows.push('Diary Date,Diary Number,Material,Supplier,Quantity,Unit,Unit Cost,Total Cost,Notes');

  const hasMaterials = data.diaries.some((diary) => diary.materials.length > 0);
  if (!hasMaterials) {
    rows.push('No material entries,,,,,,,,');
  } else {
    for (const diary of data.diaries) {
      for (const entry of diary.materials) {
        rows.push(
          [
            escapeCsv(safeFormatDateString(diary.diaryDate)),
            escapeCsv(diary.diaryNumber ?? 'N/A'),
            escapeCsv(entry.materialName),
            escapeCsv(entry.supplierName ?? ''),
            entry.quantity.toFixed(2),
            escapeCsv(entry.unit ?? ''),
            entry.unitCost.toFixed(2),
            entry.totalCost.toFixed(2),
            escapeCsv(entry.notes ?? ''),
          ].join(',')
        );
      }
    }
  }

  return Buffer.from(rows.join('\n'));
}

function generateFinancialSummaryExcel(data: FinancialSummaryData): Buffer {
  const workbook = XLSX.utils.book_new();

  const summaryRows = [
    ['Financial Summary Report'],
    ['Project', data.project?.name || ''],
    ['Organization', data.organization],
    [
      'Date Range',
      `${safeFormatDateString(data.dateRange.start)} - ${safeFormatDateString(data.dateRange.end)}`,
    ],
    [],
    ['Metric', 'Value'],
    ['Total Labour Hours', Number(data.totals.labourHours.toFixed(2))],
    ['Total Labour Cost', Number(data.totals.labourCost.toFixed(2))],
    ['Total Plant Hours', Number(data.totals.plantHours.toFixed(2))],
    ['Total Plant Cost', Number(data.totals.plantCost.toFixed(2))],
    ['Total Materials Cost', Number(data.totals.materialCost.toFixed(2))],
    ['Total Materials Quantity', Number(data.totals.materialQuantity.toFixed(2))],
    ['Overall Cost', Number(data.totals.totalCost.toFixed(2))],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  const diarySummaryRows = data.diaries.map((diary) => ({
    'Diary Date': safeFormatDateString(diary.diaryDate),
    'Diary Number': diary.diaryNumber ?? 'N/A',
    'Labour Hours': Number(diary.totals.labourHours.toFixed(2)),
    'Labour Cost': Number(diary.totals.labourCost.toFixed(2)),
    'Plant Hours': Number(diary.totals.plantHours.toFixed(2)),
    'Plant Cost': Number(diary.totals.plantCost.toFixed(2)),
    'Materials Cost': Number(diary.totals.materialCost.toFixed(2)),
    'Materials Quantity': Number(diary.totals.materialQuantity.toFixed(2)),
    'Total Cost': Number(diary.totals.totalCost.toFixed(2)),
  }));

  const diarySummarySheet =
    diarySummaryRows.length > 0
      ? XLSX.utils.json_to_sheet(diarySummaryRows)
      : XLSX.utils.aoa_to_sheet([['No diaries in selected range']]);
  XLSX.utils.book_append_sheet(workbook, diarySummarySheet, 'Diary Summary');

  const labourRows = data.diaries.flatMap((diary) =>
    diary.labour.map((entry) => ({
      'Diary Date': safeFormatDateString(diary.diaryDate),
      'Diary Number': diary.diaryNumber ?? 'N/A',
      Worker: entry.workerName,
      Company: entry.company ?? '',
      'Job Title': entry.jobTitle ?? '',
      'Hours Worked': Number(entry.hoursWorked.toFixed(2)),
      'Hourly Rate': Number(entry.hourlyRate.toFixed(2)),
      Cost: Number(entry.cost.toFixed(2)),
      Notes: entry.notes ?? '',
    }))
  );

  const labourSheet =
    labourRows.length > 0
      ? XLSX.utils.json_to_sheet(labourRows)
      : XLSX.utils.aoa_to_sheet([['No labour entries']]);
  XLSX.utils.book_append_sheet(workbook, labourSheet, 'Labour');

  const plantRows = data.diaries.flatMap((diary) =>
    diary.plant.map((entry) => ({
      'Diary Date': safeFormatDateString(diary.diaryDate),
      'Diary Number': diary.diaryNumber ?? 'N/A',
      Plant: entry.plantName,
      Company: entry.company ?? '',
      'Hours Used': Number(entry.hoursUsed.toFixed(2)),
      'Hourly Rate': Number(entry.hourlyRate.toFixed(2)),
      Cost: Number(entry.cost.toFixed(2)),
      Notes: entry.notes ?? '',
    }))
  );

  const plantSheet =
    plantRows.length > 0
      ? XLSX.utils.json_to_sheet(plantRows)
      : XLSX.utils.aoa_to_sheet([['No plant entries']]);
  XLSX.utils.book_append_sheet(workbook, plantSheet, 'Plant');

  const materialRows = data.diaries.flatMap((diary) =>
    diary.materials.map((entry) => ({
      'Diary Date': safeFormatDateString(diary.diaryDate),
      'Diary Number': diary.diaryNumber ?? 'N/A',
      Material: entry.materialName,
      Supplier: entry.supplierName ?? '',
      Quantity: Number(entry.quantity.toFixed(2)),
      Unit: entry.unit ?? '',
      'Unit Cost': Number(entry.unitCost.toFixed(2)),
      'Total Cost': Number(entry.totalCost.toFixed(2)),
      Notes: entry.notes ?? '',
    }))
  );

  const materialsSheet =
    materialRows.length > 0
      ? XLSX.utils.json_to_sheet(materialRows)
      : XLSX.utils.aoa_to_sheet([['No material entries']]);
  XLSX.utils.book_append_sheet(workbook, materialsSheet, 'Materials');

  const output = XLSX.write(workbook, {
    type: 'buffer',
    bookType: 'xlsx',
  });

  return Buffer.from(output as ArrayBuffer);
}

async function generateFinancialSummaryPDF(data: FinancialSummaryData): Promise<Buffer> {
  const pageSize: [number, number] = [595.28, 841.89];
  const pdfDoc = await PDFDocument.create();
  const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const [pageWidth, pageHeight] = pageSize;

  let page = pdfDoc.addPage(pageSize);
  let cursorY = pageHeight - 60;

  const lineHeight = 16;

  const startNewPage = () => {
    page = pdfDoc.addPage(pageSize);
    cursorY = pageHeight - 60;
    page.drawText('Financial Summary Report (cont.)', {
      x: 50,
      y: cursorY,
      size: 12,
      font: titleFont,
      color: rgb(0, 0, 0),
    });
    cursorY -= lineHeight * 2;
  };

  const ensureSpace = (requiredLines = 1) => {
    if (cursorY - requiredLines * lineHeight < 60) {
      startNewPage();
    }
  };

  const writeLine = (
    text: string,
    options: { size?: number; font?: any; color?: ReturnType<typeof rgb> } = {}
  ) => {
    ensureSpace();
    page.drawText(text, {
      x: 50,
      y: cursorY,
      size: options.size ?? 11,
      font: options.font ?? bodyFont,
      color: options.color ?? rgb(0, 0, 0),
    });
    cursorY -= lineHeight;
  };

  page.drawText('Financial Summary Report', {
    x: 50,
    y: cursorY,
    size: 22,
    font: titleFont,
    color: rgb(0, 0, 0),
  });
  cursorY -= lineHeight * 2;

  writeLine(`Project: ${data.project?.name || 'Unknown project'}`, {
    size: 12,
  });
  writeLine(`Organization: ${data.organization}`, { size: 12 });
  writeLine(
    `Date Range: ${safeFormatDateString(data.dateRange.start)} - ${safeFormatDateString(
      data.dateRange.end
    )}`,
    { size: 12 }
  );
  cursorY -= lineHeight / 2;

  writeLine('Summary Totals', { font: titleFont, size: 14 });
  writeLine(`Labour Hours: ${data.totals.labourHours.toFixed(2)}`);
  writeLine(`Labour Cost: ${formatCurrency(data.totals.labourCost)}`);
  writeLine(`Plant Hours: ${data.totals.plantHours.toFixed(2)}`);
  writeLine(`Plant Cost: ${formatCurrency(data.totals.plantCost)}`);
  writeLine(`Materials Cost: ${formatCurrency(data.totals.materialCost)}`);
  writeLine(`Overall Cost: ${formatCurrency(data.totals.totalCost)}`);
  cursorY -= lineHeight / 2;

  writeLine('Diaries', { font: titleFont, size: 14 });

  if (data.diaries.length === 0) {
    writeLine('No diary entries found for the selected date range.');
  } else {
    writeLine('Date | Diary | Labour | Plant | Materials | Total', {
      font: titleFont,
      size: 11,
    });

    for (const diary of data.diaries) {
      ensureSpace(2);
      writeLine(
        `${safeFormatDateString(diary.diaryDate)} | ${diary.diaryNumber ?? 'N/A'} | ${formatCurrency(
          diary.totals.labourCost
        )} | ${formatCurrency(diary.totals.plantCost)} | ${formatCurrency(
          diary.totals.materialCost
        )} | ${formatCurrency(diary.totals.totalCost)}`
      );

      if (diary.labour.length > 0) {
        writeLine(
          `  Labour: ${diary.labour.length} entries, ${diary.totals.labourHours.toFixed(2)} hours`
        );
      }

      if (diary.plant.length > 0) {
        writeLine(
          `  Plant: ${diary.plant.length} entries, ${diary.totals.plantHours.toFixed(2)} hours`
        );
      }

      if (diary.materials.length > 0) {
        writeLine(
          `  Materials: ${diary.materials.length} entries, ${diary.totals.materialQuantity.toFixed(
            2
          )} units`
        );
      }

      cursorY -= lineHeight / 2;
    }
  }

  const pages = pdfDoc.getPages();
  pages.forEach((docPage, index) => {
    docPage.drawText(`Generated on ${format(new Date(), 'dd MMM yyyy HH:mm')}`, {
      x: 50,
      y: 40,
      size: 9,
      font: bodyFont,
      color: rgb(0.5, 0.5, 0.5),
    });

    docPage.drawText(`Page ${index + 1} of ${pages.length}`, {
      x: pageWidth - 120,
      y: 40,
      size: 9,
      font: bodyFont,
      color: rgb(0.5, 0.5, 0.5),
    });
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
