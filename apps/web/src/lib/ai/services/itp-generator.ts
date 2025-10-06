// ITP Report Generator Service using Claude AI

import { anthropic, AI_CONFIG, AI_ERRORS } from '../config';
import type {
  InspectionData,
  ITPReportRequest,
  ITPReportResponse,
  AIAnalysisContext,
} from '../types';
import { australianStandards, getStandard } from '../knowledge-base/australian-standards';
import { format } from 'date-fns';

export class ITPReportGenerator {
  /**
   * Generate a complete ITP report based on inspection data
   */
  async generateReport(
    request: ITPReportRequest,
    context?: AIAnalysisContext
  ): Promise<ITPReportResponse> {
    try {
      // Validate API key
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error(AI_ERRORS.API_KEY_MISSING);
      }

      // Prepare the context with standards information
      const standardsContext = this.prepareStandardsContext(request.standards);

      // Perform compliance checks
      const complianceResults = await this.checkCompliance(request.inspection, request.standards);

      // Generate detailed analysis
      const analysis = await this.generateAnalysis(request.inspection, complianceResults, context);

      // Generate recommendations
      const recommendations = await this.generateRecommendations(
        request.inspection,
        complianceResults,
        analysis
      );

      // Generate the full report markdown
      const reportMarkdown = await this.generateReportMarkdown(
        request,
        complianceResults,
        analysis,
        recommendations
      );

      // Prepare the response
      const response: ITPReportResponse = {
        id: `itp-${Date.now()}`,
        generatedAt: new Date(),
        inspection: request.inspection,
        compliance: complianceResults,
        summary: analysis.overview,
        detailedAnalysis: analysis,
        recommendations,
        nextActions: this.extractNextActions(recommendations, complianceResults),
        reportMarkdown,
      };

      return response;
    } catch (error) {
      console.error('Error generating ITP report:', error);
      throw error;
    }
  }

  /**
   * Prepare standards context for the AI
   */
  private prepareStandardsContext(standards: string[]): string {
    return standards
      .map((standardCode) => {
        const standard = getStandard(standardCode);
        if ('error' in standard) {
          return `Standard ${standardCode} not found`;
        }
        return (
          `**${standardCode}: ${standard.name} (${standard.version})**\n` +
          JSON.stringify(standard, null, 2)
        );
      })
      .join('\n\n');
  }

  /**
   * Check compliance against specified standards
   */
  private async checkCompliance(inspection: InspectionData, standards: string[]) {
    const prompt = `
You are analyzing an inspection against Australian Standards.

Inspection Data:
${JSON.stringify(inspection, null, 2)}

Relevant Standards:
${this.prepareStandardsContext(standards)}

For each applicable standard, assess compliance and provide:
1. Whether the inspection meets requirements (compliant: true/false)
2. Specific requirements checked with actual vs required values
3. Any hold points that need approval
4. Recommendations for non-compliance

Format your response as a JSON array of compliance results.
`;

    try {
      const response = await anthropic.messages.create({
        model: AI_CONFIG.model,
        max_tokens: AI_CONFIG.maxTokens,
        temperature: AI_CONFIG.temperature,
        system: AI_CONFIG.systemPrompts.inspector,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        // Parse the JSON response
        const jsonMatch = content.text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
      return [];
    } catch (error) {
      console.error('Compliance check failed:', error);
      throw new Error(AI_ERRORS.COMPLIANCE_CHECK_FAILED);
    }
  }

  /**
   * Generate detailed analysis of the inspection
   */
  private async generateAnalysis(
    inspection: InspectionData,
    complianceResults: any[],
    context?: AIAnalysisContext
  ) {
    const prompt = `
Analyze this inspection data and compliance results to provide a detailed technical assessment.

Inspection Data:
${JSON.stringify(inspection, null, 2)}

Compliance Results:
${JSON.stringify(complianceResults, null, 2)}

${
  context
    ? `Historical Context:
${JSON.stringify(context, null, 2)}`
    : ''
}

Provide:
1. Overview summary (2-3 sentences)
2. Key findings (bullet points)
3. Risk assessment with severity levels and mitigation strategies

Consider:
- Weather impacts (especially recent rainfall for earthworks)
- Material suitability
- Testing frequency requirements
- Critical hold points
- Safety concerns

Format as JSON with structure: {overview: string, findings: string[], risks: [{description, severity, mitigation}]}
`;

    try {
      const response = await anthropic.messages.create({
        model: AI_CONFIG.model,
        max_tokens: AI_CONFIG.maxTokens,
        temperature: AI_CONFIG.temperature,
        system: AI_CONFIG.systemPrompts.analyst,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }

      // Fallback structure
      return {
        overview: 'Analysis could not be completed',
        findings: [],
        risks: [],
      };
    } catch (error) {
      console.error('Analysis generation failed:', error);
      throw new Error(AI_ERRORS.GENERATION_FAILED);
    }
  }

  /**
   * Generate recommendations based on analysis
   */
  private async generateRecommendations(
    inspection: InspectionData,
    complianceResults: any[],
    analysis: any
  ): Promise<string[]> {
    const prompt = `
Based on this inspection analysis, provide specific, actionable recommendations.

Inspection Type: ${inspection.type}
Location: ${inspection.location}

Key Issues:
${analysis.findings.join('\n')}

Non-Compliances:
${complianceResults
  .filter((r) => !r.compliant)
  .map((r) => r.standard)
  .join(', ')}

Provide 3-5 specific recommendations that:
1. Address immediate safety or compliance issues
2. Prevent future problems
3. Improve quality outcomes
4. Are practical and implementable

Format as a JSON array of strings.
`;

    try {
      const response = await anthropic.messages.create({
        model: AI_CONFIG.model,
        max_tokens: 1000,
        temperature: AI_CONFIG.temperature,
        system: AI_CONFIG.systemPrompts.inspector,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        const jsonMatch = content.text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
      return ['Unable to generate recommendations'];
    } catch (error) {
      console.error('Recommendations generation failed:', error);
      return ['Error generating recommendations'];
    }
  }

  /**
   * Generate the complete report in Markdown format
   */
  private async generateReportMarkdown(
    request: ITPReportRequest,
    complianceResults: any[],
    analysis: any,
    recommendations: string[]
  ): Promise<string> {
    const inspection = request.inspection;
    const date = format(new Date(inspection.date), 'dd/MM/yyyy');

    const prompt = `
Generate a professional ITP inspection report in Markdown format.

Report Type: ${request.reportType}
Include the following sections based on the data provided:

INSPECTION DETAILS:
- Date: ${date}
- Type: ${inspection.type}
- Location: ${inspection.location}
- Weather: ${JSON.stringify(inspection.weather)}

MEASUREMENTS:
${JSON.stringify(inspection.measurements, null, 2)}

COMPLIANCE STATUS:
${complianceResults.map((r) => `- ${r.standard}: ${r.compliant ? 'COMPLIANT' : 'NON-COMPLIANT'}`).join('\n')}

ANALYSIS:
${analysis.overview}

KEY FINDINGS:
${analysis.findings.join('\n')}

RECOMMENDATIONS:
${recommendations.join('\n')}

Create a well-formatted, professional report with:
- Clear headings and subheadings
- Tables for measurements and test results
- Highlighted non-conformances
- Professional language suitable for regulatory submission
- Proper markdown formatting

The report should be ready for conversion to PDF.
`;

    try {
      const response = await anthropic.messages.create({
        model: AI_CONFIG.model,
        max_tokens: AI_CONFIG.maxTokens,
        temperature: 0.2, // Lower temperature for consistent formatting
        system: AI_CONFIG.systemPrompts.reporter,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        return content.text;
      }
      return '# Report Generation Failed\n\nUnable to generate report content.';
    } catch (error) {
      console.error('Report markdown generation failed:', error);
      throw new Error(AI_ERRORS.GENERATION_FAILED);
    }
  }

  /**
   * Extract next actions from recommendations and compliance results
   */
  private extractNextActions(recommendations: string[], complianceResults: any[]): string[] {
    const actions: string[] = [];

    // Add actions for non-compliant items
    complianceResults.forEach((result) => {
      if (!result.compliant && result.holdPoints) {
        result.holdPoints.forEach((hp: any) => {
          if (hp.status === 'pending') {
            actions.push(`Obtain approval for: ${hp.description}`);
          }
        });
      }
    });

    // Add high-priority recommendations
    if (recommendations.length > 0) {
      actions.push(...recommendations.slice(0, 3));
    }

    return actions;
  }

  /**
   * Validate inspection data before processing
   */
  validateInspectionData(inspection: InspectionData): boolean {
    // Check required fields
    if (!inspection.id || !inspection.type || !inspection.date) {
      return false;
    }

    // Validate measurements if present
    if (inspection.measurements) {
      if (inspection.measurements.compaction) {
        const { density, moisture, proctor } = inspection.measurements.compaction;
        if (density && (density < 0 || density > 100)) return false;
        if (moisture && (moisture < 0 || moisture > 100)) return false;
        if (proctor && (proctor < 0 || proctor > 100)) return false;
      }
    }

    return true;
  }
}

// Export singleton instance
export const itpGenerator = new ITPReportGenerator();
