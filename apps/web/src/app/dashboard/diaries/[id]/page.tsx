'use client';

export const dynamic = 'force-dynamic';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Download, Calendar, Users } from 'lucide-react';
import { Button, StateDisplay } from '@siteproof/design-system';
import { useDiary } from '@/features/diary/hooks/useDiary';
import { useOrganizationRole } from '@/features/organizations/hooks/useOrganization';
import { WeatherDisplay } from '@/features/diary/components/WeatherDisplay';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { toast } from 'sonner';

export default function DiaryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const diaryId = params?.id as string;

  const { data: role } = useOrganizationRole();
  const { data: diary, isLoading, error, refetch } = useDiary(diaryId);

  const hasFinancialAccess = ['owner', 'admin', 'finance_manager', 'accountant'].includes(
    role?.role || ''
  );
  const canEdit = ['owner', 'admin', 'project_manager'].includes(role?.role || '');

  const handleExport = async (format: 'pdf' | 'excel') => {
    try {
      const params = new URLSearchParams({
        format,
        includeFinancials: hasFinancialAccess.toString(),
      });

      const response = await fetch(`/api/diaries/${diaryId}/export?${params}`);

      if (!response.ok) {
        throw new Error('Failed to export diary');
      }

      // Get the filename from the response headers
      const contentDisposition = response.headers.get('content-disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || `diary-export.${format === 'pdf' ? 'html' : 'xlsx'}`;

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Diary exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export diary');
    }
  };

  const handleEdit = () => {
    router.push(`/dashboard/diaries/${diaryId}/edit`);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/dashboard/diaries">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Diaries
          </Button>
        </Link>
      </div>

      <StateDisplay
        loading={isLoading}
        error={error}
        empty={!diary}
        onRetry={refetch}
        emptyTitle="Diary not found"
      >
        {diary && (
          <>
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{diary.diary_number}</h1>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(diary.diary_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {diary.total_workers} Workers
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {diary.approved_at ? (
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                      Approved
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-sm font-medium rounded-full">
                      Draft
                    </span>
                  )}
                  {canEdit && (
                    <Button variant="secondary" size="sm" onClick={handleEdit}>
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  )}
                  <div className="flex gap-1">
                    <Button variant="secondary" size="sm" onClick={() => handleExport('excel')}>
                      <Download className="w-4 h-4 mr-1" />
                      Excel
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => handleExport('pdf')}>
                      <Download className="w-4 h-4 mr-1" />
                      PDF
                    </Button>
                  </div>
                </div>
              </div>

              {/* Project Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <span className="text-sm text-gray-600">Project</span>
                  <p className="font-semibold text-gray-900">{diary.project?.name}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Client</span>
                  <p className="font-semibold text-gray-900">{diary.project?.client_name}</p>
                </div>
              </div>
            </div>

            {/* Weather Section */}
            {diary.weather && Object.keys(diary.weather).length > 0 && (
              <div className="mb-6">
                <WeatherDisplay weather={diary.weather} />
              </div>
            )}

            {/* Work Summary */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Work Summary</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{diary.work_summary}</p>
            </div>

            {/* Labour Section */}
            {diary.labour_entries && diary.labour_entries.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Labour</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Trade
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Company
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Workers
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Hours
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Work Performed
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {diary.labour_entries.map((record: any, index: number) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm text-gray-900">{record.trade}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{record.company}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{record.workers}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{record.hours}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {record.work_performed}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Show total workers if available */}
                {diary.total_workers > 0 && (
                  <div className="mt-4 p-3 bg-gray-50 rounded">
                    <span className="text-sm font-medium text-gray-700">
                      Total Workers on Site:{' '}
                    </span>
                    <span className="text-sm font-bold text-gray-900">{diary.total_workers}</span>
                  </div>
                )}
              </div>
            )}

            {/* Plant & Equipment Section */}
            {diary.plant_entries && diary.plant_entries.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Plant & Equipment</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Equipment
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Type
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Quantity
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Hours Used
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Notes
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {diary.plant_entries.map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm text-gray-900">{item.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{item.type}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{item.quantity}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {item.hours_used || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">{item.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Materials Section */}
            {diary.material_entries && diary.material_entries.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Materials</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Material
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Quantity
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Unit
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Supplier
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Notes
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {diary.material_entries.map((material: any, index: number) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm text-gray-900">{material.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{material.quantity}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{material.unit}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {material.supplier || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {material.notes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Delays Section */}
            {diary.delays && diary.delays.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Delays</h2>
                <div className="space-y-3">
                  {diary.delays.map((delay: any, index: number) => (
                    <div key={index} className="p-4 bg-orange-50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">
                              {delay.type}
                            </span>
                            <span className="text-sm text-gray-600">
                              {delay.duration_hours} hours
                            </span>
                          </div>
                          <p className="text-gray-700">{delay.description}</p>
                        </div>
                        <span
                          className={`text-sm font-medium ${
                            delay.impact === 'High'
                              ? 'text-red-600'
                              : delay.impact === 'Medium'
                                ? 'text-orange-600'
                                : 'text-yellow-600'
                          }`}
                        >
                          {delay.impact} Impact
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Safety Incidents Section */}
            {diary.safety_incidents && diary.safety_incidents.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Safety Incidents</h2>
                <div className="space-y-3">
                  {diary.safety_incidents.map((incident: any, index: number) => (
                    <div key={index} className="p-4 bg-red-50 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
                          {incident.type}
                        </span>
                      </div>
                      <p className="text-gray-700 mb-2">{incident.description}</p>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p>
                          <strong>Action Taken:</strong> {incident.action_taken}
                        </p>
                        <p>
                          <strong>Reported To:</strong> {incident.reported_to}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes Section */}
            {diary.general_notes && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Notes</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{diary.general_notes}</p>
              </div>
            )}

            {/* Footer */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div>
                  Created by {diary.createdBy?.full_name || 'Unknown'} •{' '}
                  {formatDistanceToNow(new Date(diary.created_at), { addSuffix: true })}
                </div>
                {diary.approved_at && diary.approvedBy && (
                  <div>
                    Approved by {diary.approvedBy.full_name} •{' '}
                    {formatDistanceToNow(new Date(diary.approved_at), { addSuffix: true })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </StateDisplay>
    </div>
  );
}
