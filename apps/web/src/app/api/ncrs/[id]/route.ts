import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updateNcrSchema = z.object({
  title: z.string().min(5).optional(),
  description: z.string().min(20).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  category: z.string().optional(),
  location: z.string().optional(),
  trade: z.string().optional(),
  assigned_to: z.string().uuid().optional().nullable(),
  contractor_id: z.string().uuid().optional().nullable(),
  due_date: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  estimated_cost: z.number().optional(),
  actual_cost: z.number().optional(),
  cost_notes: z.string().optional(),
});

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: ncr, error } = await supabase
      .from('ncrs')
      .select(
        `
        *,
        raisedBy:users!ncrs_raised_by_fkey(id, email, full_name),
        assignedTo:users!ncrs_assigned_to_fkey(id, email, full_name),
        verifiedBy:users!ncrs_verified_by_fkey(id, email, full_name),
        project:projects(id, name, client_name),
        lot:lots(id, lot_number, name),
        inspection:inspections(id)
      `
      )
      .eq('id', params.id)
      .single();

    if (error || !ncr) {
      return NextResponse.json({ error: 'NCR not found' }, { status: 404 });
    }

    return NextResponse.json({ ncr });
  } catch (error) {
    console.error('Error fetching NCR:', error);
    return NextResponse.json({ error: 'Failed to fetch NCR' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateNcrSchema.parse(body);

    // Check if user can edit this NCR
    const { data: ncr } = await supabase
      .from('ncrs')
      .select('raised_by, status')
      .eq('id', params.id)
      .single();

    if (!ncr) {
      return NextResponse.json({ error: 'NCR not found' }, { status: 404 });
    }

    // Only the raiser can edit, and only when status is 'open'
    if (ncr.raised_by !== user.id) {
      return NextResponse.json(
        { error: 'You can only edit NCRs that you raised' },
        { status: 403 }
      );
    }

    if (ncr.status !== 'open') {
      return NextResponse.json(
        { error: 'NCRs can only be edited while in open status' },
        { status: 403 }
      );
    }

    // Update NCR
    const { data: updatedNcr, error: updateError } = await supabase
      .from('ncrs')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Log the change in history
    await supabase.from('ncr_history').insert({
      ncr_id: params.id,
      action: 'edited',
      performed_by: user.id,
      performed_at: new Date().toISOString(),
      changes: validatedData,
    });

    return NextResponse.json({
      message: 'NCR updated successfully',
      ncr: updatedNcr,
    });
  } catch (error) {
    console.error('Error updating NCR:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to update NCR' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user can delete this NCR
    const { data: ncr } = await supabase
      .from('ncrs')
      .select('raised_by, status, organization_id')
      .eq('id', params.id)
      .single();

    if (!ncr) {
      return NextResponse.json({ error: 'NCR not found' }, { status: 404 });
    }

    // Check user's role in organization
    const { data: member } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', ncr.organization_id)
      .single();

    // Only admin/owner or the raiser (if NCR is still open) can delete
    const canDelete =
      ['owner', 'admin'].includes(member?.role || '') ||
      (ncr.raised_by === user.id && ncr.status === 'open');

    if (!canDelete) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this NCR' },
        { status: 403 }
      );
    }

    // Delete NCR (cascades to related records)
    const { error: deleteError } = await supabase.from('ncrs').delete().eq('id', params.id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ message: 'NCR deleted successfully' });
  } catch (error) {
    console.error('Error deleting NCR:', error);
    return NextResponse.json({ error: 'Failed to delete NCR' }, { status: 500 });
  }
}
