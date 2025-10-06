// Automated Inspection Analyzer using Claude with Tools

import { callClaude, extractToolUse, extractTextResponse, ClaudeMessage } from './claude-service';
import { constructionTools, executeConstructionTool } from '../tools/construction-tools';
import type { InspectionData } from '../types';

export interface AutomatedInspectionResult {
  overallStatus: 'pass' | 'fail' | 'warning';
  complianceResults: any[];
  weatherAssessment: any;
  defects: any[];
  recommendations: string[];
  riskAssessment: any;
  reportGenerated: boolean;
  reportContent?: string;
  conversation: Array<{
    role: 'user' | 'assistant' | 'tool';
    content: string;
  }>;
}

export interface InspectionContext {
  projectId: string;
  location: string;
  inspector?: string;
  previousInspections?: any[];
  projectSpecifications?: any;
  photos?: string[];
}

export class AutomatedInspectionAnalyzer {
  private conversationHistory: ClaudeMessage[] = [];
  private toolExecutionLog: any[] = [];

  /**
   * Perform automated inspection analysis using Claude with tools
   */
  async analyzeInspection(
    inspection: InspectionData,
    context: InspectionContext
  ): Promise<AutomatedInspectionResult> {
    const result: AutomatedInspectionResult = {
      overallStatus: 'pass',
      complianceResults: [],
      weatherAssessment: null,
      defects: [],
      recommendations: [],
      riskAssessment: null,
      reportGenerated: false,
      conversation: [],
    };

    try {
      // Build initial prompt
      const initialPrompt = this.buildInspectionPrompt(inspection, context);

      // Start conversation with Claude
      this.conversationHistory = [
        {
          role: 'user',
          content: initialPrompt,
        },
      ];

      // Call Claude with tools
      const response = await callClaude({
        system: this.getSystemPrompt(),
        messages: this.conversationHistory,
        tools: constructionTools,
        temperature: 0.2, // Low temperature for consistent analysis
      });

      // Process response and tool calls
      await this.processResponse(response, inspection, result);

      // Generate final assessment
      const finalAssessment = await this.generateFinalAssessment(inspection, result);
      result.overallStatus = finalAssessment.status;
      result.recommendations = finalAssessment.recommendations;

      // Generate report if needed
      if (context.projectSpecifications?.requiresReport) {
        result.reportContent = await this.generateReport(inspection, result, context);
        result.reportGenerated = true;
      }

      return result;
    } catch (error) {
      console.error('Automated inspection analysis failed:', error);
      throw error;
    }
  }

  /**
   * Build inspection prompt
   */
  private buildInspectionPrompt(inspection: InspectionData, context: InspectionContext): string {
    return `
Please analyze this construction inspection and perform necessary compliance checks.

INSPECTION DETAILS:
- Project: ${context.projectId}
- Location: ${context.location}
- Type: ${inspection.type}
- Date: ${inspection.date}
- Inspector: ${context.inspector || 'Not specified'}

CURRENT CONDITIONS:
- Weather: ${JSON.stringify(inspection.weather)}
- Materials: ${inspection.materials?.type || 'Not specified'}

MEASUREMENTS:
${JSON.stringify(inspection.measurements || {}, null, 2)}

${inspection.notes ? `NOTES: ${inspection.notes}` : ''}

${
  inspection.nonConformances
    ? `
NON-CONFORMANCES REPORTED:
${inspection.nonConformances.map((nc) => `- ${nc.description} (${nc.severity})`).join('\n')}`
    : ''
}

${
  context.previousInspections
    ? `
PREVIOUS INSPECTIONS:
${context.previousInspections
  .map((pi) => `- ${pi.date}: ${pi.result} ${pi.issues ? `(Issues: ${pi.issues.join(', ')})` : ''}`)
  .join('\n')}`
    : ''
}

Please:
1. Check compliance against relevant Australian Standards
2. Analyze weather impact on the work
3. Identify any defects or issues
4. Assess risks
5. Provide recommendations

Use the available tools to perform these checks systematically.
`;
  }

