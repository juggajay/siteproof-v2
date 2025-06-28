import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const resolveSchema = z.object({
  root_cause: z.string().min(10, 'Root cause analysis must be at least 10 characters'),
  corrective_action: z.string().min(10, 'Corrective action must be at least 10 characters'),
  preventive_action: z.string().optional(),
  actual_cost: z.number().optional(),
  cost_notes: z.string().optional(),
  evidence: z.array(z.string()).optional(), // Array of file URLs
  comment: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const ncrId = params.id;
    const body = await request.json();

    // Validate input
    const validatedData = resolveSchema.parse(body);

    // Check NCR exists and user has permission
    const { data: ncr, error: ncrError } = await supabase
      .from('ncrs')
      .select('*, project:projects(organization_id)')
      .eq('id', ncrId)
      .single();

    if (ncrError || !ncr) {
      return NextResponse.json(
        { error: 'NCR not found' },
        { status: 404 }
      );
    }

    // Check user permission
    const canResolve = 
      ncr.assigned_to === user.id ||
      ncr.raised_by === user.id ||
      await checkUserIsAdmin(supabase, user.id, ncr.project.organization_id);

    if (!canResolve) {
      return NextResponse.json(
        { error: 'You do not have permission to resolve this NCR' },
        { status: 403 }
      );
    }

    // Check current status allows resolution
    if (!['acknowledged', 'in_progress'].includes(ncr.status)) {
      return NextResponse.json(
        { error: `Cannot resolve NCR in ${ncr.status} status` },
        { status: 400 }
      );
    }

    // Update NCR
    const { data: updatedNcr, error: updateError } = await supabase
      .from('ncrs')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        root_cause: validatedData.root_cause,
        corrective_action: validatedData.corrective_action,
        preventive_action: validatedData.preventive_action,
        actual_cost: validatedData.actual_cost,
        cost_notes: validatedData.cost_notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ncrId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Add comment if provided
    if (validatedData.comment) {
      await supabase
        .from('ncr_comments')
        .insert({
          ncr_id: ncrId,
          content: validatedData.comment,
          author_id: user.id,
          is_internal: false,
        });
    }

    // Queue notifications
    await queueNotifications(supabase, ncr, user.id, 'resolved');

    return NextResponse.json({
      message: 'NCR resolved successfully',
      ncr: updatedNcr,
    });
  } catch (error) {
    console.error('Error resolving NCR:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to resolve NCR' },
      { status: 500 }
    );
  }
}

async function checkUserIsAdmin(
  supabase: any,
  userId: string,
  organizationId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('organization_members')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .single();

  return data?.role === 'owner' || data?.role === 'admin';
}

async function queueNotifications(
  supabase: any,
  ncr: any,
  performedBy: string,
  _action: string
) {
  const notifications = [];

  // Notify NCR raiser
  if (ncr.raised_by !== performedBy) {
    notifications.push({
      type: 'ncr_resolved',
      entity_type: 'ncr',
      entity_id: ncr.id,
      recipient_id: ncr.raised_by,
      subject: `NCR ${ncr.ncr_number} has been resolved`,
      body: `The NCR "${ncr.title}" has been marked as resolved. Please review and verify the resolution.`,
      priority: 'high',
    });
  }

  // Notify project managers
  const { data: projectManagers } = await supabase
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', ncr.project.organization_id)
    .in('role', ['owner', 'admin'])
    .neq('user_id', performedBy);

  projectManagers?.forEach((pm: any) => {
    notifications.push({
      type: 'ncr_resolved',
      entity_type: 'ncr',
      entity_id: ncr.id,
      recipient_id: pm.user_id,
      subject: `NCR ${ncr.ncr_number} resolved`,
      body: `NCR "${ncr.title}" in ${ncr.project.name} has been resolved.`,
      priority: 'normal',
    });
  });

  // Insert notifications
  if (notifications.length > 0) {
    await supabase.rpc('queue_notification_batch', { notifications });
  }
}