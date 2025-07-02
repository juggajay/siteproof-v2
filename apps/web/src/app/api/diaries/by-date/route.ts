import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  project_id: z.string().uuid().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryData = {
      date: searchParams.get('date'),
      project_id: searchParams.get('project_id'),
    };

    // Validate query parameters
    const validationResult = querySchema.safeParse(queryData);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { date, project_id } = validationResult.data;

    // Get user's organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'User not associated with any organization' },
        { status: 403 }
      );
    }

    // Build query
    let query = supabase
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
      .eq('diary_date', date)
      .eq('project.organization_id', membership.organization_id)
      .order('created_at', { ascending: false });

    // Filter by project if specified
    if (project_id) {
      query = query.eq('project_id', project_id);
    }

    const { data: diaries, error } = await query;

    if (error) {
      console.error('Error fetching diaries by date:', error);
      return NextResponse.json({ error: 'Failed to fetch diaries' }, { status: 500 });
    }

    // Check if a diary already exists for this date and project
    let existingDiary = null;
    if (project_id && diaries.length > 0) {
      existingDiary = diaries.find((d) => d.project_id === project_id);
    }

    // Calculate financial access based on role
    const hasFinancialAccess = ['owner', 'admin', 'finance_manager', 'accountant'].includes(
      membership.role
    );

    // Filter out financial data if user doesn't have access
    const filteredDiaries = diaries.map((diary) => {
      if (!hasFinancialAccess) {
        // Remove financial data from trades_on_site
        if (diary.trades_on_site) {
          diary.trades_on_site = diary.trades_on_site.map((trade: any) => ({
            ...trade,
            hourly_rate: undefined,
            daily_rate: undefined,
            total_cost: undefined,
          }));
        }
        diary.total_daily_cost = undefined;
        diary.workforce_costs = undefined;
      }
      return diary;
    });

    return NextResponse.json({
      date,
      project_id,
      diaries: filteredDiaries,
      existingDiary,
      hasFinancialAccess,
      total: filteredDiaries.length,
    });
  } catch (error) {
    console.error('Error in GET /api/diaries/by-date:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
