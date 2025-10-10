'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  FileText,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  FileSpreadsheet,
  FileJson,
  FileType,
  Trash2,
  ChevronDown,
} from 'lucide-react';
import { Button, StateDisplay } from '@siteproof/design-system';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow, isToday, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { useSession } from '@/features/auth/hooks/useSession';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Report {
  id: string;
  report_type: string;
  report_name: string;
  description?: string;
  format: 'pdf' | 'excel' | 'csv' | 'json';
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  current_step?: string;
  file_url?: string;
  file_size_bytes?: number;
  error_message?: string;
  requested_at: string;
  started_at?: string;
  completed_at?: string;
  requested_by: {
    id: string;
    email: string;
    full_name?: string;
  };
}

const statusConfig = {
  queued: {
    label: 'Queued',
    color: 'bg-gray-100 text-gray-700',
    icon: Clock,
    animation: false,
  },
  processing: {
    label: 'Processing',
    color: 'bg-blue-100 text-blue-700',
    icon: Loader2,
    animation: true,
  },
  completed: {
    label: 'Completed',
    color: 'bg-green-100 text-green-700',
    icon: CheckCircle,
    animation: false,
  },
  failed: {
    label: 'Failed',
    color: 'bg-red-100 text-red-700',
    icon: XCircle,
    animation: false,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-gray-100 text-gray-700',
    icon: XCircle,
    animation: false,
  },
};

const formatConfig = {
  pdf: { icon: FileText, label: 'PDF' },
  excel: { icon: FileSpreadsheet, label: 'Excel' },
  csv: { icon: FileType, label: 'CSV' },
  json: { icon: FileJson, label: 'JSON' },
};

const reportTypeOptions = [
  { value: '', label: 'All report types' },
  { value: 'project_summary', label: 'Project Summary' },
  { value: 'daily_diary_export', label: 'Daily Diary Export' },
  { value: 'inspection_summary', label: 'Inspection Summary' },
  { value: 'ncr_report', label: 'NCR Report' },
  { value: 'financial_summary', label: 'Financial Summary' },
  { value: 'safety_report', label: 'Safety Report' },
  { value: 'quality_report', label: 'Quality Report' },
  { value: 'itp_report', label: 'ITP Report' },
];

interface RecentReportsListProps {
  limit?: number;
  showFilters?: boolean;
  onSummaryChange?: (summary: {
    today: number;
    thisWeek: number;
    processing: number;
    failed: number;
  }) => void;
}

