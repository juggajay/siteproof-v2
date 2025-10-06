// API Route for Claude with Tool-based Queries

import { NextRequest, NextResponse } from 'next/server';
import { toolCoordinator } from '@/lib/ai/services/tool-coordinator';
import { z } from 'zod';

// Request validation schema
const requestSchema = z.object({
  query: z.string().min(1).max(2000),
  context: z
    .object({
      projectId: z.string().optional(),
      userId: z.string().optional(),
      sessionId: z.string().optional(),
      metadata: z.record(z.any()).optional(),
    })
    .optional(),
  includeTools: z.boolean().optional(),
  systemPrompt: z.string().optional(),
});

// Response type
interface QueryResponse {
  success: boolean;
  answer: string;
  toolsUsed?: Array<{
    name: string;
    success: boolean;
    executionTime: number;
  }>;
  recommendations?: string[];
  warnings?: string[];
  confidence?: number;
  usage?: {
    totalToolCalls: number;
    successfulCalls: number;
    averageExecutionTime: number;
  };
  error?: string;
}

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

    // Parse and validate request
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

    const { query, context, systemPrompt } = validationResult.data;

    // Create session ID if not provided
    const sessionId = context?.sessionId || `session-${Date.now()}`;

    // Process query with tools
    const result = await toolCoordinator.processQuery(
      query,
      {
        ...context,
        sessionId,
      },
      systemPrompt
    );

    // Get usage statistics
    const stats = toolCoordinator.getToolUsageStats();

    // Format response
    const response: QueryResponse = {
      success: true,
      answer: result.answer,
      toolsUsed: result.toolsUsed.map((tool) => ({
        name: tool.toolName,
        success: tool.success,
        executionTime: tool.executionTime,
      })),
      recommendations: result.recommendations,
      warnings: result.warnings,
      confidence: result.confidence,
      usage: {
        totalToolCalls: stats.totalCalls,
        successfulCalls: stats.successfulCalls,
        averageExecutionTime: stats.averageExecutionTime,
      },
    };

    // Clear history for next query (optional - could maintain session)
    toolCoordinator.clearHistory();

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error processing AI query:', error);

    // Handle specific error types
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

      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

// GET method to retrieve available tools
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const includeExamples = searchParams.get('examples') === 'true';

  const tools = [
    {
      name: 'get_australian_standard',
      description: 'Retrieve Australian Standard requirements',
      parameters: ['standard_code', 'section (optional)'],
    },
    {
      name: 'check_compaction_compliance',
      description: 'Check earthworks compaction test results against AS 3798',
      parameters: ['dry_density', 'max_dry_density', 'required_percentage', 'supervision_level'],
    },
    {
      name: 'check_weather_restrictions',
      description: 'Check weather restrictions with temperature and rainfall analysis',
      parameters: [
        'work_type',
        'material (optional)',
        'temperature (optional)',
        'rainfall_forecast (optional)',
      ],
    },
    {
      name: 'get_council_approval_timeline',
      description: 'Get council approval timeframes with risk assessment',
      parameters: ['council_name'],
    },
    {
      name: 'verify_compliance',
      description: 'Verify compliance with standards',
      parameters: ['inspection_type', 'measurements', 'material'],
    },
    {
      name: 'make_weather_decision',
      description: 'Make go/no-go decision based on weather',
      parameters: ['work_type', 'current_conditions', 'temperature'],
    },
    {
      name: 'predict_project_timeline',
      description: 'Predict project timeline with approvals',
      parameters: ['council', 'project_complexity', 'construction_phases'],
    },
    {
      name: 'calculate_test_frequency',
      description: 'Calculate required test frequency',
      parameters: ['supervision_level', 'fill_volume', 'material_type'],
    },
    {
      name: 'get_curing_requirements',
      description: 'Get concrete curing requirements',
      parameters: ['temperature', 'concrete_type', 'exposure_condition'],
    },
  ];

  const response: any = {
    tools,
    totalTools: tools.length,
  };

  if (includeExamples) {
    response.examples = [
      {
        query: 'What are the compaction requirements for clay under AS 3798?',
        expectedTools: ['get_australian_standard'],
      },
      {
        query: 'Can we pour concrete today if the temperature is 38°C?',
        expectedTools: ['check_weather_restrictions', 'make_weather_decision'],
      },
      {
        query: 'Can we place clay fill with rain forecast tomorrow?',
        expectedTools: ['check_weather_restrictions'],
      },
      {
        query: 'How long will Georges River council take to approve our project?',
        expectedTools: ['get_council_approval_timeline', 'predict_project_timeline'],
      },
      {
        query: 'Check if 95% proctor meets requirements for high-risk earthworks',
        expectedTools: ['get_australian_standard', 'verify_compliance'],
      },
      {
        query: 'How many tests needed for 5000m³ of fill?',
        expectedTools: ['calculate_test_frequency'],
      },
      {
        query: 'Check if 19.8 kN/m³ dry density meets 98% proctor requirement with 20.2 kN/m³ MDD',
        expectedTools: ['check_compaction_compliance'],
      },
    ];
  }

  return NextResponse.json(response);
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
