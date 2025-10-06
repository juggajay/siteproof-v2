// Council approval timeframes and performance data

export interface CouncilData {
  name: string;
  state: string;
  average_days: number;
  statutory_target: number;
  performance_rating: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'POOR' | 'VERY_POOR';
  common_delays: string[];
  peak_periods: string[];
  fast_track_available: boolean;
  notes?: string;
}

export const councilDatabase: CouncilData[] = [
  // NSW Councils
  {
    name: 'Georges River',
    state: 'NSW',
    average_days: 259,
    statutory_target: 40,
    performance_rating: 'VERY_POOR',
    common_delays: [
      'High volume of applications',
      'Complex environmental assessments',
      'Heritage considerations',
      'Traffic impact studies required',
    ],
    peak_periods: ['March-May', 'September-November'],
    fast_track_available: false,
    notes: 'Consistently ranks among slowest councils in NSW',
  },
  {
    name: 'City of Sydney',
    state: 'NSW',
    average_days: 95,
    statutory_target: 40,
    performance_rating: 'POOR',
    common_delays: [
      'Design excellence requirements',
      'Heritage overlays',
      'Complex urban context',
      'Multiple referral authorities',
    ],
    peak_periods: ['February-April', 'August-October'],
    fast_track_available: true,
    notes: 'Fast-track available for complying development',
  },
  {
    name: 'Northern Beaches',
    state: 'NSW',
    average_days: 145,
    statutory_target: 40,
    performance_rating: 'POOR',
    common_delays: [
      'Bushfire assessments',
      'Coastal protection requirements',
      'Flora and fauna studies',
      'Geotechnical reports',
    ],
    peak_periods: ['January-March', 'September-November'],
    fast_track_available: false,
  },
  {
    name: 'Blacktown',
    state: 'NSW',
    average_days: 62,
    statutory_target: 40,
    performance_rating: 'AVERAGE',
    common_delays: ['Growth area infrastructure', 'Flood studies', 'Traffic generation'],
    peak_periods: ['March-May', 'October-December'],
    fast_track_available: true,
  },

  // VIC Councils
  {
    name: 'City of Melbourne',
    state: 'VIC',
    average_days: 78,
    statutory_target: 60,
    performance_rating: 'AVERAGE',
    common_delays: [
      'Urban design requirements',
      'Wind impact studies',
      'Heritage assessments',
      'Public notification periods',
    ],
    peak_periods: ['February-April', 'July-September'],
    fast_track_available: true,
  },
  {
    name: 'City of Casey',
    state: 'VIC',
    average_days: 58,
    statutory_target: 60,
    performance_rating: 'GOOD',
    common_delays: ['Growth area planning', 'Infrastructure contributions', 'Native vegetation'],
    peak_periods: ['March-May', 'September-November'],
    fast_track_available: true,
  },

  // QLD Councils
  {
    name: 'Brisbane City',
    state: 'QLD',
    average_days: 35,
    statutory_target: 35,
    performance_rating: 'EXCELLENT',
    common_delays: [
      'Flood overlay assessments',
      'Character precinct requirements',
      'Transport assessments',
    ],
    peak_periods: ['February-April', 'October-December'],
    fast_track_available: true,
    notes: 'Generally efficient with good online systems',
  },
  {
    name: 'Gold Coast',
    state: 'QLD',
    average_days: 42,
    statutory_target: 35,
    performance_rating: 'GOOD',
    common_delays: ['Coastal management', 'Flood studies', 'Tourism precinct requirements'],
    peak_periods: ['January-March', 'September-November'],
    fast_track_available: true,
  },

  // WA Councils
  {
    name: 'City of Perth',
    state: 'WA',
    average_days: 67,
    statutory_target: 60,
    performance_rating: 'AVERAGE',
    common_delays: ['Design review panel', 'Heritage considerations', 'Plot ratio bonuses'],
    peak_periods: ['March-May', 'August-October'],
    fast_track_available: false,
  },

  // EPA and State Authorities
  {
    name: 'NSW EPA',
    state: 'NSW',
    average_days: 180,
    statutory_target: 90,
    performance_rating: 'POOR',
    common_delays: [
      'Environmental impact statements',
      'Public consultation periods',
      'Technical assessments',
      'Conditions negotiation',
    ],
    peak_periods: ['Year-round high volume'],
    fast_track_available: false,
    notes: 'Environment Protection Authority - state significant developments',
  },
  {
    name: 'WA EPA',
    state: 'WA',
    average_days: 840,
    statutory_target: 130,
    performance_rating: 'VERY_POOR',
    common_delays: [
      'Environmental impact assessments',
      'Appeals process',
      'Public environmental review',
      'Ministerial approval required',
      'Native title considerations',
    ],
    peak_periods: ['Year-round delays'],
    fast_track_available: false,
    notes: 'Longest approval times in Australia for major projects',
  },
];

