'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Truck, Search, Fuel } from 'lucide-react';
import { Button } from '@siteproof/design-system';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

interface PlantEntry {
  id?: string;
  equipment_id?: string;
  equipment_name: string;
  equipment_type: string;
  supplier_id: string;
  supplier_name?: string;
  start_time: string;
  end_time: string;
  total_hours: number;
  operator_id?: string;
  operator_name: string;
  hourly_rate?: number;
  fuel_cost?: number;
  total_cost?: number;
  work_performed: string;
}

interface PlantSectionProps {
  entries: PlantEntry[];
  onChange: (entries: PlantEntry[]) => void;
  showFinancials?: boolean;
}

export function PlantSection({ entries, onChange, showFinancials = false }: PlantSectionProps) {
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Fetch companies (contractors and suppliers)
  const { data: companiesData } = useQuery({
    queryKey: ['companies', 'all'],
    queryFn: async () => {
      const response = await fetch('/api/companies?active=true');
      if (!response.ok) throw new Error('Failed to fetch companies');
      return response.json();
    },
  });

  // Fetch equipment for selected company
  const { data: equipment, isLoading: loadingEquipment } = useQuery({
    queryKey: ['plant-equipment', selectedCompany],
    queryFn: async () => {
      if (!selectedCompany) return [];
      const response = await fetch(
        `/api/plant-equipment?company_id=${selectedCompany}&status=available`
      );
      if (!response.ok) throw new Error('Failed to fetch equipment');
      const data = await response.json();
      return data.equipment || [];
    },
    enabled: !!selectedCompany,
  });

  const companies = companiesData?.companies || [];

  const addPlantEntry = (item: any) => {
    const company = companies.find((c: any) => c.id === selectedCompany);
    const newEntry: PlantEntry = {
      equipment_id: item.id,
      equipment_name: item.name,
      equipment_type: item.category || 'General Equipment',
      supplier_id: selectedCompany,
      supplier_name: company?.company_name,
      start_time: '07:00',
      end_time: '17:00',
      total_hours: 8,
      operator_name: '',
      hourly_rate: item.hourly_rate || item.daily_rate ? item.daily_rate / 8 : undefined,
      fuel_cost: item.fuel_cost_per_hour ? item.fuel_cost_per_hour * 8 : undefined,
      total_cost: item.hourly_rate ? item.hourly_rate * 8 : item.daily_rate,
      work_performed: '',
    };

    onChange([...entries, newEntry]);
    toast.success(`Added ${newEntry.equipment_name} to plant`);
  };

  const removeEntry = (index: number) => {
    onChange(entries.filter((_, i) => i !== index));
  };

  const updateEntry = (index: number, updates: Partial<PlantEntry>) => {
    const updated = [...entries];
    updated[index] = { ...updated[index], ...updates };

    // Recalculate hours and cost if times changed
    if (updates.start_time || updates.end_time) {
      const entry = updated[index];
      const start = new Date(`2000-01-01 ${entry.start_time}`);
      const end = new Date(`2000-01-01 ${entry.end_time}`);
      const hoursUsed = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

      updated[index].total_hours = Math.max(0, hoursUsed);

      // Calculate cost
      if (entry.hourly_rate) {
        const equipmentCost = hoursUsed * entry.hourly_rate;
        const fuelCost = entry.fuel_cost ? (entry.fuel_cost / 8) * hoursUsed : 0;
        updated[index].total_cost = equipmentCost + fuelCost;
      }
    }

    onChange(updated);
  };

  const filteredEquipment = equipment?.filter((eq: any) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      eq.name?.toLowerCase().includes(searchLower) ||
      eq.category?.toLowerCase().includes(searchLower) ||
      eq.make?.toLowerCase().includes(searchLower) ||
      eq.model?.toLowerCase().includes(searchLower)
    );
  });

  const totalCost = entries.reduce((sum, entry) => sum + (entry.total_cost || 0), 0);
  const totalEquipment = entries.length;
  const totalHours = entries.reduce((sum, entry) => sum + entry.total_hours, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Truck className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold">Plant & Equipment</h3>
          <span className="px-2 py-1 text-sm font-medium text-gray-600 bg-gray-100 rounded-full">
            {totalEquipment} items
          </span>
        </div>
        <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="w-4 h-4 mr-1" />
          Add Equipment
        </Button>
      </div>

      {/* Add Equipment Form */}
      {showAddForm && (
        <div className="p-4 bg-gray-50 rounded-lg space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Company/Supplier
              </label>
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a company...</option>
                {companies.map((company: any) => (
                  <option key={company.id} value={company.id}>
                    {company.company_name} ({company.company_type})
                  </option>
                ))}
              </select>
            </div>

            {selectedCompany && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search Equipment
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search equipment..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Equipment List */}
          {selectedCompany && (
            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
              {loadingEquipment ? (
                <div className="p-4 text-center text-gray-500">Loading equipment...</div>
              ) : filteredEquipment?.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No equipment available</div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredEquipment?.map((item: any) => (
                    <div
                      key={item.id}
                      className="p-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                      onClick={() => addPlantEntry(item)}
                    >
                      <div>
                        <div className="font-medium text-gray-900">{item.name}</div>
                        <div className="text-sm text-gray-500">
                          {item.category} {item.make && `- ${item.make} ${item.model || ''}`}
                        </div>
                      </div>
                      {showFinancials && (
                        <div className="text-right">
                          {item.hourly_rate && (
                            <div className="text-sm text-gray-600">${item.hourly_rate}/hr</div>
                          )}
                          {item.daily_rate && (
                            <div className="text-sm text-gray-600">${item.daily_rate}/day</div>
                          )}
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

      {/* Plant Entries */}
      <div className="space-y-3">
        {entries.map((entry, index) => (
          <div key={index} className="p-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-medium text-gray-900">{entry.equipment_name}</h4>
                <p className="text-sm text-gray-500">
                  {entry.equipment_type} • {entry.supplier_name}
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
                <label className="block text-xs font-medium text-gray-500 mb-1">Start Time</label>
                <input
                  type="time"
                  value={entry.start_time}
                  onChange={(e) => updateEntry(index, { start_time: e.target.value })}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">End Time</label>
                <input
                  type="time"
                  value={entry.end_time}
                  onChange={(e) => updateEntry(index, { end_time: e.target.value })}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Total Hours</label>
                <div className="px-2 py-1 text-sm bg-gray-50 border border-gray-200 rounded">
                  {entry.total_hours.toFixed(1)}h
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Operator</label>
                <input
                  type="text"
                  value={entry.operator_name}
                  onChange={(e) => updateEntry(index, { operator_name: e.target.value })}
                  placeholder="Operator name"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-500 mb-1">Work Performed</label>
              <input
                type="text"
                value={entry.work_performed}
                onChange={(e) => updateEntry(index, { work_performed: e.target.value })}
                placeholder="Describe work performed..."
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {showFinancials && entry.total_cost !== undefined && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    {entry.hourly_rate && (
                      <span className="text-gray-500">Rate: ${entry.hourly_rate}/hr</span>
                    )}
                    {entry.fuel_cost && (
                      <span className="text-gray-500 flex items-center gap-1">
                        <Fuel className="w-3 h-3" />${entry.fuel_cost.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <span className="font-medium text-green-600">${entry.total_cost.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary */}
      {entries.length > 0 && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Total Equipment:</span>
              <span className="ml-2 font-medium">{totalEquipment}</span>
            </div>
            <div>
              <span className="text-gray-500">Total Hours:</span>
              <span className="ml-2 font-medium">{totalHours.toFixed(1)}</span>
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
