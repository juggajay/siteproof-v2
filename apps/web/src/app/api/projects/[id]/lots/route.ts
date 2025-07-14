import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { apiRateLimiter } from '@/lib/rate-limiter';
import type { Lot } from '@siteproof/database';

// Schema for creating a lot
const createLotSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  files: z
    .array(
      z.object({
        url: z.string().url(),
        name: z.string(),
        size: z.number(),
        type: z.string(),
      })
    )
    .optional()
    .default([]),
  internalNotes: z.string().optional(),
  status: z.enum(['pending', 'in_review', 'approved', 'rejected']).optional().default('pending'),
});

// GET /api/projects/[id]/lots - List lots for a project
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const projectId = params?.id;
    console.log('[Lots API] GET request for project:', projectId);

    const { searchParams } = new URL(request.url);
    const status = searchParams?.get('status') as Lot['status'] | null;
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

    // Verify user has access to the project
    const { data: project } = await supabase
      .from('projects')
      .select('organization_id')
      .eq('id', projectId)
      .single();

    if (!project) {
      return NextResponse.json({ message: 'Project not found' }, { status: 404 });
    }

    // Check membership
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

    // Build query
    let query = supabase
      .from('lots')
      .select(
        `
        *,
        creator:profiles!lots_created_by_fkey (
          id,
          full_name,
          email,
          avatar_url
        ),
        reviewer:profiles!lots_reviewed_by_fkey (
          id,
          full_name,
          email
        )
      `,
        { count: 'exact' }
      )
      .eq('project_id', projectId)
      .order('lot_number', { ascending: false });

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data: lots, error, count } = await query;

    if (error) {
      console.error('[Lots API] Failed to fetch lots:', error);
      console.error('[Lots API] Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      return NextResponse.json(
        {
          message: 'Failed to fetch lots',
          error: error.message,
          code: error.code,
        },
        { status: 400 }
      );
    }

    // Transform the data
    const transformedLots = (lots || []).map((lot: any) => ({
      ...lot,
      commentCount: 0, // TODO: Add comment count query when needed
    }));

    return NextResponse.json(
      {
        lots: transformedLots,
        total: count || 0,
        page,
        limit,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get lots error:', error);
    return NextResponse.json({ message: 'An unexpected error occurred' }, { status: 500 });
  }
}

// POST /api/projects/[id]/lots - Create a new lot
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const projectId = params.id;
    const body = await request.json();

    // Validate request body
    const validationResult = createLotSchema.safeParse(body);
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

    // Apply rate limiting - 30 lots per hour per user
    const rateLimitResult = await apiRateLimiter.checkLimit(`lot_creation:${user.id}`);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          message: 'Too many lots created. Please try again later.',
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

    // Verify user has access to create lots in this project
    const { data: project } = await supabase
      .from('projects')
      .select('organization_id, name')
      .eq('id', projectId)
      .single();

    if (!project) {
      return NextResponse.json({ message: 'Project not found' }, { status: 404 });
    }

    // Check membership and permissions
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', project.organization_id)
      .eq('user_id', user.id)
      .single();

    if (!membership || !['owner', 'admin', 'member'].includes(membership.role)) {
      return NextResponse.json(
        { message: 'You do not have permission to create lots in this project' },
        { status: 403 }
      );
    }

    // Create the lot (lot_number will be auto-assigned by trigger)
    const { data: lot, error } = await supabase
      .from('lots')
      .insert({
        project_id: projectId,
        name: data.name || `Lot for ${project.name}`,
        description: data.description,
        files: data.files,
        internal_notes: data.internalNotes,
        status: 'pending',
        created_by: user.id,
        submitted_at: new Date().toISOString(),
      })
      .select(
        `
        *,
        creator:profiles!lots_created_by_fkey (
          id,
          full_name,
          email,
          avatar_url
        )
      `
      )
      .single();

    if (error) {
      console.error('Failed to create lot:', error);
      return NextResponse.json({ message: 'Failed to create lot' }, { status: 500 });
    }

    // Refresh the materialized view
    await supabase.rpc('refresh_project_dashboard_stats');

    return NextResponse.json(
      {
        message: 'Lot created successfully',
        lot,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create lot error:', error);
    return NextResponse.json({ message: 'An unexpected error occurred' }, { status: 500 });
  }
}
