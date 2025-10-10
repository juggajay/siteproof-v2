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

    console.log('[ITP API] 🔍 Fetching instances for lot:', lotId);

    // First, let's see ALL instances including deleted ones for debugging
    const { data: allInstances } = await supabase
      .from('itp_instances')
      .select('id, deleted_at, is_active, created_at')
      .eq('lot_id', lotId);

    console.log('[ITP API] 📊 All instances (including deleted):', allInstances);
    console.log(
      '[ITP API] 📊 Deleted instances:',
      allInstances?.filter((i) => i.deleted_at !== null)
    );

    // OPTIMIZED: Single query with template JOIN instead of N+1 pattern
    // This eliminates the separate template fetch and client-side mapping
    // REMOVED: projects!inner join - it causes RLS issues and is unnecessary
    // The RLS policy on itp_instances already verifies project access
    const { data: itpInstances, error: instancesError } = await supabase
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
        )
      `
      )
      .eq('lot_id', lotId)
      .is('deleted_at', null) // Filter out soft-deleted ITPs
      .order('created_at', { ascending: false });

    if (instancesError) {
      console.error('[ITP API] ❌ Error fetching instances:', instancesError);
      return NextResponse.json(
        {
          error: 'Failed to fetch ITP instances',
          details: instancesError.message,
        },
        { status: 500 }
      );
    }

    console.log('[ITP API] ✅ Found active instances:', itpInstances?.length || 0);
    console.log(
      '[ITP API] 📋 Active instance IDs:',
      itpInstances?.map((i) => ({ id: i.id, deleted_at: i.deleted_at, is_active: i.is_active }))
    );

    // No cleanup needed - template data is already properly nested
    // and we don't have the projects join anymore
    const cleanedInstances = itpInstances || [];

    console.log('[ITP API] Returning instances:', cleanedInstances.length);

    // Return instances in the format expected by the frontend
    // Template data is already included via the join
    return NextResponse.json(
      { instances: cleanedInstances },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
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
