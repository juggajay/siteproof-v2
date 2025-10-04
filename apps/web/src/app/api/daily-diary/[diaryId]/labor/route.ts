import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/daily-diary/[diaryId]/labor - Get labor entries for a diary
export async function GET(request: Request, { params }: { params: Promise<{ diaryId: string }> }) {
  try {
    const { diaryId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('diary_labor')
      .select(
        `
        *,
        worker:workers(
          *,
          contractor:contractors(*)
        )
      `
      )
      .eq('diary_id', diaryId);

    if (error) {
      console.error('Error fetching diary labor:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Diary labor GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/daily-diary/[diaryId]/labor - Add labor entries to diary (batch)
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
    const { workers } = body;

    if (!workers || !Array.isArray(workers) || workers.length === 0) {
      return NextResponse.json(
        { error: 'workers array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Batch insert all workers
    const { data, error } = await supabase.from('diary_labor').insert(
      workers.map((w: any) => ({
        diary_id: diaryId,
        worker_id: w.worker_id,
        hours_worked: w.hours_worked,
        notes: w.notes,
      }))
    ).select(`
        *,
        worker:workers(
          *,
          contractor:contractors(*)
        )
      `);

    if (error) {
      console.error('Error creating diary labor:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Diary labor POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/daily-diary/[diaryId]/labor - Clear all labor entries for a diary
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

    const { error } = await supabase.from('diary_labor').delete().eq('diary_id', diaryId);

    if (error) {
      console.error('Error deleting diary labor:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Labor entries deleted successfully' });
  } catch (error) {
    console.error('Diary labor DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
