import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// DELETE /api/reports/[id] - Delete a report
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log('[DELETE /api/reports/[id]] Request received - CODE VERSION: 2025-10-11-v3-multi-org');
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
      userError: userError?.message,
    });

    if (userError || !user) {
      console.log('[DELETE /api/reports/[id]] Unauthorized - returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(
      '[DELETE /api/reports/[id]] Attempting to delete report:',
      reportId,
      'for user:',
      user.id
    );

    // Get user's organization memberships to verify access
    // This handles users who belong to multiple organizations
    const { data: memberships, error: membershipError } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id);

    console.log('[DELETE /api/reports/[id]] Membership query result:', {
      membershipsCount: memberships?.length || 0,
      hasError: !!membershipError,
      userId: user.id,
    });

    if (membershipError || !memberships || memberships.length === 0) {
      console.warn('[DELETE /api/reports/[id]] User not a member of any organization', {
        userId: user.id,
        error: membershipError,
      });
      return NextResponse.json({ error: 'No organization found for user' }, { status: 403 });
    }

    const orgIds = memberships.map((m) => m.organization_id);
    console.log('[DELETE /api/reports/[id]] User belongs to organizations:', orgIds);

    // Verify the report exists and user can see it before attempting deletion
    // RLS policies will filter this to only reports the user has access to
    const {
      data: report,
      error: lookupError,
    } = await supabase
      .from('report_queue')
      .select('id, requested_by, organization_id')
      .eq('id', reportId)
      .maybeSingle();

    if (lookupError) {
      console.error('[DELETE /api/reports/[id]] Failed to look up report before deletion', {
        reportId,
        error: lookupError,
      });
      return NextResponse.json({ error: 'Failed to verify report before deletion' }, { status: 500 });
    }

    if (!report) {
      console.log('[DELETE /api/reports/[id]] Report not found before deletion attempt', { reportId });
      return NextResponse.json(
        {
          error: 'Report not found',
          details: {
            reportId,
          },
        },
        { status: 404 }
      );
    }

    // Verify the report belongs to one of the user's organizations
    if (!orgIds.includes(report.organization_id)) {
      console.warn('[DELETE /api/reports/[id]] Report does not belong to any of user\'s organizations', {
        reportId,
        reportOrgId: report.organization_id,
        userOrgIds: orgIds,
      });
      return NextResponse.json(
        { error: 'You do not have permission to delete this report' },
        { status: 403 }
      );
    }

    console.log('[DELETE /api/reports/[id]] Report verified, proceeding with deletion', {
      reportId,
      reportOrgId: report.organization_id,
    });

    // Delete the report directly - RLS policies will enforce permissions
    // The delete is executed with count to verify deletion occurred
    const { error: deleteError, count: deleteCount } = await supabase
      .from('report_queue')
      .delete({ count: 'exact' })
      .eq('id', reportId);

    // Log detailed error information
    if (deleteError) {
      if (deleteError.code === '42501') {
        console.warn('[DELETE /api/reports/[id]] Delete forbidden by RLS policy', {
          reportId,
          userId: user.id,
        });
        return NextResponse.json(
          { error: 'You do not have permission to delete this report' },
          { status: 403 }
        );
      }

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

    if (!deleteCount || deleteCount === 0) {
      console.warn('[DELETE /api/reports/[id]] Delete succeeded but affected 0 rows', {
        reportId,
        userId: user.id,
      });
      return NextResponse.json(
        {
          error: 'Report not found or already deleted',
          details: { reportId },
        },
        {
          status: 404,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          },
        }
      );
    }

    // Success - report was deleted
    console.log('Successfully deleted report:', reportId, 'deletedCount:', deleteCount);

    return NextResponse.json(
      {
        success: true,
        message: 'Report deleted successfully',
        deletedCount: deleteCount ?? 1,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
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

    // Get user's organization memberships (handles multi-org users)
    const { data: memberships, error: memberError } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id);

    if (memberError || !memberships || memberships.length === 0) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    // Get the report - RLS will filter to only accessible reports
    const { data: report, error: reportError } = await supabase
      .from('report_queue')
      .select('*')
      .eq('id', reportId)
      .maybeSingle();

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
