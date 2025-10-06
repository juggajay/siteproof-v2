'use client';

import React, { useState, useEffect } from 'react';
import {
  projectTimelineAnalyzer,
  ProjectPhase,
  ProjectTimeline,
  ApprovalPrediction,
} from '@/lib/ai/services/project-timeline-analyzer';
import {
  aiSchedulingOptimizer,
  OptimizedSchedule,
} from '@/lib/ai/services/ai-scheduling-optimizer';
import { format, addDays, differenceInDays } from 'date-fns';

interface ProjectTimelineDashboardProps {
  initialPhases?: ProjectPhase[];
  councilName?: string;
  onScheduleOptimized?: (schedule: OptimizedSchedule) => void;
}

export function ProjectTimelineDashboard({
  initialPhases = [],
  councilName,
  onScheduleOptimized,
}: ProjectTimelineDashboardProps) {
  const [phases, setPhases] = useState<ProjectPhase[]>(initialPhases);
  const [timeline, setTimeline] = useState<ProjectTimeline | null>(null);
  const [approvalPrediction, setApprovalPrediction] = useState<ApprovalPrediction | null>(null);
  const [optimizedSchedule, setOptimizedSchedule] = useState<OptimizedSchedule | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedView, setSelectedView] = useState<
    'timeline' | 'gantt' | 'approval' | 'optimization'
  >('timeline');

  // Sample phases if none provided
  useEffect(() => {
    if (phases.length === 0) {
      const samplePhases: ProjectPhase[] = [
        {
          id: 'approval-1',
          name: 'Council Approval',
          type: 'approval',
          startDate: new Date(),
          endDate: addDays(new Date(), 120),
          duration: 120,
          status: 'in_progress',
          council: councilName || 'Georges River',
          buffer: 15,
        },
        {
          id: 'const-1',
          name: 'Site Preparation',
          type: 'construction',
          startDate: addDays(new Date(), 121),
          endDate: addDays(new Date(), 135),
          duration: 14,
          dependencies: ['approval-1'],
          status: 'pending',
          buffer: 3,
        },
        {
          id: 'const-2',
          name: 'Foundation Work',
          type: 'construction',
          startDate: addDays(new Date(), 136),
          endDate: addDays(new Date(), 160),
          duration: 24,
          dependencies: ['const-1'],
          status: 'pending',
          buffer: 5,
        },
        {
          id: 'inspect-1',
          name: 'Foundation Inspection',
          type: 'inspection',
          startDate: addDays(new Date(), 161),
          endDate: addDays(new Date(), 162),
          duration: 1,
          dependencies: ['const-2'],
          status: 'pending',
        },
        {
          id: 'const-3',
          name: 'Structure Construction',
          type: 'construction',
          startDate: addDays(new Date(), 163),
          endDate: addDays(new Date(), 210),
          duration: 47,
          dependencies: ['inspect-1'],
          status: 'pending',
          buffer: 7,
        },
      ];
      setPhases(samplePhases);
    }
  }, []);

  useEffect(() => {
    if (phases.length > 0) {
      analyzeTimeline();
    }
  }, [phases, councilName]);

  const analyzeTimeline = () => {
    const analysis = projectTimelineAnalyzer.analyzeProjectTimeline(phases, councilName);
    setTimeline(analysis);

    // Get approval prediction if council specified
    if (councilName) {
      const prediction = projectTimelineAnalyzer.predictApprovalTimeline(
        councilName,
        'construction',
        'moderate',
        {
          heritage: false,
          environmental: true,
          trafficImpact: true,
        }
      );
      setApprovalPrediction(prediction);
    }
  };

  const optimizeSchedule = async () => {
    setLoading(true);
    try {
      const optimized = await aiSchedulingOptimizer.optimizeSchedule({
        phases,
        constraints: {
          councilApproval: councilName,
          weatherSensitive: true,
        },
        preferences: {
          minimizeDuration: true,
          avoidWeekends: true,
        },
      });

      setOptimizedSchedule(optimized);
      onScheduleOptimized?.(optimized);
    } catch (error) {
      console.error('Optimization failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPhaseColor = (phase: ProjectPhase) => {
    if (phase.status === 'delayed') return 'bg-red-500';
    if (phase.status === 'completed') return 'bg-green-500';
    if (phase.status === 'in_progress') return 'bg-blue-500';
    if (phase.criticalPath) return 'bg-orange-500';
    return 'bg-gray-400';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'in_progress':
        return '🔄';
      case 'delayed':
        return '⚠️';
      default:
        return '⏳';
    }
  };

  return (
    <div className="space-y-6">
      {/* View Selector */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex space-x-4">
          {['timeline', 'gantt', 'approval', 'optimization'].map((view) => (
            <button
              key={view}
              onClick={() => setSelectedView(view as any)}
              className={`px-4 py-2 rounded-md font-medium ${
                selectedView === view
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {view.charAt(0).toUpperCase() + view.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Overview */}
      {selectedView === 'timeline' && timeline && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4">Project Timeline</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Total Duration</p>
              <p className="text-2xl font-bold">{timeline.totalDuration} days</p>
              <p className="text-xs text-gray-500">
                {format(timeline.startDate, 'MMM dd')} - {format(timeline.endDate, 'MMM dd, yyyy')}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Risk Score</p>
              <div className="flex items-center">
                <p className="text-2xl font-bold">{timeline.riskScore}/100</p>
                <div
                  className={`ml-2 h-3 w-3 rounded-full ${
                    timeline.riskScore > 60
                      ? 'bg-red-500'
                      : timeline.riskScore > 30
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                  }`}
                />
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Schedule Float</p>
              <p className="text-2xl font-bold">{timeline.totalFloat} days</p>
              <p className="text-xs text-gray-500">Buffer available</p>
            </div>
          </div>

          {/* Critical Path */}
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Critical Path</h3>
            <div className="flex items-center space-x-2 overflow-x-auto">
              {timeline.criticalPath.map((phaseId, idx) => {
                const phase = phases.find((p) => p.id === phaseId);
                return (
                  <React.Fragment key={phaseId}>
                    <div className="flex-shrink-0 px-3 py-1 bg-orange-100 text-orange-800 rounded-md text-sm">
                      {phase?.name}
                    </div>
                    {idx < timeline.criticalPath.length - 1 && (
                      <span className="text-gray-400">→</span>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Recommendations */}
          {timeline.recommendations.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Recommendations</h3>
              <ul className="space-y-2">
                {timeline.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <span className="text-sm">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Gantt Chart View */}
      {selectedView === 'gantt' && timeline && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4">Gantt Chart</h2>

          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Phase list */}
              {timeline.phases.map((phase) => {
                const startOffset = differenceInDays(phase.startDate, timeline.startDate);
                const widthPercentage = (phase.duration / timeline.totalDuration) * 100;
                const leftPercentage = (startOffset / timeline.totalDuration) * 100;

                return (
                  <div key={phase.id} className="relative h-10 mb-2">
                    <div className="absolute left-0 w-32 pr-2 text-sm truncate">
                      {getStatusIcon(phase.status)} {phase.name}
                    </div>
                    <div className="ml-36 relative h-full bg-gray-100 rounded">
                      <div
                        className={`absolute h-full rounded ${getPhaseColor(phase)}`}
                        style={{
                          left: `${leftPercentage}%`,
                          width: `${widthPercentage}%`,
                          opacity: phase.status === 'completed' ? 0.7 : 1,
                        }}
                      >
                        <span className="text-xs text-white px-1">{phase.duration}d</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Council Approval Analysis */}
      {selectedView === 'approval' && approvalPrediction && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4">Council Approval Analysis</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">Predicted Duration</p>
              <p className="text-2xl font-bold">{approvalPrediction.predictedDays} days</p>
              <div className="mt-2 text-xs">
                <p>Best: {approvalPrediction.bestCase} days</p>
                <p>Worst: {approvalPrediction.worstCase} days</p>
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Council</p>
              <p className="text-xl font-bold">{approvalPrediction.council}</p>
              <p className="text-sm mt-1">Confidence: {approvalPrediction.confidence}%</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Performance</p>
              <p className="text-xl font-bold">
                {(councilName &&
                  councilApprovalData[councilName as keyof typeof councilApprovalData]
                    ?.performance_rating) ||
                  'Unknown'}
              </p>
            </div>
          </div>

          {/* Impact Factors */}
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Impact Factors</h3>
            <div className="space-y-2">
              {approvalPrediction.factors.map((factor, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">{factor.factor}</span>
                  <span
                    className={`text-sm font-medium ${
                      factor.impact === 'negative'
                        ? 'text-red-600'
                        : factor.impact === 'positive'
                          ? 'text-green-600'
                          : 'text-gray-600'
                    }`}
                  >
                    {factor.impact === 'negative' ? '+' : '-'}
                    {Math.abs(factor.days)} days
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Strategies */}
          <div>
            <h3 className="font-semibold mb-2">Optimization Strategies</h3>
            <ul className="space-y-2">
              {approvalPrediction.strategies.map((strategy, idx) => (
                <li key={idx} className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-sm">{strategy}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Schedule Optimization */}
      {selectedView === 'optimization' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4">Schedule Optimization</h2>

          {!optimizedSchedule ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">
                Use AI to optimize your project schedule for maximum efficiency
              </p>
              <button
                onClick={optimizeSchedule}
                disabled={loading}
                className={`px-6 py-3 rounded-md font-medium text-white ${
                  loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {loading ? 'Optimizing...' : 'Optimize Schedule with AI'}
              </button>
            </div>
          ) : (
            <div>
              {/* Improvements */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Days Saved</p>
                  <p className="text-2xl font-bold text-green-600">
                    {optimizedSchedule.improvements.savedDays} days
                  </p>
                  <p className="text-xs text-gray-500">
                    {optimizedSchedule.improvements.originalDuration} →{' '}
                    {optimizedSchedule.improvements.optimizedDuration}
                  </p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Risk Reduction</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {optimizedSchedule.improvements.riskReduction}%
                  </p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600">Strategies Applied</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {optimizedSchedule.strategies.length}
                  </p>
                </div>
              </div>

              {/* Optimization Strategies */}
              <div className="mb-6">
                <h3 className="font-semibold mb-2">Applied Strategies</h3>
                <div className="space-y-3">
                  {optimizedSchedule.strategies.map((strategy, idx) => (
                    <div key={idx} className="border-l-4 border-blue-500 pl-3 py-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">
                            {strategy.type.charAt(0).toUpperCase() +
                              strategy.type.slice(1).replace('-', ' ')}
                          </p>
                          <p className="text-sm text-gray-600">{strategy.description}</p>
                          <p className="text-xs text-blue-600 mt-1">{strategy.impact}</p>
                        </div>
                        <span className="text-sm text-gray-500">
                          {strategy.confidence}% confidence
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Insights */}
              {optimizedSchedule.aiInsights.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">AI Insights</h3>
                  <ul className="space-y-2">
                    {optimizedSchedule.aiInsights.map((insight, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-blue-500 mr-2">💡</span>
                        <span className="text-sm">{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Critical Warnings */}
              {optimizedSchedule.criticalWarnings &&
                optimizedSchedule.criticalWarnings.length > 0 && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                    <h3 className="font-semibold text-red-800 mb-2">Critical Warnings</h3>
                    <ul className="space-y-1">
                      {optimizedSchedule.criticalWarnings.map((warning, idx) => (
                        <li key={idx} className="text-sm text-red-700">
                          ⚠️ {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              <button
                onClick={optimizeSchedule}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Re-optimize Schedule
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
