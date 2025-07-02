import { Metadata } from 'next';
import { Suspense } from 'react';
import EditDiaryClient from './client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Edit Daily Diary - SiteProof',
  description: 'Edit daily diary entry',
};

interface EditDiaryPageProps {
  params: {
    id: string;
  };
}

export default function EditDiaryPage({ params }: EditDiaryPageProps) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64">Loading...</div>}>
      <EditDiaryClient diaryId={params.id} />
    </Suspense>
  );
}
