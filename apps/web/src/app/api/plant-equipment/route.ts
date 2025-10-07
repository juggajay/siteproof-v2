import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/plant-equipment - Get all equipment
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const companyId = searchParams.get('company_id');

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

    // Build query using plant_items table
    let query = supabase
      .from('plant_items')
      .select('*')
      .eq('organization_id', member.organization_id)
      .eq('is_active', true)
      .order('item_type', { ascending: true });

    // Apply filters
    if (status) {
      // Map status to is_active for filtering
      if (status === 'active' || status === 'available') {
        query = query.eq('is_active', true);
      }
    }
    if (category) {
      query = query.eq('item_type', category);
    }
    if (companyId) {
      query = query.eq('company_profile_id', companyId);
    }

    const { data: plantItems, error } = await query;

    // Transform data to match frontend expectations
    const equipment = plantItems?.map((item) => ({
      ...item,
      name: item.item_type,
      category: item.item_type,
      make: item.make_model?.split(' ')[0] || '',
      model: item.make_model?.split(' ').slice(1).join(' ') || item.make_model || '',
      year: item.year_manufactured,
      status: item.is_active ? 'available' : 'inactive',
    }));

    if (error) {
      console.error('Error fetching equipment:', error);
      // If table doesn't exist, return empty array
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return NextResponse.json({ equipment: [] });
      }
      return NextResponse.json({ error: 'Failed to fetch equipment' }, { status: 500 });
    }

    return NextResponse.json({ equipment: equipment || [] });
  } catch (error) {
    console.error('Error in plant-equipment GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/plant-equipment - Create new equipment
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

    // Transform frontend data to match plant_items schema
    const plantItemData = {
      company_profile_id: body.company_id || null,
      organization_id: member.organization_id,
      item_type: body.category || body.name || '',
      make_model:
        body.make && body.model
          ? `${body.make} ${body.model}`.trim()
          : body.make || body.model || '',
      description: body.description || body.notes || '',
      registration_number: body.registration_number || '',
      serial_number: body.serial_number || '',
      asset_number: body.asset_number || '',
      capacity: body.capacity || '',
      year_manufactured: body.year || null,
      specifications: {
        ownership_type: body.ownership_type,
        operator_required: body.operator_required,
        fuel_cost_per_hour: body.fuel_cost_per_hour,
        daily_rate: body.daily_rate,
        weekly_rate: body.weekly_rate,
        ...(body.specifications || {}),
      },
      inspection_due_date: body.inspection_due_date || null,
      certification_details: body.certification_details || [],
      is_active:
        body.status === 'available' || body.status === 'active' || body.is_active !== false,
      current_location: body.current_location || body.location || '',
      notes: body.notes || '',
      hourly_rate: body.hourly_rate || null,
      currency: body.currency || 'AUD',
      created_by: user.id,
    };

    // Create equipment
    const { data: equipment, error: createError } = await supabase
      .from('plant_items')
      .insert(plantItemData)
      .select()
      .single();

    if (createError) {
      console.error('Error creating equipment:', createError);
      return NextResponse.json({ error: 'Failed to create equipment' }, { status: 500 });
    }

    return NextResponse.json({ equipment });
  } catch (error) {
    console.error('Error in plant-equipment POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
