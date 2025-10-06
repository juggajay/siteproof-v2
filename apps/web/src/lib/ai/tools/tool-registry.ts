// Comprehensive Tool Registry for Claude Integration

import { getStandardTool, executeGetStandard, getStandard } from './get-standard';
import { checkCompactionTool, executeCheckCompaction } from './check-compaction';
import { councilApprovalTool, executeCouncilApproval } from './council-approval';
import { checkWeatherTool, executeCheckWeather } from './check-weather';
import { getWeatherRestrictions } from '../knowledge-base/weather-rules';
import { getCouncilApprovalTime } from '../knowledge-base/council-data';
import { complianceChecker } from '../services/compliance-checker';
import { weatherAnalyzer } from '../services/weather-analyzer';
import { projectTimelineAnalyzer } from '../services/project-timeline-analyzer';

// Define all available tools
export const allTools = [
  // Australian Standards Tool
  getStandardTool,

  // Compaction Compliance Tool
  checkCompactionTool,

  // Council Approval Timeline Tool
  councilApprovalTool,

  // Weather Restrictions Tool
  checkWeatherTool,

  // Compliance Verification Tool
  {
    name: 'verify_compliance',
    description: `Verify compliance with Australian Standards based on inspection data.
    Checks measurements, materials, and conditions against requirements.
    Returns compliance status, failed requirements, and recommendations.`,

    input_schema: {
      type: 'object' as const,
      properties: {
        inspection_type: {
          type: 'string',
          enum: ['earthworks', 'drainage', 'concrete', 'reinforcement'],
        },
        measurements: {
          type: 'object',
          properties: {
            compaction_density: { type: 'number', description: 'Percentage' },
            moisture_content: { type: 'number', description: 'Percentage' },
            proctor_value: { type: 'number', description: 'Percentage' },
            depth: { type: 'number', description: 'mm' },
            thickness: { type: 'number', description: 'mm' },
            gradient: { type: 'number', description: 'Percentage' },
          },
        },
        material: {
          type: 'string',
          enum: ['clay', 'sand', 'rock', 'concrete', 'steel'],
        },
        recent_rainfall: {
          type: 'object',
          properties: {
            amount: { type: 'number', description: 'mm of rain' },
            days_ago: { type: 'number', description: 'Days since rainfall' },
          },
        },
      },
      required: ['inspection_type'],
    },
  },

  // Weather Decision Tool
  {
    name: 'make_weather_decision',
    description: `Make a go/no-go decision based on weather conditions.
    Analyzes current and forecast weather against work requirements.
    Returns decision, confidence level, and mitigation measures.`,

    input_schema: {
      type: 'object' as const,
      properties: {
        work_type: {
          type: 'string',
          enum: ['earthworks', 'concrete', 'drainage', 'asphalt'],
        },
        current_conditions: {
          type: 'string',
          enum: ['sunny', 'cloudy', 'rainy', 'wet', 'stormy'],
        },
        temperature: {
          type: 'number',
          description: 'Temperature in Celsius',
        },
        material: {
          type: 'string',
          description: 'Material being used',
        },
        recent_rainfall: {
          type: 'object',
          properties: {
            amount: { type: 'number' },
            days_ago: { type: 'number' },
          },
        },
      },
      required: ['work_type', 'current_conditions', 'temperature'],
    },
  },

  // Timeline Prediction Tool
  {
    name: 'predict_project_timeline',
    description: `Predict project timeline including council approvals.
    Analyzes phases, dependencies, and approval requirements.
    Returns optimized schedule with critical path and recommendations.`,

    input_schema: {
      type: 'object' as const,
      properties: {
        council: {
          type: 'string',
          description: 'Council name for approval timeline',
        },
        project_complexity: {
          type: 'string',
          enum: ['simple', 'moderate', 'complex'],
        },
        has_heritage: {
          type: 'boolean',
          description: 'Heritage considerations required',
        },
        has_environmental: {
          type: 'boolean',
          description: 'Environmental assessment required',
        },
        has_traffic_impact: {
          type: 'boolean',
          description: 'Traffic impact assessment required',
        },
        construction_phases: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              duration_days: { type: 'number' },
              dependencies: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          },
        },
      },
      required: ['council', 'project_complexity'],
    },
  },

  // Calculate Compaction Test Frequency Tool
  {
    name: 'calculate_test_frequency',
    description: `Calculate required testing frequency based on AS 3798.
    Determines number of tests needed based on supervision level and volume.
    Returns test requirements and hold points.`,

    input_schema: {
      type: 'object' as const,
      properties: {
        supervision_level: {
          type: 'string',
          enum: ['level_1', 'level_2', 'level_3'],
          description: 'AS 3798 supervision level (1=high risk, 2=medium, 3=low)',
        },
        fill_volume: {
          type: 'number',
          description: 'Volume of fill in cubic meters',
        },
        material_type: {
          type: 'string',
          enum: ['clay', 'sand', 'rock', 'mixed'],
        },
      },
      required: ['supervision_level', 'fill_volume'],
    },
  },

  // Concrete Curing Requirements Tool
  {
    name: 'get_curing_requirements',
    description: `Get concrete curing requirements based on temperature.
    Returns curing time, methods, and special considerations.
    Use for planning concrete placement and protection.`,

    input_schema: {
      type: 'object' as const,
      properties: {
        temperature: {
          type: 'number',
          description: 'Ambient temperature in Celsius',
        },
        concrete_type: {
          type: 'string',
          enum: ['standard', 'high_strength', 'mass_pour'],
        },
        exposure_condition: {
          type: 'string',
          enum: ['protected', 'exposed', 'marine', 'aggressive'],
        },
      },
      required: ['temperature', 'concrete_type'],
    },
  },
];

