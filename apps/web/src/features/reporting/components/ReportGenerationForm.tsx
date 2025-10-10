'use client';

import React, { useEffect, useRef, useState } from 'react';
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
  FileType,
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

const formatDateLabel = (value?: string) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString();
};

const buildReportName = (
  typeValue?: string | null,
  range?: { start?: string; end?: string }
): string => {
  if (!typeValue) {
    return '';
  }

  const typeLabel = reportTypes.find((r) => r.value === typeValue)?.label || 'Report';
  const startLabel = formatDateLabel(range?.start);
  const endLabel = formatDateLabel(range?.end);

  if (startLabel && endLabel) {
    return `${typeLabel} – ${startLabel} to ${endLabel}`;
  }
  if (startLabel || endLabel) {
    return `${typeLabel} – ${startLabel || endLabel}`;
  }

  return typeLabel;
};

export function ReportGenerationForm({ onSuccess, onCancel }: ReportGenerationFormProps) {
  useSession(); // For auth state
  const { data: role } = useOrganizationRole();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting, dirtyFields },
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
  const { data: projects, isLoading: isProjectsLoading } = useQuery({
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

    const fallbackName = buildReportName(data.report_type, data.date_range);

    generateReport.mutate({
      ...data,
      report_name: (data.report_name || '').trim() || fallbackName,
    });
  };

  const selectedReportType = watch('report_type');
  const selectedFormat = watch('format');
  const projectId = watch('project_id');
  const dateRange = watch('date_range');
  const projectSelected = Boolean(projectId);
  const autoNameRef = useRef<string>('');

  // Automatically generate report name based on type and date range
  useEffect(() => {
    if (!selectedReportType) {
      if (!dirtyFields.report_name) {
        setValue('report_name', '', { shouldDirty: false });
        autoNameRef.current = '';
      }
      return;
    }

    const autoName = buildReportName(selectedReportType, dateRange);
    const currentName = getValues('report_name');

    if (!dirtyFields.report_name || currentName === autoNameRef.current) {
      setValue('report_name', autoName, { shouldDirty: false });
      autoNameRef.current = autoName;
    }
  }, [
    dateRange?.end,
    dateRange?.start,
    dirtyFields.report_name,
    getValues,
    selectedReportType,
    setValue,
  ]);

  // Filter report types based on user role
  const availableReportTypes = reportTypes.filter((type) => {
    if (!type.requiredRole) return true;
    return type.requiredRole.includes(role?.role || '');
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Project Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
        <p className="text-sm text-gray-500 mb-2">
          Choose the project this report belongs to. Report options unlock after selecting a
          project.
        </p>
        <select
          {...register('project_id')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
          disabled={isProjectsLoading}
        >
          <option value="">{isProjectsLoading ? 'Loading projects...' : 'Select a project'}</option>
          {projects?.map((project: any) => (
            <option key={project.id} value={project.id}>
              {project.name}
              {project.client_name ? ` — ${project.client_name}` : ''}
            </option>
          ))}
        </select>
        {!isProjectsLoading && (!projects || projects.length === 0) && (
          <p className="mt-2 text-sm text-gray-500">
            No projects found. Create a project to start generating reports.
          </p>
        )}
        {errors.project_id && (
          <p className="mt-1 text-sm text-red-600">{errors.project_id.message}</p>
        )}
      </div>

      {/* Report Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
        <p className="text-sm text-gray-500 mb-3">
          Select the type of report you want to generate. Scroll to see all available options.
        </p>
        <div className="relative">
          {!projectSelected && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg bg-white/80 px-4 text-center backdrop-blur-sm">
              <p className="text-sm text-gray-600">
                Select a project to choose from the available report types.
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
            {availableReportTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = selectedReportType === type.value;
              const disabled = !projectSelected;

              return (
                <label
                  key={type.value}
                  className={`relative flex items-start p-4 border rounded-lg transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  onMouseDown={(event) => {
                    if (event.target instanceof HTMLElement && event.target.tagName === 'INPUT') {
                      return;
                    }
                    if (disabled) {
                      event.preventDefault();
                      return;
                    }
                    setValue('report_type', type.value as ReportFormData['report_type'], {
                      shouldDirty: true,
                    });
                  }}
                >
                  <input
                    type="radio"
                    {...register('report_type')}
                    value={type.value}
                    disabled={disabled}
                    className="sr-only"
                  />
                  <div className="flex items-start gap-3">
                    <Icon
                      className={`w-5 h-5 mt-0.5 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`}
                    />
                    <div>
                      <p
                        className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}
                      >
                        {type.label}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
        {errors.report_type && (
          <p className="mt-1 text-sm text-red-600">{errors.report_type.message}</p>
        )}
        {!availableReportTypes.length && projectSelected && (
          <p className="mt-2 text-sm text-gray-500">
            You don&rsquo;t have access to any report types yet. Contact an administrator for
            access.
          </p>
        )}
      </div>

      {/* Report Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Report Name</label>
          <input
            {...register('report_name')}
            placeholder="Daily Diary – 1 Jan to 7 Jan"
            disabled={!selectedReportType}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Auto-generated from the selected report type and date range. You can edit it if needed.
          </p>
          {errors.report_name && (
            <p className="mt-1 text-sm text-red-600">{errors.report_name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Export Format</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {formatOptions.map((format) => {
              const Icon = format.icon;
              const isSelected = selectedFormat === format.value;
              const disabled = !selectedReportType;

              return (
                <label
                  key={format.value}
                  className={`relative flex items-center justify-center p-3 border rounded-lg transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <input
                    type="radio"
                    {...register('format')}
                    value={format.value}
                    disabled={disabled}
                    className="sr-only"
                  />
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span
                      className={`text-sm font-medium ${
                        isSelected ? 'text-blue-900' : 'text-gray-700'
                      }`}
                    >
                      {format.label}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* Date Range */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
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

      {/* Advanced Options */}
      <div className="border-t pt-4">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          <ChevronDown
            className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
          />
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
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
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
