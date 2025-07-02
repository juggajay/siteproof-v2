import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createActivityLog } from '@/lib/activity-logger';
import { z } from 'zod';

const disputeSchema = z.object({
  dispute_reason: z.string().min(20, 'Dispute reason must be at least 20 characters'),
  dispute_category: z.enum([
    'incorrect_issue',
    'not_responsible',
    'already_fixed',
    'scope_disagreement',
    'other',
  ]),
  supporting_evidence: z
    .array(
      z.object({
        type: z.enum(['document', 'photo', 'reference']),
        url: z.string().url().optional(),
        description: z.string(),
      })
    )
    .optional(),
  proposed_resolution: z.string().optional(),
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
        assignedTo:users!ncrs_assigned_to_fkey(id, email, full_name),
        contractor:organizations!ncrs_contractor_id_fkey(id, name)
      `
      )
      .eq('id', ncrId)
      .single();

    if (fetchError || !ncr) {
      return NextResponse.json({ error: 'NCR not found' }, { status: 404 });
    }

    // Check if user is part of the organization or contractor
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role, organization_id')
      .eq('user_id', user.id)
      .or(
        `organization_id.eq.${ncr.project.organization_id},organization_id.eq.${ncr.contractor_id}`
      )
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'Unauthorized - must be part of project organization or assigned contractor' },
        { status: 403 }
      );
    }

    // Validate that NCR can be disputed (not already closed or disputed)
    const disputableStatuses = ['open', 'acknowledged', 'in_progress', 'resolved'];
    if (!disputableStatuses.includes(ncr.status)) {
      return NextResponse.json(
        { error: `Cannot dispute NCR in ${ncr.status} status` },
        { status: 400 }
      );
    }

    // Check permissions
    const canDispute =
      ncr.assigned_to === user.id || // Assigned user
      (ncr.contractor_id && membership.organization_id === ncr.contractor_id) || // Contractor member
      membership.role === 'admin' ||
      membership.role === 'owner';

    if (!canDispute) {
      return NextResponse.json(
        { error: 'Only the assigned user, contractor, or admin can dispute this NCR' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const validationResult = disputeSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { dispute_reason, dispute_category, supporting_evidence, proposed_resolution } =
      validationResult.data;

    // Update NCR status to disputed
    const disputeData = {
      dispute_reason,
      dispute_category,
      dispute_raised_by: user.id,
      dispute_raised_at: new Date().toISOString(),
      proposed_resolution,
    };

    const updateData: any = {
      status: 'disputed',
      dispute_details: disputeData,
      updated_at: new Date().toISOString(),
    };

    // If supporting evidence provided, add to evidence field
    if (supporting_evidence && supporting_evidence.length > 0) {
      const currentEvidence = ncr.evidence || {};
      updateData.evidence = {
        ...currentEvidence,
        dispute_evidence: supporting_evidence,
      };
    }

    const { data: updatedNcr, error: updateError } = await supabase
      .from('ncrs')
      .update(updateData)
      .eq('id', ncrId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating NCR:', updateError);
      return NextResponse.json({ error: 'Failed to dispute NCR' }, { status: 500 });
    }

    // Add to NCR history
    await supabase.from('ncr_history').insert({
      ncr_id: ncrId,
      action: 'disputed',
      from_status: ncr.status,
      to_status: 'disputed',
      notes: `Disputed: ${dispute_category} - ${dispute_reason}`,
      created_by: user.id,
    });

    // Create activity log
    await createActivityLog(user.id, 'ncr.dispute', {
      ncr_id: ncrId,
      ncr_number: ncr.ncr_number,
      project_id: ncr.project_id,
      previous_status: ncr.status,
      dispute_category,
      dispute_reason,
    });

    // Send notifications to relevant parties
    const notificationRecipients = new Set<string>();

    // Notify NCR raiser
    if (ncr.raised_by !== user.id) {
      notificationRecipients.add(ncr.raised_by);
    }

    // Notify project admins
    const { data: projectAdmins } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', ncr.project.organization_id)
      .in('role', ['admin', 'owner']);

    projectAdmins?.forEach((admin) => {
      if (admin.user_id !== user.id) {
        notificationRecipients.add(admin.user_id);
      }
    });

    for (const recipientId of notificationRecipients) {
      await supabase.from('notifications').insert({
        organization_id: ncr.project.organization_id,
        user_id: recipientId,
        type: 'ncr_disputed',
        title: 'NCR Disputed',
        message: `NCR ${ncr.ncr_number} has been disputed by ${user.email}. Reason: ${dispute_category}`,
        data: {
          ncr_id: ncrId,
          ncr_number: ncr.ncr_number,
          project_id: ncr.project_id,
          disputed_by: user.id,
          dispute_category,
          dispute_reason,
        },
        priority: 'urgent',
      });
    }

    return NextResponse.json({
      message: 'NCR disputed successfully',
      ncr: updatedNcr,
      dispute_details: disputeData,
    });
  } catch (error) {
    console.error('Error disputing NCR:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
