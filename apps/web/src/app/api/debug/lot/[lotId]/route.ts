import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ lotId: string }> }
) {
  try {
    const { lotId } = await params;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Check if lot exists at all
    const { data: basicLot, error: basicError } = await supabase
      .from('lots')
      .select('*')
      .eq('id', lotId)
      .single();

    // 2. Check lot with project relationship
    const { data: lotWithProject, error: projectError } = await supabase
      .from('lots')
      .select(
        `
        *,
        projects (
          id,
          name,
          organization_id
        )
      `
      )
      .eq('id', lotId)
      .single();

    // 3. Check full lot with all relationships
    const { data: fullLot, error: fullError } = await supabase
      .from('lots')
      .select(
        `
        *,
        projects (
          id,
          name,
          organization_id,
          organizations (
            id,
            name
          )
        )
      `
      )
      .eq('id', lotId)
      .single();

    // 4. Check user's organization memberships
    const { data: memberships } = await supabase
      .from('organization_members')
      .select(
        `
        organization_id,
        role,
        organizations (
          id,
          name
        )
      `
      )
      .eq('user_id', user.id);

    // 5. If lot exists, check if user has access to its organization
    let hasAccess = false;
    let membership = null;

    if (lotWithProject?.projects?.organization_id) {
      const { data: mem } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', lotWithProject.projects.organization_id)
        .eq('user_id', user.id)
        .single();

      hasAccess = !!mem;
      membership = mem;
    }

    return NextResponse.json({
      debug: {
        lotId,
        userId: user.id,
        userEmail: user.email,
        hasAccess,
        queries: {
          basic: {
            success: !basicError,
            error: basicError?.message,
            hasData: !!basicLot,
          },
          withProject: {
            success: !projectError,
            error: projectError?.message,
            hasData: !!lotWithProject,
            projectId: lotWithProject?.project_id,
            projectName: lotWithProject?.projects?.name,
          },
          full: {
            success: !fullError,
            error: fullError?.message,
            hasData: !!fullLot,
          },
        },
        membership,
        memberships,
        lot: basicLot,
      },
    });
  } catch (error) {
    console.error('[Debug API] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
