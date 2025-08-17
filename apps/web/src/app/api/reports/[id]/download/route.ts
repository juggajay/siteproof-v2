import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

// GET /api/reports/[id]/download - Generate and download report directly
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Check if report is completed or if we need to generate it on-the-fly
    if (report.status !== 'completed' && report.status !== 'processing') {
      return NextResponse.json({ error: 'Report is not ready' }, { status: 400 });
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
        fileBuffer = Buffer.from(JSON.stringify({
          project,
          diaries,
          inspections,
          ncrs,
        }, null, 2));
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
      page.drawText(`• ${format(new Date(diary.diary_date), 'dd/MM/yyyy')} - ${diary.activities || 'No activities'}`.substring(0, 80), {
        x: 70,
        y,
        size: 10,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });
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

  return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
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