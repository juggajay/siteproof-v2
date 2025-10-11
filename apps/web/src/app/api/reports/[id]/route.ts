import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// DELETE /api/reports/[id] - Delete a report
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log(
      '[DELETE /api/reports/[id]] Request received - CODE VERSION: 2025-10-11-v6-auth-refresh'
    );
    console.log('[DELETE /api/reports/[id]] Params:', params);

    const { id: reportId } = params;
    console.log('[DELETE /api/reports/[id]] Report ID:', reportId);

    const supabase = await createClient();

    // Refresh the session to ensure auth context is fresh
    const {
      data: { session: refreshedSession },
      error: sessionError,
    } = await supabase.auth.refreshSession();

    console.log('[DELETE /api/reports/[id]] Session refresh result:', {
      hasSession: !!refreshedSession,
      sessionUserId: refreshedSession?.user?.id,
      accessToken: refreshedSession?.access_token ? 'present' : 'missing',
      error: sessionError?.message,
    });

    if (sessionError || !refreshedSession) {
      console.log('[DELETE /api/reports/[id]] Session refresh failed - returning 401');
      return NextResponse.json({ error: 'Unauthorized - session invalid' }, { status: 401 });
    }

    const user = refreshedSession.user;

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

    console.log('[DELETE /api/reports/[id]] Attempting deletion with refreshed auth session');

    // Delete the report directly - RLS policies enforce permissions automatically
    // This approach matches the GET endpoint pattern and trusts the RLS policies
    // which are proven to work correctly (SELECT and DELETE policies are identical)
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
