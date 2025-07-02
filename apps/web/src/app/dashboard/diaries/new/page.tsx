import { Metadata } from 'next';
import { Suspense } from 'react';
import NewDiaryClient from './client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'New Daily Diary - SiteProof',
  description: 'Create a new daily diary entry',
};

export default function NewDiaryPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64">Loading...</div>}>
      <NewDiaryClient />
    </Suspense>
  );
}