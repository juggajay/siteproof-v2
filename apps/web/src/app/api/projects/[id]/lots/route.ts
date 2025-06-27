import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import type { Lot } from '@siteproof/database';

// Schema for creating a lot
const createLotSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  files: z.array(z.object({
    url: z.string().url(),
    name: z.string(),
    size: z.number(),
    type: z.string(),
  })).min(1, 'At least one file is required'),
  internalNotes: z.string().optional(),
});

// GET /api/projects/[id]/lots - List lots for a project
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as Lot['status'] | null;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user has access to the project
    const { data: project } = await supabase
      .from('projects')
      .select('organization_id')
      .eq('id', projectId)
      .single();

    if (!project) {
      return NextResponse.json(
        { message: 'Project not found' },
        { status: 404 }
      );
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
      .select(`
        *,
        creator:created_by (
          id,
          full_name,
          email,
          avatar_url
        ),
        reviewer:reviewed_by (
          id,
          full_name,
          email
        ),
        comments:comments(count)
      `, { count: 'exact' })
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
      console.error('Failed to fetch lots:', error);
      return NextResponse.json(
        { message: 'Failed to fetch lots' },
        { status: 500 }
      );
    }

    // Transform the data
    const transformedLots = (lots || []).map((lot: any) => ({
      ...lot,
      commentCount: lot.comments?.[0]?.count || 0,
      comments: undefined, // Remove the count object
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
    return NextResponse.json(
      { message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/lots - Create a new lot
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user has access to create lots in this project
    const { data: project } = await supabase
      .from('projects')
      .select('organization_id, name')
      .eq('id', projectId)
      .single();

    if (!project) {
      return NextResponse.json(
        { message: 'Project not found' },
        { status: 404 }
      );
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
      .select(`
        *,
        creator:created_by (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error('Failed to create lot:', error);
      return NextResponse.json(
        { message: 'Failed to create lot' },
        { status: 500 }
      );
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
    return NextResponse.json(
      { message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}