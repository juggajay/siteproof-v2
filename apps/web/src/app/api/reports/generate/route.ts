import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { client } from '@/trigger';

const generateReportSchema = z.object({
  report_type: z.enum([
    'project_summary',
    'daily_diary_export',
    'inspection_summary',
    'ncr_report',
    'financial_summary',
    'safety_report',
    'quality_report',
    'itp_report',
  ]),
  report_name: z.string(),
  description: z.string().optional(),
  format: z.enum(['pdf', 'excel', 'csv', 'json']),
  project_id: z.string().uuid(),
  date_range: z.object({
    start: z.string(),
    end: z.string(),
  }),
  include_photos: z.boolean().optional(),
  include_signatures: z.boolean().optional(),
  group_by: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate input
    const validatedData = generateReportSchema.parse(body);

    // Get user's organization
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    // Check permissions for financial reports
    if (validatedData.report_type === 'financial_summary') {
      const hasFinancialAccess = ['owner', 'admin', 'finance_manager', 'accountant'].includes(
        member.role
      );
      if (!hasFinancialAccess) {
        return NextResponse.json(
          { error: 'Insufficient permissions for financial reports' },
          { status: 403 }
        );
      }
    }

    // Enqueue the report
    const { data: reportId, error: enqueueError } = await supabase.rpc('enqueue_report', {
      p_organization_id: member.organization_id,
      p_report_type: validatedData.report_type,
      p_report_name: validatedData.report_name,
      p_description: validatedData.description,
      p_format: validatedData.format,
      p_parameters: {
        project_id: validatedData.project_id,
        date_range: validatedData.date_range,
        include_photos: validatedData.include_photos,
        include_signatures: validatedData.include_signatures,
        group_by: validatedData.group_by,
      },
      p_requested_by: user.id,
    });

    if (enqueueError || !reportId) {
      console.error('Error enqueueing report:', enqueueError);
      return NextResponse.json({ error: 'Failed to enqueue report' }, { status: 500 });
    }

    // Trigger the background job
    await client.sendEvent({
      name: 'report.generate',
      payload: {
        reportId,
        reportType: validatedData.report_type,
        format: validatedData.format,
        parameters: {
          project_id: validatedData.project_id,
          date_range: validatedData.date_range,
          include_photos: validatedData.include_photos,
          include_signatures: validatedData.include_signatures,
          group_by: validatedData.group_by,
        },
        organizationId: member.organization_id,
        requestedBy: user.id,
      },
    });

    return NextResponse.json({
      reportId,
      message: 'Report generation started',
    });
  } catch (error) {
    console.error('Error generating report:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
