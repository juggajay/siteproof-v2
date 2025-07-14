import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { apiRateLimiter } from '@/lib/rate-limiter';
import type { ProjectDashboardStats } from '@siteproof/database';

// Schema for creating a project
const createProjectSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(1, 'Project name is required').max(255),
  description: z.string().optional(),
  clientName: z.string().optional(),
  clientEmail: z.string().email().optional().or(z.literal('')),
  clientPhone: z.string().optional(),
  clientCompany: z.string().optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  visibility: z.enum(['private', 'public', 'password']).default('private'),
  password: z.string().optional(),
});

// GET /api/projects - List projects
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams?.get('organizationId');
    const status = searchParams?.get('status') as 'active' | 'completed' | 'archived' | null;
    const search = searchParams?.get('search');
    const sortBy = searchParams?.get('sortBy') || 'last_activity_at';
    const sortOrder = searchParams?.get('sortOrder') || 'desc';
    const page = parseInt(searchParams?.get('page') || '1');
    const limit = parseInt(searchParams?.get('limit') || '20');
    const offset = (page - 1) * limit;

    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Base query for project stats
    let query = supabase.from('project_dashboard_stats').select('*', { count: 'exact' });

    // Filter by organization if provided
    if (organizationId) {
      // Verify user is member of the organization
      const { data: membership } = await supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', organizationId)
        .eq('user_id', user.id)
        .single();

      if (!membership) {
        return NextResponse.json(
          { message: 'You are not a member of this organization' },
          { status: 403 }
        );
      }

      query = query.eq('organization_id', organizationId);
    } else {
      // Get all organizations the user is a member of
      const { data: memberships } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id);

      if (!memberships || memberships.length === 0) {
        return NextResponse.json({ projects: [], total: 0, page, limit }, { status: 200 });
      }

      const orgIds = memberships.map((m) => m.organization_id);
      query = query.in('organization_id', orgIds);
    }

    // Filter by status
    if (status) {
      query = query.eq('project_status', status);
    }

    // Search filter
    if (search) {
      query = query.or(
        `project_name.ilike.%${search}%,client_name.ilike.%${search}%,client_company.ilike.%${search}%`
      );
    }

    // Sorting
    const sortColumn =
      sortBy === 'last_activity_at'
        ? 'last_activity_at'
        : sortBy === 'name'
          ? 'project_name'
          : sortBy === 'due_date'
            ? 'due_date'
            : sortBy === 'progress'
              ? 'progress_percentage'
              : 'project_created_at';

    query = query.order(sortColumn, { ascending: sortOrder === 'asc', nullsFirst: false });

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data: projects, error, count } = await query;

    if (error) {
      console.error('Failed to fetch projects:', error);
      return NextResponse.json({ message: 'Failed to fetch projects' }, { status: 500 });
    }

    // Transform the data to match frontend expectations
    const transformedProjects = (projects || []).map((stats: ProjectDashboardStats) => ({
      id: stats.project_id,
      name: stats.project_name,
      status: stats.project_status,
      organizationId: stats.organization_id,
      clientName: stats.client_name,
      clientCompany: stats.client_company,
      dueDate: stats.due_date,
      createdAt: stats.project_created_at,
      lastActivityAt: stats.last_activity_at,
      progressPercentage: stats.progress_percentage,
      stats: {
        totalLots: stats.total_lots,
        pendingLots: stats.pending_lots,
        inReviewLots: stats.in_review_lots,
        approvedLots: stats.approved_lots,
        rejectedLots: stats.rejected_lots,
        totalComments: stats.total_comments,
        unresolvedComments: stats.unresolved_comments,
      },
    }));

    return NextResponse.json(
      {
        projects: transformedProjects,
        total: count || 0,
        page,
        limit,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error) {
    console.error('Projects list error:', error);
    return NextResponse.json({ message: 'An unexpected error occurred' }, { status: 500 });
  }
}

