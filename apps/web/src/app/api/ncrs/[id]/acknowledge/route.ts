import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const ncrId = params.id;

    // Check NCR exists and user has permission
    const { data: ncr, error: ncrError } = await supabase
      .from('ncrs')
      .select('*')
      .eq('id', ncrId)
      .single();

    if (ncrError || !ncr) {
      return NextResponse.json(
        { error: 'NCR not found' },
        { status: 404 }
      );
    }

    // Check user permission (must be assigned to)
    if (ncr.assigned_to !== user.id) {
      return NextResponse.json(
        { error: 'Only the assigned user can acknowledge this NCR' },
        { status: 403 }
      );
    }

    // Check current status
    if (ncr.status !== 'open') {
      return NextResponse.json(
        { error: `Cannot acknowledge NCR in ${ncr.status} status` },
        { status: 400 }
      );
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
    return NextResponse.json(
      { error: 'Failed to acknowledge NCR' },
      { status: 500 }
    );
  }
}