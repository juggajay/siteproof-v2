'use client';

import React, { useState } from 'react';
import { FileText, AlertTriangle, CalendarDays } from 'lucide-react';
import { IncidentsSection } from './IncidentsSection';
import { TomorrowNotesSection } from './TomorrowNotesSection';

interface WorkSummaryTabsProps {
  register: any;
  errors: any;
  incidents: any[];
  delays: any[];
  onIncidentsChange: (incidents: any[]) => void;
  onDelaysChange: (delays: any[]) => void;
  previousDayNotes?: string;
}

export function WorkSummaryTabs({
  register,
  errors,
  incidents,
  delays,
  onIncidentsChange,
  onDelaysChange,
  previousDayNotes,
}: WorkSummaryTabsProps) {
  const [activeTab, setActiveTab] = useState<'work' | 'incidents' | 'tomorrow'>('work');

  const tabs = [
    {
      id: 'work' as const,
      label: 'Today&apos;s Work',
      icon: FileText,
      count: null,
    },
    {
      id: 'incidents' as const,
      label: 'Incidents',
      icon: AlertTriangle,
      count: incidents.length + delays.length,
    },
    {
      id: 'tomorrow' as const,
      label: 'Notes for Tomorrow',
      icon: CalendarDays,
      count: null,
    },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Tab Headers */}
      <div className="border-b border-gray-200">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-6 py-4 text-left font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <tab.icon className="w-5 h-5" />
                <div className="flex items-center gap-2">
                  <span className="text-base">{tab.label}</span>
                  {tab.count !== null && tab.count > 0 && (
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        activeTab === tab.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'work' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Today&apos;s Work Summary</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Work Summary <span className="text-red-500">*</span>
              </label>
              <textarea
                {...register('work_summary')}
                rows={6}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.work_summary
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder="Summarize the day's work activities, progress made, tasks completed, and any notable achievements..."
              />
              {errors.work_summary && (
                <p className="mt-1 text-sm text-red-600">{errors.work_summary.message}</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'incidents' && (
          <IncidentsSection
            incidents={incidents}
            delays={delays}
            onIncidentsChange={onIncidentsChange}
            onDelaysChange={onDelaysChange}
          />
        )}

        {activeTab === 'tomorrow' && (
          <TomorrowNotesSection
            register={register}
            errors={errors}
            previousDayNotes={previousDayNotes}
          />
        )}
      </div>
    </div>
  );
}