// Get council data by name
export function getCouncilData(councilName: string): CouncilData | null {
  return (
    councilDatabase.find((council) => council.name.toLowerCase() === councilName.toLowerCase()) ||
    null
  );
}

// Get approval time with risk assessment
export function getCouncilApprovalTime(councilName: string): {
  council: string;
  average_days: number;
  statutory_target: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  recommendation: string;
} {
  const council = getCouncilData(councilName);

  if (!council) {
    return {
      council: councilName,
      average_days: 60,
      statutory_target: 40,
      risk_level: 'MEDIUM',
      recommendation: 'No historical data available - allow standard buffer',
    };
  }

  let risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  let recommendation: string;

  const delayRatio = council.average_days / council.statutory_target;

  if (delayRatio <= 1.2) {
    risk_level = 'LOW';
    recommendation = 'Council generally meets targets - standard timeline acceptable';
  } else if (delayRatio <= 2) {
    risk_level = 'MEDIUM';
    recommendation = 'Allow 50% buffer on statutory timeframe';
  } else if (delayRatio <= 4) {
    risk_level = 'HIGH';
    recommendation = 'Significant delays expected - consider pre-lodgement meetings';
  } else {
    risk_level = 'EXTREME';
    recommendation = 'Extreme delays common - explore alternative approval pathways';
  }

  return {
    council: council.name,
    average_days: council.average_days,
    statutory_target: council.statutory_target,
    risk_level,
    recommendation,
  };
}

// Get councils by performance rating
export function getCouncilsByPerformance(rating: string): CouncilData[] {
  return councilDatabase.filter((council) => council.performance_rating === rating);
}

// Get worst performing councils
export function getWorstCouncils(limit: number = 5): CouncilData[] {
  return [...councilDatabase].sort((a, b) => b.average_days - a.average_days).slice(0, limit);
}

// Get best performing councils
export function getBestCouncils(limit: number = 5): CouncilData[] {
  return [...councilDatabase].sort((a, b) => a.average_days - b.average_days).slice(0, limit);
}

// Calculate delay risk for timeline
export function calculateDelayRisk(
  councilName: string,
  lodgementDate: Date,
  requiredApprovalDate: Date
): {
  available_days: number;
  expected_days: number;
  buffer_days: number;
  risk_assessment: string;
  success_probability: number;
} {
  const council = getCouncilData(councilName);
  const available_days = Math.floor(
    (requiredApprovalDate.getTime() - lodgementDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const expected_days = council?.average_days || 60;
  const buffer_days = available_days - expected_days;

  let risk_assessment: string;
  let success_probability: number;

  if (buffer_days < -30) {
    risk_assessment = 'CRITICAL - Approval highly unlikely by required date';
    success_probability = 0.1;
  } else if (buffer_days < 0) {
    risk_assessment = 'HIGH - Approval unlikely without fast-tracking';
    success_probability = 0.3;
  } else if (buffer_days < 30) {
    risk_assessment = 'MEDIUM - Limited buffer for delays';
    success_probability = 0.6;
  } else if (buffer_days < 60) {
    risk_assessment = 'LOW - Reasonable buffer available';
    success_probability = 0.8;
  } else {
    risk_assessment = 'MINIMAL - Ample time for approval';
    success_probability = 0.95;
  }

  return {
    available_days,
    expected_days,
    buffer_days,
    risk_assessment,
    success_probability,
  };
}