// POST /api/projects - Create a new project
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate request body
    const validationResult = createProjectSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { message: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const data = validationResult.data;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Apply rate limiting - 10 projects per hour per user
    const rateLimitResult = await apiRateLimiter.checkLimit(user.id);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          message: 'Too many projects created. Please try again later.',
          retryAfter: rateLimitResult.retryAfter || 0,
        },
        {
          status: 429,
          headers: {
            'Retry-After': (rateLimitResult.retryAfter || 0).toString(),
            'X-RateLimit-Limit': (rateLimitResult.limit || 0).toString(),
            'X-RateLimit-Remaining': (rateLimitResult.remaining || 0).toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetAt || Date.now()).toISOString(),
          },
        }
      );
    }

    // Verify user has permission to create projects in the organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', data.organizationId)
      .eq('user_id', user.id)
      .single();

    if (!membership || !['owner', 'admin', 'member'].includes(membership.role)) {
      return NextResponse.json(
        { message: 'You do not have permission to create projects in this organization' },
        { status: 403 }
      );
    }

    // Check for duplicate project name within the organization
    const { data: existingProject } = await supabase
      .from('projects')
      .select('id')
      .eq('organization_id', data.organizationId)
      .ilike('name', data.name.trim())
      .single();

    if (existingProject) {
      return NextResponse.json(
        { message: 'A project with this name already exists in your organization' },
        { status: 409 }
      );
    }

    // Hash password if provided for password-protected projects
    let passwordHash = null;
    if (data.visibility === 'password' && data.password) {
      const bcrypt = require('bcryptjs');
      passwordHash = await bcrypt.hash(data.password, 10);
    }

    // Create the project
    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        organization_id: data.organizationId,
        name: data.name.trim(),
        description: data.description,
        client_name: data.clientName,
        client_email: data.clientEmail || null,
        client_phone: data.clientPhone,
        client_company: data.clientCompany,
        start_date: data.startDate,
        due_date: data.dueDate,
        visibility: data.visibility,
        password_hash: passwordHash,
        created_by: user.id,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create project:', error);
      return NextResponse.json({ message: 'Failed to create project' }, { status: 500 });
    }

    // Refresh the materialized view with retry logic
    let refreshAttempts = 0;
    const maxRefreshAttempts = 3;
    let refreshSuccess = false;

    while (refreshAttempts < maxRefreshAttempts && !refreshSuccess) {
      const { error: refreshError } = await supabase.rpc('refresh_project_dashboard_stats');
      if (refreshError) {
        console.error(
          `Failed to refresh project dashboard stats (attempt ${refreshAttempts + 1}):`,
          refreshError
        );
        refreshAttempts++;
        if (refreshAttempts < maxRefreshAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      } else {
        refreshSuccess = true;
        // Add a longer delay to ensure the materialized view is fully refreshed
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }

    // Fetch the complete project data from the materialized view
    // This ensures we have all the stats immediately available
    let projectStats = null;
    let fetchAttempts = 0;
    const maxFetchAttempts = 3;

    while (fetchAttempts < maxFetchAttempts && !projectStats) {
      const { data, error } = await supabase
        .from('project_dashboard_stats')
        .select('*')
        .eq('project_id', project.id)
        .single();

      if (error || !data) {
        fetchAttempts++;
        if (fetchAttempts < maxFetchAttempts) {
          console.log(
            `Project not found in materialized view (attempt ${fetchAttempts}), retrying...`
          );
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } else {
        projectStats = data;
      }
    }

    const transformedProject = projectStats
      ? {
          id: projectStats.project_id,
          name: projectStats.project_name,
          status: projectStats.project_status,
          organizationId: projectStats.organization_id,
          clientName: projectStats.client_name,
          clientCompany: projectStats.client_company,
          dueDate: projectStats.due_date,
          createdAt: projectStats.project_created_at,
          lastActivityAt: projectStats.last_activity_at,
          progressPercentage: projectStats.progress_percentage,
          stats: {
            totalLots: projectStats.total_lots,
            pendingLots: projectStats.pending_lots,
            inReviewLots: projectStats.in_review_lots,
            approvedLots: projectStats.approved_lots,
            rejectedLots: projectStats.rejected_lots,
            totalComments: projectStats.total_comments,
            unresolvedComments: projectStats.unresolved_comments,
          },
        }
      : {
          // Fallback data if materialized view is not ready
          id: project.id,
          name: project.name,
          status: project.status,
          organizationId: project.organization_id,
          clientName: project.client_name,
          clientCompany: project.client_company,
          dueDate: project.due_date,
          createdAt: project.created_at,
          lastActivityAt: project.created_at,
          progressPercentage: 0,
          stats: {
            totalLots: 0,
            pendingLots: 0,
            inReviewLots: 0,
            approvedLots: 0,
            rejectedLots: 0,
            totalComments: 0,
            unresolvedComments: 0,
          },
        };

    return NextResponse.json(
      {
        message: 'Project created successfully',
        project: transformedProject,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create project error:', error);
    return NextResponse.json({ message: 'An unexpected error occurred' }, { status: 500 });
  }
}
