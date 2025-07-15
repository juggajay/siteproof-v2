import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { lotId: string } }
) {
  try {
    const supabase = await createClient();
    const { lotId } = params;
    
    console.log('[Debug API] Checking lot:', lotId);
    
    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        authError: authError?.message 
      }, { status: 401 });
    }

    // Try basic lot query first
    const { data: basicLot, error: basicError } = await supabase
      .from('lots')
      .select('*')
      .eq('id', lotId)
      .single();
      
    console.log('[Debug API] Basic lot query:', { basicLot, basicError });

    // Try lot with project
    const { data: lotWithProject, error: projectError } = await supabase
      .from('lots')
      .select(`
        *,
        projects (
          id,
          name,
          organization_id
        )
      `)
      .eq('id', lotId)
      .single();
      
    console.log('[Debug API] Lot with project:', { lotWithProject, projectError });

    // Try full query like the page does
    const { data: fullLot, error: fullError } = await supabase
      .from('lots')
      .select(`
        *,
        projects (
          id,
          name,
          organization_id,
          organizations (
            id,
            name
          )
        ),
        itp_instances (
          id,
          name,
          status,
          completion_percentage,
          created_at,
          updated_at,
          itp_templates (
            id,
            name,
            description,
            category,
            structure
          )
        )
      `)
      .eq('id', lotId)
      .single();
      
    console.log('[Debug API] Full lot query:', { fullLot, fullError });

    // Check user's organization membership
    let membership = null;
    if (lotWithProject?.projects?.organization_id) {
      const { data: membershipData, error: membershipError } = await supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', lotWithProject.projects.organization_id)
        .eq('user_id', user.id)
        .single();
        
      membership = { data: membershipData, error: membershipError };
    }

    return NextResponse.json({
      debug: {
        lotId,
        user: { id: user.id, email: user.email },
        queries: {
          basic: { 
            success: !basicError, 
            error: basicError?.message,
            hasData: !!basicLot 
          },
          withProject: { 
            success: !projectError, 
            error: projectError?.message,
            hasData: !!lotWithProject,
            projectId: lotWithProject?.project_id,
            projectName: lotWithProject?.projects?.name
          },
          full: { 
            success: !fullError, 
            error: fullError?.message,
            hasData: !!fullLot 
          }
        },
        membership,
        lot: basicLot
      }
    });
  } catch (error) {
    console.error('[Debug API] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}