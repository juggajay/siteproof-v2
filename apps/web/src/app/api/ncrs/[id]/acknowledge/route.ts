import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateStateTransition, getUserNcrRole, type NcrStatus } from '@/lib/ncr/state-machine';
import { createActivityLog } from '@/lib/activity-logger';

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ncrId = params?.id;

    // Check NCR exists and get full details
    const { data: ncr, error: ncrError } = await supabase
      .from('ncrs')
      .select(
        `
        *,
        project:projects(id, organization_id)
      `
      )
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

    // Validate state transition
    const validation = validateStateTransition(
      ncr.status as NcrStatus,
      'acknowledged',
      userNcrRole
    );

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Update NCR
    const { data: updatedNcr, error: updateError } = await supabase
      .from('ncrs')
      .update({
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', ncrId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Add to NCR history
    await supabase.from('ncr_history').insert({
      ncr_id: ncrId,
      action: 'status_change',
      from_status: 'open',
      to_status: 'acknowledged',
      notes: 'NCR acknowledged by assigned user',
      created_by: user.id,
    });

    // Create activity log
    await createActivityLog(user.id, 'ncr.acknowledge', {
      ncr_id: ncrId,
      ncr_number: ncr.ncr_number,
      project_id: ncr.project_id,
    });

    // Queue notification to raiser
    await supabase.rpc('queue_notification', {
      p_type: 'ncr_acknowledged',
      p_entity_type: 'ncr',
      p_entity_id: ncr.id,
      p_recipient_id: ncr.raised_by,
      p_subject: `NCR ${ncr.ncr_number} acknowledged`,
      p_body: `Your NCR "${ncr.title}" has been acknowledged by the assigned user.`,
      p_priority: 'normal',
    });

    return NextResponse.json({
      message: 'NCR acknowledged successfully',
      ncr: updatedNcr,
    });
  } catch (error) {
    console.error('Error acknowledging NCR:', error);
    return NextResponse.json({ error: 'Failed to acknowledge NCR' }, { status: 500 });
  }
}
