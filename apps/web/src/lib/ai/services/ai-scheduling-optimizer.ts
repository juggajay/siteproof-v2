// AI-Powered Scheduling Optimizer using Claude

import { anthropic, AI_CONFIG } from '../config';
import {
  projectTimelineAnalyzer,
  ProjectPhase,
  ProjectTimeline,
} from './project-timeline-analyzer';
import { getCouncilData } from '../knowledge-base/council-data';
import { weatherAnalyzer, WeatherForecast } from './weather-analyzer';
import { addDays, differenceInDays, format } from 'date-fns';

export interface ScheduleOptimizationRequest {
  phases: ProjectPhase[];
  constraints: {
    mustStartAfter?: Date;
    mustCompleteBefore?: Date;
    budgetLimit?: number;
    resourceLimit?: number;
    weatherSensitive?: boolean;
    councilApproval?: string;
  };
  preferences: {
    minimizeDuration?: boolean;
    minimizeCost?: boolean;
    maximizeQuality?: boolean;
    avoidWeekends?: boolean;
    avoidHolidays?: Date[];
  };
  weatherForecast?: WeatherForecast[];
}

export interface OptimizedSchedule {
  timeline: ProjectTimeline;
  improvements: {
    originalDuration: number;
    optimizedDuration: number;
    savedDays: number;
    savedCost?: number;
    riskReduction: number;
  };
  strategies: Array<{
    type: 'parallel' | 'fast-track' | 'resource' | 'sequence' | 'buffer';
    description: string;
    impact: string;
    confidence: number;
  }>;
  aiInsights: string[];
  criticalWarnings?: string[];
}

export interface ResourceAllocation {
  phaseId: string;
  resources: Array<{
    type: string;
    quantity: number;
    startDate: Date;
    endDate: Date;
    utilization: number; // percentage
  }>;
  conflicts?: Array<{
    date: Date;
    conflictingPhases: string[];
    resourceType: string;
  }>;
}

export class AISchedulingOptimizer {
  /**
   * Optimize project schedule using AI
   */
  async optimizeSchedule(request: ScheduleOptimizationRequest): Promise<OptimizedSchedule> {
    try {
      // Get baseline timeline
      const baselineTimeline = projectTimelineAnalyzer.analyzeProjectTimeline(
        request.phases,
        request.constraints.councilApproval,
        request.weatherForecast
      );

      // Prepare optimization context
      const optimizationPrompt = this.buildOptimizationPrompt(request, baselineTimeline);

      // Get AI optimization suggestions
      const aiResponse = await anthropic.messages.create({
        model: AI_CONFIG.model,
        max_tokens: 3000,
        temperature: 0.3,
        system: this.getOptimizerSystemPrompt(),
        messages: [
          {
            role: 'user',
            content: optimizationPrompt,
          },
        ],
      });

      // Parse AI suggestions
      const aiOptimizations = this.parseAIOptimizations(aiResponse);

      // Apply optimizations
      const optimizedPhases = this.applyOptimizations(
        request.phases,
        aiOptimizations,
        request.constraints,
        request.weatherForecast
      );

      // Calculate optimized timeline
      const optimizedTimeline = projectTimelineAnalyzer.analyzeProjectTimeline(
        optimizedPhases,
        request.constraints.councilApproval,
        request.weatherForecast
      );

      // Calculate improvements
      const improvements = {
        originalDuration: baselineTimeline.totalDuration,
        optimizedDuration: optimizedTimeline.totalDuration,
        savedDays: baselineTimeline.totalDuration - optimizedTimeline.totalDuration,
        riskReduction: baselineTimeline.riskScore - optimizedTimeline.riskScore,
      };

      return {
        timeline: optimizedTimeline,
        improvements,
        strategies: aiOptimizations.strategies || [],
        aiInsights: aiOptimizations.insights || [],
        criticalWarnings: aiOptimizations.warnings,
      };
    } catch (error) {
      console.error('Schedule optimization failed:', error);
      // Fallback to rule-based optimization
      return this.ruleBasedOptimization(request);
    }
  }

