import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  type ITPBatchUpdateRequest,
  type ITPBatchResult,
  type ITPBatchResponse,
  type ITPInstanceRow,
  type ITPInstanceData,
  type ITPInspectionStatus,
  isValidBatchUpdate,
  calculateCompletion,
  determineStatus,
  parseItemId,
  createItemResult,
} from '@/types/itp';

/**
 * Process a single ITP instance update
 */
async function processInstanceUpdate(
  supabase: Awaited<ReturnType<typeof createClient>>,
  update: ITPBatchUpdateRequest,
  userId: string
): Promise<ITPBatchResult> {
  try {
    // Fetch current instance
    const { data: instance, error: fetchError } = await supabase
      .from('itp_instances')
      .select('*')
      .eq('id', update.instanceId)
      .single();

    if (fetchError || !instance) {
      return {
        success: false,
        instanceId: update.instanceId,
        error: 'Instance not found',
        code: 'INSTANCE_NOT_FOUND',
      };
    }

    // Type-safe instance data
    const currentData: ITPInstanceData = (instance.data as ITPInstanceData) || {};

    // Apply all updates for this instance
    for (const itemUpdate of update.updates) {
      const { sectionId, itemId } = parseItemId(itemUpdate.itemId);

      if (!currentData[sectionId]) {
        currentData[sectionId] = {};
      }

      currentData[sectionId][itemId] = createItemResult(
        itemUpdate.status,
        itemUpdate.notes || '',
        userId
      );
    }

    // Calculate completion metrics
    const { completionPercentage } = calculateCompletion(currentData);
    const status: ITPInspectionStatus = determineStatus(completionPercentage);

    // Prepare update object with proper types
    const updateData = {
      data: currentData,
      inspection_status: status,
      completion_percentage: completionPercentage,
      updated_at: new Date().toISOString(),
    };

    // Update instance
    const { data: updatedInstance, error: updateError } = await supabase
      .from('itp_instances')
      .update(updateData)
      .eq('id', update.instanceId)
      .select()
      .single();

    if (updateError) {
      // Fallback: Try with 'status' column instead of 'inspection_status'
      const { data: fallbackInstance, error: fallbackError } = await supabase
        .from('itp_instances')
        .update({
          data: currentData,
          status: status,
          completion_percentage: completionPercentage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', update.instanceId)
        .select()
        .single();

      if (fallbackError) {
        return {
          success: false,
          instanceId: update.instanceId,
          error: fallbackError.message,
          code: 'UPDATE_FAILED',
        };
      }

      return {
        success: true,
        instanceId: update.instanceId,
        data: fallbackInstance as ITPInstanceRow,
      };
    }

    return {
      success: true,
      instanceId: update.instanceId,
      data: updatedInstance as ITPInstanceRow,
    };
  } catch (error) {
    console.error('[Batch Update] Error processing instance:', update.instanceId, error);
    return {
      success: false,
      instanceId: update.instanceId,
      error: error instanceof Error ? error.message : 'Unknown error',
      code: 'PROCESSING_ERROR',
    };
  }
}

/**
 * POST /api/itp/batch-update
 *
 * Batch update multiple ITP instances with inspection results
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { updates } = body as { updates: unknown[] };

    // Validate request format
    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json({ error: 'Invalid request format' }, { status: 400 });
    }

    // Validate each update
    const validUpdates: ITPBatchUpdateRequest[] = [];
    for (const update of updates) {
      if (!isValidBatchUpdate(update)) {
        return NextResponse.json(
          {
            error: 'Invalid update format',
            details: 'Each update must have instanceId and valid updates array',
          },
          { status: 400 }
        );
      }
      validUpdates.push(update);
    }

    console.log('[Batch Update] Processing', validUpdates.length, 'instance updates');

    // Process all updates
    const results: ITPBatchResult[] = await Promise.all(
      validUpdates.map((update) => processInstanceUpdate(supabase, update, user.id))
    );

    // Separate successes and failures
    const successResults: ITPInstanceRow[] = [];
    const errorResults: Array<{ instanceId: string; error: string }> = [];

    for (const result of results) {
      if (result.success) {
        successResults.push(result.data);
      } else {
        errorResults.push({ instanceId: result.instanceId, error: result.error });
      }
    }

    console.log(
      '[Batch Update] Complete:',
      successResults.length,
      'succeeded,',
      errorResults.length,
      'failed'
    );

    const response: ITPBatchResponse = {
      success: true,
      updated: successResults.length,
      errors: errorResults.length > 0 ? errorResults : undefined,
      results: successResults,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Batch Update] Fatal error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown',
      },
      { status: 500 }
    );
  }
}
