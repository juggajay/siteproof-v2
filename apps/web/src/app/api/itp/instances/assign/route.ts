import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const assignITPSchema = z.object({
  templateIds: z.array(z.string()).min(1, 'At least one template ID is required'),
  lotId: z.string().min(1, 'Lot ID is required'),
  projectId: z.string().min(1, 'Project ID is required'),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate input
    const validationResult = assignITPSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { templateIds, lotId, projectId } = validationResult.data;

    // Verify lot exists and user has access
    const { data: lot, error: lotError } = await supabase
      .from('lots')
      .select(
        `
        id,
        project_id,
        name,
        projects!inner(
          id,
          organization_id
        )
      `
      )
      .eq('id', lotId)
      .eq('project_id', projectId)
      .single();

    if (lotError || !lot) {
      return NextResponse.json({ error: 'Lot not found' }, { status: 404 });
    }

    // Check user membership
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', (lot.projects as any).organization_id)
      .eq('user_id', user.id)
      .single();

    if (!membership || !['owner', 'admin', 'member'].includes(membership.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Validate templates exist and are accessible
    const { data: templates, error: templatesError } = await supabase
      .from('itp_templates')
      .select('id, name, organization_id')
      .in('id', templateIds)
      .eq('organization_id', (lot.projects as any).organization_id)
      .eq('is_active', true)
      .is('deleted_at', null);

    if (templatesError) {
      return NextResponse.json({ error: 'Failed to validate templates' }, { status: 400 });
    }

    if (!templates || templates.length !== templateIds.length) {
      return NextResponse.json({ error: 'Some templates are not available' }, { status: 400 });
    }

    // Check for existing assignments
    const { data: existingInstances } = await supabase
      .from('itp_instances')
      .select('template_id')
      .eq('lot_id', lotId)
      .in('template_id', templateIds);

    if (existingInstances && existingInstances.length > 0) {
      const alreadyAssigned = existingInstances.map((instance) => instance.template_id);
      const conflictingTemplates = templates.filter((template) =>
        alreadyAssigned.includes(template.id)
      );

      if (conflictingTemplates.length > 0) {
        return NextResponse.json(
          {
            error: `Templates already assigned: ${conflictingTemplates.map((t) => t.name).join(', ')}`,
          },
          { status: 400 }
        );
      }
    }

    // Create ITP instances
    const itpInstances = templates.map((template) => ({
      template_id: template.id,
      project_id: projectId,
      lot_id: lotId,
      name: template.name, // Add required name field
      data: {},
      status: 'draft',
      created_by: user.id,
    }));

    const { data: createdInstances, error: createError } = await supabase
      .from('itp_instances')
      .insert(itpInstances)
      .select();

    if (createError) {
      console.error('Error creating ITP instances:', createError);
      return NextResponse.json({ error: 'Failed to assign ITP templates' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'ITP templates assigned successfully',
      instances: createdInstances,
    });
  } catch (error) {
    console.error('Error assigning ITP templates:', error);
    return NextResponse.json({ error: 'Failed to assign ITP templates' }, { status: 500 });
  }
}
