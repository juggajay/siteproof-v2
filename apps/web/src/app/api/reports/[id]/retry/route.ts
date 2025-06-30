import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { client } from '@/trigger';

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get report details
    const { data: report, error: reportError } = await supabase
      .from('report_queue')
      .select('*')
      .eq('id', params?.id)
      .single();

    if (reportError || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Check if user can retry (owner or admin)
    const { data: member } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', report.organization_id)
      .single();

    const canRetry = report.requested_by === user.id || 
                    (member && ['owner', 'admin'].includes(member.role));

    if (!canRetry) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if report can be retried (only failed reports)
    if (report.status !== 'failed') {
      return NextResponse.json({ 
        error: 'Only failed reports can be retried' 
      }, { status: 400 });
    }

    // Check retry limit
    if (report.retry_count >= report.max_retries) {
      return NextResponse.json({ 
        error: 'Maximum retry limit reached' 
      }, { status: 400 });
    }

    // Reset report status
    const { error: updateError } = await supabase
      .from('report_queue')
      .update({
        status: 'queued',
        progress: 0,
        current_step: null,
        error_message: null,
        retry_count: report.retry_count + 1,
        queued_at: new Date().toISOString(),
        started_at: null,
        completed_at: null,
        failed_at: null,
      })
      .eq('id', params?.id);

    if (updateError) {
      console.error('Error updating report:', updateError);
      return NextResponse.json({ error: 'Failed to retry report' }, { status: 500 });
    }

    // Trigger the background job again
    await client.sendEvent({
      name: 'report.generate',
      payload: {
        reportId: params.id,
        reportType: report.report_type,
        format: report.format,
        parameters: report.parameters,
        organizationId: report.organization_id,
        requestedBy: report.requested_by,
      },
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error retrying report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}