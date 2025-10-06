// Project Timeline Analyzer with Council Approval Intelligence

import { getCouncilData } from '../knowledge-base/council-data';
import type { WeatherForecast } from './weather-analyzer';
import { addDays, differenceInDays, format, isWeekend } from 'date-fns';

export interface ProjectPhase {
  id: string;
  name: string;
  type: 'approval' | 'construction' | 'inspection' | 'documentation';
  startDate: Date;
  endDate: Date;
  duration: number; // in days
  dependencies?: string[]; // IDs of phases that must complete first
  status: 'pending' | 'in_progress' | 'completed' | 'delayed';
  council?: string;
  criticalPath?: boolean;
  buffer?: number; // Buffer days
  risks?: Array<{
    type: string;
    probability: number;
    impact: number;
    mitigation: string;
  }>;
}

export interface ProjectTimeline {
  projectName: string;
  startDate: Date;
  endDate: Date;
  totalDuration: number;
  phases: ProjectPhase[];
  criticalPath: string[]; // Phase IDs
  totalFloat: number; // Days of float in schedule
  riskScore: number; // 0-100
  recommendations: string[];
}

export interface ApprovalPrediction {
  council: string;
  predictedDays: number;
  bestCase: number;
  worstCase: number;
  confidence: number; // 0-100
  factors: Array<{
    factor: string;
    impact: 'positive' | 'negative' | 'neutral';
    days: number;
  }>;
  strategies: string[];
}

export class ProjectTimelineAnalyzer {
  /**
   * Analyze complete project timeline with council approvals
   */
  analyzeProjectTimeline(
    phases: ProjectPhase[],
    councilName?: string,
    weatherForecast?: WeatherForecast[]
  ): ProjectTimeline {
    // Calculate critical path
    const criticalPath = this.calculateCriticalPath(phases);

    // Calculate total duration and dates
    const startDate = new Date(Math.min(...phases.map((p) => p.startDate.getTime())));
    const endDate = new Date(Math.max(...phases.map((p) => p.endDate.getTime())));
    const totalDuration = differenceInDays(endDate, startDate);

    // Calculate float
    const totalFloat = this.calculateTotalFloat(phases, criticalPath);

    // Calculate risk score
    const riskScore = this.calculateRiskScore(phases, councilName);

    // Generate recommendations
    const recommendations = this.generateTimelineRecommendations(
      phases,
      councilName,
      riskScore,
      weatherForecast
    );

    return {
      projectName: 'Construction Project',
      startDate,
      endDate,
      totalDuration,
      phases: phases.map((p) => ({
        ...p,
        criticalPath: criticalPath.includes(p.id),
      })),
      criticalPath,
      totalFloat,
      riskScore,
      recommendations,
    };
  }

