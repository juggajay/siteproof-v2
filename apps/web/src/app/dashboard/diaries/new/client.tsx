'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@siteproof/design-system';
import { DiaryForm } from '@/features/diary/components/DiaryForm';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

export default function NewDiaryClient() {
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
        <DiaryForm
          projectId={projectId || undefined}
          initialDate={date}
          projects={projects}
          isLoadingProject={isLoading}
          onSuccess={handleSuccess}
          onCancel={() => router.push('/dashboard/diaries')}
        />
      </div>
    </div>
  );
}