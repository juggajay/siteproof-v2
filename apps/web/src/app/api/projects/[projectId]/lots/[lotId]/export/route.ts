import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: { projectId: string; lotId: string } }
) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, lotId } = params;

    // Get lot details with ITPs
    const { data: lot, error: lotError } = await supabase
      .from('lots')
      .select(`
        *,
        itp_instances (
          id,
          name,
          status,
          completion_percentage,
          data
        )
      `)
      .eq('id', lotId)
      .eq('project_id', projectId)
      .single();

    if (lotError) {
      console.error('Error fetching lot:', lotError);
      return NextResponse.json({ error: 'Failed to fetch lot data' }, { status: 500 });
    }

    if (!lot) {
      return NextResponse.json({ error: 'Lot not found' }, { status: 404 });
    }

    // Count completed ITPs
    const completedItps = lot.itp_instances?.filter(
      (itp: any) => itp.status === 'completed'
    ).length || 0;

    // For now, return a success message - actual report generation would happen here
    return NextResponse.json({
      success: true,
      message: 'Report generation initiated',
      lotId: lot.id,
      lotNumber: lot.lot_number,
      completedItps,
      totalItps: lot.itp_instances?.length || 0,
      estimatedTime: '2-3 minutes'
    });

  } catch (error) {
    console.error('Export endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}