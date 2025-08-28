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

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Update specific fields if provided
    if (body.data !== undefined) {
      updateData.data = body.data;
    }
    
    if (body.inspection_status !== undefined) {
      updateData.inspection_status = body.inspection_status;
    }
    
    if (body.inspection_date !== undefined) {
      updateData.inspection_date = body.inspection_date;
    }
    
    if (body.completion_percentage !== undefined) {
      updateData.completion_percentage = body.completion_percentage;
    }
    
    if (body.evidence_files !== undefined) {
      updateData.evidence_files = body.evidence_files;
    }

    // Calculate completion percentage if data is updated
    if (body.data) {
      const completionPercentage = calculateCompletionPercentage(body.data);
      updateData.completion_percentage = completionPercentage;
      
      // Auto-update status based on completion
      if (completionPercentage === 100 && !body.inspection_status) {
        updateData.inspection_status = 'completed';
      } else if (completionPercentage > 0 && !body.inspection_status) {
        updateData.inspection_status = 'in_progress';
      }
    }

    // Update the ITP instance
    const { data: updatedInstance, error: updateError } = await supabase
      .from('itp_instances')
      .update(updateData)
      .eq('id', itpId)
      .select()
      .single();

    if (updateError) {
      console.error('[ITP Update] Update error:', updateError);
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
        is_active: false 
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