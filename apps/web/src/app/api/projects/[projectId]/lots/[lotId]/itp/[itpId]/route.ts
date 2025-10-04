import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; lotId: string; itpId: string }> }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itpId } = await params;

    const { data: itpInstance, error } = await supabase
      .from('itp_instances')
      .select('*')
      .eq('id', itpId)
      .single();

    if (error) {
      console.error('Error fetching ITP instance:', error);
      return NextResponse.json({ error: 'ITP instance not found' }, { status: 404 });
    }

    return NextResponse.json(itpInstance);
  } catch (error) {
    console.error('Get ITP instance error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; lotId: string; itpId: string }> }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itpId, lotId } = await params;
    const body = await request.json();

    console.log('[ITP Update] Updating ITP:', itpId, 'with data:', body);

    // First check if the ITP instance exists and belongs to this lot
    const { data: existingInstance, error: fetchError } = await supabase
      .from('itp_instances')
      .select('*')
      .eq('id', itpId)
      .eq('lot_id', lotId)
      .single();

    if (fetchError || !existingInstance) {
      console.error('[ITP Update] Instance not found:', fetchError);
      return NextResponse.json({ error: 'ITP instance not found' }, { status: 404 });
    }

    // Prepare update data - only include fields that exist in the database
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Update specific fields if provided
    if (body.data !== undefined) {
      updateData.data = body.data;
    }

    // Handle inspection_status
    if (body.inspection_status !== undefined) {
      updateData.inspection_status = body.inspection_status;
    }

    // Handle timestamps for status changes
    // Note: completed_at and started_at columns don't exist in itp_instances table
    // Status transitions are tracked via the inspection_status field only

    // Handle evidence_files if provided
    if (body.evidence_files !== undefined) {
      updateData.evidence_files = body.evidence_files;
    }

    // Handle inspection_date if provided
    if (body.inspection_date !== undefined) {
      updateData.inspection_date = body.inspection_date;
    }

    // Note: completion_percentage column doesn't exist in itp_instances table
    // Completion tracking is handled via the data field

    // Calculate status based on completion if data is updated
    if (body.data && !body.inspection_status) {
      const completionPercentage = calculateCompletionPercentage(body.data);

      // Auto-update inspection_status based on completion
      if (completionPercentage === 100) {
        updateData.inspection_status = 'completed';
      } else if (completionPercentage > 0) {
        updateData.inspection_status = 'in_progress';
      }
    }

    // Update the ITP instance - remove fields that don't exist in the table
    const cleanUpdateData = { ...updateData };

    // Remove fields that don't exist in the current schema
    // Note: inspection_status, inspection_date, evidence_files DO exist (added in migration 0011)
    delete cleanUpdateData.completion_percentage; // This column was removed

    // First try with all fields
    let { data: updatedInstance, error: updateError } = await supabase
      .from('itp_instances')
      .update(updateData)
      .eq('id', itpId)
      .select()
      .single();

    // If it fails due to column not existing, try with clean data
    if (updateError && updateError.message?.includes('column')) {
      console.log('[ITP Update] Retrying with clean data due to column error');
      const result = await supabase
        .from('itp_instances')
        .update(cleanUpdateData)
        .eq('id', itpId)
        .select()
        .single();

      updatedInstance = result.data;
      updateError = result.error;
    }

    if (updateError) {
      console.error('[ITP Update] Update error:', updateError);
      console.error('[ITP Update] Attempted data:', updateData);
      return NextResponse.json(
        { error: 'Failed to update ITP instance', details: updateError.message },
        { status: 500 }
      );
    }

    console.log('[ITP Update] Successfully updated:', updatedInstance);

    return NextResponse.json(updatedInstance);
  } catch (error) {
    console.error('[ITP Update] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; lotId: string; itpId: string }> }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itpId, lotId } = await params;

    // Soft delete by setting deleted_at timestamp
    const { error } = await supabase
      .from('itp_instances')
      .update({
        deleted_at: new Date().toISOString(),
        is_active: false,
      })
      .eq('id', itpId)
      .eq('lot_id', lotId);

    if (error) {
      console.error('Error deleting ITP instance:', error);
      return NextResponse.json({ error: 'Failed to delete ITP instance' }, { status: 500 });
    }

    return NextResponse.json({ message: 'ITP instance deleted successfully' });
  } catch (error) {
    console.error('Delete ITP instance error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to calculate completion percentage
function calculateCompletionPercentage(data: any): number {
  if (!data || typeof data !== 'object') {
    return 0;
  }

  let totalItems = 0;
  let completedItems = 0;

  // Handle both old format (sections) and new format (inspection_items)
  for (const key in data) {
    if (typeof data[key] === 'object' && data[key] !== null) {
      for (const itemKey in data[key]) {
        const item = data[key][itemKey];
        totalItems++;

        // Item is considered complete if it has a result
        if (item && item.result && ['pass', 'fail', 'na'].includes(item.result)) {
          completedItems++;
        }
      }
    }
  }

  if (totalItems === 0) {
    return 0;
  }

  return Math.round((completedItems / totalItems) * 100);
}
