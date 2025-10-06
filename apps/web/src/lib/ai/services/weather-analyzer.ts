// Weather Analysis Service for Construction Activities

import { weatherRestrictions, getWeatherRestrictions } from '../knowledge-base/weather-rules';
import type { InspectionData } from '../types';
import { differenceInDays, subDays, format } from 'date-fns';

export interface WeatherAnalysis {
  canProceed: boolean;
  restrictions: string[];
  warnings: string[];
  recommendations: string[];
  dryingTimeRequired?: number; // in days
  optimalConditions?: string;
  criticalFactors: Array<{
    factor: string;
    status: 'pass' | 'fail' | 'warning';
    detail: string;
  }>;
}

export interface WeatherForecast {
  date: Date;
  temperature: { min: number; max: number };
  rainfall: number; // mm
  conditions: 'sunny' | 'cloudy' | 'rainy' | 'stormy';
  windSpeed?: number; // km/h
}

export class WeatherAnalyzer {
  /**
   * Analyze weather conditions for construction work
   */
  analyzeWeatherImpact(inspection: InspectionData, forecast?: WeatherForecast[]): WeatherAnalysis {
    const analysis: WeatherAnalysis = {
      canProceed: true,
      restrictions: [],
      warnings: [],
      recommendations: [],
      criticalFactors: [],
    };

    // Get weather restrictions for the work type
    const restrictions = getWeatherRestrictions(inspection.type, inspection.materials?.type);

    if ('error' in restrictions) {
      analysis.warnings.push('No specific weather restrictions found for this work type');
      return analysis;
    }

    // Analyze based on work type
    switch (inspection.type) {
      case 'earthworks':
        this.analyzeEarthworksWeather(inspection, analysis, restrictions);
        break;
      case 'concrete':
        this.analyzeConcreteWeather(inspection, analysis, restrictions);
        break;
      case 'drainage':
        this.analyzeDrainageWeather(inspection, analysis, restrictions);
        break;
    }

    // Check forecast if provided
    if (forecast && forecast.length > 0) {
      this.analyzeForecast(inspection, forecast, analysis);
    }

    return analysis;
  }

  /**
   * Analyze earthworks weather conditions
   */
  private analyzeEarthworksWeather(
    inspection: InspectionData,
    analysis: WeatherAnalysis,
    restrictions: any
  ): void {
    const material = inspection.materials?.type || 'general';
    const materialRestrictions = restrictions[material] || restrictions;

    // Check current weather conditions
    if (inspection.weather.conditions === 'rainy' || inspection.weather.conditions === 'wet') {
      if (material === 'clay') {
        analysis.canProceed = false;
        analysis.restrictions.push('Clay placement not permitted in rain or on saturated subgrade');
        analysis.criticalFactors.push({
          factor: 'Current Weather',
          status: 'fail',
          detail: 'Rain/wet conditions prevent clay placement',
        });
      } else if (material === 'sand') {
        analysis.warnings.push('Sand placement may proceed with caution in light rain');
        analysis.criticalFactors.push({
          factor: 'Current Weather',
          status: 'warning',
          detail: 'Monitor moisture content during placement',
        });
      }
    }

    // Check recent rainfall impact
    if (inspection.weather.recentRainfall && material === 'clay') {
      const { amount, daysAgo } = inspection.weather.recentRainfall;
      let requiredDryingDays = 0;

      if (amount >= 40) {
        requiredDryingDays = 21;
      } else if (amount >= 25) {
        requiredDryingDays = 14;
      } else if (amount >= 10) {
        requiredDryingDays = 7;
      }

      if (requiredDryingDays > 0 && daysAgo < requiredDryingDays) {
        const remainingDays = requiredDryingDays - daysAgo;
        analysis.canProceed = false;
        analysis.dryingTimeRequired = remainingDays;
        analysis.restrictions.push(
          `Clay requires ${remainingDays} more days of drying after ${amount}mm rainfall`
        );
        analysis.criticalFactors.push({
          factor: 'Drying Time',
          status: 'fail',
          detail: `${daysAgo}/${requiredDryingDays} days completed`,
        });
        analysis.recommendations.push(
          `Wait ${remainingDays} days or consider alternative materials`,
          'Perform moisture content testing before placement'
        );
      }
    }

    // Check temperature
    if (inspection.weather.temperature < -5 || inspection.weather.temperature > 40) {
      analysis.warnings.push(
        `Temperature ${inspection.weather.temperature}°C outside optimal range (-5°C to 40°C)`
      );
      analysis.criticalFactors.push({
        factor: 'Temperature',
        status: 'warning',
        detail: `${inspection.weather.temperature}°C may affect compaction`,
      });
    }
  }

