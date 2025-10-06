// Tool for retrieving Australian Standard requirements
import { getStandard } from '../knowledge-base/australian-standards';

export const getStandardTool = {
  name: 'get_australian_standard',
  description:
    'Retrieves specific requirements from Australian Standards for construction and civil engineering',
  input_schema: {
    type: 'object' as const,
    properties: {
      standard_code: {
        type: 'string',
        enum: ['AS_3798', 'AS_NZS_3500_3', 'AS_2870', 'AS_4671'],
        description: 'The Australian Standard code to retrieve',
      },
      section: {
        type: 'string',
        description: 'Optional specific section within the standard',
      },
    },
    required: ['standard_code'],
  },
};

export async function executeGetStandard(input: {
  standard_code: string;
  section?: string;
}): Promise<any> {
  try {
    const standard = getStandard(input.standard_code, input.section);

    if (!standard) {
      return {
        error: `Standard ${input.standard_code} or section ${input.section} not found`,
      };
    }

    return {
      standard_code: input.standard_code,
      section: input.section || 'full_standard',
      data: standard,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to retrieve standard',
    };
  }
}
