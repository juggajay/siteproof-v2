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

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First verify the lot exists and user has access
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

    if (lotError || !lot) {
      return NextResponse.json({ error: 'Lot not found' }, { status: 404 });
    }

    // Check user membership
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', (lot.projects as any).organization_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get ITP instances for this lot (use left join to handle deleted templates)
    const { data: instances, error: instancesError } = await supabase
      .from('itp_instances')
      .select(
        `
        id,
        template_id,
        name,
        data,
        status,
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
      return NextResponse.json({ error: 'Failed to fetch ITP instances' }, { status: 500 });
    }

    return NextResponse.json({
      instances: instances || [],
      count: instances?.length || 0,
    });
  } catch (error) {
    console.error('Error fetching ITP instances:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