export function RecentReportsList({
  limit = 10,
  showFilters = true,
  onSummaryChange,
}: RecentReportsListProps) {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const supabase = createClient();
  const [filter, setFilter] = useState<'all' | 'my' | 'processing'>('all');
  const [downloadingReportId, setDownloadingReportId] = useState<string | null>(null);
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedReportType, setSelectedReportType] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  const reportQueryKey = useMemo(
    () =>
      [
        'reports',
        {
          filter,
          limit,
          projectId: selectedProjectId || null,
          reportType: selectedReportType || null,
          date: selectedDate || null,
        },
      ] as const,
    [filter, limit, selectedProjectId, selectedReportType, selectedDate]
  );

  const {
    data: projectOptions = [],
    isLoading: isProjectsLoading,
    error: projectsError,
  } = useQuery({
    queryKey: ['reports-projects', user?.id],
    queryFn: async () => {
      if (!user) {
        return [];
      }

      const response = await fetch('/api/projects', {
        credentials: 'include',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const message = await response.text();
        console.error('Project fetch failed:', response.status, message);
        throw new Error('Failed to load projects');
      }

      const data = await response.json();
      return (data.projects as Array<{ id: string; name: string; client_name?: string }>) || [];
    },
    enabled: showFilters && !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch recent reports
  const {
    data: reports,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: reportQueryKey,
    queryFn: async () => {
      if (!user) {
        console.log('No user available, skipping reports fetch');
        return [];
      }

      const params = new URLSearchParams({ limit: String(limit) });
      if (filter === 'my') params.set('requested_by', user.id);
      if (filter === 'processing') params.set('status', 'processing');
      if (selectedReportType) params.set('report_type', selectedReportType);
      if (selectedProjectId) params.set('project_id', selectedProjectId);
      if (selectedDate) {
        params.set('start_date', selectedDate);
        params.set('end_date', selectedDate);
      }

      const url = `/api/reports?${params.toString()}`;
      console.log('Fetching reports from:', url);

      const response = await fetch(url, {
        credentials: 'include', // Include cookies for authentication
        headers: {
          Accept: 'application/json',
        },
      });

      console.log('Reports fetch response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Reports fetch failed:', response.status, errorText);

        if (response.status === 401) {
          throw new Error('Authentication failed. Please log in again.');
        } else if (response.status === 403) {
          throw new Error('You do not have permission to view reports.');
        } else {
          throw new Error(`Failed to fetch reports: ${response.statusText}`);
        }
      }

      const data = await response.json();
      console.log('Reports fetched successfully:', data.reports?.length || 0, 'reports');
      return data.reports as Report[];
    },
    enabled: !!user, // Only run query when user is available
    refetchInterval: ({ state }) => {
      // Refetch every 5 seconds if any reports are processing
      const hasProcessing = state.data?.some((r: Report) => r.status === 'processing');
      return hasProcessing ? 5000 : false;
    },
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (
        error instanceof Error &&
        (error.message.includes('Authentication') || error.message.includes('permission'))
      ) {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Set up realtime subscription
  useEffect(() => {
    if (!user) return;

    // Subscribe to ALL report changes (not just user's reports)
    // This ensures we get notified of deletions for org reports too
    const channel = supabase
      .channel('report-status-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'report_queue',
          // Remove filter to listen to all reports in organizations the user belongs to
          // RLS will still prevent seeing reports they shouldn't see
        },
        (payload) => {
          console.log('Report status change:', payload);

          // Invalidate the query to refetch
          queryClient.invalidateQueries({ queryKey: ['reports'] });

          // Show notification for status changes (only for user's own reports)
          if (payload.eventType === 'UPDATE') {
            const report = payload.new as Report;

            // Only show notifications for reports the user requested
            if (report.requested_by?.id === user.id) {
              if (report.status === 'completed') {
                toast.success('Report ready!', {
                  description: `${report.report_name} has been generated successfully`,
                  action: {
                    label: 'Download',
                    onClick: () => {
                      downloadReport(report).catch(console.error);
                    },
                  },
                });
              } else if (report.status === 'failed') {
                toast.error('Report generation failed', {
                  description:
                    report.error_message || 'An error occurred while generating the report',
                });
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase, queryClient]);

  const [openFormatDropdown, setOpenFormatDropdown] = useState<string | null>(null);

  useEffect(() => {
    if (!onSummaryChange) {
      return;
    }

    if (!reports) {
      onSummaryChange({ today: 0, thisWeek: 0, processing: 0, failed: 0 });
      return;
    }

    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    const summary = reports.reduce(
      (acc, report) => {
        const requestedAt = new Date(report.requested_at);

        if (isToday(requestedAt)) {
          acc.today += 1;
        }

        if (isWithinInterval(requestedAt, { start: weekStart, end: weekEnd })) {
          acc.thisWeek += 1;
        }

        if (report.status === 'queued' || report.status === 'processing') {
          acc.processing += 1;
        }

        if (report.status === 'failed') {
          acc.failed += 1;
        }

        return acc;
      },
      { today: 0, thisWeek: 0, processing: 0, failed: 0 }
    );

    onSummaryChange(summary);
  }, [reports, onSummaryChange]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!openFormatDropdown) return;

    const handleClickOutside = () => setOpenFormatDropdown(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openFormatDropdown]);

  const handleCardClick = (report: Report) => {
    if (downloadingReportId === report.id) {
      toast.info('Download in progress...');
      return;
    }

    if (report.status === 'completed') {
      downloadReport(report).catch(console.error);
      return;
    }

    toast.info(
      report.status === 'processing' || report.status === 'queued'
        ? 'Report is still being generated. Please wait for it to finish.'
        : `Report status: ${report.status}. Cannot download yet.`
    );
  };

  const downloadReport = async (report: Report, format?: 'pdf' | 'excel' | 'csv' | 'json') => {
    const selectedFormat = format || report.format;
    console.log('downloadReport called for report:', report.id, 'format:', selectedFormat);

    if (report.status !== 'completed') {
      console.log('Report not ready, status:', report.status);
      toast.info(
        report.status === 'processing' || report.status === 'queued'
          ? 'Report is still being generated. Please try again once it is complete.'
          : 'Report is not available for download.'
      );
      return;
    }

    // Check if user is authenticated
    if (!user) {
      console.error('No user found, cannot download report');
      toast.error('You must be logged in to download reports');
      return;
    }

    setDownloadingReportId(report.id);

    try {
      console.log('Starting download for report:', report.id, 'with format:', selectedFormat);

      // Show loading state
      toast.loading('Preparing download...', { id: `download-${report.id}` });

      // Pass format as query parameter to avoid database update race conditions
      const formatParam = format ? `?format=${format}` : '';
      const response = await fetch(`/api/reports/${report.id}/download${formatParam}`, {
        method: 'GET',
        credentials: 'include', // Ensure cookies are included
        headers: {
          Accept:
            'application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,application/json,*/*',
        },
      });

      console.log('Download response status:', response.status);
      console.log('Download response headers:', Object.fromEntries(response.headers.entries()));

      if (response.status === 202) {
        let message = 'Report is still being generated. Please try again shortly.';
        try {
          const data = await response.json();
          if (data?.error) {
            message = data.error;
          }
        } catch (jsonError) {
          console.log('Could not parse 202 response as JSON');
        }

        toast.info(message, { id: `download-${report.id}` });
        setDownloadingReportId(null);
        return;
      }

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (jsonError) {
          console.log('Could not parse error response as JSON');
        }

        console.error('Download failed with status:', response.status, errorMessage);

        if (response.status === 401) {
          errorMessage = 'Authentication failed. Please log in again.';
        } else if (response.status === 403) {
          errorMessage = 'You do not have permission to download this report.';
        } else if (response.status === 404) {
          errorMessage = 'Report not found or has been deleted.';
        }

        throw new Error(errorMessage);
      }

      // Get the blob from the response
      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      const contentLength = response.headers.get('content-length');
      console.log('Download content type:', contentType, 'length:', contentLength);

      const blob = await response.blob();
      console.log('Downloaded blob size:', blob.size, 'type:', blob.type);

      if (blob.size === 0) {
        throw new Error('Downloaded file is empty');
      }

      // Map format to file extension
      const extensionMap = {
        pdf: 'pdf',
        excel: 'xlsx',
        csv: 'csv',
        json: 'json',
      };

      // Create a download link with correct extension based on selected format
      const url = window.URL.createObjectURL(blob);
      const fileName = `${report.report_name}.${extensionMap[selectedFormat]}`;

      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();

      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);

      console.log('Download completed successfully for:', fileName);
      toast.success('Report downloaded successfully', { id: `download-${report.id}` });
    } catch (error) {
      console.error('Download error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Download failed';
      toast.error(errorMessage, { id: `download-${report.id}` });

      // Also log the full error for debugging
      console.error('Full download error details:', {
        error,
        reportId: report.id,
        reportName: report.report_name,
        userAuthenticated: !!user,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setDownloadingReportId((current) => (current === report.id ? null : current));
    }
  };

  const cancelReport = async (reportId: string) => {
    try {
      const response = await fetch(`/api/reports/${reportId}/cancel`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to cancel report');

      toast.success('Report cancelled');
      refetch();
    } catch (error) {
      toast.error('Failed to cancel report');
    }
  };

  const retryReport = async (reportId: string) => {
    try {
      const response = await fetch(`/api/reports/${reportId}/retry`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to retry report');

      toast.success('Report generation restarted');
      refetch();
    } catch (error) {
      toast.error('Failed to retry report');
    }
  };

  const deleteReport = async (reportId: string, reportName: string) => {
    if (deletingReportId === reportId) {
      toast.info('Delete already in progress...');
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to delete "${reportName}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    setDeletingReportId(reportId);

    // Optimistically update the cache to remove the report immediately
    const previousReports = queryClient.getQueryData<Report[]>(reportQueryKey);

    // Immediately remove the report from the UI (optimistic update)
    queryClient.setQueryData<Report[]>(reportQueryKey, (oldData) => {
      if (!oldData) return oldData;
      return oldData.filter((report) => report.id !== reportId);
    });

    try {
      console.log('Deleting report:', reportId);
      console.log('Delete URL:', `/api/reports/${reportId}`);
      toast.loading('Deleting report...', { id: `delete-${reportId}` });

      const response = await fetch(`/api/reports/${reportId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
        },
      });

      console.log('Delete response status:', response.status);
      console.log('Delete response headers:', Object.fromEntries(response.headers.entries()));

      // Get the response text to see what was actually returned
      const responseText = await response.text();
      console.log('Delete response body:', responseText);

      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch (e) {
          console.error('Could not parse error response as JSON:', responseText);
          throw new Error(
            `HTTP ${response.status}: ${response.statusText} - ${responseText.substring(0, 100)}`
          );
        }
        console.error('Delete failed with error data:', errorData);
        throw new Error(errorData.error || 'Failed to delete report');
      }

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.error('Could not parse success response as JSON:', responseText);
        result = { success: true }; // Assume success if we got 200 but can't parse
      }

      console.log('Delete result:', result);

      // Validate that the report was actually deleted
      if (result.success && result.deletedCount === 0) {
        console.error(
          'API returned success but deletedCount is 0 - report was not actually deleted'
        );
        throw new Error(
          'Report was not deleted. You may not have permission to delete this report.'
        );
      }

      toast.success('Report deleted successfully', { id: `delete-${reportId}` });

      // Invalidate all report queries to ensure consistency across all filters
      await queryClient.invalidateQueries({
        queryKey: ['reports'],
        exact: false, // This ensures all queries starting with 'reports' are invalidated
        refetchType: 'active', // Only refetch active queries
      });
    } catch (error) {
      console.error('Delete error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete report';
      toast.error(errorMessage, { id: `delete-${reportId}` });

      // Rollback the optimistic update on error
      if (previousReports) {
        queryClient.setQueryData<Report[]>(reportQueryKey, previousReports);
      }
    } finally {
      setDeletingReportId((current) => (current === reportId ? null : current));
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const mb = bytes / 1024 / 1024;
    return mb < 1 ? `${(bytes / 1024).toFixed(0)} KB` : `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      {showFilters && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={cn(
                'px-3 py-1 text-sm font-medium rounded-full transition-colors',
                filter === 'all'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              All Reports
            </button>
            <button
              onClick={() => setFilter('my')}
              className={cn(
                'px-3 py-1 text-sm font-medium rounded-full transition-colors',
                filter === 'my'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              My Reports
            </button>
            <button
              onClick={() => setFilter('processing')}
              className={cn(
                'px-3 py-1 text-sm font-medium rounded-full transition-colors',
                filter === 'processing'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              In Progress
            </button>

            <div className="ml-auto flex items-center gap-2">
              {(selectedProjectId || selectedReportType || selectedDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedProjectId('');
                    setSelectedReportType('');
                    setSelectedDate('');
                  }}
                >
                  Clear filters
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
              <select
                name="project-filter"
                value={selectedProjectId}
                onChange={(event) => setSelectedProjectId(event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isProjectsLoading}
              >
                <option value="">{isProjectsLoading ? 'Loading projects...' : 'All projects'}</option>
                {projectOptions.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                    {project.client_name ? ` — ${project.client_name}` : ''}
                  </option>
                ))}
              </select>
              {projectsError instanceof Error && (
                <p className="mt-1 text-xs text-red-600">{projectsError.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
              <select
                name="report-type-filter"
                value={selectedReportType}
                onChange={(event) => setSelectedReportType(event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {reportTypeOptions.map((type) => (
                  <option key={type.value || 'all'} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Report Date</label>
              <input
                type="date"
                name="report-date-filter"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                max={today}
              />
            </div>
          </div>
        </div>
      )}

      {/* Reports List */}
      <StateDisplay
        loading={isLoading}
        error={error}
        empty={!reports?.length}
        onRetry={refetch}
        emptyTitle="No reports found"
        emptyDescription="Generate your first report to see it here"
      >
        <div className="space-y-3">
          {reports?.map((report) => {
            const status = statusConfig[report.status];
            const StatusIcon = status.icon;
            const FormatIcon = formatConfig[report.format].icon;

            return (
              <div
                key={report.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow cursor-pointer"
                onClick={(e) => {
                  console.log('Report card clicked:', report.id, report.status);

                  // Don't trigger if clicking on buttons
                  if ((e.target as HTMLElement).closest('button')) {
                    console.log('Clicked on button, not triggering card click');
                    return;
                  }

                  handleCardClick(report);
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <FormatIcon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">{report.report_name}</h4>
                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          {report.status === 'completed'
                            ? downloadingReportId === report.id
                              ? 'Downloading...'
                              : `Ready • ${formatConfig[report.format].label}`
                            : `Status • ${status.label}`}
                        </span>
                      </div>
                      {report.description && (
                        <p className="text-sm text-gray-600 mt-1">{report.description}</p>
                      )}

                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span>
                          Requested by {report.requested_by.full_name || report.requested_by.email}
                        </span>
                        <span>•</span>
                        <span>
                          {formatDistanceToNow(new Date(report.requested_at), {
                            addSuffix: true,
                          })}
                        </span>
                        {report.file_size_bytes && (
                          <>
                            <span>•</span>
                            <span>{formatFileSize(report.file_size_bytes)}</span>
                          </>
                        )}
                      </div>

                      {/* Progress Bar */}
                      {report.status === 'processing' && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-gray-600">
                              {report.current_step || 'Processing...'}
                            </span>
                            <span className="text-gray-500">{report.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${report.progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Error Message */}
                      {report.status === 'failed' && report.error_message && (
                        <div className="mt-3 p-3 bg-red-50 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                            <p className="text-sm text-red-700">{report.error_message}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Status Badge */}
                    <span
                      className={cn(
                        'px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 whitespace-nowrap',
                        status.color
                      )}
                    >
                      <StatusIcon className={cn('w-3 h-3', status.animation && 'animate-spin')} />
                      {status.label}
                    </span>

                    {/* Actions */}
                    {report.status === 'completed' && (
                      <div className="relative">
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={downloadingReportId === report.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenFormatDropdown(
                              openFormatDropdown === report.id ? null : report.id
                            );
                          }}
                          title="Download report"
                          className="flex items-center gap-2"
                        >
                          {downloadingReportId === report.id ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Downloading...</span>
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4" />
                              <span>{formatConfig[report.format].label}</span>
                              <ChevronDown className="w-3 h-3 ml-1" />
                            </>
                          )}
                        </Button>

                        {openFormatDropdown === report.id && (
                          <div
                            className="absolute right-0 mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 rounded-t-lg"
                              disabled={downloadingReportId === report.id}
                              onClick={async (e) => {
                                e.stopPropagation();
                                setOpenFormatDropdown(null);
                                await downloadReport(report, 'pdf');
                              }}
                            >
                              <FileText className="w-4 h-4" />
                              PDF
                            </button>
                            <button
                              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                              disabled={downloadingReportId === report.id}
                              onClick={async (e) => {
                                e.stopPropagation();
                                setOpenFormatDropdown(null);
                                await downloadReport(report, 'excel');
                              }}
                            >
                              <FileSpreadsheet className="w-4 h-4" />
                              Excel
                            </button>
                            <button
                              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                              disabled={downloadingReportId === report.id}
                              onClick={async (e) => {
                                e.stopPropagation();
                                setOpenFormatDropdown(null);
                                await downloadReport(report, 'csv');
                              }}
                            >
                              <FileType className="w-4 h-4" />
                              CSV
                            </button>
                            <button
                              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 rounded-b-lg"
                              disabled={downloadingReportId === report.id}
                              onClick={async (e) => {
                                e.stopPropagation();
                                setOpenFormatDropdown(null);
                                await downloadReport(report, 'json');
                              }}
                            >
                              <FileJson className="w-4 h-4" />
                              JSON
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {report.status === 'processing' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          cancelReport(report.id);
                        }}
                      >
                        Cancel
                      </Button>
                    )}

                    {report.status === 'failed' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          retryReport(report.id);
                        }}
                        title="Retry Report"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    )}

                    {/* Delete button - available for all reports */}
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={deletingReportId === report.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteReport(report.id, report.report_name);
                      }}
                      title="Delete Report"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {deletingReportId === report.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </StateDisplay>
    </div>
  );
}
