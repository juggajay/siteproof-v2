import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/material-suppliers - List material suppliers
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organization_id');

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let query = supabase.from('material_suppliers').select('*').order('name');

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching material suppliers:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Material suppliers GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/material-suppliers - Create material supplier
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
    const { organization_id, name, contact_email, contact_phone } = body;

    if (!organization_id || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: organization_id, name' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('material_suppliers')
      .insert({
        organization_id,
        name,
        contact_email,
        contact_phone,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating material supplier:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Material suppliers POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
