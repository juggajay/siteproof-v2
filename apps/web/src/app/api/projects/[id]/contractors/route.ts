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

    // Fetch companies that are contractors from the company_profiles table
    // Get all contractors that the organization has access to
    const { data: contractors, error } = await supabase
      .from('company_profiles')
      .select('id, company_name, company_type, organization_id')
      .eq('company_type', 'contractor')
      .eq('is_active', true)
      .order('company_name');

    if (error) {
      // If company_profiles table doesn't exist or error, try fetching from organizations
      console.log('Company profiles table error, trying organizations:', error);

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
          company_name: org.name,
          company_type: 'contractor',
        })),
      });
    }

    // Map the results to have consistent field names
    return NextResponse.json({
      contractors: (contractors || []).map((c) => ({
        id: c.id,
        name: c.company_name,
        company_name: c.company_name,
        company_type: c.company_type,
      })),
    });
  } catch (error) {
    console.error('Error fetching contractors:', error);
    return NextResponse.json({ contractors: [] }); // Return empty array on error
  }
}
