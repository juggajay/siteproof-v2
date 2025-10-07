import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/employees/[id] - Get employee details
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: employeeId } = params;
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get employee with current rates
    const { data: employee, error } = await supabase
      .from('workers')
      .select(
        `
        *,
        company:company_profiles(id, company_name),
        current_rates:worker_rates(
          standard_hourly_rate,
          overtime_hourly_rate,
          daily_rate,
          effective_from
        )
      `
      )
      .eq('id', employeeId)
      .single();

    if (error || !employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Get the most recent rate
    if (employee.current_rates && employee.current_rates.length > 0) {
      employee.current_rates = employee.current_rates.sort(
        (a: any, b: any) =>
          new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime()
      )[0];
    }

    return NextResponse.json({ employee });
  } catch (error) {
    console.error('Error in employee GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/employees/[id] - Update employee
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: employeeId } = params;
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

    if (!member || !['owner', 'admin'].includes(member.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Update employee
    const { data: employee, error: updateError } = await supabase
      .from('workers')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', employeeId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating employee:', updateError);
      return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 });
    }

    // If rates changed, create new rate entry
    const rateChanged =
      body.standard_hourly_rate !== undefined ||
      body.overtime_hourly_rate !== undefined ||
      body.daily_rate !== undefined;

    if (rateChanged) {
      await supabase.from('worker_rates').insert({
        worker_id: employeeId,
        standard_hourly_rate: body.standard_hourly_rate,
        overtime_hourly_rate: body.overtime_hourly_rate,
        daily_rate: body.daily_rate,
        effective_from: new Date().toISOString().split('T')[0],
        created_by: user.id,
      });
    }

    return NextResponse.json({ employee });
  } catch (error) {
    console.error('Error in employee PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/employees/[id] - Deactivate employee
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: employeeId } = params;
    const supabase = await createClient();

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

    if (!member || !['owner', 'admin'].includes(member.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Soft delete (deactivate) employee
    const { error: deleteError } = await supabase
      .from('workers')
      .update({
        is_active: false,
        end_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      })
      .eq('id', employeeId);

    if (deleteError) {
      console.error('Error deactivating employee:', deleteError);
      return NextResponse.json({ error: 'Failed to deactivate employee' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in employee DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
