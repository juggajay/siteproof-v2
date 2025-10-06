// Tool Execution Coordinator for Claude Integration

import { callClaude, extractToolUse, extractTextResponse, ClaudeMessage } from './claude-service';
import { allTools, executeTool, validateToolInput } from '../tools/tool-registry';
import { complianceSystemPrompt } from '../prompts/compliance-system-prompt';
import { weatherSystemPrompt } from '../prompts/weather-system-prompt';
import { projectPlanningPrompt } from '../prompts/project-planning-prompt';

export interface ToolExecutionResult {
  success: boolean;
  toolName: string;
  input: any;
  output: any;
  error?: string;
  executionTime: number;
}

export interface ConversationContext {
  projectId?: string;
  userId?: string;
  sessionId: string;
  metadata?: Record<string, any>;
}

export interface QueryResult {
  answer: string;
  toolsUsed: ToolExecutionResult[];
  conversation: ClaudeMessage[];
  recommendations?: string[];
  warnings?: string[];
  confidence?: number;
}

export class ToolCoordinator {
  private maxToolCalls = 10; // Prevent infinite loops
  private conversationHistory: ClaudeMessage[] = [];
  private toolExecutionHistory: ToolExecutionResult[] = [];

  /**
   * Process a query with Claude using available tools
   */
  async processQuery(
    query: string,
    context?: ConversationContext,
    systemPrompt?: string
  ): Promise<QueryResult> {
    // Reset for new query
    this.conversationHistory = [];
    this.toolExecutionHistory = [];

    // Build initial message
    const initialMessage: ClaudeMessage = {
      role: 'user',
      content: this.enhanceQuery(query, context),
    };

    this.conversationHistory.push(initialMessage);

    // Determine appropriate system prompt
    const prompt = systemPrompt || this.selectSystemPrompt(query);

    // Process with Claude
    const result = await this.processWithTools(prompt, this.maxToolCalls);

    return {
      answer: result.finalAnswer,
      toolsUsed: this.toolExecutionHistory,
      conversation: this.conversationHistory,
      recommendations: result.recommendations,
      warnings: result.warnings,
      confidence: result.confidence,
    };
  }

