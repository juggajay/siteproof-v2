// Tool for checking weather-based work restrictions
import {
  getWeatherRestrictions,
  canWorkProceed,
  getDryingTime,
} from '../knowledge-base/weather-rules';

export const checkWeatherTool = {
  name: 'check_weather_restrictions',
  description: 'Checks weather restrictions and determines if construction work can proceed safely',
  input_schema: {
    type: 'object' as const,
    properties: {
      work_type: {
        type: 'string',
        enum: ['earthworks', 'concrete', 'asphalt', 'spray_seal', 'steel_fixing', 'drainage'],
        description: 'Type of construction work',
      },
      material: {
        type: 'string',
        description: 'Material type (e.g., clay, sand, standard, high_strength)',
      },
      temperature: {
        type: 'number',
        description: 'Current temperature in Celsius',
      },
      rainfall_24hr: {
        type: 'number',
        description: 'Rainfall in last 24 hours (mm)',
      },
      rainfall_7day: {
        type: 'number',
        description: 'Rainfall in last 7 days (mm)',
      },
      wind_speed: {
        type: 'number',
        description: 'Wind speed in km/h',
      },
      humidity: {
        type: 'number',
        description: 'Relative humidity percentage',
      },
      last_rain_date: {
        type: 'string',
        description: 'Date of last significant rainfall (ISO format)',
      },
    },
    required: ['work_type'],
  },
};

export async function executeCheckWeather(input: {
  work_type: string;
  material?: string;
  temperature?: number;
  rainfall_24hr?: number;
  rainfall_7day?: number;
  wind_speed?: number;
  humidity?: number;
  last_rain_date?: string;
}): Promise<any> {
  // Get weather restrictions for the work type
  const restrictions = getWeatherRestrictions(input.work_type, input.material);

  if (!restrictions) {
    return {
      work_type: input.work_type,
      can_proceed: true,
      message: 'No specific weather restrictions found',
      recommendations: ['Monitor conditions', 'Use standard safety procedures'],
    };
  }

  // Check if work can proceed
  const assessment = canWorkProceed(
    input.work_type,
    {
      temperature: input.temperature,
      rainfall_24hr: input.rainfall_24hr,
      rainfall_7day: input.rainfall_7day,
      wind_speed: input.wind_speed,
      humidity: input.humidity,
    },
    input.material
  );

  // Calculate drying time if needed
  let drying_status = null;
  if (input.last_rain_date && restrictions.drying_time) {
    const lastRain = new Date(input.last_rain_date);
    const today = new Date();
    const daysSinceRain = Math.floor(
      (today.getTime() - lastRain.getTime()) / (1000 * 60 * 60 * 24)
    );

    drying_status = {
      days_since_rain: daysSinceRain,
      required_drying_days: restrictions.drying_time.after_rain,
      is_dry_enough: daysSinceRain >= restrictions.drying_time.after_rain,
      days_remaining: Math.max(0, restrictions.drying_time.after_rain - daysSinceRain),
    };
  }

  // Build alerts based on conditions
  const alerts: string[] = [];

  if (restrictions.conditions.temperature) {
    if (input.temperature !== undefined) {
      if (
        restrictions.conditions.temperature.min &&
        input.temperature < restrictions.conditions.temperature.min
      ) {
        alerts.push(
          `❌ Temperature ${input.temperature}°C below minimum ${restrictions.conditions.temperature.min}°C`
        );
      }
      if (
        restrictions.conditions.temperature.max &&
        input.temperature > restrictions.conditions.temperature.max
      ) {
        alerts.push(
          `❌ Temperature ${input.temperature}°C exceeds maximum ${restrictions.conditions.temperature.max}°C`
        );
      }
    }
  }

  if (restrictions.conditions.rainfall) {
    if (input.rainfall_24hr !== undefined && restrictions.conditions.rainfall.max_24hr) {
      if (input.rainfall_24hr > restrictions.conditions.rainfall.max_24hr) {
        alerts.push(
          `❌ 24hr rainfall ${input.rainfall_24hr}mm exceeds limit ${restrictions.conditions.rainfall.max_24hr}mm`
        );
      }
    }
  }

  return {
    work_type: input.work_type,
    material: input.material,
    can_proceed: assessment.canProceed,
    risk_level: assessment.canProceed ? 'LOW' : 'HIGH',
    warnings: assessment.warnings,
    restrictions: restrictions.restrictions,
    alerts,
    drying_status,
    recommendations: assessment.canProceed
      ? ['Work can proceed with standard precautions', 'Monitor conditions throughout the day']
      : ['Postpone work until conditions improve', ...assessment.warnings],
    cost_impact: !assessment.canProceed
      ? {
          daily_delay_cost: 5000, // Typical daily delay cost
          crew_standby: 2500,
          equipment_idle: 1500,
        }
      : null,
  };
}
