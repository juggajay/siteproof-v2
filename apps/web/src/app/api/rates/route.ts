import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entity_type');
    const entityId = searchParams.get('entity_id');
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

    // Build query
    let query = supabase
      .from('rate_history')
      .select('*')
      .eq('organization_id', member.organization_id)
      .order('effective_from', { ascending: false });

    if (entityType) {
      query = query.eq('entity_type', entityType);
    }

    if (entityId) {
      query = query.eq('entity_id', entityId);
    }

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data: rates, error } = await query;

    if (error) {
      console.error('Error fetching rates:', error);
      return NextResponse.json({ error: 'Failed to fetch rates' }, { status: 500 });
    }

    return NextResponse.json({ rates: rates || [] });

  } catch (error) {
    console.error('Error in rates GET:', error);
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

    // Only admin/owner/finance_manager can create rates
    if (!['owner', 'admin', 'finance_manager'].includes(member.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Create rate entry
    const { data: rate, error } = await supabase
      .from('rate_history')
      .insert({
        ...body,
        organization_id: member.organization_id,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating rate:', error);
      return NextResponse.json({ error: 'Failed to create rate' }, { status: 500 });
    }

    return NextResponse.json({ rate });

  } catch (error) {
    console.error('Error in rates POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}