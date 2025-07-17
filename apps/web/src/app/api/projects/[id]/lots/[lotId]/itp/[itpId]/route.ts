import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

// Schema for updating ITP instance
const updateItpInstanceSchema = z.object({
  data: z.record(z.any()).optional(),
  inspection_status: z
    .enum(['draft', 'in_progress', 'completed', 'approved', 'rejected'])
    .optional(),
  inspection_date: z.string().optional().nullable(),
  completion_percentage: z.number().min(0).max(100).optional(),
  evidence_files: z
    .array(
      z.object({
        url: z.string(),
        name: z.string(),
        size: z.number(),
        type: z.string(),
      })
    )
    .optional(),
  sync_status: z.enum(['pending', 'synced', 'failed']).optional(),
});

// GET /api/projects/[id]/lots/[lotId]/itp/[itpId] - Get ITP instance
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string; lotId: string; itpId: string } }
) {
  try {
    const { lotId, itpId } = params;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get ITP instance with template
    const { data: itpInstance, error } = await supabase
      .from('itp_instances')
      .select(
        `
        *,
        itp_templates!inner(
          id,
          name,
          description,
          structure,
          organization_id
        ),
        lot:lots!inner(
          id,
          lot_number,
          project_id,
          project:projects!inner(
            id,
            name,
            organization_id
          )
        )
      `
      )
      .eq('id', itpId)
      .eq('lot_id', lotId)
      .single();

    if (error || !itpInstance) {
      return NextResponse.json({ error: 'ITP instance not found' }, { status: 404 });
    }

    // Check user has access to organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', (itpInstance as any).itp_templates.organization_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ itpInstance });
  } catch (error) {
    console.error('Error fetching ITP instance:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/projects/[id]/lots/[lotId]/itp/[itpId] - Update ITP instance
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; lotId: string; itpId: string } }
) {
  try {
    const { lotId, itpId } = params;
    const body = await request.json();

    // Validate request body
    const validationResult = updateItpInstanceSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const data = validationResult.data;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get ITP instance to check permissions
    const { data: itpInstance } = await supabase
      .from('itp_instances')
      .select(
        `
        *,
        itp_templates!inner(
          organization_id
        ),
        lot:lots!inner(
          project_id,
          project:projects!inner(
            organization_id
          )
        )
      `
      )
      .eq('id', itpId)
      .eq('lot_id', lotId)
      .single();

    if (!itpInstance) {
      return NextResponse.json({ error: 'ITP instance not found' }, { status: 404 });
    }

    // Check user has access to organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', (itpInstance as any).itp_templates.organization_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Can user update this instance?
    const canUpdate =
      itpInstance.created_by === user.id || ['admin', 'owner'].includes(membership.role);

    if (!canUpdate) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Prepare update data
    const updateData: any = {};

    if (data.data !== undefined) {
      updateData.data = data.data;
    }

    if (data.inspection_status !== undefined) {
      updateData.inspection_status = data.inspection_status;
    }

    if (data.inspection_date !== undefined) {
      updateData.inspection_date = data.inspection_date;
    }

    if (data.evidence_files !== undefined) {
      updateData.evidence_files = data.evidence_files;
    }

    if (data.sync_status !== undefined) {
      updateData.sync_status = data.sync_status;
    }

    if (data.completion_percentage !== undefined) {
      updateData.completion_percentage = data.completion_percentage;
    }

    updateData.updated_at = new Date().toISOString();

    // Update the ITP instance
    const { data: updatedInstance, error: updateError } = await supabase
      .from('itp_instances')
      .update(updateData)
      .eq('id', itpId)
      .select(
        `
        *,
        itp_templates!inner(
          id,
          name,
          description,
          structure
        ),
        lot:lots!inner(
          id,
          lot_number,
          project:projects!inner(
            id,
            name
          )
        )
      `
      )
      .single();

    if (updateError) {
      console.error('Error updating ITP instance:', updateError);
      return NextResponse.json({ error: 'Failed to update ITP instance' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'ITP instance updated successfully',
      itpInstance: updatedInstance,
    });
  } catch (error) {
    console.error('Error updating ITP instance:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/lots/[lotId]/itp/[itpId] - Delete ITP instance
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; lotId: string; itpId: string } }
) {
  try {
    const { lotId, itpId } = params;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get ITP instance to check permissions
    const { data: itpInstance } = await supabase
      .from('itp_instances')
      .select(
        `
        created_by,
        itp_templates!inner(
          organization_id
        )
      `
      )
      .eq('id', itpId)
      .eq('lot_id', lotId)
      .single();

    if (!itpInstance) {
      return NextResponse.json({ error: 'ITP instance not found' }, { status: 404 });
    }

    // Check user has access to organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', (itpInstance as any).itp_templates.organization_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Can user delete this instance?
    const canDelete =
      itpInstance.created_by === user.id || ['admin', 'owner'].includes(membership.role);

    if (!canDelete) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Delete the ITP instance
    const { error: deleteError } = await supabase.from('itp_instances').delete().eq('id', itpId);

    if (deleteError) {
      console.error('Error deleting ITP instance:', deleteError);
      return NextResponse.json({ error: 'Failed to delete ITP instance' }, { status: 500 });
    }

    return NextResponse.json({ message: 'ITP instance deleted successfully' });
  } catch (error) {
    console.error('Error deleting ITP instance:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
