import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updateInspectionSchema = z.object({
  data: z.record(z.any()),
  status: z.enum(['draft', 'in_progress', 'completed', 'approved']).optional(),
  completion_percentage: z.number().min(0).max(100).optional(),
});

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const inspectionId = params.id;

    // Get the inspection instance with all related data
    const { data: inspection, error } = await supabase
      .from('itp_instances')
      .select(
        `
        *,
        template:itp_templates(
          id, 
          name, 
          description, 
          structure,
          category
        ),
        project:projects(id, name, organization_id),
        lot:lots(id, lot_number, name),
        creator:users!itp_instances_created_by_fkey(id, email, full_name),
        approver:users!itp_instances_approved_by_fkey(id, email, full_name)
      `
      )
      .eq('id', inspectionId)
      .single();

    if (error || !inspection) {
      return NextResponse.json({ error: 'Inspection not found' }, { status: 404 });
    }

    // Check if user has access to this inspection
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', inspection.project.organization_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({ inspection });
  } catch (error) {
    console.error('Error fetching inspection:', error);
    return NextResponse.json({ error: 'Failed to fetch inspection' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const inspectionId = params.id;
    const body = await request.json();

    // Validate input
    const validationResult = updateInspectionSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const updateData = validationResult.data;

    // Get the inspection to check permissions
    const { data: inspection, error: fetchError } = await supabase
      .from('itp_instances')
      .select(
        `
        *,
        project:projects(organization_id)
      `
      )
      .eq('id', inspectionId)
      .single();

    if (fetchError || !inspection) {
      return NextResponse.json({ error: 'Inspection not found' }, { status: 404 });
    }

    // Check if user has permission
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', inspection.project.organization_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Validate status transitions
    if (updateData.status && inspection.status !== updateData.status) {
      const validTransitions: Record<string, string[]> = {
        draft: ['in_progress'],
        in_progress: ['completed', 'draft'],
        completed: ['approved', 'in_progress'],
        approved: [], // No transitions from approved
      };

      if (!validTransitions[inspection.status]?.includes(updateData.status)) {
        return NextResponse.json(
          { error: `Invalid status transition from ${inspection.status} to ${updateData.status}` },
          { status: 400 }
        );
      }
    }

    // Prepare update object
    const update: any = {
      updated_at: new Date().toISOString(),
    };

    if (updateData.data) {
      // Merge new data with existing data
      update.data = {
        ...inspection.data,
        ...updateData.data,
      };
    }

    if (updateData.status) {
      update.status = updateData.status;

      // Set timestamps based on status
      if (updateData.status === 'in_progress' && !inspection.started_at) {
        update.started_at = new Date().toISOString();
      } else if (updateData.status === 'completed') {
        update.completed_at = new Date().toISOString();
      } else if (updateData.status === 'approved') {
        update.approved_at = new Date().toISOString();
        update.approved_by = user.id;
      }
    }

    if (updateData.completion_percentage !== undefined) {
      update.completion_percentage = updateData.completion_percentage;
    }

    // Update the inspection
    const { data: updatedInspection, error: updateError } = await supabase
      .from('itp_instances')
      .update(update)
      .eq('id', inspectionId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Update assignment status if inspection status changed
    if (updateData.status) {
      const assignmentStatus =
        updateData.status === 'approved'
          ? 'completed'
          : updateData.status === 'completed'
            ? 'in_progress'
            : updateData.status;

      await supabase
        .from('itp_assignments')
        .update({
          status: assignmentStatus,
          ...(assignmentStatus === 'completed' && { completed_at: new Date().toISOString() }),
        })
        .eq('template_id', inspection.template_id)
        .eq('project_id', inspection.project_id);
    }

    return NextResponse.json({
      message: 'Inspection updated successfully',
      inspection: updatedInspection,
    });
  } catch (error) {
    console.error('Error updating inspection:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to update inspection' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const inspectionId = params.id;

    // Get the inspection to check permissions
    const { data: inspection, error: fetchError } = await supabase
      .from('itp_instances')
      .select(
        `
        *,
        project:projects(organization_id)
      `
      )
      .eq('id', inspectionId)
      .single();

    if (fetchError || !inspection) {
      return NextResponse.json({ error: 'Inspection not found' }, { status: 404 });
    }

    // Check if user has admin permission
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', inspection.project.organization_id)
      .eq('user_id', user.id)
      .single();

    if (!membership || (membership.role !== 'admin' && membership.role !== 'owner')) {
      return NextResponse.json({ error: 'Only admins can delete inspections' }, { status: 403 });
    }

    // Don't allow deletion of approved inspections
    if (inspection.status === 'approved') {
      return NextResponse.json({ error: 'Cannot delete approved inspections' }, { status: 400 });
    }

    // Delete the inspection
    const { error: deleteError } = await supabase
      .from('itp_instances')
      .delete()
      .eq('id', inspectionId);

    if (deleteError) {
      throw deleteError;
    }

    // Also delete related assignment
    await supabase
      .from('itp_assignments')
      .delete()
      .eq('template_id', inspection.template_id)
      .eq('project_id', inspection.project_id);

    return NextResponse.json({
      message: 'Inspection deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting inspection:', error);
    return NextResponse.json({ error: 'Failed to delete inspection' }, { status: 500 });
  }
}
