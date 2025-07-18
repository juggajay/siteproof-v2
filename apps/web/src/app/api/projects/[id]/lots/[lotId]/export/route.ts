import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { client } from '@/trigger';

// GET /api/projects/[id]/lots/[lotId]/export - Generate ITP report for lot
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string; lotId: string } }
) {
  try {
    const { id: projectId, lotId } = params;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get lot with project and organization info
    const { data: lot, error: lotError } = await supabase
      .from('lots')
      .select(
        `
        *,
        project:projects!inner(
          id,
          name,
          organization_id,
          organization:organizations(
            id,
            name
          )
        ),
        itp_instances(
          id,
          template_id,
          inspection_status,
          inspection_date,
          data,
          evidence_files,
          created_at,
          updated_at,
          itp_templates(
            id,
            name,
            description,
            structure
          )
        )
      `
      )
      .eq('id', lotId)
      .eq('project_id', projectId)
      .single();

    if (lotError || !lot) {
      return NextResponse.json({ error: 'Lot not found' }, { status: 404 });
    }

    // Check user has access to organization
    const orgId = lot.project?.organization_id;
    if (!orgId) {
      return NextResponse.json({ error: 'Invalid project configuration' }, { status: 500 });
    }

    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', orgId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if there are any completed ITPs to export
    const completedItps =
      lot.itp_instances?.filter((itp: any) => itp.inspection_status === 'completed') || [];

    if (completedItps.length === 0) {
      return NextResponse.json(
        {
          error: 'No completed ITPs found',
          message: 'Complete at least one ITP before generating a report',
        },
        { status: 400 }
      );
    }

    // Generate report name
    const reportName = `ITP Report - Lot ${lot.lot_number} - ${lot.project?.name}`;
    const description = `Inspection Test Plan report for Lot ${lot.lot_number} containing ${completedItps.length} completed inspection(s)`;

    // Enqueue the report using existing system
    const { data: reportId, error: enqueueError } = await supabase.rpc('enqueue_report', {
      p_organization_id: orgId,
      p_report_type: 'itp_report',
      p_report_name: reportName,
      p_description: description,
      p_format: 'pdf', // ITP reports should be PDFs for professional appearance
      p_parameters: {
        project_id: projectId,
        lot_id: lotId,
        lot_number: lot.lot_number,
        project_name: lot.project?.name,
        organization_name: lot.project?.organization?.name,
        include_photos: true,
        include_signatures: true,
        itp_instances: completedItps.map((itp: any) => ({
          id: itp.id,
          template_name: itp.itp_templates?.name,
          inspection_status: itp.inspection_status,
          inspection_date: itp.inspection_date,
          data: itp.data,
          evidence_files: itp.evidence_files,
        })),
      },
      p_requested_by: user.id,
    });

    if (enqueueError || !reportId) {
      console.error('Error enqueueing ITP report:', enqueueError);
      return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
    }

    // Trigger the background job
    await client.sendEvent({
      name: 'report.generate',
      payload: {
        reportId,
        reportType: 'itp_report',
        format: 'pdf',
        parameters: {
          project_id: projectId,
          lot_id: lotId,
          lot_number: lot.lot_number,
          project_name: lot.project?.name,
          organization_name: lot.project?.organization?.name,
          include_photos: true,
          include_signatures: true,
          itp_instances: completedItps.map((itp: any) => ({
            id: itp.id,
            template_name: itp.itp_templates?.name,
            inspection_status: itp.inspection_status,
            inspection_date: itp.inspection_date,
            data: itp.data,
            evidence_files: itp.evidence_files,
          })),
        },
        organizationId: orgId,
        requestedBy: user.id,
      },
    });

    // Return success response with report ID
    return NextResponse.json({
      reportId,
      message: 'ITP report generation started',
      reportName,
      completedItps: completedItps.length,
      estimatedTime: '2-5 minutes',
    });
  } catch (error) {
    console.error('Error generating ITP report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
