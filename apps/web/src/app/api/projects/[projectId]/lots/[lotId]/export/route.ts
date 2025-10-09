import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; lotId: string }> }
) {
  try {
    console.log('[Export] Starting export request');
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    console.log('[Export] User check:', { hasUser: !!user, authError });
    if (!user) {
      return NextResponse.json(
        {
          error: 'Authentication required. Please log out and log back in.',
          code: 'AUTH_REQUIRED',
          details: authError?.message,
        },
        { status: 401 }
      );
    }

    const { projectId, lotId } = await params;
    console.log('[Export] Params:', { projectId, lotId });

    // Query lot and ITP instances separately to avoid implicit join issues
    console.log('[Export] Querying lot...');
    const lotPromise = supabase
      .from('lots')
      .select('*')
      .eq('id', lotId)
      .eq('project_id', projectId)
      .single();

    console.log('[Export] Querying ITP instances...');
    console.log('[Export] Query params:', { lotId, projectId, userId: user.id });

    // The RLS policy for itp_instances REQUIRES an explicit join with projects table
    // This is because the policy uses: EXISTS (SELECT 1 FROM projects p JOIN organization_members...)
    // Without the explicit join, the RLS policy fails to execute properly
    const itpPromise = supabase
      .from('itp_instances')
      .select(
        'id, name, inspection_status, completion_percentage, data, project_id, projects!inner(id, organization_id)'
      )
      .eq('lot_id', lotId)
      .eq('project_id', projectId);

    console.log('[Export] ITP query built with projects join for RLS');

    // Execute queries in parallel
    console.log('[Export] Executing queries...');
    const [{ data: lot, error: lotError }, { data: itpInstances, error: itpError }] =
      await Promise.all([lotPromise, itpPromise]);
    console.log('[Export] Queries complete:', { hasLot: !!lot, hasItps: !!itpInstances });

    if (lotError) {
      console.error('Error fetching lot:', lotError);
      return NextResponse.json({ error: 'Failed to fetch lot data' }, { status: 500 });
    }

    if (itpError) {
      console.error(
        'Error fetching ITP instances - FULL ERROR:',
        JSON.stringify(itpError, null, 2)
      );
      console.error('Error details:', {
        message: itpError.message,
        details: itpError.details,
        hint: itpError.hint,
        code: itpError.code,
      });
      return NextResponse.json(
        {
          error: 'Failed to fetch ITP instances',
          debug: {
            message: itpError.message,
            details: itpError.details,
            hint: itpError.hint,
            code: itpError.code,
          },
        },
        { status: 500 }
      );
    }

    if (!lot) {
      return NextResponse.json({ error: 'Lot not found' }, { status: 404 });
    }

    // Clean up ITP instances - remove nested projects object added for RLS
    const cleanedInstances = (itpInstances || []).map((itp: any) => {
      const { projects, ...cleanedItp } = itp;
      return cleanedItp;
    });

    // Attach ITP instances to lot
    lot.itp_instances = cleanedInstances;

    // Count completed ITPs
    const completedItps =
      lot.itp_instances?.filter((itp: any) => itp.inspection_status === 'completed').length || 0;

    // For now, return a success message - actual report generation would happen here
    return NextResponse.json({
      success: true,
      message: 'Report generation initiated',
      lotId: lot.id,
      lotNumber: lot.lot_number,
      completedItps,
      totalItps: lot.itp_instances?.length || 0,
      estimatedTime: '2-3 minutes',
    });
  } catch (error) {
    console.error('Export endpoint error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
