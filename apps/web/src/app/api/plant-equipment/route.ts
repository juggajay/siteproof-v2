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

    // Build query
    let query = supabase
      .from('plant_equipment')
      .select(
        `
        *,
        company:company_profiles(id, company_name),
        supplier:company_profiles!plant_equipment_supplier_id_fkey(id, company_name)
      `
      )
      .eq('organization_id', member.organization_id)
      .eq('is_active', true)
      .order('name', { ascending: true });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data: equipment, error } = await query;

    if (error) {
      console.error('Error fetching equipment:', error);
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

    // Create equipment
    const { data: equipment, error: createError } = await supabase
      .from('plant_equipment')
      .insert({
        ...body,
        organization_id: member.organization_id,
        created_by: user.id,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating equipment:', createError);
      return NextResponse.json({ error: 'Failed to create equipment' }, { status: 500 });
    }

    // If rates are provided, create initial rate entry
    if (body.hourly_rate || body.daily_rate || body.weekly_rate || body.monthly_rate) {
      await supabase.from('plant_rates').insert({
        equipment_id: equipment.id,
        hourly_rate: body.hourly_rate,
        daily_rate: body.daily_rate,
        weekly_rate: body.weekly_rate,
        monthly_rate: body.monthly_rate,
        fuel_cost_per_hour: body.fuel_cost_per_hour,
        effective_from: new Date().toISOString().split('T')[0],
        created_by: user.id,
      });
    }

    return NextResponse.json({ equipment });
  } catch (error) {
    console.error('Error in plant-equipment POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
