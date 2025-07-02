import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const active = searchParams?.get('active');
    const companyType = searchParams?.get('type');
    const page = parseInt(searchParams?.get('page') || '1');
    const limit = parseInt(searchParams?.get('limit') || '20');
    const offset = (page - 1) * limit;

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
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

    // Build count query
    let countQuery = supabase
      .from('company_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', member.organization_id);

    // Build data query
    let dataQuery = supabase
      .from('company_profiles')
      .select('*')
      .eq('organization_id', member.organization_id)
      .order('company_name')
      .range(offset, offset + limit - 1);

    // Apply filters to both queries
    if (active === 'true') {
      countQuery = countQuery.eq('is_active', true);
      dataQuery = dataQuery.eq('is_active', true);
    }

    if (companyType) {
      countQuery = countQuery.eq('company_type', companyType);
      dataQuery = dataQuery.eq('company_type', companyType);
    }

    // Execute queries in parallel
    const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);

    const { count, error: countError } = countResult;
    const { data: companies, error: dataError } = dataResult;

    if (countError || dataError) {
      throw countError || dataError;
    }

    // Filter out sensitive financial data if user doesn't have access
    const hasFinancialAccess = ['owner', 'admin', 'finance_manager', 'accountant'].includes(
      member.role
    );

    if (!hasFinancialAccess) {
      companies?.forEach((company) => {
        delete company.bank_account_details;
        delete company.tax_rate;
        delete company.payment_terms;
      });
    }

    // Calculate pagination metadata
    const totalPages = count ? Math.ceil(count / limit) : 0;
    const hasMore = page < totalPages;

    return NextResponse.json({
      companies: companies || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasMore,
      },
    });
  } catch (error) {
    console.error('Error in companies GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
