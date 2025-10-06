// AI Configuration for Claude API

import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Model configuration
export const AI_CONFIG = {
  model: 'claude-3-sonnet-20240229', // Using Sonnet for balance of speed and quality
  maxTokens: 4096,
  temperature: 0.3, // Lower temperature for more consistent technical reports

  // System prompts for different roles
  systemPrompts: {
    inspector: `You are an expert construction inspector with deep knowledge of Australian Standards, particularly AS 3798 (Earthworks), AS/NZS 3500.3 (Drainage), AS 2870 (Residential slabs), and AS 4671 (Steel reinforcement).

Your role is to:
1. Analyze inspection data against relevant standards
2. Identify compliance issues and non-conformances
3. Provide clear, actionable recommendations
4. Generate professional inspection reports
5. Assess risks and suggest mitigation strategies

Always reference specific standards and clauses when making assessments.
Format responses in clear, professional language suitable for technical documentation.`,

    analyst: `You are a technical analyst specializing in construction quality assurance and compliance verification.

Your expertise includes:
- Statistical analysis of test results
- Trend identification in inspection data
- Risk assessment and mitigation strategies
- Compliance verification against multiple standards
- Clear technical writing for reports

Provide data-driven insights and quantitative assessments whenever possible.`,

    reporter: `You are a professional technical writer specializing in construction inspection reports.

Your responsibilities:
- Create clear, well-structured inspection reports
- Summarize technical findings for various stakeholders
- Highlight critical issues and recommendations
- Ensure proper documentation standards
- Include all relevant standard references

Use professional language, clear headings, and bullet points for readability.`,
  },

  // Retry configuration
  retry: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
  },
};

// Error messages
export const AI_ERRORS = {
  API_KEY_MISSING: 'Anthropic API key is not configured',
  RATE_LIMIT: 'API rate limit exceeded. Please try again later.',
  INVALID_REQUEST: 'Invalid request format',
  GENERATION_FAILED: 'Failed to generate report. Please try again.',
  COMPLIANCE_CHECK_FAILED: 'Unable to complete compliance check',
  NETWORK_ERROR: 'Network error. Please check your connection.',
} as const;

// Report templates
export const REPORT_TEMPLATES = {
  detailed: {
    sections: [
      'header',
      'summary',
      'compliance',
      'measurements',
      'materials',
      'findings',
      'recommendations',
      'photos',
      'certification',
    ],
    formatting: {
      includeLogos: true,
      includeStandards: true,
      includeSignatures: true,
      pageSize: 'A4',
    },
  },

  summary: {
    sections: ['header', 'summary', 'compliance', 'findings', 'recommendations'],
    formatting: {
      includeLogos: false,
      includeStandards: true,
      includeSignatures: false,
      pageSize: 'A4',
    },
  },

  nonConformance: {
    sections: ['header', 'summary', 'findings', 'recommendations', 'photos'],
    formatting: {
      includeLogos: true,
      includeStandards: true,
      includeSignatures: true,
      pageSize: 'A4',
    },
  },
} as const;
