'use client';

import React, { useState } from 'react';
import { X, Plus, Calendar, TrendingUp } from 'lucide-react';
import { Button, StateDisplay } from '@siteproof/design-system';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface RateHistoryModalProps {
  companyId: string;
  onClose: () => void;
}

export function RateHistoryModal({ companyId, onClose }: RateHistoryModalProps) {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    rate_type: 'hourly',
    standard_rate: 0,
    overtime_rate: 0,
    weekend_rate: 0,
    holiday_rate: 0,
    is_cost_rate: true,
    bill_rate: 0,
    effective_from: new Date().toISOString().split('T')[0],
    effective_to: '',
    project_id: '',
    notes: '',
  });

  // Fetch company details
  const { data: company } = useQuery({
    queryKey: ['company', companyId],
    queryFn: async () => {
      const response = await fetch(`/api/companies/${companyId}`);
      if (!response.ok) throw new Error('Failed to fetch company');
      const data = await response.json();
      return data.company;
    },
  });

  // Fetch rate history
  const { data: rates, isLoading, error, refetch } = useQuery({
    queryKey: ['rates', companyId],
    queryFn: async () => {
      const response = await fetch(`/api/rates?entity_type=company&entity_id=${companyId}`);
      if (!response.ok) throw new Error('Failed to fetch rates');
      const data = await response.json();
      return data.rates;
    },
  });

  const createRateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch('/api/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          entity_type: 'company',
          entity_id: companyId,
          project_id: data.project_id || null,
          effective_to: data.effective_to || null,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create rate');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rates', companyId] });
      toast.success('Rate created successfully');
      setShowAddForm(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      rate_type: 'hourly',
      standard_rate: 0,
      overtime_rate: 0,
      weekend_rate: 0,
      holiday_rate: 0,
      is_cost_rate: true,
      bill_rate: 0,
      effective_from: new Date().toISOString().split('T')[0],
      effective_to: '',
      project_id: '',
      notes: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createRateMutation.mutate(formData);
  };

  const getActiveRate = () => {
    if (!rates || rates.length === 0) return null;
    const today = new Date().toISOString().split('T')[0];
    return rates.find((rate: any) => 
      rate.effective_from <= today && 
      (!rate.effective_to || rate.effective_to >= today)
    );
  };

  const activeRate = getActiveRate();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Rate History - {company?.company_name}
            </h2>
            {activeRate && (
              <p className="text-sm text-gray-600 mt-1">
                Current rate: ${activeRate.standard_rate}/hr
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Add New Rate Form */}
          {showAddForm && (
            <form onSubmit={handleSubmit} className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Rate</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rate Type
                  </label>
                  <select
                    value={formData.rate_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, rate_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="project">Project</option>
                    <option value="milestone">Milestone</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Effective From <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.effective_from}
                    onChange={(e) => setFormData(prev => ({ ...prev, effective_from: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Effective To
                  </label>
                  <input
                    type="date"
                    value={formData.effective_to}
                    onChange={(e) => setFormData(prev => ({ ...prev, effective_to: e.target.value }))}
                    min={formData.effective_from}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Standard Rate <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.standard_rate}
                    onChange={(e) => setFormData(prev => ({ ...prev, standard_rate: parseFloat(e.target.value) || 0 }))}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Overtime Rate
                  </label>
                  <input
                    type="number"
                    value={formData.overtime_rate}
                    onChange={(e) => setFormData(prev => ({ ...prev, overtime_rate: parseFloat(e.target.value) || 0 }))}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Weekend Rate
                  </label>
                  <input
                    type="number"
                    value={formData.weekend_rate}
                    onChange={(e) => setFormData(prev => ({ ...prev, weekend_rate: parseFloat(e.target.value) || 0 }))}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Holiday Rate
                  </label>
                  <input
                    type="number"
                    value={formData.holiday_rate}
                    onChange={(e) => setFormData(prev => ({ ...prev, holiday_rate: parseFloat(e.target.value) || 0 }))}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional notes about this rate..."
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowAddForm(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createRateMutation.isPending}
                >
                  {createRateMutation.isPending ? 'Creating...' : 'Create Rate'}
                </Button>
              </div>
            </form>
          )}

          {/* Rate History */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Rate History</h3>
            {!showAddForm && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowAddForm(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Rate
              </Button>
            )}
          </div>

          <StateDisplay
            loading={isLoading}
            error={error}
            empty={!rates?.length}
            onRetry={refetch}
            emptyTitle="No rates found"
            emptyDescription="Add the first rate for this company"
          >
            <div className="space-y-3">
              {rates?.map((rate: any) => {
                const isActive = rate.effective_from <= new Date().toISOString().split('T')[0] &&
                  (!rate.effective_to || rate.effective_to >= new Date().toISOString().split('T')[0]);

                return (
                  <div
                    key={rate.id}
                    className={cn(
                      'p-4 rounded-lg border',
                      isActive
                        ? 'bg-green-50 border-green-200'
                        : 'bg-gray-50 border-gray-200'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={cn(
                            'px-2 py-1 text-xs font-medium rounded-full',
                            isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          )}>
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                          <span className="text-sm text-gray-600">
                            {rate.rate_type.charAt(0).toUpperCase() + rate.rate_type.slice(1)} Rate
                          </span>
                          {rate.project_id && (
                            <span className="text-sm text-blue-600">
                              Project Specific
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
                          <div>
                            <span className="text-xs text-gray-500">Standard</span>
                            <p className="text-lg font-semibold text-gray-900">
                              ${rate.standard_rate}
                            </p>
                          </div>
                          {rate.overtime_rate > 0 && (
                            <div>
                              <span className="text-xs text-gray-500">Overtime</span>
                              <p className="text-lg font-semibold text-gray-900">
                                ${rate.overtime_rate}
                              </p>
                            </div>
                          )}
                          {rate.weekend_rate > 0 && (
                            <div>
                              <span className="text-xs text-gray-500">Weekend</span>
                              <p className="text-lg font-semibold text-gray-900">
                                ${rate.weekend_rate}
                              </p>
                            </div>
                          )}
                          {rate.holiday_rate > 0 && (
                            <div>
                              <span className="text-xs text-gray-500">Holiday</span>
                              <p className="text-lg font-semibold text-gray-900">
                                ${rate.holiday_rate}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {new Date(rate.effective_from).toLocaleDateString()} - 
                              {rate.effective_to 
                                ? new Date(rate.effective_to).toLocaleDateString()
                                : 'Present'}
                            </span>
                          </div>
                          {rate.margin_percentage && (
                            <div className="flex items-center gap-1">
                              <TrendingUp className="w-4 h-4" />
                              <span>{rate.margin_percentage}% margin</span>
                            </div>
                          )}
                        </div>

                        {rate.notes && (
                          <p className="mt-2 text-sm text-gray-600 italic">
                            {rate.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
                      Created {formatDistanceToNow(new Date(rate.created_at), { addSuffix: true })}
                      {rate.approved_at && ' • Approved'}
                    </div>
                  </div>
                );
              })}
            </div>
          </StateDisplay>
        </div>

        <div className="p-6 border-t bg-gray-50">
          <Button
            variant="secondary"
            onClick={onClose}
            fullWidth
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}