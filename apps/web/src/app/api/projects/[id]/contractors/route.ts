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

    // Fetch companies that are contractors from the companies table
    const { data: contractors, error } = await supabase
      .from('companies')
      .select('*')
      .eq('company_type', 'contractor')
      .order('name');

    if (error) {
      // If companies table doesn't exist or error, try fetching from organizations
      console.log('Companies table error, trying organizations:', error);

      // Fetch organizations that might be contractors
      // For now, return all organizations except the current one
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, name')
        .neq('id', project.organization_id)
        .order('name');

      return NextResponse.json({
        contractors: (orgs || []).map((org) => ({
          id: org.id,
          name: org.name,
          company_type: 'contractor',
        })),
      });
    }

    return NextResponse.json({ contractors: contractors || [] });
  } catch (error) {
    console.error('Error fetching contractors:', error);
    return NextResponse.json({ contractors: [] }); // Return empty array on error
  }
}