// Tool execution map
export async function executeTool(toolName: string, input: any): Promise<any> {
  switch (toolName) {
    case 'get_australian_standard':
      return executeGetStandard(input);

    case 'check_compaction_compliance':
      return executeCheckCompaction(input);

    case 'check_weather_restrictions':
      return executeCheckWeather(input);

    case 'get_weather_restrictions':
      return getWeatherRestrictions(input.work_type, input.material);

    case 'get_council_approval_timeline':
      return executeCouncilApproval(input);

    case 'get_council_approval_data':
      return getCouncilApprovalTime(input.council_name);

    case 'verify_compliance':
      return executeComplianceVerification(input);

    case 'make_weather_decision':
      return executeWeatherDecision(input);

    case 'predict_project_timeline':
      return executeTimelinePrediction(input);

    case 'calculate_test_frequency':
      return executeTestFrequencyCalculation(input);

    case 'get_curing_requirements':
      return executeCuringRequirements(input);

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// Tool execution functions
async function executeComplianceVerification(input: any) {
  const inspection = {
    id: 'tool-check',
    projectId: 'tool-project',
    date: new Date(),
    type: input.inspection_type as any,
    location: 'Tool Check Location',
    weather: {
      conditions: 'sunny' as any,
      temperature: 20,
      recentRainfall: input.recent_rainfall
        ? {
            amount: input.recent_rainfall.amount,
            daysAgo: input.recent_rainfall.days_ago,
          }
        : undefined,
    },
    measurements: input.measurements
      ? {
          compaction: {
            density: input.measurements.compaction_density,
            moisture: input.measurements.moisture_content,
            proctor: input.measurements.proctor_value,
          },
          dimensions: {
            depth: input.measurements.depth,
            thickness: input.measurements.thickness,
          },
          gradient: input.measurements.gradient,
        }
      : undefined,
    materials: input.material
      ? {
          type: input.material as any,
        }
      : undefined,
  };

  const standards = ['AS_3798', 'AS_NZS_3500_3', 'AS_2870', 'AS_4671'];
  const results = complianceChecker.checkCompliance(inspection, standards);

  return {
    compliant: results.every((r) => r.compliant),
    results: results.map((r) => ({
      standard: r.standard,
      compliant: r.compliant,
      failed_requirements: r.requirements.filter((req) => req.status === 'fail'),
      recommendations: r.recommendations,
    })),
  };
}

async function executeWeatherDecision(input: any) {
  const inspection = {
    id: 'weather-check',
    projectId: 'weather-project',
    date: new Date(),
    type: input.work_type as any,
    location: 'Weather Check Location',
    weather: {
      conditions: input.current_conditions as any,
      temperature: input.temperature,
      recentRainfall: input.recent_rainfall,
    },
    materials: input.material
      ? {
          type: input.material as any,
        }
      : undefined,
  };

  const analysis = weatherAnalyzer.analyzeWeatherImpact(inspection);

  return {
    decision: analysis.canProceed ? 'proceed' : 'postpone',
    restrictions: analysis.restrictions,
    warnings: analysis.warnings,
    recommendations: analysis.recommendations,
    drying_time_required: analysis.dryingTimeRequired,
  };
}

async function executeTimelinePrediction(input: any) {
  const prediction = projectTimelineAnalyzer.predictApprovalTimeline(
    input.council,
    'construction',
    input.project_complexity,
    {
      heritage: input.has_heritage,
      environmental: input.has_environmental,
      trafficImpact: input.has_traffic_impact,
    }
  );

  // Calculate construction timeline if phases provided
  let constructionDuration = 0;
  let criticalPath = [];

  if (input.construction_phases) {
    constructionDuration = input.construction_phases.reduce(
      (sum: number, phase: any) => sum + phase.duration_days,
      0
    );
    criticalPath = input.construction_phases.map((p: any) => p.name);
  }

  return {
    approval_timeline: {
      predicted_days: prediction.predictedDays,
      best_case: prediction.bestCase,
      worst_case: prediction.worstCase,
      confidence: prediction.confidence,
    },
    construction_duration: constructionDuration,
    total_project_duration: prediction.predictedDays + constructionDuration,
    critical_path: criticalPath,
    strategies: prediction.strategies,
  };
}

async function executeTestFrequencyCalculation(input: any) {
  const standard = getStandard('AS_3798', 'supervision_levels');

  if ('error' in standard) {
    return { error: standard.error };
  }

  const level = standard[input.supervision_level];
  const testFrequency = level.requirements.testing_frequency;

  // Parse frequency (e.g., "1 test per 500m³ minimum")
  const match = testFrequency.match(/1 test per (\d+)m³/);
  const volumePerTest = match ? parseInt(match[1]) : 500;

  const requiredTests = Math.ceil(input.fill_volume / volumePerTest);

  return {
    supervision_level: input.supervision_level,
    fill_volume: input.fill_volume,
    tests_required: requiredTests,
    frequency: testFrequency,
    compaction_requirement: level.requirements.compaction_requirement,
    layer_thickness: level.requirements.layer_thickness,
    hold_points: level.hold_points,
    material_specific: input.material_type
      ? getStandard('AS_3798', 'material_specifications')[input.material_type]
      : null,
  };
}

async function executeCuringRequirements(input: any) {
  const { temperature, concrete_type, exposure_condition = 'protected' } = input;

  let curingDays = 7; // Standard
  let method = 'wet curing or curing compound';
  const special_requirements = [];

  // Temperature adjustments
  if (temperature < 10) {
    curingDays = 14;
    method = 'insulated curing, maintain minimum 10°C';
    special_requirements.push('Use accelerators in mix');
    special_requirements.push('Provide heating if below 5°C');
  } else if (temperature > 30) {
    curingDays = 14;
    method = 'continuous wet curing';
    special_requirements.push('Wet cure every 3 hours');
    special_requirements.push('Use retarders in mix');
    special_requirements.push('Shade concrete from direct sun');
  }

  // Concrete type adjustments
  if (concrete_type === 'high_strength') {
    curingDays = Math.max(curingDays, 14);
    special_requirements.push('Maintain moisture for full curing period');
  } else if (concrete_type === 'mass_pour') {
    special_requirements.push('Monitor temperature differential < 20°C');
    special_requirements.push('Consider cooling pipes if needed');
  }

  // Exposure adjustments
  if (exposure_condition === 'marine' || exposure_condition === 'aggressive') {
    curingDays = Math.max(curingDays, 14);
    special_requirements.push('Extended curing for durability');
  }

  return {
    temperature,
    concrete_type,
    exposure_condition,
    minimum_curing_days: curingDays,
    curing_method: method,
    special_requirements,
    critical_period: 'First 72 hours',
    strength_development: {
      '3_days': '40%',
      '7_days': '70%',
      '28_days': '100%',
    },
  };
}

// Get tool by name
export function getTool(name: string) {
  return allTools.find((tool) => tool.name === name);
}

// Get all tool names
export function getToolNames(): string[] {
  return allTools.map((tool) => tool.name);
}

// Validate tool input
export function validateToolInput(
  toolName: string,
  input: any
): { valid: boolean; errors?: string[] } {
  const tool = getTool(toolName);
  if (!tool) {
    return { valid: false, errors: [`Tool ${toolName} not found`] };
  }

  // Basic validation - could be enhanced with JSON schema validation
  const errors: string[] = [];
  const required = tool.input_schema.required || [];

  for (const field of required) {
    if (!(field in input)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}
