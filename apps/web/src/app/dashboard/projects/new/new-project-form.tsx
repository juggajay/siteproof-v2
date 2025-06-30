'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreateProjectModal } from '@/features/projects/components/CreateProjectModal';

export default function NewProjectForm({ organizationId }: { organizationId: string }) {
  const [isOpen, setIsOpen] = useState(true);
  const router = useRouter();

  const handleClose = () => {
    setIsOpen(false);
    router.push('/dashboard/projects');
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="py-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Create New Project</h1>
              <p className="mt-2 text-gray-600">
                Set up a new construction project to track progress and manage documentation
              </p>
            </div>
          </div>
        </div>
      </div>
      <CreateProjectModal 
        isOpen={isOpen} 
        onClose={handleClose} 
        organizationId={organizationId} 
      />
    </>
  );
}