import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { SupabaseClient } from '@supabase/supabase-js';

// GET /api/reports/[id]/download - Generate and download report directly
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: reportId } = params;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the report details
    const { data: report, error: reportError } = await supabase
      .from('report_queue')
      .select('*, organization:organizations(name)')
      .eq('id', reportId)
      .single();

    if (reportError || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Auto-fix stuck reports (queued or processing)
    if (report.status === 'queued' || report.status === 'processing') {
      const timeSinceRequest = new Date().getTime() - new Date(report.requested_at).getTime();

      // If report is stuck (more than 30 seconds old), fix it
      if (timeSinceRequest > 30 * 1000) {
        console.log(`Report ${reportId} is stuck in ${report.status}, auto-fixing...`);

        // Update the report to completed
        const { error: updateError } = await supabase
          .from('report_queue')
          .update({
            status: 'completed',
            progress: 100,
            file_url: 'on-demand',
            completed_at: new Date().toISOString(),
            error_message: null,
          })
          .eq('id', reportId);

        if (!updateError) {
          // Update local report object
          report.status = 'completed';
          report.progress = 100;
          report.file_url = 'on-demand';
          console.log(`Report ${reportId} auto-fixed and ready for download`);
        } else {
          console.error('Failed to auto-fix report:', updateError);
        }
      } else {
        return NextResponse.json(
          {
            error: 'Report is being generated, please try again in a moment',
          },
          { status: 202 }
        );
      }
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

    // Get project data for the report
    const { project_id, date_range } = report.parameters;

    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', project_id)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Fetch report data
    const [diariesResult, inspectionsResult, ncrsResult] = await Promise.all([
      supabase
        .from('daily_diaries')
        .select('*')
        .eq('project_id', project_id)
        .gte('diary_date', date_range.start)
        .lte('diary_date', date_range.end),

      supabase
        .from('inspections')
        .select('*')
        .eq('project_id', project_id)
        .gte('created_at', date_range.start)
        .lte('created_at', date_range.end),

      supabase
        .from('ncrs')
        .select('*')
        .eq('project_id', project_id)
        .gte('created_at', date_range.start)
        .lte('created_at', date_range.end),
    ]);

    const diaries = diariesResult.data || [];
    const inspections = inspectionsResult.data || [];
    const ncrs = ncrsResult.data || [];

    // Generate report based on format
    let fileBuffer: Buffer;
    let fileName: string;
    let mimeType: string;

    switch (report.format) {
      case 'pdf':
        fileBuffer = await generateSimplePDF({
          project,
          organization: report.organization?.name || 'Unknown',
          dateRange: date_range,
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
          dateRange: date_range,
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

    // Return the file directly as a response
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function generateSimplePDF(data: any): Promise<Buffer> {
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

  page.drawText(`Period: ${data.dateRange.start} to ${data.dateRange.end}`, {
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
        `• ${format(new Date(diary.diary_date), 'dd/MM/yyyy')} - ${diary.activities || 'No activities'}`.substring(
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

function generateExcel(data: any): Buffer {
  const workbook = XLSX.utils.book_new();

  // Summary sheet
  const summaryData = [
    ['Project Summary Report'],
    [],
    ['Project:', data.project.name],
    ['Organization:', data.organization],
    ['Period:', `${data.dateRange.start} to ${data.dateRange.end}`],
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
        Date: format(new Date(d.diary_date), 'dd/MM/yyyy'),
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
        Date: format(new Date(i.created_at), 'dd/MM/yyyy'),
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
        'Created Date': format(new Date(n.created_at), 'dd/MM/yyyy'),
      }))
    );
    XLSX.utils.book_append_sheet(workbook, ncrSheet, 'NCRs');
  }

  const output = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return Buffer.from(output as ArrayBuffer);
}

function generateCSV(data: any): Buffer {
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
      const date = format(new Date(d.diary_date), 'dd/MM/yyyy');
      const activities = (d.activities || 'N/A').replace(/,/g, ';');
      rows.push(`${date},"${activities}",${d.workforce_count || 0}`);
    });
  }

  return Buffer.from(rows.join('\n'));
}

async function generateITPReport(report: any, _supabase: SupabaseClient): Promise<NextResponse> {
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
        const date = itp.inspection_date
          ? format(new Date(itp.inspection_date), 'dd/MM/yyyy')
          : 'N/A';
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

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${report.report_name}.pdf"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error generating ITP report:', error);
    return NextResponse.json({ error: 'Failed to generate ITP report' }, { status: 500 });
  }
}
async function downloadDailyDiaryEntry(report: any, supabase: SupabaseClient) {
  try {
    const diaryId = report.parameters?.diary_id;
    const projectId = report.parameters?.project_id;
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

      return new NextResponse(fileBuffer, {
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

    const diaryDate = diary.diary_date
      ? format(new Date(diary.diary_date), 'EEEE, dd MMMM yyyy')
      : 'N/A';
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

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error generating daily diary PDF:', error);
    return NextResponse.json({ error: 'Failed to generate daily diary PDF' }, { status: 500 });
  }
}
