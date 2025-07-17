import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(_request: NextRequest, { params }: { params: { lotId: string } }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get lot with basic info
    const { data: lot, error } = await supabase
      .from('lots')
      .select(
        `
        *,
        projects (
          id,
          name,
          organization_id
        )
      `
      )
      .eq('id', params.lotId)
      .single();

    if (error || !lot) {
      console.error('Error fetching lot:', error);
      return NextResponse.json({ error: 'Lot not found' }, { status: 404 });
    }

    // Verify user has access
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', lot.projects?.organization_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get ITP instances separately to avoid join issues
    const { data: itpInstances } = await supabase
      .from('itp_instances')
      .select(
        `
        id,
        template_id,
        project_id,
        lot_id,
        data,
        status,
        completion_percentage,
        started_at,
        completed_at,
        approved_at,
        approved_by,
        created_by,
        created_at,
        updated_at,
        itp_templates (
          id,
          name,
          description,
          category
        )
      `
      )
      .eq('lot_id', params.lotId);

    return NextResponse.json({
      lot: {
        ...lot,
        itp_instances: itpInstances || [],
      },
      userRole: membership.role,
    });
  } catch (error) {
    console.error('Error in lot API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
