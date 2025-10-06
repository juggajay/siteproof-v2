// API Route for AI-powered ITP Report Generation

import { NextRequest, NextResponse } from 'next/server';
import { itpGenerator } from '@/lib/ai/services/itp-generator';
import { complianceChecker } from '@/lib/ai/services/compliance-checker';
import type { ITPReportRequest } from '@/lib/ai/types';
import { z } from 'zod';

// Request validation schema
const requestSchema = z.object({
  inspection: z.object({
    id: z.string(),
    projectId: z.string(),
    date: z.string().or(z.date()),
    type: z.enum(['earthworks', 'drainage', 'concrete', 'reinforcement', 'general']),
    location: z.string(),
    weather: z.object({
      conditions: z.enum(['sunny', 'cloudy', 'rainy', 'wet']),
      temperature: z.number(),
      recentRainfall: z
        .object({
          amount: z.number(),
          daysAgo: z.number(),
        })
        .optional(),
    }),
    measurements: z
      .object({
        compaction: z
          .object({
            density: z.number().min(0).max(100),
            moisture: z.number().min(0).max(100),
            proctor: z.number().min(0).max(100),
          })
          .optional(),
        dimensions: z
          .object({
            depth: z.number().optional(),
            width: z.number().optional(),
            length: z.number().optional(),
            thickness: z.number().optional(),
          })
          .optional(),
        gradient: z.number().optional(),
      })
      .optional(),
    materials: z
      .object({
        type: z.enum(['clay', 'sand', 'rock', 'concrete', 'steel', 'mixed']),
        supplier: z.string().optional(),
        batch: z.string().optional(),
      })
      .optional(),
    images: z.array(z.string()).optional(),
    notes: z.string().optional(),
    nonConformances: z
      .array(
        z.object({
          description: z.string(),
          severity: z.enum(['critical', 'major', 'minor']),
          standardReference: z.string().optional(),
        })
      )
      .optional(),
  }),
  standards: z.array(z.string()),
  reportType: z.enum(['detailed', 'summary', 'non-conformance']),
  includeRecommendations: z.boolean().optional(),
  includePhotos: z.boolean().optional(),
  customPrompt: z.string().optional(),
  context: z
    .object({
      projectHistory: z
        .array(
          z.object({
            date: z.date().or(z.string()),
            type: z.string(),
            result: z.enum(['pass', 'fail', 'partial']),
            issues: z.array(z.string()).optional(),
          })
        )
        .optional(),
      siteClassification: z.string().optional(),
      weatherHistory: z
        .array(
          z.object({
            date: z.date().or(z.string()),
            rainfall: z.number(),
            temperature: z.number(),
          })
        )
        .optional(),
      previousNonConformances: z
        .array(
          z.object({
            date: z.date().or(z.string()),
            description: z.string(),
            resolved: z.boolean(),
          })
        )
        .optional(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Check API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'AI service not configured. Please set ANTHROPIC_API_KEY.' },
        { status: 500 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = requestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request format',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { inspection, standards, reportType, context, ...options } = validationResult.data;

    // Ensure date is a Date object
    if (typeof inspection.date === 'string') {
      inspection.date = new Date(inspection.date);
    }

    // Create the report request
    const reportRequest: ITPReportRequest = {
      inspection,
      standards,
      reportType,
      ...options,
    };

    // First, run local compliance checks for immediate feedback
    const localComplianceResults = complianceChecker.checkCompliance(inspection, standards);

    // Generate the AI-powered report
    const report = await itpGenerator.generateReport(reportRequest, context);

    // Merge local compliance checks with AI analysis
    if (localComplianceResults.length > 0) {
      report.compliance = [
        ...localComplianceResults,
        ...report.compliance.filter(
          (aiResult) =>
            !localComplianceResults.some(
              (localResult) => localResult.standard === aiResult.standard
            )
        ),
      ];
    }

    // Add response headers for caching
    const response = NextResponse.json(report);
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');

    return response;
  } catch (error) {
    console.error('Error generating ITP report:', error);

    // Handle specific error types
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      // Check for rate limiting
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }

      // Check for API key issues
      if (error.message.includes('API key')) {
        return NextResponse.json({ error: 'Invalid API key configuration' }, { status: 401 });
      }

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

// OPTIONS method for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
