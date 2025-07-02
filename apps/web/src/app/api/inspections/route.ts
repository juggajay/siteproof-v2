import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const createInspectionSchema = z.object({
  template_id: z.string().uuid(),
  project_id: z.string().uuid(),
  lot_id: z.string().uuid().optional(),
  name: z.string().min(3),
  description: z.string().optional(),
  assigned_to: z.string().uuid().optional(),
  due_date: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams?.get('project_id');
    const status = searchParams?.get('status');
    const assignedTo = searchParams?.get('assigned_to');

    // Pagination parameters
    const page = parseInt(searchParams?.get('page') || '1', 10);
    const limit = parseInt(searchParams?.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    // Validate pagination parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json({ error: 'Invalid pagination parameters' }, { status: 400 });
    }

    // Build base query for counting
    let countQuery = supabase.from('itp_assignments').select('id', { count: 'exact', head: true });

    // Build data query
    let dataQuery = supabase
      .from('itp_assignments')
      .select(
        `
        *,
        template:itp_templates(id, name, description, structure),
        project:projects(id, name),
        lot:lots(id, lot_number, name),
        assignedTo:users!itp_assignments_assigned_to_fkey(id, email, full_name),
        assignedBy:users!itp_assignments_assigned_by_fkey(id, email, full_name),
        instance:itp_instances(
          id, 
          status, 
          completion_percentage,
          data,
          started_at,
          completed_at
        )
      `
      )
      .order('assigned_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters to both queries
    if (projectId) {
      countQuery = countQuery.eq('project_id', projectId);
      dataQuery = dataQuery.eq('project_id', projectId);
    }

    if (status) {
      countQuery = countQuery.eq('status', status);
      dataQuery = dataQuery.eq('status', status);
    }

    if (assignedTo) {
      countQuery = countQuery.eq('assigned_to', assignedTo);
      dataQuery = dataQuery.eq('assigned_to', assignedTo);
    }

    // Execute both queries in parallel
    const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);

    if (countResult.error || dataResult.error) {
      throw countResult.error || dataResult.error;
    }

    const totalCount = countResult.count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      inspections: dataResult.data || [],
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching inspections:', error);
    return NextResponse.json({ error: 'Failed to fetch inspections' }, { status: 500 });
  }
}

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
    const validationResult = createInspectionSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check if user has permission in the project
    const { data: project } = await supabase
      .from('projects')
      .select('organization_id')
      .eq('id', data.project_id)
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

    if (!membership) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Verify template exists and is active
    const { data: template } = await supabase
      .from('itp_templates')
      .select('*')
      .eq('id', data.template_id)
      .eq('organization_id', project.organization_id)
      .eq('is_active', true)
      .single();

    if (!template) {
      return NextResponse.json({ error: 'Template not found or inactive' }, { status: 404 });
    }

    // Create the inspection assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from('itp_assignments')
      .insert({
        template_id: data.template_id,
        project_id: data.project_id,
        lot_id: data.lot_id,
        assigned_to: data.assigned_to || user.id,
        assigned_by: user.id,
        title: data.name,
        description: data.description,
        due_date: data.due_date,
        priority: data.priority,
        status: 'pending',
      })
      .select()
      .single();

    if (assignmentError) {
      throw assignmentError;
    }

    // Create the inspection instance
    const { data: instance, error: instanceError } = await supabase
      .from('itp_instances')
      .insert({
        template_id: data.template_id,
        project_id: data.project_id,
        lot_id: data.lot_id,
        name: data.name,
        data: {},
        status: 'draft',
        completion_percentage: 0,
        created_by: user.id,
      })
      .select()
      .single();

    if (instanceError) {
      throw instanceError;
    }

    // Update template usage count
    await supabase
      .from('itp_templates')
      .update({
        usage_count: template.usage_count + 1,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', template.id);

    // Send notification if assigned to someone else
    if (data.assigned_to && data.assigned_to !== user.id) {
      await supabase.from('notifications').insert({
        organization_id: project.organization_id,
        user_id: data.assigned_to,
        type: 'inspection_assigned',
        title: 'New Inspection Assigned',
        message: `You have been assigned a new inspection: ${data.name}`,
        data: {
          assignment_id: assignment.id,
          instance_id: instance.id,
          project_id: data.project_id,
          template_name: template.name,
        },
        priority: data.priority === 'urgent' ? 'urgent' : 'normal',
      });
    }

    return NextResponse.json({
      message: 'Inspection created successfully',
      assignment,
      instance,
    });
  } catch (error) {
    console.error('Error creating inspection:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to create inspection' }, { status: 500 });
  }
}
