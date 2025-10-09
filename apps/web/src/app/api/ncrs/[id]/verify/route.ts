import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createActivityLog } from '@/lib/activity-logger';
import { z } from 'zod';

const verifySchema = z.object({
  verification_notes: z.string().min(10, 'Verification notes must be at least 10 characters'),
  is_satisfactory: z.boolean(),
  follow_up_required: z.boolean().default(false),
  photos: z
    .array(
      z.object({
        url: z.string().url(),
        caption: z.string().optional(),
      })
    )
    .optional(),
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

    // Validate state transition
    if (ncr.status !== 'resolved') {
      return NextResponse.json(
        { error: 'NCR must be resolved before verification' },
        { status: 400 }
      );
    }

    // Only the raiser, admin, or owner can verify
    const canVerify =
      ncr.raised_by === user.id || membership.role === 'admin' || membership.role === 'owner';

    if (!canVerify) {
      return NextResponse.json(
        { error: 'Only the NCR raiser or admin can verify the resolution' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const validationResult = verifySchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { verification_notes, is_satisfactory, follow_up_required, photos } =
      validationResult.data;

    // Determine new status based on verification result
    const newStatus = is_satisfactory ? 'closed' : 'in_progress';

    // Update NCR with verification details
    const updateData: Record<string, unknown> = {
      status: newStatus,
      verified_by: user.id,
      verified_at: new Date().toISOString(),
      verification_notes,
      updated_at: new Date().toISOString(),
    };

    // If verification photos provided, add them to evidence
    if (photos && photos.length > 0) {
      const currentEvidence = ncr.evidence || {};
      updateData.evidence = {
        ...currentEvidence,
        verification_photos: photos,
      };
    }

    // If closed, set closed_at timestamp
    if (newStatus === 'closed') {
      updateData.closed_at = new Date().toISOString();
    }

    const { data: updatedNcr, error: updateError } = await supabase
      .from('ncrs')
      .update(updateData)
      .eq('id', ncrId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating NCR:', updateError);
      return NextResponse.json({ error: 'Failed to verify NCR' }, { status: 500 });
    }

    // Add to NCR history
    await supabase.from('ncr_history').insert({
      ncr_id: ncrId,
      action: is_satisfactory ? 'verified_and_closed' : 'verification_failed',
      from_status: 'resolved',
      to_status: newStatus,
      notes: verification_notes,
      created_by: user.id,
    });

    // Create activity log
    await createActivityLog(user.id, 'ncr.verify', {
      ncr_id: ncrId,
      ncr_number: ncr.ncr_number,
      project_id: ncr.project_id,
      is_satisfactory,
      follow_up_required,
      new_status: newStatus,
    });

    // Send notifications
    const notificationRecipients = new Set<string>();

    // Notify assigned user if verification failed
    if (!is_satisfactory && ncr.assigned_to && ncr.assigned_to !== user.id) {
      notificationRecipients.add(ncr.assigned_to);
    }

    // Notify relevant parties if closed
    if (is_satisfactory) {
      if (ncr.assigned_to && ncr.assigned_to !== user.id) {
        notificationRecipients.add(ncr.assigned_to);
      }
      if (ncr.raised_by !== user.id) {
        notificationRecipients.add(ncr.raised_by);
      }
    }

    for (const recipientId of notificationRecipients) {
      await supabase.from('notifications').insert({
        organization_id: ncr.project.organization_id,
        user_id: recipientId,
        type: is_satisfactory ? 'ncr_closed' : 'ncr_verification_failed',
        title: is_satisfactory ? 'NCR Verified and Closed' : 'NCR Verification Failed',
        message: is_satisfactory
          ? `NCR ${ncr.ncr_number} has been verified and closed by ${user.email}`
          : `NCR ${ncr.ncr_number} verification failed. Further work required.`,
        data: {
          ncr_id: ncrId,
          ncr_number: ncr.ncr_number,
          project_id: ncr.project_id,
          verified_by: user.id,
          is_satisfactory,
          follow_up_required,
        },
        priority: is_satisfactory ? 'normal' : 'high',
      });
    }

    // If follow-up required, create a task or reminder (future enhancement)
    if (follow_up_required) {
      // TODO: Implement follow-up task creation
      console.log('Follow-up required for NCR:', ncrId);
    }

    return NextResponse.json({
      message: is_satisfactory
        ? 'NCR verified and closed successfully'
        : 'NCR verification failed - returning to in progress',
      ncr: updatedNcr,
      is_satisfactory,
      follow_up_required,
    });
  } catch (error) {
    console.error('Error verifying NCR:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
