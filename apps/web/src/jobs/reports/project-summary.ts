import { SupabaseClient } from '@supabase/supabase-js';
import { IO } from '@trigger.dev/sdk';
import { PDFReportGenerator } from '@/lib/reports/pdf-generator';
import { ExcelReportGenerator } from '@/lib/reports/excel-generator';
import { format as formatDate } from 'date-fns';

interface GenerateReportOptions {
  supabase: SupabaseClient;
  parameters: any;
  format: 'pdf' | 'excel' | 'csv' | 'json';
  organizationId: string;
  io: IO;
  reportId: string;
  requestedBy: string;
}

export async function generateProjectSummaryReport({
  supabase,
  parameters,
  format,
  organizationId,
  io,
  reportId,
  requestedBy,
}: GenerateReportOptions): Promise<{ fileUrl: string; fileSize: number }> {
  const { project_id, date_range, include_photos, include_signatures } = parameters;

  // Update progress: Fetching data
  await io.runTask("update-progress-10", async () => {
    await supabase.rpc('update_report_status', {
      p_report_id: reportId,
      p_status: 'processing',
      p_progress: 10,
      p_current_step: 'Fetching project data',
    });
  });

  // Fetch comprehensive project data
  const [
    projectResult,
    organizationResult,
    userResult,
    diariesResult,
    inspectionsResult,
    ncrsResult,
    lotsResult,
  ] = await Promise.all([
    // Project details
    supabase
      .from('projects')
      .select('*')
      .eq('id', project_id)
      .eq('organization_id', organizationId)
      .single(),
    
    // Organization details
    supabase
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single(),
    
    // User details
    supabase
      .from('users')
      .select('full_name, email')
      .eq('id', requestedBy)
      .single(),
    
    // Daily diaries with details
    supabase
      .from('daily_diaries')
      .select('*')
      .eq('project_id', project_id)
      .gte('diary_date', date_range.start)
      .lte('diary_date', date_range.end)
      .order('diary_date', { ascending: false }),
    
    // Inspections with details
    supabase
      .from('inspections')
      .select('*, itp_templates(name)')
      .eq('project_id', project_id)
      .gte('created_at', date_range.start)
      .lte('created_at', date_range.end)
      .order('created_at', { ascending: false }),
    
    // NCRs with details
    supabase
      .from('ncrs')
      .select('*')
      .eq('project_id', project_id)
      .gte('created_at', date_range.start)
      .lte('created_at', date_range.end)
      .order('created_at', { ascending: false }),
    
    // Lots
    supabase
      .from('lots')
      .select('*')
      .eq('project_id', project_id)
      .order('lot_number', { ascending: true }),
  ]);

  const project = projectResult.data;
  const organization = organizationResult.data;
  const user = userResult.data;
  const diaries = diariesResult.data || [];
  const inspections = inspectionsResult.data || [];
  const ncrs = ncrsResult.data || [];
  const lots = lotsResult.data || [];

  if (!project) {
    throw new Error('Project not found');
  }

  // Update progress: Processing data
  await io.runTask("update-progress-30", async () => {
    await supabase.rpc('update_report_status', {
      p_report_id: reportId,
      p_status: 'processing',
      p_progress: 30,
      p_current_step: 'Processing project statistics',
    });
  });

  // Calculate statistics
  const totalInspections = inspections.length;
  const passedInspections = inspections.filter(i => i.status === 'completed' && i.result === 'pass').length;
  const failedInspections = inspections.filter(i => i.status === 'completed' && i.result === 'fail').length;
  const passRate = totalInspections > 0 ? Math.round((passedInspections / totalInspections) * 100) : 0;

  const openNcrs = ncrs.filter(n => ['open', 'acknowledged', 'in_progress'].includes(n.status)).length;
  const closedNcrs = ncrs.filter(n => n.status === 'closed').length;

  // Prepare report data
  const reportData = {
    project,
    organization: organization?.name || 'Unknown',
    generatedBy: user?.full_name || user?.email || 'System',
    dateRange: date_range,
    statistics: {
      totalDiaries: diaries.length,
      totalInspections,
      passedInspections,
      failedInspections,
      passRate,
      totalNcrs: ncrs.length,
      openNcrs,
      closedNcrs,
      totalLots: lots.length,
    },
    diaries,
    inspections,
    ncrs,
    lots,
    includePhotos: include_photos,
    includeSignatures: include_signatures,
  };

  // Update progress: Generating report
  await io.runTask("update-progress-50", async () => {
    await supabase.rpc('update_report_status', {
      p_report_id: reportId,
      p_status: 'processing',
      p_progress: 50,
      p_current_step: `Generating ${format.toUpperCase()} report`,
    });
  });

  let fileBuffer: Buffer;
  let fileName: string;
  let mimeType: string;

  // Generate report based on format
  switch (format) {
    case 'pdf':
      fileBuffer = await generatePDFReport(reportData);
      fileName = `project-summary-${project.name.replace(/[^a-z0-9]/gi, '-')}-${formatDate(new Date(), 'yyyyMMdd-HHmmss')}.pdf`;
      mimeType = 'application/pdf';
      break;
    
    case 'excel':
      fileBuffer = ExcelReportGenerator.generateProjectSummaryExcel(reportData);
      fileName = `project-summary-${project.name.replace(/[^a-z0-9]/gi, '-')}-${formatDate(new Date(), 'yyyyMMdd-HHmmss')}.xlsx`;
      mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      break;
    
    case 'csv':
      fileBuffer = generateCSVReport(reportData);
      fileName = `project-summary-${project.name.replace(/[^a-z0-9]/gi, '-')}-${formatDate(new Date(), 'yyyyMMdd-HHmmss')}.csv`;
      mimeType = 'text/csv';
      break;
    
    case 'json':
      fileBuffer = Buffer.from(JSON.stringify(reportData, null, 2));
      fileName = `project-summary-${project.name.replace(/[^a-z0-9]/gi, '-')}-${formatDate(new Date(), 'yyyyMMdd-HHmmss')}.json`;
      mimeType = 'application/json';
      break;
    
    default:
      throw new Error(`Unsupported format: ${format}`);
  }

  // Update progress: Uploading file
  await io.runTask("update-progress-80", async () => {
    await supabase.rpc('update_report_status', {
      p_report_id: reportId,
      p_status: 'processing',
      p_progress: 80,
      p_current_step: 'Uploading report file',
    });
  });

  // Upload to Supabase Storage
  const storagePath = `${organizationId}/${project_id}/reports/${fileName}`;
  const { error: uploadError } = await supabase.storage
    .from('reports')
    .upload(storagePath, fileBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    console.error('Upload error:', uploadError);
    throw new Error(`Failed to upload report: ${uploadError.message}`);
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('reports')
    .getPublicUrl(storagePath);

  return {
    fileUrl: publicUrl,
    fileSize: fileBuffer.length,
  };
}

async function generatePDFReport(data: any): Promise<Buffer> {
  const pdf = new PDFReportGenerator();
  await pdf.initialize();

  // Add header
  await pdf.addHeader({
    title: `Project Summary Report`,
    subtitle: data.project.name,
    organization: data.organization,
    generatedBy: data.generatedBy,
    dateRange: data.dateRange,
  });

  // Add summary section
  await pdf.addSection({
    title: 'Project Overview',
    type: 'summary',
    content: [
      { label: 'Project Status', value: data.project.status },
      { label: 'Client', value: data.project.client_name || 'N/A' },
      { label: 'Total Lots', value: data.statistics.totalLots },
      { label: 'Completion', value: `${data.project.progress || 0}%` },
    ],
  });

  // Add statistics section
  await pdf.addSection({
    title: 'Key Metrics',
    type: 'summary',
    content: [
      { label: 'Daily Diaries', value: data.statistics.totalDiaries },
      { label: 'Total Inspections', value: data.statistics.totalInspections },
      { label: 'Pass Rate', value: `${data.statistics.passRate}%` },
      { label: 'Open NCRs', value: data.statistics.openNcrs },
    ],
  });

  // Add recent activities
  if (data.diaries.length > 0) {
    await pdf.addSection({
      title: 'Recent Daily Diaries',
      type: 'table',
      content: data.diaries.slice(0, 5).map((d: any) => ({
        Date: formatDate(new Date(d.diary_date), 'dd/MM/yyyy'),
        Weather: d.weather?.description || 'N/A',
        Workers: d.workforce_count || 0,
        Activities: (d.activities || '').substring(0, 50),
      })),
    });
  }

  // Add NCR summary if any
  if (data.ncrs.length > 0) {
    await pdf.addSection({
      title: 'Non-Conformance Reports',
      type: 'table',
      content: data.ncrs.slice(0, 5).map((n: any) => ({
        'NCR #': n.ncr_number,
        Title: n.title,
        Status: n.status,
        Severity: n.severity,
        'Raised Date': formatDate(new Date(n.created_at), 'dd/MM/yyyy'),
      })),
    });
  }

  const pdfBytes = await pdf.save();
  return Buffer.from(pdfBytes);
}

function generateCSVReport(data: any): Buffer {
  const rows: string[] = [];
  
  // Header
  rows.push('Project Summary Report');
  rows.push(`Project: ${data.project.name}`);
  rows.push(`Client: ${data.project.client_name || 'N/A'}`);
  rows.push(`Generated: ${formatDate(new Date(), 'dd/MM/yyyy HH:mm')}`);
  rows.push('');
  
  // Statistics
  rows.push('Statistics');
  rows.push(`Total Daily Diaries,${data.statistics.totalDiaries}`);
  rows.push(`Total Inspections,${data.statistics.totalInspections}`);
  rows.push(`Pass Rate,${data.statistics.passRate}%`);
  rows.push(`Total NCRs,${data.statistics.totalNcrs}`);
  rows.push(`Open NCRs,${data.statistics.openNcrs}`);
  rows.push('');
  
  // Daily Diaries
  if (data.diaries.length > 0) {
    rows.push('Daily Diaries');
    rows.push('Date,Weather,Workers,Activities');
    data.diaries.forEach((d: any) => {
      const date = formatDate(new Date(d.diary_date), 'dd/MM/yyyy');
      const weather = d.weather?.description || 'N/A';
      const workers = d.workforce_count || 0;
      const activities = (d.activities || '').replace(/,/g, ';');
      rows.push(`${date},${weather},${workers},"${activities}"`);
    });
  }
  
  return Buffer.from(rows.join('\n'));
}