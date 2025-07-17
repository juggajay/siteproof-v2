import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/debug/itp-template/[id] - Debug ITP template structure
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get ITP instance with template
    const { data: itpInstance, error } = await supabase
      .from('itp_instances')
      .select(
        `
        *,
        itp_templates!inner(
          id,
          name,
          description,
          structure,
          organization_id
        ),
        lot:lots!inner(
          id,
          lot_number,
          project_id,
          project:projects!inner(
            id,
            name,
            organization_id
          )
        )
      `
      )
      .eq('id', id)
      .single();

    if (error || !itpInstance) {
      return NextResponse.json({ error: 'ITP instance not found' }, { status: 404 });
    }

    // Return full debug information
    return NextResponse.json({
      debug: {
        instance_id: itpInstance.id,
        template_name: itpInstance.itp_templates.name,
        template_id: itpInstance.itp_templates.id,
        structure: itpInstance.itp_templates.structure,
        structure_type: typeof itpInstance.itp_templates.structure,
        has_sections: !!itpInstance.itp_templates.structure?.sections,
        sections_count: itpInstance.itp_templates.structure?.sections?.length || 0,
        sections: itpInstance.itp_templates.structure?.sections || null,
        raw_template: itpInstance.itp_templates,
        raw_instance: itpInstance,
      },
    });
  } catch (error) {
    console.error('Error fetching ITP debug info:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
