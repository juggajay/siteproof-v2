import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/projects/[id]/lots/[lotId]/itp - Get all ITP instances for a lot
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string; lotId: string } }
) {
  try {
    const { id: projectId, lotId } = params;
    const supabase = await createClient();

    console.log('=== ITP API Debug ===');
    console.log('Project ID:', projectId);
    console.log('Lot ID:', lotId);

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    console.log('User:', user?.id, 'Error:', userError);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Test if we can access templates
    const { data: templateTest, error: templateError } = await supabase
      .from('itp_templates')
      .select('id, name, structure')
      .limit(1);
    console.log('Can access templates?', { data: templateTest, error: templateError });

    // First verify the lot exists and user has access
    console.log('Checking lot access...');
    const { data: lot, error: lotError } = await supabase
      .from('lots')
      .select(
        `
        id,
        project_id,
        projects!inner(
          id,
          organization_id
        )
      `
      )
      .eq('id', lotId)
      .eq('project_id', projectId)
      .single();

    if (lotError) {
      console.error('Lot query error:', lotError);
      return NextResponse.json({ error: 'Lot not found' }, { status: 404 });
    }

    if (!lot) {
      console.error('Lot not found for ID:', lotId, 'Project:', projectId);
      return NextResponse.json({ error: 'Lot not found' }, { status: 404 });
    }

    console.log('Lot found:', lot.id, 'Organization:', (lot.projects as any)?.organization_id);

    // Check user membership
    console.log(
      'Checking user membership for org:',
      (lot.projects as any).organization_id,
      'user:',
      user.id
    );
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', (lot.projects as any).organization_id)
      .eq('user_id', user.id)
      .single();

    if (membershipError) {
      console.error('Membership query error:', membershipError);
    }

    if (!membership) {
      console.error(
        'No membership found for user:',
        user.id,
        'in org:',
        (lot.projects as any).organization_id
      );
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    console.log('User membership confirmed:', membership.role);

    // Get ITP instances for this lot (use left join to handle deleted templates)
    const { data: instances, error: instancesError } = await supabase
      .from('itp_instances')
      .select(
        `
        id,
        template_id,
        data,
        inspection_status,
        completion_percentage,
        created_at,
        updated_at,
        created_by,
        itp_templates(
          id,
          name,
          description,
          structure,
          organization_id
        )
      `
      )
      .eq('lot_id', lotId)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (instancesError) {
      console.error('Error fetching ITP instances:', instancesError);
      console.error('Full instances error details:', JSON.stringify(instancesError, null, 2));
      return NextResponse.json({ error: 'Failed to fetch ITP instances' }, { status: 500 });
    }

    console.log('ITP instances fetched successfully:', instances?.length || 0, 'instances');
    console.log('===================');

    return NextResponse.json({
      instances: instances || [],
      count: instances?.length || 0,
    });
  } catch (error) {
    console.error('Error fetching ITP instances:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
