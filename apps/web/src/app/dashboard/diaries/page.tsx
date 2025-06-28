'use client';

import React, { useState } from 'react';
import { Plus, Download } from 'lucide-react';
import { Button, StateDisplay } from '@siteproof/design-system';
import { useDiaries } from '@/features/diary/hooks/useDiary';
import { WeatherDisplay } from '@/features/diary/components/WeatherDisplay';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { toast } from 'sonner';

export default function DiariesPage() {
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  const { data: diaries, isLoading, error, refetch } = useDiaries({
    projectId: selectedProject || undefined,
    startDate: dateRange.start,
    endDate: dateRange.end,
  });

  const exportDiaries = () => {
    // Implementation would export diaries to PDF/Excel
    toast.info('Export functionality coming soon');
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Daily Diaries</h1>
            <p className="mt-2 text-gray-600">
              Track daily site activities, weather, and progress
            </p>
          </div>
          <Link href="/dashboard/diaries/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Diary Entry
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project
              </label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Projects</option>
                {/* Projects would be loaded here */}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex items-end">
              <Button
                variant="secondary"
                onClick={exportDiaries}
                fullWidth
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Diary List */}
      <StateDisplay
        loading={isLoading}
        error={error}
        empty={!diaries?.length}
        onRetry={refetch}
        emptyMessage="No diary entries found"
        emptyDescription="Create your first daily diary to track site activities"
      >
        <div className="space-y-4">
          {diaries?.map((diary) => (
            <Link
              key={diary.id}
              href={`/dashboard/diaries/${diary.id}`}
              className="block"
            >
              <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {diary.diary_number}
                      </h3>
                      <span className="text-sm text-gray-500">
                        {new Date(diary.diary_date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {diary.project?.name || 'Unknown Project'}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {diary.approved_at ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        Approved
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                        Draft
                      </span>
                    )}
                  </div>
                </div>

                {/* Weather Summary */}
                {diary.weather && Object.keys(diary.weather).length > 0 && (
                  <div className="mb-4">
                    <WeatherDisplay weather={diary.weather} compact />
                  </div>
                )}

                {/* Work Summary */}
                <div className="mb-4">
                  <p className="text-gray-700 line-clamp-2">{diary.work_summary}</p>
                </div>

                {/* Key Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Workers</span>
                    <p className="font-semibold text-gray-900">{diary.total_workers}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Trades</span>
                    <p className="font-semibold text-gray-900">{diary.trades_on_site.length}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Delays</span>
                    <p className="font-semibold text-gray-900">
                      {diary.delays.length > 0 ? (
                        <span className="text-orange-600">{diary.delays.length}</span>
                      ) : (
                        <span className="text-green-600">None</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Safety Incidents</span>
                    <p className="font-semibold text-gray-900">
                      {diary.safety_incidents.length > 0 ? (
                        <span className="text-red-600">{diary.safety_incidents.length}</span>
                      ) : (
                        <span className="text-green-600">None</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-gray-500">
                  <span>
                    Created by {diary.createdBy?.full_name || 'Unknown'}
                  </span>
                  <span>
                    {formatDistanceToNow(new Date(diary.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </StateDisplay>
    </div>
  );
}