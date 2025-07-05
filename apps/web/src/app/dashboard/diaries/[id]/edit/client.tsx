'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button, StateDisplay } from '@siteproof/design-system';
import { DiaryForm } from '@/features/diary/components/DiaryForm';
import { useDiary } from '@/features/diary/hooks/useDiary';
import { useOrganizationRole } from '@/features/organizations/hooks/useOrganization';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { toast } from 'sonner';
import type { DailyDiary } from '@siteproof/database';

interface EditDiaryClientProps {
  diaryId: string;
}

export default function EditDiaryClient({ diaryId }: EditDiaryClientProps) {
  const router = useRouter();
  const { data: role } = useOrganizationRole();
  const { data: diary, isLoading: diaryLoading, error: diaryError, refetch } = useDiary(diaryId);

  // Check if user can edit
  const canEdit = ['owner', 'admin', 'project_manager'].includes(role?.role || '');

  // Fetch project data
  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', diary?.project_id],
    queryFn: async () => {
      if (!diary?.project_id) return null;
      const response = await fetch(`/api/projects/${diary.project_id}`);
      if (!response.ok) throw new Error('Failed to fetch project');
      return response.json();
    },
    enabled: !!diary?.project_id,
  });

  const handleSuccess = () => {
    toast.success('Diary updated successfully');
    router.push(`/dashboard/diaries/${diaryId}`);
  };

  const handleCancel = () => {
    router.push(`/dashboard/diaries/${diaryId}`);
  };

  // Check permissions
  if (!diaryLoading && !canEdit) {
    return (
      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-lg font-semibold text-red-900 mb-2">Access Denied</h2>
          <p className="text-red-700 mb-4">You do not have permission to edit daily diaries.</p>
          <Link href={`/dashboard/diaries/${diaryId}`}>
            <Button variant="secondary">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Diary
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Check if diary is approved
  if (diary?.approved_at) {
    return (
      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <h2 className="text-lg font-semibold text-yellow-900 mb-2">Diary Approved</h2>
          <p className="text-yellow-700 mb-4">This diary has been approved and cannot be edited.</p>
          <Link href={`/dashboard/diaries/${diaryId}`}>
            <Button variant="secondary">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Diary
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isLoading = diaryLoading || projectLoading;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <Link href={`/dashboard/diaries/${diaryId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Diary
            </Button>
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-900">Edit Daily Diary</h1>
        {diary && (
          <p className="mt-2 text-sm text-gray-600">
            Editing {diary.diary_number} for {new Date(diary.diary_date).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Form */}
      <div className="bg-white shadow rounded-lg">
        <StateDisplay
          loading={isLoading}
          error={diaryError}
          empty={!isLoading && !diary}
          onRetry={refetch}
          emptyTitle="Diary not found"
          emptyDescription="The diary you're looking for doesn't exist or has been deleted."
        >
          {diary && project && (
            <DiaryForm
              project={project}
              diary={
                {
                  ...diary,
                  createdBy: diary.createdBy?.id ?? diary.createdBy,
                  approvedBy: diary.approvedBy?.id ?? diary.approvedBy,
                } as DailyDiary
              }
              date={new Date(diary.diary_date)}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          )}
        </StateDisplay>
      </div>
    </div>
  );
}
