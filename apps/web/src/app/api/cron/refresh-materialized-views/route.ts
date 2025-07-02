import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

// This endpoint should be called by a cron job service like Vercel Cron or similar
// It refreshes all materialized views to keep them up to date

export async function GET() {
  try {
    // Verify the request is authorized
    // In production, you should use a proper authorization method
    // like checking for a secret header or API key
    const headersList = headers();
    const authHeader = headersList.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const refreshResults: Array<{ view: string; status: 'success' | 'error'; error?: string }> = [];

    // List of materialized views to refresh
    const materializedViews = [
      'daily_workforce_costs',
      'project_dashboard_stats',
      // Add other materialized views here as needed
    ];

    // Refresh each materialized view
    for (const viewName of materializedViews) {
      try {
        const { error } = await supabase.rpc(`refresh_${viewName}`);

        if (error) {
          refreshResults.push({
            view: viewName,
            status: 'error',
            error: error.message,
          });
          console.error(`Error refreshing ${viewName}:`, error);
        } else {
          refreshResults.push({
            view: viewName,
            status: 'success',
          });
          console.log(`Successfully refreshed ${viewName}`);
        }
      } catch (error) {
        refreshResults.push({
          view: viewName,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        console.error(`Exception refreshing ${viewName}:`, error);
      }
    }

    // Check if all views were refreshed successfully
    const allSuccess = refreshResults.every((result) => result.status === 'success');
    const successCount = refreshResults.filter((result) => result.status === 'success').length;

    return NextResponse.json(
      {
        success: allSuccess,
        message: `Refreshed ${successCount}/${materializedViews.length} materialized views`,
        results: refreshResults,
        timestamp: new Date().toISOString(),
      },
      {
        status: allSuccess ? 200 : 207, // 207 Multi-Status for partial success
      }
    );
  } catch (error) {
    console.error('Error in refresh materialized views cron:', error);
    return NextResponse.json(
      {
        error: 'Failed to refresh materialized views',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Also support POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request);
}
