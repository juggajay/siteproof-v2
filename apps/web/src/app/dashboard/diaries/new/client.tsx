'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@siteproof/design-system';
import { DiaryForm } from '@/features/diary/components/DiaryForm';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

export default function NewDiaryClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams?.get('project_id');
  const dateParam = searchParams?.get('date');
  const date = dateParam ? new Date(dateParam) : new Date();

  // Fetch project data
  const { data: projectData, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) throw new Error('Failed to fetch project');
      const data = await response.json();
      return data.project; // Extract the project from the response
    },
    enabled: !!projectId,
  });

  // Fetch all projects if no projectId provided
  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await fetch('/api/projects');
      if (!response.ok) throw new Error('Failed to fetch projects');
      const data = await response.json();
      return data.projects;
    },
    enabled: !projectId,
  });

  const handleSuccess = (diaryId: string) => {
    router.push(`/dashboard/diaries/${diaryId}`);
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard/diaries">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Diaries
            </Button>
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-900">New Daily Diary</h1>
        <p className="mt-2 text-sm text-gray-600">
          Record daily activities, workforce, and costs for {date.toLocaleDateString()}
        </p>
      </div>

      {/* Form */}
      <div className="bg-white shadow rounded-lg">
        {projectData ? (
          <DiaryForm
            project={projectData}
            date={date}
            onSuccess={handleSuccess}
            onCancel={() => router.push('/dashboard/diaries')}
          />
        ) : !isLoading && !projectId ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 mb-4">Please select a project to create a diary entry</p>
            {projects && projects.length > 0 && (
              <select
                className="border rounded px-4 py-2"
                defaultValue=""
                onChange={(e) => {
                  const selectedProjectId = e.target.value;
                  if (selectedProjectId) {
                    router.push(
                      `/dashboard/diaries/new?project_id=${selectedProjectId}&date=${date.toISOString()}`
                    );
                  }
                }}
              >
                <option value="">Select a project</option>
                {projects.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        ) : isLoading ? (
          <div className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
            <p className="mt-2 text-gray-500">Loading project...</p>
          </div>
        ) : (
          <div className="p-8 text-center text-red-500">
            <p>Failed to load project. Please try again.</p>
            <Button
              variant="ghost"
              className="mt-4"
              onClick={() => router.push('/dashboard/diaries/new')}
            >
              Back to project selection
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
