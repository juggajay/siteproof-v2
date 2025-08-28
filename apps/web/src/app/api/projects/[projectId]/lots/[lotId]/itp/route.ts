import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; lotId: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lotId } = await params;
    
    console.log('[ITP API] Fetching instances for lot:', lotId);

    // Simple fetch without any joins to avoid errors
    const { data: itpInstances, error: instancesError } = await supabase
      .from('itp_instances')
      .select('*')
      .eq('lot_id', lotId)
      .order('created_at', { ascending: false });

    if (instancesError) {
      console.error('[ITP API] Error fetching instances:', instancesError);
      return NextResponse.json(
        {
          error: 'Failed to fetch ITP instances',
          details: instancesError.message,
        },
        { status: 500 }
      );
    }

    console.log('[ITP API] Found instances:', itpInstances?.length || 0);

    // If we have instances, try to fetch their templates separately
    const instancesWithTemplates = [];
    
    if (itpInstances && itpInstances.length > 0) {
      // Get unique template IDs
      const templateIds = [...new Set(itpInstances.map(i => i.template_id).filter(Boolean))];
      
      if (templateIds.length > 0) {
        console.log('[ITP API] Fetching templates:', templateIds);
        
        const { data: templates, error: templatesError } = await supabase
          .from('itp_templates')
          .select('*')
          .in('id', templateIds);
        
        if (templatesError) {
          console.error('[ITP API] Error fetching templates:', templatesError);
          // Continue without template data
          for (const instance of itpInstances) {
            instancesWithTemplates.push({
              ...instance,
              itp_templates: null
            });
          }
        } else {
          console.log('[ITP API] Found templates:', templates?.length || 0);
          
          // Map templates to instances
          const templateMap = new Map(templates?.map(t => [t.id, t]) || []);
          
          for (const instance of itpInstances) {
            instancesWithTemplates.push({
              ...instance,
              itp_templates: templateMap.get(instance.template_id) || null
            });
          }
        }
      } else {
        // No template IDs, just return instances as is
        for (const instance of itpInstances) {
          instancesWithTemplates.push({
            ...instance,
            itp_templates: null
          });
        }
      }
    }

    console.log('[ITP API] Returning instances:', instancesWithTemplates.length);

    // Return instances in the format expected by the frontend
    return NextResponse.json({ instances: instancesWithTemplates });
  } catch (error) {
    console.error('[ITP API] Unexpected error:', error);
    console.error('[ITP API] Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; lotId: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, lotId } = await params;
    const body = await request.json();

    // Create new ITP instance
    const { data: itpInstance, error } = await supabase
      .from('itp_instances')
      .insert({
        ...body,
        lot_id: lotId,
        project_id: projectId,
        created_by: user.id,
        status: body.status || 'draft',
        completion_percentage: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating ITP instance:', error);
      return NextResponse.json({ error: 'Failed to create ITP instance' }, { status: 500 });
    }

    return NextResponse.json(itpInstance);
  } catch (error) {
    console.error('Create ITP error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}