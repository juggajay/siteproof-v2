import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/reports/fix-stuck - Fix stuck queued reports
export async function POST() {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    // Update all queued reports in the organization to completed
    const { data: updatedReports, error: updateError } = await supabase
      .from('report_queue')
      .update({
        status: 'completed',
        progress: 100,
        file_url: 'on-demand',
        completed_at: new Date().toISOString(),
        error_message: null,
      })
      .eq('organization_id', member.organization_id)
      .in('status', ['queued', 'processing'])
      .select();

    if (updateError) {
      console.error('Error updating reports:', updateError);
      return NextResponse.json({ error: 'Failed to update reports' }, { status: 500 });
    }

    return NextResponse.json({
      message: `Fixed ${updatedReports?.length || 0} stuck reports`,
      reports: updatedReports,
    });
  } catch (error) {
    console.error('Error fixing reports:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
