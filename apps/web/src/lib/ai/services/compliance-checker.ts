// Compliance Checker Service for Australian Standards

import { australianStandards, getStandard } from '../knowledge-base/australian-standards';
import { weatherRestrictions, getWeatherRestrictions } from '../knowledge-base/weather-rules';
import { weatherAnalyzer } from './weather-analyzer';
import type { InspectionData, ComplianceCheckResult } from '../types';

export class ComplianceChecker {
  /**
   * Check earthworks compliance against AS 3798
   */
  checkEarthworksCompliance(inspection: InspectionData): ComplianceCheckResult {
    const standard = getStandard('AS_3798');
    if ('error' in standard) {
      throw new Error(standard.error);
    }

    const requirements: ComplianceCheckResult['requirements'] = [];
    const recommendations: string[] = [];
    let compliant = true;

    // Determine supervision level (simplified - would need more context in production)
    const supervisionLevel = 'level_1'; // High risk for this example
    const levelReqs = standard.supervision_levels[supervisionLevel];

    // Check compaction requirements
    if (inspection.measurements?.compaction) {
      const { density, moisture, proctor } = inspection.measurements.compaction;

      // Check proctor density
      if (proctor !== undefined) {
        const requiredProctor = parseInt(levelReqs.requirements.compaction_requirement);
        requirements.push({
          description: 'Compaction density requirement',
          required: `${requiredProctor}% Standard Proctor`,
          actual: `${proctor}%`,
          status: proctor >= requiredProctor ? 'pass' : 'fail',
          notes: proctor < requiredProctor ? 'Insufficient compaction achieved' : undefined,
        });

        if (proctor < requiredProctor) {
          compliant = false;
          recommendations.push(
            `Increase compaction to achieve minimum ${requiredProctor}% Standard Proctor`,
            'Consider additional roller passes or moisture adjustment'
          );
        }
      }

      // Check moisture content
      if (moisture !== undefined && inspection.materials?.type) {
        const materialSpec = standard.material_specifications[inspection.materials.type];
        if (materialSpec) {
          const [minMoisture, maxMoisture] = materialSpec.optimum_moisture
            .match(/\d+/g)!
            .map(Number);
          const withinRange = moisture >= minMoisture && moisture <= maxMoisture;

          requirements.push({
            description: 'Moisture content',
            required: materialSpec.optimum_moisture,
            actual: `${moisture}%`,
            status: withinRange ? 'pass' : 'warning',
            notes: !withinRange ? 'Moisture content outside optimal range' : undefined,
          });

          if (!withinRange) {
            recommendations.push(
              moisture < minMoisture
                ? 'Add water to achieve optimal moisture content'
                : 'Allow material to dry before compaction'
            );
          }
        }
      }
    }

    // Check weather conditions using weather rules
    const weatherAnalysis = weatherAnalyzer.analyzeWeatherImpact(inspection);

    // Integrate weather compliance checks
    if (!weatherAnalysis.canProceed) {
      compliant = false;
      weatherAnalysis.restrictions.forEach((restriction) => {
        requirements.push({
          description: 'Weather restriction',
          required: 'Suitable weather conditions',
          actual: inspection.weather.conditions,
          status: 'fail',
          notes: restriction,
        });
      });
      recommendations.push(...weatherAnalysis.recommendations);
    }

    // Check weather conditions for clay specifically
    if (inspection.materials?.type === 'clay' && inspection.weather.recentRainfall) {
      const { amount, daysAgo } = inspection.weather.recentRainfall;
      const weatherRules = getWeatherRestrictions('earthworks', 'clay');

      if (!('error' in weatherRules)) {
        // Check drying time based on rainfall amount
        let requiredDryingDays = 0;
        if (amount >= 40) {
          requiredDryingDays = 21;
        } else if (amount >= 25) {
          requiredDryingDays = 14;
        } else if (amount >= 10) {
          requiredDryingDays = 7;
        }

        if (requiredDryingDays > 0 && daysAgo < requiredDryingDays) {
          requirements.push({
            description: 'Clay drying time after rainfall',
            required: `${requiredDryingDays} days after ${amount}mm rainfall`,
            actual: `${daysAgo} days since ${amount}mm rainfall`,
            status: 'fail',
            notes: 'Insufficient drying time for clay placement per weather rules',
          });
          compliant = false;
          recommendations.push(
            `Wait ${requiredDryingDays - daysAgo} more days before placing clay fill`,
            'Consider using alternative fill material if schedule is critical',
            'Perform moisture content testing before proceeding'
          );
        }
      }
    }

    // Check layer thickness
    if (inspection.measurements?.dimensions?.thickness) {
      const maxThickness = 300; // mm
      const { thickness } = inspection.measurements.dimensions;

      requirements.push({
        description: 'Layer thickness before compaction',
        required: `${maxThickness}mm maximum`,
        actual: `${thickness}mm`,
        status: thickness <= maxThickness ? 'pass' : 'fail',
        notes: thickness > maxThickness ? 'Layer too thick for effective compaction' : undefined,
      });

      if (thickness > maxThickness) {
        compliant = false;
        recommendations.push('Reduce layer thickness to maximum 300mm before compaction');
      }
    }

    // Define hold points
    const holdPoints: ComplianceCheckResult['holdPoints'] = [
      {
        description: 'Formation level approval',
        status: 'pending',
      },
      {
        description: 'Each layer compaction approval',
        status: 'pending',
      },
      {
        description: 'Underground service protection',
        status: 'pending',
      },
    ];

    return {
      compliant,
      standard: 'AS_3798',
      section: 'Earthworks supervision and testing',
      requirements,
      recommendations,
      holdPoints,
    };
  }

