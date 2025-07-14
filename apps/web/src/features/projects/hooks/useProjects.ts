'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface Project {
  id: string;
  name: string;
  status: 'active' | 'completed' | 'archived';
  organizationId: string;
  clientName?: string;
  clientCompany?: string;
  dueDate?: string;
  createdAt: string;
  lastActivityAt?: string;
  progressPercentage: number;
  stats: {
    totalLots: number;
    pendingLots: number;
    inReviewLots: number;
    approvedLots: number;
    rejectedLots: number;
    totalComments: number;
    unresolvedComments: number;
  };
}

export interface ProjectsResponse {
  projects: Project[];
  total: number;
  page: number;
  limit: number;
}

export interface UseProjectsOptions {
  organizationId?: string;
  status?: 'active' | 'completed' | 'archived';
  search?: string;
  sortBy?: 'name' | 'due_date' | 'last_activity_at' | 'progress' | 'created_at';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export function useProjects(options: UseProjectsOptions = {}) {
  const {
    organizationId,
    status,
    search,
    sortBy = 'last_activity_at',
    sortOrder = 'desc',
    page = 1,
    limit = 20,
  } = options;

  return useQuery<ProjectsResponse, Error>({
    queryKey: ['projects', { organizationId, status, search, sortBy, sortOrder, page, limit }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (organizationId) params.append('organizationId', organizationId);
      if (status) params.append('status', status);
      if (search) params.append('search', search);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const response = await fetch(`/api/projects?${params}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch projects');
      }

      return response.json();
    },
    staleTime: 10 * 1000, // Consider data fresh for 10 seconds (reduced for better responsiveness)
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: true, // Always refetch when component mounts
  });
}

export interface CreateProjectData {
  organizationId: string;
  name: string;
  description?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientCompany?: string;
  startDate?: string;
  dueDate?: string;
  visibility?: 'private' | 'public' | 'password';
  password?: string;
}

interface CreateProjectResponse {
  message: string;
  project: Project;
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation<CreateProjectResponse, Error, CreateProjectData>({
    mutationFn: async (data) => {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create project');
      }

      return response.json();
    },
    onSuccess: (response) => {
      // Optimistically update the cache with the new project
      queryClient.setQueriesData<ProjectsResponse>({ queryKey: ['projects'] }, (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          projects: [response.project, ...oldData.projects],
          total: oldData.total + 1,
        };
      });

      // Invalidate and refetch projects list to ensure consistency
      queryClient.invalidateQueries({
        queryKey: ['projects'],
        refetchType: 'all',
      });

      // Schedule an additional refetch after a delay to catch any delayed updates
      setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: ['projects'],
          refetchType: 'all',
        });
      }, 2000);

      toast.success('Project created successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create project');
    },
  });
}
