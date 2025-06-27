'use client';

import React, { useState } from 'react';
import { Plus, Filter, Download } from 'lucide-react';
import { Button, StateDisplay } from '@siteproof/design-system';
import { useNcrs } from '@/features/ncr/hooks/useNcr';
import { NcrWorkflowCard } from '@/features/ncr/components/NcrWorkflowCard';
import { NcrStatusBadge } from '@/features/ncr/components/NcrStatusBadge';
import { NcrSeverityBadge } from '@/features/ncr/components/NcrSeverityBadge';
import type { NCRStatus, NCRSeverity } from '@siteproof/database';

export default function NcrsPage() {
  const [statusFilter, setStatusFilter] = useState<NCRStatus | ''>('');
  const [severityFilter, setSeverityFilter] = useState<NCRSeverity | ''>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { data: ncrs, isLoading, error, refetch } = useNcrs({
    status: statusFilter || undefined,
    severity: severityFilter || undefined,
  });

  // Mock current user - would come from auth context
  const currentUser = { id: 'current-user-id', email: 'user@example.com' };

  const statusOptions: NCRStatus[] = ['open', 'acknowledged', 'in_progress', 'resolved', 'closed', 'disputed'];
  const severityOptions: NCRSeverity[] = ['low', 'medium', 'high', 'critical'];

  const stats = {
    total: ncrs?.length || 0,
    open: ncrs?.filter(n => n.status === 'open').length || 0,
    inProgress: ncrs?.filter(n => ['acknowledged', 'in_progress'].includes(n.status)).length || 0,
    resolved: ncrs?.filter(n => n.status === 'resolved').length || 0,
    critical: ncrs?.filter(n => n.severity === 'critical').length || 0,
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
          <Button href="/dashboard/ncrs/new">
            <Plus className="w-4 h-4 mr-2" />
            Raise NCR
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Total NCRs</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Open</p>
            <p className="text-2xl font-bold text-red-600">{stats.open}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">In Progress</p>
            <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Resolved</p>
            <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Critical</p>
            <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">Filter by:</span>
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as NCRStatus | '')}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            {statusOptions.map(status => (
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
            {severityOptions.map(severity => (
              <option key={severity} value={severity}>
                {severity.charAt(0).toUpperCase() + severity.slice(1)}
              </option>
            ))}
          </select>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
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
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
              title="List view"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <line x1="3" y1="6" x2="21" y2="6" strokeWidth="2" />
                <line x1="3" y1="12" x2="21" y2="12" strokeWidth="2" />
                <line x1="3" y1="18" x2="21" y2="18" strokeWidth="2" />
              </svg>
            </button>
          </div>

          <Button variant="secondary" size="sm">
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* NCR List */}
      <StateDisplay
        loading={isLoading}
        error={error}
        empty={!ncrs?.length}
        onRetry={refetch}
        emptyMessage="No NCRs found"
        emptyDescription="Raise your first NCR to track quality issues"
      >
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {ncrs?.map((ncr) => (
              <NcrWorkflowCard
                key={ncr.id}
                ncr={ncr}
                currentUser={currentUser as any}
                onViewDetails={() => window.location.href = `/dashboard/ncrs/${ncr.id}`}
                onEdit={() => window.location.href = `/dashboard/ncrs/${ncr.id}/edit`}
              />
            ))}
          </div>
        ) : (
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
                {ncrs?.map((ncr) => (
                  <tr key={ncr.id} className="hover:bg-gray-50">
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
                        href={`/dashboard/ncrs/${ncr.id}`}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </StateDisplay>
    </div>
  );
}