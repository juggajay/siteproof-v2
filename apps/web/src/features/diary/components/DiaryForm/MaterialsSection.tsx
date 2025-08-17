'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Package, Search } from 'lucide-react';
import { Button } from '@siteproof/design-system';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

interface MaterialEntry {
  id?: string;
  material_id?: string;
  material_name: string;
  material_type: string;
  supplier_id: string;
  supplier_name?: string;
  quantity: number;
  unit_of_measure: string;
  unit_cost?: number;
  total_cost?: number;
  delivery_ticket: string;
  delivered_by: string;
  location_used: string;
  purpose: string;
}

interface MaterialsSectionProps {
  entries: MaterialEntry[];
  onChange: (entries: MaterialEntry[]) => void;
  showFinancials?: boolean;
}

export function MaterialsSection({
  entries,
  onChange,
  showFinancials = false,
}: MaterialsSectionProps) {
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Fetch suppliers
  const { data: suppliersData } = useQuery({
    queryKey: ['companies', 'suppliers'],
    queryFn: async () => {
      const response = await fetch('/api/companies?type=supplier&active=true');
      if (!response.ok) throw new Error('Failed to fetch suppliers');
      return response.json();
    },
  });

  // Fetch materials for selected supplier
  const { data: materials, isLoading: loadingMaterials } = useQuery({
    queryKey: ['materials', selectedSupplier],
    queryFn: async () => {
      if (!selectedSupplier) return [];
      const response = await fetch(`/api/materials?supplier_id=${selectedSupplier}`);
      if (!response.ok) throw new Error('Failed to fetch materials');
      const data = await response.json();
      return data.materials || [];
    },
    enabled: !!selectedSupplier,
  });

  const suppliers = suppliersData?.companies || [];

  const addMaterialEntry = (material: any) => {
    const supplier = suppliers.find((s: any) => s.id === selectedSupplier);
    const newEntry: MaterialEntry = {
      material_id: material.id,
      material_name: material.name,
      material_type: material.category || 'General',
      supplier_id: selectedSupplier,
      supplier_name: supplier?.company_name,
      quantity: 1,
      unit_of_measure: material.unit_of_measure,
      unit_cost: material.unit_cost,
      total_cost: material.unit_cost || 0,
      delivery_ticket: '',
      delivered_by: '',
      location_used: '',
      purpose: '',
    };

    onChange([...entries, newEntry]);
    toast.success(`Added ${newEntry.material_name} to materials`);
  };

  const removeEntry = (index: number) => {
    onChange(entries.filter((_, i) => i !== index));
  };

  const updateEntry = (index: number, updates: Partial<MaterialEntry>) => {
    const updated = [...entries];
    updated[index] = { ...updated[index], ...updates };

    // Recalculate cost if quantity changed
    if (updates.quantity !== undefined) {
      const entry = updated[index];
      if (entry.unit_cost) {
        updated[index].total_cost = entry.quantity * entry.unit_cost;
      }
    }

    onChange(updated);
  };

  const filteredMaterials = materials?.filter((mat: any) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      mat.name?.toLowerCase().includes(searchLower) ||
      mat.category?.toLowerCase().includes(searchLower) ||
      mat.material_code?.toLowerCase().includes(searchLower)
    );
  });

  const totalCost = entries.reduce((sum, entry) => sum + (entry.total_cost || 0), 0);
  const totalItems = entries.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold">Materials Delivered</h3>
          <span className="px-2 py-1 text-sm font-medium text-gray-600 bg-gray-100 rounded-full">
            {totalItems} deliveries
          </span>
        </div>
        <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="w-4 h-4 mr-1" />
          Add Material
        </Button>
      </div>

      {/* Add Material Form */}
      {showAddForm && (
        <div className="p-4 bg-gray-50 rounded-lg space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Supplier
              </label>
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a supplier...</option>
                {suppliers.map((supplier: any) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.company_name}
                  </option>
                ))}
              </select>
            </div>

            {selectedSupplier && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search Materials
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search materials..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Materials List */}
          {selectedSupplier && (
            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
              {loadingMaterials ? (
                <div className="p-4 text-center text-gray-500">Loading materials...</div>
              ) : filteredMaterials?.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No materials found</div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredMaterials?.map((material: any) => (
                    <div
                      key={material.id}
                      className="p-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                      onClick={() => addMaterialEntry(material)}
                    >
                      <div>
                        <div className="font-medium text-gray-900">{material.name}</div>
                        <div className="text-sm text-gray-500">
                          {material.category} • {material.unit_of_measure}
                        </div>
                      </div>
                      {showFinancials && material.unit_cost && (
                        <div className="text-sm text-gray-600">
                          ${material.unit_cost.toFixed(2)}/{material.unit_of_measure}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Material Entries */}
      <div className="space-y-3">
        {entries.map((entry, index) => (
          <div key={index} className="p-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-medium text-gray-900">{entry.material_name}</h4>
                <p className="text-sm text-gray-500">
                  {entry.material_type} • {entry.supplier_name}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removeEntry(index)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Quantity</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.01"
                    value={entry.quantity}
                    onChange={(e) =>
                      updateEntry(index, { quantity: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-500">{entry.unit_of_measure}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Delivery Ticket
                </label>
                <input
                  type="text"
                  value={entry.delivery_ticket}
                  onChange={(e) => updateEntry(index, { delivery_ticket: e.target.value })}
                  placeholder="Ticket #"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Delivered By</label>
                <input
                  type="text"
                  value={entry.delivered_by}
                  onChange={(e) => updateEntry(index, { delivered_by: e.target.value })}
                  placeholder="Driver name"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Location</label>
                <input
                  type="text"
                  value={entry.location_used}
                  onChange={(e) => updateEntry(index, { location_used: e.target.value })}
                  placeholder="Where used"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-500 mb-1">Purpose/Notes</label>
              <input
                type="text"
                value={entry.purpose}
                onChange={(e) => updateEntry(index, { purpose: e.target.value })}
                placeholder="What was this material used for..."
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {showFinancials && entry.total_cost !== undefined && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {entry.unit_cost ? `$${entry.unit_cost.toFixed(2)} × ${entry.quantity}` : 'Cost'}
                </span>
                <span className="font-medium text-green-600">${entry.total_cost.toFixed(2)}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary */}
      {entries.length > 0 && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Total Deliveries:</span>
              <span className="ml-2 font-medium">{totalItems}</span>
            </div>
            {showFinancials && (
              <div>
                <span className="text-gray-500">Total Cost:</span>
                <span className="ml-2 font-medium text-green-600">${totalCost.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
