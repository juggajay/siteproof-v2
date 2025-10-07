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
      .eq('company_profile_id', companyId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching employees:', error);
      return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
    }

    // Transform data to match frontend expectations
    const transformedEmployees = (employees || []).map((emp: any) => {
      const nameParts = (emp.name || '').split(' ');
      const first_name = nameParts[0] || '';
      const last_name = nameParts.slice(1).join(' ') || '';
      return {
        ...emp,
        first_name,
        last_name,
        email: emp.contact_email || emp.email,
        phone: emp.contact_phone || emp.phone,
        role: emp.job_title || emp.role,
        standard_hourly_rate: emp.hourly_rate || emp.standard_hourly_rate,
      };
    });

    return NextResponse.json({ employees: transformedEmployees });
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
      .from('company_profiles')
      .select('id, organization_id')
      .eq('id', companyId)
      .eq('organization_id', member.organization_id)
      .single();

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Transform request data to match workers table schema
    const workerData = {
      company_profile_id: companyId,
      organization_id: member.organization_id,
      name: body.name || `${body.first_name || ''} ${body.last_name || ''}`.trim(),
      job_title: body.job_title || body.role || body.trade || '',
      trade: body.trade || '',
      employee_number: body.employee_number || '',
      contact_phone: body.contact_phone || body.phone || '',
      contact_email: body.contact_email || body.email || '',
      start_date: body.start_date || null,
      end_date: body.end_date || null,
      employment_type: body.employment_type || '',
      hourly_rate: body.hourly_rate || body.standard_hourly_rate || null,
      currency: body.currency || 'AUD',
      is_active: body.is_active !== undefined ? body.is_active : true,
      notes: body.notes || '',
      created_by: user.id,
    };

    // Create employee
    const { data: employee, error: createError } = await supabase
      .from('workers')
      .insert(workerData)
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
          .eq('company_profile_id', companyId)
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