  /**
   * Build optimization prompt for AI
   */
  private buildOptimizationPrompt(
    request: ScheduleOptimizationRequest,
    baseline: ProjectTimeline
  ): string {
    return `
Optimize this construction project schedule for maximum efficiency.

PROJECT PHASES:
${JSON.stringify(
  request.phases.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    duration: p.duration,
    dependencies: p.dependencies,
    status: p.status,
  })),
  null,
  2
)}

CURRENT TIMELINE:
- Total Duration: ${baseline.totalDuration} days
- Critical Path: ${baseline.criticalPath.join(' → ')}
- Risk Score: ${baseline.riskScore}/100
- Total Float: ${baseline.totalFloat} days

CONSTRAINTS:
${JSON.stringify(request.constraints, null, 2)}

PREFERENCES:
${JSON.stringify(request.preferences, null, 2)}

${
  request.constraints.councilApproval
    ? `
COUNCIL APPROVAL DATA:
${JSON.stringify(request.constraints.councilApproval ? (getCouncilData(request.constraints.councilApproval) ?? {}) : {}, null, 2)}
`
    : ''
}

${
  request.weatherForecast
    ? `
WEATHER FORECAST:
Next 14 days: ${request.weatherForecast
        .slice(0, 14)
        .map((f) => `${format(f.date, 'MMM dd')}: ${f.conditions}, ${f.rainfall}mm rain`)
        .join(', ')}
`
    : ''
}

Provide optimization strategies in this JSON format:
{
  "strategies": [
    {
      "type": "parallel" | "fast-track" | "resource" | "sequence" | "buffer",
      "description": "Clear description of the optimization",
      "impact": "Expected impact (e.g., 'Save 10 days')",
      "confidence": 0-100,
      "phases": ["affected phase IDs"],
      "implementation": "How to implement this optimization"
    }
  ],
  "insights": ["Key insights about the schedule"],
  "warnings": ["Critical warnings if any"],
  "recommendedSequence": ["Optimized phase ID sequence"],
  "estimatedSavings": {
    "days": number,
    "riskReduction": number
  }
}

Focus on:
1. Identifying parallel execution opportunities
2. Optimizing council approval timing
3. Weather-aware scheduling
4. Resource conflict resolution
5. Critical path compression
6. Risk mitigation through buffering
`;
  }

  /**
   * Get system prompt for optimizer
   */
  private getOptimizerSystemPrompt(): string {
    return `You are an expert construction project scheduler with deep knowledge of:
- Critical Path Method (CPM) and PERT analysis
- Resource leveling and optimization
- Australian construction standards and council approval processes
- Weather impact on construction activities
- Risk management and mitigation strategies
- Lean construction principles

Your role is to optimize project schedules to:
1. Minimize total duration while maintaining quality
2. Reduce risk through intelligent sequencing
3. Maximize resource utilization
4. Account for weather and regulatory constraints
5. Provide practical, implementable optimization strategies

Always consider:
- Dependencies between activities
- Resource availability and conflicts
- Weather windows for sensitive activities
- Council approval timeframes
- Safety and quality requirements
- Cost implications of schedule changes`;
  }

