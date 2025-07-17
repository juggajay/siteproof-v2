'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText, Users, Clock, AlertCircle } from 'lucide-react';

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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Main Details */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="text-sm text-gray-600">Files: {lot.files?.length || 0}</span>
                </div>
                <div className="flex items-center">
                  <Users className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="text-sm text-gray-600">
                    ITP Instances: {lot.itp_instances?.length || 0}
                  </span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="text-sm text-gray-600">
                    Last Updated: {formatDate(lot.updated_at)}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Actions</h3>
              <div className="space-y-3">
                <button 
                  onClick={() => {
                    // Navigate to ITP assignment page
                    router.push(`/dashboard/projects/${projectId}/lots/${lot.id}/itp-assign`);
                  }}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Assign ITP Template
                </button>
                <button 
                  onClick={() => {
                    // Scroll to files section
                    const filesSection = document.getElementById('files-section');
                    if (filesSection) {
                      filesSection.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  View Files
                </button>
                <button 
                  onClick={() => {
                    // Generate and download report
                    window.open(`/api/projects/${projectId}/lots/${lot.id}/export`, '_blank');
                  }}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Export Report
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Files Section */}
        <div id="files-section" className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Files</h2>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Upload Files
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

        {/* ITP Instances Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">ITP Instances</h2>
            {lot.itp_instances?.length === 0 && (
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Add ITP Instance
              </button>
            )}
          </div>

          {lot.itp_instances?.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No ITP instances</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by assigning an ITP template to this lot.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {lot.itp_instances.map((instance: any) => (
                <div key={instance.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {instance.itp_templates?.name || 'Unknown Template'}
                      </h4>
                      <p className="text-sm text-gray-500">
                        Status: <span className={`font-medium ${getStatusColor(instance.inspection_status)}`}>
                          {instance.inspection_status || 'Draft'}
                        </span>
                      </p>
                      <p className="text-sm text-gray-500">
                        Date: {instance.inspection_date ? formatDate(instance.inspection_date) : 'Not set'}
                      </p>
                      <p className="text-sm text-gray-500">
                        Active: {instance.is_active ? 'Yes' : 'No'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <div className="text-sm text-gray-500">{formatDate(instance.created_at)}</div>
                      <button
                        onClick={() => router.push(`/dashboard/projects/${projectId}/lots/${lot.id}/itp/${instance.id}`)}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                      >
                        Open ITP
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
