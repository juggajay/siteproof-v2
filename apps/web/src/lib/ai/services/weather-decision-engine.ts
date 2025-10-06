// AI-Powered Weather Decision Engine

import { anthropic, AI_CONFIG } from '../config';
import { weatherAnalyzer, WeatherForecast } from './weather-analyzer';
import { getWeatherRestrictions } from '../knowledge-base/weather-rules';
import type { InspectionData } from '../types';

export interface WeatherDecision {
  decision: 'proceed' | 'postpone' | 'proceed_with_caution';
  confidence: number; // 0-100
  reasoning: string;
  criticalFactors: string[];
  mitigationMeasures?: string[];
  alternativeOptions?: string[];
  optimalWindow?: {
    start: Date;
    end: Date;
    conditions: string;
  };
}

export interface WeatherRiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: Array<{
    factor: string;
    severity: 'low' | 'medium' | 'high';
    impact: string;
    likelihood: number; // 0-100
  }>;
  totalRiskScore: number; // 0-100
}

export class WeatherDecisionEngine {
  /**
   * Make AI-powered decision based on weather conditions
   */
  async makeWeatherDecision(
    inspection: InspectionData,
    forecast?: WeatherForecast[],
    historicalData?: any
  ): Promise<WeatherDecision> {
    try {
      // Get local weather analysis first
      const weatherAnalysis = weatherAnalyzer.analyzeWeatherImpact(inspection, forecast);

      // Prepare context for AI
      const prompt = this.buildDecisionPrompt(
        inspection,
        weatherAnalysis,
        forecast,
        historicalData
      );

      // Get AI decision
      const response = await anthropic.messages.create({
        model: AI_CONFIG.model,
        max_tokens: 2000,
        temperature: 0.2, // Low temperature for consistent decision-making
        system: this.getDecisionSystemPrompt(),
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      // Parse AI response
      const content = response.content[0];
      if (content.type === 'text') {
        const decision = this.parseAIDecision(content.text, weatherAnalysis);
        return decision;
      }

      // Fallback to rule-based decision
      return this.makeRuleBasedDecision(inspection, weatherAnalysis);
    } catch (error) {
      console.error('AI decision failed, falling back to rules:', error);
      const weatherAnalysis = weatherAnalyzer.analyzeWeatherImpact(inspection, forecast);
      return this.makeRuleBasedDecision(inspection, weatherAnalysis);
    }
  }

  /**
   * Assess weather-related risks
   */
  async assessWeatherRisks(
    inspection: InspectionData,
    forecast?: WeatherForecast[]
  ): Promise<WeatherRiskAssessment> {
    const riskFactors: WeatherRiskAssessment['riskFactors'] = [];
    let totalRiskScore = 0;

    // Analyze current conditions
    if (inspection.weather.conditions === 'rainy' || inspection.weather.conditions === 'wet') {
      riskFactors.push({
        factor: 'Active precipitation',
        severity: 'high',
        impact: 'Work quality compromise, safety hazards',
        likelihood: 100,
      });
      totalRiskScore += 30;
    }

    // Recent rainfall impact
    if (inspection.weather.recentRainfall) {
      const { amount, daysAgo } = inspection.weather.recentRainfall;

      if (inspection.materials?.type === 'clay' && amount > 40 && daysAgo < 21) {
        riskFactors.push({
          factor: 'Insufficient drying time',
          severity: 'high',
          impact: 'Compaction failure, settlement issues',
          likelihood: 90,
        });
        totalRiskScore += 35;
      }
    }

    // Temperature extremes
    const temp = inspection.weather.temperature;
    if (temp > 35 || temp < 5) {
      riskFactors.push({
        factor: 'Extreme temperature',
        severity: temp > 40 || temp < 0 ? 'high' : 'medium',
        impact: 'Material performance issues, worker safety',
        likelihood: 100,
      });
      totalRiskScore += temp > 40 || temp < 0 ? 25 : 15;
    }

    // Forecast risks
    if (forecast && forecast.length > 0) {
      const next48Hours = forecast.slice(0, 2);
      const heavyRain = next48Hours.find((day) => day.rainfall > 25);

      if (heavyRain) {
        riskFactors.push({
          factor: 'Incoming severe weather',
          severity: 'high',
          impact: 'Work interruption, damage to incomplete work',
          likelihood: 80,
        });
        totalRiskScore += 20;
      }
    }

    // Calculate overall risk level
    let overallRisk: WeatherRiskAssessment['overallRisk'] = 'low';
    if (totalRiskScore >= 70) overallRisk = 'critical';
    else if (totalRiskScore >= 50) overallRisk = 'high';
    else if (totalRiskScore >= 30) overallRisk = 'medium';

    return {
      overallRisk,
      riskFactors,
      totalRiskScore: Math.min(100, totalRiskScore),
    };
  }

  /**
   * Build prompt for AI decision
   */
  private buildDecisionPrompt(
    inspection: InspectionData,
    weatherAnalysis: any,
    forecast?: WeatherForecast[],
    historicalData?: any
  ): string {
    return `
Analyze this construction inspection scenario and provide a weather-based work decision.

WORK DETAILS:
- Type: ${inspection.type}
- Location: ${inspection.location}
- Material: ${inspection.materials?.type || 'not specified'}
- Date: ${inspection.date}

CURRENT WEATHER:
- Conditions: ${inspection.weather.conditions}
- Temperature: ${inspection.weather.temperature}°C
- Recent Rainfall: ${
      inspection.weather.recentRainfall
        ? `${inspection.weather.recentRainfall.amount}mm ${inspection.weather.recentRainfall.daysAgo} days ago`
        : 'None'
    }

WEATHER ANALYSIS:
${JSON.stringify(weatherAnalysis, null, 2)}

${
  forecast
    ? `FORECAST (Next 7 days):
${forecast
  .slice(0, 7)
  .map(
    (f, i) =>
      `Day ${i + 1}: ${f.conditions}, ${f.temperature.min}-${f.temperature.max}°C, ${f.rainfall}mm rain`
  )
  .join('\n')}`
    : ''
}

WEATHER RESTRICTIONS:
${JSON.stringify(getWeatherRestrictions(inspection.type, inspection.materials?.type) || {}, null, 2)}

${
  historicalData
    ? `HISTORICAL CONTEXT:
${JSON.stringify(historicalData, null, 2)}`
    : ''
}

Based on all factors, provide a decision in this JSON format:
{
  "decision": "proceed" | "postpone" | "proceed_with_caution",
  "confidence": [0-100],
  "reasoning": "Brief explanation",
  "criticalFactors": ["factor1", "factor2"],
  "mitigationMeasures": ["measure1", "measure2"],
  "alternativeOptions": ["option1", "option2"]
}

Consider safety, quality, compliance with Australian Standards, and practical feasibility.
`;
  }

  /**
   * Get system prompt for weather decisions
   */
  private getDecisionSystemPrompt(): string {
    return `You are an expert construction weather risk assessor with deep knowledge of:
- Australian construction standards (AS 3798, AS 2870, AS/NZS 3500.3)
- Weather impact on different construction materials and activities
- Safety requirements and quality control measures
- Risk mitigation strategies

Your role is to make evidence-based decisions about whether construction work should proceed based on weather conditions.

Always prioritize:
1. Worker safety
2. Work quality and compliance
3. Long-term durability
4. Cost-effectiveness

Provide clear, actionable recommendations with specific mitigation measures when risks are identified.`;
  }

  /**
   * Parse AI decision from response
   */
  private parseAIDecision(aiResponse: string, weatherAnalysis: any): WeatherDecision {
    try {
      // Extract JSON from response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        return {
          decision: parsed.decision || 'proceed_with_caution',
          confidence: parsed.confidence || 50,
          reasoning: parsed.reasoning || 'Analysis completed',
          criticalFactors: parsed.criticalFactors || [],
          mitigationMeasures: parsed.mitigationMeasures,
          alternativeOptions: parsed.alternativeOptions,
        };
      }
    } catch (error) {
      console.error('Failed to parse AI decision:', error);
    }

    // Fallback
    return this.makeRuleBasedDecision(null, weatherAnalysis);
  }