  /**
   * Parse AI optimization response
   */
  private parseAIOptimizations(aiResponse: any): any {
    try {
      const content = aiResponse.content[0];
      if (content.type === 'text') {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
    } catch (error) {
      console.error('Failed to parse AI optimizations:', error);
    }

    // Fallback structure
    return {
      strategies: [],
      insights: ['Unable to generate AI insights'],
      warnings: [],
      recommendedSequence: [],
      estimatedSavings: { days: 0, riskReduction: 0 },
    };
  }

  /**
   * Apply optimizations to phases
   */
  private applyOptimizations(
    phases: ProjectPhase[],
    aiOptimizations: any,
    constraints: ScheduleOptimizationRequest['constraints'],
    weatherForecast?: WeatherForecast[]
  ): ProjectPhase[] {
    const optimizedPhases = [...phases];

    // Apply AI-suggested strategies
    if (aiOptimizations.strategies) {
      aiOptimizations.strategies.forEach((strategy: any) => {
        switch (strategy.type) {
          case 'parallel':
            this.applyParallelization(optimizedPhases, strategy);
            break;
          case 'fast-track':
            this.applyFastTracking(optimizedPhases, strategy);
            break;
          case 'sequence':
            this.optimizeSequence(optimizedPhases, strategy);
            break;
          case 'buffer':
            this.adjustBuffers(optimizedPhases, strategy);
            break;
        }
      });
    }

    // Apply weather optimization
    if (weatherForecast && constraints.weatherSensitive) {
      this.applyWeatherOptimization(optimizedPhases, weatherForecast);
    }

    // Apply council approval optimization
    if (constraints.councilApproval) {
      this.optimizeCouncilApproval(optimizedPhases, constraints.councilApproval);
    }

    return optimizedPhases;
  }

  /**
   * Apply parallelization strategy
   */
  private applyParallelization(phases: ProjectPhase[], strategy: any): void {
    if (strategy.phases && strategy.phases.length >= 2) {
      const [phase1Id, phase2Id] = strategy.phases;
      const phase1 = phases.find((p) => p.id === phase1Id);
      const phase2 = phases.find((p) => p.id === phase2Id);

      if (phase1 && phase2) {
        // Remove dependency if it exists
        if (phase2.dependencies?.includes(phase1Id)) {
          phase2.dependencies = phase2.dependencies.filter((d) => d !== phase1Id);
        }

        // Align start dates
        const earlierStart =
          phase1.startDate < phase2.startDate ? phase1.startDate : phase2.startDate;
        phase1.startDate = earlierStart;
        phase2.startDate = earlierStart;

        // Adjust end dates
        phase1.endDate = addDays(phase1.startDate, phase1.duration);
        phase2.endDate = addDays(phase2.startDate, phase2.duration);
      }
    }
  }

  /**
   * Apply fast-tracking strategy
   */
  private applyFastTracking(phases: ProjectPhase[], strategy: any): void {
    if (strategy.phases && strategy.phases.length > 0) {
      strategy.phases.forEach((phaseId: string) => {
        const phase = phases.find((p) => p.id === phaseId);
        if (phase) {
          // Reduce duration by 15% for fast-tracking
          phase.duration = Math.round(phase.duration * 0.85);
          phase.endDate = addDays(phase.startDate, phase.duration);

          // Add risk for fast-tracking
          if (!phase.risks) phase.risks = [];
          phase.risks.push({
            type: 'Fast-tracking',
            probability: 30,
            impact: 5,
            mitigation: 'Increase supervision and quality checks',
          });
        }
      });
    }
  }

  /**
   * Optimize phase sequence
   */
  private optimizeSequence(phases: ProjectPhase[], strategy: any): void {
    if (strategy.recommendedSequence && strategy.recommendedSequence.length > 0) {
      // Reorder phases based on recommended sequence
      const sequenceMap = new Map<string, number>(
        strategy.recommendedSequence.map((id: string, idx: number) => [id, idx])
      );
      phases.sort((a, b) => {
        const aIndex = sequenceMap.get(a.id) ?? 999;
        const bIndex = sequenceMap.get(b.id) ?? 999;
        return aIndex - bIndex;
      });
    }
  }

  /**
   * Adjust phase buffers
   */
  private adjustBuffers(phases: ProjectPhase[], _strategy: any): void {
    phases.forEach((phase) => {
      if (phase.criticalPath) {
        // Add buffer to critical path activities
        phase.buffer = Math.max(phase.buffer || 0, Math.round(phase.duration * 0.1));
      } else {
        // Reduce buffer for non-critical activities
        phase.buffer = Math.round((phase.buffer || 0) * 0.5);
      }
    });
  }

  /**
   * Apply weather optimization
   */
  private applyWeatherOptimization(phases: ProjectPhase[], forecast: WeatherForecast[]): void {
    const weatherSensitiveTypes = ['earthworks', 'concrete'];

    phases.forEach((phase) => {
      if (weatherSensitiveTypes.includes(phase.type)) {
        // Find optimal weather window
        const optimalWindow = weatherAnalyzer.findOptimalWorkWindow(
          phase.type,
          undefined,
          forecast,
          phase.duration
        );

        if (optimalWindow && optimalWindow.score > 70) {
          // Adjust phase dates to optimal window
          const newStart = new Date(optimalWindow.start);
          const daysDiff = differenceInDays(newStart, phase.startDate);

          if (Math.abs(daysDiff) <= 7 && daysDiff > 0) {
            // Only adjust if within a week and moving forward
            phase.startDate = newStart;
            phase.endDate = addDays(newStart, phase.duration);
          }
        }
      }
    });
  }

  /**
   * Optimize council approval timing
   */
  private optimizeCouncilApproval(phases: ProjectPhase[], councilName: string): void {
    const approvalPhases = phases.filter((p) => p.type === 'approval');

    approvalPhases.forEach((phase) => {
      const prediction = projectTimelineAnalyzer.predictApprovalTimeline(
        councilName,
        'construction',
        'moderate'
      );

      // Update duration based on prediction
      if (prediction.confidence > 60) {
        phase.duration = prediction.predictedDays;
        phase.endDate = addDays(phase.startDate, phase.duration);

        // Add buffer for poor-performing councils
        if (prediction.confidence < 50) {
          phase.buffer = Math.round(prediction.predictedDays * 0.2);
        }
      }
    });
  }

  /**
   * Rule-based fallback optimization
   */
  private ruleBasedOptimization(request: ScheduleOptimizationRequest): OptimizedSchedule {
    const baseline = projectTimelineAnalyzer.analyzeProjectTimeline(
      request.phases,
      request.constraints.councilApproval
    );

    // Apply basic optimization rules
    const optimization = projectTimelineAnalyzer.optimizeSchedule(request.phases);

    const optimizedTimeline = projectTimelineAnalyzer.analyzeProjectTimeline(
      optimization.optimizedPhases,
      request.constraints.councilApproval
    );

    return {
      timeline: optimizedTimeline,
      improvements: {
        originalDuration: baseline.totalDuration,
        optimizedDuration: optimizedTimeline.totalDuration,
        savedDays: optimization.savedDays,
        riskReduction: 0,
      },
      strategies: optimization.suggestions.map((s) => ({
        type: 'parallel' as const,
        description: s,
        impact: 'Potential time savings',
        confidence: 60,
      })),
      aiInsights: optimization.suggestions,
      criticalWarnings: [],
    };
  }

  /**
   * Perform resource leveling
   */
  async levelResources(
    phases: ProjectPhase[],
    resourceConstraints: {
      [resourceType: string]: {
        available: number;
        cost: number;
      };
    }
  ): Promise<ResourceAllocation[]> {
    const allocations: ResourceAllocation[] = [];
    const conflicts: any[] = [];

    // Simple resource allocation logic
    phases.forEach((phase) => {
      const allocation: ResourceAllocation = {
        phaseId: phase.id,
        resources: [],
        conflicts: [],
      };

      // Estimate resource needs based on phase type
      const resourceNeeds = this.estimateResourceNeeds(phase);

      resourceNeeds.forEach((need) => {
        const constraint = resourceConstraints[need.type];
        if (constraint) {
          const utilization = (need.quantity / constraint.available) * 100;

          allocation.resources.push({
            type: need.type,
            quantity: Math.min(need.quantity, constraint.available),
            startDate: phase.startDate,
            endDate: phase.endDate,
            utilization,
          });

          if (utilization > 100) {
            conflicts.push({
              date: phase.startDate,
              conflictingPhases: [phase.id],
              resourceType: need.type,
            });
          }
        }
      });

      allocation.conflicts = conflicts;
      allocations.push(allocation);
    });

    return allocations;
  }

  /**
   * Estimate resource needs for a phase
   */
  private estimateResourceNeeds(phase: ProjectPhase): Array<{ type: string; quantity: number }> {
    const needs: Array<{ type: string; quantity: number }> = [];

    switch (phase.type) {
      case 'construction':
        needs.push({ type: 'workers', quantity: 10 }, { type: 'equipment', quantity: 3 });
        break;
      case 'inspection':
        needs.push({ type: 'inspectors', quantity: 2 }, { type: 'testing_equipment', quantity: 1 });
        break;
      case 'documentation':
        needs.push({ type: 'admin', quantity: 1 });
        break;
    }

    return needs;
  }
}

// Export singleton instance
export const aiSchedulingOptimizer = new AISchedulingOptimizer();
