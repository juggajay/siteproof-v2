// Weather-based construction rules and restrictions

export interface WeatherRestriction {
  work_type: string;
  material?: string;
  conditions: {
    temperature?: {
      min?: number;
      max?: number;
      unit: string;
    };
    rainfall?: {
      max_24hr?: number;
      max_7day?: number;
      unit: string;
    };
    wind?: {
      max_speed?: number;
      unit: string;
    };
    humidity?: {
      min?: number;
      max?: number;
      unit: string;
    };
  };
  restrictions: string[];
  drying_time?: {
    after_rain?: number;
    unit: string;
    note?: string;
  };
}

export const weatherRules: WeatherRestriction[] = [
  // Earthworks - Clay
  {
    work_type: 'earthworks',
    material: 'clay',
    conditions: {
      rainfall: {
        max_24hr: 10,
        max_7day: 50,
        unit: 'mm',
      },
    },
    restrictions: [
      'No compaction if moisture content > OMC + 2%',
      'No earthworks during active rainfall',
      'Requires moisture conditioning if too dry',
      'Protection of exposed surfaces required',
    ],
    drying_time: {
      after_rain: 21,
      unit: 'days',
      note: 'Clay requires extensive drying period after significant rain',
    },
  },

  // Earthworks - Sand
  {
    work_type: 'earthworks',
    material: 'sand',
    conditions: {
      rainfall: {
        max_24hr: 25,
        max_7day: 100,
        unit: 'mm',
      },
    },
    restrictions: [
      'No compaction during heavy rain',
      'Drainage must be maintained',
      'May require moisture addition in dry conditions',
    ],
    drying_time: {
      after_rain: 2,
      unit: 'days',
      note: 'Sand drains quickly but may need re-compaction',
    },
  },

  // Concrete Placement
  {
    work_type: 'concrete',
    material: 'standard',
    conditions: {
      temperature: {
        min: 5,
        max: 35,
        unit: '°C',
      },
      rainfall: {
        max_24hr: 5,
        unit: 'mm',
      },
      wind: {
        max_speed: 40,
        unit: 'km/h',
      },
    },
    restrictions: [
      'Hot weather concreting procedures above 30°C',
      'Cold weather procedures below 10°C',
      'No placement during rain without protection',
      'Rapid moisture loss protection in wind',
      'Curing compound required in hot/windy conditions',
    ],
  },

  // High-strength Concrete
  {
    work_type: 'concrete',
    material: 'high_strength',
    conditions: {
      temperature: {
        min: 10,
        max: 30,
        unit: '°C',
      },
      humidity: {
        min: 40,
        max: 90,
        unit: '%',
      },
    },
    restrictions: [
      'Strict temperature control required',
      'Extended curing period mandatory',
      'Ice or chilled water may be required in hot weather',
      'Heating may be required in cold weather',
    ],
  },

  // Asphalt
  {
    work_type: 'asphalt',
    material: 'dense_graded',
    conditions: {
      temperature: {
        min: 10,
        max: 40,
        unit: '°C',
      },
      rainfall: {
        max_24hr: 0,
        unit: 'mm',
      },
    },
    restrictions: [
      'Surface must be dry',
      'No placement during rain',
      'Minimum air temperature 10°C and rising',
      'Mix temperature monitoring critical',
      'Reduced lift thickness in cold weather',
    ],
    drying_time: {
      after_rain: 1,
      unit: 'days',
      note: 'Surface must be completely dry',
    },
  },

  // Spray Seal
  {
    work_type: 'spray_seal',
    conditions: {
      temperature: {
        min: 15,
        max: 35,
        unit: '°C',
      },
      rainfall: {
        max_24hr: 0,
        unit: 'mm',
      },
      wind: {
        max_speed: 25,
        unit: 'km/h',
      },
    },
    restrictions: [
      'No application if rain expected within 4 hours',
      'Surface must be completely dry',
      'Wind protection required for uniform application',
      'Temperature rising preferred',
    ],
  },

  // Steel Fixing
  {
    work_type: 'steel_fixing',
    conditions: {
      wind: {
        max_speed: 60,
        unit: 'km/h',
      },
      temperature: {
        max: 40,
        unit: '°C',
      },
    },
    restrictions: [
      'Stop work if wind affects crane operations',
      'Heat stress management above 35°C',
      'Lightning risk assessment required',
      'Wet weather PPE if working in rain',
    ],
  },

  // Drainage Installation
  {
    work_type: 'drainage',
    conditions: {
      rainfall: {
        max_24hr: 20,
        unit: 'mm',
      },
    },
    restrictions: [
      'Trenches must be dewatered',
      'Bedding material must not be saturated',
      'Pipe joints must be kept dry during installation',
      'Backfill at optimum moisture content',
    ],
    drying_time: {
      after_rain: 1,
      unit: 'days',
      note: 'Trenches must be pumped dry',
    },
  },
];

