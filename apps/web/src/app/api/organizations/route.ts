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
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name,
        description,
        created_by: user.id,
      })
      .select()
      .single();

    if (orgError) {
      console.error('Error creating organization:', orgError);
      return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 });
    }

    // Add user as owner of the organization
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: organization.id,
        user_id: user.id,
        role: 'owner',
        status: 'active',
      });

    if (memberError) {
      console.error('Error adding user to organization:', memberError);
      // Clean up the organization if member creation fails
      await supabase
        .from('organizations')
        .delete()
        .eq('id', organization.id);
      
      return NextResponse.json({ error: 'Failed to set up organization membership' }, { status: 500 });
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
    console.error('Error in organization creation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}