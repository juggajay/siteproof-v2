import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const baseFormSchema = z.object({
  formType: z.string(),
  projectId: z.string(),
  inspectorName: z.string(),
  inspectionDate: z.string().transform(str => new Date(str)),
  inspectionStatus: z.enum(['pending', 'approved', 'rejected']),
  comments: z.string().optional(),
  evidenceFiles: z.array(z.any()).optional(),
  localId: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

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
        organization_id: membership.organization_id,
        created_by: user.id,
        sync_status: 'synced'
      })
      .select()
      .single();

    if (baseFormError) {
      throw baseFormError;
    }

    // Insert form-specific data based on type
    await insertFormSpecificData(supabase, body, baseForm.id);

    return NextResponse.json({
      message: 'Form submitted successfully',
      form: baseForm
    });
  } catch (error) {
    console.error('Error creating ITP form:', error);
    return NextResponse.json({ error: 'Failed to create form' }, { status: 500 });
  }
}

async function insertFormSpecificData(supabase: any, formData: any, formId: string) {
  switch (formData.formType) {
    case 'earthworks_preconstruction': {
      const { error } = await supabase
        .from('itp_earthworks_preconstruction')
        .insert({
          form_id: formId,
          approved_plans_available: formData.approvedPlansAvailable,
          start_date_advised: formData.startDateAdvised,
          erosion_control_implemented: formData.erosionControlImplemented,
          erosion_control_photo: formData.erosionControlPhoto,
          hold_point_signature: formData.holdPointSignature,
          hold_point_date: formData.holdPointDate
        });
      if (error) throw error;
      break;
    }
    case 'earthworks_subgrade': {
      const { error } = await supabase
        .from('itp_earthworks_subgrade')
        .insert({
          form_id: formId,
          erosion_controls_in_place: formData.erosionControlsInPlace,
          groundwater_control_measures: formData.groundwaterControlMeasures,
          compaction_percentage: formData.compactionPercentage,
          surface_tolerances_met: formData.surfaceTolerancesMet,
          surface_measurements: formData.surfaceMeasurements,
          proof_rolling_completed: formData.proofRollingCompleted,
          proof_rolling_photo: formData.proofRollingPhoto,
          nata_certificates: formData.nataCertificates
        });
      if (error) throw error;
      break;
    }
    // Add other form types as needed
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

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

    // Build query
    let query = supabase
      .from('itp_forms')
      .select('*')
      .eq('organization_id', membership.organization_id)
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

    return NextResponse.json({ forms: forms || [] });
  } catch (error) {
    console.error('Error fetching ITP forms:', error);
    return NextResponse.json({ error: 'Failed to fetch forms' }, { status: 500 });
  }
}