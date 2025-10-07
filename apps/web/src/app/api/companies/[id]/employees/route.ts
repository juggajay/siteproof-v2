import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/companies/[id]/employees - Get all employees for a company
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: companyId } = params;
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get employees for the company
    const { data: employees, error } = await supabase
      .from('workers')
      .select('*')
      .eq('contractor_id', companyId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching employees:', error);
      return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
    }

    return NextResponse.json({ employees: employees || [] });
  } catch (error) {
    console.error('Error in employees GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/companies/[id]/employees - Create a new employee
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: companyId } = params;
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
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    // Only admin/owner can create employees
    if (!['owner', 'admin'].includes(member.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Verify the company belongs to the organization
    const { data: company } = await supabase
      .from('contractors')
      .select('id, organization_id')
      .eq('id', companyId)
      .eq('organization_id', member.organization_id)
      .single();

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Create employee
    const { data: employee, error: createError } = await supabase
      .from('workers')
      .insert({
        ...body,
        contractor_id: companyId,
        organization_id: member.organization_id,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating employee:', createError);
      return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 });
    }

    // If rates are provided, create initial rate entry
    if (body.standard_hourly_rate || body.overtime_hourly_rate || body.daily_rate) {
      await supabase.from('worker_rates').insert({
        worker_id: employee.id,
        standard_hourly_rate: body.standard_hourly_rate,
        overtime_hourly_rate: body.overtime_hourly_rate,
        daily_rate: body.daily_rate,
        effective_from: new Date().toISOString().split('T')[0],
        created_by: user.id,
      });
    }

    return NextResponse.json({ employee });
  } catch (error) {
    console.error('Error in employees POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/companies/[id]/employees - Update multiple employees
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: companyId } = params;
    const supabase = await createClient();
    const { employees } = await request.json();

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

    if (!member || !['owner', 'admin'].includes(member.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Update employees in batch
    const updates = await Promise.all(
      employees.map(async (emp: any) => {
        const { data, error } = await supabase
          .from('workers')
          .update({
            ...emp,
            updated_at: new Date().toISOString(),
          })
          .eq('id', emp.id)
          .eq('contractor_id', companyId)
          .select()
          .single();

        if (error) {
          console.error(`Error updating employee ${emp.id}:`, error);
        }
        return data;
      })
    );

    return NextResponse.json({
      employees: updates.filter(Boolean),
      updated: updates.filter(Boolean).length,
    });
  } catch (error) {
    console.error('Error in employees PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
