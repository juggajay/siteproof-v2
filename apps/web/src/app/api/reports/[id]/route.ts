import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// DELETE /api/reports/[id] - Delete a report
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: reportId } = params;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the report with RLS enforcing access
    const { data: report, error: reportError } = await supabase
      .from('report_queue')
      .select('*')
      .eq('id', reportId)
      .maybeSingle();

    if (reportError) {
      console.error('Error fetching report for delete:', reportError);
      return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 });
    }

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Check if user can delete this report
    let canDelete = report.requested_by === user.id;

    if (!canDelete) {
      const { data: membership } = await supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', report.organization_id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (membership?.role) {
        canDelete = ['owner', 'admin', 'project_manager'].includes(membership.role);
      }
    }

    if (!canDelete) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this report' },
        { status: 403 }
      );
    }

    // Delete the report
    // Note: We only need to filter by ID - RLS policies will enforce permissions
    console.log('Attempting to delete report:', reportId, 'for user:', user.id);
    console.log('Report organization_id:', report.organization_id);
    console.log('User can delete:', canDelete);

    const { data: deletedData, error: deleteError } = await supabase
      .from('report_queue')
      .delete()
      .eq('id', reportId)
      .select();

    // Log detailed error information
    if (deleteError) {
      console.error('Delete error details:', {
        message: deleteError.message,
        details: deleteError.details,
        hint: deleteError.hint,
        code: deleteError.code,
      });
      return NextResponse.json(
        { error: `Failed to delete report: ${deleteError.message}` },
        { status: 500 }
      );
    }

    // Check if any rows were actually deleted
    if (!deletedData || deletedData.length === 0) {
      console.error('No rows deleted for report:', reportId);
      console.error('This usually means RLS policy denied the deletion');

      // Verify the report still exists
      const { data: checkReport, error: checkError } = await supabase
        .from('report_queue')
        .select('id, requested_by, organization_id')
        .eq('id', reportId)
        .maybeSingle();

      console.log('Post-delete check:', { checkReport, checkError });

      if (checkReport) {
        // Report exists but wasn't deleted - RLS policy issue
        return NextResponse.json(
          {
            error:
              'Failed to delete report. You may not have permission or there may be a database policy issue.',
            debug: {
              reportExists: true,
              userId: user.id,
              reportRequestedBy: checkReport.requested_by,
              reportOrgId: checkReport.organization_id,
            },
          },
          { status: 403 }
        );
      }

      // Report doesn't exist anymore (maybe was already deleted)
      console.log('Report was already deleted or did not exist:', reportId);
    } else {
      console.log('Successfully deleted report:', reportId, 'Deleted rows:', deletedData.length);
    }

    return NextResponse.json({
      success: true,
      message: 'Report deleted successfully',
      deletedCount: deletedData?.length || 0,
    });
  } catch (error) {
    console.error('Error in delete report endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/reports/[id] - Download individual report
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: reportId } = params;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    // Get the report
    const { data: report, error: reportError } = await supabase
      .from('report_queue')
      .select('*')
      .eq('id', reportId)
      .eq('organization_id', member.organization_id)
      .single();

    if (reportError || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Check if report is completed
    if (report.status !== 'completed') {
      return NextResponse.json({ error: 'Report is not ready for download' }, { status: 400 });
    }

    // Check if file_url exists
    if (!report.file_url) {
      return NextResponse.json({ error: 'Report file not available' }, { status: 404 });
    }

    // For now, redirect to the file URL
    // In production, you might want to:
    // 1. Stream the file through this endpoint for security
    // 2. Generate signed URLs for temporary access
    // 3. Log download activity

    // Log the download
    console.log(`User ${user.id} downloading report ${reportId}`);

    // Return the file URL for direct download
    return NextResponse.json({
      file_url: report.file_url,
      report_name: report.report_name,
      format: report.format,
      file_size_bytes: report.file_size_bytes,
    });
  } catch (error) {
    console.error('Error downloading report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
