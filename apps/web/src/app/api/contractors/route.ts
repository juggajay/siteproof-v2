import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/contractors - List contractors
export async function GET() {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Build query - use company_profiles filtered by company_type = 'contractor'
    let query = supabase
      .from('company_profiles')
      .select('*')
      .eq('company_type', 'contractor')
      .order('company_name');

    // Filter by subtype if provided (labor vs plant stored elsewhere or in metadata)
    // Note: The 'type' field for labor/plant distinction doesn't exist in company_profiles
    // You may need to add a custom field or use a different approach
    // For now, we'll skip this filter since company_profiles doesn't have a 'type' field
    // Consider adding metadata JSONB field to store contractor subtype

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching contractors:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Contractors GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/contractors - Create a new contractor
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { organization_id, name, type, contact_email, contact_phone } = body;

    // Validate required fields
    if (!organization_id || !name || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: organization_id, name, type' },
        { status: 400 }
      );
    }

    // Validate type
    if (!['labor', 'plant'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be either "labor" or "plant"' },
        { status: 400 }
      );
    }

    // Verify user has permission in this organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organization_id)
      .eq('user_id', user.id)
      .single();

    if (!membership || !['owner', 'admin', 'member'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'You do not have permission to add contractors in this organization' },
        { status: 403 }
      );
    }

    // Get user for created_by field
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // Insert contractor - use company_profiles with company_type = 'contractor'
    const { data, error } = await supabase
      .from('company_profiles')
      .insert({
        organization_id,
        company_name: name,
        company_type: 'contractor',
        primary_contact_email: contact_email,
        primary_contact_phone: contact_phone,
        is_active: true,
        created_by: currentUser.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating contractor:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Contractors POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
