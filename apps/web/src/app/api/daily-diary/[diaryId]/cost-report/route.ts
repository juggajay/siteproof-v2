import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/daily-diary/[diaryId]/cost-report
export async function GET(_request: Request, { params }: { params: Promise<{ diaryId: string }> }) {
  try {
    const { diaryId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get diary with project details
    const { data: diary, error: diaryError } = await supabase
      .from('daily_diaries')
      .select(
        `
        *,
        project:projects(
          id,
          name,
          hide_costs_from_foreman
        )
      `
      )
      .eq('id', diaryId)
      .single();

    if (diaryError || !diary) {
      return NextResponse.json({ error: 'Diary not found' }, { status: 404 });
    }

    // Get labor with costs (from workers table which has hourly_rate)
    const { data: labor } = await supabase
      .from('diary_labor')
      .select(
        `
        *,
        worker:workers(
          id,
          name,
          job_title,
          hourly_rate,
          contractor:contractors(name)
        )
      `
      )
      .eq('diary_id', diaryId);

    // Get plant with costs
    const { data: plant } = await supabase
      .from('diary_plant')
      .select(
        `
        *,
        plant_item:plant_items(
          id,
          name,
          hourly_rate,
          contractor:contractors(name)
        )
      `
      )
      .eq('diary_id', diaryId);

    // Calculate costs
    const laborCosts = (labor || []).map((entry: any) => ({
      ...entry,
      cost: (entry.hours_worked || 0) * (entry.worker?.hourly_rate || 0),
    }));

    const plantCosts = (plant || []).map((entry: any) => ({
      ...entry,
      cost: (entry.hours_used || 0) * (entry.plant_item?.hourly_rate || 0),
    }));

    const totalLaborCost = laborCosts.reduce((sum, entry) => sum + entry.cost, 0);
    const totalPlantCost = plantCosts.reduce((sum, entry) => sum + entry.cost, 0);
    const totalCost = totalLaborCost + totalPlantCost;

    return NextResponse.json({
      diary: {
        id: diary.id,
        diary_number: diary.diary_number,
        diary_date: diary.diary_date,
        project: diary.project,
      },
      labor: laborCosts,
      plant: plantCosts,
      summary: {
        totalLaborCost,
        totalPlantCost,
        totalCost,
        totalLaborHours: laborCosts.reduce((sum, e) => sum + (e.hours_worked || 0), 0),
        totalPlantHours: plantCosts.reduce((sum, e) => sum + (e.hours_used || 0), 0),
      },
    });
  } catch (error) {
    console.error('Cost report error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
