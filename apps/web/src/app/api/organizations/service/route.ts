import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    // First get the user from the regular client
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description } = await request.json();
    console.log('[Service API] Request data:', { name, description });

    // Use service role client to bypass RLS
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Check if user already has an organization
    const { data: existingMembership } = await serviceClient
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (existingMembership?.organization_id) {
      return NextResponse.json({ error: 'User already belongs to an organization' }, { status: 400 });
    }

    // Create organization using service role (bypasses RLS)
    const { data: organization, error: orgError } = await serviceClient
      .from('organizations')
      .insert({
        name,
        description,
        created_by: user.id,
      })
      .select()
      .single();

    if (orgError) {
      console.error('[Organizations Service API] Error creating organization:', orgError);
      return NextResponse.json({ 
        error: 'Failed to create organization',
        details: orgError.message,
        code: orgError.code
      }, { status: 500 });
    }

    // Add user as owner using service role (bypasses RLS)
    const { error: memberError } = await serviceClient
      .from('organization_members')
      .insert({
        organization_id: organization.id,
        user_id: user.id,
        role: 'owner',
        status: 'active',
      });

    if (memberError) {
      console.error('[Organizations Service API] Error adding user to organization:', memberError);
      // Clean up the organization if member creation fails
      await serviceClient
        .from('organizations')
        .delete()
        .eq('id', organization.id);
      
      return NextResponse.json({ 
        error: 'Failed to set up organization membership',
        details: memberError.message,
        code: memberError.code
      }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Organization created successfully',
      organization: {
        id: organization.id,
        name: organization.name,
        description: organization.description,
      }
    });

  } catch (error) {
    console.error('[Organizations Service API] Caught error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}