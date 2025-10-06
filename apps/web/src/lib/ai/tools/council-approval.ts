// Tool for council approval timeline analysis
import { getCouncilApprovalTime } from '../knowledge-base/council-data';

export const councilApprovalTool = {
  name: 'get_council_approval_timeline',
  description:
    'Gets council approval timeline estimates and risk assessment based on historical data',
  input_schema: {
    type: 'object' as const,
    properties: {
      council_name: {
        type: 'string',
        description: 'Name of the council or approval authority',
      },
      application_type: {
        type: 'string',
        enum: ['DA', 'CDC', 'CC', 'MOD', 'S96', 'S4.55'],
        description: 'Type of development application',
      },
    },
    required: ['council_name'],
  },
};

export async function executeCouncilApproval(input: {
  council_name: string;
  application_type?: string;
}): Promise<any> {
  const data = getCouncilApprovalTime(input.council_name);

  // Adjust for application type
  let adjustment_factor = 1.0;
  let type_note = '';

  if (input.application_type) {
    switch (input.application_type) {
      case 'CDC':
        adjustment_factor = 0.3;
        type_note = 'CDC typically 10-20 business days';
        break;
      case 'CC':
        adjustment_factor = 0.5;
        type_note = 'Construction Certificate typically faster than DA';
        break;
      case 'MOD':
      case 'S96':
      case 'S4.55':
        adjustment_factor = 0.7;
        type_note = 'Modifications typically 70% of original DA time';
        break;
      default:
        type_note = 'Development Application standard timeline';
    }
  }

  const adjusted_days = Math.round(data.average_days * adjustment_factor);

  return {
    council: data.council,
    application_type: input.application_type || 'DA',
    average_days: adjusted_days,
    statutory_target: data.statutory_target,
    risk_level: data.risk_level,
    recommendation: data.recommendation,
    type_note,
    schedule_allowance: Math.round(adjusted_days * 1.2), // 20% buffer
    critical_path_impact: adjusted_days > 90 ? 'HIGH' : adjusted_days > 60 ? 'MEDIUM' : 'LOW',
  };
}
