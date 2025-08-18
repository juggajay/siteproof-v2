import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check NCR exists and user has access
    const { data: ncr } = await supabase
      .from('ncrs')
      .select('organization_id')
      .eq('id', params.id)
      .single();

    if (!ncr) {
      return NextResponse.json({ error: 'NCR not found' }, { status: 404 });
    }

    // Check user is member of organization
    const { data: member } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', ncr.organization_id)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch history
    const { data: history, error } = await supabase
      .from('ncr_history')
      .select(
        `
        *,
        performedBy:users!ncr_history_performed_by_fkey(id, email, full_name)
      `
      )
      .eq('ncr_id', params.id)
      .order('performed_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json(history || []);
  } catch (error) {
    console.error('Error fetching NCR history:', error);
    return NextResponse.json({ error: 'Failed to fetch NCR history' }, { status: 500 });
  }
}
