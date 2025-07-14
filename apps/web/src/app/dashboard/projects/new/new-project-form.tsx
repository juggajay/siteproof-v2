'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@siteproof/design-system';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { CreateProjectForm } from '@/features/projects/components/CreateProjectForm';
import { useCreateProject } from '@/features/projects/hooks/useProjects';

export default function NewProjectForm({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const createProject = useCreateProject();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: any) => {
    console.log('[NewProjectForm] Submitting project with data:', data);
    setIsSubmitting(true);
    try {
      const result = await createProject.mutateAsync({
        ...data,
        organizationId,
      });
      console.log('[NewProjectForm] Project created successfully, redirecting...', result);

      // Add a small delay before redirecting to ensure cache updates are processed
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Redirect to projects list after successful creation
      router.push('/dashboard/projects');
    } catch (error) {
      console.error('[NewProjectForm] Failed to create project:', error);
      // Error is handled by the mutation hook
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="py-8">
          {/* Back button */}
          <div className="mb-6">
            <Link href="/dashboard/projects">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Projects
              </Button>
            </Link>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Create New Project</h1>
            <p className="mt-2 text-gray-600">
              Set up a new construction project to track progress and manage documentation
            </p>
          </div>

          {/* Form Card */}
          <Card>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
            </CardHeader>
            <CardContent>
              <CreateProjectForm
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                onCancel={() => router.push('/dashboard/projects')}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
