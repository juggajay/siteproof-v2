'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@siteproof/design-system';
import { ProjectList } from '@/features/projects/components/ProjectList';
import { useRouter } from 'next/navigation';

export default function ProjectsPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="py-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
              <p className="mt-2 text-gray-600">
                Manage your construction projects and track progress
              </p>
            </div>
            <Link href="/dashboard/projects/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </Link>
          </div>

          {/* Projects List */}
          <ProjectList onCreateProject={() => router.push('/dashboard/projects/new')} />
        </div>
      </div>
    </div>
  );
}