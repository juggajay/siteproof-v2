import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const projectId = searchParams.get('project_id');
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization and check financial access
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    // Check financial access
    const hasFinancialAccess = ['owner', 'admin', 'finance_manager', 'accountant'].includes(member.role);
    if (!hasFinancialAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get all companies
    const { data: companies, error: companiesError } = await supabase
      .from('company_profiles')
      .select('id')
      .eq('organization_id', member.organization_id)
      .eq('is_active', true);

    if (companiesError) {
      console.error('Error fetching companies:', companiesError);
      return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 });
    }

    if (!companies || companies.length === 0) {
      return NextResponse.json({});
    }

    // Get current rates for all companies
    const ratesMap: Record<string, any> = {};

    for (const company of companies) {
      // First try project-specific rate if projectId provided
      if (projectId) {
        const { data: projectRate } = await supabase
          .from('rate_history')
          .select('*')
          .eq('entity_type', 'company')
          .eq('entity_id', company.id)
          .eq('project_id', projectId)
          .eq('is_cost_rate', true)
          .lte('effective_from', date)
          .or(`effective_to.is.null,effective_to.gte.${date}`)
          .order('effective_from', { ascending: false })
          .limit(1)
          .single();

        if (projectRate) {
          ratesMap[company.id] = projectRate;
          continue;
        }
      }

      // Fall back to general rate
      const { data: generalRate } = await supabase
        .from('rate_history')
        .select('*')
        .eq('entity_type', 'company')
        .eq('entity_id', company.id)
        .is('project_id', null)
        .eq('is_cost_rate', true)
        .lte('effective_from', date)
        .or(`effective_to.is.null,effective_to.gte.${date}`)
        .order('effective_from', { ascending: false })
        .limit(1)
        .single();

      if (generalRate) {
        ratesMap[company.id] = generalRate;
      }
    }

    return NextResponse.json(ratesMap);

  } catch (error) {
    console.error('Error fetching current rates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}