import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { initializeInspectionData } from '@/lib/itp/initialize-data';
import { log } from '@/lib/logger';
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

    log.debug('ITP Assignment API started', { userId: user?.id });

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    log.debug('ITP Assignment request body', {
      templateIdsCount: body.templateIds?.length,
      lotId: body.lotId,
      projectId: body.projectId,
    });

    // Validate input
    const validationResult = assignITPSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { templateIds, lotId, projectId }: AssignITPRequest = validationResult.data;

    // OPTIMIZATION: Execute all validation queries in parallel
    const startTime = Date.now();

    const [
      { data: lot, error: lotError },
      { data: templates, error: templatesError },
      { data: existingInstances },
    ] = await Promise.all([
      // Query 1: Verify lot exists and get organization_id
      supabase
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
        .single(),

      // Query 2: Pre-fetch templates (we'll validate org later)
      supabase
        .from('itp_templates')
        .select('id, name, organization_id, structure')
        .in('id', templateIds)
        .eq('is_active', true)
        .is('deleted_at', null),

      // Query 3: Check for existing assignments
      supabase
        .from('itp_instances')
        .select('template_id')
        .eq('lot_id', lotId)
        .in('template_id', templateIds),
    ]);

    const parallelQueriesTime = Date.now() - startTime;
    log.info('ITP Assignment: Parallel queries completed', {
      duration: `${parallelQueriesTime}ms`,
      lotId,
    });

    if (lotError || !lot) {
      return NextResponse.json({ error: 'Lot not found' }, { status: 404 });
    }

    // Type-safe access to nested project data
    const typedLot = lot as unknown as LotWithProject;
    const organizationId = typedLot.projects.organization_id;

    // Now check membership with organization_id we just got
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

    // Validate templates
    if (templatesError) {
      return NextResponse.json({ error: 'Failed to validate templates' }, { status: 400 });
    }

    const typedTemplates = (templates || []) as ITPTemplateRow[];

    // Verify templates belong to same organization
    const invalidTemplates = typedTemplates.filter((t) => t.organization_id !== organizationId);
    if (invalidTemplates.length > 0) {
      return NextResponse.json({ error: 'Some templates are not accessible' }, { status: 403 });
    }

    if (typedTemplates.length !== templateIds.length) {
      return NextResponse.json({ error: 'Some templates are not available' }, { status: 400 });
    }

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

    // OPTIMIZATION: Create ITP instances with initialized data (no RPC calls)
    log.info('Creating ITP instances for templates', {
      templateNames: typedTemplates.map((t) => t.name),
      count: typedTemplates.length,
    });

    const initStartTime = Date.now();
    const itpInstances: Omit<ITPInstanceRow, 'id' | 'created_at' | 'updated_at'>[] = [];

    for (const template of typedTemplates) {
      try {
        log.debug('Processing ITP template', {
          templateName: template.name,
          templateId: template.id,
        });

        // Initialize inspection data using TypeScript function (no RPC overhead!)
        const initializedData = initializeInspectionData(template.structure);

        // Create proper data structure
        const properData: InitializedITPData = {
          inspection_results: initializedData,
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
        log.error('Error processing ITP template', templateError, {
          templateName: template.name,
          templateId: template.id,
        });
        return NextResponse.json(
          {
            error: `Failed to initialize template: ${template.name}`,
          },
          { status: 500 }
        );
      }
    }

    const initTime = Date.now() - initStartTime;
    log.info('ITP data initialization completed', {
      duration: `${initTime}ms`,
      instanceCount: itpInstances.length,
    });

    const insertStartTime = Date.now();
    const { data: createdInstances, error: createError } = await supabase
      .from('itp_instances')
      .insert(itpInstances)
      .select();

    if (createError) {
      log.error('Error creating ITP instances', createError, {
        lotId,
        projectId,
        templateCount: itpInstances.length,
      });
      return NextResponse.json({ error: 'Failed to assign ITP templates' }, { status: 500 });
    }

    const insertTime = Date.now() - insertStartTime;
    const totalTime = Date.now() - startTime;

    log.info('ITP instances created successfully', {
      instanceCount: createdInstances?.length || 0,
      insertDuration: `${insertTime}ms`,
      totalDuration: `${totalTime}ms`,
      lotId,
      projectId,
    });

    const response: AssignITPResponse = {
      message: 'ITP templates assigned successfully',
      instances: (createdInstances || []) as ITPInstanceRow[],
    };

    return NextResponse.json(response);
  } catch (error) {
    log.error('Error assigning ITP templates', error);
    return NextResponse.json({ error: 'Failed to assign ITP templates' }, { status: 500 });
  }
}
