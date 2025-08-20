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

    // Get project statistics
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('id, status')
      .eq('organization_id', organizationId);

    if (projectError) {
      throw projectError;
    }

    const activeProjects = projects?.filter((p) => p.status === 'active').length || 0;
    const completedProjects = projects?.filter((p) => p.status === 'completed').length || 0;

    // Get lot count
    const { count: lotCount } = await supabase
      .from('lots')
      .select('*', { count: 'exact', head: true })
      .in('project_id', projects?.map((p) => p.id) || []);

    // Get ITP count
    const { count: itpCount } = await supabase
      .from('itp_instances')
      .select('*', { count: 'exact', head: true })
      .in('lot_id', projects?.map((p) => p.id) || []);

    return NextResponse.json({
      activeProjects,
      completedProjects,
      totalLots: lotCount || 0,
      totalItps: itpCount || 0,
    });
  } catch (error) {
    console.error('Failed to get project summary:', error);
    return NextResponse.json({ error: 'Failed to get project summary' }, { status: 500 });
  }
}
