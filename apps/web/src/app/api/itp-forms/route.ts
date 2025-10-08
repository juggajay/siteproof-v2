import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { type FormSpecificData, type ITPFormRow, type OrganizationMember } from '@/types/itp';

const baseFormSchema = z.object({
  formType: z.string(),
  projectId: z.string(),
  inspectorName: z.string(),
  inspectionDate: z.string().transform((str) => new Date(str)),
  inspectionStatus: z.enum(['pending', 'approved', 'rejected']),
  comments: z.string().optional(),
  evidenceFiles: z.array(z.any()).optional(),
  localId: z.string().optional(),
});

/**
 * Insert form-specific data based on form type
 */
async function insertFormSpecificData(
  supabase: SupabaseClient,
  formData: FormSpecificData,
  formId: string
): Promise<void> {
  switch (formData.formType) {
    case 'earthworks_preconstruction': {
      const { error } = await supabase.from('itp_earthworks_preconstruction').insert({
        form_id: formId,
        approved_plans_available: formData.data.approvedPlansAvailable,
        start_date_advised: formData.data.startDateAdvised,
        erosion_control_implemented: formData.data.erosionControlImplemented,
        erosion_control_photo: formData.data.erosionControlPhoto,
        hold_point_signature: formData.data.holdPointSignature,
        hold_point_date: formData.data.holdPointDate,
      });
      if (error) throw error;
      break;
    }

    case 'earthworks_subgrade': {
      const { error } = await supabase.from('itp_earthworks_subgrade').insert({
        form_id: formId,
        erosion_controls_in_place: formData.data.erosionControlsInPlace,
        groundwater_control_measures: formData.data.groundwaterControlMeasures,
        compaction_percentage: formData.data.compactionPercentage,
        surface_tolerances_met: formData.data.surfaceTolerancesMet,
        surface_measurements: formData.data.surfaceMeasurements,
        proof_rolling_completed: formData.data.proofRollingCompleted,
        proof_rolling_photo: formData.data.proofRollingPhoto,
        nata_certificates: formData.data.nataCertificates,
      });
      if (error) throw error;
      break;
    }

    case 'concrete_formwork':
    case 'concrete_reinforcement':
    case 'concrete_placement':
    case 'structural_steel':
    case 'masonry':
    case 'roofing':
    case 'plumbing_roughin':
    case 'plumbing_final':
    case 'electrical_roughin':
    case 'electrical_final':
    case 'hvac_roughin':
    case 'hvac_final': {
      // These form types don't have specific tables yet
      // Data is stored in the base itp_forms table
      console.log(`Form type ${formData.formType} does not have a specific table yet`);
      break;
    }

    default: {
      // Exhaustiveness check - TypeScript will error if we miss a case
      const _exhaustiveCheck: never = formData;
      throw new Error(`Unhandled form type: ${(_exhaustiveCheck as FormSpecificData).formType}`);
    }
  }
}

/**
 * POST /api/itp-forms
 *
 * Create a new ITP form submission
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
    const validationResult = baseFormSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const formData = validationResult.data;

    // Get user's organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'User not part of any organization' }, { status: 403 });
    }

    const typedMembership = membership as OrganizationMember;

    // Insert base form
    const { data: baseForm, error: baseFormError } = await supabase
      .from('itp_forms')
      .insert({
        form_type: formData.formType,
        project_id: formData.projectId,
        inspector_name: formData.inspectorName,
        inspection_date: formData.inspectionDate,
        inspection_status: formData.inspectionStatus,
        comments: formData.comments,
        evidence_files: formData.evidenceFiles || [],
        local_id: formData.localId,
        organization_id: typedMembership.organization_id,
        created_by: user.id,
        sync_status: 'synced',
      })
      .select()
      .single();

    if (baseFormError) {
      throw baseFormError;
    }

    const typedForm = baseForm as ITPFormRow;

    // Insert form-specific data based on type
    const formSpecificData: FormSpecificData = {
      formType: body.formType,
      data: body,
    };

    await insertFormSpecificData(supabase, formSpecificData, typedForm.id);

    return NextResponse.json({
      message: 'Form submitted successfully',
      form: typedForm,
    });
  } catch (error) {
    console.error('Error creating ITP form:', error);
    return NextResponse.json({ error: 'Failed to create form' }, { status: 500 });
  }
}

/**
 * GET /api/itp-forms
 *
 * Retrieve ITP forms with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const formType = searchParams.get('formType');
    const syncStatus = searchParams.get('syncStatus');

    // Get user's organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'User not part of any organization' }, { status: 403 });
    }

    const typedMembership = membership as OrganizationMember;

    // Build query
    let query = supabase
      .from('itp_forms')
      .select('*')
      .eq('organization_id', typedMembership.organization_id)
      .order('created_at', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    if (formType) {
      query = query.eq('form_type', formType);
    }

    if (syncStatus) {
      query = query.eq('sync_status', syncStatus);
    }

    const { data: forms, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ forms: (forms || []) as ITPFormRow[] });
  } catch (error) {
    console.error('Error fetching ITP forms:', error);
    return NextResponse.json({ error: 'Failed to fetch forms' }, { status: 500 });
  }
}
