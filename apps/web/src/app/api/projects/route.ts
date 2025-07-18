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
      console.log(
        '[Projects API GET] No organizationId provided, fetching user memberships for user:',
        user.id
      );
      const { data: memberships, error: membershipError } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id);

      console.log('[Projects API GET] Membership query result:', {
        memberships,
        error: membershipError,
      });

      if (!memberships || memberships.length === 0) {
        console.log('[Projects API GET] User has no organization memberships');
        return NextResponse.json({ projects: [], total: 0, page, limit }, { status: 200 });
      }

      const orgIds = memberships.map((m) => m.organization_id);
      console.log('[Projects API GET] User belongs to organizations:', orgIds);
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

    console.log('[Projects API GET] Executing query with filters:', {
      organizationIds: organizationId ? [organizationId] : 'from user memberships',
      status,
      search,
      sortColumn,
      sortOrder,
      offset,
      limit,
    });

    const { data: projects, error, count } = await query;

    if (error) {
      console.error('[Projects API GET] Failed to fetch projects:', error);
      return NextResponse.json({ message: 'Failed to fetch projects' }, { status: 500 });
    }

    console.log('[Projects API GET] Query results:', {
      projectsCount: projects?.length || 0,
      totalCount: count,
      firstProject: projects?.[0]
        ? { id: projects[0].project_id, name: projects[0].project_name }
        : null,
    });

    // If no projects found in materialized view, check the projects table directly
    // This handles the case where the materialized view hasn't been refreshed yet
    let orgIds: string[] | undefined;
    if (!organizationId) {
      // Get orgIds from earlier in the code
      const { data: memberships } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id);

      if (memberships && memberships.length > 0) {
        orgIds = memberships.map((m) => m.organization_id);
      }
    }

    if ((!projects || projects.length === 0) && count === 0) {
      console.log(
        '[Projects API GET] No projects in materialized view, checking projects table directly...'
      );

      // Build a query for the projects table
      let directQuery = supabase.from('projects').select('*', { count: 'exact' });

      // Apply the same filters
      if (organizationId) {
        directQuery = directQuery.eq('organization_id', organizationId);
      } else if (orgIds && orgIds.length > 0) {
        directQuery = directQuery.in('organization_id', orgIds);
      }

      if (status) {
        directQuery = directQuery.eq('status', status);
      }

      if (search) {
        directQuery = directQuery.or(
          `name.ilike.%${search}%,client_name.ilike.%${search}%,client_company.ilike.%${search}%`
        );
      }

      // Apply sorting and pagination
      directQuery = directQuery.order('created_at', { ascending: false });
      directQuery = directQuery.range(offset, offset + limit - 1);

      const { data: directProjects, error: directError } = await directQuery;

      if (!directError && directProjects && directProjects.length > 0) {
        console.log(
          '[Projects API GET] Found projects in direct table query:',
          directProjects.length
        );

        // Transform direct project data to match the expected format
        const transformedDirectProjects = directProjects.map((project: any) => ({
          id: project.id,
          name: project.name,
          status: project.status,
          organizationId: project.organization_id,
          clientName: project.client_name,
          clientCompany: project.client_company,
          dueDate: project.due_date,
          createdAt: project.created_at,
          lastActivityAt: project.updated_at || project.created_at,
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
        }));

        return NextResponse.json(
          {
            projects: transformedDirectProjects,
            total: directProjects.length,
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
      }
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
    console.log('[Projects API] Creating project:', {
      organizationId: data.organizationId,
      name: data.name.trim(),
      userId: user.id,
    });

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
      console.error('[Projects API] Failed to create project:', error);
      console.error('[Projects API] Error details:', { code: error.code, message: error.message });
      return NextResponse.json(
        {
          message: 'Failed to create project',
          error: error.message,
          code: error.code,
        },
        { status: 500 }
      );
    }

    console.log('[Projects API] Project created successfully:', { projectId: project.id });

    // Skip materialized view refresh due to missing unique index
    // The view will be refreshed on the next scheduled refresh
    console.log(
      '[Projects API] Skipping materialized view refresh (will update on next scheduled refresh)'
    );

    // Add a small delay to allow any database triggers to complete
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Fetch the complete project data from the materialized view
    // This ensures we have all the stats immediately available
    console.log('[Projects API] Fetching project stats from materialized view...');
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
        console.warn(
          `[Projects API] Project not found in materialized view (attempt ${fetchAttempts}/${maxFetchAttempts})`,
          error?.message || 'No data returned'
        );
        if (fetchAttempts < maxFetchAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } else {
        projectStats = data;
        console.log('[Projects API] Project stats fetched successfully');
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
