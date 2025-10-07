import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; lotId: string }> }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, lotId } = await params;
    const payload = await request.json();

    // Fetch project to determine organization context
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('organization_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Ensure the user can manage lots for this organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', project.organization_id)
      .eq('user_id', user.id)
      .single();

    if (!membership || !['owner', 'admin', 'member'].includes(membership.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const {
      files,
      name,
      description,
      status,
      internal_notes,
      client_notes,
      submitted_at,
      reviewed_at,
      reviewed_by,
      lot_number,
    } = payload || {};

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (files !== undefined) updates.files = files;
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;
    if (internal_notes !== undefined) updates.internal_notes = internal_notes;
    if (client_notes !== undefined) updates.client_notes = client_notes;
    if (submitted_at !== undefined) updates.submitted_at = submitted_at;
    if (reviewed_at !== undefined) updates.reviewed_at = reviewed_at;
    if (reviewed_by !== undefined) updates.reviewed_by = reviewed_by;
    if (lot_number !== undefined) updates.lot_number = lot_number;

    // Allow storing arbitrary metadata but avoid overriding known columns unintentionally
    if (Object.keys(updates).length === 1) {
      return NextResponse.json({ error: 'No valid fields provided for update' }, { status: 400 });
    }

    const { data: updatedLot, error: updateError } = await supabase
      .from('lots')
      .update(updates)
      .eq('id', lotId)
      .eq('project_id', projectId)
      .select()
      .single();

    if (updateError) {
      console.error('[LotUpdate] Failed to update lot:', updateError);
      return NextResponse.json(
        { error: 'Failed to update lot', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ lot: updatedLot });
  } catch (error) {
    console.error('[LotUpdate] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
