import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DiaryExporter, type DiaryExportData, type ExportOptions } from '@/lib/export/diary-export';
import { z } from 'zod';

const exportQuerySchema = z.object({
  format: z.enum(['pdf', 'excel']).default('pdf'),
  includeFinancials: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const diaryId = params.id;

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryValidation = exportQuerySchema.safeParse({
      format: searchParams.get('format'),
      includeFinancials: searchParams.get('includeFinancials'),
    });

    if (!queryValidation.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: queryValidation.error.errors },
        { status: 400 }
      );
    }

    const { format, includeFinancials } = queryValidation.data;

    // Get the diary with all related data
    const { data: diary, error: diaryError } = await supabase
      .from('daily_diaries')
      .select(
        `
        *,
        project:projects!inner(
          id,
          name,
          client_name,
          organization_id
        ),
        createdBy:users!daily_diaries_created_by_fkey(
          id,
          email,
          full_name
        ),
        approvedBy:users!daily_diaries_approved_by_fkey(
          id,
          email,
          full_name
        )
      `
      )
      .eq('id', diaryId)
      .single();

    if (diaryError || !diary) {
      return NextResponse.json({ error: 'Diary not found' }, { status: 404 });
    }

    // Check if user has permission to access this diary
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', diary.project.organization_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check financial access if financial data is requested
    const hasFinancialAccess = ['owner', 'admin', 'finance_manager', 'accountant'].includes(
      membership.role
    );
    const effectiveIncludeFinancials = includeFinancials && hasFinancialAccess;

    // Get financial data if user has access
    // TODO: Implement daily_workforce_costs view/table
    // let workforceCosts = null;
    // Commented out until daily_workforce_costs is properly set up
    // if (effectiveIncludeFinancials) {
    //   const { data: costs } = await supabase
    //     .from('daily_workforce_costs')
    //     .select('workforce_costs, total_daily_cost')
    //     .eq('diary_id', diaryId)
    //     .single();
    //
    //   workforceCosts = costs;
    // }

    // Prepare export data
    const exportData: DiaryExportData = {
      id: diary.id,
      diary_number: diary.diary_number,
      diary_date: diary.diary_date,
      project: {
        name: diary.project.name,
        client_name: diary.project.client_name,
      },
      work_summary: diary.work_summary,
      weather: diary.weather,
      trades_on_site: diary.trades_on_site || [],
      total_workers: diary.total_workers,
      delays: diary.delays || [],
      safety_incidents: diary.safety_incidents || [],
      inspections: diary.inspections || [],
      visitors: diary.visitors || [],
      equipment_on_site: diary.equipment_on_site || [],
      material_deliveries: diary.material_deliveries || [],
      milestones_achieved: diary.milestones_achieved || [],
      general_notes: diary.general_notes,
      tomorrow_planned_work: diary.tomorrow_planned_work,
      total_daily_cost: undefined, // workforceCosts?.total_daily_cost, // TODO: Implement when view is created
      createdBy: diary.createdBy,
      approvedBy: diary.approvedBy,
      approved_at: diary.approved_at,
      created_at: diary.created_at,
    };

    // Filter out financial data from trades if user doesn't have access
    if (!effectiveIncludeFinancials) {
      exportData.trades_on_site = exportData.trades_on_site.map((trade) => ({
        ...trade,
        hourly_rate: undefined,
        daily_rate: undefined,
        total_cost: undefined,
      }));
    }

    const exportOptions: ExportOptions = {
      format,
      includeFinancials: effectiveIncludeFinancials,
    };

    const exporter = new DiaryExporter();
    let fileBuffer: Buffer;
    let contentType: string;
    let filename: string;

    if (format === 'pdf') {
      fileBuffer = await exporter.exportToPDF(exportData, exportOptions);
      contentType = 'text/html'; // For now, returning HTML that can be converted to PDF client-side
      filename = `diary-${diary.diary_number}-${diary.diary_date}.html`;
    } else {
      fileBuffer = await exporter.exportToExcel(exportData, exportOptions);
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      filename = `diary-${diary.diary_number}-${diary.diary_date}.xlsx`;
    }

    // Log the export action
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      action: 'diary.export',
      metadata: {
        diary_id: diaryId,
        diary_number: diary.diary_number,
        format,
        include_financials: effectiveIncludeFinancials,
      },
    });

    // Return the file
    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error exporting diary:', error);
    return NextResponse.json({ error: 'Failed to export diary' }, { status: 500 });
  }
}
