import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/materials - Get all materials
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const category = searchParams.get('category');
    const supplierId = searchParams.get('supplier_id');
    const search = searchParams.get('search');

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    // Build query
    let query = supabase
      .from('materials')
      .select(
        `
        *,
        preferred_supplier:company_profiles(id, company_name),
        current_cost:material_costs(
          unit_cost,
          supplier_id,
          effective_from
        )
      `
      )
      .eq('organization_id', member.organization_id)
      .eq('is_active', true)
      .order('name', { ascending: true });

    // Apply filters
    if (category) {
      query = query.eq('category', category);
    }
    if (supplierId) {
      query = query.eq('preferred_supplier_id', supplierId);
    }
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,description.ilike.%${search}%,material_code.ilike.%${search}%`
      );
    }

    const { data: materials, error } = await query;

    if (error) {
      console.error('Error fetching materials:', error);
      return NextResponse.json({ error: 'Failed to fetch materials' }, { status: 500 });
    }

    // Get the most recent cost for each material
    if (materials) {
      materials.forEach((material: any) => {
        if (material.current_cost && material.current_cost.length > 0) {
          material.current_cost = material.current_cost.sort(
            (a: any, b: any) =>
              new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime()
          )[0];
        } else {
          material.current_cost = null;
        }
      });
    }

    return NextResponse.json({ materials: materials || [] });
  } catch (error) {
    console.error('Error in materials GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/materials - Create new material
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization and check permissions
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    // Check permissions
    if (!['owner', 'admin', 'project_manager'].includes(member.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Create material
    const { data: material, error: createError } = await supabase
      .from('materials')
      .insert({
        ...body,
        organization_id: member.organization_id,
        created_by: user.id,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating material:', createError);
      return NextResponse.json({ error: 'Failed to create material' }, { status: 500 });
    }

    // If unit cost is provided, create initial cost entry
    if (body.unit_cost) {
      await supabase.from('material_costs').insert({
        material_id: material.id,
        supplier_id: body.preferred_supplier_id,
        unit_cost: body.unit_cost,
        effective_from: new Date().toISOString().split('T')[0],
        created_by: user.id,
      });
    }

    return NextResponse.json({ material });
  } catch (error) {
    console.error('Error in materials POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/materials - Update material
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (!member || !['owner', 'admin', 'project_manager'].includes(member.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id, ...updateData } = body;

    // Update material
    const { data: material, error: updateError } = await supabase
      .from('materials')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating material:', updateError);
      return NextResponse.json({ error: 'Failed to update material' }, { status: 500 });
    }

    // If unit cost changed, create new cost entry
    if (body.unit_cost !== undefined) {
      await supabase.from('material_costs').insert({
        material_id: id,
        supplier_id: body.preferred_supplier_id,
        unit_cost: body.unit_cost,
        effective_from: new Date().toISOString().split('T')[0],
        created_by: user.id,
      });
    }

    return NextResponse.json({ material });
  } catch (error) {
    console.error('Error in materials PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
