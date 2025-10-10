import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// DELETE /api/reports/[id] - Delete a report (Improved RLS-aware version)
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: reportId } = params;
    console.log('[DELETE /api/reports/[id]] Starting deletion for report:', reportId);

    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.log('[DELETE /api/reports/[id]] Unauthorized - no user');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[DELETE /api/reports/[id]] User authenticated:', user.id);

    // Step 1: First verify the report exists and user can see it
    // RLS will automatically filter based on SELECT policy
    const { data: report, error: fetchError } = await supabase
      .from('report_queue')
      .select('id, report_name, organization_id, requested_by')
      .eq('id', reportId)
      .maybeSingle();

    if (fetchError) {
      console.error('[DELETE /api/reports/[id]] Error fetching report:', fetchError);
      return NextResponse.json(
        { error: 'Failed to verify report' },
        { status: 500 }
      );
    }

    if (!report) {
      // Report doesn't exist OR user doesn't have SELECT permission
      // Return 404 for both cases (don't leak existence information)
      console.log('[DELETE /api/reports/[id]] Report not found or not accessible');
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    console.log('[DELETE /api/reports/[id]] Report found:', {
      reportId: report.id,
      reportName: report.report_name,
      organizationId: report.organization_id,
      requestedBy: report.requested_by,
      isOwner: report.requested_by === user.id
    });

    // Step 2: Attempt deletion - let RLS DELETE policy handle permissions
    const { error: deleteError, count: deleteCount } = await supabase
      .from('report_queue')
      .delete({ count: 'exact' })
      .eq('id', reportId);

    if (deleteError) {
      // Check if it's a permission error
      if (deleteError.code === '42501') {
        // RLS policy prevented deletion
        console.error('[DELETE /api/reports/[id]] RLS DELETE policy denied access:', {
          reportId,
          userId: user.id,
          errorCode: deleteError.code,
          errorMessage: deleteError.message
        });

        // This indicates policy mismatch - user can SELECT but not DELETE
        // Log this for monitoring
        console.error('CRITICAL: RLS Policy Mismatch Detected!', {
          operation: 'DELETE',
          reportId,
          userId: user.id,
          userCanSelect: true,  // We know this because we fetched the report
          userCanDelete: false, // RLS denied the deletion
          recommendation: 'Check if SELECT and DELETE policies are aligned'
        });

        return NextResponse.json(
          {
            error: 'Permission denied',
            details: 'You can view this report but cannot delete it. Please contact an administrator.',
            code: 'RLS_POLICY_MISMATCH'
          },
          { status: 403 }
        );
      }

      // Other database errors
      console.error('[DELETE /api/reports/[id]] Database error during deletion:', {
        errorCode: deleteError.code,
        errorMessage: deleteError.message,
        errorDetails: deleteError.details,
        errorHint: deleteError.hint
      });

      return NextResponse.json(
        { error: 'Failed to delete report' },
        { status: 500 }
      );
    }

    // Check if deletion actually occurred
    if (!deleteCount || deleteCount === 0) {
      // This shouldn't happen since we verified the report exists
      // Could indicate a race condition where report was deleted between SELECT and DELETE
      console.warn('[DELETE /api/reports/[id]] Delete operation affected 0 rows:', {
        reportId,
        userId: user.id,
        possibleRaceCondition: true
      });

      return NextResponse.json(
        { error: 'Report not found or already deleted' },
        { status: 404 }
      );
    }

    // Success - report was deleted
    console.log('[DELETE /api/reports/[id]] Successfully deleted report:', {
      reportId,
      reportName: report.report_name,
      deletedCount: deleteCount,
      userId: user.id
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Report deleted successfully',
        deletedCount: deleteCount,
        report: {
          id: report.id,
          name: report.report_name
        }
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      }
    );
  } catch (error) {
    console.error('[DELETE /api/reports/[id]] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/reports/[id] - Download individual report (Improved version)
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

    // Get the report - RLS will handle access control
    // We don't need to manually check organization membership
    const { data: report, error: reportError } = await supabase
      .from('report_queue')
      .select('*')
      .eq('id', reportId)
      .maybeSingle();

    if (reportError) {
      console.error('Error fetching report:', reportError);
      return NextResponse.json(
        { error: 'Failed to fetch report' },
        { status: 500 }
      );
    }

    if (!report) {
      // Report doesn't exist OR user doesn't have permission
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Check if report is completed
    if (report.status !== 'completed') {
      return NextResponse.json(
        {
          error: 'Report is not ready for download',
          status: report.status,
          progress: report.progress
        },
        { status: 400 }
      );
    }

    // Check if file_url exists
    if (!report.file_url) {
      return NextResponse.json(
        { error: 'Report file not available' },
        { status: 404 }
      );
    }

    // Log the download
    console.log(`User ${user.id} downloading report ${reportId}`);

    // Return the file URL and metadata
    return NextResponse.json({
      file_url: report.file_url,
      report_name: report.report_name,
      format: report.format,
      file_size_bytes: report.file_size_bytes,
      mime_type: report.mime_type,
      completed_at: report.completed_at
    });
  } catch (error) {
    console.error('Error downloading report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/reports/[id] - Update report status (for admin use)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: reportId } = params;
    const body = await request.json();
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update the report - RLS will handle permission checks
    const { data: updatedReport, error: updateError } = await supabase
      .from('report_queue')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('id', reportId)
      .select()
      .single();

    if (updateError) {
      if (updateError.code === '42501') {
        // RLS policy prevented update
        return NextResponse.json(
          { error: 'You do not have permission to update this report' },
          { status: 403 }
        );
      }

      console.error('Error updating report:', updateError);
      return NextResponse.json(
        { error: 'Failed to update report' },
        { status: 500 }
      );
    }

    if (!updatedReport) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      report: updatedReport
    });
  } catch (error) {
    console.error('Error updating report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}