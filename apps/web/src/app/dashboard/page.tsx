import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  Calendar,
  ClipboardList,
  FileText,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { ClientWrapper } from './client-wrapper';
import {
  PageLayout,
  Section,
  Grid,
  Card,
  CardContent,
  Badge,
} from '@siteproof/design-system';

// Force dynamic rendering for pages that use authentication
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Check if user has an organization
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, organizations(name)')
    .eq('user_id', user.id)
    .single();

  // If no organization, show setup message
  if (!membership?.organization_id) {
    return (
      <PageLayout hasTopNav={false} hasBottomNav={false}>
        <div className="min-h-screen flex items-center justify-center">
          <Card className="max-w-md text-center p-huge">
            <CardContent>
              <Building2 className="mx-auto w-16 h-16 text-secondary-gray mb-medium" />
              <h1 className="text-h3 text-primary-charcoal mb-2">Organization Setup Required</h1>
              <p className="text-body text-secondary-gray mb-medium">
                You need to be part of an organization to use SiteProof. You can either create a new
                organization or wait to be invited to an existing one.
              </p>
              <div className="space-y-3">
                <ClientWrapper />
                <p className="text-body-small text-secondary-gray">
                  Need help? Contact your project manager or system administrator.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  // Quick action cards
  const quickActions = [
    {
      title: 'Create Project',
      description: 'Start a new construction project',
      icon: Building2,
      href: '/dashboard/projects/new',
      color: 'text-primary-blue',
      bgColor: 'bg-secondary-blue-pale',
    },
    {
      title: 'Daily Diary',
      description: "Record today's site activities",
      icon: Calendar,
      href: '/dashboard/diaries/new',
      color: 'text-accent-green',
      bgColor: 'bg-green-50',
    },
    {
      title: 'New NCR',
      description: 'Report non-conformance',
      icon: ClipboardList,
      href: '/dashboard/ncrs/new',
      color: 'text-accent-orange',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Generate Report',
      description: 'Create project reports',
      icon: FileText,
      href: '/dashboard/reports',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];


  // Mock data for dashboard metrics
  const metrics = [
    { label: 'Active Projects', value: '12', trend: '+2', trendUp: true },
    { label: 'Open NCRs', value: '5', trend: '-3', trendUp: false },
    { label: 'Team Members', value: '24', trend: '+1', trendUp: true },
    { label: 'Reports This Month', value: '18', trend: '+5', trendUp: true },
  ];

  // Mock recent activities
  const recentActivities = [
    {
      type: 'diary',
      title: 'Daily diary submitted',
      project: 'Harbour Bridge Restoration',
      time: '2 hours ago',
      status: 'completed',
    },
    {
      type: 'ncr',
      title: 'NCR #1234 raised',
      project: 'City Tower Complex',
      time: '4 hours ago',
      status: 'pending',
    },
    {
      type: 'report',
      title: 'Weekly report generated',
      project: 'Metro Line Extension',
      time: '1 day ago',
      status: 'completed',
    },
    {
      type: 'project',
      title: 'New project created',
      project: 'Riverside Apartments',
      time: '2 days ago',
      status: 'active',
    },
  ];

  return (
    <PageLayout hasTopNav={false} hasBottomNav={false}>
      <div className="mb-8">
        <h1 className="text-h1 text-primary-charcoal">Dashboard</h1>
        <p className="mt-2 text-body text-secondary-gray">Welcome back, {user.email}!</p>
      </div>

      {/* Metrics Section */}
      <Section title="Overview" spacing="large">
        <Grid columns={4} gap="medium">
          {metrics.map((metric) => (
            <Card key={metric.label}>
              <CardContent>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-caption text-secondary-gray">{metric.label}</p>
                    <p className="mt-1 text-h2 text-primary-charcoal">{metric.value}</p>
                  </div>
                  <Badge variant={metric.trendUp ? 'success' : 'error'} size="small">
                    <div className="flex items-center gap-1">
                      <TrendingUp className={`w-3 h-3 ${!metric.trendUp ? 'rotate-180' : ''}`} />
                      {metric.trend}
                    </div>
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </Grid>
      </Section>

      {/* Quick Actions */}
      <Section title="Quick Actions" spacing="large">
        <Grid columns={4} gap="medium">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.title} href={action.href}>
                <Card variant="interactive" className="h-full">
                  <CardContent>
                    <div
                      className={`inline-flex rounded-button p-small ${action.bgColor} mb-medium`}
                    >
                      <Icon className={`w-6 h-6 ${action.color}`} aria-hidden="true" />
                    </div>
                    <h3 className="text-h5 text-primary-charcoal mb-1">{action.title}</h3>
                    <p className="text-body-small text-secondary-gray mb-small">
                      {action.description}
                    </p>
                    <div className="flex items-center text-body-small font-medium text-primary-blue">
                      Get started
                      <ArrowRight className="ml-1 w-4 h-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </Grid>
      </Section>

      {/* Recent Activity */}
      <Section title="Recent Activity" spacing="large">
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-200">
              {recentActivities.map((activity, index) => (
                <div
                  key={index}
                  className="p-medium hover:bg-background-offwhite transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-small">
                      <div
                        className={`p-tiny rounded-full ${
                          activity.status === 'completed'
                            ? 'bg-green-100'
                            : activity.status === 'pending'
                              ? 'bg-orange-100'
                              : 'bg-blue-100'
                        }`}
                      >
                        {activity.status === 'completed' ? (
                          <CheckCircle className="w-5 h-5 text-accent-green" />
                        ) : activity.status === 'pending' ? (
                          <AlertCircle className="w-5 h-5 text-accent-orange" />
                        ) : (
                          <Clock className="w-5 h-5 text-primary-blue" />
                        )}
                      </div>
                      <div>
                        <p className="text-body font-medium text-primary-charcoal">
                          {activity.title}
                        </p>
                        <p className="text-body-small text-secondary-gray">
                          {activity.project}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-caption text-secondary-gray">{activity.time}</p>
                      <Badge
                        variant={
                          activity.status === 'completed'
                            ? 'success'
                            : activity.status === 'pending'
                              ? 'warning'
                              : 'primary'
                        }
                        size="small"
                      >
                        {activity.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* Empty State - Only show if no projects */}
      <Section spacing="large">
        <Card className="text-center p-huge">
          <CardContent>
            <Building2 className="mx-auto w-16 h-16 text-secondary-gray mb-medium" />
            <h3 className="text-h4 text-primary-charcoal mb-2">
              Get Started with Your First Project
            </h3>
            <p className="text-body text-secondary-gray mb-medium">
              Create your first project to start managing your construction site documentation.
            </p>
            <ClientWrapper />
          </CardContent>
        </Card>
      </Section>
    </PageLayout>
  );
}
