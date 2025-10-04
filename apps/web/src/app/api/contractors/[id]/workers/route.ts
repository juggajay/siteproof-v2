import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/contractors/[contractorId]/workers - List workers for a contractor
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ contractorId: string }> }
) {
  try {
    const { contractorId } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('workers')
      .select(
        `
        *,
        contractor:company_profiles!workers_contractor_id_fkey(*)
      `
      )
      .eq('contractor_id', contractorId)
      .order('name');

    if (error) {
      console.error('Error fetching workers:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Workers GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/contractors/[contractorId]/workers - Create a new worker
export async function POST(
  request: Request,
  { params }: { params: Promise<{ contractorId: string }> }
) {
  try {
    const { contractorId } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      organization_id,
      name,
      job_title,
      hourly_rate,
      certifications,
      contact_phone,
      contact_email,
    } = body;

    // Validate required fields
    if (!organization_id || !name || !job_title || !hourly_rate) {
      return NextResponse.json(
        { error: 'Missing required fields: organization_id, name, job_title, hourly_rate' },
        { status: 400 }
      );
    }

    // Verify contractor exists and user has permission
    const { data: contractor } = await supabase
      .from('company_profiles')
      .select('organization_id')
      .eq('id', contractorId)
      .eq('company_type', 'contractor')
      .single();

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    // Verify user has permission in this organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', contractor.organization_id)
      .eq('user_id', user.id)
      .single();

    if (!membership || !['owner', 'admin', 'member'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'You do not have permission to add workers' },
        { status: 403 }
      );
    }

    // Insert worker
    const { data, error } = await supabase
      .from('workers')
      .insert({
        contractor_id: contractorId,
        organization_id,
        name,
        job_title,
        hourly_rate,
        certifications,
        contact_phone,
        contact_email,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating worker:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Workers POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
