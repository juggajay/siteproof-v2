import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization and role
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    // Get company
    const { data: company, error } = await supabase
      .from('company_profiles')
      .select('*')
      .eq('id', params?.id)
      .eq('organization_id', member.organization_id)
      .single();

    if (error || !company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Filter out sensitive financial data if user doesn't have access
    const hasFinancialAccess = ['owner', 'admin', 'finance_manager', 'accountant'].includes(member.role);
    
    if (!hasFinancialAccess) {
      delete company.bank_account_details;
      delete company.tax_rate;
      delete company.payment_terms;
    }

    return NextResponse.json({ company });

  } catch (error) {
    console.error('Error fetching company:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
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

    // Only admin/owner can update companies
    if (!['owner', 'admin'].includes(member.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Update company
    const { data: company, error } = await supabase
      .from('company_profiles')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params?.id)
      .eq('organization_id', member.organization_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating company:', error);
      return NextResponse.json({ error: 'Failed to update company' }, { status: 500 });
    }

    return NextResponse.json({ company });

  } catch (error) {
    console.error('Error in company PUT:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
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

    // Only admin/owner can delete companies
    if (!['owner', 'admin'].includes(member.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('company_profiles')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params?.id)
      .eq('organization_id', member.organization_id);

    if (error) {
      console.error('Error deleting company:', error);
      return NextResponse.json({ error: 'Failed to delete company' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in company DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}