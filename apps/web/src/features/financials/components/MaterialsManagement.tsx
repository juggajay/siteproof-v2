'use client';

import React, { useState } from 'react';
import { Package, Plus, Search, Edit2 } from 'lucide-react';
import { Button } from '@siteproof/design-system';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Material {
  id: string;
  material_code?: string;
  name: string;
  description?: string;
  category?: string;
  subcategory?: string;
  unit_of_measure: string;
  unit_cost?: number;
  is_active: boolean;
}

interface MaterialsManagementProps {
  supplierId?: string;
  supplierName?: string;
  canManage: boolean;
  showFinancials: boolean;
}

export function MaterialsManagement({
  supplierId,
  supplierName: _supplierName,
  canManage,
  showFinancials,
}: MaterialsManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Fetch materials
  const { data: materials, isLoading } = useQuery({
    queryKey: ['materials', supplierId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (supplierId) params.append('supplier_id', supplierId);
      if (filterCategory) params.append('category', filterCategory);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/materials?${params}`);
      if (!response.ok) throw new Error('Failed to fetch materials');
      const data = await response.json();
      return data.materials;
    },
  });

  const filteredMaterials = materials?.filter((item: Material) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.name.toLowerCase().includes(searchLower) ||
      item.description?.toLowerCase().includes(searchLower) ||
      item.material_code?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Materials</h3>
          <span className="px-2 py-1 text-sm font-medium text-gray-600 bg-gray-100 rounded-full">
            {filteredMaterials?.length || 0}
          </span>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Add Material
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search materials..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Categories</option>
          <option value="Concrete">Concrete</option>
          <option value="Steel">Steel</option>
          <option value="Timber">Timber</option>
          <option value="Electrical">Electrical</option>
          <option value="Plumbing">Plumbing</option>
          <option value="Other">Other</option>
        </select>
      </div>

      {/* Materials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : filteredMaterials?.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No materials found</p>
          </div>
        ) : (
          filteredMaterials?.map((item: Material) => (
            <div
              key={item.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="mb-3">
                <h4 className="font-medium text-gray-900">{item.name}</h4>
                {item.material_code && (
                  <p className="text-sm text-gray-500">Code: {item.material_code}</p>
                )}
              </div>

              {item.description && <p className="text-sm text-gray-600 mb-2">{item.description}</p>}

              <div className="space-y-2">
                {item.category && (
                  <div className="text-sm text-gray-600">Category: {item.category}</div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Unit</span>
                  <span className="font-medium">{item.unit_of_measure}</span>
                </div>

                {showFinancials && item.unit_cost && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Unit Cost</span>
                    <span className="font-medium text-green-600">${item.unit_cost.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {canManage && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => toast.info('Edit functionality coming soon')}
                    fullWidth
                  >
                    <Edit2 className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Material Form Modal */}
      {showAddForm && (
        <MaterialForm
          supplierId={supplierId}
          onSave={() => {
            toast.info('Add material functionality coming soon');
            setShowAddForm(false);
          }}
          onClose={() => setShowAddForm(false)}
        />
      )}
    </div>
  );
}

// Material Form Component (simplified)
function MaterialForm({
  material,
  supplierId: _supplierId,
  onSave,
  onClose,
}: {
  material?: Material | null;
  supplierId?: string;
  onSave: (data: Partial<Material>) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<Partial<Material>>(
    material || {
      name: '',
      description: '',
      category: '',
      unit_of_measure: '',
      unit_cost: undefined,
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {material ? 'Edit Material' : 'Add New Material'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Material Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select category</option>
                <option value="Concrete">Concrete</option>
                <option value="Steel">Steel</option>
                <option value="Timber">Timber</option>
                <option value="Electrical">Electrical</option>
                <option value="Plumbing">Plumbing</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit of Measure <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.unit_of_measure}
                onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value })}
                placeholder="e.g., m3, kg, each"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost</label>
            <input
              type="number"
              step="0.01"
              value={formData.unit_cost}
              onChange={(e) =>
                setFormData({ ...formData, unit_cost: parseFloat(e.target.value) || undefined })
              }
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>{material ? 'Update Material' : 'Add Material'}</Button>
        </div>
      </div>
    </div>
  );
}
