'use client';

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Download, Filter, RotateCcw } from 'lucide-react';
import { Button, StateDisplay } from '@siteproof/design-system';
import { useProjects } from '@/features/projects/hooks/useProjects';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface DailyDiaryReport {
  id: string;
  report_name: string;
  status: string;
  format: string;
  requested_at: string;
  completed_at?: string;
  file_url?: string;
  parameters?: Record<string, any>;
}

export function DailyDiaryReportsList() {
  const [projectId, setProjectId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const { data: projectsData } = useProjects({ status: 'active', limit: 100 });

  const queryKey = useMemo(
    () => ['daily-diary-reports', projectId, startDate, endDate],
    [projectId, startDate, endDate]
  );

  const {
    data: reports,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({ report_type: 'daily_diary_entry', limit: '100' });
      if (projectId) params.append('project_id', projectId);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const response = await fetch('/api/reports?' + params.toString());
      if (!response.ok) {
        throw new Error('Failed to fetch daily diary reports');
      }

      const data = await response.json();
      return (data.reports || []) as DailyDiaryReport[];
    },
  });

  const sortedReports = useMemo(() => {
    if (!reports) return [];
    return [...reports].sort((a, b) => {
      const aTime = new Date(a.requested_at).getTime();
      const bTime = new Date(b.requested_at).getTime();
      return bTime - aTime;
    });
  }, [reports]);

  const downloadReport = async (report: DailyDiaryReport) => {
    try {
      toast.loading('Preparing download...', { id: `download-${report.id}` });

      const response = await fetch(`/api/reports/${report.id}/download`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error((errorBody as any).error || 'Failed to download report');
      }

      const body = await response.json();
      const fileUrl = body.file_url as string | undefined;
      if (!fileUrl) {
        throw new Error('Report file not available');
      }

      window.open(fileUrl, '_blank');
      toast.success('Download started', { id: `download-${report.id}` });
    } catch (err) {
      console.error('Download error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to download report', {
        id: `download-${report.id}`,
      });
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Daily Diary Reports</h2>
          <p className="text-sm text-gray-600">
            Search saved diary snapshots by project and date
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setProjectId('');
              setStartDate('');
              setEndDate('');
              refetch();
            }}
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
          >
            <Filter className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Apply Filters
          </Button>
        </div>
      </div>

      <div className="px-6 py-4 border-b border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
          <select
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Projects</option>
            {projectsData?.projects
              ?.map((project) => ({ id: project.id, name: project.name }))
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <StateDisplay
        loading={isLoading}
        error={error as Error | undefined}
        empty={!sortedReports.length}
        onRetry={refetch}
        emptyTitle="No diary reports found"
        emptyDescription="Create a daily diary entry to see it indexed here"
        className="p-6"
      >
        <div className="space-y-4">
          {sortedReports.map((report) => {
            const diaryDate = report.parameters?.diary_date as string | undefined;
            const projectName = (report.parameters?.project_name as string | undefined) || report.report_name;

            return (
              <div
                key={report.id}
                className="border border-gray-200 rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      {projectName}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {diaryDate
                        ? new Date(diaryDate).toLocaleDateString('en-AU', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })
                        : 'Diary entry'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Recorded {formatDistanceToNow(new Date(report.requested_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => downloadReport(report)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download JSON
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </StateDisplay>
    </div>
  );
}
