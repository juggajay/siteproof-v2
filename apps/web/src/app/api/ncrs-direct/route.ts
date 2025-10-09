import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (!user || authError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();

    // Get required fields
    const project_id = formData.get('project_id') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const severity = (formData.get('severity') as string) || 'medium';
    const category = (formData.get('category') as string) || 'Quality';

    // Get optional UUID fields
    const assigned_to = formData.get('assigned_to') as string;
    const contractor_id = formData.get('contractor_id') as string;

    if (!project_id || !title || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('organization_id')
      .eq('id', project_id)
      .single();

    if (!project || projectError) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Generate NCR number
    const ncrNumber = `NCR-${Date.now()}`;
    const ncrId = crypto.randomUUID();

    // Build the NCR data object
    const ncrData: any = {
      id: ncrId,
      organization_id: project.organization_id,
      project_id,
      ncr_number: ncrNumber,
      title: title.substring(0, 255),
      description,
      severity,
      category,
      raised_by: user.id,
      status: 'open',
      priority: 'normal',
      tags: [],
      evidence: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Add optional fields only if they have valid UUID values
    if (assigned_to && assigned_to.length === 36) {
      ncrData.assigned_to = assigned_to;
    }

    if (contractor_id && contractor_id.length === 36) {
      ncrData.contractor_id = contractor_id;
    }

    // Insert NCR with optional fields
    const { data: newNcr, error: insertError } = await supabase
      .from('ncrs')
      .insert(ncrData)
      .select(
        'id, ncr_number, title, description, severity, category, status, created_at, assigned_to, contractor_id'
      )
      .single();

    if (insertError) {
      console.error('Direct insert error:', insertError);
      return NextResponse.json(
        {
          error: 'Failed to create NCR',
          details: insertError.message || 'Database error occurred',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: newNcr }, { status: 201 });
  } catch (error) {
    console.error('NCR Direct error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
