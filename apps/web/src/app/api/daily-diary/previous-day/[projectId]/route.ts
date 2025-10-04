import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { subDays, format } from 'date-fns';

// GET /api/daily-diary/previous-day/[projectId] - Get previous day's workers for auto-populate
// This is the KEY API for the auto-populate feature!
export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const { searchParams } = new URL(request.url);
    const currentDate = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Calculate previous day
    const previousDate = format(subDays(new Date(currentDate), 1), 'yyyy-MM-dd');

    // Get previous day's diary
    const { data: prevDiary } = await supabase
      .from('daily_diaries')
      .select('id')
      .eq('project_id', projectId)
      .eq('diary_date', previousDate)
      .single();

    if (!prevDiary) {
      // No diary from previous day - return empty arrays
      return NextResponse.json({
        date: previousDate,
        labor: [],
        plant: [],
        materials: [],
      });
    }

    // Get workers from previous day
    const { data: labor } = await supabase
      .from('diary_labor')
      .select(
        `
        worker_id,
        hours_worked,
        notes,
        worker:workers(
          *,
          contractor:contractors(*)
        )
      `
      )
      .eq('diary_id', prevDiary.id);

    // Get plant from previous day
    const { data: plant } = await supabase
      .from('diary_plant')
      .select(
        `
        plant_id,
        hours_used,
        notes,
        plant:plant_items(
          *,
          contractor:contractors(*)
        )
      `
      )
      .eq('diary_id', prevDiary.id);

    // Get materials from previous day
    const { data: materials } = await supabase
      .from('diary_materials')
      .select('*')
      .eq('diary_id', prevDiary.id);

    return NextResponse.json({
      date: previousDate,
      labor: labor || [],
      plant: plant || [],
      materials: materials || [],
    });
  } catch (error) {
    console.error('Previous day GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
