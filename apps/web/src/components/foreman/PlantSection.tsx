'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Truck, Plus, X } from 'lucide-react';

interface PlantEntry {
  plant_id: string;
  hours_used: number;
  notes?: string;
}

interface PlantSectionProps {
  entries: PlantEntry[];
  onChange: (entries: PlantEntry[]) => void;
  organizationId: string;
}

export function PlantSection({ entries, onChange, organizationId }: PlantSectionProps) {
  const [showAddModal, setShowAddModal] = useState(false);

  // Fetch plant contractors
  const { data: contractors = [] } = useQuery({
    queryKey: ['contractors', 'plant'],
    queryFn: async () => {
      const res = await fetch('/api/contractors?type=plant');
      if (!res.ok) throw new Error('Failed to fetch contractors');
      return res.json();
    },
  });

  // Fetch all plant items
  const { data: allPlant = [] } = useQuery({
    queryKey: ['plant', organizationId],
    queryFn: async () => {
      const plant: any[] = [];
      for (const contractor of contractors) {
        const res = await fetch(`/api/contractors/${contractor.id}/plant`);
        if (res.ok) {
          const contractorPlant = await res.json();
          plant.push(...contractorPlant);
        }
      }
      return plant;
    },
    enabled: contractors.length > 0,
  });

  const addPlant = (plantId: string) => {
    if (entries.some((e) => e.plant_id === plantId)) return;

    onChange([...entries, { plant_id: plantId, hours_used: 8, notes: '' }]);
    setShowAddModal(false);
  };

  const updateEntry = (index: number, field: keyof PlantEntry, value: any) => {
    const updated = [...entries];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeEntry = (index: number) => {
    onChange(entries.filter((_, i) => i !== index));
  };

  const getPlantDetails = (plantId: string) => {
    return allPlant.find((p: any) => p.id === plantId);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold">Plant & Equipment ({entries.length})</h2>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Plant
        </button>
      </div>

      {/* Plant entries */}
      <div className="space-y-3">
        {entries.map((entry, index) => {
          const plant = getPlantDetails(entry.plant_id);

          return (
            <div key={index} className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="font-medium">{plant?.name || 'Unknown Plant'}</div>
                  <div className="text-xs text-gray-500">{plant?.contractor?.name}</div>
                </div>
                <button
                  onClick={() => removeEntry(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Hours Used</label>
                  <input
                    type="number"
                    step="0.5"
                    value={entry.hours_used}
                    onChange={(e) => updateEntry(index, 'hours_used', parseFloat(e.target.value))}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                  <input
                    type="text"
                    value={entry.notes || ''}
                    onChange={(e) => updateEntry(index, 'notes', e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                    placeholder="Optional notes..."
                  />
                </div>
              </div>
            </div>
          );
        })}

        {entries.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No plant added yet. Click &ldquo;Add Plant&rdquo; to begin.
          </div>
        )}
      </div>

      {/* Add Plant Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Select Plant</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4">
              {contractors.map((contractor: any) => {
                const contractorPlant = allPlant.filter(
                  (p: any) => p.contractor_id === contractor.id
                );

                if (contractorPlant.length === 0) return null;

                return (
                  <div key={contractor.id} className="mb-4">
                    <div className="text-sm font-medium text-gray-700 mb-2">{contractor.name}</div>
                    <div className="space-y-1">
                      {contractorPlant.map((plant: any) => (
                        <button
                          key={plant.id}
                          onClick={() => addPlant(plant.id)}
                          disabled={entries.some((e) => e.plant_id === plant.id)}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <div className="font-medium">{plant.name}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}

              {allPlant.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No plant available. Contact your manager to add plant.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
