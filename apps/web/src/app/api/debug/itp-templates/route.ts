import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('Auth check:', { userId: user?.id, authError });
    
    if (!user) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        authError: authError?.message 
      }, { status: 401 });
    }

    // Check organization membership
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();
      
    console.log('Membership check:', { membership, membershipError });
    
    if (!membership) {
      return NextResponse.json({ 
        error: 'No organization membership found',
        membershipError: membershipError?.message 
      }, { status: 403 });
    }

    // Check if itp_templates table exists and has the right columns
    const { data: tableInfo, error: tableError } = await supabase
      .from('itp_templates')
      .select('*')
      .limit(0);
      
    console.log('Table check:', { tableError });

    // Try to fetch templates
    const { data: templates, error: templatesError } = await supabase
      .from('itp_templates')
      .select('*')
      .eq('organization_id', membership.organization_id)
      .eq('is_active', true);
      
    console.log('Templates query:', { 
      count: templates?.length, 
      templatesError,
      organizationId: membership.organization_id 
    });

    // Also check if there are ANY templates in the table
    const { count: totalCount, error: countError } = await supabase
      .from('itp_templates')
      .select('*', { count: 'exact', head: true });
      
    console.log('Total templates in database:', { totalCount, countError });

    return NextResponse.json({
      debug: {
        user: { id: user.id, email: user.email },
        membership,
        templatesFound: templates?.length || 0,
        totalTemplatesInDb: totalCount || 0,
        errors: {
          auth: authError?.message,
          membership: membershipError?.message,
          table: tableError?.message,
          templates: templatesError?.message,
          count: countError?.message
        }
      },
      templates: templates || []
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}