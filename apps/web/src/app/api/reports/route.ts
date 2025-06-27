import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
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
    const limit = parseInt(searchParams.get('limit') || '10');
    const requested_by = searchParams.get('requested_by');
    const status = searchParams.get('status');
    const report_type = searchParams.get('report_type');

    // Build query
    let query = supabase
      .from('report_queue')
      .select(`
        *,
        requested_by:users!report_queue_requested_by_fkey(id, email, full_name)
      `)
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

    const { data: reports, error } = await query;

    if (error) {
      console.error('Error fetching reports:', error);
      return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
    }

    return NextResponse.json({ reports: reports || [] });

  } catch (error) {
    console.error('Error in reports GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}