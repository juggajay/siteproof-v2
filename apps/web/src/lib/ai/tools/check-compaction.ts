// Tool for checking compaction compliance
import { getCompactionRequirements } from '../knowledge-base/australian-standards';

export const checkCompactionTool = {
  name: 'check_compaction_compliance',
  description:
    'Checks if compaction test results meet AS 3798 requirements based on supervision level',
  input_schema: {
    type: 'object' as const,
    properties: {
      dry_density: {
        type: 'number',
        description: 'Achieved dry density in t/m³',
      },
      max_dry_density: {
        type: 'number',
        description: 'Maximum dry density (MDD) in t/m³ from laboratory testing',
      },
      required_percentage: {
        type: 'number',
        description: 'Required compaction percentage (e.g., 98 for 98%)',
      },
      supervision_level: {
        type: 'string',
        enum: ['level_1', 'level_2', 'level_3'],
        description: 'AS 3798 supervision level',
      },
    },
    required: ['dry_density', 'max_dry_density', 'required_percentage', 'supervision_level'],
  },
};

export async function executeCheckCompaction(input: {
  dry_density: number;
  max_dry_density: number;
  required_percentage: number;
  supervision_level: string;
}): Promise<{
  passes: boolean;
  achieved_percentage: number;
  required_percentage: number;
  deficit?: number;
  standard_reference: string;
  recommendations?: string[];
  cost_impact?: {
    re_compaction: number;
    if_already_covered: number;
  };
}> {
  const achieved_percentage = (input.dry_density / input.max_dry_density) * 100;
  const passes = achieved_percentage >= input.required_percentage;

  const result: any = {
    passes,
    achieved_percentage: Math.round(achieved_percentage * 10) / 10,
    required_percentage: input.required_percentage,
    standard_reference: `AS 3798:2007 ${input.supervision_level}`,
  };

  if (!passes) {
    result.deficit = Math.round((input.required_percentage - achieved_percentage) * 10) / 10;

    result.recommendations = [
      `Re-compact to achieve ${input.required_percentage}% MDD`,
      'Perform additional moisture conditioning if required',
      'Retest after re-compaction',
      'Document remedial action taken',
    ];

    // Cost estimates based on typical rates
    result.cost_impact = {
      re_compaction: 15, // $/m² if accessible
      if_already_covered: 45, // $/m² if excavation required
    };
  }

  return result;
}
