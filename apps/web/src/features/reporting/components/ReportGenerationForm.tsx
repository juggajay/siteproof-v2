'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  FileText, 
  Calendar, 
  Download, 
  Loader2,
  ChevronDown,
  AlertCircle,
  FileSpreadsheet,
  FileJson,
  FileType
} from 'lucide-react';
import { Button } from '@siteproof/design-system';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useSession } from '@/features/auth/hooks/useSession';
import { useOrganizationRole } from '@/features/organizations/hooks/useOrganization';

const reportGenerationSchema = z.object({
  report_type: z.enum([
    'project_summary',
    'daily_diary_export',
    'inspection_summary',
    'ncr_report',
    'financial_summary',
    'safety_report',
    'quality_report',
  ]),
  report_name: z.string().min(1, 'Report name is required'),
  description: z.string().optional(),
  format: z.enum(['pdf', 'excel', 'csv', 'json']),
  project_id: z.string().uuid('Please select a project'),
  date_range: z.object({
    start: z.string().min(1, 'Start date is required'),
    end: z.string().min(1, 'End date is required'),
  }),
  include_photos: z.boolean().default(false),
  include_signatures: z.boolean().default(false),
  group_by: z.string().optional(),
});

type ReportFormData = z.infer<typeof reportGenerationSchema>;

interface ReportGenerationFormProps {
  onSuccess?: (reportId: string) => void;
  onCancel?: () => void;
}

const reportTypes = [
  { 
    value: 'project_summary', 
    label: 'Project Summary',
    description: 'Overall project status, progress, and key metrics',
    icon: FileText,
    requiredRole: null,
  },
  { 
    value: 'daily_diary_export', 
    label: 'Daily Diary Export',
    description: 'Export daily diaries for a date range',
    icon: Calendar,
    requiredRole: null,
  },
  { 
    value: 'inspection_summary', 
    label: 'Inspection Summary',
    description: 'Summary of all inspections with pass/fail rates',
    icon: FileText,
    requiredRole: null,
  },
  { 
    value: 'ncr_report', 
    label: 'NCR Report',
    description: 'Non-conformance reports with status tracking',
    icon: AlertCircle,
    requiredRole: null,
  },
  { 
    value: 'financial_summary', 
    label: 'Financial Summary',
    description: 'Cost analysis and financial metrics',
    icon: FileSpreadsheet,
    requiredRole: ['owner', 'admin', 'finance_manager', 'accountant'],
  },
];

const formatOptions = [
  { value: 'pdf', label: 'PDF', icon: FileText },
  { value: 'excel', label: 'Excel', icon: FileSpreadsheet },
  { value: 'csv', label: 'CSV', icon: FileType },
  { value: 'json', label: 'JSON', icon: FileJson },
];

export function ReportGenerationForm({ onSuccess, onCancel }: ReportGenerationFormProps) {
  useSession(); // For auth state
  const { data: role } = useOrganizationRole();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ReportFormData>({
    resolver: zodResolver(reportGenerationSchema),
    defaultValues: {
      format: 'pdf',
      date_range: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
      },
      include_photos: false,
      include_signatures: false,
    },
  });

  // Fetch projects
  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await fetch('/api/projects');
      if (!response.ok) throw new Error('Failed to fetch projects');
      const data = await response.json();
      return data.projects;
    },
  });

  // Generate report mutation
  const generateReport = useMutation({
    mutationFn: async (data: ReportFormData) => {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate report');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success('Report generation started', {
        description: 'You will be notified when the report is ready',
      });
      onSuccess?.(data.reportId);
    },
    onError: (error: Error) => {
      toast.error('Failed to generate report', {
        description: error.message,
      });
    },
  });

  const onSubmit = (data: ReportFormData) => {
    const parameters: any = {
      project_id: data.project_id,
      date_range: data.date_range,
    };

    if (data.include_photos) parameters.include_photos = true;
    if (data.include_signatures) parameters.include_signatures = true;
    if (data.group_by) parameters.group_by = data.group_by;

    generateReport.mutate({
      ...data,
      report_name: data.report_name || `${reportTypes.find(r => r.value === data.report_type)?.label} - ${new Date().toLocaleDateString()}`,
    });
  };

  const selectedReportType = watch('report_type');
  const selectedFormat = watch('format');

  // Filter report types based on user role
  const availableReportTypes = reportTypes.filter(type => {
    if (!type.requiredRole) return true;
    return type.requiredRole.includes(role?.role || '');
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Report Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Report Type
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {availableReportTypes.map((type) => {
            const Icon = type.icon;
            return (
              <label
                key={type.value}
                className={`relative flex items-start p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedReportType === type.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  {...register('report_type')}
                  value={type.value}
                  className="sr-only"
                />
                <div className="flex items-start gap-3">
                  <Icon className={`w-5 h-5 mt-0.5 ${
                    selectedReportType === type.value ? 'text-blue-600' : 'text-gray-400'
                  }`} />
                  <div>
                    <p className={`font-medium ${
                      selectedReportType === type.value ? 'text-blue-900' : 'text-gray-900'
                    }`}>
                      {type.label}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {type.description}
                    </p>
                  </div>
                </div>
              </label>
            );
          })}
        </div>
        {errors.report_type && (
          <p className="mt-1 text-sm text-red-600">{errors.report_type.message}</p>
        )}
      </div>

      {/* Basic Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Report Name
          </label>
          <input
            {...register('report_name')}
            placeholder="Enter a name for this report"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.report_name && (
            <p className="mt-1 text-sm text-red-600">{errors.report_name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Project
          </label>
          <select
            {...register('project_id')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a project</option>
            {projects?.map((project: any) => (
              <option key={project.id} value={project.id}>
                {project.name} - {project.client_name}
              </option>
            ))}
          </select>
          {errors.project_id && (
            <p className="mt-1 text-sm text-red-600">{errors.project_id.message}</p>
          )}
        </div>
      </div>

      {/* Date Range */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Date Range
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <input
              type="date"
              {...register('date_range.start')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.date_range?.start && (
              <p className="mt-1 text-sm text-red-600">{errors.date_range.start.message}</p>
            )}
          </div>
          <div>
            <input
              type="date"
              {...register('date_range.end')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.date_range?.end && (
              <p className="mt-1 text-sm text-red-600">{errors.date_range.end.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Format Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Export Format
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {formatOptions.map((format) => {
            const Icon = format.icon;
            return (
              <label
                key={format.value}
                className={`relative flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-all ${
                  selectedFormat === format.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  {...register('format')}
                  value={format.value}
                  className="sr-only"
                />
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${
                    selectedFormat === format.value ? 'text-blue-600' : 'text-gray-400'
                  }`} />
                  <span className={`text-sm font-medium ${
                    selectedFormat === format.value ? 'text-blue-900' : 'text-gray-700'
                  }`}>
                    {format.label}
                  </span>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Advanced Options */}
      <div className="border-t pt-4">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${
            showAdvanced ? 'rotate-180' : ''
          }`} />
          Advanced Options
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register('include_photos')}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Include photos in report</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register('include_signatures')}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Include signatures</span>
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <textarea
                {...register('description')}
                rows={3}
                placeholder="Add any additional notes about this report..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Generate Report
            </>
          )}
        </Button>
      </div>
    </form>
  );
}