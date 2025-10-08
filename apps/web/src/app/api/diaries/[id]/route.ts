import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Project, User } from '@siteproof/database';
import { validateParams } from '@/lib/validation/schemas';
import {
  handleAPIError,
  assertAuthenticated,
  assertExists,
  assertPermission,
} from '@/lib/errors/api-errors';
import { diaryPermissions, filterFinancialDataArray, type Role } from '@/lib/auth/permissions';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    // Validate UUID parameter
    const { id } = validateParams(params);

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    assertAuthenticated(user);

    // Get user's organization and role
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    assertExists(member, 'Organization membership');

    // Check if user has permission to view diaries
    assertPermission(diaryPermissions.canView(member.role as Role), 'Cannot view diaries');

    // Fetch diary directly from table
    const { data: diary } = await supabase.from('daily_diaries').select('*').eq('id', id).single();

    assertExists(diary, 'Diary');

    // Check if user belongs to the same organization
    if (diary.organization_id !== member.organization_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get related data
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', diary.project_id)
      .single<Project>();

    const { data: createdBy } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('id', diary.created_by)
      .single<Pick<User, 'id' | 'email' | 'full_name'>>();

    const { data: approvedBy } = diary.approved_by
      ? await supabase
          .from('users')
          .select('id, email, full_name')
          .eq('id', diary.approved_by)
          .single<Pick<User, 'id' | 'email' | 'full_name'>>()
      : { data: null };

    // Filter trades data based on user role - SECURE: Remove properties entirely, not just set to undefined
    const filteredTrades = diaryPermissions.canViewFinancials(member.role as Role)
      ? diary.trades_on_site
      : diary.trades_on_site?.map((trade: any) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const {
            hourly_rate: _hourly,
            daily_rate: _daily,
            total_cost: _total,
            ...safeTrade
          } = trade;
          return safeTrade;
        });

    // Fetch labour entries
    const { data: labourEntries, error: labourError } = await supabase
      .from('diary_labour_entries')
      .select('*')
      .eq('diary_id', id);

    if (labourError) {
      console.error('Error fetching labour entries:', labourError);
    }

    // Fetch plant entries
    const { data: plantEntries } = await supabase
      .from('diary_plant_entries')
      .select('*')
      .eq('diary_id', id);

    // Fetch material entries
    const { data: materialEntries } = await supabase
      .from('diary_material_entries')
      .select('*')
      .eq('diary_id', id);

    // Filter financial data from all entries
    const filteredLabourEntries = filterFinancialDataArray(
      labourEntries || [],
      member.role as Role,
      ['standard_rate', 'overtime_rate', 'total_cost']
    );

    const filteredPlantEntries = filterFinancialDataArray(plantEntries || [], member.role as Role, [
      'hourly_rate',
      'fuel_cost',
      'total_cost',
    ]);

    const filteredMaterialEntries = filterFinancialDataArray(
      materialEntries || [],
      member.role as Role,
      ['unit_cost', 'total_cost']
    );

    return NextResponse.json({
      diary: {
        ...diary,
        trades_on_site: filteredTrades || [],
        labour_entries: filteredLabourEntries,
        plant_entries: filteredPlantEntries,
        material_entries: filteredMaterialEntries,
        project,
        createdBy,
        approvedBy,
      },
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    // Validate UUID parameter
    const { id } = validateParams(params);

    const supabase = await createClient();
    const body = await request.json();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    assertAuthenticated(user);

    // Get user's organization and check permissions
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    assertExists(member, 'Organization membership');

    // Check if user can edit diaries
    assertPermission(diaryPermissions.canEdit(member.role as Role), 'Cannot edit diaries');

    // Check if diary exists
    const { data: existingDiary } = await supabase
      .from('daily_diaries')
      .select('organization_id')
      .eq('id', id)
      .single<{ organization_id: string }>();

    assertExists(existingDiary, 'Diary');

    if (existingDiary.organization_id !== member.organization_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Note: is_locked functionality is not implemented in the current schema
    // This check is commented out until the field is added to the database
    // if (existingDiary.is_locked) {
    //   return NextResponse.json({ error: 'Diary is locked and cannot be edited' }, { status: 403 });
    // }

    // Extract entry arrays from body
    const { labour_entries, plant_entries, material_entries, ...diaryData } = body;

    // Update diary
    const { data: diary, error } = await supabase
      .from('daily_diaries')
      .update({
        ...diaryData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating diary:', error);
      return NextResponse.json({ error: 'Failed to update diary' }, { status: 500 });
    }

    // Update labour entries
    if (labour_entries !== undefined) {
      // Delete existing entries
      await supabase.from('diary_labour_entries').delete().eq('diary_id', id);

      // Insert new entries
      if (labour_entries && labour_entries.length > 0) {
        const labourData = labour_entries.map((entry: any) => ({
          diary_id: id,
          worker_id: entry.worker_id || entry.employee_id || null,
          trade: entry.trade || '',
          company_id: entry.company_id || null,
          worker_name: entry.worker_name || '',
          company: entry.company || '',
          workers: entry.workers || 1,
          start_time: entry.start_time || null,
          end_time: entry.end_time || null,
          break_duration: entry.break_duration ? `${entry.break_duration} minutes` : null,
          total_hours: entry.total_hours || 0,
          overtime_hours: entry.overtime_hours || 0,
          standard_rate: entry.standard_rate || null,
          overtime_rate: entry.overtime_rate || null,
          total_cost: entry.total_cost || null,
          work_performed: entry.work_performed || '',
          location: entry.location || null,
          created_by: user.id,
        }));

        const { error: labourError } = await supabase
          .from('diary_labour_entries')
          .insert(labourData);

        if (labourError) {
          console.error('Error updating labour entries:', labourError);
        }
      }
    }

    // Update plant entries
    if (plant_entries !== undefined) {
      // Delete existing entries
      await supabase.from('diary_plant_entries').delete().eq('diary_id', id);

      // Insert new entries
      if (plant_entries && plant_entries.length > 0) {
        const plantData = plant_entries.map((entry: any) => ({
          diary_id: id,
          equipment_id: entry.equipment_id || null,
          equipment_name: entry.equipment_name || entry.name || '',
          name: entry.name || '',
          type: entry.type || '',
          quantity: entry.quantity || 1,
          supplier_id: entry.supplier_id || null,
          start_time: entry.start_time || null,
          end_time: entry.end_time || null,
          total_hours: entry.total_hours || entry.hours_used || null,
          hours_used: entry.hours_used || entry.total_hours || null,
          operator_id: entry.operator_id || null,
          operator_name: entry.operator_name || null,
          hourly_rate: entry.hourly_rate || null,
          fuel_cost: entry.fuel_cost || null,
          total_cost: entry.total_cost || null,
          work_performed: entry.work_performed || '',
          location: entry.location || null,
          notes: entry.notes || null,
          created_by: user.id,
        }));

        const { error: plantError } = await supabase.from('diary_plant_entries').insert(plantData);

        if (plantError) {
          console.error('Error updating plant entries:', plantError);
        }
      }
    }

    // Update material entries
    if (material_entries !== undefined) {
      // Delete existing entries
      await supabase.from('diary_material_entries').delete().eq('diary_id', id);

      // Insert new entries
      if (material_entries && material_entries.length > 0) {
        const materialData = material_entries.map((entry: any) => ({
          diary_id: id,
          material_id: entry.material_id || null,
          material_name: entry.material_name || entry.name || '',
          name: entry.name || '',
          supplier_id: entry.supplier_id || null,
          supplier: entry.supplier || '',
          quantity: entry.quantity || 0,
          unit_of_measure: entry.unit_of_measure || entry.unit || '',
          unit: entry.unit || entry.unit_of_measure || '',
          unit_cost: entry.unit_cost || null,
          total_cost: entry.total_cost || null,
          delivery_time: entry.delivery_time || null,
          delivery_location: entry.delivery_location || null,
          delivery_note: entry.delivery_note || null,
          docket_number: entry.docket_number || null,
          notes: entry.notes || null,
          created_by: user.id,
        }));

        const { error: materialError } = await supabase
          .from('diary_material_entries')
          .insert(materialData);

        if (materialError) {
          console.error('Error updating material entries:', materialError);
        }
      }
    }

    // Note: Workforce cost recalculation would happen here if the RPC function existed
    // For now, costs are calculated on the fly when needed

    return NextResponse.json({ diary });
  } catch (error) {
    return handleAPIError(error);
  }
}
