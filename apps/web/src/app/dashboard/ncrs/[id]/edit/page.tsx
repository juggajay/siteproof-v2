'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { Button, StateDisplay } from '@siteproof/design-system';
import { useNcr } from '@/features/ncr/hooks/useNcr';
import { NcrForm } from '@/features/ncr/components/NcrForm';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { toast } from 'sonner';

export default function EditNCRPage() {
  const params = useParams();
  const router = useRouter();
  const ncrId = params?.id as string;

  // Fetch NCR details
  const { data: ncr, isLoading: ncrLoading, error: ncrError, refetch } = useNcr(ncrId);

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        return { id: 'temp-user', email: 'user@example.com', full_name: 'Current User' };
      }
      return response.json();
    },
  });

  // Fetch project details
  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', ncr?.project_id],
    queryFn: async () => {
      if (!ncr?.project_id) return null;
      const response = await fetch(`/api/projects/${ncr.project_id}`);
      if (!response.ok) throw new Error('Failed to fetch project');
      const data = await response.json();
      return data.project;
    },
    enabled: !!ncr?.project_id,
  });

  const handleSuccess = (ncrId: string) => {
    toast.success('NCR updated successfully');
    router.push(`/dashboard/ncrs/${ncrId}`);
  };

  const handleCancel = () => {
    router.push(`/dashboard/ncrs/${ncrId}`);
  };

  // Check permissions
  const isRaisedBy = ncr?.raised_by === currentUser?.id;
  const canEdit = isRaisedBy && ncr?.status === 'open';

  const isLoading = ncrLoading || projectLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (ncrError || !ncr) {
    return (
      <StateDisplay
        error={ncrError}
        onRetry={refetch}
        emptyTitle="NCR not found"
        emptyDescription="The NCR you're looking for doesn't exist or has been deleted."
      >
        <div />
      </StateDisplay>
    );
  }

  if (!canEdit) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-red-900 mb-2">Cannot Edit NCR</h2>
            <p className="text-red-700 mb-4">
              {!isRaisedBy
                ? 'You can only edit NCRs that you raised.'
                : "NCRs can only be edited while they are in 'Open' status."}
            </p>
            <Link href={`/dashboard/ncrs/${ncrId}`}>
              <Button variant="secondary">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to NCR
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Link href={`/dashboard/ncrs/${ncrId}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to NCR
              </Button>
            </Link>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Edit NCR: {ncr.ncr_number}
                </h1>
                <p className="text-gray-600">
                  Update the details of this non-conformance report. Only certain fields can be
                  edited after creation.
                </p>
              </div>
            </div>
          </div>

          {/* Edit Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-blue-900 mb-2">Editing Guidelines</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• You can only edit NCRs while they are in &quot;Open&quot; status</li>
              <li>• Some fields like project and inspection cannot be changed</li>
              <li>• All changes are tracked in the NCR history</li>
              <li>• Notify assigned parties of significant changes</li>
            </ul>
          </div>
        </div>

        {/* Form Section */}
        <div className="bg-white shadow rounded-lg p-6">
          {project ? (
            <NcrForm
              project={project}
              ncr={ncr}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
              editMode={true}
            />
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading project details...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
