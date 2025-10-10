import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// DELETE /api/reports/[id] - Delete a report
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log('[DELETE /api/reports/[id]] Request received');
    console.log('[DELETE /api/reports/[id]] Params:', params);

    const { id: reportId } = params;
    console.log('[DELETE /api/reports/[id]] Report ID:', reportId);

    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    console.log('[DELETE /api/reports/[id]] User lookup result:', {
      userId: user?.id,
      userError: userError?.message
    });

    if (userError || !user) {
      console.log('[DELETE /api/reports/[id]] Unauthorized - returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[DELETE /api/reports/[id]] Attempting to delete report:', reportId, 'for user:', user.id);

    // Delete the report directly - RLS policies will enforce permissions
    // The DELETE policy allows users to delete their own reports or reports in organizations where they are admin/owner/project_manager
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
      // No rows deleted - either report doesn't exist or user doesn't have permission
      console.log('No rows deleted for report:', reportId);

      // Try to check if the report exists (this SELECT might also be blocked by RLS if user doesn't have access)
      const { data: checkReport, error: checkError } = await supabase
        .from('report_queue')
        .select('id, requested_by, organization_id')
        .eq('id', reportId)
        .maybeSingle();

      console.log('Post-delete check:', { checkReport, checkError });

      if (checkReport) {
        // Report exists but wasn't deleted - permission issue
        console.error('Report exists but RLS policy denied the deletion');
        return NextResponse.json(
          {
            error: 'You do not have permission to delete this report',
            debug: {
              reportExists: true,
              userId: user.id,
              reportRequestedBy: checkReport.requested_by,
              reportOrgId: checkReport.organization_id,
            },
          },
          { status: 403 }
        );
      } else {
        // Report doesn't exist or user can't see it
        // Either the report was already deleted (success case) or never existed (also a success case for idempotency)
        console.log('Report not found or already deleted:', reportId);
        return NextResponse.json({
          success: true,
          message: 'Report deleted successfully (or already deleted)',
          deletedCount: 0,
        });
      }
    }

    // Success - report was deleted
    console.log('Successfully deleted report:', reportId, 'Deleted rows:', deletedData.length);

    return NextResponse.json({
      success: true,
      message: 'Report deleted successfully',
      deletedCount: deletedData.length,
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
