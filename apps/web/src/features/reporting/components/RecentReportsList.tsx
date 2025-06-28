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
  FileType
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
  const { data: reports, isLoading, error, refetch } = useQuery({
    queryKey: ['reports', filter, limit],
    queryFn: async () => {
      let url = `/api/reports?limit=${limit}`;
      if (filter === 'my') url += `&requested_by=${user?.id}`;
      if (filter === 'processing') url += `&status=processing`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch reports');
      const data = await response.json();
      return data.reports as Report[];
    },
    refetchInterval: (data) => {
      // Refetch every 5 seconds if any reports are processing
      const hasProcessing = data?.some(r => r.status === 'processing');
      return hasProcessing ? 5000 : false;
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
          filter: `organization_id=eq.${user.organization_id}`,
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
                  onClick: () => downloadReport(report),
                },
              });
            } else if (report.status === 'failed') {
              toast.error('Report generation failed', {
                description: report.error_message || 'An error occurred while generating the report',
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

  const downloadReport = (report: Report) => {
    if (!report.file_url) return;
    
    // In a real app, you would download from the actual storage URL
    window.open(report.file_url, '_blank');
    toast.success('Download started');
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
          
          <div className="ml-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
            >
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
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      <FormatIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">
                          {report.report_name}
                        </h4>
                        {report.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {report.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span>
                            Requested by {report.requested_by.full_name || report.requested_by.email}
                          </span>
                          <span>•</span>
                          <span>
                            {formatDistanceToNow(new Date(report.requested_at), { addSuffix: true })}
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
                  </div>

                  <div className="flex items-start gap-2 ml-4">
                    {/* Status Badge */}
                    <span className={cn(
                      'px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1',
                      status.color
                    )}>
                      <StatusIcon className={cn(
                        'w-3 h-3',
                        status.animation && 'animate-spin'
                      )} />
                      {status.label}
                    </span>

                    {/* Actions */}
                    {report.status === 'completed' && report.file_url && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => downloadReport(report)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    )}

                    {report.status === 'processing' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => cancelReport(report.id)}
                      >
                        Cancel
                      </Button>
                    )}

                    {report.status === 'failed' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => retryReport(report.id)}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    )}
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