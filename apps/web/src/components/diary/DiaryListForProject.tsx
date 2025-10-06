'use client';

import React, { useMemo } from 'react';
import { Calendar, ChevronRight, Plus } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@siteproof/design-system';
import { useDiaries } from '@/features/diary/hooks/useDiary';
import { formatDistanceToNow } from 'date-fns';

interface DiaryListForProjectProps {
  projectId: string;
}

export function DiaryListForProject({ projectId }: DiaryListForProjectProps) {
  const {
    data: diaries,
    isLoading,
    error,
  } = useDiaries({
    projectId,
    startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const sortedDiaries = useMemo(() => {
    if (!diaries?.length) {
      return [];
    }
    return [...diaries].sort((a, b) => {
      const aDate = new Date(a.diary_date).getTime();
      const bDate = new Date(b.diary_date).getTime();
      return bDate - aDate;
    });
  }, [diaries]);

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Loading diaries...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        Error loading diaries. Please try again later.
      </div>
    );
  }

  if (!sortedDiaries.length) {
    return (
      <div className="text-center py-12">
        <Calendar className="mx-auto h-12 w-12 text-gray-300" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No diary entries</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by creating your first daily diary entry for this project.
        </p>
        <div className="mt-6">
          <Link href={'/dashboard/projects/' + projectId + '/diaries/new'}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Diary Entry
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedDiaries.map((diary) => (
        <Link
          key={diary.id}
          href={'/dashboard/projects/' + projectId + '/diaries/' + diary.id}
          className="block border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <h4 className="text-base font-medium text-gray-900">
                    {new Date(diary.diary_date).toLocaleDateString('en-AU', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </h4>
                  {diary.created_at && (
                    <p className="text-sm text-gray-500">
                      {formatDistanceToNow(new Date(diary.created_at), { addSuffix: true })}
                    </p>
                  )}
                </div>
              </div>

              {diary.work_summary && (
                <p className="mt-2 text-sm text-gray-600 line-clamp-2">{diary.work_summary}</p>
              )}

              {(diary.weather_conditions || diary.weather_notes) && (
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                  <span>Weather: {diary.weather_conditions || diary.weather_notes}</span>
                  {diary.temperature_max != null && <span>• {diary.temperature_max}°C</span>}
                </div>
              )}
            </div>

            <ChevronRight className="h-5 w-5 text-gray-400" />
          </div>
        </Link>
      ))}
    </div>
  );
}