  /**
   * Analyze concrete weather conditions
   */
  private analyzeConcreteWeather(
    inspection: InspectionData,
    analysis: WeatherAnalysis,
    restrictions: any
  ): void {
    const temp = inspection.weather.temperature;
    const placement = restrictions.placement;

    // Check temperature limits
    if (temp < 5) {
      analysis.canProceed = false;
      analysis.restrictions.push('Concrete placement not permitted below 5°C');
      analysis.criticalFactors.push({
        factor: 'Temperature',
        status: 'fail',
        detail: `${temp}°C below minimum requirement`,
      });
    } else if (temp > 35) {
      analysis.canProceed = false;
      analysis.restrictions.push('Concrete placement not recommended above 35°C');
      analysis.recommendations.push(
        'Schedule pour for early morning',
        'Use retarders and ice in mix water',
        'Provide shade and windbreaks'
      );
      analysis.criticalFactors.push({
        factor: 'Temperature',
        status: 'fail',
        detail: `${temp}°C exceeds maximum for placement`,
      });
    } else if (temp < 10) {
      analysis.warnings.push('Cold weather concreting procedures required');
      analysis.recommendations.push(
        'Use accelerators in mix',
        'Provide insulation/heating for curing',
        'Extend curing period to 14-21 days'
      );
      analysis.criticalFactors.push({
        factor: 'Temperature',
        status: 'warning',
        detail: 'Cold weather procedures required',
      });
    } else if (temp > 30) {
      analysis.warnings.push('Hot weather concreting procedures required');
      analysis.recommendations.push(
        'Wet cure every 3 hours',
        'Use retarders in mix',
        'Keep aggregates cool with water spray'
      );
      analysis.criticalFactors.push({
        factor: 'Temperature',
        status: 'warning',
        detail: 'Hot weather procedures required',
      });
    }

    // Check rain conditions
    if (inspection.weather.conditions === 'rainy') {
      analysis.canProceed = false;
      analysis.restrictions.push('Concrete placement not permitted during rain');
      analysis.criticalFactors.push({
        factor: 'Rainfall',
        status: 'fail',
        detail: 'Rain prevents concrete placement',
      });
    }

    // Set optimal conditions
    analysis.optimalConditions = 'Temperature 15-25°C, overcast, low wind';
  }

  /**
   * Analyze drainage weather conditions
   */
  private analyzeDrainageWeather(
    inspection: InspectionData,
    analysis: WeatherAnalysis,
    restrictions: any
  ): void {
    // Check for rain forecast (trench stability)
    if (inspection.weather.conditions === 'rainy' || inspection.weather.conditions === 'wet') {
      analysis.warnings.push('Trench collapse risk increased in wet conditions');
      analysis.recommendations.push(
        'Install shoring before excavation',
        'Pump out water continuously',
        'Monitor trench walls for movement'
      );
      analysis.criticalFactors.push({
        factor: 'Trench Stability',
        status: 'warning',
        detail: 'Wet conditions increase collapse risk',
      });
    }

    // Check recent rainfall impact on excavation
    if (inspection.weather.recentRainfall && inspection.weather.recentRainfall.amount > 25) {
      analysis.warnings.push('Ground may be saturated - dewatering likely required');
      analysis.recommendations.push(
        'Check water table level before excavation',
        'Have dewatering equipment on standby',
        'Consider postponing if water table is high'
      );
      analysis.criticalFactors.push({
        factor: 'Ground Conditions',
        status: 'warning',
        detail: 'Recent rainfall may have raised water table',
      });
    }
  }

