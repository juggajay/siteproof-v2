import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// POST /api/daily-diary/[diaryId]/materials - Add material entries (batch)
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
    const { materials } = body;

    if (!materials || !Array.isArray(materials) || materials.length === 0) {
      return NextResponse.json(
        { error: 'materials array is required and must not be empty' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('diary_materials')
      .insert(
        materials.map((m: any) => ({
          diary_id: diaryId,
          material_id: m.material_id,
          material_name: m.material_name,
          quantity: m.quantity,
          unit: m.unit,
          supplier_name: m.supplier_name,
          notes: m.notes,
        }))
      )
      .select();

    if (error) {
      console.error('Error creating diary materials:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Diary materials POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/daily-diary/[diaryId]/materials
export async function DELETE(
  _request: Request,
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

    const { error } = await supabase.from('diary_materials').delete().eq('diary_id', diaryId);

    if (error) {
      console.error('Error deleting diary materials:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Material entries deleted successfully' });
  } catch (error) {
    console.error('Diary materials DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
