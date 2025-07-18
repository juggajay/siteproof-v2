import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/reports/[id] - Download individual report
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: reportId } = params;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    // Get the report
    const { data: report, error: reportError } = await supabase
      .from('report_queue')
      .select('*')
      .eq('id', reportId)
      .eq('organization_id', member.organization_id)
      .single();

    if (reportError || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Check if report is completed
    if (report.status !== 'completed') {
      return NextResponse.json({ error: 'Report is not ready for download' }, { status: 400 });
    }

    // Check if file_url exists
    if (!report.file_url) {
      return NextResponse.json({ error: 'Report file not available' }, { status: 404 });
    }

    // For now, redirect to the file URL
    // In production, you might want to:
    // 1. Stream the file through this endpoint for security
    // 2. Generate signed URLs for temporary access
    // 3. Log download activity

    // Log the download
    console.log(`User ${user.id} downloading report ${reportId}`);

    // Return the file URL for direct download
    return NextResponse.json({
      file_url: report.file_url,
      report_name: report.report_name,
      format: report.format,
      file_size_bytes: report.file_size_bytes,
    });
  } catch (error) {
    console.error('Error downloading report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
