'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Calendar, DollarSign, Download } from 'lucide-react';
import { toast } from 'sonner';

// TODO: Replace with dynamic project selection from user's projects
// For MVP testing, using hardcoded project ID from environment or fallback
const PROJECT_ID =
  process.env.NEXT_PUBLIC_DEFAULT_PROJECT_ID || '217523b8-6dd7-4d94-b876-e41879d07970';

export default function CostReportsPage() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Fetch diary for selected date
  const { data: diary } = useQuery({
    queryKey: ['diary', PROJECT_ID, selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/daily-diary?project_id=${PROJECT_ID}&date=${selectedDate}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('Failed to fetch diary');
      return res.json();
    },
  });

  // Fetch cost report if diary exists
  const { data: costReport } = useQuery({
    queryKey: ['cost-report', diary?.id],
    queryFn: async () => {
      const res = await fetch(`/api/daily-diary/${diary.id}/cost-report`);
      if (!res.ok) throw new Error('Failed to fetch cost report');
      return res.json();
    },
    enabled: !!diary?.id,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <h1 className="text-2xl font-bold mb-4">Daily Cost Report</h1>

        {/* Date Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-600" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>

      {!diary && (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
          No diary entry for this date.
        </div>
      )}

      {costReport && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="text-sm text-gray-600 mb-1">Labor Cost</div>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(costReport.summary.totalLaborCost)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {costReport.summary.totalLaborHours} hours
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="text-sm text-gray-600 mb-1">Plant Cost</div>
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(costReport.summary.totalPlantCost)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {costReport.summary.totalPlantHours} hours
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="text-sm text-gray-600 mb-1">Total Cost</div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(costReport.summary.totalCost)}
              </div>
            </div>
          </div>

          {/* Labor Breakdown */}
          {costReport.labor.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Labor Costs
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr className="text-left text-sm text-gray-600">
                      <th className="pb-2">Worker</th>
                      <th className="pb-2">Contractor</th>
                      <th className="pb-2">Hours</th>
                      <th className="pb-2">Rate</th>
                      <th className="pb-2 text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {costReport.labor.map((entry: any, index: number) => (
                      <tr key={index} className="border-b last:border-0">
                        <td className="py-2">
                          <div className="font-medium">{entry.worker?.name}</div>
                          <div className="text-xs text-gray-500">{entry.worker?.job_title}</div>
                        </td>
                        <td className="py-2 text-gray-600">{entry.worker?.contractor?.name}</td>
                        <td className="py-2">{entry.hours_worked}</td>
                        <td className="py-2">
                          {formatCurrency(entry.worker?.hourly_rate || 0)}/hr
                        </td>
                        <td className="py-2 text-right font-medium">
                          {formatCurrency(entry.cost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Plant Breakdown */}
          {costReport.plant.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Plant Costs
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr className="text-left text-sm text-gray-600">
                      <th className="pb-2">Equipment</th>
                      <th className="pb-2">Contractor</th>
                      <th className="pb-2">Hours</th>
                      <th className="pb-2">Rate</th>
                      <th className="pb-2 text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {costReport.plant.map((entry: any, index: number) => (
                      <tr key={index} className="border-b last:border-0">
                        <td className="py-2 font-medium">{entry.plant_item?.name}</td>
                        <td className="py-2 text-gray-600">{entry.plant_item?.contractor?.name}</td>
                        <td className="py-2">{entry.hours_used}</td>
                        <td className="py-2">
                          {formatCurrency(entry.plant_item?.hourly_rate || 0)}/hr
                        </td>
                        <td className="py-2 text-right font-medium">
                          {formatCurrency(entry.cost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Export Button */}
          <button
            onClick={() => {
              // TODO: Implement PDF/Excel export
              toast.info('Export feature coming soon!');
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download className="w-5 h-5" />
            Export to PDF/Excel
          </button>
        </>
      )}
    </div>
  );
}
