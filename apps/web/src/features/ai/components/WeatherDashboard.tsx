'use client';

import React, { useState, useEffect } from 'react';
import {
  weatherDecisionEngine,
  WeatherDecision,
  WeatherRiskAssessment,
} from '@/lib/ai/services/weather-decision-engine';
import { weatherAnalyzer, WeatherForecast } from '@/lib/ai/services/weather-analyzer';
import type { InspectionData } from '@/lib/ai/types';
import { format } from 'date-fns';

interface WeatherDashboardProps {
  inspection: InspectionData;
  forecast?: WeatherForecast[];
  onDecisionMade?: (decision: WeatherDecision) => void;
}

export function WeatherDashboard({ inspection, forecast, onDecisionMade }: WeatherDashboardProps) {
  const [decision, setDecision] = useState<WeatherDecision | null>(null);
  const [riskAssessment, setRiskAssessment] = useState<WeatherRiskAssessment | null>(null);
  const [loading, setLoading] = useState(false);
  const [contingencyPlan, setContingencyPlan] = useState<any>(null);
  const [optimalWindow, setOptimalWindow] = useState<any>(null);

  useEffect(() => {
    analyzeWeather();
  }, [inspection]);

  const analyzeWeather = async () => {
    setLoading(true);
    try {
      // Get weather decision
      const weatherDecision = await weatherDecisionEngine.makeWeatherDecision(inspection, forecast);
      setDecision(weatherDecision);
      onDecisionMade?.(weatherDecision);

      // Get risk assessment
      const risks = await weatherDecisionEngine.assessWeatherRisks(inspection, forecast);
      setRiskAssessment(risks);

      // Generate contingency plan
      const plan = weatherDecisionEngine.generateContingencyPlan(inspection.type, forecast || []);
      setContingencyPlan(plan);

      // Find optimal work window if forecast available
      if (forecast && forecast.length > 0) {
        const window = weatherAnalyzer.findOptimalWorkWindow(
          inspection.type,
          inspection.materials?.type,
          forecast,
          2 // 2-day work window
        );
        setOptimalWindow(window);
      }
    } catch (error) {
      console.error('Weather analysis failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case 'proceed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'postpone':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'proceed_with_caution':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'critical':
        return 'bg-red-600';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getWeatherIcon = (conditions: string) => {
    switch (conditions) {
      case 'sunny':
        return '☀️';
      case 'cloudy':
        return '☁️';
      case 'rainy':
        return '🌧️';
      case 'wet':
        return '💧';
      case 'stormy':
        return '⛈️';
      default:
        return '🌤️';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3">Analyzing weather conditions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Weather Decision Panel */}
      {decision && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4">Weather Decision</h2>

          <div className={`p-4 border-2 rounded-lg ${getDecisionColor(decision.decision)}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg font-bold uppercase">
                {decision.decision.replace('_', ' ')}
              </span>
              <span className="text-sm">Confidence: {decision.confidence}%</span>
            </div>
            <p className="text-sm mb-3">{decision.reasoning}</p>

            {decision.criticalFactors.length > 0 && (
              <div className="mt-3">
                <p className="font-medium text-sm mb-1">Critical Factors:</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {decision.criticalFactors.map((factor, idx) => (
                    <li key={idx}>{factor}</li>
                  ))}
                </ul>
              </div>
            )}

            {decision.mitigationMeasures && (
              <div className="mt-3">
                <p className="font-medium text-sm mb-1">Mitigation Measures:</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {decision.mitigationMeasures.map((measure, idx) => (
                    <li key={idx}>{measure}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Risk Assessment */}
      {riskAssessment && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4">Risk Assessment</h3>

          <div className="flex items-center mb-4">
            <div className={`h-4 w-32 rounded-full ${getRiskColor(riskAssessment.overallRisk)}`}>
              <div
                className="h-full bg-white bg-opacity-30 rounded-full"
                style={{ width: `${100 - riskAssessment.totalRiskScore}%` }}
              />
            </div>
            <span className="ml-3 font-medium">
              {riskAssessment.overallRisk.toUpperCase()} RISK ({riskAssessment.totalRiskScore}%)
            </span>
          </div>

          <div className="space-y-3">
            {riskAssessment.riskFactors.map((risk, idx) => (
              <div key={idx} className="border-l-4 border-gray-300 pl-3 py-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{risk.factor}</p>
                    <p className="text-sm text-gray-600">{risk.impact}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block px-2 py-1 text-xs rounded ${
                        risk.severity === 'high'
                          ? 'bg-red-100 text-red-700'
                          : risk.severity === 'medium'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {risk.severity}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">{risk.likelihood}% likely</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Conditions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold mb-4">Current Conditions</h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-3xl mb-1">{getWeatherIcon(inspection.weather.conditions)}</p>
            <p className="text-sm font-medium">{inspection.weather.conditions}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{inspection.weather.temperature}°C</p>
            <p className="text-sm text-gray-600">Temperature</p>
          </div>
          {inspection.weather.recentRainfall && (
            <div className="text-center">
              <p className="text-2xl font-bold">{inspection.weather.recentRainfall.amount}mm</p>
              <p className="text-sm text-gray-600">
                {inspection.weather.recentRainfall.daysAgo} days ago
              </p>
            </div>
          )}
          <div className="text-center">
            <p className="text-sm font-medium">{inspection.materials?.type || 'N/A'}</p>
            <p className="text-sm text-gray-600">Material</p>
          </div>
        </div>
      </div>

      {/* Optimal Work Window */}
      {optimalWindow && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4">Optimal Work Window</h3>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="font-medium">
              Best Period: {format(new Date(optimalWindow.start), 'MMM dd')} -{' '}
              {format(new Date(optimalWindow.end), 'MMM dd')}
            </p>
            <p className="text-sm text-gray-600 mt-1">Score: {optimalWindow.score}/100</p>
          </div>
        </div>
      )}

      {/* Forecast */}
      {forecast && forecast.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4">7-Day Forecast</h3>
          <div className="grid grid-cols-7 gap-2">
            {forecast.slice(0, 7).map((day, idx) => (
              <div key={idx} className="text-center p-2 border rounded">
                <p className="text-xs font-medium">{format(new Date(day.date), 'EEE')}</p>
                <p className="text-xl my-1">{getWeatherIcon(day.conditions)}</p>
                <p className="text-xs">
                  {day.temperature.max}°/{day.temperature.min}°
                </p>
                {day.rainfall > 0 && <p className="text-xs text-blue-600">{day.rainfall}mm</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contingency Plan */}
      {contingencyPlan && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4">Contingency Plan</h3>

          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Trigger Points</h4>
              <div className="space-y-2">
                {contingencyPlan.triggers.map((trigger: any, idx: number) => (
                  <div key={idx} className="flex items-start">
                    <span className="text-sm text-gray-600 mr-2">•</span>
                    <div className="text-sm">
                      <span className="font-medium">{trigger.condition}:</span> {trigger.action}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Required Equipment</h4>
              <div className="flex flex-wrap gap-2">
                {contingencyPlan.equipment.map((item: string, idx: number) => (
                  <span key={idx} className="px-2 py-1 bg-gray-100 rounded text-sm">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
