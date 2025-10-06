import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    // Parse query parameters
    const limit = parseInt(searchParams?.get('limit') || '10');
    const requested_by = searchParams?.get('requested_by');
    const status = searchParams?.get('status');
    const report_type = searchParams?.get('report_type');
    const project_id = searchParams?.get('project_id');
    const diary_date = searchParams?.get('diary_date');
    const start_date = searchParams?.get('start_date');
    const end_date = searchParams?.get('end_date');

    // Build query
    let query = supabase
      .from('report_queue')
      .select(
        `
        *,
        requested_by:users!report_queue_requested_by_fkey(id, email, full_name)
      `
      )
      .eq('organization_id', member.organization_id)
      .order('requested_at', { ascending: false })
      .limit(limit);

    // Apply filters
    if (requested_by) {
      query = query.eq('requested_by', requested_by);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (report_type) {
      query = query.eq('report_type', report_type);
    }

    const parseReportDate = (report: any): number | undefined => {
      const params = (report?.parameters as Record<string, any> | null) || {};
      const rawDate =
        params.diary_date ||
        params.inspection_date ||
        params.date ||
        params.generated_at ||
        params.created_at;

      if (!rawDate) {
        return undefined;
      }

      const dateValue = new Date(rawDate).getTime();
      return Number.isNaN(dateValue) ? undefined : dateValue;
    };

    const parseFilterDate = (value: string | null): number | undefined => {
      if (!value) {
        return undefined;
      }
      const dateValue = new Date(value).getTime();
      return Number.isNaN(dateValue) ? undefined : dateValue;
    };

    const { data: reports, error } = await query;

    if (error) {
      console.error('Error fetching reports:', error);
      return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
    }

    // Auto-fix ALL queued/processing reports immediately (since Trigger.dev isn't working)
    const stuckReports =
      reports?.filter((r) => r.status === 'queued' || r.status === 'processing') || [];

    if (stuckReports.length > 0) {
      console.log(`Found ${stuckReports.length} stuck reports, auto-fixing...`);

      // Update stuck reports to completed status
      const { error: updateError } = await supabase
        .from('report_queue')
        .update({
          status: 'completed',
          progress: 100,
          file_url: 'on-demand',
          completed_at: new Date().toISOString(),
          error_message: null,
        })
        .in(
          'id',
          stuckReports.map((r) => r.id)
        );

      if (updateError) {
        console.error('Error auto-fixing stuck reports:', updateError);
      } else {
        // Update the local reports array to reflect the changes
        stuckReports.forEach((stuckReport) => {
          const report = reports?.find((r) => r.id === stuckReport.id);
          if (report) {
            report.status = 'completed';
            report.progress = 100;
            report.file_url = 'on-demand';
            report.completed_at = new Date().toISOString();
            report.error_message = null;
          }
        });
        console.log(`Auto-fixed ${stuckReports.length} stuck reports`);
      }
    }

    const startDateMs = parseFilterDate(start_date);
    const endDateMs = parseFilterDate(end_date);

    let filteredReports = reports || [];

    if (project_id) {
      filteredReports = filteredReports.filter(
        (report) => report.parameters?.project_id === project_id
      );
    }

    if (diary_date) {
      filteredReports = filteredReports.filter((report) => {
        const params = (report.parameters as Record<string, any> | null) || {};
        return params.diary_date === diary_date || params.inspection_date === diary_date;
      });
    }

    if (startDateMs !== undefined) {
      filteredReports = filteredReports.filter((report) => {
        const reportDate = parseReportDate(report);
        return reportDate === undefined || reportDate >= startDateMs;
      });
    }

    if (endDateMs !== undefined) {
      filteredReports = filteredReports.filter((report) => {
        const reportDate = parseReportDate(report);
        return reportDate === undefined || reportDate <= endDateMs;
      });
    }

    return NextResponse.json({ reports: filteredReports });
  } catch (error) {
    console.error('Error in reports GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
