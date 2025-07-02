import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createActivityLog } from '@/lib/activity-logger';
import { z } from 'zod';

const reopenSchema = z.object({
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
  additional_requirements: z.string().optional(),
  new_due_date: z.string().optional(),
  assign_to: z.string().uuid().optional(),
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
        raisedBy:users!ncrs_raised_by_fkey(id, email, full_name),
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

    // Validate that NCR can be reopened (must be closed or disputed)
    const reopenableStatuses = ['closed', 'disputed'];
    if (!reopenableStatuses.includes(ncr.status)) {
      return NextResponse.json(
        { error: `Cannot reopen NCR in ${ncr.status} status. NCR must be closed or disputed.` },
        { status: 400 }
      );
    }

    // Check permissions - only raiser, admin, or owner can reopen
    const canReopen =
      ncr.raised_by === user.id || membership.role === 'admin' || membership.role === 'owner';

    if (!canReopen) {
      return NextResponse.json(
        { error: 'Only the NCR raiser or admin can reopen this NCR' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const validationResult = reopenSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { reason, additional_requirements, new_due_date, assign_to } = validationResult.data;

    // Prepare update data
    const updateData: any = {
      status: 'open',
      reopened_at: new Date().toISOString(),
      reopened_by: user.id,
      reopened_reason: reason,
      updated_at: new Date().toISOString(),
      // Clear previous verification/closure data
      verified_by: null,
      verified_at: null,
      verification_notes: null,
      closed_at: null,
    };

    // Update additional fields if provided
    if (additional_requirements) {
      const currentDescription = ncr.description || '';
      updateData.description = `${currentDescription}\n\nADDITIONAL REQUIREMENTS (Reopened):\n${additional_requirements}`;
    }

    if (new_due_date) {
      updateData.due_date = new_due_date;
    }

    if (assign_to && assign_to !== ncr.assigned_to) {
      // Validate that the new assignee exists and is part of the organization
      const { data: newAssignee } = await supabase
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', ncr.project.organization_id)
        .eq('user_id', assign_to)
        .single();

      if (newAssignee) {
        updateData.assigned_to = assign_to;
      }
    }

    // Store reopen details in evidence field
    const currentEvidence = ncr.evidence || {};
    updateData.evidence = {
      ...currentEvidence,
      reopen_history: [
        ...(currentEvidence.reopen_history || []),
        {
          reopened_at: new Date().toISOString(),
          reopened_by: user.id,
          reason,
          additional_requirements,
          previous_status: ncr.status,
        },
      ],
    };

    const { data: updatedNcr, error: updateError } = await supabase
      .from('ncrs')
      .update(updateData)
      .eq('id', ncrId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating NCR:', updateError);
      return NextResponse.json({ error: 'Failed to reopen NCR' }, { status: 500 });
    }

    // Add to NCR history
    await supabase.from('ncr_history').insert({
      ncr_id: ncrId,
      action: 'reopened',
      from_status: ncr.status,
      to_status: 'open',
      notes: `Reopened: ${reason}`,
      created_by: user.id,
    });

    // Create activity log
    await createActivityLog(user.id, 'ncr.reopen', {
      ncr_id: ncrId,
      ncr_number: ncr.ncr_number,
      project_id: ncr.project_id,
      previous_status: ncr.status,
      reason,
      new_due_date,
      new_assignee: assign_to,
    });

    // Send notifications
    const notificationRecipients = new Set<string>();

    // Notify previous assigned user
    if (ncr.assigned_to && ncr.assigned_to !== user.id) {
      notificationRecipients.add(ncr.assigned_to);
    }

    // Notify new assigned user if different
    if (assign_to && assign_to !== ncr.assigned_to && assign_to !== user.id) {
      notificationRecipients.add(assign_to);
    }

    // Notify original raiser if not the one reopening
    if (ncr.raised_by !== user.id) {
      notificationRecipients.add(ncr.raised_by);
    }

    for (const recipientId of notificationRecipients) {
      const isNewAssignee = recipientId === assign_to;
      await supabase.from('notifications').insert({
        organization_id: ncr.project.organization_id,
        user_id: recipientId,
        type: isNewAssignee ? 'ncr_assigned' : 'ncr_reopened',
        title: isNewAssignee ? 'NCR Assigned to You' : 'NCR Reopened',
        message: isNewAssignee
          ? `NCR ${ncr.ncr_number} has been reopened and assigned to you`
          : `NCR ${ncr.ncr_number} has been reopened by ${user.email}. Reason: ${reason}`,
        data: {
          ncr_id: ncrId,
          ncr_number: ncr.ncr_number,
          project_id: ncr.project_id,
          reopened_by: user.id,
          reason,
        },
        priority: 'high',
      });
    }

    return NextResponse.json({
      message: 'NCR reopened successfully',
      ncr: updatedNcr,
      reopen_details: {
        reason,
        additional_requirements,
        new_due_date,
        new_assignee: assign_to,
      },
    });
  } catch (error) {
    console.error('Error reopening NCR:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
