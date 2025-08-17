'use client';

import React from 'react';
import { Users, Truck, Package, DollarSign, Clock, Building } from 'lucide-react';

interface LiveSummaryPanelProps {
  labourEntries: any[];
  plantEntries: any[];
  materialEntries: any[];
  showFinancials?: boolean;
}

export function LiveSummaryPanel({
  labourEntries,
  plantEntries,
  materialEntries,
  showFinancials = false,
}: LiveSummaryPanelProps) {
  // Calculate totals
  const totalWorkers = labourEntries.length;
  const uniqueCompanies = new Set([
    ...labourEntries.map((entry) => entry.company_id),
    ...plantEntries.map((entry) => entry.supplier_id),
    ...materialEntries.map((entry) => entry.supplier_id),
  ]).size;

  const totalHours =
    labourEntries.reduce((sum, entry) => sum + (entry.total_hours || 0), 0) +
    plantEntries.reduce((sum, entry) => sum + (entry.total_hours || 0), 0);

  const totalEquipment = plantEntries.length;
  const totalMaterials = materialEntries.length;

  const totalCost = showFinancials
    ? labourEntries.reduce((sum, entry) => sum + (entry.total_cost || 0), 0) +
      plantEntries.reduce((sum, entry) => sum + (entry.total_cost || 0), 0) +
      materialEntries.reduce((sum, entry) => sum + (entry.total_cost || 0), 0)
    : 0;

  const hasEntries = totalWorkers > 0 || totalEquipment > 0 || totalMaterials > 0;

  if (!hasEntries) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <div className="text-gray-400 mb-2">
          <Users className="w-8 h-8 mx-auto" />
        </div>
        <p className="text-gray-500">No entries added yet</p>
        <p className="text-sm text-gray-400">
          Use the tabs above to add workers, equipment, and materials
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Summary</h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Workers */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h4 className="font-medium text-blue-900">Workers</h4>
          </div>
          <p className="text-2xl font-bold text-blue-900">{totalWorkers}</p>
          <p className="text-sm text-blue-700">
            {totalHours > 0 && `${totalHours.toFixed(1)} total hours`}
          </p>
        </div>

        {/* Equipment */}
        <div className="bg-orange-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Truck className="w-5 h-5 text-orange-600" />
            <h4 className="font-medium text-orange-900">Equipment</h4>
          </div>
          <p className="text-2xl font-bold text-orange-900">{totalEquipment}</p>
          <p className="text-sm text-orange-700">
            {plantEntries.length > 0 &&
              `${plantEntries.reduce((sum, entry) => sum + (entry.total_hours || 0), 0).toFixed(1)} hours`}
          </p>
        </div>

        {/* Materials */}
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-5 h-5 text-green-600" />
            <h4 className="font-medium text-green-900">Materials</h4>
          </div>
          <p className="text-2xl font-bold text-green-900">{totalMaterials}</p>
          <p className="text-sm text-green-700">deliveries</p>
        </div>

        {/* Companies */}
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Building className="w-5 h-5 text-purple-600" />
            <h4 className="font-medium text-purple-900">Companies</h4>
          </div>
          <p className="text-2xl font-bold text-purple-900">{uniqueCompanies}</p>
          <p className="text-sm text-purple-700">involved</p>
        </div>
      </div>

      {/* Cost Summary */}
      {showFinancials && totalCost > 0 && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-900">Estimated Daily Cost</span>
            </div>
            <span className="text-xl font-bold text-green-600">${totalCost.toFixed(2)}</span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Labour: </span>
              <span className="font-medium">
                ${labourEntries.reduce((sum, entry) => sum + (entry.total_cost || 0), 0).toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Equipment: </span>
              <span className="font-medium">
                ${plantEntries.reduce((sum, entry) => sum + (entry.total_cost || 0), 0).toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Materials: </span>
              <span className="font-medium">
                $
                {materialEntries
                  .reduce((sum, entry) => sum + (entry.total_cost || 0), 0)
                  .toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      {totalHours > 0 && (
        <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>Total Hours: {totalHours.toFixed(1)}</span>
          </div>
          {totalWorkers > 0 && totalHours > 0 && (
            <span>Avg Hours/Worker: {(totalHours / totalWorkers).toFixed(1)}</span>
          )}
        </div>
      )}
    </div>
  );
}
