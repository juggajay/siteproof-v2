'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@siteproof/design-system';
import { CreateLotModal } from '@/features/lots/components/CreateLotModal';
import { LotList } from '@/features/lots/components/LotList';

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  organization_id: string;
  organizations: {
    id: string;
    name: string;
  };
}

interface LotsPageClientProps {
  project: Project;
  userRole: string;
  canEdit: boolean;
}

export default function LotsPageClient({ project, userRole, canEdit }: LotsPageClientProps) {
  const [showCreateLotModal, setShowCreateLotModal] = useState(false);
  const [refreshLotsFn, setRefreshLotsFn] = useState<(() => Promise<void>) | null>(null);

  const refreshLots = async () => {
    if (refreshLotsFn) {
      await refreshLotsFn();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-4">
            <Link href={`/dashboard/projects/${project.id}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Project
              </Button>
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Lots</h1>
                <p className="mt-2 text-lg text-gray-600">{project.name}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Organization: {project.organizations.name}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">Role: {userRole}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Lots List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Project Lots</h2>
            {canEdit && (
              <Button size="sm" onClick={() => setShowCreateLotModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Lot
              </Button>
            )}
          </div>
          <LotList
            projectId={project.id}
            canEdit={canEdit}
            onRefreshNeeded={(fn) => setRefreshLotsFn(() => fn)}
          />
        </div>
      </div>

      {/* Modals */}
      {showCreateLotModal && (
        <CreateLotModal
          projectId={project.id}
          onClose={() => setShowCreateLotModal(false)}
          onSuccess={async () => {
            console.log('[LotsPage] Lot created successfully, refreshing data');
            await refreshLots();
            setShowCreateLotModal(false);
          }}
        />
      )}
    </div>
  );
}