  /**
   * Process conversation with tools
   */
  private async processWithTools(systemPrompt: string, maxIterations: number): Promise<any> {
    let iterations = 0;
    let finalAnswer = '';
    const recommendations: string[] = [];
    const warnings: string[] = [];

    while (iterations < maxIterations) {
      iterations++;

      // Call Claude with tools
      const response = await callClaude({
        system: systemPrompt,
        messages: this.conversationHistory,
        tools: allTools,
        temperature: 0.2,
      });

      // Check for tool use
      const toolUse = extractToolUse(response);

      if (toolUse) {
        // Execute tool
        const toolResult = await this.executeToolCall(toolUse);

        // Add assistant's tool use to history
        this.conversationHistory.push({
          role: 'assistant',
          content: [toolUse],
        });

        // Add tool result to history
        this.conversationHistory.push({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: JSON.stringify(toolResult.output),
            },
          ],
        });

        // Continue processing
        continue;
      } else {
        // Extract final answer
        finalAnswer = extractTextResponse(response);

        // Add to history
        this.conversationHistory.push({
          role: 'assistant',
          content: finalAnswer,
        });

        // Extract recommendations and warnings
        this.extractInsights(finalAnswer, recommendations, warnings);

        break;
      }
    }

    return {
      finalAnswer,
      recommendations,
      warnings,
      confidence: this.calculateConfidence(),
    };
  }

  /**
   * Execute a tool call
   */
  private async executeToolCall(toolUse: any): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const result: ToolExecutionResult = {
      success: false,
      toolName: toolUse.name,
      input: toolUse.input,
      output: null,
      executionTime: 0,
    };

    try {
      // Validate input
      const validation = validateToolInput(toolUse.name, toolUse.input);
      if (!validation.valid) {
        throw new Error(`Invalid input: ${validation.errors?.join(', ')}`);
      }

      // Execute tool
      result.output = await executeTool(toolUse.name, toolUse.input);
      result.success = true;
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
      result.output = { error: result.error };
    }

    result.executionTime = Date.now() - startTime;
    this.toolExecutionHistory.push(result);

    return result;
  }

  /**
   * Enhance query with context
   */
  private enhanceQuery(query: string, context?: ConversationContext): string {
    let enhanced = query;

    if (context) {
      const contextInfo = [];

      if (context.projectId) {
        contextInfo.push(`Project: ${context.projectId}`);
      }

      if (context.metadata) {
        Object.entries(context.metadata).forEach(([key, value]) => {
          contextInfo.push(`${key}: ${value}`);
        });
      }

      if (contextInfo.length > 0) {
        enhanced = `${query}\n\nContext:\n${contextInfo.join('\n')}`;
      }
    }

    return enhanced;
  }

  /**
   * Extract insights from response
   */
  private extractInsights(text: string, recommendations: string[], warnings: string[]): void {
    // Extract recommendations
    const recPattern = /(?:recommend|suggest|should|advise)[^.!?]*[.!?]/gi;
    const recMatches = text.match(recPattern);
    if (recMatches) {
      recommendations.push(...recMatches.map((r) => r.trim()));
    }

    // Extract warnings
    const warnPattern = /(?:warning|caution|risk|danger|critical)[^.!?]*[.!?]/gi;
    const warnMatches = text.match(warnPattern);
    if (warnMatches) {
      warnings.push(...warnMatches.map((w) => w.trim()));
    }
  }

  /**
   * Calculate confidence based on tool usage
   */
  private calculateConfidence(): number {
    if (this.toolExecutionHistory.length === 0) {
      return 50; // No tools used, moderate confidence
    }

    const successfulTools = this.toolExecutionHistory.filter((t) => t.success).length;
    const totalTools = this.toolExecutionHistory.length;

    return Math.round((successfulTools / totalTools) * 100);
  }

  /**
   * Select appropriate system prompt based on query
   */
  private selectSystemPrompt(query: string): string {
    const queryLower = query.toLowerCase();

    // Use compliance prompt for compliance-related queries
    if (
      queryLower.includes('compliance') ||
      queryLower.includes('standard') ||
      queryLower.includes('as ') ||
      queryLower.includes('as/nzs') ||
      queryLower.includes('proctor') ||
      queryLower.includes('compaction') ||
      queryLower.includes('requirement') ||
      queryLower.includes('pass') ||
      queryLower.includes('fail') ||
      queryLower.includes('check') ||
      queryLower.includes('verify')
    ) {
      return complianceSystemPrompt;
    }

    // Use weather prompt for weather-related queries
    if (
      queryLower.includes('weather') ||
      queryLower.includes('rain') ||
      queryLower.includes('temperature') ||
      (queryLower.includes('concrete') && queryLower.includes('pour')) ||
      queryLower.includes('wet') ||
      queryLower.includes('dry') ||
      queryLower.includes('forecast') ||
      queryLower.includes('conditions')
    ) {
      return weatherSystemPrompt;
    }

    // Use project planning prompt for scheduling queries
    if (
      queryLower.includes('schedule') ||
      queryLower.includes('timeline') ||
      queryLower.includes('council') ||
      queryLower.includes('approval') ||
      queryLower.includes('duration') ||
      queryLower.includes('critical path') ||
      queryLower.includes('milestone') ||
      queryLower.includes('delay')
    ) {
      return projectPlanningPrompt;
    }

    return this.getDefaultSystemPrompt();
  }

  /**
   * Process compliance-specific query
   */
  async processComplianceQuery(query: string, context?: ConversationContext): Promise<QueryResult> {
    return this.processQuery(query, context, complianceSystemPrompt);
  }

  /**
   * Process weather-specific query
   */
  async processWeatherQuery(query: string, context?: ConversationContext): Promise<QueryResult> {
    return this.processQuery(query, context, weatherSystemPrompt);
  }

  /**
   * Process project planning query
   */
  async processPlanningQuery(query: string, context?: ConversationContext): Promise<QueryResult> {
    return this.processQuery(query, context, projectPlanningPrompt);
  }

  /**
   * Get default system prompt
   */
  private getDefaultSystemPrompt(): string {
    return `You are an expert construction inspector and project manager with deep knowledge of:
- Australian Standards (AS/NZS) for civil engineering
- Construction compliance and quality control
- Weather impact on construction activities
- Council approval processes
- Project scheduling and optimization

You have access to tools that provide:
- Australian Standard requirements
- Weather restrictions and rules
- Council approval timeframes
- Compliance verification
- Timeline predictions
- Test frequency calculations
- Curing requirements

Use these tools when you need specific data or calculations. Always:
1. Check relevant standards when discussing compliance
2. Consider weather impacts for outdoor work
3. Account for council approval times in scheduling
4. Provide specific, actionable recommendations
5. Reference standard clauses and requirements

Be precise, thorough, and focus on practical application.`;
  }

  /**
   * Get conversation summary
   */
  getConversationSummary(): string {
    return this.conversationHistory
      .map((msg) => {
        if (typeof msg.content === 'string') {
          return `${msg.role.toUpperCase()}: ${msg.content}`;
        } else {
          return `${msg.role.toUpperCase()}: [Complex content with tools]`;
        }
      })
      .join('\n\n');
  }

  /**
   * Get tool usage statistics
   */
  getToolUsageStats(): {
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    averageExecutionTime: number;
    toolBreakdown: Record<string, number>;
  } {
    const stats = {
      totalCalls: this.toolExecutionHistory.length,
      successfulCalls: 0,
      failedCalls: 0,
      averageExecutionTime: 0,
      toolBreakdown: {} as Record<string, number>,
    };

    let totalTime = 0;

    this.toolExecutionHistory.forEach((execution) => {
      if (execution.success) {
        stats.successfulCalls++;
      } else {
        stats.failedCalls++;
      }

      totalTime += execution.executionTime;

      // Track tool usage
      stats.toolBreakdown[execution.toolName] = (stats.toolBreakdown[execution.toolName] || 0) + 1;
    });

    if (stats.totalCalls > 0) {
      stats.averageExecutionTime = Math.round(totalTime / stats.totalCalls);
    }

    return stats;
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
    this.toolExecutionHistory = [];
  }
}