  /**
   * Get system prompt for inspection analysis
   */
  private getSystemPrompt(): string {
    return `You are an expert construction inspector with deep knowledge of Australian Standards and construction best practices.

Your role is to:
1. Systematically analyze inspection data
2. Check compliance with relevant standards (AS 3798, AS/NZS 3500.3, AS 2870, AS 4671)
3. Identify defects and non-conformances
4. Assess weather-related risks
5. Provide clear, actionable recommendations

Use the provided tools to:
- check_compliance: Verify standards compliance
- analyze_weather_impact: Assess weather conditions
- identify_defects: Find and classify defects
- assess_risk: Evaluate construction risks
- generate_inspection_report: Create formal reports

Be thorough, objective, and focus on safety and quality. Always reference specific standards and provide evidence-based assessments.`;
  }

  /**
   * Process Claude's response and execute tool calls
   */
  private async processResponse(
    response: any,
    inspection: InspectionData,
    result: AutomatedInspectionResult
  ): Promise<void> {
    // Check for tool use
    const toolUse = extractToolUse(response);

    if (toolUse) {
      // Execute tool
      const toolResult = await this.executeToolCall(toolUse, inspection);

      // Add to conversation
      result.conversation.push({
        role: 'assistant',
        content: `Using tool: ${toolUse.name}`,
      });

      result.conversation.push({
        role: 'tool',
        content: JSON.stringify(toolResult, null, 2),
      });

      // Process tool results
      this.processToolResult(toolUse.name, toolResult, result);

      // Continue conversation with tool results
      this.conversationHistory.push({
        role: 'assistant',
        content: response.content,
      });

      this.conversationHistory.push({
        role: 'user',
        content: `Tool ${toolUse.name} returned: ${JSON.stringify(toolResult)}`,
      });

      // Get next response
      const nextResponse = await callClaude({
        system: this.getSystemPrompt(),
        messages: this.conversationHistory,
        tools: constructionTools,
      });

      // Recursive call to handle additional tool uses
      await this.processResponse(nextResponse, inspection, result);
    } else {
      // Extract text response
      const textResponse = extractTextResponse(response);
      result.conversation.push({
        role: 'assistant',
        content: textResponse,
      });

      // Parse recommendations from text
      const recommendations = this.extractRecommendations(textResponse);
      result.recommendations.push(...recommendations);
    }
  }

  /**
   * Execute a tool call
   */
  private async executeToolCall(toolUse: any, inspection: InspectionData): Promise<any> {
    // Map inspection data to tool input format
    const toolInput = this.mapToToolInput(toolUse.name, toolUse.input, inspection);

    // Log tool execution
    this.toolExecutionLog.push({
      tool: toolUse.name,
      input: toolInput,
      timestamp: new Date(),
    });

    // Execute tool
    return await executeConstructionTool(toolUse.name, toolInput);
  }

  /**
   * Map inspection data to tool input format
   */
  private mapToToolInput(toolName: string, input: any, inspection: InspectionData): any {
    switch (toolName) {
      case 'check_compliance':
        return {
          ...input,
          measurements: inspection.measurements,
          material: inspection.materials?.type,
          weather: inspection.weather,
        };

      case 'analyze_weather_impact':
        return {
          workType: inspection.type,
          material: inspection.materials?.type,
          currentWeather: inspection.weather,
          ...input,
        };

      case 'identify_defects':
        return {
          inspectionArea: inspection.location,
          observations:
            inspection.nonConformances?.map((nc) => ({
              description: nc.description,
              location: inspection.location,
              severity:
                nc.severity === 'critical'
                  ? 'critical'
                  : nc.severity === 'major'
                    ? 'major'
                    : nc.severity === 'minor'
                      ? 'minor'
                      : 'moderate',
            })) || [],
          ...input,
        };

      default:
        return input;
    }
  }

  /**
   * Process tool results
   */
  private processToolResult(
    toolName: string,
    result: any,
    inspectionResult: AutomatedInspectionResult
  ): void {
    switch (toolName) {
      case 'check_compliance':
        inspectionResult.complianceResults.push(result);
        if (!result.compliant) {
          inspectionResult.overallStatus = 'fail';
        }
        break;

      case 'analyze_weather_impact':
        inspectionResult.weatherAssessment = result;
        if (!result.canProceed) {
          inspectionResult.overallStatus =
            inspectionResult.overallStatus === 'fail' ? 'fail' : 'warning';
        }
        break;

      case 'identify_defects':
        inspectionResult.defects.push(...(result.defects || []));
        if (result.requiresImmediateAction) {
          inspectionResult.overallStatus = 'fail';
        }
        break;

      case 'assess_risk':
        inspectionResult.riskAssessment = result;
        if (result.overallRisk === 'extreme' || result.overallRisk === 'high') {
          inspectionResult.overallStatus =
            inspectionResult.overallStatus === 'fail' ? 'fail' : 'warning';
        }
        break;
    }
  }

