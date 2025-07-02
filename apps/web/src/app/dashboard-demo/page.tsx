'use client';

import { 
  Building2, 
  Calendar, 
  ClipboardList, 
  FileText, 
  ArrowRight,
  Users,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Bell,
  Plus
} from 'lucide-react';
import { 
  PageLayout, 
  Section, 
  Grid,
  Card,
  CardHeader,
  CardContent,
  Badge,
  Button,
  TopNav,
  BottomNav,
  FAB
} from '@siteproof/design-system';

export default function DashboardDemoPage() {
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

  // Mock data for dashboard metrics
  const metrics = [
    { label: 'Active Projects', value: '12', trend: '+2', trendUp: true },
    { label: 'Open NCRs', value: '5', trend: '-3', trendUp: false },
    { label: 'Team Members', value: '24', trend: '+1', trendUp: true },
    { label: 'Reports This Month', value: '18', trend: '+5', trendUp: true },
  ];

  // Mock recent activities
  const recentActivities = [
    { type: 'diary', title: 'Daily diary submitted', project: 'Harbour Bridge Restoration', time: '2 hours ago', status: 'completed' },
    { type: 'ncr', title: 'NCR #1234 raised', project: 'City Tower Complex', time: '4 hours ago', status: 'pending' },
    { type: 'report', title: 'Weekly report generated', project: 'Metro Line Extension', time: '1 day ago', status: 'completed' },
    { type: 'project', title: 'New project created', project: 'Riverside Apartments', time: '2 days ago', status: 'active' },
  ];

  const bottomNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="w-6 h-6" />, href: '/dashboard' },
    { id: 'projects', label: 'Projects', icon: <Building2 className="w-6 h-6" />, href: '/dashboard/projects' },
    { id: 'diaries', label: 'Diaries', icon: <Calendar className="w-6 h-6" />, href: '/dashboard/diaries', badge: 2 },
    { id: 'ncrs', label: 'NCRs', icon: <ClipboardList className="w-6 h-6" />, href: '/dashboard/ncrs', badge: 5 },
  ];

  return (
    <>
      <TopNav
        title="SiteProof Dashboard"
        showMenuButton
        onMenuClick={() => {}}
        rightActions={[
          {
            icon: <Bell className="w-6 h-6" />,
            onClick: () => {},
            label: 'Notifications',
            badge: 3,
          },
        ]}
      />

      <PageLayout hasTopNav hasBottomNav>
        <div className="mb-8">
          <h1 className="text-h1 text-primary-charcoal">Dashboard</h1>
          <p className="mt-2 text-body text-secondary-gray">Welcome back, demo@siteproof.com!</p>
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
                <Card key={action.title} variant="interactive" onClick={() => {}}>
                  <CardContent>
                    <div className={`inline-flex rounded-button p-small ${action.bgColor} mb-medium`}>
                      <Icon className={`w-6 h-6 ${action.color}`} aria-hidden="true" />
                    </div>
                    <h3 className="text-h5 text-primary-charcoal mb-1">
                      {action.title}
                    </h3>
                    <p className="text-body-small text-secondary-gray mb-small">{action.description}</p>
                    <div className="flex items-center text-body-small font-medium text-primary-blue">
                      Get started
                      <ArrowRight className="ml-1 w-4 h-4" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </Grid>
        </Section>

        {/* Recent Activity */}
        <Grid columns={3} gap="large">
          <div className="col-span-2">
            <Section title="Recent Activity" spacing="medium">
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y divide-gray-200">
                    {recentActivities.map((activity, index) => (
                      <div key={index} className="p-medium hover:bg-background-offwhite transition-colors cursor-pointer">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-small">
                            <div className={`p-tiny rounded-full ${
                              activity.status === 'completed' ? 'bg-green-100' :
                              activity.status === 'pending' ? 'bg-orange-100' : 'bg-blue-100'
                            }`}>
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
                                activity.status === 'completed' ? 'success' : 
                                activity.status === 'pending' ? 'warning' : 'primary'
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
          </div>

          {/* Navigation Menu */}
          <div>
            <Section title="Navigation" spacing="medium">
              <div className="space-y-medium">
                {sections.map((section) => (
                  <Card key={section.title}>
                    <CardHeader>
                      <h3 className="text-h5 text-primary-charcoal">{section.title}</h3>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y divide-gray-100">
                        {section.items.map((item) => {
                          const Icon = item.icon;
                          return (
                            <div
                              key={item.name}
                              className="flex items-center gap-small p-medium hover:bg-background-offwhite transition-colors cursor-pointer"
                            >
                              <Icon className="w-5 h-5 text-secondary-gray" />
                              <div className="flex-1">
                                <p className="text-body font-medium text-primary-charcoal">
                                  {item.name}
                                </p>
                                <p className="text-caption text-secondary-gray">
                                  {item.description}
                                </p>
                              </div>
                              <ArrowRight className="w-4 h-4 text-secondary-gray" />
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </Section>
          </div>
        </Grid>

        {/* Empty State - Only show if no projects */}
        <Section spacing="large">
          <Card className="text-center p-huge">
            <CardContent>
              <Building2 className="mx-auto w-16 h-16 text-secondary-gray mb-medium" />
              <h3 className="text-h4 text-primary-charcoal mb-2">Get Started with Your First Project</h3>
              <p className="text-body text-secondary-gray mb-medium">
                Create your first project to start managing your construction site documentation.
              </p>
              <Button size="lg">Create Your First Project</Button>
            </CardContent>
          </Card>
        </Section>
      </PageLayout>

      <FAB
        icon={<Plus />}
        onClick={() => {}}
        label="Create new item"
        position="bottom-right"
      />

      <BottomNav
        items={bottomNavItems}
        activeItemId="dashboard"
      />
    </>
  );
}