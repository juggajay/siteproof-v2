import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Users, ArrowRight, Building2 } from 'lucide-react';
import { PageLayout, Section, Grid, Card, CardHeader, CardContent } from '@siteproof/design-system';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
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
    .select('organization_id, role, organizations!inner(name)')
    .eq('user_id', user.id)
    .single();

  if (!membership?.organization_id) {
    redirect('/dashboard');
  }

  // Admin sections
  const adminSections = [
    {
      title: 'Company Management',
      description: 'Manage all companies, contractors, suppliers, and consultants',
      icon: Building2,
      href: '/dashboard/companies',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Resource Management',
      description: 'Manage contractors, workers, and plant machinery for daily diaries',
      icon: Users,
      href: '/dashboard/admin/resources',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
  ];

  return (
    <PageLayout hasTopNav={false} hasBottomNav={false}>
      <div className="mb-8">
        <h1 className="text-h1 text-primary-charcoal">Administration</h1>
        <p className="mt-2 text-body text-secondary-gray">
          Manage your organization settings, companies, and resources
        </p>
      </div>

      {/* Admin Sections */}
      <Section spacing="large">
        <Grid columns={2} gap="large">
          {adminSections.map((section) => {
            const Icon = section.icon;
            return (
              <Link key={section.title} href={section.href}>
                <Card variant="interactive" className="h-full">
                  <CardContent className="p-large">
                    <div
                      className={`inline-flex rounded-button p-medium ${section.bgColor} mb-medium`}
                    >
                      <Icon className={`w-8 h-8 ${section.color}`} aria-hidden="true" />
                    </div>
                    <h3 className="text-h4 text-primary-charcoal mb-small">{section.title}</h3>
                    <p className="text-body text-secondary-gray mb-medium">{section.description}</p>
                    <div className="flex items-center text-body-small font-medium text-primary-blue">
                      Manage
                      <ArrowRight className="ml-1 w-4 h-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </Grid>
      </Section>

      {/* Organization Info */}
      <Section title="Organization Information" spacing="large">
        <Card>
          <CardHeader>
            <h3 className="text-h5 text-primary-charcoal">Current Organization</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-caption text-secondary-gray">Organization Name</p>
                <p className="text-body text-primary-charcoal font-medium">
                  {(membership as any).organizations?.name || 'Unknown'}
                </p>
              </div>
              <div>
                <p className="text-caption text-secondary-gray">Your Role</p>
                <p className="text-body text-primary-charcoal font-medium capitalize">
                  {membership.role}
                </p>
              </div>
              <div>
                <p className="text-caption text-secondary-gray">User Email</p>
                <p className="text-body text-primary-charcoal">{user.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </Section>
    </PageLayout>
  );
}