  /**
   * Extract recommendations from text
   */
  private extractRecommendations(text: string): string[] {
    const recommendations: string[] = [];

    // Look for numbered recommendations
    const numberedPattern = /\d+\.\s*([^\n]+)/g;
    const matches = text.matchAll(numberedPattern);

    for (const match of matches) {
      if (match[1] && match[1].toLowerCase().includes('recommend')) {
        recommendations.push(match[1].trim());
      }
    }

    // Look for bullet points
    const bulletPattern = /[-•]\s*([^\n]+)/g;
    const bulletMatches = text.matchAll(bulletPattern);

    for (const match of bulletMatches) {
      if (match[1] && match[1].toLowerCase().includes('should')) {
        recommendations.push(match[1].trim());
      }
    }

    return recommendations;
  }

  /**
   * Generate final assessment
   */
  private async generateFinalAssessment(
    _inspection: InspectionData,
    result: AutomatedInspectionResult
  ): Promise<{ status: 'pass' | 'fail' | 'warning'; recommendations: string[] }> {
    // Analyze all results
    const hasFailures = result.complianceResults.some((r) => !r.compliant);
    const hasCriticalDefects = result.defects.some((d) => d.severity === 'critical');
    const hasWeatherIssues = result.weatherAssessment && !result.weatherAssessment.canProceed;
    const hasHighRisk =
      result.riskAssessment?.overallRisk === 'extreme' ||
      result.riskAssessment?.overallRisk === 'high';

    let status: 'pass' | 'fail' | 'warning' = 'pass';
    const recommendations: string[] = [];

    if (hasFailures || hasCriticalDefects || hasWeatherIssues) {
      status = 'fail';
      recommendations.push('Work must not proceed until critical issues are resolved');
    } else if (hasHighRisk || result.defects.length > 0) {
      status = 'warning';
      recommendations.push('Proceed with caution and implement recommended controls');
    }

    // Add specific recommendations based on issues
    if (hasFailures) {
      recommendations.push('Review and rectify all non-compliant items');
    }

    if (hasCriticalDefects) {
      recommendations.push('Address critical defects immediately');
    }

    if (hasWeatherIssues) {
      recommendations.push('Wait for suitable weather conditions before proceeding');
    }

    return { status, recommendations };
  }

  /**
   * Generate inspection report
   */
  private async generateReport(
    inspection: InspectionData,
    result: AutomatedInspectionResult,
    context: InspectionContext
  ): Promise<string> {
    const reportPrompt = `
Generate a formal inspection report based on the following analysis:

INSPECTION: ${inspection.type} at ${context.location}
DATE: ${inspection.date}
STATUS: ${result.overallStatus}

COMPLIANCE RESULTS:
${JSON.stringify(result.complianceResults, null, 2)}

WEATHER ASSESSMENT:
${JSON.stringify(result.weatherAssessment, null, 2)}

DEFECTS IDENTIFIED:
${JSON.stringify(result.defects, null, 2)}

RISK ASSESSMENT:
${JSON.stringify(result.riskAssessment, null, 2)}

RECOMMENDATIONS:
${result.recommendations.join('\n')}

Please generate a professional inspection report in markdown format.
`;

    const response = await callClaude({
      system: 'You are a professional report writer for construction inspections.',
      messages: [{ role: 'user', content: reportPrompt }],
      temperature: 0.3,
    });

    return extractTextResponse(response);
  }

  /**
   * Get conversation summary
   */
  getConversationSummary(): string {
    return this.conversationHistory
      .map(
        (msg) =>
          `${msg.role.toUpperCase()}: ${typeof msg.content === 'string' ? msg.content : 'Complex content'}`
      )
      .join('\n\n');
  }

  /**
   * Get tool execution log
   */
  getToolExecutionLog(): any[] {
    return this.toolExecutionLog;
  }
}

// Export singleton instance
export const automatedInspectionAnalyzer = new AutomatedInspectionAnalyzer();
