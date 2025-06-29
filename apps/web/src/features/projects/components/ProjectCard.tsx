'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Calendar, MessageSquare, CheckCircle, Clock, Building } from 'lucide-react';
import type { Project } from '../hooks/useProjects';

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const statusColors = {
    active: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    archived: 'bg-gray-100 text-gray-800',
  };

  const statusIcons = {
    active: Clock,
    completed: CheckCircle,
    archived: Clock,
  };

  const StatusIcon = statusIcons[project.status];

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric' 
    });
  };

  const isOverdue = project.dueDate && 
    project.status === 'active' && 
    new Date(project.dueDate) < new Date();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4 }}
      className="group"
    >
      <Link href={`/projects/${project.id}`}>
        <div className="h-full bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                {project.name}
              </h3>
              {project.clientCompany && (
                <div className="flex items-center mt-1 text-sm text-gray-500">
                  <Building className="w-4 h-4 mr-1" />
                  {project.clientCompany}
                </div>
              )}
            </div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[project.status]}`}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {project.status}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600">Progress</span>
              <span className="text-sm font-medium text-gray-900">
                {project.progressPercentage}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className="bg-blue-600 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${project.progressPercentage}%` }}
                transition={{ duration: 0.5, delay: 0.2 }}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-semibold text-gray-900">
                {project.stats.totalLots}
              </div>
              <div className="text-xs text-gray-500">Total Lots</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold text-green-600">
                {project.stats.approvedLots}
              </div>
              <div className="text-xs text-gray-500">Approved</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold text-amber-600">
                {project.stats.pendingLots}
              </div>
              <div className="text-xs text-gray-500">Pending</div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4 text-gray-500">
              {project.dueDate && (
                <div className={`flex items-center ${isOverdue ? 'text-red-600' : ''}`}>
                  <Calendar className="w-4 h-4 mr-1" />
                  {formatDate(project.dueDate)}
                </div>
              )}
              {project.stats.unresolvedComments > 0 && (
                <div className="flex items-center">
                  <MessageSquare className="w-4 h-4 mr-1" />
                  {project.stats.unresolvedComments}
                </div>
              )}
            </div>
            {project.lastActivityAt && (
              <div className="text-xs text-gray-400">
                Active {formatRelativeTime(project.lastActivityAt)}
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}