  /**
   * Predict council approval timeline with AI insights
   */
  predictApprovalTimeline(
    councilName: string,
    _projectType: string,
    complexity: 'simple' | 'moderate' | 'complex',
    additionalFactors?: {
      heritage?: boolean;
      environmental?: boolean;
      trafficImpact?: boolean;
      height?: number; // in meters
      publicObjections?: boolean;
    }
  ): ApprovalPrediction {
    const councilInfo = getCouncilData(councilName);

    if (!councilInfo) {
      // Default prediction for unknown councils
      return {
        council: councilName,
        predictedDays: 115, // NSW statutory
        bestCase: 60,
        worstCase: 200,
        confidence: 40,
        factors: [],
        strategies: ['Contact council for specific timeframes', 'Consider pre-lodgement meeting'],
      };
    }

    const councilData = councilInfo;

    let predictedDays = councilData.average_days;
    const factors: ApprovalPrediction['factors'] = [];
    const strategies: string[] = [];

    // Adjust based on complexity
    switch (complexity) {
      case 'simple':
        predictedDays *= 0.7;
        factors.push({ factor: 'Simple development', impact: 'positive', days: -30 });
        break;
      case 'complex':
        predictedDays *= 1.3;
        factors.push({ factor: 'Complex development', impact: 'negative', days: 45 });
        break;
    }

    // Adjust for additional factors
    if (additionalFactors) {
      if (additionalFactors.heritage) {
        predictedDays += 25;
        factors.push({ factor: 'Heritage considerations', impact: 'negative', days: 25 });
        strategies.push('Engage heritage consultant early');
      }

      if (additionalFactors.environmental) {
        predictedDays += 20;
        factors.push({ factor: 'Environmental assessment', impact: 'negative', days: 20 });
        strategies.push('Complete environmental studies upfront');
      }

      if (additionalFactors.trafficImpact) {
        predictedDays += 15;
        factors.push({ factor: 'Traffic impact assessment', impact: 'negative', days: 15 });
        strategies.push('Submit traffic report with application');
      }

      if (additionalFactors.height && additionalFactors.height > 20) {
        predictedDays += 30;
        factors.push({ factor: 'Height variation required', impact: 'negative', days: 30 });
        strategies.push('Prepare shadow diagrams and view analysis');
      }

      if (additionalFactors.publicObjections) {
        predictedDays += 35;
        factors.push({ factor: 'Public objections expected', impact: 'negative', days: 35 });
        strategies.push('Engage with neighbors before submission');
      }
    }

    // Add council-specific strategies
    if (
      councilData.performance_rating === 'POOR' ||
      councilData.performance_rating === 'VERY_POOR'
    ) {
      strategies.push(
        'Consider using private certifier where possible',
        'Schedule pre-lodgement meeting with council',
        'Submit comprehensive documentation to avoid RFI delays'
      );
    }

    if (councilData.fast_track_available) {
      strategies.push('Check eligibility for fast-track assessment');
    }

    // Calculate best and worst cases
    const bestCase = Math.round(predictedDays * 0.6);
    const worstCase = Math.round(predictedDays * 1.8);

    // Calculate confidence based on council performance
    let confidence = 70;
    if (councilData.performance_rating === 'GOOD') confidence = 80;
    if (councilData.performance_rating === 'POOR') confidence = 50;
    if (councilData.performance_rating === 'VERY_POOR') confidence = 30;

    return {
      council: councilName,
      predictedDays: Math.round(predictedDays),
      bestCase,
      worstCase,
      confidence,
      factors,
      strategies,
    };
  }

  /**
   * Calculate critical path using CPM algorithm
   */
  private calculateCriticalPath(phases: ProjectPhase[]): string[] {
    const criticalPath: string[] = [];

    // Build dependency graph
    const graph: Map<string, ProjectPhase> = new Map();
    phases.forEach((phase) => graph.set(phase.id, phase));

    // Calculate early start and early finish
    const earlyStart: Map<string, number> = new Map();
    const earlyFinish: Map<string, number> = new Map();

    // Topological sort for forward pass
    const sorted = this.topologicalSort(phases);

    sorted.forEach((phase) => {
      const dependencies = phase.dependencies || [];
      let maxEarlyFinish = 0;

      dependencies.forEach((depId) => {
        const depFinish = earlyFinish.get(depId) || 0;
        maxEarlyFinish = Math.max(maxEarlyFinish, depFinish);
      });

      earlyStart.set(phase.id, maxEarlyFinish);
      earlyFinish.set(phase.id, maxEarlyFinish + phase.duration);
    });

    // Calculate late start and late finish (backward pass)
    const lateStart: Map<string, number> = new Map();
    const lateFinish: Map<string, number> = new Map();

    const projectEnd = Math.max(...Array.from(earlyFinish.values()));

    // Reverse order for backward pass
    sorted.reverse().forEach((phase) => {
      const successors = phases.filter((p) => p.dependencies && p.dependencies.includes(phase.id));

      let minLateStart = projectEnd;
      if (successors.length > 0) {
        successors.forEach((successor) => {
          const succLateStart = lateStart.get(successor.id) || projectEnd;
          minLateStart = Math.min(minLateStart, succLateStart);
        });
      }

      lateFinish.set(phase.id, minLateStart);
      lateStart.set(phase.id, minLateStart - phase.duration);
    });

    // Identify critical path (where early start = late start)
    phases.forEach((phase) => {
      const es = earlyStart.get(phase.id) || 0;
      const ls = lateStart.get(phase.id) || 0;

      if (Math.abs(es - ls) < 0.1) {
        // Float tolerance
        criticalPath.push(phase.id);
      }
    });

    return criticalPath;
  }

