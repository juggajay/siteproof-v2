import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { log } from '@/lib/logger';

/**
 * POST /api/admin/refresh-stats
 *
 * Manually trigger refresh of materialized views
 * Useful for debugging and immediate updates
 */
export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    log.info('[Admin API] Refreshing materialized views', { userId: user.id });

    // Call the PostgreSQL function to refresh stats
    const { error } = await supabase.rpc('force_refresh_project_stats');

    if (error) {
      log.error('[Admin API] Failed to refresh stats', error);
      return NextResponse.json(
        {
          error: 'Failed to refresh statistics',
          details: error.message,
        },
        { status: 500 }
      );
    }

    log.info('[Admin API] Successfully refreshed materialized views');

    return NextResponse.json({
      message: 'Statistics refreshed successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    log.error('[Admin API] Unexpected error refreshing stats', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/admin/refresh-stats
 *
 * Check if materialized view refresh is needed
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get materialized view metadata
    const { data, error } = await supabase
      .from('pg_matviews')
      .select('matviewname, last_refresh')
      .eq('matviewname', 'project_dashboard_stats')
      .single();

    if (error) {
      log.warn('[Admin API] Could not fetch materialized view metadata', error);
    }

    return NextResponse.json({
      viewName: 'project_dashboard_stats',
      lastRefresh: data?.last_refresh || null,
      message: 'Use POST to trigger manual refresh',
    });
  } catch (error) {
    log.error('[Admin API] Error checking refresh status', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
