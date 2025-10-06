import {
  callClaude,
  extractToolUse,
  extractTextResponse,
  ClaudeMessage,
} from '../services/claude-service';
import { complianceSystemPrompt } from '../prompts/compliance-system-prompt';

// Import tools
import { getStandardTool, executeGetStandard } from '../tools/get-standard';
import { checkCompactionTool, executeCheckCompaction } from '../tools/check-compaction';
import { councilApprovalTool, executeCouncilApproval } from '../tools/council-approval';
import { checkWeatherTool, executeCheckWeather } from '../tools/check-weather';

const tools = [getStandardTool, checkCompactionTool, councilApprovalTool, checkWeatherTool];

export interface ComplianceAnalysisResult {
  organization_id: string;
  project_id: string;
  compliance_status: 'COMPLIANT' | 'NON_COMPLIANT' | 'CONDITIONAL';
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  issues: ComplianceIssue[];
  financial_impact: {
    estimated_remediation_cost: number;
    potential_penalties: number;
    delay_costs: number;
    total_risk: number;
  };
  timeline_impact: {
    estimated_delay_days: number;
    critical_path_affected: boolean;
    weather_risk_days: number;
  };
  recommendations: {
    priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    action: string;
    standard_reference?: string;
    cost_estimate?: number;
  }[];
  analysis: string;
  tool_calls_made: number;
  timestamp: string;
}

export interface ComplianceIssue {
  category: string;
  standard: string;
  section?: string;
  description: string;
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR';
  remediation_required: boolean;
}

export class ComplianceSentinel {
  private organizationId: string;
  private toolExecutionLog: Array<{ tool: string; input: any; output: any }> = [];

  constructor(organizationId: string) {
    this.organizationId = organizationId;
  }

  async analyzeProject(projectData: any): Promise<ComplianceAnalysisResult> {
    this.toolExecutionLog = [];

    const messages: ClaudeMessage[] = [
      {
        role: 'user',
        content: `Analyze this civil engineering project for compliance with Australian Standards:

**Project Details:**
${JSON.stringify(projectData, null, 2)}

**Required Analysis:**
1. Check AS 3798 earthworks compliance (if applicable)
2. Check AS/NZS 3500.3 drainage compliance (if applicable)
3. Check AS 2870 residential slabs and footings (if applicable)
4. Check AS 4671 steel reinforcing materials (if applicable)
5. Assess council approval timeline risk
6. Evaluate weather impact on schedule
7. Identify all hold points and testing requirements
8. Calculate financial risks from non-compliance

**Response Requirements:**
You MUST structure your final response as valid JSON with this exact format:
{
  "compliance_status": "COMPLIANT" | "NON_COMPLIANT" | "CONDITIONAL",
  "risk_level": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "issues": [
    {
      "category": "string",
      "standard": "string",
      "section": "string (optional)",
      "description": "string",
      "severity": "CRITICAL" | "MAJOR" | "MINOR",
      "remediation_required": boolean
    }
  ],
  "financial_impact": {
    "estimated_remediation_cost": number,
    "potential_penalties": number,
    "delay_costs": number,
    "total_risk": number
  },
  "timeline_impact": {
    "estimated_delay_days": number,
    "critical_path_affected": boolean,
    "weather_risk_days": number
  },
  "recommendations": [
    {
      "priority": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
      "action": "string",
      "standard_reference": "string (optional)",
      "cost_estimate": number (optional)
    }
  ],
  "summary": "string - comprehensive analysis narrative"
}`,
      },
    ];

    // Multi-turn conversation with tool use
    let iterationCount = 0;
    const maxIterations = 10;

    while (iterationCount < maxIterations) {
      const response = await callClaude({
        system: complianceSystemPrompt,
        messages,
        tools,
        temperature: 0.2, // Lower temperature for more consistent compliance analysis
      });

      // Check if Claude wants to use a tool
      const toolUse = extractToolUse(response);

      if (toolUse) {
        console.log(`[ComplianceSentinel] Tool call: ${toolUse.name}`, toolUse.input);

        // Execute the tool
        const toolResult = await this.executeToolCall(toolUse.name, toolUse.input);

        // Log tool execution
        this.toolExecutionLog.push({
          tool: toolUse.name,
          input: toolUse.input,
          output: toolResult,
        });

        // Add assistant response with tool use
        messages.push({
          role: 'assistant',
          content: response.content,
        });

        // Add tool result
        messages.push({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: JSON.stringify(toolResult, null, 2),
            },
          ],
        });

        iterationCount++;
        continue;
      }

