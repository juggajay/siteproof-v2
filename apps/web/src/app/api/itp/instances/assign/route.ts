import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  type LotWithProject,
  type OrganizationMember,
  type AssignITPRequest,
  type AssignITPResponse,
  type ITPTemplateRow,
  type ITPInstanceRow,
  type InitializedITPData,
  type ITPInstanceData,
} from '@/types/itp';

const assignITPSchema = z.object({
  templateIds: z.array(z.string().uuid()).min(1, 'At least one template ID is required'),
  lotId: z.string().uuid('Invalid lot ID format'),
  projectId: z.string().uuid('Invalid project ID format'),
});

/**
 * POST /api/itp/instances/assign
 *
 * Assign ITP templates to a lot, creating new instances
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    console.log('=== ITP Assignment API Debug ===');
    console.log('User:', user?.id);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Request body:', body);

    // Validate input
    const validationResult = assignITPSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { templateIds, lotId, projectId }: AssignITPRequest = validationResult.data;

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

    // Type-safe access to nested project data
    const typedLot = lot as unknown as LotWithProject;
    const organizationId = typedLot.projects.organization_id;

    // Check user membership
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const typedMembership = membership as OrganizationMember;

    if (!['owner', 'admin', 'member'].includes(typedMembership.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Validate templates exist and are accessible
    const { data: templates, error: templatesError } = await supabase
      .from('itp_templates')
      .select('id, name, organization_id, structure')
      .in('id', templateIds)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .is('deleted_at', null);

    if (templatesError) {
      return NextResponse.json({ error: 'Failed to validate templates' }, { status: 400 });
    }

    const typedTemplates = (templates || []) as ITPTemplateRow[];

    if (typedTemplates.length !== templateIds.length) {
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
      const conflictingTemplates = typedTemplates.filter((template) =>
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

    // Create ITP instances with initialized data
    console.log(
      'Creating instances for templates:',
      typedTemplates.map((t) => t.name)
    );

    const itpInstances: Omit<ITPInstanceRow, 'id' | 'created_at' | 'updated_at'>[] = [];

    for (const template of typedTemplates) {
      try {
        console.log('Processing template:', template.name, 'with structure:', template.structure);

        // Initialize inspection data using the RPC function
        const { data: initialData, error: initError } = await supabase.rpc(
          'initialize_inspection_data',
          {
            p_template_structure: template.structure,
          }
        );

        let finalData: ITPInstanceData;

        if (initError) {
          console.error('RPC Error initializing data for template', template.name, ':', initError);
          console.error('Template structure was:', template.structure);
          console.log('Falling back to empty data object for', template.name);
          finalData = {};
        } else {
          console.log('Successfully initialized data for', template.name, ':', initialData);
          finalData = (initialData as ITPInstanceData) || {};
        }

        // Create proper data structure
        const properData: InitializedITPData = {
          inspection_results: finalData,
          overall_status: 'pending',
          completion_percentage: 0,
        };

        itpInstances.push({
          template_id: template.id,
          project_id: projectId,
          lot_id: lotId,
          organization_id: organizationId,
          created_by: user.id,
          inspection_status: 'pending',
          inspection_date: null,
          sync_status: 'local',
          is_active: true,
          data: properData as unknown as ITPInstanceData,
          evidence_files: null,
        });
      } catch (templateError) {
        console.error('Error processing template', template.name, ':', templateError);
        return NextResponse.json(
          {
            error: `Failed to initialize template: ${template.name}`,
          },
          { status: 500 }
        );
      }
    }

    console.log('Final instances to create:', itpInstances.length);

    const { data: createdInstances, error: createError } = await supabase
      .from('itp_instances')
      .insert(itpInstances)
      .select();

    if (createError) {
      console.error('Error creating ITP instances:', createError);
      console.error('Full create error details:', JSON.stringify(createError, null, 2));
      return NextResponse.json({ error: 'Failed to assign ITP templates' }, { status: 500 });
    }

    console.log('Successfully created', createdInstances?.length || 0, 'instances');
    console.log('=================================');

    const response: AssignITPResponse = {
      message: 'ITP templates assigned successfully',
      instances: (createdInstances || []) as ITPInstanceRow[],
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error assigning ITP templates:', error);
    console.error('Full error stack:', error);
    return NextResponse.json({ error: 'Failed to assign ITP templates' }, { status: 500 });
  }
}
