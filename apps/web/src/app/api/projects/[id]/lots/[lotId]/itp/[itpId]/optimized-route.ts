import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { unstable_cache } from 'next/cache';

// Cache configuration
const CACHE_TTL = 60; // 60 seconds cache for GET requests
const CACHE_TAGS = ['itp-instance'];

// Schema for updating ITP instance
const updateItpInstanceSchema = z.object({
  data: z.record(z.any()).optional(),
  inspection_status: z
    .enum(['draft', 'in_progress', 'completed', 'approved', 'rejected'])
    .optional(),
  inspection_date: z.string().optional().nullable(),
  completion_percentage: z.number().min(0).max(100).optional(),
  evidence_files: z
    .array(
      z.object({
        url: z.string(),
        name: z.string(),
        size: z.number(),
        type: z.string(),
      })
    )
    .optional(),
  sync_status: z.enum(['pending', 'synced', 'failed']).optional(),
});

// Cached function for getting ITP instance
const getCachedItpInstance = unstable_cache(
  async (itpId: string, lotId: string, userId: string) => {
    const supabase = await createClient();

    // Optimized query with only necessary fields
    const { data: itpInstance, error } = await supabase
      .from('itp_instances')
      .select(
        `
        id,
        lot_id,
        template_id,
        project_id,
        data,
        inspection_status,
        inspection_date,
        completion_percentage,
        evidence_files,
        created_by,
        updated_at,
        itp_templates!inner(
          id,
          name,
          description,
          structure,
          organization_id
        )
      `
      )
      .eq('id', itpId)
      .eq('lot_id', lotId)
      .single();

    if (error || !itpInstance) {
      return null;
    }

    // Check user access in a separate optimized query
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', (itpInstance as any).itp_templates.organization_id)
      .eq('user_id', userId)
      .single();

    if (!membership) {
      return null;
    }

    return { itpInstance, membership };
  },
  ['itp-instance'],
  {
    revalidate: CACHE_TTL,
    tags: CACHE_TAGS,
  }
);

// GET /api/projects/[id]/lots/[lotId]/itp/[itpId] - Get ITP instance (CACHED)
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string; lotId: string; itpId: string } }
) {
  try {
    const { lotId, itpId } = params;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use cached function
    const result = await getCachedItpInstance(itpId, lotId, user.id);

    if (!result) {
      return NextResponse.json(
        { error: 'ITP instance not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({ itpInstance: result.itpInstance });
  } catch (error) {
    console.error('Error fetching ITP instance:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/projects/[id]/lots/[lotId]/itp/[itpId] - Update ITP instance (OPTIMIZED)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; lotId: string; itpId: string } }
) {
  try {
    const { lotId, itpId } = params;
    const body = await request.json();

    // Validate request body
    const validationResult = updateItpInstanceSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.errors },
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Single optimized query to check permissions and get current data
    const { data: itpInstance } = await supabase
      .from('itp_instances')
      .select(
        `
        id,
        created_by,
        data,
        itp_templates!inner(
          organization_id
        )
      `
      )
      .eq('id', itpId)
      .eq('lot_id', lotId)
      .single();

    if (!itpInstance) {
      return NextResponse.json({ error: 'ITP instance not found' }, { status: 404 });
    }

    // Check user access
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', (itpInstance as any).itp_templates.organization_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Can user update this instance?
    const canUpdate =
      itpInstance.created_by === user.id || ['admin', 'owner'].includes(membership.role);

    if (!canUpdate) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Prepare optimized update data
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Only merge data if it's provided (optimized merge)
    if (data.data !== undefined) {
      const currentData = itpInstance.data || {};
      // Shallow merge for better performance
      updateData.data = { ...currentData, ...data.data };

      // Only deep merge inspection_results if both exist
      if (currentData.inspection_results && data.data.inspection_results) {
        updateData.data.inspection_results = {
          ...currentData.inspection_results,
          ...data.data.inspection_results,
        };
      }
    }

    // Add other fields only if provided
    if (data.inspection_status !== undefined) {
      updateData.inspection_status = data.inspection_status;
    }
    if (data.inspection_date !== undefined) {
      updateData.inspection_date = data.inspection_date;
    }
    if (data.evidence_files !== undefined) {
      updateData.evidence_files = data.evidence_files;
    }
    if (data.sync_status !== undefined) {
      updateData.sync_status = data.sync_status;
    }
    if (data.completion_percentage !== undefined) {
      updateData.completion_percentage = data.completion_percentage;
    }

    // Optimized update with minimal return data
    const { data: updatedInstance, error: updateError } = await supabase
      .from('itp_instances')
      .update(updateData)
      .eq('id', itpId)
      .select('id, inspection_status, updated_at')
      .single();

    if (updateError) {
      console.error('Error updating ITP instance:', updateError);
      return NextResponse.json({ error: 'Failed to update ITP instance' }, { status: 500 });
    }

    // Return minimal response for better performance
    return NextResponse.json({
      message: 'ITP instance updated successfully',
      id: updatedInstance.id,
      status: updatedInstance.inspection_status,
      updated_at: updatedInstance.updated_at,
    });
  } catch (error) {
    console.error('Error updating ITP instance:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/projects/[id]/lots/[lotId]/itp/[itpId] - Delete ITP instance (OPTIMIZED)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; lotId: string; itpId: string } }
) {
  try {
    const { lotId, itpId } = params;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Single query to check permissions
    const { data: itpInstance } = await supabase
      .from('itp_instances')
      .select(
        `
        created_by,
        itp_templates!inner(
          organization_id
        )
      `
      )
      .eq('id', itpId)
      .eq('lot_id', lotId)
      .single();

    if (!itpInstance) {
      return NextResponse.json({ error: 'ITP instance not found' }, { status: 404 });
    }

    // Check user access
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', (itpInstance as any).itp_templates.organization_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Can user delete this instance?
    const canDelete =
      itpInstance.created_by === user.id || ['admin', 'owner'].includes(membership.role);

    if (!canDelete) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Delete the ITP instance
    const { error: deleteError } = await supabase.from('itp_instances').delete().eq('id', itpId);

    if (deleteError) {
      console.error('Error deleting ITP instance:', deleteError);
      return NextResponse.json({ error: 'Failed to delete ITP instance' }, { status: 500 });
    }

    return NextResponse.json({ message: 'ITP instance deleted successfully' });
  } catch (error) {
    console.error('Error deleting ITP instance:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
