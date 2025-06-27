import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get report to check ownership and status
    const { data: report, error: reportError } = await supabase
      .from('report_queue')
      .select('requested_by, status, organization_id')
      .eq('id', params.id)
      .single();

    if (reportError || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Check if user can cancel (owner or admin)
    const { data: member } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', report.organization_id)
      .single();

    const canCancel = report.requested_by === user.id || 
                     (member && ['owner', 'admin'].includes(member.role));

    if (!canCancel) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if report can be cancelled
    if (!['queued', 'processing'].includes(report.status)) {
      return NextResponse.json({ 
        error: 'Report cannot be cancelled in current status' 
      }, { status: 400 });
    }

    // Update report status
    await supabase.rpc('update_report_status', {
      p_report_id: params.id,
      p_status: 'cancelled',
      p_error_message: 'Cancelled by user',
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error cancelling report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}