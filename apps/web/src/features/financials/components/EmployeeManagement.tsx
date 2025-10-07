'use client';

import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  DollarSign,
  Mail,
  Phone,
  Calendar,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@siteproof/design-system';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  role?: string;
  trade?: string;
  employment_type: string;
  start_date?: string;
  end_date?: string;
  standard_hourly_rate?: number;
  overtime_hourly_rate?: number;
  daily_rate?: number;
  certifications?: any[];
  skills?: string[];
  is_active: boolean;
}

interface EmployeeManagementProps {
  companyId: string;
  companyName: string;
  canManage: boolean;
  showFinancials: boolean;
}

export function EmployeeManagement({
  companyId,
  companyName: _companyName,
  canManage,
  showFinancials,
}: EmployeeManagementProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);

  // Fetch employees
  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees', companyId],
    queryFn: async () => {
      const response = await fetch(`/api/companies/${companyId}/employees`);
      if (!response.ok) throw new Error('Failed to fetch employees');
      const data = await response.json();
      // Transform database format (name) to frontend format (first_name/last_name)
      return data.employees.map((emp: any) => {
        const nameParts = (emp.name || '').split(' ');
        const first_name = nameParts[0] || '';
        const last_name = nameParts.slice(1).join(' ') || '';
        return {
          ...emp,
          first_name,
          last_name,
          email: emp.contact_email || emp.email,
          phone: emp.contact_phone || emp.phone,
          role: emp.job_title || emp.role,
          standard_hourly_rate: emp.hourly_rate || emp.standard_hourly_rate,
        };
      });
    },
  });

  // Add employee mutation
  const addMutation = useMutation({
    mutationFn: async (employeeData: Partial<Employee>) => {
      const response = await fetch(`/api/companies/${companyId}/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employeeData),
      });
      if (!response.ok) throw new Error('Failed to add employee');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', companyId] });
      toast.success('Employee added successfully');
      setShowAddForm(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update employee mutation
  const updateMutation = useMutation({
    mutationFn: async (employeeData: Employee) => {
      const response = await fetch(`/api/employees/${employeeData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employeeData),
      });
      if (!response.ok) throw new Error('Failed to update employee');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', companyId] });
      toast.success('Employee updated successfully');
      setSelectedEmployee(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete employee mutation
  const deleteMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      const response = await fetch(`/api/employees/${employeeId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to deactivate employee');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', companyId] });
      toast.success('Employee deactivated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const filteredEmployees = employees?.filter((emp: Employee) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      emp.first_name.toLowerCase().includes(searchLower) ||
      emp.last_name.toLowerCase().includes(searchLower) ||
      emp.role?.toLowerCase().includes(searchLower) ||
      emp.trade?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Employees</h3>
          <span className="px-2 py-1 text-sm font-medium text-gray-600 bg-gray-100 rounded-full">
            {filteredEmployees?.length || 0}
          </span>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Add Employee
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Search employees..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Employee List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : filteredEmployees?.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No employees found</p>
          </div>
        ) : (
          filteredEmployees?.map((employee: Employee) => (
            <div
              key={employee.id}
              className="bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
            >
              <div
                className="p-4 cursor-pointer"
                onClick={() =>
                  setExpandedEmployee(expandedEmployee === employee.id ? null : employee.id)
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-blue-600">
                        {employee.first_name[0]}
                        {employee.last_name[0]}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {employee.first_name} {employee.last_name}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {employee.role || employee.trade || 'No role specified'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {showFinancials && employee.standard_hourly_rate && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-green-50 rounded">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-700">
                          ${employee.standard_hourly_rate}/hr
                        </span>
                      </div>
                    )}
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        employee.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {employee.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {expandedEmployee === employee.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedEmployee === employee.id && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Contact</h5>
                      <div className="space-y-2">
                        {employee.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="w-4 h-4" />
                            {employee.email}
                          </div>
                        )}
                        {employee.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="w-4 h-4" />
                            {employee.phone}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Employment</h5>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          Started:{' '}
                          {employee.start_date
                            ? format(new Date(employee.start_date), 'dd/MM/yyyy')
                            : 'N/A'}
                        </div>
                        <div className="text-sm text-gray-600">
                          Type: {employee.employment_type.replace('_', ' ')}
                        </div>
                      </div>
                    </div>

                    {showFinancials && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Rates</h5>
                        <div className="space-y-2 text-sm text-gray-600">
                          {employee.standard_hourly_rate && (
                            <div>Standard: ${employee.standard_hourly_rate}/hr</div>
                          )}
                          {employee.overtime_hourly_rate && (
                            <div>Overtime: ${employee.overtime_hourly_rate}/hr</div>
                          )}
                          {employee.daily_rate && <div>Daily: ${employee.daily_rate}/day</div>}
                        </div>
                      </div>
                    )}

                    {employee.skills && employee.skills.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Skills</h5>
                        <div className="flex flex-wrap gap-1">
                          {employee.skills.map((skill, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEmployee(employee);
                        }}
                      >
                        <Edit2 className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Are you sure you want to deactivate this employee?')) {
                            deleteMutation.mutate(employee.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Deactivate
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Employee Form Modal */}
      {(showAddForm || selectedEmployee) && (
        <EmployeeForm
          employee={selectedEmployee}
          companyId={companyId}
          onSave={(data) => {
            // Combine first_name and last_name into name field for database
            const { first_name, last_name, ...restData } = data;
            const employeeData = {
              ...restData,
              name: `${first_name || ''} ${last_name || ''}`.trim(),
              job_title: data.role || data.trade || '',
            };

            if (selectedEmployee) {
              updateMutation.mutate({ ...selectedEmployee, ...employeeData });
            } else {
              addMutation.mutate(employeeData);
            }
          }}
          onClose={() => {
            setShowAddForm(false);
            setSelectedEmployee(null);
          }}
        />
      )}
    </div>
  );
}

// Employee Form Component
function EmployeeForm({
  employee,
  companyId: _companyId,
  onSave,
  onClose,
}: {
  employee?: Employee | null;
  companyId: string;
  onSave: (data: Partial<Employee>) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<Partial<Employee>>(
    employee || {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      role: '',
      trade: '',
      employment_type: 'full_time',
      standard_hourly_rate: undefined,
      overtime_hourly_rate: undefined,
      daily_rate: undefined,
      skills: [],
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
            {employee ? 'Edit Employee' : 'Add New Employee'}
          </h2>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <input
                type="text"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                placeholder="e.g., Foreman, Supervisor"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trade</label>
              <input
                type="text"
                value={formData.trade}
                onChange={(e) => setFormData({ ...formData, trade: e.target.value })}
                placeholder="e.g., Electrician, Carpenter"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employment Type
              </label>
              <select
                value={formData.employment_type}
                onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contractor">Contractor</option>
                <option value="casual">Casual</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Rates</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Standard Hourly</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.standard_hourly_rate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      standard_hourly_rate: parseFloat(e.target.value) || undefined,
                    })
                  }
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Overtime Hourly</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.overtime_hourly_rate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      overtime_hourly_rate: parseFloat(e.target.value) || undefined,
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
            </div>
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>{employee ? 'Update Employee' : 'Add Employee'}</Button>
        </div>
      </div>
    </div>
  );
}
