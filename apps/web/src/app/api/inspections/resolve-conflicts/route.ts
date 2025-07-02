import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const conflictResolutionSchema = z.object({
  conflicts: z.array(
    z.object({
      inspection_id: z.string().uuid(),
      resolution_type: z.enum(['use_client', 'use_server', 'merge']),
      merged_data: z
        .object({
          name: z.string().optional(),
          status: z.enum(['draft', 'in_progress', 'completed', 'approved']).optional(),
          responses: z.record(z.any()).optional(),
          completion_percentage: z.number().min(0).max(100).optional(),
          notes: z.string().optional(),
        })
        .optional(),
      client_data: z.any(),
      server_data: z.any(),
    })
  ),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request
    const body = await request.json();
    const validationResult = conflictResolutionSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid conflict resolution data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { conflicts } = validationResult.data;

    // Get user's organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'User not associated with any organization' },
        { status: 403 }
      );
    }

    // Check if user can resolve conflicts (admin or project manager)
    const canResolve = ['owner', 'admin', 'project_manager'].includes(membership.role);
    if (!canResolve) {
      return NextResponse.json(
        { error: 'Insufficient permissions to resolve conflicts' },
        { status: 403 }
      );
    }

    const resolutionResults = {
      resolved: [] as any[],
      failed: [] as any[],
    };

    // Process each conflict
    for (const conflict of conflicts) {
      try {
        let updateData: any = {};

        switch (conflict.resolution_type) {
          case 'use_client':
            updateData = {
              name: conflict.client_data.name,
              status: conflict.client_data.status,
              responses: conflict.client_data.responses,
              completion_percentage: conflict.client_data.completion_percentage,
              notes: conflict.client_data.notes,
              updated_at: new Date().toISOString(),
            };
            break;

          case 'use_server':
            // Server data is already in the database, no update needed
            updateData = {
              updated_at: new Date().toISOString(), // Just update the timestamp
            };
            break;

          case 'merge':
            if (!conflict.merged_data) {
              throw new Error('Merged data is required for merge resolution');
            }
            updateData = {
              ...conflict.merged_data,
              updated_at: new Date().toISOString(),
            };
            break;

          default:
            throw new Error(`Invalid resolution type: ${conflict.resolution_type}`);
        }

        // Apply the resolution
        const { data: updatedInspection, error } = await supabase
          .from('itp_instances')
          .update(updateData)
          .eq('id', conflict.inspection_id)
          .select()
          .single();

        if (error) {
          throw error;
        }

        // Log the conflict resolution
        await supabase.from('activity_logs').insert({
          user_id: user.id,
          action: 'inspection.conflict_resolved',
          metadata: {
            inspection_id: conflict.inspection_id,
            resolution_type: conflict.resolution_type,
            had_merge_data: !!conflict.merged_data,
          },
        });

        resolutionResults.resolved.push({
          inspection_id: conflict.inspection_id,
          resolution_type: conflict.resolution_type,
          updated_inspection: updatedInspection,
        });
      } catch (error) {
        console.error('Error resolving conflict for inspection:', conflict.inspection_id, error);
        resolutionResults.failed.push({
          inspection_id: conflict.inspection_id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Create a backup of the resolution decisions
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      action: 'inspections.bulk_conflict_resolution',
      metadata: {
        total_conflicts: conflicts.length,
        resolved_count: resolutionResults.resolved.length,
        failed_count: resolutionResults.failed.length,
        resolution_types: conflicts.map((c) => c.resolution_type),
      },
    });

    return NextResponse.json({
      success: resolutionResults.failed.length === 0,
      resolved_count: resolutionResults.resolved.length,
      failed_count: resolutionResults.failed.length,
      results: resolutionResults,
    });
  } catch (error) {
    console.error('Error in conflict resolution:', error);
    return NextResponse.json({ error: 'Failed to resolve conflicts' }, { status: 500 });
  }
}
