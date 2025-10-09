/**
 * ITP Data Initialization Utility
 *
 * Replaces RPC call with TypeScript implementation for better performance.
 * Initializes empty inspection data structure from template structure.
 */

import type { ITPTemplateStructure, ITPInstanceData, ITPSectionData } from '@/types/itp';

export function initializeInspectionData(templateStructure: ITPTemplateStructure): ITPInstanceData {
  const data: ITPInstanceData = {};

  // Handle sections-based structure
  if (templateStructure?.sections) {
    for (const section of templateStructure.sections) {
      if (!section.id || !section.items) continue;

      const sectionData: ITPSectionData = {};

      for (const item of section.items) {
        if (!item.id) continue;

        // Initialize each item with 'na' (not assessed) status
        sectionData[item.id] = {
          result: 'na' as const,
          notes: '',
          updated_at: new Date().toISOString(),
          updated_by: '',
        };
      }

      data[section.id] = sectionData;
    }
  }

  return data;
}

/**
 * Calculate completion metrics from instance data
 */
export function calculateCompletion(data: ITPInstanceData): {
  totalItems: number;
  completedItems: number;
  completionPercentage: number;
} {
  let totalItems = 0;
  let completedItems = 0;

  for (const sectionData of Object.values(data)) {
    for (const item of Object.values(sectionData)) {
      totalItems++;
      // Items are completed if they have a result that's not 'na' (not assessed)
      if (item.result && item.result !== 'na') {
        completedItems++;
      }
    }
  }

  const completionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return {
    totalItems,
    completedItems,
    completionPercentage,
  };
}
