'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Users, Search } from 'lucide-react';
import { Button } from '@siteproof/design-system';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

interface LabourEntry {
  id?: string;
  employee_id?: string;
  company_id: string;
  worker_name: string;
  trade: string;
  start_time: string;
  end_time: string;
  break_duration: number;
  total_hours: number;
  overtime_hours: number;
  standard_rate?: number;
  overtime_rate?: number;
  total_cost?: number;
  work_performed: string;
}

interface LabourSectionProps {
  entries: LabourEntry[];
  onChange: (entries: LabourEntry[]) => void;
  showFinancials?: boolean;
}

export function LabourSection({ entries, onChange, showFinancials = false }: LabourSectionProps) {
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Fetch companies
  const { data: companiesData } = useQuery({
    queryKey: ['companies', 'contractors'],
    queryFn: async () => {
      const response = await fetch('/api/companies?type=contractor&active=true');
      if (!response.ok) throw new Error('Failed to fetch companies');
      return response.json();
    },
  });

  // Fetch employees for selected company
  const { data: employees, isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees', selectedCompany],
    queryFn: async () => {
      if (!selectedCompany) return [];
      const response = await fetch(`/api/companies/${selectedCompany}/employees`);
      if (!response.ok) throw new Error('Failed to fetch employees');
      const data = await response.json();
      return data.employees || [];
    },
    enabled: !!selectedCompany,
  });

  const companies = companiesData?.companies || [];

  const addLabourEntry = (employee: any) => {
    const newEntry: LabourEntry = {
      employee_id: employee.id,
      company_id: selectedCompany,
      worker_name: `${employee.first_name} ${employee.last_name}`,
      trade: employee.trade || employee.role || '',
      start_time: '07:00',
      end_time: '17:00',
      break_duration: 60, // 60 minutes default
      total_hours: 8,
      overtime_hours: 0,
      standard_rate: employee.standard_hourly_rate,
      overtime_rate: employee.overtime_hourly_rate,
      total_cost: employee.standard_hourly_rate ? employee.standard_hourly_rate * 8 : undefined,
      work_performed: '',
    };

    onChange([...entries, newEntry]);
    toast.success(`Added ${newEntry.worker_name} to labour`);
  };

  const removeEntry = (index: number) => {
    onChange(entries.filter((_, i) => i !== index));
  };

  const updateEntry = (index: number, updates: Partial<LabourEntry>) => {
    const updated = [...entries];
    updated[index] = { ...updated[index], ...updates };

    // Recalculate hours and cost if times changed
    if (updates.start_time || updates.end_time || updates.break_duration !== undefined) {
      const entry = updated[index];
      const start = new Date(`2000-01-01 ${entry.start_time}`);
      const end = new Date(`2000-01-01 ${entry.end_time}`);
      const hoursWorked = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      const breakHours = (entry.break_duration || 0) / 60;
      const totalHours = Math.max(0, hoursWorked - breakHours);

      updated[index].total_hours = totalHours;

      // Calculate cost
      if (entry.standard_rate) {
        const regularHours = Math.min(8, totalHours);
        const overtimeHours = Math.max(0, totalHours - 8);
        updated[index].overtime_hours = overtimeHours;

        const regularCost = regularHours * entry.standard_rate;
        const overtimeCost = overtimeHours * (entry.overtime_rate || entry.standard_rate * 1.5);
        updated[index].total_cost = regularCost + overtimeCost;
      }
    }

    onChange(updated);
  };

  const filteredEmployees = employees?.filter((emp: any) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      emp.first_name?.toLowerCase().includes(searchLower) ||
      emp.last_name?.toLowerCase().includes(searchLower) ||
      emp.trade?.toLowerCase().includes(searchLower) ||
      emp.role?.toLowerCase().includes(searchLower)
    );
  });

  const totalCost = entries.reduce((sum, entry) => sum + (entry.total_cost || 0), 0);
  const totalWorkers = entries.length;
  const totalHours = entries.reduce((sum, entry) => sum + entry.total_hours, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold">Labour On Site</h3>
          <span className="px-2 py-1 text-sm font-medium text-gray-600 bg-gray-100 rounded-full">
            {totalWorkers} workers
          </span>
        </div>
        <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="w-4 h-4 mr-1" />
          Add Labour
        </Button>
      </div>

      {/* Add Labour Form */}
      {showAddForm && (
        <div className="p-4 bg-gray-50 rounded-lg space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Company</label>
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a company...</option>
                {companies.map((company: any) => (
                  <option key={company.id} value={company.id}>
                    {company.company_name}
                  </option>
                ))}
              </select>
            </div>

            {selectedCompany && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search Employees
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search by name or trade..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Employee List */}
          {selectedCompany && (
            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
              {loadingEmployees ? (
                <div className="p-4 text-center text-gray-500">Loading employees...</div>
              ) : filteredEmployees?.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No employees found</div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredEmployees?.map((employee: any) => (
                    <div
                      key={employee.id}
                      className="p-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                      onClick={() => addLabourEntry(employee)}
                    >
                      <div>
                        <div className="font-medium text-gray-900">
                          {employee.first_name} {employee.last_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {employee.trade || employee.role || 'General Labour'}
                        </div>
                      </div>
                      {showFinancials && employee.standard_hourly_rate && (
                        <div className="text-sm text-gray-600">
                          ${employee.standard_hourly_rate}/hr
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

      {/* Labour Entries */}
      <div className="space-y-3">
        {entries.map((entry, index) => (
          <div key={index} className="p-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-medium text-gray-900">{entry.worker_name}</h4>
                <p className="text-sm text-gray-500">{entry.trade}</p>
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
                <label className="block text-xs font-medium text-gray-500 mb-1">Break (min)</label>
                <input
                  type="number"
                  value={entry.break_duration}
                  onChange={(e) =>
                    updateEntry(index, { break_duration: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Total Hours</label>
                <div className="px-2 py-1 text-sm bg-gray-50 border border-gray-200 rounded">
                  {entry.total_hours.toFixed(1)}h
                  {entry.overtime_hours > 0 && (
                    <span className="text-orange-600 ml-1">
                      ({entry.overtime_hours.toFixed(1)} OT)
                    </span>
                  )}
                </div>
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
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-sm text-gray-500">Cost</span>
                <span className="font-medium text-green-600">${entry.total_cost.toFixed(2)}</span>
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
              <span className="text-gray-500">Total Workers:</span>
              <span className="ml-2 font-medium">{totalWorkers}</span>
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