  /**
   * Check drainage compliance against AS/NZS 3500.3
   */
  checkDrainageCompliance(inspection: InspectionData): ComplianceCheckResult {
    const standard = getStandard('AS_NZS_3500_3');
    if ('error' in standard) {
      throw new Error(standard.error);
    }

    const requirements: ComplianceCheckResult['requirements'] = [];
    const recommendations: string[] = [];
    let compliant = true;

    // Check gradient requirements
    if (
      inspection.measurements?.gradient !== undefined &&
      inspection.measurements?.dimensions?.width
    ) {
      const pipeDiameter = inspection.measurements.dimensions.width; // Assuming width represents pipe diameter
      const actualGradient = inspection.measurements.gradient;

      // Find the appropriate minimum gradient
      let minGradient = 1.0; // Default 1% for 100mm

      if (pipeDiameter >= 300) {
        minGradient = 0.5;
      } else if (pipeDiameter >= 225) {
        minGradient = 0.67;
      } else if (pipeDiameter >= 150) {
        minGradient = 0.83;
      }

      requirements.push({
        description: 'Minimum pipe gradient',
        required: `${minGradient}%`,
        actual: `${actualGradient}%`,
        status: actualGradient >= minGradient ? 'pass' : 'fail',
        notes:
          actualGradient < minGradient ? 'Insufficient gradient for proper drainage' : undefined,
      });

      if (actualGradient < minGradient) {
        compliant = false;
        recommendations.push(
          `Adjust pipe gradient to achieve minimum ${minGradient}%`,
          'Check for settlement or installation errors'
        );
      }
    }

    // Define drainage hold points
    const holdPoints: ComplianceCheckResult['holdPoints'] = [
      {
        description: 'Trench formation and bedding approval',
        status: 'pending',
      },
      {
        description: 'Pipe laid before backfill',
        status: 'pending',
      },
      {
        description: 'CCTV inspection for pipes >150mm diameter',
        status:
          inspection.measurements?.dimensions?.width &&
          inspection.measurements.dimensions.width > 150
            ? 'pending'
            : 'not_applicable',
      },
      {
        description: 'Final connection to system',
        status: 'pending',
      },
    ];

    return {
      compliant,
      standard: 'AS_NZS_3500_3',
      section: 'Stormwater drainage',
      requirements,
      recommendations,
      holdPoints,
    };
  }

