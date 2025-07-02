import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const downloadRequestSchema = z.object({
  project_ids: z.array(z.string().uuid()).optional(),
  include_templates: z.boolean().default(true),
  include_assignments: z.boolean().default(true),
  include_responses: z.boolean().default(true),
  last_sync: z.string().optional(),
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

    // Parse request
    const body = await request.json();
    const validationResult = downloadRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { project_ids, include_templates, include_assignments, include_responses, last_sync } =
      validationResult.data;

    // Get user's organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'User not associated with any organization' },
        { status: 403 }
      );
    }

    const bulkData: any = {
      inspections: [],
      templates: [],
      assignments: [],
      projects: [],
      lots: [],
      users: [],
      metadata: {
        downloaded_at: new Date().toISOString(),
        user_id: user.id,
        organization_id: membership.organization_id,
      },
    };

    // Get accessible projects
    let projectQuery = supabase
      .from('projects')
      .select('id, name, client_name, status, organization_id')
      .eq('organization_id', membership.organization_id);

    if (project_ids?.length) {
      projectQuery = projectQuery.in('id', project_ids);
    }

    const { data: projects } = await projectQuery;
    bulkData.projects = projects || [];

    const accessibleProjectIds = projects?.map((p) => p.id) || [];

    // Filter out sensitive response data if user doesn't have access
    const canViewResponses =
      include_responses &&
      ['owner', 'admin', 'project_manager', 'quality_manager'].includes(membership.role);

    if (accessibleProjectIds.length > 0) {
      // Get lots for the projects
      const { data: lots } = await supabase
        .from('lots')
        .select('id, project_id, lot_number, name, status')
        .in('project_id', accessibleProjectIds);

      bulkData.lots = lots || [];

      // Get inspection instances
      let inspectionQuery = supabase
        .from('itp_instances')
        .select(
          `
          *,
          template:itp_templates(id, name, structure, category),
          project:projects(id, name),
          lot:lots(id, lot_number, name)
        `
        )
        .in('project_id', accessibleProjectIds);

      if (last_sync) {
        inspectionQuery = inspectionQuery.gte('updated_at', last_sync);
      }

      const { data: inspections } = await inspectionQuery;

      bulkData.inspections = (inspections || []).map((inspection: any) => ({
        ...inspection,
        responses: canViewResponses ? inspection.responses : {},
      }));

      // Get assignments if requested
      if (include_assignments) {
        const { data: assignments } = await supabase
          .from('itp_assignments')
          .select(
            `
            *,
            template:itp_templates(id, name, category),
            project:projects(id, name),
            lot:lots(id, lot_number, name),
            assignedTo:users!itp_assignments_assigned_to_fkey(id, email, full_name),
            assignedBy:users!itp_assignments_assigned_by_fkey(id, email, full_name)
          `
          )
          .in('project_id', accessibleProjectIds);

        bulkData.assignments = assignments || [];
      }
    }

    // Get templates if requested
    if (include_templates) {
      let templateQuery = supabase
        .from('itp_templates')
        .select('*')
        .eq('organization_id', membership.organization_id)
        .eq('is_active', true);

      if (last_sync) {
        templateQuery = templateQuery.gte('updated_at', last_sync);
      }

      const { data: templates } = await templateQuery;
      bulkData.templates = templates || [];
    }

    // Get relevant users (for assignments, etc.)
    const { data: orgUsers } = await supabase
      .from('organization_members')
      .select(
        `
        user:users(id, email, full_name, avatar_url),
        role
      `
      )
      .eq('organization_id', membership.organization_id);

    bulkData.users = (orgUsers || []).map((member: any) => ({
      ...member.user,
      role: member.role,
    }));

    // Calculate data size for monitoring
    const dataSize = JSON.stringify(bulkData).length;

    // Log bulk download
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      action: 'inspections.bulk_download',
      metadata: {
        projects_count: bulkData.projects.length,
        inspections_count: bulkData.inspections.length,
        templates_count: bulkData.templates.length,
        assignments_count: bulkData.assignments.length,
        data_size_bytes: dataSize,
        include_templates,
        include_assignments,
        include_responses: canViewResponses,
      },
    });

    // Set appropriate headers for large downloads
    return NextResponse.json(bulkData, {
      headers: {
        'Content-Type': 'application/json',
        'X-Data-Size': dataSize.toString(),
        'X-Record-Count': (
          bulkData.inspections.length +
          bulkData.templates.length +
          bulkData.assignments.length
        ).toString(),
      },
    });
  } catch (error) {
    console.error('Error in bulk download:', error);
    return NextResponse.json({ error: 'Failed to download bulk data' }, { status: 500 });
  }
}
