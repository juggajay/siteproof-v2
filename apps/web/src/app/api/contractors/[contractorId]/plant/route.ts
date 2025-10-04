import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/contractors/[contractorId]/plant - List plant items for a contractor
export async function GET(
  request: Request,
  { params }: { params: Promise<{ contractorId: string }> }
) {
  try {
    const { contractorId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('plant_items')
      .select(
        `
        *,
        contractor:contractors(*)
      `
      )
      .eq('contractor_id', contractorId)
      .order('name');

    if (error) {
      console.error('Error fetching plant items:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Plant items GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/contractors/[contractorId]/plant - Create a new plant item
export async function POST(
  request: Request,
  { params }: { params: Promise<{ contractorId: string }> }
) {
  try {
    const { contractorId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { organization_id, name, hourly_rate } = body;

    if (!organization_id || !name || !hourly_rate) {
      return NextResponse.json(
        { error: 'Missing required fields: organization_id, name, hourly_rate' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('plant_items')
      .insert({
        contractor_id: contractorId,
        organization_id,
        name,
        hourly_rate,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating plant item:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Plant items POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
