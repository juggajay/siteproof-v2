'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

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
            <h1 className="text-2xl font-bold text-gray-900">
              Lot #{lot.lot_number}
              {lot.name && `: ${lot.name}`}
            </h1>
            <p className="text-sm text-gray-500 mt-1">Project: {lot.project?.name || 'Unknown'}</p>
            <p className="text-sm text-gray-500 mt-1">User Role: {userRole}</p>
            <p className="text-sm text-gray-500 mt-1">Status: {lot.status}</p>
          </div>
        </div>

        {/* Debug Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Debug Information</h2>
          <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify({ lot, projectId, userRole }, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