// Get weather restrictions for specific work type and material
export function getWeatherRestrictions(
  workType: string,
  material?: string
): WeatherRestriction | null {
  return (
    weatherRules.find(
      (rule) =>
        rule.work_type === workType && (!material || rule.material === material || !rule.material)
    ) || null
  );
}

// Check if work can proceed given current weather
export function canWorkProceed(
  workType: string,
  currentConditions: {
    temperature?: number;
    rainfall_24hr?: number;
    rainfall_7day?: number;
    wind_speed?: number;
    humidity?: number;
  },
  material?: string
): {
  canProceed: boolean;
  warnings: string[];
  restrictions: string[];
} {
  const rule = getWeatherRestrictions(workType, material);

  if (!rule) {
    return {
      canProceed: true,
      warnings: ['No specific weather restrictions found for this work type'],
      restrictions: [],
    };
  }

  const warnings: string[] = [];
  let canProceed = true;

  // Temperature checks
  if (rule.conditions.temperature && currentConditions.temperature !== undefined) {
    if (
      rule.conditions.temperature.min &&
      currentConditions.temperature < rule.conditions.temperature.min
    ) {
      canProceed = false;
      warnings.push(
        `Temperature ${currentConditions.temperature}°C is below minimum ${rule.conditions.temperature.min}°C`
      );
    }
    if (
      rule.conditions.temperature.max &&
      currentConditions.temperature > rule.conditions.temperature.max
    ) {
      canProceed = false;
      warnings.push(
        `Temperature ${currentConditions.temperature}°C exceeds maximum ${rule.conditions.temperature.max}°C`
      );
    }
  }

  // Rainfall checks
  if (rule.conditions.rainfall) {
    if (rule.conditions.rainfall.max_24hr && currentConditions.rainfall_24hr !== undefined) {
      if (currentConditions.rainfall_24hr > rule.conditions.rainfall.max_24hr) {
        canProceed = false;
        warnings.push(
          `24hr rainfall ${currentConditions.rainfall_24hr}mm exceeds maximum ${rule.conditions.rainfall.max_24hr}mm`
        );
      }
    }
    if (rule.conditions.rainfall.max_7day && currentConditions.rainfall_7day !== undefined) {
      if (currentConditions.rainfall_7day > rule.conditions.rainfall.max_7day) {
        canProceed = false;
        warnings.push(
          `7-day rainfall ${currentConditions.rainfall_7day}mm exceeds maximum ${rule.conditions.rainfall.max_7day}mm`
        );
      }
    }
  }

  // Wind checks
  if (rule.conditions.wind && currentConditions.wind_speed !== undefined) {
    if (
      rule.conditions.wind.max_speed &&
      currentConditions.wind_speed > rule.conditions.wind.max_speed
    ) {
      canProceed = false;
      warnings.push(
        `Wind speed ${currentConditions.wind_speed}km/h exceeds maximum ${rule.conditions.wind.max_speed}km/h`
      );
    }
  }

  return {
    canProceed,
    warnings,
    restrictions: rule.restrictions,
  };
}

// Get drying time requirements after rain
export function getDryingTime(workType: string, material?: string): number | null {
  const rule = getWeatherRestrictions(workType, material);
  return rule?.drying_time?.after_rain || null;
}

// Get all weather-sensitive work types
export function getWeatherSensitiveWork(): string[] {
  return [...new Set(weatherRules.map((rule) => rule.work_type))];
}
