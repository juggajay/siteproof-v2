import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

// Schema for updating a lot
const updateLotSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['pending', 'in_review', 'approved', 'rejected']).optional(),
  files: z.array(z.object({
    url: z.string().url(),
    name: z.string(),
    size: z.number(),
    type: z.string(),
  })).optional(),
  internalNotes: z.string().optional(),
  clientNotes: z.string().optional(),
});

// GET /api/projects/[id]/lots/[lotId] - Get a single lot
export async function GET(
  request: Request,
  { params }: { params: { id: string; lotId: string } }
) {
  try {
    const { id: projectId, lotId } = params;
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch lot with related data
    const { data: lot, error } = await supabase
      .from('lots')
      .select(`
        *,
        project:projects (
          id,
          name,
          organization_id
        ),
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
        comments (
          id,
          content,
          resolved,
          created_at,
          author:author_id (
            id,
            full_name,
            email,
            avatar_url
          )
        )
      `)
      .eq('id', lotId)
      .eq('project_id', projectId)
      .single();

    if (error || !lot) {
      return NextResponse.json(
        { message: 'Lot not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this lot
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', lot.project.organization_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { message: 'You do not have access to this lot' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { lot },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get lot error:', error);
    return NextResponse.json(
      { message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id]/lots/[lotId] - Update a lot
export async function PUT(
  request: Request,
  { params }: { params: { id: string; lotId: string } }
) {
  try {
    const { id: projectId, lotId } = params;
    const body = await request.json();
    
    // Validate request body
    const validationResult = updateLotSchema.safeParse(body);
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

    // Get lot to check permissions
    const { data: lot } = await supabase
      .from('lots')
      .select(`
        *,
        project:projects (
          organization_id,
          created_by
        )
      `)
      .eq('id', lotId)
      .eq('project_id', projectId)
      .single();

    if (!lot) {
      return NextResponse.json(
        { message: 'Lot not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', lot.project.organization_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { message: 'You do not have access to this lot' },
        { status: 403 }
      );
    }

    // Only lot creator, project creator, admins, and owners can update
    const canUpdate = 
      lot.created_by === user.id ||
      lot.project.created_by === user.id ||
      ['admin', 'owner'].includes(membership.role);

    if (!canUpdate) {
      return NextResponse.json(
        { message: 'You do not have permission to update this lot' },
        { status: 403 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.files !== undefined) updateData.files = data.files;
    if (data.internalNotes !== undefined) updateData.internal_notes = data.internalNotes;
    if (data.clientNotes !== undefined) updateData.client_notes = data.clientNotes;
    
    // Handle status change
    if (data.status !== undefined) {
      updateData.status = data.status;
      if (data.status === 'approved' || data.status === 'rejected') {
        updateData.reviewed_at = new Date().toISOString();
        updateData.reviewed_by = user.id;
      }
    }

    // Update the lot
    const { data: updatedLot, error } = await supabase
      .from('lots')
      .update(updateData)
      .eq('id', lotId)
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
        )
      `)
      .single();

    if (error) {
      console.error('Failed to update lot:', error);
      return NextResponse.json(
        { message: 'Failed to update lot' },
        { status: 500 }
      );
    }

    // Refresh the materialized view
    await supabase.rpc('refresh_project_dashboard_stats');

    return NextResponse.json(
      {
        message: 'Lot updated successfully',
        lot: updatedLot,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update lot error:', error);
    return NextResponse.json(
      { message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/lots/[lotId] - Delete a lot
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; lotId: string } }
) {
  try {
    const { id: projectId, lotId } = params;
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get lot to check permissions
    const { data: lot } = await supabase
      .from('lots')
      .select(`
        created_by,
        project:projects (
          organization_id,
          created_by
        )
      `)
      .eq('id', lotId)
      .eq('project_id', projectId)
      .single();

    if (!lot) {
      return NextResponse.json(
        { message: 'Lot not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', lot.project.organization_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { message: 'You do not have access to this lot' },
        { status: 403 }
      );
    }

    // Only lot creator, project creator, admins, and owners can delete
    const canDelete = 
      lot.created_by === user.id ||
      lot.project.created_by === user.id ||
      ['admin', 'owner'].includes(membership.role);

    if (!canDelete) {
      return NextResponse.json(
        { message: 'You do not have permission to delete this lot' },
        { status: 403 }
      );
    }

    // Delete the lot (will cascade delete comments)
    const { error } = await supabase
      .from('lots')
      .delete()
      .eq('id', lotId);

    if (error) {
      console.error('Failed to delete lot:', error);
      return NextResponse.json(
        { message: 'Failed to delete lot' },
        { status: 500 }
      );
    }

    // Refresh the materialized view
    await supabase.rpc('refresh_project_dashboard_stats');

    return NextResponse.json(
      { message: 'Lot deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete lot error:', error);
    return NextResponse.json(
      { message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}