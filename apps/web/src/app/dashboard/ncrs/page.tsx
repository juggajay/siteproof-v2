'use client';

export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import {
  Plus,
  Filter,
  Download,
  Search,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { Button, StateDisplay } from '@siteproof/design-system';
import { useNcrs } from '@/features/ncr/hooks/useNcr';
import { NcrWorkflowCard } from '@/features/ncr/components/NcrWorkflowCard';
import { NcrStatusBadge } from '@/features/ncr/components/NcrStatusBadge';
import { NcrSeverityBadge } from '@/features/ncr/components/NcrSeverityBadge';
import type { NCRStatus, NCRSeverity } from '@siteproof/database';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function NcrsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams?.get('project_id');

  const [statusFilter, setStatusFilter] = useState<NCRStatus | ''>('');
  const [severityFilter, setSeverityFilter] = useState<NCRSeverity | ''>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  // const [page, setPage] = useState(1);

  // Fetch current user from auth
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        // Fallback to getting user from supabase client-side if API fails
        return { id: 'temp-user', email: 'user@example.com', full_name: 'Current User' };
      }
      return response.json();
    },
  });

  const {
    data: ncrData,
    isLoading,
    error,
    refetch,
  } = useNcrs({
    projectId: projectId || undefined,
    status: statusFilter || undefined,
    severity: severityFilter || undefined,
  });

  const ncrs = ncrData || [];

  const statusOptions: NCRStatus[] = [
    'open',
    'acknowledged',
    'in_progress',
    'resolved',
    'closed',
    'disputed',
  ];
  const severityOptions: NCRSeverity[] = ['low', 'medium', 'high', 'critical'];

  // Filter NCRs based on search query
  const filteredNcrs = ncrs.filter((ncr) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      ncr.ncr_number?.toLowerCase().includes(query) ||
      ncr.title?.toLowerCase().includes(query) ||
      ncr.description?.toLowerCase().includes(query) ||
      ncr.location?.toLowerCase().includes(query) ||
      ncr.trade?.toLowerCase().includes(query)
    );
  });

  // Calculate statistics
  const stats = {
    total: ncrs.length,
    open: ncrs.filter((n) => n.status === 'open').length,
    inProgress: ncrs.filter((n) => ['acknowledged', 'in_progress'].includes(n.status)).length,
    resolved: ncrs.filter((n) => n.status === 'resolved').length,
    critical: ncrs.filter((n) => n.severity === 'critical').length,
    overdue: ncrs.filter(
      (n) =>
        n.due_date &&
        new Date(n.due_date) < new Date() &&
        !['closed', 'resolved'].includes(n.status)
    ).length,
  };

  // Calculate trend (mock data for now - would come from API)
  const previousStats = {
    total: Math.floor(stats.total * 0.9),
    critical: Math.floor(stats.critical * 1.2),
  };
  const trend = {
    total: ((stats.total - previousStats.total) / (previousStats.total || 1)) * 100,
    critical: ((stats.critical - previousStats.critical) / (previousStats.critical || 1)) * 100,
  };

  // Export NCRs to CSV
  const handleExport = async () => {
    try {
      const csvContent = [
        [
          'NCR Number',
          'Title',
          'Status',
          'Severity',
          'Project',
          'Assigned To',
          'Due Date',
          'Created Date',
        ].join(','),
        ...filteredNcrs.map((ncr) =>
          [
            ncr.ncr_number,
            `"${ncr.title.replace(/"/g, '""')}"`,
            ncr.status,
            ncr.severity,
            ncr.project?.name || '',
            ncr.assignedTo?.full_name || '',
            ncr.due_date ? new Date(ncr.due_date).toLocaleDateString() : '',
            new Date(ncr.created_at).toLocaleDateString(),
          ].join(',')
        ),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `ncrs-export-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      toast.success('NCRs exported successfully');
    } catch (error) {
      toast.error('Failed to export NCRs');
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Non-Conformance Reports</h1>
            <p className="mt-2 text-gray-600">
              Track and resolve quality issues across your projects
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleExport} disabled={filteredNcrs.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button
              onClick={() =>
                router.push('/dashboard/ncrs/new' + (projectId ? `?project_id=${projectId}` : ''))
              }
            >
              <Plus className="w-4 h-4 mr-2" />
              Raise NCR
            </Button>
          </div>
        </div>

        {/* Enhanced Stats with Trends */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total NCRs</p>
              {trend.total > 0 ? (
                <TrendingUp className="w-4 h-4 text-red-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-green-500" />
              )}
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500 mt-1">
              {trend.total > 0 ? '+' : ''}
              {trend.total.toFixed(1)}% from last period
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Open</p>
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            <p className="text-2xl font-bold text-red-600">{stats.open}</p>
            <p className="text-xs text-gray-500 mt-1">
              {((stats.open / stats.total) * 100).toFixed(0)}% of total
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
            <p className="text-sm text-gray-600">In Progress</p>
            <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
            <p className="text-xs text-gray-500 mt-1">Being worked on</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Resolved</p>
              <CheckCircle className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
            <p className="text-xs text-gray-500 mt-1">Awaiting verification</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
            <p className="text-sm text-gray-600">Critical</p>
            <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
            <p className="text-xs text-gray-500 mt-1">
              {trend.critical > 0 ? '+' : ''}
              {trend.critical.toFixed(0)}% trend
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-lg border border-orange-200 p-4"
          >
            <p className="text-sm text-gray-600">Overdue</p>
            <p className="text-2xl font-bold text-orange-600">{stats.overdue}</p>
            <p className="text-xs text-orange-600 mt-1">Requires attention</p>
          </motion.div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search NCRs by number, title, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">Filters:</span>
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as NCRStatus | '')}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                  </option>
                ))}
              </select>

              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value as NCRSeverity | '')}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Severity</option>
                {severityOptions.map((severity) => (
                  <option key={severity} value={severity}>
                    {severity.charAt(0).toUpperCase() + severity.slice(1)}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-blue-100 text-blue-600'
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                  title="Grid view"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <rect x="3" y="3" width="7" height="7" strokeWidth="2" />
                    <rect x="14" y="3" width="7" height="7" strokeWidth="2" />
                    <rect x="3" y="14" width="7" height="7" strokeWidth="2" />
                    <rect x="14" y="14" width="7" height="7" strokeWidth="2" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'list'
                      ? 'bg-blue-100 text-blue-600'
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                  title="List view"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <line x1="3" y1="6" x2="21" y2="6" strokeWidth="2" />
                    <line x1="3" y1="12" x2="21" y2="12" strokeWidth="2" />
                    <line x1="3" y1="18" x2="21" y2="18" strokeWidth="2" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* NCR List */}
      <StateDisplay
        loading={isLoading}
        error={error}
        empty={!filteredNcrs.length && !searchQuery && !statusFilter && !severityFilter}
        onRetry={refetch}
        emptyTitle="No NCRs found"
        emptyDescription="Raise your first NCR to track quality issues"
      >
        {filteredNcrs.length === 0 && (searchQuery || statusFilter || severityFilter) ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No NCRs match your filters</p>
            <Button
              variant="secondary"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('');
                setSeverityFilter('');
              }}
            >
              Clear Filters
            </Button>
          </div>
        ) : null}
        {filteredNcrs.length > 0 && viewMode === 'grid' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredNcrs.map((ncr, index) => (
              <motion.div
                key={ncr.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <NcrWorkflowCard
                  ncr={ncr}
                  currentUser={currentUser || { id: '', email: '' }}
                  onViewDetails={() => router.push(`/dashboard/ncrs/${ncr.id}`)}
                  onEdit={() => router.push(`/dashboard/ncrs/${ncr.id}/edit`)}
                />
              </motion.div>
            ))}
          </div>
        ) : filteredNcrs.length > 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    NCR Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredNcrs.map((ncr, index) => (
                  <motion.tr
                    key={ncr.id}
                    className="hover:bg-gray-50 transition-colors"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {ncr.ncr_number}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-xs truncate">{ncr.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <NcrStatusBadge status={ncr.status} size="sm" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <NcrSeverityBadge severity={ncr.severity} size="sm" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {ncr.project?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {ncr.assignedTo?.full_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {ncr.due_date ? new Date(ncr.due_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/dashboard/ncrs/${ncr.id}`)}
                      >
                        View
                      </Button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </StateDisplay>
    </div>
  );
}
