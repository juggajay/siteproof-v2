'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Package, Plus, X } from 'lucide-react';

interface MaterialEntry {
  material_id?: string;
  material_name: string;
  quantity: number;
  unit?: string;
  supplier_name?: string;
  notes?: string;
}

interface MaterialsSectionProps {
  entries: MaterialEntry[];
  onChange: (entries: MaterialEntry[]) => void;
  organizationId: string;
}

export function MaterialsSection({ entries, onChange, organizationId }: MaterialsSectionProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [customMaterial, setCustomMaterial] = useState({
    name: '',
    quantity: 0,
    unit: '',
    supplier: '',
  });

  // Fetch preloaded materials
  const { data: materials = [] } = useQuery({
    queryKey: ['materials', organizationId],
    queryFn: async () => {
      const res = await fetch(`/api/materials?organization_id=${organizationId}`);
      if (!res.ok) throw new Error('Failed to fetch materials');
      return res.json();
    },
  });

  const addPreloadedMaterial = (materialId: string) => {
    const material = materials.find((m: any) => m.id === materialId);
    if (!material) return;

    onChange([
      ...entries,
      {
        material_id: materialId,
        material_name: material.name,
        quantity: 0,
        unit: material.unit || '',
        supplier_name: material.supplier?.name || '',
        notes: '',
      },
    ]);
    setShowAddModal(false);
  };

  const addCustomMaterial = () => {
    if (!customMaterial.name || customMaterial.quantity <= 0) return;

    onChange([
      ...entries,
      {
        material_name: customMaterial.name,
        quantity: customMaterial.quantity,
        unit: customMaterial.unit,
        supplier_name: customMaterial.supplier,
        notes: '',
      },
    ]);

    setCustomMaterial({ name: '', quantity: 0, unit: '', supplier: '' });
    setShowAddModal(false);
  };

  const updateEntry = (index: number, field: keyof MaterialEntry, value: any) => {
    const updated = [...entries];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeEntry = (index: number) => {
    onChange(entries.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold">Materials ({entries.length})</h2>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Material
        </button>
      </div>

      {/* Material entries */}
      <div className="space-y-3">
        {entries.map((entry, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-3">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="font-medium">{entry.material_name}</div>
                {entry.supplier_name && (
                  <div className="text-xs text-gray-500">{entry.supplier_name}</div>
                )}
              </div>
              <button
                onClick={() => removeEntry(index)}
                className="text-red-600 hover:text-red-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  type="number"
                  step="0.01"
                  value={entry.quantity}
                  onChange={(e) => updateEntry(index, 'quantity', parseFloat(e.target.value))}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Unit</label>
                <input
                  type="text"
                  value={entry.unit || ''}
                  onChange={(e) => updateEntry(index, 'unit', e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  placeholder="m³, kg, etc."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={entry.notes || ''}
                  onChange={(e) => updateEntry(index, 'notes', e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  placeholder="Optional..."
                />
              </div>
            </div>
          </div>
        ))}

        {entries.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No materials added yet. Click &ldquo;Add Material&rdquo; to begin.
          </div>
        )}
      </div>

      {/* Add Material Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Add Material</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4">
              {/* Preloaded materials */}
              {materials.length > 0 && (
                <div className="mb-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    Select from Preloaded Materials
                  </div>
                  <div className="space-y-1">
                    {materials.map((material: any) => (
                      <button
                        key={material.id}
                        onClick={() => addPreloadedMaterial(material.id)}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100"
                      >
                        <div className="font-medium">{material.name}</div>
                        {material.unit && (
                          <div className="text-sm text-gray-600">Unit: {material.unit}</div>
                        )}
                        {material.supplier && (
                          <div className="text-xs text-gray-500">{material.supplier.name}</div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom material */}
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Or Add Custom Material</div>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={customMaterial.name}
                    onChange={(e) => setCustomMaterial({ ...customMaterial, name: e.target.value })}
                    placeholder="Material name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={customMaterial.quantity}
                      onChange={(e) =>
                        setCustomMaterial({
                          ...customMaterial,
                          quantity: parseFloat(e.target.value),
                        })
                      }
                      placeholder="Quantity"
                      className="px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <input
                      type="text"
                      value={customMaterial.unit}
                      onChange={(e) =>
                        setCustomMaterial({ ...customMaterial, unit: e.target.value })
                      }
                      placeholder="Unit (m³, kg)"
                      className="px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <input
                    type="text"
                    value={customMaterial.supplier}
                    onChange={(e) =>
                      setCustomMaterial({ ...customMaterial, supplier: e.target.value })
                    }
                    placeholder="Supplier (optional)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <button
                    onClick={addCustomMaterial}
                    disabled={!customMaterial.name || customMaterial.quantity <= 0}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Add Custom Material
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
