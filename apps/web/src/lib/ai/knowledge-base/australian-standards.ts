// Australian Standards Knowledge Base for Construction and Civil Engineering

export const AS_3798 = {
  code: 'AS 3798',
  title: 'Guidelines on earthworks for commercial and residential developments',
  year: 2007,
  sections: {
    level_1_supervision: {
      title: 'Level 1 - Full Time Engineering Supervision',
      requirements: {
        compaction: {
          minimum_density: '98% of Maximum Dry Density (MDD)',
          test_frequency: '1 test per 500m³ minimum',
          test_method: 'AS 1289.5.1.1 or AS 1289.5.3.1',
        },
        hold_points: [
          'Inspection before placing fill',
          'After each layer before next layer',
          'Final inspection before sign-off',
        ],
        documentation: 'Detailed daily records required',
        application: 'High-risk sites, deep fills (>3m), critical infrastructure',
      },
    },
    level_2_supervision: {
      title: 'Level 2 - Part Time Engineering Supervision',
      requirements: {
        compaction: {
          minimum_density: '95% of Maximum Dry Density (MDD)',
          test_frequency: '1 test per 1000m³ minimum',
          test_method: 'AS 1289.5.1.1 or AS 1289.5.3.1',
        },
        hold_points: ['After foundation preparation', 'At subgrade level', 'Final inspection'],
        documentation: 'Regular inspection records',
        application: 'Standard residential, moderate fills (1-3m)',
      },
    },
    level_3_supervision: {
      title: 'Level 3 - Minimal Engineering Input',
      requirements: {
        compaction: {
          minimum_density: '95% of Maximum Dry Density (MDD)',
          test_frequency: '1 test per 2000m³ minimum',
          test_method: 'AS 1289.5.1.1',
        },
        hold_points: ['Final inspection only'],
        documentation: 'Basic compliance certificate',
        application: 'Low-risk sites, shallow fills (<1m)',
      },
    },
    material_requirements: {
      title: 'Fill Material Requirements',
      specifications: {
        clay: {
          plasticity_index: 'PI < 35 for structural fill',
          organic_content: '< 5%',
          particle_size: 'Maximum 75mm',
          moisture_content: 'Within -2% to +2% of OMC',
        },
        sand: {
          grading: 'Well-graded preferred',
          fines_content: '< 15%',
          organic_content: '< 0.5%',
          moisture_content: 'As required for compaction',
        },
        rock: {
          maximum_size: '2/3 of layer thickness or 150mm',
          degradation: 'Los Angeles value < 40',
          void_filling: 'Required with approved material',
        },
      },
    },
    layer_thickness: {
      title: 'Compacted Layer Thickness',
      limits: {
        cohesive_soil: '150-250mm compacted thickness',
        granular_soil: '200-300mm compacted thickness',
        rock_fill: '300-600mm depending on equipment',
      },
    },
  },
};

export const AS_NZS_3500_3 = {
  code: 'AS/NZS 3500.3',
  title: 'Plumbing and drainage - Stormwater drainage',
  year: 2021,
  sections: {
    gradients: {
      title: 'Minimum Gradients',
      requirements: {
        pipes_up_to_300mm: {
          minimum: '1.0% (1:100)',
          recommended: '1.65% (1:60)',
        },
        pipes_over_300mm: {
          minimum: '0.5% (1:200)',
          recommended: '1.0% (1:100)',
        },
        surface_drains: {
          paved: '1.0% minimum',
          grassed: '2.0% minimum',
        },
      },
    },
    cover_depths: {
      title: 'Minimum Cover Requirements',
      requirements: {
        under_traffic: {
          rigid_pipes: '300mm minimum',
          flexible_pipes: '450mm minimum',
          heavy_traffic: '600mm minimum',
        },
        no_traffic: {
          all_pipes: '300mm minimum',
          property_drainage: '225mm acceptable',
        },
        maximum_cover: {
          standard: '6m without special design',
          note: 'Structural analysis required over 6m',
        },
      },
    },
    pipe_bedding: {
      title: 'Bedding Requirements',
      types: {
        type_1: {
          description: 'Concrete encasement',
          application: 'Under roads, high loads',
        },
        type_2: {
          description: 'Granular bedding and selected backfill',
          application: 'Standard installations',
        },
        type_3: {
          description: 'Granular bedding with ordinary backfill',
          application: 'Low traffic areas',
        },
      },
    },
  },
};

