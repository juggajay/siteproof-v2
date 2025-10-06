'use client';

import { useRouter } from 'next/navigation';
import type { Project, DailyDiary } from '@siteproof/database';
import { DiaryForm } from '@/features/diary/components/DiaryForm';

interface ProjectDiaryFormClientProps {
  project: Project & { [key: string]: any };
  diary?: (DailyDiary & { [key: string]: any }) | null;
}

export function ProjectDiaryFormClient({ project, diary }: ProjectDiaryFormClientProps) {
  const router = useRouter();

  const handleSuccess = (_diaryId: string) => {
    router.push('/dashboard/projects/' + project.id + '?section=diaries');
  };

  const handleCancel = () => {
    router.push('/dashboard/projects/' + project.id + '?section=diaries');
  };

  return (
    <DiaryForm
      project={project as Project}
      diary={diary ?? undefined}
      date={diary ? new Date(diary.diary_date) : undefined}
      onSuccess={handleSuccess}
      onCancel={handleCancel}
    />
  );
}
