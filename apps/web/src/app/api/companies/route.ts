import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');
    const companyType = searchParams.get('type');
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    // Build query
    let query = supabase
      .from('company_profiles')
      .select('*')
      .eq('organization_id', member.organization_id)
      .order('company_name');

    // Apply filters
    if (active === 'true') {
      query = query.eq('is_active', true);
    }

    if (companyType) {
      query = query.eq('company_type', companyType);
    }

    const { data: companies, error } = await query;

    if (error) {
      console.error('Error fetching companies:', error);
      return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 });
    }

    // Filter out sensitive financial data if user doesn't have access
    const hasFinancialAccess = ['owner', 'admin', 'finance_manager', 'accountant'].includes(member.role);
    
    if (!hasFinancialAccess) {
      companies?.forEach(company => {
        delete company.bank_account_details;
        delete company.tax_rate;
        delete company.payment_terms;
      });
    }

    return NextResponse.json(companies || []);

  } catch (error) {
    console.error('Error in companies GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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

    // Only admin/owner can create companies
    if (!['owner', 'admin'].includes(member.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Create company profile
    const { data: company, error } = await supabase
      .from('company_profiles')
      .insert({
        ...body,
        organization_id: member.organization_id,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating company:', error);
      return NextResponse.json({ error: 'Failed to create company' }, { status: 500 });
    }

    // Log the action
    await supabase.from('financial_audit_log').insert({
      organization_id: member.organization_id,
      table_name: 'company_profiles',
      record_id: company.id,
      action: 'INSERT',
      new_values: company,
      performed_by: user.id,
    });

    return NextResponse.json({ company });

  } catch (error) {
    console.error('Error in companies POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}