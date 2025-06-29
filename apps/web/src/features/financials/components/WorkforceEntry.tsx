'use client';

import React, { useState } from 'react';
import { Plus, Trash2, DollarSign, Users, Calculator } from 'lucide-react';
import { Button } from '@siteproof/design-system';
import { useSession } from '@/features/auth/hooks/useSession';
import { useOrganizationRole } from '@/features/organizations/hooks/useOrganization';
import { useQuery } from '@tanstack/react-query';

interface Trade {
  trade: string;
  company: string;
  workers: number;
  activities: string[];
  start_time?: string;
  end_time?: string;
  total_hours?: number;
  hourly_rate?: number;
  daily_rate?: number;
  total_cost?: number;
  notes?: string;
}

interface WorkforceEntryProps {
  trades: Trade[];
  onChange: (trades: Trade[]) => void;
  date?: Date;
  projectId?: string;
  readOnly?: boolean;
}

export function WorkforceEntry({ 
  trades, 
  onChange, 
  date = new Date(),
  projectId,
  readOnly = false 
}: WorkforceEntryProps) {
  useSession(); // For auth state management
  const { data: role } = useOrganizationRole();
  const [showRates, setShowRates] = useState(false);

  // Check if user has financial access
  const hasFinancialAccess = ['owner', 'admin', 'finance_manager', 'accountant'].includes(role?.role || '');

  // Fetch companies with their rates
  const { data: companies } = useQuery({
    queryKey: ['companies', 'active'],
    queryFn: async () => {
      const response = await fetch('/api/companies?active=true');
      if (!response.ok) throw new Error('Failed to fetch companies');
      return response.json();
    },
    enabled: hasFinancialAccess,
  });

  // Fetch current rates for companies
  const { data: rates } = useQuery({
    queryKey: ['rates', projectId, date.toISOString().split('T')[0]],
    queryFn: async () => {
      const dateStr = date.toISOString().split('T')[0];
      const params = new URLSearchParams({ date: dateStr });
      if (projectId) params.append('project_id', projectId);
      
      const response = await fetch(`/api/rates/current?${params}`);
      if (!response.ok) throw new Error('Failed to fetch rates');
      return response.json();
    },
    enabled: hasFinancialAccess && !!companies,
  });

  const addTrade = () => {
    onChange([
      ...trades,
      {
        trade: '',
        company: '',
        workers: 1,
        activities: [],
        start_time: '07:00',
        end_time: '15:30',
        total_hours: 8.5,
      },
    ]);
  };

  const removeTrade = (index: number) => {
    onChange(trades.filter((_, i) => i !== index));
  };

  const updateTrade = (index: number, field: keyof Trade, value: any) => {
    const updated = [...trades];
    updated[index] = { ...updated[index], [field]: value };

    // Calculate total hours if start/end times change
    if (field === 'start_time' || field === 'end_time') {
      const start = updated[index].start_time;
      const end = updated[index].end_time;
      if (start && end) {
        const [startHour, startMin] = start.split(':').map(Number);
        const [endHour, endMin] = end.split(':').map(Number);
        const totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
        updated[index].total_hours = Math.round(totalMinutes / 60 * 10) / 10;
      }
    }

    // Calculate total cost if we have rates and financial access
    if (hasFinancialAccess && rates && (field === 'company' || field === 'workers' || field === 'total_hours')) {
      const company = companies?.find((c: any) => c.company_name === updated[index].company);
      if (company) {
        const rate = rates[company.id];
        if (rate) {
          updated[index].hourly_rate = rate.standard_rate;
          updated[index].total_cost = updated[index].workers * (updated[index].total_hours || 8) * rate.standard_rate;
        }
      }
    }

    onChange(updated);
  };

  const getTotalWorkers = () => {
    return trades.reduce((sum, trade) => sum + (trade.workers || 0), 0);
  };

  const getTotalCost = () => {
    if (!hasFinancialAccess) return 0;
    return trades.reduce((sum, trade) => sum + (trade.total_cost || 0), 0);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-900">Workforce on Site</h3>
          <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full">
            <Users className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              {getTotalWorkers()} Total Workers
            </span>
          </div>
          {hasFinancialAccess && showRates && (
            <div className="flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-900">
                ${getTotalCost().toFixed(2)} Total Cost
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {hasFinancialAccess && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRates(!showRates)}
            >
              <DollarSign className="w-4 h-4 mr-1" />
              {showRates ? 'Hide' : 'Show'} Rates
            </Button>
          )}
          {!readOnly && (
            <Button
              variant="secondary"
              size="sm"
              onClick={addTrade}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Trade
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Trade
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Company
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Workers
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Start
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                End
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Hours
              </th>
              {hasFinancialAccess && showRates && (
                <>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rate/Hr
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Cost
                  </th>
                </>
              )}
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Notes
              </th>
              {!readOnly && (
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {trades.map((trade, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={trade.trade}
                    onChange={(e) => updateTrade(index, 'trade', e.target.value)}
                    placeholder="e.g., Electrician"
                    disabled={readOnly}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  />
                </td>
                <td className="px-4 py-3">
                  {hasFinancialAccess && companies ? (
                    <select
                      value={trade.company}
                      onChange={(e) => updateTrade(index, 'company', e.target.value)}
                      disabled={readOnly}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                    >
                      <option value="">Select company...</option>
                      {companies
                        .filter((c: any) => c.company_type === 'contractor')
                        .map((company: any) => (
                          <option key={company.id} value={company.company_name}>
                            {company.company_name}
                          </option>
                        ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={trade.company}
                      onChange={(e) => updateTrade(index, 'company', e.target.value)}
                      placeholder="Company name"
                      disabled={readOnly}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                    />
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <input
                    type="number"
                    value={trade.workers}
                    onChange={(e) => updateTrade(index, 'workers', parseInt(e.target.value) || 0)}
                    min="0"
                    disabled={readOnly}
                    className="w-16 px-2 py-1 text-sm text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  />
                </td>
                <td className="px-4 py-3 text-center">
                  <input
                    type="time"
                    value={trade.start_time}
                    onChange={(e) => updateTrade(index, 'start_time', e.target.value)}
                    disabled={readOnly}
                    className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  />
                </td>
                <td className="px-4 py-3 text-center">
                  <input
                    type="time"
                    value={trade.end_time}
                    onChange={(e) => updateTrade(index, 'end_time', e.target.value)}
                    disabled={readOnly}
                    className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  />
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-sm font-medium text-gray-900">
                    {trade.total_hours || 0}
                  </span>
                </td>
                {hasFinancialAccess && showRates && (
                  <>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-medium text-gray-900">
                        ${trade.hourly_rate?.toFixed(2) || '0.00'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-semibold text-green-600">
                        ${trade.total_cost?.toFixed(2) || '0.00'}
                      </span>
                    </td>
                  </>
                )}
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={trade.notes || ''}
                    onChange={(e) => updateTrade(index, 'notes', e.target.value)}
                    placeholder="Optional notes"
                    disabled={readOnly}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  />
                </td>
                {!readOnly && (
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => removeTrade(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {trades.length === 0 && (
          <div className="px-4 py-8 text-center">
            <Users className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500">No workforce on site</p>
            {!readOnly && (
              <Button
                variant="secondary"
                size="sm"
                onClick={addTrade}
                className="mt-3"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add First Trade
              </Button>
            )}
          </div>
        )}
      </div>

      {hasFinancialAccess && !showRates && trades.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Calculator className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">Financial data available</p>
              <p className="text-sm text-blue-700 mt-1">
                Click "Show Rates" to view hourly rates and calculate workforce costs.
              </p>
            </div>
          </div>
        </div>
      )}

      {!hasFinancialAccess && trades.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <DollarSign className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-700">Financial data restricted</p>
              <p className="text-sm text-gray-600 mt-1">
                Contact your administrator to access workforce cost information.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}