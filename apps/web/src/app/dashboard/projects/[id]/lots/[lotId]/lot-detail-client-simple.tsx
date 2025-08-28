'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText, Download, Loader2 } from 'lucide-react';
// Use simple stable version
import { SimpleItpManager as MobileItpManager } from '@/components/itp/simple-itp-manager';

interface LotDetailClientSimpleProps {
  lot: any;
  projectId: string;
  userRole: string;
}

export default function LotDetailClientSimple({
  lot,
  projectId,
  userRole,
}: LotDetailClientSimpleProps) {
  const router = useRouter();
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportStatus, setReportStatus] = useState<string | null>(null);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'in_review':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleExportReport = async () => {
    setIsGeneratingReport(true);
    setReportStatus(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/lots/${lot.id}/export`);
      
      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error('Server returned non-JSON response. The API endpoint may be missing.');
      }
      
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate report');
      }

      // Show success message and redirect to reports page
      setReportStatus(
        `Report generation started! Generating report for ${data.completedItps} completed ITP(s). Estimated time: ${data.estimatedTime}`
      );

      // Redirect to reports page after a short delay
      setTimeout(() => {
        router.push('/dashboard/reports');
      }, 3000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate report';
      setReportStatus(`Error: ${errorMessage}`);
      console.error('Export error:', error);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-4">
            <button
              onClick={() => router.push(`/dashboard/projects/${projectId}`)}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Project
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Lot #{lot.lot_number}
                  {lot.name && `: ${lot.name}`}
                </h1>
                <p className="text-lg text-gray-600 mt-2">
                  Project: {lot.project?.name || 'Unknown'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Organization: {lot.project?.organization?.name || 'Unknown'}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(lot.status)}`}
                >
                  {lot.status?.charAt(0).toUpperCase() + lot.status?.slice(1) || 'Unknown'}
                </span>
                <span className="text-sm text-gray-500">Role: {userRole}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Lot Details */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Lot Details</h2>

          <div className="space-y-4">
            {lot.description && (
              <div>
                <label className="text-sm font-medium text-gray-700">Description</label>
                <p className="mt-1 text-gray-900">{lot.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Version</label>
                <p className="mt-1 text-gray-900">{lot.version || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Created</label>
                <p className="mt-1 text-gray-900">{formatDate(lot.created_at)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Submitted</label>
                <p className="mt-1 text-gray-900">{formatDate(lot.submitted_at)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Reviewed</label>
                <p className="mt-1 text-gray-900">{formatDate(lot.reviewed_at)}</p>
              </div>
            </div>

            {lot.internal_notes && (
              <div>
                <label className="text-sm font-medium text-gray-700">Internal Notes</label>
                <p className="mt-1 text-gray-900">{lot.internal_notes}</p>
              </div>
            )}

            {lot.client_notes && (
              <div>
                <label className="text-sm font-medium text-gray-700">Client Notes</label>
                <p className="mt-1 text-gray-900">{lot.client_notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Mobile-Optimized ITP Section - Moved here after details */}
        <div className="mb-8">
          <MobileItpManager projectId={projectId} lotId={lot.id} />
        </div>

        {/* Files Section */}
        <div
          id="files-section"
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Files</h2>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Add Files
            </button>
          </div>

          {!lot.files || lot.files.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No files uploaded</h3>
              <p className="mt-1 text-sm text-gray-500">
                Upload files related to this lot for review and documentation.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lot.files.map((file: any, index: number) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <FileText className="h-8 w-8 text-blue-500 mr-3" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.name || 'Unnamed file'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {file.type || 'Unknown type'} •{' '}
                        {file.size ? `${Math.round(file.size / 1024)}KB` : 'Unknown size'}
                      </p>
                    </div>
                  </div>
                  {file.url && (
                    <div className="mt-3">
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        View File
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Export Report - Big Green Button at Bottom */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <button
            onClick={handleExportReport}
            disabled={isGeneratingReport}
            className="w-full h-16 px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg font-semibold flex items-center justify-center"
          >
            {isGeneratingReport ? (
              <>
                <Loader2 className="h-6 w-6 mr-3 animate-spin" />
                Generating Report...
              </>
            ) : (
              <>
                <Download className="h-6 w-6 mr-3" />
                Export ITP Report
              </>
            )}
          </button>

          {reportStatus && (
            <div
              className={`mt-4 p-4 rounded-lg ${reportStatus.startsWith('Error') ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}
            >
              <p
                className={`text-sm ${reportStatus.startsWith('Error') ? 'text-red-700' : 'text-green-700'}`}
              >
                {reportStatus}
              </p>
              {!reportStatus.startsWith('Error') && (
                <p className="text-sm text-green-600 mt-2">
                  You will be redirected to the Reports page to download your report when ready.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
