'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@siteproof/design-system';
import { DiaryForm } from '@/features/diary/components/DiaryForm';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

export default function NewDiaryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('project_id');
  const dateParam = searchParams.get('date');
  const date = dateParam ? new Date(dateParam) : new Date();

  // Fetch project data
  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) throw new Error('Failed to fetch project');
      return response.json();
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

  const handleCancel = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!projectId || !project) {
    return (
      <div className="p-8">
        <div className="mb-6">
          <Link href="/dashboard/diaries">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Diaries
            </Button>
          </Link>
        </div>

        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Select a Project</h1>
          <p className="text-gray-600 mb-8">
            Please select a project to create a daily diary for.
          </p>
          
          <div className="space-y-3">
            {projects?.map((proj: any) => (
              <Link
                key={proj.id}
                href={`/dashboard/diaries/new?project_id=${proj.id}&date=${date.toISOString().split('T')[0]}`}
                className="block p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all"
              >
                <h3 className="font-semibold text-gray-900">{proj.name}</h3>
                <p className="text-sm text-gray-600">
                  {proj.client_name} • {proj.status}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/dashboard/diaries">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Diaries
          </Button>
        </Link>
      </div>

      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">New Daily Diary</h1>
        
        <DiaryForm
          project={project}
          date={date}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}