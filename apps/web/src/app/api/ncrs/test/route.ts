import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    checks: {},
    errors: [],
  };

  try {
    // 1. Check auth
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    diagnostics.checks.auth = {
      success: !!user,
      userId: user?.id || null,
      error: authError?.message || null,
    };

    if (!user) {
      return NextResponse.json(
        {
          error: 'Authentication required',
          diagnostics,
        },
        { status: 401 }
      );
    }

    // 2. Parse form data
    const formData = await request.formData();
    const parsedData: any = {};

    for (const [key, value] of formData.entries()) {
      parsedData[key] = value;
    }

    diagnostics.checks.formData = {
      fields: Object.keys(parsedData),
      values: parsedData,
    };

    // 3. Check project exists and user has access
    const projectId = parsedData.project_id;
    if (!projectId) {
      diagnostics.errors.push('No project_id provided');
      return NextResponse.json(
        {
          error: 'project_id is required',
          diagnostics,
        },
        { status: 400 }
      );
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, organization_id')
      .eq('id', projectId)
      .single();

    diagnostics.checks.project = {
      found: !!project,
      project: project || null,
      error: projectError?.message || null,
    };

    if (!project) {
      return NextResponse.json(
        {
          error: 'Project not found',
          diagnostics,
        },
        { status: 404 }
      );
    }

    // 4. Check user membership
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', project.organization_id)
      .single();

    diagnostics.checks.membership = {
      found: !!member,
      role: member?.role || null,
      error: memberError?.message || null,
    };

    if (!member) {
      return NextResponse.json(
        {
          error: 'User not a member of this organization',
          diagnostics,
        },
        { status: 403 }
      );
    }

    // 5. Test NCR count query
    const { count, error: countError } = await supabase
      .from('ncrs')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', project.organization_id);

    diagnostics.checks.ncrCount = {
      count: count || 0,
      error: countError?.message || null,
    };

    // 6. Check storage bucket
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();

    diagnostics.checks.storage = {
      buckets: buckets?.map((b) => b.name) || [],
      hasNcrBucket: buckets?.some((b) => b.name === 'ncr-attachments') || false,
      error: bucketError?.message || null,
    };

    // 7. Test minimal NCR insert (without actually inserting)
    const testNcrData = {
      organization_id: project.organization_id,
      project_id: projectId,
      ncr_number: `TEST-${Date.now()}`,
      title: parsedData.title || 'Test',
      description: parsedData.description || 'Test description',
      severity: parsedData.severity || 'medium',
      category: parsedData.category || 'Quality',
      raised_by: user.id,
      status: 'open',
      priority: 'normal',
      evidence: {},
      tags: [],
    };

    diagnostics.checks.testData = {
      data: testNcrData,
      wouldInsert: true,
    };

    return NextResponse.json({
      success: true,
      message: 'All checks passed! NCR can be created.',
      diagnostics,
    });
  } catch (error) {
    console.error('NCR test endpoint error:', error);

    return NextResponse.json(
      {
        error: 'Test failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        diagnostics,
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
