'use client';

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, StateDisplay } from '@siteproof/design-system';
import { ClipboardList, Download, Filter, RotateCcw } from 'lucide-react';
import { useProjects } from '@/features/projects/hooks/useProjects';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface ItpReport {
  id: string;
  report_name: string;
  status: string;
  format: string;
  requested_at: string;
  completed_at?: string;
  file_url?: string;
  parameters?: Record<string, unknown> | null;
}

const safeString = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return undefined;
};

export function ItpReportsList() {
  const [projectId, setProjectId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const { data: projectsData } = useProjects({ status: 'active', limit: 100 });

  const queryKey = useMemo(
    () => ['itp-reports', projectId, startDate, endDate],
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
      const params = new URLSearchParams({ report_type: 'itp_report', limit: '100' });
      if (projectId) params.append('project_id', projectId);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const response = await fetch('/api/reports?' + params.toString());
      if (!response.ok) {
        throw new Error('Failed to fetch ITP reports');
      }

      const data = await response.json();
      return (data.reports || []) as ItpReport[];
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

  const resetFilters = () => {
    setProjectId('');
    setStartDate('');
    setEndDate('');
    void refetch();
  };

  const downloadReport = async (report: ItpReport) => {
    const toastId = `download-${report.id}`;
    try {
      toast.loading('Preparing download...', { id: toastId });

      const response = await fetch(`/api/reports/${report.id}/download`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Accept: 'application/pdf,application/json,*/*',
        },
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const message = (errorBody as { error?: string }).error || 'Failed to download report';
        throw new Error(message);
      }

      const contentType = response.headers.get('Content-Type') || '';

      if (contentType.includes('application/pdf')) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${report.report_name || 'itp-report'}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success('Download started', { id: toastId });
        return;
      }

      const body = await response.json().catch(() => undefined);
      const fileUrl = (body as { file_url?: string | null } | undefined)?.file_url;
      if (fileUrl) {
        window.open(fileUrl, '_blank');
        toast.success('Download started', { id: toastId });
        return;
      }

      throw new Error('Report file not available');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to download report', {
        id: toastId,
      });
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">ITP Reports</h2>
          <p className="text-sm text-gray-600">Review inspection reports by project and date</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
          <Button variant="secondary" size="sm" onClick={() => void refetch()}>
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
        onRetry={() => void refetch()}
        emptyTitle="No ITP reports found"
        emptyDescription="Complete inspections to see them indexed here"
        className="p-6"
      >
        <div className="space-y-4">
          {sortedReports.map((report) => {
            const params = (report.parameters ?? {}) as Record<string, unknown>;
            const templateName = safeString(params['template_name']);
            const projectName = safeString(params['project_name']);
            const lotLabel = safeString(params['lot_number'] ?? params['lot_name']);
            const inspectionStatus = safeString(params['inspection_status']);
            const inspectionDate = safeString(params['inspection_date']);

            const formattedDate = inspectionDate
              ? new Date(inspectionDate).toLocaleDateString('en-AU', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })
              : 'Inspection date unavailable';

            const subtitleParts: string[] = [];
            if (projectName) subtitleParts.push(projectName);
            if (lotLabel) subtitleParts.push(`Lot ${lotLabel}`);

            return (
              <div
                key={report.id}
                className="border border-gray-200 rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex items-start gap-3">
                  <ClipboardList className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      {templateName || report.report_name}
                    </h3>
                    {subtitleParts.length > 0 && (
                      <p className="text-sm text-gray-600">{subtitleParts.join(' - ')}</p>
                    )}
                    <p className="text-sm text-gray-600">{formattedDate}</p>
                    {inspectionStatus && (
                      <p className="text-xs text-gray-500 mt-1 capitalize">
                        Status: {inspectionStatus.replace(/_/g, ' ')}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Recorded{' '}
                      {formatDistanceToNow(new Date(report.requested_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => void downloadReport(report)}>
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
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