export const AS_2870 = {
  code: 'AS 2870',
  title: 'Residential slabs and footings',
  year: 2011,
  sections: {
    site_classification: {
      title: 'Site Classifications',
      classes: {
        A: {
          description: 'Stable, non-reactive',
          characteristic_movement: '0mm',
          typical_sites: 'Sand and rock sites with little or no ground movement',
        },
        S: {
          description: 'Slightly reactive',
          characteristic_movement: '0-20mm',
          typical_sites: 'Slightly reactive clay sites',
        },
        M: {
          description: 'Moderately reactive',
          characteristic_movement: '20-40mm',
          typical_sites: 'Moderately reactive clay or silt sites',
        },
        H1: {
          description: 'Highly reactive',
          characteristic_movement: '40-60mm',
          typical_sites: 'Highly reactive clay sites',
        },
        H2: {
          description: 'Highly reactive',
          characteristic_movement: '60-75mm',
          typical_sites: 'Highly reactive clay sites',
        },
        E: {
          description: 'Extremely reactive',
          characteristic_movement: '>75mm',
          typical_sites: 'Extremely reactive sites',
        },
        P: {
          description: 'Problem sites',
          characteristic_movement: 'Variable',
          typical_sites: 'Requires specific engineering design',
        },
      },
    },
    edge_beams: {
      title: 'Edge Beam Requirements',
      minimum_dimensions: {
        class_A: {
          depth: '300mm',
          width: '300mm',
        },
        class_S: {
          depth: '400mm',
          width: '300mm',
        },
        class_M: {
          depth: '400mm',
          width: '400mm',
        },
        class_H1: {
          depth: '500mm',
          width: '400mm',
        },
        class_H2: {
          depth: '600mm',
          width: '400mm',
        },
      },
    },
  },
};

export const AS_4671 = {
  code: 'AS/NZS 4671',
  title: 'Steel reinforcing materials',
  year: 2019,
  sections: {
    grades: {
      title: 'Steel Grades',
      types: {
        R250N: {
          yield_strength: '250 MPa',
          application: 'Light reinforcement, stirrups',
        },
        D500N: {
          yield_strength: '500 MPa',
          application: 'General reinforcement, ductility class N',
        },
        D500L: {
          yield_strength: '500 MPa',
          application: 'Seismic applications, ductility class L',
        },
        D500E: {
          yield_strength: '500 MPa',
          application: 'Seismic applications, ductility class E',
        },
      },
    },
    cover_requirements: {
      title: 'Concrete Cover to Reinforcement',
      exposure_conditions: {
        A1: {
          description: 'Mild - indoor',
          minimum_cover: '20mm',
        },
        A2: {
          description: 'Moderate - above ground exterior',
          minimum_cover: '30mm',
        },
        B1: {
          description: 'Moderate - in ground',
          minimum_cover: '40mm',
        },
        B2: {
          description: 'Severe - in ground aggressive',
          minimum_cover: '50mm',
        },
        C: {
          description: 'Very severe - marine',
          minimum_cover: '65mm',
        },
      },
    },
  },
};

// Helper function to get standard requirements
export function getStandard(code: string, section?: string): any {
  const standards: Record<string, any> = {
    AS_3798: AS_3798,
    AS_NZS_3500_3: AS_NZS_3500_3,
    AS_2870: AS_2870,
    AS_4671: AS_4671,
  };

  const standard = standards[code];
  if (!standard) {
    throw new Error(`Standard ${code} not found`);
  }

  if (section) {
    return standard.sections[section] || null;
  }

  return standard;
}

// Get compaction requirements for a specific supervision level
export function getCompactionRequirements(supervisionLevel: string): any {
  const level = AS_3798.sections[`${supervisionLevel}_supervision`];
  if (!level) {
    throw new Error(`Supervision level ${supervisionLevel} not found`);
  }
  return level.requirements.compaction;
}

// Get drainage gradient requirements
export function getDrainageGradients(pipeSize: number): any {
  if (pipeSize <= 300) {
    return AS_NZS_3500_3.sections.gradients.requirements.pipes_up_to_300mm;
  } else {
    return AS_NZS_3500_3.sections.gradients.requirements.pipes_over_300mm;
  }
}

// Get minimum cover depth requirements
export function getCoverDepth(
  trafficCondition: 'under_traffic' | 'no_traffic',
  pipeType?: 'rigid' | 'flexible'
): any {
  const section = AS_NZS_3500_3.sections.cover_depths.requirements[trafficCondition];
  if (pipeType && trafficCondition === 'under_traffic') {
    return section[`${pipeType}_pipes`] || section;
  }
  return section;
}

// Get site classification details
export function getSiteClass(className: string): any {
  return AS_2870.sections.site_classification.classes[className] || null;
}

// Get reinforcement grade specifications
export function getReinforcementGrade(grade: string): any {
  return AS_4671.sections.grades.types[grade] || null;
}
