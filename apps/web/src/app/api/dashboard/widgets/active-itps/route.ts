import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
    }

    // Check authentication
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get active ITPs
    const { data: itps, error } = await supabase
      .from('itp_instances')
      .select(
        `
        id,
        name,
        completion_percentage,
        inspection_status,
        lots!inner (
          name,
          projects!inner (
            name,
            organization_id
          )
        )
      `
      )
      .eq('lots.projects.organization_id', organizationId)
      .in('inspection_status', ['pending', 'in_progress'])
      .order('updated_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Failed to get active ITPs:', error);
      return NextResponse.json([]);
    }

    const formattedData =
      itps?.map((itp: any) => ({
        id: itp.id,
        name: itp.name,
        completion: itp.completion_percentage || 0,
        status: itp.inspection_status,
        lotName: itp.lots?.[0]?.name,
        projectName: itp.lots?.[0]?.projects?.[0]?.name,
      })) || [];

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('Failed to get active ITPs:', error);
    return NextResponse.json([]);
  }
}