// Singleton instance
export const toolCoordinator = new ToolCoordinator();

// Convenience function for simple queries
export async function askClaude(
  query: string,
  context?: ConversationContext
): Promise<QueryResult> {
  return toolCoordinator.processQuery(query, context);
}

// Convenience function for compliance-specific queries
export async function checkCompliance(
  query: string,
  context?: ConversationContext
): Promise<QueryResult> {
  return toolCoordinator.processComplianceQuery(query, context);
}

// Convenience function for weather-specific queries
export async function analyzeWeather(
  query: string,
  context?: ConversationContext
): Promise<QueryResult> {
  return toolCoordinator.processWeatherQuery(query, context);
}

// Convenience function for project planning queries
export async function planProject(
  query: string,
  context?: ConversationContext
): Promise<QueryResult> {
  return toolCoordinator.processPlanningQuery(query, context);
}

// Example queries that demonstrate tool usage
export const exampleQueries = [
  {
    query: 'What are the compaction requirements for clay fill under AS 3798?',
    expectedTools: ['get_australian_standard'],
    description: 'Retrieves specific standard requirements',
  },
  {
    query: 'Can we pour concrete today if the temperature is 38°C?',
    expectedTools: ['check_weather_restrictions', 'make_weather_decision'],
    description: 'Checks weather suitability for concrete work with temperature alerts',
  },
  {
    query: 'Can we place clay fill with 35°C temperature and rain forecast?',
    expectedTools: ['check_weather_restrictions'],
    description: 'Analyzes weather conditions for earthworks with alerts',
  },
  {
    query: 'How long will council approval take in Georges River for a complex development?',
    expectedTools: ['get_council_approval_timeline', 'predict_project_timeline'],
    description: 'Predicts approval timeline based on council performance with risk assessment',
  },
  {
    query: 'Check if 95% proctor compaction meets requirements for high-risk earthworks',
    expectedTools: ['get_australian_standard', 'verify_compliance'],
    description: 'Verifies compliance with specific measurements',
  },
  {
    query: 'How many compaction tests do I need for 5000m³ of fill at a level 1 site?',
    expectedTools: ['calculate_test_frequency'],
    description: 'Calculates required testing frequency',
  },
  {
    query: 'What are the curing requirements for high-strength concrete at 8°C?',
    expectedTools: ['get_curing_requirements'],
    description: 'Determines concrete curing specifications',
  },
  {
    query: 'Check if 19.8 kN/m³ dry density meets 98% proctor requirement with 20.2 kN/m³ MDD',
    expectedTools: ['check_compaction_compliance'],
    description: 'Verifies compaction test results against AS 3798 requirements',
  },
];
