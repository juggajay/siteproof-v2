import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface BatchUpdate {
  instanceId: string;
  updates: {
    itemId: string;
    status: 'pass' | 'fail' | 'na';
    notes?: string;
  }[];
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { updates } = body as { updates: BatchUpdate[] };

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json({ error: 'Invalid request format' }, { status: 400 });
    }

    console.log('[Batch Update] Processing', updates.length, 'instance updates');

    const results = [];
    const errors = [];

    for (const update of updates) {
      try {
        // Fetch current instance
        const { data: instance, error: fetchError } = await supabase
          .from('itp_instances')
          .select('*')
          .eq('id', update.instanceId)
          .single();

        if (fetchError || !instance) {
          errors.push({ instanceId: update.instanceId, error: 'Instance not found' });
          continue;
        }

        // Update the data structure
        const currentData = instance.data || {};
        let totalItems = 0;
        let completedItems = 0;

        // Apply all updates for this instance
        for (const itemUpdate of update.updates) {
          const [sectionId, itemId] = itemUpdate.itemId.includes('-') 
            ? itemUpdate.itemId.split('-') 
            : ['items', itemUpdate.itemId];

          if (!currentData[sectionId]) {
            currentData[sectionId] = {};
          }

          currentData[sectionId][itemId] = {
            result: itemUpdate.status,
            notes: itemUpdate.notes || '',
            updated_at: new Date().toISOString(),
            updated_by: user.id
          };
        }

        // Calculate completion percentage
        for (const section in currentData) {
          for (const item in currentData[section]) {
            totalItems++;
            if (currentData[section][item]?.result) {
              completedItems++;
            }
          }
        }

        const completionPercentage = totalItems > 0 
          ? Math.round((completedItems / totalItems) * 100) 
          : 0;

        // Determine status based on completion
        let status = 'pending';
        if (completionPercentage === 100) {
          status = 'completed';
        } else if (completionPercentage > 0) {
          status = 'in_progress';
        }

        // Prepare update object - using the columns we know exist
        const updateData: any = {
          data: currentData,
          updated_at: new Date().toISOString()
        };

        // Try to update with new columns first
        const { data: updatedInstance, error: updateError } = await supabase
          .from('itp_instances')
          .update({
            ...updateData,
            inspection_status: status,
            completion_percentage: completionPercentage
          })
          .eq('id', update.instanceId)
          .select()
          .single();

        if (updateError) {
          // Fallback to basic columns if new ones don't exist
          const { data: fallbackInstance, error: fallbackError } = await supabase
            .from('itp_instances')
            .update({
              ...updateData,
              status: status,
              completion_percentage: completionPercentage
            })
            .eq('id', update.instanceId)
            .select()
            .single();

          if (fallbackError) {
            errors.push({ instanceId: update.instanceId, error: fallbackError.message });
          } else {
            results.push(fallbackInstance);
          }
        } else {
          results.push(updatedInstance);
        }
      } catch (error) {
        console.error('[Batch Update] Error processing instance:', update.instanceId, error);
        errors.push({ 
          instanceId: update.instanceId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    console.log('[Batch Update] Complete:', results.length, 'succeeded,', errors.length, 'failed');

    return NextResponse.json({
      success: true,
      updated: results.length,
      errors: errors.length > 0 ? errors : undefined,
      results
    });

  } catch (error) {
    console.error('[Batch Update] Fatal error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}