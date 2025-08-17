'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  FileText, 
  History, 
  Calendar, 
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Filter,
  Search,
  BarChart3,
  FileSpreadsheet,
  Settings,
} from 'lucide-react';
import { Button } from '@siteproof/design-system';
import { ReportGenerationForm } from '@/features/reporting/components/ReportGenerationForm';
import { RecentReportsList } from '@/features/reporting/components/RecentReportsList';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { subDays, startOfWeek, startOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';

export default function EnhancedReportsPage() {
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'recent' | 'scheduled' | 'templates'>('recent');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const supabase = createClient();

  // Fetch report statistics
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['report-stats', dateFilter],
    queryFn: async () => {
      let startDate: Date;
      const endDate = new Date();

      switch (dateFilter) {
        case 'today':
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate = startOfWeek(new Date());
          break;
        case 'month':
          startDate = startOfMonth(new Date());
          break;
        default:
          startDate = subDays(new Date(), 365);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: member } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (!member) return null;

      // Fetch report counts
      const [totalResult, processingResult, completedResult, failedResult] = await Promise.all([
        supabase
          .from('report_queue')
          .select('id', { count: 'exact' })
          .eq('organization_id', member.organization_id)
          .gte('requested_at', startDate.toISOString())
          .lte('requested_at', endDate.toISOString()),
        
        supabase
          .from('report_queue')
          .select('id', { count: 'exact' })
          .eq('organization_id', member.organization_id)
          .eq('status', 'processing'),
        
        supabase
          .from('report_queue')
          .select('id', { count: 'exact' })
          .eq('organization_id', member.organization_id)
          .eq('status', 'completed')
          .gte('requested_at', startDate.toISOString()),
        
        supabase
          .from('report_queue')
          .select('id', { count: 'exact' })
          .eq('organization_id', member.organization_id)
          .eq('status', 'failed')
          .gte('requested_at', startDate.toISOString()),
      ]);

      // Fetch report types distribution
      const { data: typeDistribution } = await supabase
        .from('report_queue')
        .select('report_type')
        .eq('organization_id', member.organization_id)
        .gte('requested_at', startDate.toISOString());

      const typeCounts = typeDistribution?.reduce((acc: any, report) => {
        acc[report.report_type] = (acc[report.report_type] || 0) + 1;
        return acc;
      }, {});

      return {
        total: totalResult.count || 0,
        processing: processingResult.count || 0,
        completed: completedResult.count || 0,
        failed: failedResult.count || 0,
        typeDistribution: typeCounts || {},
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Real-time subscription for report updates
  useEffect(() => {
    const channel = supabase
      .channel('report-dashboard-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'report_queue',
        },
        () => {
          refetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, refetchStats]);

  const reportTypes = [
    { value: 'all', label: 'All Reports', icon: FileText },
    { value: 'project_summary', label: 'Project Summary', icon: BarChart3 },
    { value: 'daily_diary_export', label: 'Daily Diary', icon: Calendar },
    { value: 'inspection_summary', label: 'Inspections', icon: CheckCircle },
    { value: 'ncr_report', label: 'NCRs', icon: AlertCircle },
    { value: 'financial_summary', label: 'Financial', icon: TrendingUp },
  ];

  const quickStats = [
    {
      label: 'Total Reports',
      value: stats?.total || 0,
      change: '+12%',
      trend: 'up',
      icon: FileText,
      color: 'blue',
    },
    {
      label: 'Processing',
      value: stats?.processing || 0,
      change: '2 active',
      trend: 'neutral',
      icon: Loader2,
      color: 'yellow',
      pulse: true,
    },
    {
      label: 'Completed',
      value: stats?.completed || 0,
      change: '+8%',
      trend: 'up',
      icon: CheckCircle,
      color: 'green',
    },
    {
      label: 'Failed',
      value: stats?.failed || 0,
      change: '-50%',
      trend: 'down',
      icon: XCircle,
      color: 'red',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Reports Center</h1>
              <p className="mt-2 text-gray-600">
                Generate, manage, and download your project reports
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              <Button onClick={() => setShowGenerateForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Generate Report
              </Button>
            </div>
          </div>

          {/* Date Filter Pills */}
          <div className="flex items-center gap-2 mb-6">
            {(['today', 'week', 'month', 'all'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setDateFilter(period)}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-full transition-all',
                  dateFilter === period
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                )}
              >
                {period === 'today' && 'Today'}
                {period === 'week' && 'This Week'}
                {period === 'month' && 'This Month'}
                {period === 'all' && 'All Time'}
              </button>
            ))}
          </div>

          {/* Stats Cards with Animation */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {quickStats.map((stat, index) => {
              const Icon = stat.icon;
              const colorClasses = {
                blue: 'bg-blue-100 text-blue-600',
                yellow: 'bg-yellow-100 text-yellow-600',
                green: 'bg-green-100 text-green-600',
                red: 'bg-red-100 text-red-600',
              }[stat.color];

              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                      <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                      <p className={cn(
                        'text-sm mt-2',
                        stat.trend === 'up' && 'text-green-600',
                        stat.trend === 'down' && 'text-red-600',
                        stat.trend === 'neutral' && 'text-gray-500'
                      )}>
                        {stat.change}
                      </p>
                    </div>
                    <div className={cn(
                      'p-3 rounded-lg',
                      colorClasses,
                      stat.pulse && 'animate-pulse'
                    )}>
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Report Type Distribution */}
        {stats?.typeDistribution && Object.keys(stats.typeDistribution).length > 0 && (
          <div className="mb-8 bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Types Distribution</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(stats.typeDistribution).map(([type, count]) => {
                const typeInfo = reportTypes.find(t => t.value === type);
                const Icon = typeInfo?.icon || FileText;
                const percentage = Math.round(((count as number) / stats.total) * 100);

                return (
                  <div key={type} className="text-center">
                    <div className="relative inline-flex">
                      <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
                        <Icon className="w-8 h-8 text-gray-600" />
                      </div>
                      <svg className="absolute inset-0 w-20 h-20 -rotate-90">
                        <circle
                          cx="40"
                          cy="40"
                          r="36"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="none"
                          className="text-gray-200"
                        />
                        <circle
                          cx="40"
                          cy="40"
                          r="36"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray={`${percentage * 2.26} 226`}
                          className="text-blue-600"
                        />
                      </svg>
                    </div>
                    <p className="mt-2 text-sm font-medium text-gray-900">{typeInfo?.label || type}</p>
                    <p className="text-sm text-gray-500">{String(count)} ({percentage}%)</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="mb-6 bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex items-center gap-3">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {reportTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>

              <Button variant="secondary" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                More Filters
              </Button>

              <Button variant="ghost" size="sm" onClick={() => refetchStats()}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200 bg-white rounded-t-xl">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('recent')}
                className={cn(
                  'px-6 py-3 text-sm font-medium border-b-2 transition-colors',
                  activeTab === 'recent'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Recent Reports
                </div>
              </button>
              <button
                onClick={() => setActiveTab('scheduled')}
                className={cn(
                  'px-6 py-3 text-sm font-medium border-b-2 transition-colors',
                  activeTab === 'scheduled'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Scheduled Reports
                  <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                    Coming Soon
                  </span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('templates')}
                className={cn(
                  'px-6 py-3 text-sm font-medium border-b-2 transition-colors',
                  activeTab === 'templates'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  Report Templates
                  <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                    Coming Soon
                  </span>
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-b-xl border border-t-0 border-gray-200 p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'recent' && (
              <motion.div
                key="recent"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <RecentReportsList limit={50} showFilters={false} />
              </motion.div>
            )}
            
            {activeTab === 'scheduled' && (
              <motion.div
                key="scheduled"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="text-center py-20"
              >
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Scheduled Reports Coming Soon
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Set up recurring reports to be generated and delivered automatically on a schedule that works for you.
                </p>
                <Button variant="secondary" disabled>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Schedule
                </Button>
              </motion.div>
            )}
            
            {activeTab === 'templates' && (
              <motion.div
                key="templates"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="text-center py-20"
              >
                <FileSpreadsheet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Report Templates Coming Soon
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Create custom report templates with your branding and specific data requirements.
                </p>
                <Button variant="secondary" disabled>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Template
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Generate Report Modal */}
      <AnimatePresence>
        {showGenerateForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={() => setShowGenerateForm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 flex items-center justify-center p-4 z-50"
            >
              <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
                <div className="p-6 border-b bg-gradient-to-r from-blue-600 to-blue-700">
                  <h2 className="text-2xl font-bold text-white">
                    Generate Report
                  </h2>
                  <p className="text-blue-100 mt-1">
                    Create comprehensive reports for your projects
                  </p>
                </div>
                
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                  <ReportGenerationForm
                    onSuccess={() => {
                      setShowGenerateForm(false);
                      refetchStats();
                    }}
                    onCancel={() => setShowGenerateForm(false)}
                  />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}