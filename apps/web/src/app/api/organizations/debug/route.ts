import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const debug = {
    step: 'start',
    envCheck: {
      publicUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      serviceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    error: null as any,
  };

  try {
    // Step 1: Get user
    debug.step = 'getting user';
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      debug.error = { userError, noUser: !user };
      return NextResponse.json({ error: 'Unauthorized', debug }, { status: 401 });
    }

    // Step 2: Parse request
    debug.step = 'parsing request';
    const { name, description } = await request.json();
    debug.requestData = { name, description };

    // Step 3: Check if service key exists
    debug.step = 'checking service key';
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      debug.error = 'SUPABASE_SERVICE_ROLE_KEY is not defined';
      return NextResponse.json({ error: 'Service configuration error', debug }, { status: 500 });
    }

    // Step 4: Import createClient from supabase-js
    debug.step = 'importing createClient';
    const { createClient: createServiceClient } = await import('@supabase/supabase-js');

    // Step 5: Create service client
    debug.step = 'creating service client';
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

    // Step 6: Check existing membership
    debug.step = 'checking existing membership';
    const { data: existingMembership, error: memberCheckError } = await serviceClient
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (memberCheckError && memberCheckError.code !== 'PGRST116') {
      debug.error = { memberCheckError };
      return NextResponse.json({ error: 'Failed to check membership', debug }, { status: 500 });
    }

    if (existingMembership?.organization_id) {
      return NextResponse.json({ error: 'User already belongs to an organization' }, { status: 400 });
    }

    // Step 7: Create organization
    debug.step = 'creating organization';
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
      debug.error = { orgError };
      return NextResponse.json({ 
        error: 'Failed to create organization',
        debug
      }, { status: 500 });
    }

    // Step 8: Add member
    debug.step = 'adding member';
    const { error: memberError } = await serviceClient
      .from('organization_members')
      .insert({
        organization_id: organization.id,
        user_id: user.id,
        role: 'owner',
        status: 'active',
      });

    if (memberError) {
      debug.error = { memberError };
      // Clean up
      await serviceClient
        .from('organizations')
        .delete()
        .eq('id', organization.id);
      
      return NextResponse.json({ 
        error: 'Failed to set up organization membership',
        debug
      }, { status: 500 });
    }

    debug.step = 'completed';
    return NextResponse.json({
      message: 'Organization created successfully',
      organization: {
        id: organization.id,
        name: organization.name,
        description: organization.description,
      },
      debug
    });

  } catch (error) {
    debug.error = {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      type: error?.constructor?.name,
    };
    
    return NextResponse.json({ 
      error: 'Internal server error',
      debug
    }, { status: 500 });
  }
}