      // No more tool use - parse final answer
      const finalAnswer = extractTextResponse(response);

      try {
        // Try to parse JSON response
        const jsonMatch = finalAnswer.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsedResult = JSON.parse(jsonMatch[0]);

          return {
            organization_id: this.organizationId,
            project_id: projectData.id || 'unknown',
            compliance_status: parsedResult.compliance_status || 'CONDITIONAL',
            risk_level: parsedResult.risk_level || 'MEDIUM',
            issues: parsedResult.issues || [],
            financial_impact: {
              estimated_remediation_cost:
                parsedResult.financial_impact?.estimated_remediation_cost || 0,
              potential_penalties: parsedResult.financial_impact?.potential_penalties || 0,
              delay_costs: parsedResult.financial_impact?.delay_costs || 0,
              total_risk: parsedResult.financial_impact?.total_risk || 0,
            },
            timeline_impact: {
              estimated_delay_days: parsedResult.timeline_impact?.estimated_delay_days || 0,
              critical_path_affected: parsedResult.timeline_impact?.critical_path_affected || false,
              weather_risk_days: parsedResult.timeline_impact?.weather_risk_days || 0,
            },
            recommendations: parsedResult.recommendations || [],
            analysis: parsedResult.summary || finalAnswer,
            tool_calls_made: iterationCount,
            timestamp: new Date().toISOString(),
          };
        }
      } catch (parseError) {
        console.error('[ComplianceSentinel] Failed to parse JSON response:', parseError);
      }

      // Fallback: Return structured response with text analysis
      return {
        organization_id: this.organizationId,
        project_id: projectData.id || 'unknown',
        compliance_status: 'CONDITIONAL',
        risk_level: 'MEDIUM',
        issues: [],
        financial_impact: {
          estimated_remediation_cost: 0,
          potential_penalties: 0,
          delay_costs: 0,
          total_risk: 0,
        },
        timeline_impact: {
          estimated_delay_days: 0,
          critical_path_affected: false,
          weather_risk_days: 0,
        },
        recommendations: [],
        analysis: finalAnswer,
        tool_calls_made: iterationCount,
        timestamp: new Date().toISOString(),
      };
    }

    throw new Error('Max iterations reached - agent did not complete analysis');
  }

  async quickComplianceCheck(
    testResults: {
      test_type: string;
      value: number;
      requirement: number;
      unit: string;
    }[]
  ): Promise<{ passed: boolean; failures: string[]; recommendations: string[] }> {
    const failures: string[] = [];
    const recommendations: string[] = [];
    let allPassed = true;

    for (const test of testResults) {
      if (test.test_type === 'compaction' && test.unit === '%') {
        const result = await executeCheckCompaction({
          dry_density: test.value,
          max_dry_density: (test.requirement * 100) / 98, // Assuming 98% requirement
          required_percentage: test.requirement,
          supervision_level: 'level_1',
        });

        if (!result.passes) {
          allPassed = false;
          failures.push(`Compaction failed: ${test.value}% < ${test.requirement}% required`);
          if (result.recommendations) {
            recommendations.push(...result.recommendations);
          }
        }
      }
    }

    return {
      passed: allPassed,
      failures,
      recommendations,
    };
  }

  private async executeToolCall(toolName: string, input: any): Promise<any> {
    try {
      switch (toolName) {
        case 'get_australian_standard':
          return await executeGetStandard(input);

        case 'check_compaction_compliance':
          return await executeCheckCompaction(input);

        case 'get_council_approval_timeline':
          return await executeCouncilApproval(input);

        case 'check_weather_restrictions':
          return await executeCheckWeather(input);

        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
    } catch (error) {
      console.error(`[ComplianceSentinel] Tool execution error for ${toolName}:`, error);
      return {
        error: `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  getToolExecutionLog() {
    return this.toolExecutionLog;
  }
}

// Singleton instance for default organization
let defaultSentinel: ComplianceSentinel | null = null;

export function getComplianceSentinel(organizationId: string = 'default'): ComplianceSentinel {
  if (!defaultSentinel || defaultSentinel['organizationId'] !== organizationId) {
    defaultSentinel = new ComplianceSentinel(organizationId);
  }
  return defaultSentinel;
}

// Convenience function for quick compliance analysis
export async function analyzeCompliance(
  projectData: any,
  organizationId: string = 'default'
): Promise<ComplianceAnalysisResult> {
  const sentinel = getComplianceSentinel(organizationId);
  return sentinel.analyzeProject(projectData);
}
