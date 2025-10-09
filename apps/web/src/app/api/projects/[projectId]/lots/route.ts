import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Enable caching for GET requests with revalidation
export const revalidate = 10; // Revalidate every 10 seconds

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
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

    const { projectId } = await params;

    // OPTIMIZED: Single query with ITP instances JOIN
    // Eliminates N+1 pattern (was 1 query for lots + N queries for ITP instances)
    // Expected improvement: 10 lots = 91% reduction (11 queries → 1 query)
    //                      50 lots = 98% reduction (51 queries → 1 query)
    const { data: lots, error } = await supabase
      .from('lots')
      .select(`
        *,
        itp_instances (
          id,
          inspection_status,
          completion_percentage
        )
      `)
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('lot_number', { ascending: true });

    if (error) {
      console.error('Error fetching lots:', error);
      return NextResponse.json(
        {
          error: 'Failed to fetch lots',
          details: error.message,
        },
        { status: 500 }
      );
    }

    // Return with cache headers
    return NextResponse.json(lots || [], {
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
      },
    });
  } catch (error) {
    console.error('Lots endpoint error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
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

    const { projectId } = await params;
    const body = await request.json();
    const { selectedItpTemplates, ...lotData } = body;

    // Create new lot
    const { data: lot, error } = await supabase
      .from('lots')
      .insert({
        ...lotData,
        project_id: projectId,
        created_by: user.id,
        status: lotData.status || 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating lot:', error);
      return NextResponse.json({ error: 'Failed to create lot' }, { status: 500 });
    }

    // Handle ITP template assignment if requested
    let itpAssignmentResults: {
      success: string[];
      failed: Array<{ templateId: string; error: string }>;
    } = { success: [], failed: [] };

    if (selectedItpTemplates && selectedItpTemplates.length > 0) {
      console.log('[Lots API] Assigning ITP templates:', selectedItpTemplates);

      // Get project organization for ITP templates
      const { data: project } = await supabase
        .from('projects')
        .select('organization_id')
        .eq('id', projectId)
        .single();

      if (project) {
        for (const templateId of selectedItpTemplates) {
          try {
            // Create ITP instance
            const { error: itpError } = await supabase.from('itp_instances').insert({
              template_id: templateId,
              project_id: projectId,
              lot_id: lot.id,
              organization_id: project.organization_id,
              created_by: user.id,
              inspection_status: 'pending',
              sync_status: 'local',
              is_active: true,
              data: {
                inspection_results: {},
                overall_status: 'pending',
                completion_percentage: 0,
              },
            });

            if (itpError) {
              console.error(`Failed to assign ITP template ${templateId}:`, itpError);
              itpAssignmentResults.failed.push({
                templateId: templateId as string,
                error: itpError.message,
              });
            } else {
              itpAssignmentResults.success.push(templateId);
            }
          } catch (itpError: any) {
            console.error(`Failed to create ITP instance for template ${templateId}:`, itpError);
            itpAssignmentResults.failed.push({
              templateId: templateId as string,
              error: itpError?.message || 'Unknown error',
            });
          }
        }
      }
    }

    // Return lot with assignment results
    return NextResponse.json({
      lot,
      itpAssignmentResults,
      partialSuccess: itpAssignmentResults.failed.length > 0,
    });
  } catch (error) {
    console.error('Create lot error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;
    const { searchParams } = new URL(request.url);
    const lotId = searchParams.get('lotId');

    if (!lotId) {
      return NextResponse.json({ error: 'Lot ID is required' }, { status: 400 });
    }

    // Check if user has permission to delete lots in this project
    const { data: project } = await supabase
      .from('projects')
      .select('organization_id')
      .eq('id', projectId)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', project.organization_id)
      .eq('user_id', user.id)
      .single();

    if (!membership || !['owner', 'admin', 'member'].includes(membership.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Soft delete by setting deleted_at timestamp
    const { error } = await supabase
      .from('lots')
      .update({
        deleted_at: new Date().toISOString(),
      })
      .eq('id', lotId)
      .eq('project_id', projectId);

    if (error) {
      console.error('Error deleting lot:', error);
      return NextResponse.json({ error: 'Failed to delete lot' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Lot deleted successfully' });
  } catch (error) {
    console.error('Delete lot error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
