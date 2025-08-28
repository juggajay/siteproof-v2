'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { FileText, Calendar, CheckCircle, Clock, XCircle, AlertCircle, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface LotListProps {
  projectId: string;
  canEdit: boolean;
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
}

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('Failed to fetch lots');
  return res.json();
});

export function LotList({ projectId }: LotListProps) {
  const router = useRouter();
  const [deletingLot, setDeletingLot] = useState<string | null>(null);

  // Use SWR for data fetching
  const { data, error, isLoading, mutate } = useSWR(
    `/api/projects/${projectId}/lots`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnMount: true
    }
  );

  const lots: Lot[] = Array.isArray(data) ? data : data?.lots || [];

  const getStatusIcon = (status: 'pending' | 'in_review' | 'approved' | 'rejected') => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'in_review':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: 'pending' | 'in_review' | 'approved' | 'rejected') => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_review':
        return 'bg-blue-100 text-blue-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
    }
  };

  const deleteLot = async (lotId: string, lotName: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete lot "${lotName}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    setDeletingLot(lotId);
    try {
      const response = await fetch(`/api/lots/${lotId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete lot');
      }

      // Refresh the lot list
      await mutate();
      toast.success(`Lot "${lotName}" deleted successfully`);
      console.log('Lot deleted successfully:', lotId);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete lot');
    } finally {
      setDeletingLot(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <p className="text-sm text-red-800">{error}</p>
      </div>
    );
  }

  if (lots.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No lots</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by creating a new lot for this project.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {lots.map((lot) => {
        const lotUrl = `/dashboard/projects/${projectId}/lots/${lot.id}`;
        console.log('[LotList] Lot URL generated:', lotUrl, {
          lotId: lot.id,
          projectId,
          projectIdType: typeof projectId,
          projectIdLength: projectId.length,
          lotIdType: typeof lot.id,
          lotIdLength: lot.id.length,
        });
        return (
          <div
            key={lot.id}
            className="block bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={(e) => {
              // Don't navigate if clicking on delete button
              if ((e.target as HTMLElement).closest('[data-delete-button]')) {
                return;
              }
              console.log('[LotList] Navigating with router.push to:', lotUrl);
              router.push(lotUrl);
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-medium text-gray-900">
                    Lot #{lot.lot_number}
                    {lot.name && `: ${lot.name}`}
                  </h3>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(lot.status)}`}
                  >
                    {getStatusIcon(lot.status)}
                    <span className="ml-1 capitalize">{lot.status.replace('_', ' ')}</span>
                  </span>
                </div>

                {lot.description && <p className="mt-1 text-sm text-gray-600">{lot.description}</p>}

                <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center">
                    <Calendar className="mr-1 h-4 w-4" />
                    {formatDistanceToNow(new Date(lot.created_at), { addSuffix: true })}
                  </div>

                  {lot.files && lot.files.length > 0 && (
                    <div className="flex items-center">
                      <FileText className="mr-1 h-4 w-4" />
                      {lot.files.length} {lot.files.length === 1 ? 'file' : 'files'}
                    </div>
                  )}
                </div>
              </div>

              {/* Delete button */}
              <button
                data-delete-button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteLot(lot.id, `Lot #${lot.lot_number}${lot.name ? `: ${lot.name}` : ''}`);
                }}
                className="ml-4 p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                title="Delete Lot"
                disabled={deletingLot === lot.id}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
