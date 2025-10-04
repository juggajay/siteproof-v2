'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Plus, X } from 'lucide-react';

interface LaborEntry {
  worker_id: string;
  hours_worked: number;
  notes?: string;
}

interface LaborSectionProps {
  entries: LaborEntry[];
  onChange: (entries: LaborEntry[]) => void;
  organizationId: string;
}

export function LaborSection({ entries, onChange, organizationId }: LaborSectionProps) {
  const [showAddModal, setShowAddModal] = useState(false);

  // Fetch all labor contractors
  const { data: contractors = [] } = useQuery({
    queryKey: ['contractors', 'labor'],
    queryFn: async () => {
      const res = await fetch('/api/contractors?type=labor');
      if (!res.ok) throw new Error('Failed to fetch contractors');
      return res.json();
    },
  });

  // Fetch all workers
  const { data: allWorkers = [] } = useQuery({
    queryKey: ['workers', organizationId],
    queryFn: async () => {
      const workers: any[] = [];
      for (const contractor of contractors) {
        const res = await fetch(`/api/contractors/${contractor.id}/workers`);
        if (res.ok) {
          const contractorWorkers = await res.json();
          workers.push(...contractorWorkers);
        }
      }
      return workers;
    },
    enabled: contractors.length > 0,
  });

  const addWorker = (workerId: string) => {
    if (entries.some((e) => e.worker_id === workerId)) return;

    onChange([...entries, { worker_id: workerId, hours_worked: 8, notes: '' }]);
    setShowAddModal(false);
  };

  const updateEntry = (index: number, field: keyof LaborEntry, value: any) => {
    const updated = [...entries];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeEntry = (index: number) => {
    onChange(entries.filter((_, i) => i !== index));
  };

  const getWorkerDetails = (workerId: string) => {
    return allWorkers.find((w: any) => w.id === workerId);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold">Labor ({entries.length})</h2>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Worker
        </button>
      </div>

      {/* Worker entries */}
      <div className="space-y-3">
        {entries.map((entry, index) => {
          const worker = getWorkerDetails(entry.worker_id);

          return (
            <div key={index} className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="font-medium">{worker?.name || 'Unknown Worker'}</div>
                  <div className="text-sm text-gray-600">{worker?.job_title}</div>
                  <div className="text-xs text-gray-500">{worker?.contractor?.name}</div>
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
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Hours Worked
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={entry.hours_worked}
                    onChange={(e) => updateEntry(index, 'hours_worked', parseFloat(e.target.value))}
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
            No workers added yet. Click &ldquo;Add Worker&rdquo; to begin.
          </div>
        )}
      </div>

      {/* Add Worker Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Select Worker</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4">
              {contractors.map((contractor: any) => {
                const contractorWorkers = allWorkers.filter(
                  (w: any) => w.contractor_id === contractor.id
                );

                if (contractorWorkers.length === 0) return null;

                return (
                  <div key={contractor.id} className="mb-4">
                    <div className="text-sm font-medium text-gray-700 mb-2">{contractor.name}</div>
                    <div className="space-y-1">
                      {contractorWorkers.map((worker: any) => (
                        <button
                          key={worker.id}
                          onClick={() => addWorker(worker.id)}
                          disabled={entries.some((e) => e.worker_id === worker.id)}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <div className="font-medium">{worker.name}</div>
                          <div className="text-sm text-gray-600">{worker.job_title}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}

              {allWorkers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No workers available. Contact your manager to add workers.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
