import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createActivityLog } from '@/lib/activity-logger';
import { z } from 'zod';

const submitSchema = z.object({
  signature: z.string(), // Base64 encoded signature image
  notes: z.string().optional(),
  photos: z
    .array(
      z.object({
        url: z.string().url(),
        caption: z.string().optional(),
        timestamp: z.string(),
      })
    )
    .optional(),
});

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const inspectionId = params.id;
    const body = await request.json();

    // Validate input
    const validationResult = submitSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { signature, notes, photos } = validationResult.data;

    // Get the inspection
    const { data: inspection, error: fetchError } = await supabase
      .from('itp_instances')
      .select(
        `
        *,
        template:itp_templates(id, name, structure),
        project:projects(id, name, organization_id),
        lot:lots(id, lot_number, name)
      `
      )
      .eq('id', inspectionId)
      .single();

    if (fetchError || !inspection) {
      return NextResponse.json({ error: 'Inspection not found' }, { status: 404 });
    }

    // Check if user has permission
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', inspection.project.organization_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Validate inspection can be submitted
    if (inspection.status === 'approved') {
      return NextResponse.json({ error: 'Inspection is already approved' }, { status: 400 });
    }

    // Validate all required fields are completed
    const templateStructure = inspection.template.structure;
    const inspectionData = inspection.data || {};
    const missingFields: string[] = [];

    // Check each section for required fields
    templateStructure.sections?.forEach((section: any) => {
      section.items?.forEach((item: any) => {
        if (item.required && !inspectionData[item.id]) {
          missingFields.push(item.label || item.id);
        }
      });
    });

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot submit inspection with missing required fields',
          missingFields,
        },
        { status: 400 }
      );
    }

    // Update inspection to completed status
    const updateData = {
      status: 'completed',
      completion_percentage: 100,
      completed_at: new Date().toISOString(),
      data: {
        ...inspectionData,
        submission: {
          signature,
          notes,
          photos,
          submitted_by: user.id,
          submitted_at: new Date().toISOString(),
        },
      },
      updated_at: new Date().toISOString(),
    };

    const { data: updatedInspection, error: updateError } = await supabase
      .from('itp_instances')
      .update(updateData)
      .eq('id', inspectionId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Update assignment status
    await supabase
      .from('itp_assignments')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('template_id', inspection.template_id)
      .eq('project_id', inspection.project_id)
      .eq('lot_id', inspection.lot_id);

    // Create activity log
    await createActivityLog(user.id, 'inspection.submit', {
      inspection_id: inspectionId,
      template_name: inspection.template.name,
      project_id: inspection.project_id,
      lot_id: inspection.lot_id,
    });

    // Check for failed items and create NCRs if needed
    const failedItems = Object.entries(inspectionData).filter(([key, value]: [string, any]) => {
      const item = findItemInTemplate(templateStructure, key);
      return item?.type === 'checkbox' && value === false;
    });

    if (failedItems.length > 0) {
      // Create NCRs for failed items
      for (const [itemId, _] of failedItems) {
        const item = findItemInTemplate(templateStructure, itemId);
        if (item?.raise_ncr_on_fail) {
          const { data: ncrNumber } = await supabase.rpc('generate_ncr_number', {
            p_organization_id: inspection.project.organization_id,
          });

          await supabase.from('ncrs').insert({
            organization_id: inspection.project.organization_id,
            project_id: inspection.project_id,
            lot_id: inspection.lot_id,
            inspection_id: inspectionId,
            inspection_item_ref: itemId,
            ncr_number: ncrNumber,
            title: `Failed inspection item: ${item.label}`,
            description: `Inspection item "${item.label}" failed during ${inspection.template.name} inspection.`,
            severity: 'medium',
            category: 'quality',
            raised_by: user.id,
            status: 'open',
            priority: 'normal',
          });
        }
      }
    }

    // Send notifications
    const { data: projectAdmins } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', inspection.project.organization_id)
      .in('role', ['admin', 'owner']);

    for (const admin of projectAdmins || []) {
      if (admin.user_id !== user.id) {
        await supabase.from('notifications').insert({
          organization_id: inspection.project.organization_id,
          user_id: admin.user_id,
          type: 'inspection_completed',
          title: 'Inspection Completed',
          message: `Inspection "${inspection.name}" has been completed and requires approval.`,
          data: {
            inspection_id: inspectionId,
            project_id: inspection.project_id,
            lot_id: inspection.lot_id,
            template_name: inspection.template.name,
            failed_items: failedItems.length,
          },
          priority: failedItems.length > 0 ? 'high' : 'normal',
        });
      }
    }

    return NextResponse.json({
      message: 'Inspection submitted successfully',
      inspection: updatedInspection,
      failedItems: failedItems.length,
      ncrsCreated: failedItems.filter(([id]) => {
        const item = findItemInTemplate(templateStructure, id);
        return item?.raise_ncr_on_fail;
      }).length,
    });
  } catch (error) {
    console.error('Error submitting inspection:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to submit inspection' }, { status: 500 });
  }
}

// Helper function to find an item in the template structure
function findItemInTemplate(structure: any, itemId: string): any {
  for (const section of structure.sections || []) {
    for (const item of section.items || []) {
      if (item.id === itemId) {
        return item;
      }
    }
  }
  return null;
}
