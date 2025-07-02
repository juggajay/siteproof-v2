import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { name, description } = await request.json();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure user exists in public.users table
    // First check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!existingUser) {
      // Create user if doesn't exist
      const { error: createUserError } = await supabase
        .from('users')
        .insert({ 
          id: user.id, 
          email: user.email || '',
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
        });

      if (createUserError) {
        console.error('[Organizations API] Error creating user:', createUserError);
        return NextResponse.json({ 
          error: 'Failed to create user profile',
          details: createUserError.message
        }, { status: 500 });
      }
    }

    // Check if user already has an organization
    const { data: existingMembership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (existingMembership?.organization_id) {
      return NextResponse.json({ error: 'User already belongs to an organization' }, { status: 400 });
    }

    // Create organization
    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name,
        slug,
        description,
        created_by: user.id,
      })
      .select()
      .single();

    if (orgError) {
      console.error('[Organizations API] Error creating organization:', orgError);
      return NextResponse.json({ 
        error: 'Failed to create organization',
        details: orgError.message,
        code: orgError.code
      }, { status: 500 });
    }

    // Add user as owner of the organization
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: organization.id,
        user_id: user.id,
        role: 'owner',
      });

    if (memberError) {
      console.error('[Organizations API] Error adding user to organization:', memberError);
      // Clean up the organization if member creation fails
      await supabase
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
    console.error('[Organizations API] Caught error:', error);
    console.error('[Organizations API] Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}