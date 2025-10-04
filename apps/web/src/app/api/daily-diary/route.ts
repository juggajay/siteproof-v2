import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/daily-diary?project_id=xxx&date=yyyy-mm-dd
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const date = searchParams.get('date');

    if (!projectId || !date) {
      return NextResponse.json({ error: 'project_id and date are required' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the diary entry for this project and date
    const { data: diary, error: diaryError } = await supabase
      .from('daily_diaries')
      .select('*')
      .eq('project_id', projectId)
      .eq('diary_date', date)
      .single();

    if (diaryError && diaryError.code !== 'PGRST116') {
      // PGRST116 = no rows
      console.error('Error fetching diary:', diaryError);
      return NextResponse.json({ error: diaryError.message }, { status: 500 });
    }

    if (!diary) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Get labor entries
    const { data: labor } = await supabase
      .from('diary_labor')
      .select('*, worker:workers(*, contractor:contractors(*))')
      .eq('diary_id', diary.id);

    // Get plant entries
    const { data: plant } = await supabase
      .from('diary_plant')
      .select('*, plant_item:plant_items(*, contractor:contractors(*))')
      .eq('diary_id', diary.id);

    // Get materials entries
    const { data: materials } = await supabase
      .from('diary_materials')
      .select('*')
      .eq('diary_id', diary.id);

    return NextResponse.json({
      ...diary,
      labor: labor || [],
      plant: plant || [],
      materials: materials || [],
    });
  } catch (error) {
    console.error('Daily diary GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/daily-diary - Create diary entry with labor/plant/materials
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      project_id,
      diary_date,
      weather_notes,
      progress_notes,
      labor = [],
      plant = [],
      materials = [],
    } = body;

    if (!project_id || !diary_date) {
      return NextResponse.json(
        { error: 'project_id and diary_date are required' },
        { status: 400 }
      );
    }

    // Get project to retrieve organization_id
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('organization_id')
      .eq('id', project_id)
      .single();

    if (projectError || !project) {
      console.error('Error fetching project:', projectError);
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if diary already exists for this date
    const { data: existingDiary } = await supabase
      .from('daily_diaries')
      .select('id')
      .eq('project_id', project_id)
      .eq('diary_date', diary_date)
      .single();

    let diaryId: string;

    if (existingDiary) {
      // Update existing diary
      const { data: updatedDiary, error: updateError } = await supabase
        .from('daily_diaries')
        .update({
          weather_notes,
          progress_notes,
          work_summary: progress_notes || '',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingDiary.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating diary:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      diaryId = updatedDiary.id;

      // Delete existing entries
      await Promise.all([
        supabase.from('diary_labor').delete().eq('diary_id', diaryId),
        supabase.from('diary_plant').delete().eq('diary_id', diaryId),
        supabase.from('diary_materials').delete().eq('diary_id', diaryId),
      ]);
    } else {
      // Generate diary number
      const { data: diaryNumber, error: rpcError } = await supabase.rpc('generate_diary_number', {
        p_project_id: project_id,
        p_diary_date: diary_date,
      });

      if (rpcError || !diaryNumber) {
        console.error('Error generating diary number:', rpcError);
        return NextResponse.json({ error: 'Failed to generate diary number' }, { status: 500 });
      }

      // Create new diary
      const { data: newDiary, error: createError } = await supabase
        .from('daily_diaries')
        .insert({
          project_id,
          organization_id: project.organization_id,
          diary_number: diaryNumber,
          diary_date,
          weather_notes,
          progress_notes,
          work_summary: progress_notes || '', // Use progress_notes as work_summary for now
          created_by: user.id,
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating diary:', createError);
        return NextResponse.json({ error: createError.message }, { status: 500 });
      }

      diaryId = newDiary.id;
    }

    // Insert labor entries
    if (labor.length > 0) {
      const { error: laborError } = await supabase.from('diary_labor').insert(
        labor.map((l: any) => ({
          diary_id: diaryId,
          worker_id: l.worker_id,
          hours_worked: l.hours_worked,
          notes: l.notes,
        }))
      );

      if (laborError) {
        console.error('Error creating labor entries:', laborError);
        return NextResponse.json({ error: laborError.message }, { status: 500 });
      }
    }

    // Insert plant entries
    if (plant.length > 0) {
      const { error: plantError } = await supabase.from('diary_plant').insert(
        plant.map((p: any) => ({
          diary_id: diaryId,
          plant_id: p.plant_id,
          hours_used: p.hours_used,
          notes: p.notes,
        }))
      );

      if (plantError) {
        console.error('Error creating plant entries:', plantError);
        return NextResponse.json({ error: plantError.message }, { status: 500 });
      }
    }

    // Insert materials entries
    if (materials.length > 0) {
      const { error: materialsError } = await supabase.from('diary_materials').insert(
        materials.map((m: any) => ({
          diary_id: diaryId,
          material_id: m.material_id,
          material_name: m.material_name,
          quantity: m.quantity,
          unit: m.unit,
          supplier_name: m.supplier_name,
          notes: m.notes,
        }))
      );

      if (materialsError) {
        console.error('Error creating materials entries:', materialsError);
        return NextResponse.json({ error: materialsError.message }, { status: 500 });
      }
    }

    // Fetch the complete diary with all entries
    const { data: completeDiary } = await supabase
      .from('daily_diaries')
      .select('*')
      .eq('id', diaryId)
      .single();

    return NextResponse.json(completeDiary, { status: 201 });
  } catch (error) {
    console.error('Daily diary POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
