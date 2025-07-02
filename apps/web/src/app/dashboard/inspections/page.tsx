import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  FileText,
  Calendar,
  User,
  ChevronRight,
} from 'lucide-react';
import {
  PageLayout,
  Section,
  Grid,
  Card,
  CardContent,
  Badge,
  Button,
} from '@siteproof/design-system';

export const dynamic = 'force-dynamic';

async function getInspections(userId: string) {
  const supabase = await createClient();

  // Get user's organization
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .single();

  if (!membership) return { inspections: [], stats: null };

  // Get inspections assigned to user or created by user
  const { data: assignments } = await supabase
    .from('itp_assignments')
    .select(
      `
      *,
      template:itp_templates(id, name, category),
      project:projects(id, name),
      lot:lots(id, lot_number, name),
      assignedTo:users!itp_assignments_assigned_to_fkey(id, email, full_name),
      instance:itp_instances!inner(
        id,
        status,
        completion_percentage,
        created_at,
        completed_at
      )
    `
    )
    .or(`assigned_to.eq.${userId},assigned_by.eq.${userId}`)
    .order('assigned_at', { ascending: false })
    .limit(10);

  // Get stats
  const { data: stats } = await supabase
    .from('itp_assignments')
    .select('status')
    .or(`assigned_to.eq.${userId},assigned_by.eq.${userId}`);

  const statusCounts = {
    pending: 0,
    in_progress: 0,
    completed: 0,
    overdue: 0,
  };

  stats?.forEach((item) => {
    if (item.status === 'pending') statusCounts.pending++;
    else if (item.status === 'in_progress') statusCounts.in_progress++;
    else if (item.status === 'completed') statusCounts.completed++;
    // TODO: Calculate overdue based on due_date
  });

  return {
    inspections: assignments || [],
    stats: statusCounts,
  };
}

async function getTemplates(organizationId: string) {
  const supabase = await createClient();

  const { data: templates } = await supabase
    .from('itp_templates')
    .select('id, name, category, usage_count')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('usage_count', { ascending: false })
    .limit(5);

  return templates || [];
}

export default async function InspectionsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    redirect('/dashboard');
  }

  const { inspections, stats } = await getInspections(user.id);
  const templates = await getTemplates(membership.organization_id);

  const statusConfig = {
    pending: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    in_progress: { icon: AlertCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
    completed: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    overdue: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
  };

  return (
    <PageLayout hasTopNav={false} hasBottomNav={false}>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-primary-charcoal">Inspections</h1>
          <p className="mt-2 text-body text-secondary-gray">
            Manage and complete inspection test plans
          </p>
        </div>
        {membership.role !== 'viewer' && (
          <Link href="/dashboard/inspections/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Inspection
            </Button>
          </Link>
        )}
      </div>

      {/* Stats Overview */}
      <Section title="Overview" spacing="large">
        <Grid columns={4} gap="medium">
          {Object.entries(stats || {}).map(([status, count]) => {
            const config = statusConfig[status as keyof typeof statusConfig];
            const Icon = config.icon;
            return (
              <Card key={status}>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-caption text-secondary-gray capitalize">
                        {status.replace('_', ' ')}
                      </p>
                      <p className="mt-1 text-h2 text-primary-charcoal">{count}</p>
                    </div>
                    <div className={`p-3 rounded-full ${config.bg}`}>
                      <Icon className={`w-6 h-6 ${config.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </Grid>
      </Section>

      {/* Recent Inspections */}
      <Section title="Recent Inspections" spacing="large">
        {inspections.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="mx-auto w-12 h-12 text-secondary-gray mb-4" />
              <h3 className="text-h5 text-primary-charcoal mb-2">No inspections yet</h3>
              <p className="text-body text-secondary-gray mb-6">
                Start by creating a new inspection from a template
              </p>
              {membership.role !== 'viewer' && (
                <Link href="/dashboard/inspections/new">
                  <Button>Create First Inspection</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {inspections.map((inspection) => (
              <Link key={inspection.id} href={`/dashboard/inspections/${inspection.instance?.id}`}>
                <Card variant="interactive">
                  <CardContent>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-h5 text-primary-charcoal">{inspection.title}</h3>
                          <Badge
                            variant={
                              inspection.status === 'completed'
                                ? 'success'
                                : inspection.status === 'in_progress'
                                  ? 'info'
                                  : inspection.status === 'overdue'
                                    ? 'error'
                                    : 'warning'
                            }
                          >
                            {inspection.status.replace('_', ' ')}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-6 text-body-small text-secondary-gray">
                          <span className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            {inspection.template?.name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(inspection.assigned_at).toLocaleDateString()}
                          </span>
                          {inspection.assignedTo && (
                            <span className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              {inspection.assignedTo.full_name || inspection.assignedTo.email}
                            </span>
                          )}
                        </div>

                        <div className="mt-3">
                          <div className="flex items-center gap-2">
                            <span className="text-caption text-secondary-gray">
                              Project: {inspection.project?.name}
                            </span>
                            {inspection.lot && (
                              <>
                                <span className="text-secondary-gray">•</span>
                                <span className="text-caption text-secondary-gray">
                                  Lot #{inspection.lot.lot_number}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {inspection.instance && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-caption text-secondary-gray">Completion</span>
                              <span className="text-caption font-medium text-primary-charcoal">
                                {inspection.instance.completion_percentage}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-primary-blue h-2 rounded-full transition-all"
                                style={{ width: `${inspection.instance.completion_percentage}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <ChevronRight className="w-5 h-5 text-secondary-gray ml-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </Section>

      {/* Popular Templates */}
      {membership.role !== 'viewer' && templates.length > 0 && (
        <Section title="Popular Templates" spacing="large">
          <Grid columns={2} gap="medium">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardContent>
                  <h4 className="text-h6 text-primary-charcoal mb-1">{template.name}</h4>
                  {template.category && (
                    <p className="text-caption text-secondary-gray mb-3">{template.category}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-caption text-secondary-gray">
                      Used {template.usage_count} times
                    </span>
                    <Link
                      href={`/dashboard/inspections/new?template=${template.id}`}
                      className="text-body-small font-medium text-primary-blue hover:text-primary-blue-dark"
                    >
                      Use Template →
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </Grid>
        </Section>
      )}
    </PageLayout>
  );
}