  /**
   * Topological sort for dependency resolution
   */
  private topologicalSort(phases: ProjectPhase[]): ProjectPhase[] {
    const sorted: ProjectPhase[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (phase: ProjectPhase) => {
      if (visited.has(phase.id)) return;
      if (visiting.has(phase.id)) {
        throw new Error(`Circular dependency detected at phase: ${phase.id}`);
      }

      visiting.add(phase.id);

      const dependencies = phase.dependencies || [];
      dependencies.forEach((depId) => {
        const dep = phases.find((p) => p.id === depId);
        if (dep) visit(dep);
      });

      visiting.delete(phase.id);
      visited.add(phase.id);
      sorted.push(phase);
    };

    phases.forEach((phase) => visit(phase));
    return sorted.reverse();
  }

  /**
   * Calculate total float in schedule
   */
  private calculateTotalFloat(phases: ProjectPhase[], criticalPath: string[]): number {
    let totalFloat = 0;

    phases.forEach((phase) => {
      if (!criticalPath.includes(phase.id)) {
        // Calculate float for non-critical activities
        const buffer = phase.buffer || 0;
        totalFloat += buffer;
      }
    });

    return totalFloat;
  }

  /**
   * Calculate project risk score
   */
  private calculateRiskScore(phases: ProjectPhase[], councilName?: string): number {
    let riskScore = 0;
    let riskCount = 0;

    // Council approval risk
    if (councilName) {
      const councilInfo = getCouncilData(councilName);
      if (councilInfo) {
        if (councilInfo.performance_rating === 'POOR') riskScore += 20;
        if (councilInfo.performance_rating === 'VERY_POOR') riskScore += 35;

        // Check if actual exceeds statutory
        const overrun = councilInfo.average_days - councilInfo.statutory_target;
        if (overrun > 100) riskScore += 15;
      }
    }

    // Phase-specific risks
    phases.forEach((phase) => {
      if (phase.risks) {
        phase.risks.forEach((risk) => {
          const riskValue = (risk.probability / 100) * (risk.impact / 10);
          riskScore += riskValue * 10;
          riskCount++;
        });
      }

      // Status-based risk
      if (phase.status === 'delayed') riskScore += 10;
    });

    // Critical path concentration risk
    const criticalRatio = phases.filter((p) => p.criticalPath).length / phases.length;
    if (criticalRatio > 0.7) riskScore += 15;

    return Math.min(100, riskScore);
  }

  /**
   * Generate timeline optimization recommendations
   */
  private generateTimelineRecommendations(
    phases: ProjectPhase[],
    councilName?: string,
    riskScore?: number,
    weatherForecast?: WeatherForecast[]
  ): string[] {
    const recommendations: string[] = [];

    // Council-specific recommendations
    if (councilName) {
      const councilInfo = getCouncilData(councilName);
      if (councilInfo) {
        if (councilInfo.average_days > councilInfo.statutory_target * 1.5) {
          recommendations.push(
            `Council approval typically takes ${councilInfo.average_days} days (${Math.round((councilInfo.average_days / councilInfo.statutory_target) * 100)}% over statutory)`,
            'Consider private certification for building elements',
            'Schedule pre-lodgement meeting to identify issues early'
          );
        }

        if (councilInfo.common_delays && councilInfo.common_delays.length > 0) {
          recommendations.push(
            `Prepare for typical delays: ${councilInfo.common_delays.join(', ')}`
          );
        }
      }
    }

    // Risk-based recommendations
    if (riskScore && riskScore > 60) {
      recommendations.push(
        'High risk project - increase contingency to 15-20%',
        'Implement weekly risk review meetings',
        'Develop detailed contingency plans for critical path activities'
      );
    }

    // Weather-based recommendations
    if (weatherForecast) {
      const constructionPhases = phases.filter((p) => p.type === 'construction');
      constructionPhases.forEach((phase) => {
        const phaseDates: Date[] = [];
        for (let d = phase.startDate; d <= phase.endDate; d = addDays(d, 1)) {
          phaseDates.push(d);
        }

        // Check weather during construction phases
        const badWeatherDays = weatherForecast.filter((f) =>
          phaseDates.some(
            (d) => format(d, 'yyyy-MM-dd') === format(f.date, 'yyyy-MM-dd') && f.rainfall > 10
          )
        ).length;

        if (badWeatherDays > 3) {
          recommendations.push(
            `${phase.name}: ${badWeatherDays} days of rain forecast - add ${Math.ceil(badWeatherDays * 0.5)} buffer days`
          );
        }
      });
    }

    // Critical path recommendations
    const criticalPhases = phases.filter((p) => p.criticalPath);
    if (criticalPhases.length > phases.length * 0.6) {
      recommendations.push(
        'Limited schedule flexibility - consider parallel work streams',
        'Focus resources on critical path activities'
      );
    }

    // Buffer recommendations
    const totalBuffer = phases.reduce((sum, p) => sum + (p.buffer || 0), 0);
    const totalDuration = phases.reduce((sum, p) => sum + p.duration, 0);
    const bufferRatio = totalBuffer / totalDuration;

    if (bufferRatio < 0.1) {
      recommendations.push('Insufficient schedule buffer - add 10-15% contingency');
    }

    return recommendations;
  }

  /**
   * Generate Gantt chart data
   */
  generateGanttData(timeline: ProjectTimeline): any[] {
    return timeline.phases.map((phase) => ({
      id: phase.id,
      name: phase.name,
      start: format(phase.startDate, 'yyyy-MM-dd'),
      end: format(phase.endDate, 'yyyy-MM-dd'),
      duration: phase.duration,
      percentComplete: phase.status === 'completed' ? 100 : phase.status === 'in_progress' ? 50 : 0,
      dependencies: phase.dependencies?.join(',') || '',
      critical: phase.criticalPath || false,
      type: phase.type,
      council: phase.council,
      color: this.getPhaseColor(phase),
    }));
  }

  /**
   * Get color for phase based on type and status
   */
  private getPhaseColor(phase: ProjectPhase): string {
    if (phase.status === 'delayed') return '#ef4444'; // red
    if (phase.criticalPath) return '#f59e0b'; // amber

    switch (phase.type) {
      case 'approval':
        return '#3b82f6'; // blue
      case 'construction':
        return '#10b981'; // green
      case 'inspection':
        return '#8b5cf6'; // purple
      case 'documentation':
        return '#6b7280'; // gray
      default:
        return '#60a5fa'; // light blue
    }
  }

  /**
   * Calculate working days between dates (excluding weekends)
   */
  calculateWorkingDays(startDate: Date, endDate: Date): number {
    let workingDays = 0;
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      if (!isWeekend(currentDate)) {
        workingDays++;
      }
      currentDate = addDays(currentDate, 1);
    }

    return workingDays;
  }