  /**
   * Rule-based decision fallback
   */
  private makeRuleBasedDecision(
    _inspection: InspectionData | null,
    weatherAnalysis: any
  ): WeatherDecision {
    const decision: WeatherDecision = {
      decision: 'proceed',
      confidence: 75,
      reasoning: 'Based on standard weather rules',
      criticalFactors: [],
    };

    if (!weatherAnalysis.canProceed) {
      decision.decision = 'postpone';
      decision.confidence = 90;
      decision.reasoning = 'Weather conditions do not meet minimum requirements';
      decision.criticalFactors = weatherAnalysis.restrictions;
      decision.alternativeOptions = [
        'Wait for better conditions',
        'Consider alternative materials',
        'Reschedule work',
      ];
    } else if (weatherAnalysis.warnings.length > 2 || weatherAnalysis.dryingTimeRequired) {
      decision.decision = 'proceed_with_caution';
      decision.confidence = 60;
      decision.reasoning = 'Proceed with additional precautions';
      decision.criticalFactors = weatherAnalysis.warnings;
      decision.mitigationMeasures = weatherAnalysis.recommendations;
    }

    return decision;
  }

  /**
   * Generate contingency plan for weather events
   */
  generateContingencyPlan(
    workType: string,
    _forecast: WeatherForecast[]
  ): {
    triggers: Array<{ condition: string; action: string }>;
    preparations: string[];
    equipment: string[];
    communication: string[];
  } {
    const plan = {
      triggers: [] as Array<{ condition: string; action: string }>,
      preparations: [] as string[],
      equipment: [] as string[],
      communication: [] as string[],
    };

    // Common triggers
    plan.triggers.push(
      { condition: 'Rain starts during work', action: 'Cover work area, secure materials' },
      { condition: 'Temperature exceeds 35°C', action: 'Implement heat stress protocols' },
      { condition: 'Wind speed >40km/h', action: 'Secure loose materials, suspend crane ops' }
    );

    // Work-specific preparations
    switch (workType) {
      case 'concrete':
        plan.preparations.push(
          'Check curing compound availability',
          'Prepare plastic sheeting for rain protection',
          'Verify backup pour schedule'
        );
        plan.equipment.push(
          'Plastic sheeting (200m²)',
          'Curing compound sprayer',
          'Temperature monitoring equipment'
        );
        break;

      case 'earthworks':
        plan.preparations.push(
          'Identify material stockpile coverage',
          'Check erosion control measures',
          'Plan truck routes for wet conditions'
        );
        plan.equipment.push('Tarps for stockpiles', 'Silt fences', 'Dewatering pumps');
        break;

      case 'drainage':
        plan.preparations.push(
          'Review trench shoring requirements',
          'Check dewatering capacity',
          'Identify safe egress points'
        );
        plan.equipment.push('Trench boxes', 'Submersible pumps', 'Safety barriers');
        break;
    }

    // Communication plan
    plan.communication.push(
      'Notify site supervisor of weather changes',
      'Update subcontractors 24hrs before weather events',
      'Document decisions in daily diary',
      'Photo record of protection measures'
    );

    return plan;
  }
}

// Export singleton instance
export const weatherDecisionEngine = new WeatherDecisionEngine();
