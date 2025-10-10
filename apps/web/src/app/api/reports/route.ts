import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    // Get user's organizations (support multi-org users)
    const { data: memberships, error: memberError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id);

    if (memberError || !memberships || memberships.length === 0) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    // Extract organization IDs
    const orgIds = memberships.map((m) => m.organization_id);

    console.log('[GET /api/reports] User organizations:', orgIds);

    // Parse query parameters
    const limit = parseInt(searchParams?.get('limit') || '10');
    const requested_by = searchParams?.get('requested_by');
    const status = searchParams?.get('status');
    const report_type = searchParams?.get('report_type');
    const project_id = searchParams?.get('project_id');
    const diary_date = searchParams?.get('diary_date');
    const start_date = searchParams?.get('start_date');
    const end_date = searchParams?.get('end_date');

    // Build query - include reports from ALL user's organizations
    let query = supabase
      .from('report_queue')
      .select(
        `
        *,
        requested_by:users!report_queue_requested_by_fkey(id, email, full_name)
      `
      )
      .in('organization_id', orgIds)
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
      const dateRange = params.date_range ?? params.dateRange;
      const rangeStart = dateRange?.start ?? dateRange?.from ?? dateRange?.date;
      const rangeEnd = dateRange?.end ?? dateRange?.to ?? dateRange?.date;
      const rawDate =
        params.diary_date ||
        params.inspection_date ||
        params.report_date ||
        rangeStart ||
        rangeEnd ||
        params.date ||
        params.generated_at ||
        params.created_at ||
        report.requested_at;

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

    const startDateMs = parseFilterDate(start_date);
    const endDateMs = parseFilterDate(end_date);

    let filteredReports = reports || [];

    if (project_id) {
      filteredReports = filteredReports.filter((report) => {
        const params = (report.parameters as Record<string, any> | null) || {};
        const parameterProjectId =
          params.project_id ?? params.projectId ?? params.project?.id ?? null;
        return parameterProjectId === project_id;
      });
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

    return NextResponse.json(
      { reports: filteredReports },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error) {
    console.error('Error in reports GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
