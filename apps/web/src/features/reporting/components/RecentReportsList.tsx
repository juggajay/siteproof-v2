'use client';

import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { Button, StateDisplay } from '@siteproof/design-system';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
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

interface RecentReportsListProps {
  limit?: number;
  showFilters?: boolean;
}

export function RecentReportsList({ limit = 10, showFilters = true }: RecentReportsListProps) {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const supabase = createClient();
  const [filter, setFilter] = useState<'all' | 'my' | 'processing'>('all');

  // Fetch recent reports
  const {
    data: reports,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['reports', filter, limit],
    queryFn: async () => {
      if (!user) {
        console.log('No user available, skipping reports fetch');
        return [];
      }

      let url = `/api/reports?limit=${limit}`;
      if (filter === 'my') url += `&requested_by=${user.id}`;
      if (filter === 'processing') url += `&status=processing`;

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

    // Subscribe to report status changes
    const channel = supabase
      .channel('report-status-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'report_queue',
          filter: user?.id ? `requested_by=eq.${user.id}` : undefined,
        },
        (payload) => {
          console.log('Report status change:', payload);

          // Invalidate the query to refetch
          queryClient.invalidateQueries({ queryKey: ['reports'] });

          // Show notification for status changes
          if (payload.eventType === 'UPDATE') {
            const report = payload.new as Report;

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
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase, queryClient]);

  const downloadReport = async (report: Report) => {
    console.log('downloadReport called for report:', report.id, report.report_name);

    if (report.status !== 'completed' && report.status !== 'processing') {
      console.log('Report not ready, status:', report.status);
      toast.error('Report is not ready for download');
      return;
    }

    // Check if user is authenticated
    if (!user) {
      console.error('No user found, cannot download report');
      toast.error('You must be logged in to download reports');
      return;
    }

    try {
      console.log('Starting download for report:', report.id);

      // Show loading state
      toast.loading('Preparing download...', { id: `download-${report.id}` });

      // Generate and download the report directly
      const response = await fetch(`/api/reports/${report.id}/download`, {
        method: 'GET',
        credentials: 'include', // Ensure cookies are included
        headers: {
          Accept:
            'application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,application/json,*/*',
        },
      });

      console.log('Download response status:', response.status);
      console.log('Download response headers:', Object.fromEntries(response.headers.entries()));

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

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const fileName = `${report.report_name}.${report.format}`;

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
    if (
      !window.confirm(
        `Are you sure you want to delete "${reportName}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      console.log('Deleting report:', reportId);

      const response = await fetch(`/api/reports/${reportId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete report');
      }

      toast.success('Report deleted successfully');
      refetch(); // Refresh the list
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete report');
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'px-3 py-1 text-sm font-medium rounded-full transition-colors',
              filter === 'all' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            All Reports
          </button>
          <button
            onClick={() => setFilter('my')}
            className={cn(
              'px-3 py-1 text-sm font-medium rounded-full transition-colors',
              filter === 'my' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'
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

          <div className="ml-auto">
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
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

                  if (report.status === 'completed' || report.status === 'processing') {
                    console.log('Triggering download for report:', report.id);
                    downloadReport(report);
                  } else {
                    console.log('Report not ready for download, status:', report.status);
                    toast.info(`Report status: ${report.status}. Cannot download yet.`);
                  }
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <FormatIcon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">{report.report_name}</h4>
                        {(report.status === 'completed' || report.status === 'processing') && (
                          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            Click to download
                          </span>
                        )}
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
                    {(report.status === 'completed' || report.status === 'processing') && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadReport(report);
                        }}
                        title="Download Report"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
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
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteReport(report.id, report.report_name);
                      }}
                      title="Delete Report"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
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
