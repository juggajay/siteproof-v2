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

    // Check if user is member of the organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', params.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch all organization members
    const { data: members, error } = await supabase
      .from('organization_members')
      .select(
        `
        user_id,
        role,
        joined_at,
        user:users!organization_members_user_id_fkey(
          id,
          email,
          full_name,
          avatar_url
        )
      `
      )
      .eq('organization_id', params.id)
      .order('joined_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ members: members || [] });
  } catch (error) {
    console.error('Error fetching organization members:', error);
    return NextResponse.json({ error: 'Failed to fetch organization members' }, { status: 500 });
  }
}
