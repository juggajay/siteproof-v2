import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { validateParams, updateNcrSchema } from '@/lib/validation/schemas';
import { handleAPIError, assertAuthenticated, assertExists } from '@/lib/errors/api-errors';
import { ncrPermissions, type Role } from '@/lib/auth/permissions';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Validate UUID parameter
    const { id } = validateParams(params);

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    assertAuthenticated(user);

    // Get user's organization and role
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    assertExists(member, 'Organization membership');

    // Check permission to view NCRs
    if (!ncrPermissions.canView(member.role as Role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { data: ncr } = await supabase
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
      .eq('id', id)
      .single();

    assertExists(ncr, 'NCR');

    // Verify user has access to this NCR's organization
    if (ncr.organization_id !== member.organization_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ ncr });
  } catch (error) {
    return handleAPIError(error);
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Validate UUID parameter
    const { id } = validateParams(params);

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    assertAuthenticated(user);

    // Get user's organization and role
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    assertExists(member, 'Organization membership');

    const body = await request.json();
    const validatedData = updateNcrSchema.parse(body);

    // Check if user can edit this NCR
    const { data: ncr } = await supabase
      .from('ncrs')
      .select('raised_by, status, organization_id')
      .eq('id', id)
      .single();

    assertExists(ncr, 'NCR');

    // Verify user has access to this NCR's organization
    if (ncr.organization_id !== member.organization_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

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
