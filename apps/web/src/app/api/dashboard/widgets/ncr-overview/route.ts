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

    // Get NCR statistics
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get projects for this organization
    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .eq('organization_id', organizationId);

    const projectIds = projects?.map((p) => p.id) || [];

    // Get NCR counts
    const { data: ncrs } = await supabase
      .from('ncrs')
      .select('id, status, closed_at')
      .in('project_id', projectIds);

    const open = ncrs?.filter((n) => n.status === 'open').length || 0;
    const inProgress = ncrs?.filter((n) => n.status === 'in_progress').length || 0;
    const closedToday =
      ncrs?.filter((n) => {
        if (n.status !== 'closed' || !n.closed_at) return false;
        const closedDate = new Date(n.closed_at);
        return closedDate >= today;
      }).length || 0;

    return NextResponse.json({
      open,
      inProgress,
      closedToday,
      total: ncrs?.length || 0,
    });
  } catch (error) {
    console.error('Failed to get NCR overview:', error);
    return NextResponse.json({
      open: 0,
      inProgress: 0,
      closedToday: 0,
      total: 0,
    });
  }
}
