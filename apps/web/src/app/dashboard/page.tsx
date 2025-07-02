import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { 
  Building2, 
  Calendar, 
  ClipboardList, 
  FileText, 
  Plus,
  ArrowRight,
  Users,
  BarChart3
} from 'lucide-react';
import { Button } from '@siteproof/design-system';

export default async function DashboardPage() {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Auth error in dashboard:', error);
      throw new Error(`Authentication error: ${error.message}`);
    }
    
    if (!user) {
      redirect('/auth/login');
    }

    // Quick action cards
    const quickActions = [
      {
        title: 'Create Project',
        description: 'Start a new construction project',
        icon: Building2,
        href: '/dashboard/projects/new',
        color: 'bg-blue-500',
      },
      {
        title: 'Daily Diary',
        description: "Record today's site activities",
        icon: Calendar,
        href: '/dashboard/diaries/new',
        color: 'bg-green-500',
      },
      {
        title: 'New NCR',
        description: 'Report non-conformance',
        icon: ClipboardList,
        href: '/dashboard/ncrs/new',
        color: 'bg-orange-500',
      },
      {
        title: 'Generate Report',
        description: 'Create project reports',
        icon: FileText,
        href: '/dashboard/reports',
        color: 'bg-purple-500',
      },
    ];

    // Navigation sections
    const sections = [
      {
        title: 'Project Management',
        items: [
          { name: 'Projects', href: '/dashboard/projects', icon: Building2, description: 'View and manage projects' },
          { name: 'Companies', href: '/dashboard/companies', icon: Users, description: 'Manage contractors and suppliers' },
        ],
      },
      {
        title: 'Daily Operations',
        items: [
          { name: 'Daily Diaries', href: '/dashboard/diaries', icon: Calendar, description: 'Site activity records' },
          { name: 'NCRs', href: '/dashboard/ncrs', icon: ClipboardList, description: 'Non-conformance reports' },
        ],
      },
      {
        title: 'Reporting',
        items: [
          { name: 'Reports', href: '/dashboard/reports', icon: BarChart3, description: 'Generate and view reports' },
        ],
      },
    ];

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="py-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="mt-2 text-gray-600">Welcome back, {user.email}!</p>
            </div>
            
            {/* Quick Actions */}
            <div className="mb-12">
              <h2 className="mb-6 text-lg font-semibold text-gray-900">Quick Actions</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link
                      key={action.title}
                      href={action.href}
                      className="group relative rounded-lg bg-white p-6 shadow-sm transition-all hover:shadow-md"
                    >
                      <div>
                        <span className={`inline-flex rounded-lg p-3 ${action.color}`}>
                          <Icon className="h-6 w-6 text-white" aria-hidden="true" />
                        </span>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-base font-semibold text-gray-900">
                          {action.title}
                          <span className="absolute inset-0" aria-hidden="true" />
                        </h3>
                        <p className="mt-1 text-sm text-gray-600">{action.description}</p>
                      </div>
                      <div className="mt-3 flex items-center text-sm font-medium text-blue-600 group-hover:text-blue-500">
                        Get started
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Navigation Sections */}
            <div className="space-y-8">
              {sections.map((section) => (
                <div key={section.title}>
                  <h2 className="mb-4 text-lg font-semibold text-gray-900">{section.title}</h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          className="group rounded-lg bg-white p-6 shadow-sm transition-all hover:shadow-md"
                        >
                          <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0">
                              <Icon className="h-6 w-6 text-gray-400 group-hover:text-blue-600" />
                            </div>
                            <div>
                              <h3 className="text-base font-medium text-gray-900 group-hover:text-blue-600">
                                {item.name}
                              </h3>
                              <p className="mt-1 text-sm text-gray-600">{item.description}</p>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Empty State Help */}
            <div className="mt-12 rounded-lg border-2 border-dashed border-gray-300 bg-white p-12 text-center">
              <Building2 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No projects yet</h3>
              <p className="mt-1 text-sm text-gray-600">Get started by creating your first project.</p>
              <div className="mt-6">
                <Link href="/dashboard/projects/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    New Project
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error: any) {
    console.error('Dashboard page error:', error);
    throw new Error(`Dashboard failed to load: ${error.message}`);
  }
}