  /**
   * Analyze weather forecast impact
   */
  private analyzeForecast(
    inspection: InspectionData,
    forecast: WeatherForecast[],
    analysis: WeatherAnalysis
  ): void {
    // Check next 7 days
    const nextWeek = forecast.slice(0, 7);

    // Check for rain in critical periods
    const rainyDays = nextWeek.filter((day) => day.rainfall > 0);

    if (inspection.type === 'concrete' && rainyDays.length > 0) {
      const criticalCuringDays = nextWeek.slice(0, 3); // First 3 days critical for concrete
      const rainInCritical = criticalCuringDays.some((day) => day.rainfall > 5);

      if (rainInCritical) {
        analysis.warnings.push('Rain forecast during critical curing period');
        analysis.recommendations.push('Prepare protective covers for fresh concrete');
      }
    }

    if (inspection.type === 'earthworks' && inspection.materials?.type === 'clay') {
      const significantRain = nextWeek.find((day) => day.rainfall > 25);
      if (significantRain) {
        const daysUntilRain = nextWeek.indexOf(significantRain);
        analysis.warnings.push(
          `Significant rain (${significantRain.rainfall}mm) forecast in ${daysUntilRain} days`
        );
        analysis.recommendations.push(
          'Complete and protect clay fills before rain',
          'Prepare drainage and erosion control measures'
        );
      }
    }

    // Check for extreme temperatures
    const extremeHot = nextWeek.find((day) => day.temperature.max > 35);
    const extremeCold = nextWeek.find((day) => day.temperature.min < 5);

    if (extremeHot) {
      analysis.warnings.push(`Extreme heat (${extremeHot.temperature.max}°C) forecast`);
    }
    if (extremeCold) {
      analysis.warnings.push(`Low temperature (${extremeCold.temperature.min}°C) forecast`);
    }
  }

  /**
   * Generate weather-based work recommendations
   */
  generateWorkRecommendations(
    workType: string,
    currentWeather: InspectionData['weather'],
    forecast?: WeatherForecast[]
  ): string[] {
    const recommendations: string[] = [];

    // Temperature-based recommendations
    if (currentWeather.temperature > 30) {
      recommendations.push(
        'Schedule work for early morning (before 10am)',
        'Provide shade and rest areas for workers',
        'Increase hydration breaks every hour'
      );
    } else if (currentWeather.temperature < 10) {
      recommendations.push(
        'Allow extra time for equipment warm-up',
        'Check material temperatures before use',
        'Monitor for ice formation overnight'
      );
    }

    // Work type specific
    switch (workType) {
      case 'earthworks':
        if (currentWeather.recentRainfall && currentWeather.recentRainfall.amount > 10) {
          recommendations.push(
            'Test moisture content before compaction',
            'Have pumps ready for water removal',
            'Check access roads for trafficability'
          );
        }
        break;

      case 'concrete':
        if (currentWeather.conditions === 'sunny' && currentWeather.temperature > 25) {
          recommendations.push(
            'Dampen subgrade before pour',
            'Have curing compound ready for immediate application',
            'Order concrete with retarder admixture'
          );
        }
        break;

      case 'drainage':
        recommendations.push(
          'Check weather forecast for next 48 hours',
          'Have trench shields/shoring available',
          'Prepare temporary drainage diversions'
        );
        break;
    }

    return recommendations;
  }

  /**
   * Calculate optimal work window
   */
  findOptimalWorkWindow(
    workType: string,
    material: string | undefined,
    forecast: WeatherForecast[],
    durationDays: number = 1
  ): { start: Date; end: Date; score: number } | null {
    let bestWindow = null;
    let bestScore = -1;

    for (let i = 0; i <= forecast.length - durationDays; i++) {
      const window = forecast.slice(i, i + durationDays);
      const score = this.scoreWorkWindow(workType, material, window);

      if (score > bestScore) {
        bestScore = score;
        bestWindow = {
          start: window[0].date,
          end: window[window.length - 1].date,
          score,
        };
      }
    }

    return bestWindow;
  }

  /**
   * Score a work window based on weather conditions
   */
  private scoreWorkWindow(
    workType: string,
    material: string | undefined,
    window: WeatherForecast[]
  ): number {
    let score = 100;

    for (const day of window) {
      // Rainfall penalty
      if (day.rainfall > 0) {
        score -= day.rainfall * 2;
      }

      // Temperature penalties
      if (workType === 'concrete') {
        if (day.temperature.max > 35 || day.temperature.min < 5) {
          score -= 50;
        } else if (day.temperature.max > 30 || day.temperature.min < 10) {
          score -= 20;
        }
      }

      // Wind penalties
      if (day.windSpeed && day.windSpeed > 40) {
        score -= 15;
      }

      // Material-specific penalties
      if (material === 'clay' && day.rainfall > 10) {
        score -= 30; // Heavy penalty for clay work in rain
      }
    }

    return Math.max(0, score);
  }
}

// Export singleton instance
export const weatherAnalyzer = new WeatherAnalyzer();
