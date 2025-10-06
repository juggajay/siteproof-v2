// API Route for Compliance Sentinel Analysis with Supabase Integration

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ComplianceSentinel } from '@/lib/ai/agents/compliance-sentinel';
import { z } from 'zod';

// Request validation schema
const requestSchema = z.object({
  projectId: z.string(),
  additionalData: z
    .object({
      test_results: z
        .array(
          z.object({
            test_type: z.string(),
            value: z.number(),
            requirement: z.number(),
            unit: z.string(),
            date: z.string().optional(),
          })
        )
        .optional(),
      weather_conditions: z
        .object({
          current_temp: z.number().optional(),
          rainfall_7days: z.number().optional(),
          forecast_rain: z.boolean().optional(),
        })
        .optional(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Check API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI service not configured. Please set ANTHROPIC_API_KEY.',
        },
        { status: 500 }
      );
    }

    const supabase = await createClient();

    // 1. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get user's organization
    const { data: orgMember, error: orgError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (orgError || !orgMember) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // 3. Parse and validate request
    const body = await request.json();
    const validationResult = requestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request format',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { projectId, additionalData } = validationResult.data;

    // 4. Fetch project data (with org isolation)
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(
        `
        *,
        lots (
          id,
          lot_number,
          name,
          status
        ),
        itp_instances (
          id,
          template_id,
          inspection_status,
          data
        )
      `
      )
      .eq('id', projectId)
      .eq('organization_id', orgMember.organization_id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // 5. Merge additional data if provided
    const projectDataForAnalysis = {
      ...project,
      ...(additionalData?.test_results && { test_results: additionalData.test_results }),
      ...(additionalData?.weather_conditions && {
        weather_conditions: additionalData.weather_conditions,
      }),
    };

    // 6. Instantiate agent with org context
    const agent = new ComplianceSentinel(orgMember.organization_id);

    // 7. Run compliance analysis
    console.log(`[Compliance API] Starting analysis for project ${projectId}`);
    const startTime = Date.now();

    const analysis = await agent.analyzeProject(projectDataForAnalysis);

    const executionTime = Date.now() - startTime;

    // 8. Store analysis in database
    const { error: insertError } = await supabase.from('agent_analyses').insert({
      organization_id: orgMember.organization_id,
      project_id: projectId,
      agent_type: 'compliance_sentinel',
      analysis_result: analysis,
      created_by: user.id,
      created_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error('[Compliance API] Failed to store analysis:', insertError);
      // Continue - storage failure shouldn't block the response
    }

    // 9. Log high-risk results
    if (analysis.risk_level === 'HIGH' || analysis.risk_level === 'CRITICAL') {
      console.warn(`[Compliance API] HIGH RISK detected for project ${projectId}:`, {
        compliance_status: analysis.compliance_status,
        risk_level: analysis.risk_level,
        total_risk: analysis.financial_impact.total_risk,
        critical_issues: analysis.issues.filter((i) => i.severity === 'CRITICAL'),
      });

      // Optional: Create alert/notification for high-risk findings
      await supabase.from('alerts').insert({
        organization_id: orgMember.organization_id,
        type: 'compliance_risk',
        severity: analysis.risk_level,
        title: `High compliance risk detected for ${project.name}`,
        description: `Compliance analysis found ${analysis.issues.filter((i) => i.severity === 'CRITICAL').length} critical issues`,
        metadata: {
          project_id: projectId,
          analysis_id: analysis.timestamp,
        },
        created_at: new Date().toISOString(),
      });
    }

    // 10. Return analysis with metadata
    return NextResponse.json({
      success: true,
      project_id: projectId,
      analysis: analysis,
      metadata: {
        execution_time_ms: executionTime,
        api_version: '1.0.0',
        stored_in_database: !insertError,
      },
    });
  } catch (error: any) {
    console.error('[ComplianceCheck] Error:', error);

    if (error instanceof Error) {
      // Check for rate limiting
      if (error.message.includes('rate_limit')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Rate limit exceeded. Please try again later.',
          },
          { status: 429 }
        );
      }

      // Check for API key issues
      if (error.message.includes('api_key') || error.message.includes('authentication')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid API key configuration',
          },
          { status: 401 }
        );
      }

      // Check for timeout
      if (error.message.includes('Max iterations')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Analysis timeout - partial results may be available',
            partial_analysis: true,
          },
          { status: 504 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Failed to analyze project compliance',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// GET method to retrieve compliance check requirements
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const standard = searchParams.get('standard');

  const requirements = {
    AS_3798: {
      name: 'Earthworks for commercial and residential developments',
      requirements: {
        level_1: {
          compaction: '98% of Maximum Dry Density',
          testing: '1 test per 500m³ minimum',
          hold_points: ['Before next layer', 'Final level'],
        },
        level_2: {
          compaction: '95% of Maximum Dry Density',
          testing: '1 test per 1000m³ minimum',
          hold_points: ['Final level'],
        },
        level_3: {
          compaction: '95% of Maximum Dry Density',
          testing: '1 test per 2000m³ minimum',
          hold_points: ['As required'],
        },
      },
    },
    AS_NZS_3500_3: {
      name: 'Plumbing and drainage - Stormwater',
      requirements: {
        gradients: {
          minimum: '1.0% (1:100)',
          recommended: '1.65% (1:60)',
        },
        cover: {
          minimum: '300mm under traffic',
          standard: '450mm recommended',
        },
      },
    },
    AS_2870: {
      name: 'Residential slabs and footings',
      requirements: {
        site_classes: ['A', 'S', 'M', 'H1', 'H2', 'E', 'P'],
        edge_beams: {
          minimum_depth: '300mm',
          minimum_width: '300mm',
        },
      },
    },
  };

  if (standard && standard in requirements) {
    return NextResponse.json({
      standard,
      ...requirements[standard as keyof typeof requirements],
    });
  }

  return NextResponse.json({
    available_standards: Object.keys(requirements),
    requirements,
  });
}

// OPTIONS method for CORS
export async function OPTIONS(_request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
