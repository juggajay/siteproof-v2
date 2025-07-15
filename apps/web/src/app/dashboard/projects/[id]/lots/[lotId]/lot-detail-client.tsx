'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ClipboardList,
  Plus,
  Calendar,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@siteproof/design-system';
import { AssignITPModal } from '@/features/lots/components/AssignITPModal';

interface ITPInstance {
  id: string;
  name: string;
  status: 'draft' | 'in_progress' | 'completed' | 'approved';
  completion_percentage: number;
  created_at: string;
  updated_at: string;
  itp_templates: {
    id: string;
    name: string;
    description?: string;
    category?: string;
    structure: any;
  };
}

interface Project {
  id: string;
  name: string;
  organization_id: string;
  organizations: {
    id: string;
    name: string;
  };
}

interface Lot {
  id: string;
  project_id: string;
  lot_number: number;
  name: string | null;
  description: string | null;
  status: 'pending' | 'in_review' | 'approved' | 'rejected';
  files: Array<{
    url: string;
    name: string;
    size: number;
    type: string;
  }> | null;
  created_at: string;
  reviewed_at: string | null;
  created_by: string;
  reviewed_by: string | null;
  projects: Project;
  itp_instances: ITPInstance[];
}

interface LotDetailClientProps {
  lot: Lot;
  projectId: string;
  userRole: 'owner' | 'admin' | 'member' | 'viewer';
}

export default function LotDetailClient({ lot, projectId, userRole }: LotDetailClientProps) {
  const router = useRouter();
  const [showAssignITPModal, setShowAssignITPModal] = useState(false);

  const canEdit = ['owner', 'admin', 'member'].includes(userRole);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_review':
        return 'bg-blue-100 text-blue-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
      case 'draft':
        return <Clock className="h-4 w-4" />;
      case 'in_review':
      case 'in_progress':
        return <AlertTriangle className="h-4 w-4" />;
      case 'approved':
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const handleITPAssigned = () => {
    setShowAssignITPModal(false);
    // Refresh the page to get updated data
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/dashboard/projects/${projectId}`)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Project
            </Button>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Lot #{lot.lot_number}
                  {lot.name && `: ${lot.name}`}
                </h1>
                <p className="text-sm text-gray-500 mt-1">Project: {lot.projects.name}</p>
                {lot.description && <p className="mt-2 text-gray-600">{lot.description}</p>}
                <div className="mt-4 flex items-center gap-4">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(lot.status)}`}
                  >
                    {getStatusIcon(lot.status)}
                    <span className="ml-1 capitalize">{lot.status.replace('_', ' ')}</span>
                  </span>
                  <span className="text-sm text-gray-500 flex items-center">
                    <Calendar className="mr-1 h-4 w-4" />
                    Created {new Date(lot.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lot Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Lot Information</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Status</dt>
                    <dd className="mt-1 text-sm text-gray-900 capitalize">
                      {lot.status.replace('_', ' ')}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-sm font-medium text-gray-500">Created</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(lot.created_at).toLocaleDateString()}
                    </dd>
                  </div>

                  {lot.reviewed_at && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Reviewed</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {new Date(lot.reviewed_at).toLocaleDateString()}
                      </dd>
                    </div>
                  )}

                  {lot.files && lot.files.length > 0 && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Attachments</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {lot.files.length} {lot.files.length === 1 ? 'file' : 'files'}
                      </dd>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">ITP Progress</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {lot.itp_instances.length}
                    </div>
                    <div className="text-sm text-gray-500">
                      Total ITP{lot.itp_instances.length !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {lot.itp_instances.length > 0 && (
                    <div className="space-y-2">
                      {['draft', 'in_progress', 'completed'].map((status) => {
                        const count = lot.itp_instances.filter(
                          (itp) => itp.status === status
                        ).length;
                        return count > 0 ? (
                          <div key={status} className="flex justify-between text-sm">
                            <span className="text-gray-500 capitalize">
                              {status.replace('_', ' ')}
                            </span>
                            <span className="font-medium">{count}</span>
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ITPs Section */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Inspection Test Plans ({lot.itp_instances.length})
            </h3>
            {canEdit && (
              <Button onClick={() => setShowAssignITPModal(true)} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Assign ITP
              </Button>
            )}
          </div>

          <div className="p-6">
            {lot.itp_instances.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardList className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No ITPs assigned</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by assigning an ITP template to this lot.
                </p>
                {canEdit && (
                  <div className="mt-6">
                    <Button onClick={() => setShowAssignITPModal(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Assign ITP
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {lot.itp_instances.map((itp) => (
                  <div
                    key={itp.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-lg font-medium text-gray-900">{itp.name}</h4>
                        {itp.itp_templates.description && (
                          <p className="mt-1 text-sm text-gray-600">
                            {itp.itp_templates.description}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(itp.status)}`}
                          >
                            {getStatusIcon(itp.status)}
                            <span className="ml-1 capitalize">{itp.status.replace('_', ' ')}</span>
                          </span>
                          {itp.itp_templates.category && (
                            <span className="text-xs text-gray-500">
                              {itp.itp_templates.category}
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            Created {new Date(itp.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        {itp.completion_percentage > 0 && (
                          <div className="mt-3">
                            <div className="flex justify-between text-sm text-gray-600 mb-1">
                              <span>Progress</span>
                              <span>{itp.completion_percentage}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${itp.completion_percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Files Section */}
        {lot.files && lot.files.length > 0 && (
          <div className="mt-6 bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Attachments ({lot.files.length})
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {lot.files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-md"
                  >
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{file.name}</p>
                        <p className="text-xs text-gray-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      View
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Assign ITP Modal */}
      {showAssignITPModal && (
        <AssignITPModal
          isOpen={showAssignITPModal}
          onClose={() => setShowAssignITPModal(false)}
          onITPAssigned={handleITPAssigned}
          lotId={lot.id}
          projectId={projectId}
          assignedTemplateIds={lot.itp_instances.map((itp) => itp.itp_templates.id)}
        />
      )}
    </div>
  );
}
