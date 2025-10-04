import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// POST /api/daily-diary/[diaryId]/plant - Add plant entries (batch)
export async function POST(request: Request, { params }: { params: Promise<{ diaryId: string }> }) {
  try {
    const { diaryId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { plant } = body;

    if (!plant || !Array.isArray(plant) || plant.length === 0) {
      return NextResponse.json(
        { error: 'plant array is required and must not be empty' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('diary_plant')
      .insert(
        plant.map((p: any) => ({
          diary_id: diaryId,
          plant_id: p.plant_id,
          hours_used: p.hours_used,
          notes: p.notes,
        }))
      )
      .select();

    if (error) {
      console.error('Error creating diary plant:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Diary plant POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/daily-diary/[diaryId]/plant
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ diaryId: string }> }
) {
  try {
    const { diaryId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase.from('diary_plant').delete().eq('diary_id', diaryId);

    if (error) {
      console.error('Error deleting diary plant:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Plant entries deleted successfully' });
  } catch (error) {
    console.error('Diary plant DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
