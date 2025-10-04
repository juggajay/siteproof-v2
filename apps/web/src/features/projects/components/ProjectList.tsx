'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search } from 'lucide-react';
import { StateDisplay, Button, Input, Skeleton } from '@siteproof/design-system';
import { toast } from 'sonner';
import { useProjects } from '../hooks/useProjects';
import { ProjectCard } from './ProjectCard';

interface ProjectListProps {
  organizationId?: string;
  onCreateProject: () => void;
}

export function ProjectList({ organizationId, onCreateProject }: ProjectListProps) {
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState<'active' | 'completed' | 'archived' | undefined>();
  const [sortBy, setSortBy] = React.useState<'last_activity_at' | 'name' | 'due_date'>(
    'last_activity_at'
  );
  const [page, setPage] = React.useState(1);

  const { data, isLoading, error, refetch } = useProjects({
    organizationId,
    status,
    search,
    sortBy,
    page,
    limit: 12,
  });

  const handleDeleteProject = async (projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete project');
      }

      // Refresh the project list
      refetch();
      console.log('Project deleted successfully:', projectId);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete project');
    }
  };

  const handleSearchChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1); // Reset to first page on search
  }, []);

  const ProjectSkeleton = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <Skeleton className="h-6 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-6 w-20" variant="rectangular" />
      </div>
      <Skeleton className="h-2 w-full mb-4" />
      <div className="grid grid-cols-3 gap-4 mb-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="text-center">
            <Skeleton className="h-8 w-12 mx-auto mb-1" />
            <Skeleton className="h-3 w-16 mx-auto" />
          </div>
        ))}
      </div>
      <div className="flex justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your website proofs and client feedback
          </p>
        </div>
        <Button onClick={onCreateProject} size="lg">
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="search"
                placeholder="Search projects..."
                value={search}
                onChange={handleSearchChange}
                className="pl-10"
                fullWidth
              />
            </div>
          </div>

          {/* Status Filter */}
          <select
            value={status || ''}
            onChange={(e) => {
              setStatus((e.target.value as any) || undefined);
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="last_activity_at">Last Activity</option>
            <option value="name">Name</option>
            <option value="due_date">Due Date</option>
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      <StateDisplay
        loading={isLoading}
        error={error}
        empty={!data?.projects.length}
        onRetry={refetch}
        onEmptyAction={onCreateProject}
        emptyTitle="No projects yet"
        emptyDescription="Create your first project to start managing website proofs"
        emptyActionText="Create Project"
        loadingComponent={
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <ProjectSkeleton key={i} />
            ))}
          </div>
        }
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={`${search}-${status}-${sortBy}-${page}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {data?.projects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <ProjectCard project={project} onDelete={handleDeleteProject} />
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </StateDisplay>

      {/* Pagination */}
      {data && data.total > data.limit && (
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="ghost"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-600">
            Page {page} of {Math.ceil(data.total / data.limit)}
          </span>
          <Button
            variant="ghost"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(data.total / data.limit)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
