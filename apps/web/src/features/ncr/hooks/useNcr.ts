import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { NCR, NCRStatus } from '@siteproof/database';

interface UseNcrOptions {
  projectId?: string;
  status?: NCRStatus;
  assignedTo?: string;
  severity?: string;
}

export function useNcrs(options: UseNcrOptions = {}) {
  return useQuery({
    queryKey: ['ncrs', options],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (options.projectId) params.append('project_id', options.projectId);
      if (options.status) params.append('status', options.status);
      if (options.assignedTo) params.append('assigned_to', options.assignedTo);
      if (options.severity) params.append('severity', options.severity);

      const response = await fetch(`/api/ncrs?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch NCRs');
      }

      const data = await response.json();
      return data.ncrs as NCR[];
    },
  });
}

export function useNcr(ncrId: string) {
  return useQuery({
    queryKey: ['ncr', ncrId],
    queryFn: async () => {
      const response = await fetch(`/api/ncrs/${ncrId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch NCR');
      }

      const data = await response.json();
      return data.ncr as NCR;
    },
    enabled: !!ncrId,
  });
}

export function useNcrActions(ncrId: string) {
  const queryClient = useQueryClient();

  const performAction = useMutation({
    mutationFn: async ({ action, data }: { action: string; data?: any }) => {
      const response = await fetch(`/api/ncrs/${ncrId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data || {}),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to ${action}`);
      }

      return response.json();
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['ncr', ncrId] });
      queryClient.invalidateQueries({ queryKey: ['ncrs'] });
      toast.success(`NCR ${action.replace(/_/g, ' ')} successfully`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    acknowledge: () => performAction.mutate({ action: 'acknowledge' }),
    startWork: () => performAction.mutate({ action: 'start_work' }),
    resolve: (data: any) => performAction.mutate({ action: 'resolve', data }),
    verify: (data: any) => performAction.mutate({ action: 'verify', data }),
    dispute: (data: any) => performAction.mutate({ action: 'dispute', data }),
    reopen: (data: any) => performAction.mutate({ action: 'reopen', data }),
    assign: (userId: string) => performAction.mutate({ action: 'assign', data: { user_id: userId } }),
    isLoading: performAction.isPending,
  };
}

export function useCreateNcr() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/ncrs', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create NCR');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ncrs'] });
      toast.success(`NCR ${data.ncr.ncr_number} created successfully`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}