  /**
   * Check concrete/slab compliance against AS 2870
   */
  checkSlabCompliance(inspection: InspectionData, siteClass: string = 'M'): ComplianceCheckResult {
    const standard = getStandard('AS_2870');
    if ('error' in standard) {
      throw new Error(standard.error);
    }

    const requirements: ComplianceCheckResult['requirements'] = [];
    const recommendations: string[] = [];
    let compliant = true;

    const classification = standard.classifications[siteClass];
    if (!classification) {
      throw new Error(`Invalid site classification: ${siteClass}`);
    }

    // Check footing depth
    if (inspection.measurements?.dimensions?.depth) {
      const requiredDepth = parseInt(classification.footing_depth);
      const actualDepth = inspection.measurements.dimensions.depth;

      if (!isNaN(requiredDepth)) {
        requirements.push({
          description: `Footing depth for Class ${siteClass} site`,
          required: `${requiredDepth}mm minimum`,
          actual: `${actualDepth}mm`,
          status: actualDepth >= requiredDepth ? 'pass' : 'fail',
          notes:
            actualDepth < requiredDepth
              ? 'Insufficient footing depth for site classification'
              : undefined,
        });

        if (actualDepth < requiredDepth) {
          compliant = false;
          recommendations.push(
            `Increase footing depth to minimum ${requiredDepth}mm for Class ${siteClass} site`,
            'Verify site classification with geotechnical engineer'
          );
        }
      }
    }

    return {
      compliant,
      standard: 'AS_2870',
      section: `Site Class ${siteClass} - ${classification.description}`,
      requirements,
      recommendations,
    };
  }

  /**
   * Check reinforcement compliance against AS 4671
   */
  checkReinforcementCompliance(inspection: InspectionData): ComplianceCheckResult {
    const standard = getStandard('AS_4671');
    if ('error' in standard) {
      throw new Error(standard.error);
    }

    const requirements: ComplianceCheckResult['requirements'] = [];
    const recommendations: string[] = [];
    let compliant = true;

    // Determine exposure condition (would need more context in production)
    const exposure = 'protected'; // Example
    const requiredCover = standard.cover_requirements[exposure];

    if (inspection.measurements?.dimensions?.thickness) {
      const actualCover = inspection.measurements.dimensions.thickness;
      const minCover = parseInt(requiredCover);

      requirements.push({
        description: `Concrete cover for ${exposure} conditions`,
        required: requiredCover,
        actual: `${actualCover}mm`,
        status: actualCover >= minCover ? 'pass' : 'fail',
        notes: actualCover < minCover ? 'Insufficient concrete cover for reinforcement' : undefined,
      });

      if (actualCover < minCover) {
        compliant = false;
        recommendations.push(
          `Increase concrete cover to minimum ${minCover}mm`,
          'Use appropriate spacers to maintain cover during pour'
        );
      }
    }

    return {
      compliant,
      standard: 'AS_4671',
      section: 'Steel reinforcement requirements',
      requirements,
      recommendations,
    };
  }

  /**
   * Main compliance check method that routes to specific checks
   */
  checkCompliance(inspection: InspectionData, standards: string[]): ComplianceCheckResult[] {
    const results: ComplianceCheckResult[] = [];

    for (const standardCode of standards) {
      try {
        switch (standardCode) {
          case 'AS_3798':
            if (inspection.type === 'earthworks') {
              results.push(this.checkEarthworksCompliance(inspection));
            }
            break;

          case 'AS_NZS_3500_3':
            if (inspection.type === 'drainage') {
              results.push(this.checkDrainageCompliance(inspection));
            }
            break;

          case 'AS_2870':
            if (inspection.type === 'concrete') {
              results.push(this.checkSlabCompliance(inspection));
            }
            break;

          case 'AS_4671':
            if (inspection.type === 'reinforcement') {
              results.push(this.checkReinforcementCompliance(inspection));
            }
            break;
        }
      } catch (error) {
        console.error(`Error checking compliance for ${standardCode}:`, error);
      }
    }

    return results;
  }
}

// Export singleton instance
export const complianceChecker = new ComplianceChecker();
