import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateStateTransition, getUserNcrRole, type NcrStatus } from '@/lib/ncr/state-machine';
import { createActivityLog } from '@/lib/activity-logger';
import { z } from 'zod';

const resolveSchema = z.object({
  root_cause: z.string().min(10, 'Root cause analysis must be at least 10 characters'),
  corrective_action: z.string().min(10, 'Corrective action must be at least 10 characters'),
  preventive_action: z.string().optional(),
  actual_cost: z.number().optional(),
  cost_notes: z.string().optional(),
  evidence: z.array(z.string()).optional(), // Array of file URLs
  comment: z.string().optional(),
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

    const ncrId = params?.id;
    const body = await request.json();

    // Validate input
    const validatedData = resolveSchema.parse(body);

    // Check NCR exists and user has permission
    const { data: ncr, error: ncrError } = await supabase
      .from('ncrs')
      .select('*, project:projects(organization_id)')
      .eq('id', ncrId)
      .single();

    if (ncrError || !ncr) {
      return NextResponse.json({ error: 'NCR not found' }, { status: 404 });
    }

    // Get user's organization role
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', ncr.project.organization_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Determine user's role in relation to this NCR
    const userNcrRole = getUserNcrRole(ncr, user.id, membership.role);

    // Validate state transition with required fields
    const validation = validateStateTransition(
      ncr.status as NcrStatus,
      'resolved',
      userNcrRole,
      validatedData
    );

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error, requiredFields: validation.requiredFields },
        { status: 400 }
      );
    }

    // Update NCR
    const { data: updatedNcr, error: updateError } = await supabase
      .from('ncrs')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        root_cause: validatedData.root_cause,
        corrective_action: validatedData.corrective_action,
        preventive_action: validatedData.preventive_action,
        actual_cost: validatedData.actual_cost,
        cost_notes: validatedData.cost_notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ncrId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Add comment if provided
    if (validatedData.comment) {
      await supabase.from('ncr_comments').insert({
        ncr_id: ncrId,
        content: validatedData.comment,
        author_id: user.id,
        is_internal: false,
      });
    }

    // Add to NCR history
    await supabase.from('ncr_history').insert({
      ncr_id: ncrId,
      action: 'status_change',
      from_status: ncr.status,
      to_status: 'resolved',
      notes: `Resolved with root cause: ${validatedData.root_cause}`,
      created_by: user.id,
    });

    // Create activity log
    await createActivityLog(user.id, 'ncr.resolve', {
      ncr_id: ncrId,
      ncr_number: ncr.ncr_number,
      project_id: ncr.project_id,
      root_cause: validatedData.root_cause,
      corrective_action: validatedData.corrective_action,
    });

    // Queue notifications to relevant parties
    if (ncr.raised_by !== user.id) {
      await supabase.rpc('queue_notification', {
        p_type: 'ncr_resolved',
        p_entity_type: 'ncr',
        p_entity_id: ncr.id,
        p_recipient_id: ncr.raised_by,
        p_subject: `NCR ${ncr.ncr_number} resolved`,
        p_body: `NCR "${ncr.title}" has been resolved. Please verify the resolution.`,
        p_priority: 'high',
      });
    }

    return NextResponse.json({
      message: 'NCR resolved successfully',
      ncr: updatedNcr,
    });
  } catch (error) {
    console.error('Error resolving NCR:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to resolve NCR' }, { status: 500 });
  }
}
