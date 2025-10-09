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

    // Determine if report can be generated synchronously
    const isSimpleReport = ['project_summary', 'daily_diary_export', 'inspection_summary', 'financial_summary'].includes(
      validatedData.report_type
    );

    // Check if Trigger.dev is properly configured for complex reports
    const hasTriggerConfig =
      process.env.TRIGGER_API_KEY &&
      process.env.TRIGGER_API_KEY !== 'test-trigger-key' &&
      process.env.TRIGGER_API_URL;

    // For simple reports, mark as completed immediately (will generate on download)
    // For complex reports, only queue if Trigger is available
    const initialStatus = isSimpleReport ? 'completed' : hasTriggerConfig ? 'queued' : 'failed';
    const initialError =
      !isSimpleReport && !hasTriggerConfig
        ? 'Complex report processing not available - please contact support'
        : null;

    const { data: report, error: insertError } = await supabase
      .from('report_queue')
      .insert({
        organization_id: member.organization_id,
        report_type: validatedData.report_type,
        report_name: validatedData.report_name,
        description: validatedData.description,
        format: validatedData.format,
        parameters: {
          project_id: validatedData.project_id,
          date_range: validatedData.date_range,
          include_photos: validatedData.include_photos,
          include_signatures: validatedData.include_signatures,
          group_by: validatedData.group_by,
        },
        requested_by: user.id,
        status: initialStatus,
        progress: initialStatus === 'completed' ? 100 : 0,
        error_message: initialError,
        requested_at: new Date().toISOString(),
        completed_at: initialStatus === 'completed' ? new Date().toISOString() : null,
        // Mark simple reports as ready for on-demand generation
        file_url: isSimpleReport ? 'on-demand' : null,
      })
      .select()
      .single();

    if (insertError || !report) {
      console.error('Error creating report:', insertError);
      return NextResponse.json({ error: 'Failed to create report' }, { status: 500 });
    }

    // Only try to trigger background job for complex reports that need it
    if (!isSimpleReport && hasTriggerConfig) {
      try {
        await client.sendEvent({
          name: 'report.generate',
          payload: {
            reportId: report.id,
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
      } catch (triggerError) {
        console.error('Trigger.dev failed:', triggerError);
        // Update report to failed status
        await supabase
          .from('report_queue')
          .update({
            status: 'failed',
            error_message: 'Failed to submit to background processing',
            completed_at: new Date().toISOString(),
          })
          .eq('id', report.id);
      }
    }

    // Log report creation type
    console.log(
      `Report created: ${report.id} - Type: ${validatedData.report_type} - Status: ${initialStatus} - Generation: ${isSimpleReport ? 'on-demand' : 'background'}`
    );

    return NextResponse.json({
      reportId: report.id,
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
