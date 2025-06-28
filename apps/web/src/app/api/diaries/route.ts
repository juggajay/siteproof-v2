import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import type { DailyDiary, Project, User } from '@siteproof/database';

const createDiarySchema = z.object({
  project_id: z.string().uuid(),
  diary_date: z.string(),
  weather: z.any().optional(),
  site_conditions: z.string().optional(),
  work_areas: z.array(z.string()).default([]),
  access_issues: z.string().optional(),
  work_summary: z.string().min(10),
  trades_on_site: z.array(z.any()).default([]),
  total_workers: z.number().min(0),
  key_personnel: z.array(z.any()).default([]),
  equipment_on_site: z.array(z.any()).default([]),
  material_deliveries: z.array(z.any()).default([]),
  delays: z.array(z.any()).default([]),
  safety_incidents: z.array(z.any()).default([]),
  inspections: z.array(z.any()).default([]),
  visitors: z.array(z.any()).default([]),
  milestones_achieved: z.array(z.string()).default([]),
  general_notes: z.string().optional(),
  tomorrow_planned_work: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's role
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (!member) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 404 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('project_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Check if user has financial access
    const hasFinancialAccess = ['owner', 'admin', 'finance_manager', 'accountant'].includes(member.role);

    // Build query based on financial access
    const selectString = hasFinancialAccess
      ? `
        *,
        project:projects(id, name, client_name),
        createdBy:users!daily_diaries_created_by_fkey(id, email, full_name),
        approvedBy:users!daily_diaries_approved_by_fkey(id, email, full_name),
        daily_workforce_costs!inner(workforce_costs, total_daily_cost)
      `
      : `
        *,
        project:projects(id, name, client_name),
        createdBy:users!daily_diaries_created_by_fkey(id, email, full_name),
        approvedBy:users!daily_diaries_approved_by_fkey(id, email, full_name)
      `;

    let query = supabase
      .from('daily_diaries')
      .select(selectString)
      .eq('organization_id', member.organization_id)
      .order('diary_date', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    if (startDate) {
      query = query.gte('diary_date', startDate);
    }

    if (endDate) {
      query = query.lte('diary_date', endDate);
    }

    // Type definition for the diary with joined data
    type DiaryWithRelations = DailyDiary & {
      project?: Pick<Project, 'id' | 'name' | 'client_name'>;
      createdBy?: Pick<User, 'id' | 'email' | 'full_name'>;
      approvedBy?: Pick<User, 'id' | 'email' | 'full_name'>;
      daily_workforce_costs?: Array<{
        workforce_costs: any;
        total_daily_cost: number;
      }>;
    };

    const { data: diaries, error } = await query as { data: DiaryWithRelations[] | null, error: any };

    if (error) {
      throw error;
    }

    // Filter out financial data from trades if user doesn't have access
    const processedDiaries = diaries?.map((diary) => {
      if (!hasFinancialAccess && diary.trades_on_site) {
        return {
          ...diary,
          trades_on_site: diary.trades_on_site.map((trade: any) => ({
            ...trade,
            hourly_rate: undefined,
            daily_rate: undefined,
            total_cost: undefined,
          })),
          daily_workforce_costs: undefined,
        };
      }
      return diary;
    });

    return NextResponse.json({ diaries: processedDiaries });
  } catch (error) {
    console.error('Error fetching diaries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch diaries' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = createDiarySchema.parse(body);

    // Check user has permission in the project
    const { data: project } = await supabase
      .from('projects')
      .select('organization_id')
      .eq('id', validatedData.project_id)
      .single();

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const { data: member } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', project.organization_id)
      .single();

    if (!member || !['owner', 'admin', 'member'].includes(member.role)) {
      return NextResponse.json(
        { error: 'You do not have permission to create diaries in this project' },
        { status: 403 }
      );
    }

    // Check if diary already exists for this date
    const { data: existingDiary } = await supabase
      .from('daily_diaries')
      .select('id')
      .eq('project_id', validatedData.project_id)
      .eq('diary_date', validatedData.diary_date)
      .single();

    if (existingDiary) {
      return NextResponse.json(
        { error: 'A diary already exists for this date' },
        { status: 400 }
      );
    }

    // Generate diary number
    const { data: diaryNumber } = await supabase
      .rpc('generate_diary_number', {
        p_project_id: validatedData.project_id,
        p_diary_date: validatedData.diary_date,
      });

    // Create diary
    const { data: diary, error: diaryError } = await supabase
      .from('daily_diaries')
      .insert({
        ...validatedData,
        organization_id: project.organization_id,
        diary_number: diaryNumber,
        created_by: user.id,
      })
      .select()
      .single();

    if (diaryError) {
      throw diaryError;
    }

    return NextResponse.json({
      message: 'Daily diary created successfully',
      diary,
    });
  } catch (error) {
    console.error('Error creating diary:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create diary' },
      { status: 500 }
    );
  }
}