  /**
   * Optimize schedule to minimize duration
   */
  optimizeSchedule(phases: ProjectPhase[]): {
    optimizedPhases: ProjectPhase[];
    savedDays: number;
    suggestions: string[];
  } {
    const optimizedPhases = [...phases];
    const suggestions: string[] = [];
    let savedDays = 0;

    // Find opportunities for parallel execution
    optimizedPhases.forEach((phase) => {
      const potentialParallel = optimizedPhases.filter(
        (p) =>
          p.id !== phase.id &&
          p.type === phase.type &&
          !p.dependencies?.includes(phase.id) &&
          !phase.dependencies?.includes(p.id)
      );

      if (potentialParallel.length > 0) {
        suggestions.push(`${phase.name} could run in parallel with ${potentialParallel[0].name}`);
        savedDays += Math.min(phase.duration, potentialParallel[0].duration) * 0.5;
      }
    });

    // Identify fast-tracking opportunities
    const approvalPhases = optimizedPhases.filter((p) => p.type === 'approval');
    if (approvalPhases.length > 1) {
      suggestions.push('Consider combining approval applications for efficiency');
      savedDays += 15;
    }

    // Resource leveling suggestions
    const constructionPhases = optimizedPhases.filter((p) => p.type === 'construction');
    const overlappingConstruction = this.findOverlappingPhases(constructionPhases);

    if (overlappingConstruction.length > 2) {
      suggestions.push(
        'Resource conflict detected - consider staggering construction phases',
        'Add 10% duration buffer for resource constraints'
      );
    }

    return {
      optimizedPhases,
      savedDays: Math.round(savedDays),
      suggestions,
    };
  }

  /**
   * Find overlapping phases
   */
  private findOverlappingPhases(phases: ProjectPhase[]): ProjectPhase[] {
    return phases.filter((phase, index) => {
      return phases.some(
        (other, otherIndex) =>
          index !== otherIndex &&
          phase.startDate <= other.endDate &&
          phase.endDate >= other.startDate
      );
    });
  }
}

// Export singleton instance
export const projectTimelineAnalyzer = new ProjectTimelineAnalyzer();
