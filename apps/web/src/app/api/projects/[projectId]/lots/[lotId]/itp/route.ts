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

    // First try to fetch instances without the join
    const { data: basicInstances, error: basicError } = await supabase
      .from('itp_instances')
      .select('*')
      .eq('lot_id', lotId)
      .order('created_at', { ascending: false });

    if (basicError) {
      console.error('[ITP API] Basic query error:', basicError);
    } else {
      console.log('[ITP API] Found instances:', basicInstances?.length || 0);
    }

    // Now try with the template join
    const { data: itpInstances, error } = await supabase
      .from('itp_instances')
      .select(`
        id,
        template_id,
        project_id,
        lot_id,
        organization_id,
        created_by,
        data,
        evidence_files,
        inspection_status,
        inspection_date,
        sync_status,
        is_active,
        created_at,
        updated_at,
        completion_percentage,
        itp_templates!inner (
          id,
          name,
          description,
          structure,
          organization_id,
          category
        )
      `)
      .eq('lot_id', lotId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[ITP API] Join query error:', error);
      console.error('[ITP API] Error details:', JSON.stringify(error, null, 2));
      
      // Fallback to basic query without join
      if (!basicError && basicInstances) {
        console.log('[ITP API] Using fallback without template data');
        
        // Fetch templates separately if needed
        const templateIds = [...new Set(basicInstances.map(i => i.template_id).filter(Boolean))];
        let templates: any[] = [];
        
        if (templateIds.length > 0) {
          const { data: templatesData } = await supabase
            .from('itp_templates')
            .select('id, name, description, structure, organization_id, category')
            .in('id', templateIds);
          
          templates = templatesData || [];
        }
        
        // Merge template data
        const instancesWithTemplates = basicInstances.map(instance => {
          const template = templates.find(t => t.id === instance.template_id);
          return {
            ...instance,
            itp_templates: template || null
          };
        });
        
        return NextResponse.json({ instances: instancesWithTemplates });
      }
      
      return NextResponse.json(
        {
          error: 'Failed to fetch ITP instances',
          details: error.message,
        },
        { status: 500 }
      );
    }

    console.log('[ITP API] Successfully fetched with templates:', itpInstances?.length || 0);

    // Return instances in the format expected by the frontend
    return NextResponse.json({ instances: itpInstances || [] });
  } catch (error) {
    console.error('[ITP API] Unexpected error:', error);
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