import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Manual endpoint for admins to refresh materialized views
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or owner
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Only admins can refresh materialized views' },
        { status: 403 }
      );
    }

    // Parse request body for specific views to refresh
    const body = await request.json().catch(() => ({}));
    const requestedViews = body.views as string[] | undefined;

    // Default list of materialized views
    // TODO: Add these views once they're created in the database
    const allViews: string[] = []; // ['daily_workforce_costs', 'project_dashboard_stats'];

    // Determine which views to refresh
    const viewsToRefresh =
      requestedViews && Array.isArray(requestedViews)
        ? requestedViews.filter((view) => allViews.includes(view))
        : allViews;

    if (requestedViews && viewsToRefresh.length === 0) {
      return NextResponse.json({ error: 'No valid views specified' }, { status: 400 });
    }

    const refreshResults: Array<{
      view: string;
      status: 'success' | 'error';
      error?: string;
      duration?: number;
    }> = [];

    // Refresh each view with timing
    for (const viewName of viewsToRefresh) {
      const startTime = Date.now();

      try {
        const { error } = await supabase.rpc(`refresh_${viewName}`);
        const duration = Date.now() - startTime;

        if (error) {
          refreshResults.push({
            view: viewName,
            status: 'error',
            error: error.message,
            duration,
          });
        } else {
          refreshResults.push({
            view: viewName,
            status: 'success',
            duration,
          });
        }
      } catch (error) {
        const duration = Date.now() - startTime;
        refreshResults.push({
          view: viewName,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          duration,
        });
      }
    }

    // Log admin action
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      action: 'admin.refresh_views',
      metadata: {
        views: viewsToRefresh,
        results: refreshResults,
      },
    });

    const allSuccess = refreshResults.every((result) => result.status === 'success');
    const successCount = refreshResults.filter((result) => result.status === 'success').length;
    const totalDuration = refreshResults.reduce((sum, result) => sum + (result.duration || 0), 0);

    return NextResponse.json({
      success: allSuccess,
      message: `Refreshed ${successCount}/${viewsToRefresh.length} materialized views in ${totalDuration}ms`,
      results: refreshResults,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error refreshing views:', error);
    return NextResponse.json(
      {
        error: 'Failed to refresh views',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
