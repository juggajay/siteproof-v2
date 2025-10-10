import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { apiRateLimiter } from '@/lib/rate-limiter';
import type { ProjectDashboardStats } from '@siteproof/database';
import { log } from '@/lib/logger';

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

    // OPTIMIZED: Fetch organization memberships ONCE
    // Cache memberships for request scope to avoid duplicate queries
    const { data: memberships, error: membershipError } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id);

    log.debug('[Projects API GET] Membership query result', {
      membershipsCount: memberships?.length || 0,
      hasError: !!membershipError,
      userId: user.id,
    });

    if (!memberships || memberships.length === 0) {
      log.info('[Projects API GET] User has no organization memberships', { userId: user.id });
      return NextResponse.json({ projects: [], total: 0, page, limit }, { status: 200 });
    }

    const orgIds = memberships.map((m) => m.organization_id);
    log.debug('[Projects API GET] User belongs to organizations', {
      userId: user.id,
      organizationIds: orgIds,
    });

    // Verify specific organization access if provided
    if (organizationId) {
      const membership = memberships.find((m) => m.organization_id === organizationId);
      if (!membership) {
        return NextResponse.json(
          { message: 'You are not a member of this organization' },
          { status: 403 }
        );
      }
    }

    // Base query for project stats
    let query = supabase.from('project_dashboard_stats').select('*', { count: 'exact' });

    // Filter by organization
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    } else {
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

    log.debug('[Projects API GET] Executing query with filters', {
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
      log.error('[Projects API GET] Failed to fetch projects', error, { userId: user.id });
      return NextResponse.json({ message: 'Failed to fetch projects' }, { status: 500 });
    }

    // OPTIMIZED: Materialized view should already filter deleted projects
    // If not, we'll handle it in the fallback query with deleted_at IS NULL
    const filteredProjects = projects || [];

    log.debug('[Projects API GET] Query results', {
      projectsCount: filteredProjects?.length || 0,
      totalCount: count,
      firstProject: filteredProjects?.[0]
        ? { id: filteredProjects[0].project_id, name: filteredProjects[0].project_name }
        : null,
    });

    // If no projects found in materialized view, return empty result
    if ((!filteredProjects || filteredProjects.length === 0) && count === 0) {
      log.info('[Projects API GET] No projects found in materialized view', { userId: user.id });
      const totalCount = 0;
      const totalPages = 0;
      const hasMore = false;

      return NextResponse.json(
        {
          projects: [],
          // Legacy format (for backward compatibility)
          total: totalCount,
          page,
          limit,
          // New pagination format
          pagination: {
            total: totalCount,
            page,
            limit,
            totalPages,
            hasMore,
          },
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

    // Transform the data to match frontend expectations
    const transformedProjects = (filteredProjects || []).map((stats: ProjectDashboardStats) => ({
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

    // Calculate pagination metadata
    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / limit);
    const hasMore = page < totalPages;

    return NextResponse.json(
      {
        projects: transformedProjects,
        // Legacy format (for backward compatibility)
        total: totalCount,
        page,
        limit,
        // New pagination format (standardized across all endpoints)
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages,
          hasMore,
        },
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
    log.error('Projects list error', error);
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
            'Retry-After': (rateLimitResult.retryAfter || 60).toString(),
            'X-RateLimit-Limit': '60',
            'X-RateLimit-Remaining': (rateLimitResult.remainingAttempts || 0).toString(),
            'X-RateLimit-Reset': new Date(
              Date.now() + (rateLimitResult.retryAfter || 60) * 1000
            ).toISOString(),
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
    log.info('[Projects API] Creating project', {
      organizationId: data.organizationId,
      projectName: data.name.trim(),
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
      log.error('[Projects API] Failed to create project', error, {
        code: error.code,
        userId: user.id,
        organizationId: data.organizationId,
      });
      return NextResponse.json(
        {
          message: 'Failed to create project',
          error: error.message,
          code: error.code,
        },
        { status: 500 }
      );
    }

    log.info('[Projects API] Project created successfully', {
      projectId: project.id,
      userId: user.id,
    });

    // Skip materialized view refresh due to missing unique index
    // The view will be refreshed on the next scheduled refresh
    log.debug(
      '[Projects API] Skipping materialized view refresh (will update on next scheduled refresh)'
    );

    // Add a small delay to allow any database triggers to complete
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Fetch the complete project data from the materialized view
    // This ensures we have all the stats immediately available
    log.debug('[Projects API] Fetching project stats from materialized view', {
      projectId: project.id,
    });
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
        log.warn(
          `[Projects API] Project not found in materialized view (attempt ${fetchAttempts}/${maxFetchAttempts})`,
          { errorMessage: error?.message, projectId: project.id }
        );
        if (fetchAttempts < maxFetchAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } else {
        projectStats = data;
        log.debug('[Projects API] Project stats fetched successfully', { projectId: project.id });
      }
    }

    // If materialized view is not ready, return error
    if (!projectStats) {
      log.error('[Projects API] Failed to fetch project stats from materialized view', undefined, {
        projectId: project.id,
      });
      return NextResponse.json(
        {
          message: 'Project created but stats temporarily unavailable. Please refresh the page.',
          project: {
            id: project.id,
            name: project.name,
          },
        },
        { status: 201 }
      );
    }

    const transformedProject = {
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
    };

    return NextResponse.json(
      {
        message: 'Project created successfully',
        project: transformedProject,
      },
      { status: 201 }
    );
  } catch (error) {
    log.error('Create project error', error);
    return NextResponse.json({ message: 'An unexpected error occurred' }, { status: 500 });
  }
}
