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

    if (!project_id || !title || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: project_id, title, and description are required' },
        { status: 400 }
      );
    }

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('organization_id')
      .eq('id', project_id)
      .single();

    if (!project || projectError) {
      return NextResponse.json(
        { error: 'Project not found or you do not have access' },
        { status: 404 }
      );
    }

    // Generate simple NCR number
    const ncrNumber = `NCR-${Date.now()}`;

    // Create minimal NCR data - only required fields
    const ncrData = {
      organization_id: project.organization_id,
      project_id,
      ncr_number: ncrNumber,
      title: title.trim(),
      description: description.trim(),
      severity,
      category,
      raised_by: user.id,
      status: 'open',
      priority: 'normal',
      tags: [],
      evidence: {},
    };

    // Insert NCR without triggering complex validations
    const { data: newNcr, error: insertError } = await supabase
      .from('ncrs')
      .insert(ncrData)
      .select()
      .single();

    if (insertError) {
      console.error('NCR creation error:', insertError);

      // Try to provide more specific error messages
      if (insertError.message.includes('ncr_history')) {
        // If history table is the issue, try without returning data
        const { error: insertError2 } = await supabase.from('ncrs').insert(ncrData);

        if (!insertError2) {
          // Successfully inserted, fetch the created NCR
          const { data: createdNcr } = await supabase
            .from('ncrs')
            .select()
            .eq('ncr_number', ncrNumber)
            .single();

          if (createdNcr) {
            return NextResponse.json({ data: createdNcr }, { status: 201 });
          }
        }
      }

      return NextResponse.json(
        {
          error: 'Failed to create NCR',
          details: insertError.message,
          hint: 'This might be a database configuration issue. Contact support if this persists.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: newNcr }, { status: 201 });
  } catch (error) {
    console.error('NCR POST error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
