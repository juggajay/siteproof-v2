import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { DailyDiary, Project, User } from '@siteproof/database';

// Type for the diary data returned by the RPC function
interface DiaryWithFinancialData extends DailyDiary {
  workforce_costs?: any;
  total_daily_cost?: number;
  // Additional fields from RPC that might not exist in base table
  instructions_received?: any;
  rfi_submitted?: any;
  quality_issues?: any;
  environmental_conditions?: any;
  hot_works?: any;
  permits?: any;
  temporary_works?: any;
  photos?: any;
  attachments?: any;
  is_locked?: boolean;
  notes?: string | null;
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization and role
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    // Use the database function to get diary with financial data based on role
    const { data: diary, error } = await supabase
      .rpc('get_diary_with_financial_data', {
        p_diary_id: params?.id,
        p_user_id: user.id
      })
      .single<DiaryWithFinancialData>();

    if (error || !diary) {
      console.error('Error fetching diary:', error);
      return NextResponse.json({ error: 'Diary not found' }, { status: 404 });
    }

    // Get related data
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', diary.project_id)
      .single<Project>();

    const { data: createdBy } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('id', diary.created_by)
      .single<Pick<User, 'id' | 'email' | 'full_name'>>();

    const { data: approvedBy } = diary.approved_by
      ? await supabase
          .from('users')
          .select('id, email, full_name')
          .eq('id', diary.approved_by)
          .single<Pick<User, 'id' | 'email' | 'full_name'>>()
      : { data: null };

    // Use the database function to get filtered trades data
    const { data: filteredTrades } = await supabase
      .rpc('get_trades_for_diary', {
        p_diary_id: params?.id,
        p_user_id: user.id
      });

    return NextResponse.json({
      diary: {
        ...diary,
        trades_on_site: filteredTrades || diary.trades_on_site,
        project,
        createdBy,
        approvedBy,
      }
    });

  } catch (error) {
    console.error('Error in diary GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization and check permissions
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    // Check if user can edit diaries
    const canEdit = ['owner', 'admin', 'project_manager', 'site_foreman'].includes(member.role);
    if (!canEdit) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if diary exists
    const { data: existingDiary } = await supabase
      .from('daily_diaries')
      .select('organization_id')
      .eq('id', params.id)
      .single<{ organization_id: string }>();

    if (!existingDiary || existingDiary.organization_id !== member.organization_id) {
      return NextResponse.json({ error: 'Diary not found' }, { status: 404 });
    }

    // Note: is_locked functionality is not implemented in the current schema
    // This check is commented out until the field is added to the database
    // if (existingDiary.is_locked) {
    //   return NextResponse.json({ error: 'Diary is locked and cannot be edited' }, { status: 403 });
    // }

    // Update diary
    const { data: diary, error } = await supabase
      .from('daily_diaries')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating diary:', error);
      return NextResponse.json({ error: 'Failed to update diary' }, { status: 500 });
    }

    // Refresh materialized view if trades were updated
    if (body.trades_on_site) {
      await supabase.rpc('refresh_workforce_costs');
    }

    return NextResponse.json({ diary });

  } catch (error) {
    console.error('Error in diary PUT:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}