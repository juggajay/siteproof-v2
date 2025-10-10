import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Schema for sync request
const syncRequestSchema = z.object({
  lastSyncTimestamp: z.string().optional(),
  inspections: z
    .array(
      z.object({
        id: z.string().uuid(),
        template_id: z.string().uuid(),
        project_id: z.string().uuid(),
        lot_id: z.string().uuid().optional(),
        name: z.string(),
        status: z.enum(['draft', 'in_progress', 'completed', 'approved']),
        responses: z.record(z.any()).optional(),
        completion_percentage: z.number().min(0).max(100),
        notes: z.string().optional(),
        created_at: z.string(),
        updated_at: z.string(),
        completed_at: z.string().optional(),
        offline_id: z.string().optional(), // For tracking offline-created items
      })
    )
    .default([]),
  templates: z
    .array(
      z.object({
        id: z.string().uuid(),
        name: z.string(),
        structure: z.any(),
        last_accessed: z.string(),
      })
    )
    .default([]),
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
    const validationResult = syncRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid sync data', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { lastSyncTimestamp, inspections, templates } = validationResult.data;

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

    const syncResults = {
      inspections: {
        created: [] as any[],
        updated: [] as any[],
        conflicts: [] as any[],
      },
      serverUpdates: {
        inspections: [] as any[],
        templates: [] as any[],
      },
      lastSyncTimestamp: new Date().toISOString(),
    };

    // Process incoming inspections
    for (const inspection of inspections) {
      try {
        // Check if inspection exists
        const { data: existingInspection } = await supabase
          .from('itp_instances')
          .select('*')
          .eq('id', inspection.id)
          .single();

        if (existingInspection) {
          // Check if the instance was deleted
          if (existingInspection.deleted_at !== null) {
            // Instance was deleted on server - don't sync
            syncResults.inspections.conflicts.push({
              client: inspection,
              server: existingInspection,
              conflict_type: 'instance_deleted',
            });
            continue; // Skip to next inspection
          }

          // Check for conflicts (server updated since client's last sync)
          const serverUpdatedAt = new Date(existingInspection.updated_at);
          const clientUpdatedAt = new Date(inspection.updated_at);
          const lastSync = lastSyncTimestamp ? new Date(lastSyncTimestamp) : new Date(0);

          if (serverUpdatedAt > lastSync && serverUpdatedAt > clientUpdatedAt) {
            // Conflict detected
            syncResults.inspections.conflicts.push({
              client: inspection,
              server: existingInspection,
              conflict_type: 'update_conflict',
            });
          } else {
            // Update existing inspection
            const { data: updatedInspection, error } = await supabase
              .from('itp_instances')
              .update({
                name: inspection.name,
                status: inspection.status,
                responses: inspection.responses,
                completion_percentage: inspection.completion_percentage,
                notes: inspection.notes,
                completed_at: inspection.completed_at,
                updated_at: new Date().toISOString(),
              })
              .eq('id', inspection.id)
              .select()
              .single();

            if (error) {
              console.error('Error updating inspection:', error);
            } else {
              syncResults.inspections.updated.push(updatedInspection);
            }
          }
        } else {
          // Create new inspection
          const { data: newInspection, error } = await supabase
            .from('itp_instances')
            .insert({
              id: inspection.id,
              template_id: inspection.template_id,
              project_id: inspection.project_id,
              lot_id: inspection.lot_id,
              name: inspection.name,
              status: inspection.status,
              responses: inspection.responses || {},
              completion_percentage: inspection.completion_percentage,
              notes: inspection.notes,
              created_by: user.id,
              created_at: inspection.created_at,
              updated_at: new Date().toISOString(),
              completed_at: inspection.completed_at,
            })
            .select()
            .single();

          if (error) {
            console.error('Error creating inspection:', error);
            syncResults.inspections.conflicts.push({
              client: inspection,
              error: error.message,
              conflict_type: 'creation_error',
            });
          } else {
            syncResults.inspections.created.push(newInspection);
          }
        }
      } catch (error) {
        console.error('Error processing inspection:', inspection.id, error);
        syncResults.inspections.conflicts.push({
          client: inspection,
          error: error instanceof Error ? error.message : 'Unknown error',
          conflict_type: 'processing_error',
        });
      }
    }

    // Get server updates since last sync
    if (lastSyncTimestamp) {
      // Get updated inspections
      const { data: serverInspections } = await supabase
        .from('itp_instances')
        .select(
          `
          *,
          template:itp_templates(id, name, structure),
          assignment:itp_assignments(
            id,
            assigned_to,
            assigned_by,
            assigned_at,
            due_date
          )
        `
        )
        .gte('updated_at', lastSyncTimestamp)
        .eq('project.organization_id', membership.organization_id);

      syncResults.serverUpdates.inspections = serverInspections || [];

      // Get updated templates that the user has access to
      const { data: serverTemplates } = await supabase
        .from('itp_templates')
        .select('*')
        .eq('organization_id', membership.organization_id)
        .eq('is_active', true)
        .gte('updated_at', lastSyncTimestamp);

      syncResults.serverUpdates.templates = serverTemplates || [];
    }

    // Update template access timestamps
    for (const template of templates) {
      await supabase
        .from('itp_templates')
        .update({ last_accessed_at: template.last_accessed })
        .eq('id', template.id)
        .eq('organization_id', membership.organization_id);
    }

    // Log sync activity
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      action: 'inspections.sync',
      metadata: {
        inspections_created: syncResults.inspections.created.length,
        inspections_updated: syncResults.inspections.updated.length,
        conflicts: syncResults.inspections.conflicts.length,
        server_updates: syncResults.serverUpdates.inspections.length,
      },
    });

    return NextResponse.json(syncResults);
  } catch (error) {
    console.error('Error in inspection sync:', error);
    return NextResponse.json({ error: 'Failed to sync inspections' }, { status: 500 });
  }
}
