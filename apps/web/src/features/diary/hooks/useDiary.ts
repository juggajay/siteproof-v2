import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { DailyDiary, Project, User } from '@siteproof/database';

// Extended diary type that includes joined data from the API
export interface DiaryWithRelations extends Omit<DailyDiary, 'createdBy' | 'approvedBy'> {
  project?: Project;
  createdBy?: Pick<User, 'id' | 'email' | 'full_name'>;
  approvedBy?: Pick<User, 'id' | 'email' | 'full_name'>;
  workforce_costs?: any;
  total_daily_cost?: number;
  notes?: string | null; // Some RPC functions might return 'notes' instead of 'general_notes'
}

interface UseDiariesOptions {
  projectId?: string;
  startDate?: string;
  endDate?: string;
}

export function useDiaries(options: UseDiariesOptions = {}) {
  return useQuery({
    queryKey: ['diaries', options],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (options.projectId) params.append('project_id', options.projectId);
      if (options.startDate) params.append('start_date', options.startDate);
      if (options.endDate) params.append('end_date', options.endDate);

      const response = await fetch(`/api/diaries?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch diaries');
      }

      const data = await response.json();
      return data.diaries as DailyDiary[];
    },
  });
}

export function useDiary(diaryId: string) {
  return useQuery({
    queryKey: ['diary', diaryId],
    queryFn: async () => {
      const response = await fetch(`/api/diaries/${diaryId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch diary');
      }

      const data = await response.json();
      return data.diary as DiaryWithRelations;
    },
    enabled: !!diaryId,
  });
}

export function useCreateDiary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/diaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create diary');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['diaries'] });
      toast.success(`Daily diary created for ${new Date(data.diary.diary_date).toLocaleDateString()}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateDiary(diaryId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/diaries/${diaryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update diary');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diary', diaryId] });
      queryClient.invalidateQueries({ queryKey: ['diaries'] });
      toast.success('Daily diary updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDiaryForDate(projectId: string, date: Date) {
  const dateString = date.toISOString().split('T')[0];
  
  return useQuery({
    queryKey: ['diary', projectId, dateString],
    queryFn: async () => {
      const response = await fetch(
        `/api/diaries/by-date?project_id=${projectId}&date=${dateString}`
      );
      
      if (!response.ok) {
        if (response.status === 404) {
          return null; // No diary exists for this date
        }
        throw new Error('Failed to fetch diary');
      }

      const data = await response.json();
      return data.diary as DiaryWithRelations | null;
    },
    enabled: !!projectId,
  });
}