import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

// Schema for updating a project
const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  clientName: z.string().optional(),
  clientEmail: z.string().email().optional().or(z.literal('')),
  clientPhone: z.string().optional(),
  clientCompany: z.string().optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.enum(['active', 'completed', 'archived']).optional(),
  visibility: z.enum(['private', 'public', 'password']).optional(),
  password: z.string().optional(),
});

// GET /api/projects/[id] - Get a single project
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params?.id;
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch project with organization info
    const { data: project, error } = await supabase
      .from('projects')
      .select(`
        *,
        organization:organizations (
          id,
          name,
          slug
        ),
        creator:created_by (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('id', projectId)
      .single();

    if (error || !project) {
      return NextResponse.json(
        { message: 'Project not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this project
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', project.organization_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { message: 'You do not have access to this project' },
        { status: 403 }
      );
    }

    // Get project stats from materialized view
    const { data: stats } = await supabase
      .from('project_dashboard_stats')
      .select('*')
      .eq('project_id', projectId)
      .single();

    // Get recent lots
    const { data: recentLots } = await supabase
      .from('lots')
      .select(`
        id,
        lot_number,
        name,
        status,
        created_at,
        updated_at
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(5);

    return NextResponse.json(
      {
        project: {
          ...project,
          stats: stats ? {
            totalLots: stats.total_lots,
            pendingLots: stats.pending_lots,
            inReviewLots: stats.in_review_lots,
            approvedLots: stats.approved_lots,
            rejectedLots: stats.rejected_lots,
            totalComments: stats.total_comments,
            unresolvedComments: stats.unresolved_comments,
            progressPercentage: stats.progress_percentage,
            lastActivityAt: stats.last_activity_at,
          } : null,
          recentLots: recentLots || [],
          userRole: membership.role,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get project error:', error);
    return NextResponse.json(
      { message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id] - Update a project
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params?.id;
    const body = await request.json();
    
    // Validate request body
    const validationResult = updateProjectSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { message: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const data = validationResult.data;
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get project to check permissions
    const { data: project } = await supabase
      .from('projects')
      .select('organization_id, created_by')
      .eq('id', projectId)
      .single();

    if (!project) {
      return NextResponse.json(
        { message: 'Project not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', project.organization_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { message: 'You do not have access to this project' },
        { status: 403 }
      );
    }

    // Only project creator, admins, and owners can update
    if (project.created_by !== user.id && !['admin', 'owner'].includes(membership.role)) {
      return NextResponse.json(
        { message: 'You do not have permission to update this project' },
        { status: 403 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.clientName !== undefined) updateData.client_name = data.clientName;
    if (data.clientEmail !== undefined) updateData.client_email = data.clientEmail || null;
    if (data.clientPhone !== undefined) updateData.client_phone = data.clientPhone;
    if (data.clientCompany !== undefined) updateData.client_company = data.clientCompany;
    if (data.startDate !== undefined) updateData.start_date = data.startDate;
    if (data.dueDate !== undefined) updateData.due_date = data.dueDate;
    if (data.status !== undefined) {
      updateData.status = data.status;
      if (data.status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }
    }
    if (data.visibility !== undefined) updateData.visibility = data.visibility;

    // Handle password update for password-protected projects
    if (data.visibility === 'password' && data.password) {
      const bcrypt = require('bcryptjs');
      updateData.password_hash = await bcrypt.hash(data.password, 10);
    } else if (data.visibility !== 'password') {
      updateData.password_hash = null;
    }

    // Update the project
    const { data: updatedProject, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', projectId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update project:', error);
      return NextResponse.json(
        { message: 'Failed to update project' },
        { status: 500 }
      );
    }

    // Refresh the materialized view
    await supabase.rpc('refresh_project_dashboard_stats');

    return NextResponse.json(
      {
        message: 'Project updated successfully',
        project: updatedProject,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update project error:', error);
    return NextResponse.json(
      { message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id] - Delete a project (soft delete)
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params?.id;
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get project to check permissions
    const { data: project } = await supabase
      .from('projects')
      .select('organization_id, created_by')
      .eq('id', projectId)
      .single();

    if (!project) {
      return NextResponse.json(
        { message: 'Project not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', project.organization_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { message: 'You do not have access to this project' },
        { status: 403 }
      );
    }

    // Only project creator, admins, and owners can delete
    if (project.created_by !== user.id && !['admin', 'owner'].includes(membership.role)) {
      return NextResponse.json(
        { message: 'You do not have permission to delete this project' },
        { status: 403 }
      );
    }

    // Soft delete the project
    const { error } = await supabase
      .from('projects')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', projectId);

    if (error) {
      console.error('Failed to delete project:', error);
      return NextResponse.json(
        { message: 'Failed to delete project' },
        { status: 500 }
      );
    }

    // Refresh the materialized view
    await supabase.rpc('refresh_project_dashboard_stats');

    return NextResponse.json(
      { message: 'Project deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete project error:', error);
    return NextResponse.json(
      { message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}