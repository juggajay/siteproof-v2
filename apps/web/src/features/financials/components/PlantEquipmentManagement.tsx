'use client';

import React, { useState } from 'react';
import { Truck, Plus, Search, Edit2, Wrench, Fuel, AlertCircle } from 'lucide-react';
import { Button } from '@siteproof/design-system';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Equipment {
  id: string;
  equipment_code?: string;
  name: string;
  description?: string;
  category?: string;
  make?: string;
  model?: string;
  year?: number;
  ownership_type: string;
  hourly_rate?: number;
  daily_rate?: number;
  weekly_rate?: number;
  monthly_rate?: number;
  fuel_cost_per_hour?: number;
  operator_required: boolean;
  status: string;
  last_service_date?: string;
  next_service_date?: string;
  current_hours?: number;
  is_active: boolean;
}

interface PlantEquipmentManagementProps {
  companyId?: string;
  companyName?: string;
  canManage: boolean;
  showFinancials: boolean;
}

export function PlantEquipmentManagement({
  companyId,
  companyName: _companyName,
  canManage,
  showFinancials,
}: PlantEquipmentManagementProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Fetch equipment
  const { data: equipment, isLoading } = useQuery({
    queryKey: ['plant-equipment', companyId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (companyId) params.append('company_id', companyId);
      if (filterStatus) params.append('status', filterStatus);

      const response = await fetch(`/api/plant-equipment?${params}`);
      if (!response.ok) throw new Error('Failed to fetch equipment');
      const data = await response.json();
      return data.equipment;
    },
  });

  // Add equipment mutation
  const addMutation = useMutation({
    mutationFn: async (equipmentData: Partial<Equipment>) => {
      const response = await fetch('/api/plant-equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...equipmentData, company_id: companyId }),
      });
      if (!response.ok) throw new Error('Failed to add equipment');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plant-equipment'] });
      toast.success('Equipment added successfully');
      setShowAddForm(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const filteredEquipment = equipment?.filter((item: Equipment) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.name.toLowerCase().includes(searchLower) ||
      item.category?.toLowerCase().includes(searchLower) ||
      item.make?.toLowerCase().includes(searchLower) ||
      item.model?.toLowerCase().includes(searchLower)
    );
  });

  const statusColors = {
    available: 'bg-green-100 text-green-700',
    in_use: 'bg-blue-100 text-blue-700',
    maintenance: 'bg-yellow-100 text-yellow-700',
    retired: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Truck className="w-6 h-6 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Plant & Equipment</h3>
          <span className="px-2 py-1 text-sm font-medium text-gray-600 bg-gray-100 rounded-full">
            {filteredEquipment?.length || 0}
          </span>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Add Equipment
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search equipment..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Status</option>
          <option value="available">Available</option>
          <option value="in_use">In Use</option>
          <option value="maintenance">Maintenance</option>
          <option value="retired">Retired</option>
        </select>
      </div>

      {/* Equipment Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : filteredEquipment?.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <Truck className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No equipment found</p>
          </div>
        ) : (
          filteredEquipment?.map((item: Equipment) => (
            <div
              key={item.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-medium text-gray-900">{item.name}</h4>
                  <p className="text-sm text-gray-500">
                    {item.make} {item.model} {item.year && `(${item.year})`}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    statusColors[item.status as keyof typeof statusColors]
                  }`}
                >
                  {item.status.replace('_', ' ')}
                </span>
              </div>

              {item.category && (
                <div className="text-sm text-gray-600 mb-2">Category: {item.category}</div>
              )}

              {showFinancials && (
                <div className="space-y-1 mb-3">
                  {item.hourly_rate && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Hourly</span>
                      <span className="font-medium">${item.hourly_rate}/hr</span>
                    </div>
                  )}
                  {item.daily_rate && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Daily</span>
                      <span className="font-medium">${item.daily_rate}/day</span>
                    </div>
                  )}
                  {item.fuel_cost_per_hour && (
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Fuel className="w-3 h-3" />
                      <span>${item.fuel_cost_per_hour}/hr fuel</span>
                    </div>
                  )}
                </div>
              )}

              {/* Service Status */}
              <div className="pt-3 border-t border-gray-100">
                {item.next_service_date && (
                  <div className="flex items-center gap-2 text-sm">
                    {new Date(item.next_service_date) < new Date() ? (
                      <>
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        <span className="text-red-600">Service overdue</span>
                      </>
                    ) : (
                      <>
                        <Wrench className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">
                          Next service: {format(new Date(item.next_service_date), 'dd/MM/yyyy')}
                        </span>
                      </>
                    )}
                  </div>
                )}
                {item.current_hours !== undefined && (
                  <div className="text-sm text-gray-600 mt-1">
                    {item.current_hours} operating hours
                  </div>
                )}
              </div>

              {canManage && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setSelectedEquipment(item)}
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

      {/* Add/Edit Equipment Form Modal */}
      {(showAddForm || selectedEquipment) && (
        <EquipmentForm
          equipment={selectedEquipment}
          companyId={companyId}
          onSave={(data) => {
            if (selectedEquipment) {
              // Update mutation would go here
              toast.info('Update functionality coming soon');
            } else {
              addMutation.mutate(data);
            }
          }}
          onClose={() => {
            setShowAddForm(false);
            setSelectedEquipment(null);
          }}
        />
      )}
    </div>
  );
}

// Equipment Form Component
function EquipmentForm({
  equipment,
  companyId: _companyId,
  onSave,
  onClose,
}: {
  equipment?: Equipment | null;
  companyId?: string;
  onSave: (data: Partial<Equipment>) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<Partial<Equipment>>(
    equipment || {
      name: '',
      description: '',
      category: '',
      make: '',
      model: '',
      year: undefined,
      ownership_type: 'owned',
      hourly_rate: undefined,
      daily_rate: undefined,
      weekly_rate: undefined,
      monthly_rate: undefined,
      fuel_cost_per_hour: undefined,
      operator_required: false,
      status: 'available',
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {equipment ? 'Edit Equipment' : 'Add New Equipment'}
          </h2>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Equipment Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g., Excavator, Crane"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ownership Type</label>
              <select
                value={formData.ownership_type}
                onChange={(e) => setFormData({ ...formData, ownership_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="owned">Owned</option>
                <option value="leased">Leased</option>
                <option value="rented">Rented</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
              <input
                type="text"
                value={formData.make}
                onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <input
                type="number"
                value={formData.year}
                onChange={(e) =>
                  setFormData({ ...formData, year: parseInt(e.target.value) || undefined })
                }
                min="1900"
                max={new Date().getFullYear() + 1}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="available">Available</option>
                <option value="in_use">In Use</option>
                <option value="maintenance">Maintenance</option>
                <option value="retired">Retired</option>
              </select>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Rates</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Hourly Rate</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.hourly_rate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      hourly_rate: parseFloat(e.target.value) || undefined,
                    })
                  }
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Daily Rate</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.daily_rate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      daily_rate: parseFloat(e.target.value) || undefined,
                    })
                  }
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Weekly Rate</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.weekly_rate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      weekly_rate: parseFloat(e.target.value) || undefined,
                    })
                  }
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Fuel Cost/Hr</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.fuel_cost_per_hour}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      fuel_cost_per_hour: parseFloat(e.target.value) || undefined,
                    })
                  }
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.operator_required}
                onChange={(e) => setFormData({ ...formData, operator_required: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Operator Required</span>
            </label>
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>{equipment ? 'Update Equipment' : 'Add Equipment'}</Button>
        </div>
      </div>
    </div>
  );
}
