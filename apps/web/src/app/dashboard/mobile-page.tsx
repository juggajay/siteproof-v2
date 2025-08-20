'use client';

import { useEffect, useState } from 'react';
import { BarChart3, FileText, ClipboardList, Users, Plus } from 'lucide-react';
import { MobileButton } from '@/components/mobile/MobileButton';
import { MobileResponsiveGrid } from '@/components/mobile/MobileResponsiveGrid';
import { useMobileDetection } from '@/hooks/use-mobile-detection';
import Link from 'next/link';

interface DashboardStats {
  totalProjects: number;
  activeInspections: number;
  completedReports: number;
  teamMembers: number;
}

export default function MobileDashboard() {
  const { isMobile, isTablet, orientation } = useMobileDetection();
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    activeInspections: 0,
    completedReports: 0,
    teamMembers: 0,
  });
  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch dashboard data
    const fetchDashboardData = async () => {
      try {
        // Simulated data - replace with actual API calls
        setStats({
          totalProjects: 12,
          activeInspections: 8,
          completedReports: 45,
          teamMembers: 6,
        });

        setRecentProjects([
          { id: 1, name: 'Highway Construction', status: 'active', progress: 65 },
          { id: 2, name: 'Bridge Inspection', status: 'active', progress: 40 },
          { id: 3, name: 'Office Building', status: 'completed', progress: 100 },
        ]);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const statCards = [
    {
      title: 'Projects',
      value: stats.totalProjects,
      icon: FileText,
      color: 'bg-blue-500',
      href: '/dashboard/projects',
    },
    {
      title: 'Inspections',
      value: stats.activeInspections,
      icon: ClipboardList,
      color: 'bg-green-500',
      href: '/dashboard/inspections',
    },
    {
      title: 'Reports',
      value: stats.completedReports,
      icon: BarChart3,
      color: 'bg-purple-500',
      href: '/dashboard/reports',
    },
    {
      title: 'Team',
      value: stats.teamMembers,
      icon: Users,
      color: 'bg-orange-500',
      href: '/dashboard/team',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 safe-area-top bottom-nav-padding">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 space-y-6">
        {/* Stats Grid */}
        <MobileResponsiveGrid
          gap="md"
          cols={{
            default: 2,
            sm: 2,
            md: 4,
            lg: 4,
          }}
        >
          {statCards.map((stat) => (
            <Link key={stat.title} href={stat.href} className="block">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow active:scale-[0.98]">
                <div className="flex items-center justify-between mb-2">
                  <div className={`${stat.color} p-2 rounded-lg`}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-sm text-gray-500">{stat.title}</div>
              </div>
            </Link>
          ))}
        </MobileResponsiveGrid>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</h2>
          <MobileResponsiveGrid
            gap="sm"
            cols={{
              default: 1,
              sm: 2,
              md: 3,
            }}
          >
            <MobileButton
              variant="primary"
              size={isMobile ? 'lg' : 'md'}
              fullWidth
              icon={<Plus className="w-5 h-5" />}
              onClick={() => (window.location.href = '/dashboard/projects/new')}
            >
              New Project
            </MobileButton>
            <MobileButton
              variant="success"
              size={isMobile ? 'lg' : 'md'}
              fullWidth
              icon={<ClipboardList className="w-5 h-5" />}
              onClick={() => (window.location.href = '/dashboard/inspections/new')}
            >
              Start Inspection
            </MobileButton>
            <MobileButton
              variant="secondary"
              size={isMobile ? 'lg' : 'md'}
              fullWidth
              icon={<BarChart3 className="w-5 h-5" />}
              onClick={() => (window.location.href = '/dashboard/reports/new')}
            >
              Generate Report
            </MobileButton>
          </MobileResponsiveGrid>
        </div>

        {/* Recent Projects */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Recent Projects</h2>
            <Link
              href="/dashboard/projects"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {recentProjects.map((project) => (
              <Link key={project.id} href={`/dashboard/projects/${project.id}`} className="block">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow active:scale-[0.98]">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{project.name}</h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        project.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {project.status}
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-1">
                      <span>Progress</span>
                      <span>{project.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Device Info (Development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="font-medium text-gray-900 mb-2">Device Info</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <div>Mobile: {isMobile ? 'Yes' : 'No'}</div>
              <div>Tablet: {isTablet ? 'Yes' : 'No'}</div>
              <div>Orientation: {orientation}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
