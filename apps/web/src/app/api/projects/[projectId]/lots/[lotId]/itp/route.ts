import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; lotId: string }> }
) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lotId } = await params;

    console.log('[ITP API] Fetching instances for lot:', lotId);

    // OPTIMIZED: Single query with template JOIN instead of N+1 pattern
    // This eliminates the separate template fetch and client-side mapping
    let query = supabase
      .from('itp_instances')
      .select(
        `
        *,
        itp_templates (
          id,
          name,
          description,
          structure,
          is_active,
          version
        ),
        projects!inner (
          id
        )
      `
      )
      .eq('lot_id', lotId)
      .order('created_at', { ascending: false });

    // Only filter by deleted_at if column exists (migration 0011 may not be applied yet)
    // Check if we can filter by is_active instead as a fallback
    const { data: itpInstances, error: instancesError } = await query;

    if (instancesError) {
      console.error('[ITP API] Error fetching instances:', instancesError);
      return NextResponse.json(
        {
          error: 'Failed to fetch ITP instances',
          details: instancesError.message,
        },
        { status: 500 }
      );
    }

    console.log('[ITP API] Found instances:', itpInstances?.length || 0);

    // Clean up instances - remove nested projects object (only used for RLS)
    // Template data is now properly nested, no mapping needed
    const cleanedInstances = (itpInstances || []).map((itp: any) => {
      const { projects, ...cleanedItp } = itp;
      return cleanedItp;
    });

    console.log('[ITP API] Returning instances:', cleanedInstances.length);

    // Return instances in the format expected by the frontend
    // Template data is already included via the join
    return NextResponse.json({ instances: cleanedInstances });
  } catch (error) {
    console.error('[ITP API] Unexpected error:', error);
    console.error('[ITP API] Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; lotId: string }> }
) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, lotId } = await params;
    const body = await request.json();

    // Create new ITP instance
    const { data: itpInstance, error } = await supabase
      .from('itp_instances')
      .insert({
        ...body,
        lot_id: lotId,
        project_id: projectId,
        created_by: user.id,
        status: body.status || 'draft',
        completion_percentage: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating ITP instance:', error);
      return NextResponse.json({ error: 'Failed to create ITP instance' }, { status: 500 });
    }

    return NextResponse.json(itpInstance);
  } catch (error) {
    console.error('Create ITP error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
