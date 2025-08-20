import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const bulkUpdateSchema = z.object({
  sectionId: z.string(),
  itemIds: z.array(z.string()),
  status: z.enum(['pass', 'fail', 'na', 'pending']),
  timestamp: z.string(),
  comment: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string; lotId: string; itpId: string } }
) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sectionId, itemIds, status, timestamp, comment } = bulkUpdateSchema.parse(body);

    const { projectId, lotId, itpId } = params;

    // Get current ITP instance
    const { data: itpInstance, error: fetchError } = await supabase
      .from('itp_instances')
      .select('*')
      .eq('id', itpId)
      .eq('lot_id', lotId)
      .single();

    if (fetchError || !itpInstance) {
      return NextResponse.json({ error: 'ITP instance not found' }, { status: 404 });
    }

    // Update the data JSONB field
    const currentData = itpInstance.data || {};
    const sections = currentData.sections || [];

    // Find and update the relevant section
    const updatedSections = sections.map((section: any) => {
      if (section.id === sectionId) {
        const updatedItems = section.items.map((item: any) => {
          if (itemIds.includes(item.id)) {
            return {
              ...item,
              status,
              updated_at: timestamp,
              updated_by: user.id,
              comment: comment || item.comment,
            };
          }
          return item;
        });

        return {
          ...section,
          items: updatedItems,
        };
      }
      return section;
    });

    // Calculate new completion percentage
    let totalItems = 0;
    let completedItems = 0;

    updatedSections.forEach((section: any) => {
      section.items?.forEach((item: any) => {
        totalItems++;
        if (item.status && item.status !== 'pending') {
          completedItems++;
        }
      });
    });

    const completionPercentage =
      totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    // Determine overall status
    let overallStatus = 'in_progress';
    if (completionPercentage === 100) {
      overallStatus = 'completed';
    } else if (completionPercentage === 0) {
      overallStatus = 'pending';
    }

    // Update the ITP instance
    const { error: updateError } = await supabase
      .from('itp_instances')
      .update({
        data: {
          ...currentData,
          sections: updatedSections,
        },
        completion_percentage: completionPercentage,
        inspection_status: overallStatus,
        updated_at: timestamp,
        last_modified_by: user.id,
      })
      .eq('id', itpId);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update ITP items' }, { status: 500 });
    }

    // Log the bulk update activity
    await supabase.from('activity_logs').insert({
      project_id: projectId,
      lot_id: lotId,
      itp_id: itpId,
      user_id: user.id,
      action: 'bulk_update',
      details: {
        sectionId,
        itemIds,
        status,
        count: itemIds.length,
      },
      created_at: timestamp,
    });

    // Send notifications if items were marked as failed
    if (status === 'fail') {
      // Trigger NCR creation workflow or notification
      await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          title: 'ITP Items Failed',
          body: `${itemIds.length} items marked as failed in ITP`,
          url: `/dashboard/projects/${projectId}/lots/${lotId}/itp/${itpId}`,
          data: {
            type: 'itp_items_failed',
            projectId,
            lotId,
            itpId,
            itemCount: itemIds.length,
          },
        }),
      });
    }

    return NextResponse.json({
      success: true,
      updated: itemIds.length,
      completionPercentage,
      status: overallStatus,
    });
  } catch (error) {
    console.error('Bulk update error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to perform bulk update' }, { status: 500 });
  }
}
