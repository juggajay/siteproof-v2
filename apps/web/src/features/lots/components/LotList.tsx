'use client';

import { useState, useEffect } from 'react';
import { FileText, Calendar, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface LotListProps {
  projectId: string;
  canEdit: boolean;
  refreshTrigger?: number;
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

export function LotList({ projectId, refreshTrigger }: LotListProps) {
  const [lots, setLots] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, refreshTrigger]);

  const fetchLots = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('[LotList] Fetching lots for project:', projectId);

      const response = await fetch(`/api/projects/${projectId}/lots`);
      console.log('[LotList] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[LotList] Error response:', errorData);
        throw new Error(errorData.message || 'Failed to fetch lots');
      }

      const data = await response.json();
      console.log('[LotList] Lots fetched:', data);
      setLots(data.lots || []);
    } catch (err) {
      console.error('[LotList] Fetch error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
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
      {lots.map((lot) => (
        <div
          key={lot.id}
          className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
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
          </div>
        </div>
      ))}
    </div>
  );
}
