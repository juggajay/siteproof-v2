import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// DELETE /api/lots/[lotId] - Delete a lot
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ lotId: string }> }
) {
  try {
    const { lotId } = await params;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    // Get the lot to check permissions and project association
    const { data: lot, error: lotError } = await supabase
      .from('lots')
      .select('*, projects!inner(organization_id)')
      .eq('id', lotId)
      .single();

    if (lotError || !lot) {
      return NextResponse.json({ error: 'Lot not found' }, { status: 404 });
    }

    // Check if lot belongs to user's organization
    if (lot.projects.organization_id !== member.organization_id) {
      return NextResponse.json({ error: 'Lot not found in your organization' }, { status: 404 });
    }

    // Check if user can delete lots
    const canDelete = ['owner', 'admin', 'project_manager'].includes(member.role);
    if (!canDelete) {
      return NextResponse.json(
        { error: 'You do not have permission to delete lots' },
        { status: 403 }
      );
    }

    // Check if lot has any associated inspections
    const { data: inspections, error: inspectionsError } = await supabase
      .from('inspections')
      .select('id')
      .eq('lot_id', lotId)
      .limit(1);

    if (inspectionsError) {
      console.error('Error checking inspections:', inspectionsError);
      return NextResponse.json({ error: 'Failed to check lot dependencies' }, { status: 500 });
    }

    if (inspections && inspections.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete lot with associated inspections. Delete inspections first.' },
        { status: 400 }
      );
    }

    // Delete the lot
    const { error: deleteError } = await supabase.from('lots').delete().eq('id', lotId);

    if (deleteError) {
      console.error('Error deleting lot:', deleteError);
      return NextResponse.json({ error: 'Failed to delete lot' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Lot deleted successfully',
    });
  } catch (error) {
    console.error('Error in delete lot endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ lotId: string }> }
) {
  try {
    const { lotId } = await params;
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
      .eq('id', lotId)
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
        organization_id,
        created_by,
        data,
        evidence_files,
        inspection_status,
        inspection_date,
        sync_status,
        is_active,
        created_at,
        updated_at,
        deleted_at,
        itp_templates (
          id,
          name,
          description,
          category
        )
      `
      )
      .eq('lot_id', lotId);

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
