import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createActivityLog } from '@/lib/activity-logger';
import { z } from 'zod';

const startWorkSchema = z.object({
  notes: z.string().optional(),
  estimated_completion_date: z.string().optional(),
});

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ncrId = params.id;

    // Get the NCR to validate current state
    const { data: ncr, error: fetchError } = await supabase
      .from('ncrs')
      .select(
        `
        *,
        project:projects(id, name, organization_id),
        assignedTo:users!ncrs_assigned_to_fkey(id, email, full_name)
      `
      )
      .eq('id', ncrId)
      .single();

    if (fetchError || !ncr) {
      return NextResponse.json({ error: 'NCR not found' }, { status: 404 });
    }

    // Check if user is part of the organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', ncr.project.organization_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Validate state transition
    if (ncr.status !== 'acknowledged') {
      return NextResponse.json(
        { error: 'NCR must be acknowledged before starting work' },
        { status: 400 }
      );
    }

    // Only assigned user or admin can start work
    if (ncr.assigned_to !== user.id && membership.role !== 'admin' && membership.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only the assigned user can start work on this NCR' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const validationResult = startWorkSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { notes, estimated_completion_date } = validationResult.data;

    // Update NCR status to in_progress
    const { data: updatedNcr, error: updateError } = await supabase
      .from('ncrs')
      .update({
        status: 'in_progress',
        work_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...(estimated_completion_date && { estimated_completion_date }),
      })
      .eq('id', ncrId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating NCR:', updateError);
      return NextResponse.json({ error: 'Failed to update NCR status' }, { status: 500 });
    }

    // Add to NCR history
    await supabase.from('ncr_history').insert({
      ncr_id: ncrId,
      action: 'status_change',
      from_status: 'acknowledged',
      to_status: 'in_progress',
      notes: notes || 'Work started on NCR',
      created_by: user.id,
    });

    // Create activity log
    await createActivityLog(user.id, 'ncr.start_work', {
      ncr_id: ncrId,
      ncr_number: ncr.ncr_number,
      project_id: ncr.project_id,
      notes,
      estimated_completion_date,
    });

    // Send notification to NCR raiser
    if (ncr.raised_by !== user.id) {
      await supabase.from('notifications').insert({
        organization_id: ncr.project.organization_id,
        user_id: ncr.raised_by,
        type: 'ncr_work_started',
        title: 'Work Started on NCR',
        message: `Work has been started on NCR ${ncr.ncr_number} by ${user.email}`,
        data: {
          ncr_id: ncrId,
          ncr_number: ncr.ncr_number,
          project_id: ncr.project_id,
          started_by: user.id,
        },
        priority: 'high',
      });
    }

    return NextResponse.json({
      message: 'Work started on NCR successfully',
      ncr: updatedNcr,
    });
  } catch (error) {
    console.error('Error starting work on NCR:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
