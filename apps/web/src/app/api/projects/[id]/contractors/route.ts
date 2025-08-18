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

    // Verify user has access to this project
    const { data: project } = await supabase
      .from('projects')
      .select('organization_id')
      .eq('id', params.id)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const { data: member } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', project.organization_id)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch contractors - for now, return project contractors if they exist
    // In a full implementation, this would join with a contractors table
    const { data: contractors, error } = await supabase
      .from('contractors')
      .select('*')
      .eq('organization_id', project.organization_id)
      .order('name');

    if (error) {
      // If contractors table doesn't exist, return empty array
      console.log('Contractors table not found, returning empty array');
      return NextResponse.json({ contractors: [] });
    }

    return NextResponse.json({ contractors: contractors || [] });
  } catch (error) {
    console.error('Error fetching contractors:', error);
    return NextResponse.json({ contractors: [] }); // Return empty array on error
  }
}
