import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { InspectionForm } from '@/features/inspections/components/InspectionForm';
import { PageLayout, Badge, Card, CardContent } from '@siteproof/design-system';
import { ArrowLeft, Calendar, User, Building2, FileText, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function getInspection(id: string) {
  const supabase = await createClient();

  const { data: inspection, error } = await supabase
    .from('itp_instances')
    .select(
      `
      *,
      template:itp_templates(
        id,
        name,
        description,
        structure,
        category
      ),
      project:projects(id, name, organization_id),
      lot:lots(id, lot_number, name),
      creator:users!itp_instances_created_by_fkey(id, email, full_name),
      approver:users!itp_instances_approved_by_fkey(id, email, full_name)
    `
    )
    .eq('id', id)
    .single();

  if (error || !inspection) {
    return null;
  }

  // Get assignment info
  const { data: assignment } = await supabase
    .from('itp_assignments')
    .select(
      `
      *,
      assignedTo:users!itp_assignments_assigned_to_fkey(id, email, full_name),
      assignedBy:users!itp_assignments_assigned_by_fkey(id, email, full_name)
    `
    )
    .eq('template_id', inspection.template_id)
    .eq('project_id', inspection.project_id)
    .eq('lot_id', inspection.lot_id)
    .single();

  return { inspection, assignment };
}

export default async function InspectionPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const result = await getInspection(params.id);

  if (!result) {
    notFound();
  }

  const { inspection, assignment } = result;

  // Check if user has access
  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', inspection.project.organization_id)
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    redirect('/dashboard');
  }

  const statusConfig = {
    draft: { label: 'Draft', variant: 'default' as const },
    in_progress: { label: 'In Progress', variant: 'info' as const },
    completed: { label: 'Completed', variant: 'success' as const },
    approved: { label: 'Approved', variant: 'success' as const },
  };

  const status = statusConfig[inspection.status as keyof typeof statusConfig];

  return (
    <PageLayout hasTopNav={false} hasBottomNav={false}>
      <div className="mb-8">
        <Link
          href="/dashboard/inspections"
          className="inline-flex items-center text-body text-secondary-gray hover:text-primary-charcoal mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Inspections
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-h1 text-primary-charcoal">{inspection.name}</h1>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            <p className="text-body text-secondary-gray">
              {inspection.template.description || `${inspection.template.name} inspection`}
            </p>
          </div>
        </div>
      </div>

      {/* Inspection Info */}
      <Card className="mb-8">
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="flex items-center gap-2 text-caption text-secondary-gray mb-1">
                <FileText className="w-4 h-4" />
                Template
              </div>
              <p className="text-body font-medium text-primary-charcoal">
                {inspection.template.name}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 text-caption text-secondary-gray mb-1">
                <Building2 className="w-4 h-4" />
                Project
              </div>
              <p className="text-body font-medium text-primary-charcoal">
                {inspection.project.name}
              </p>
              {inspection.lot && (
                <p className="text-body-small text-secondary-gray">
                  Lot #{inspection.lot.lot_number}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 text-caption text-secondary-gray mb-1">
                <User className="w-4 h-4" />
                Assigned To
              </div>
              <p className="text-body font-medium text-primary-charcoal">
                {assignment?.assignedTo?.full_name || assignment?.assignedTo?.email || 'Unassigned'}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 text-caption text-secondary-gray mb-1">
                <Calendar className="w-4 h-4" />
                Created
              </div>
              <p className="text-body font-medium text-primary-charcoal">
                {new Date(inspection.created_at).toLocaleDateString()}
              </p>
              {inspection.completed_at && (
                <p className="text-body-small text-secondary-gray">
                  Completed: {new Date(inspection.completed_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-body font-medium text-primary-charcoal">Overall Progress</span>
              <span className="text-body-small text-secondary-gray">
                {inspection.completion_percentage}% Complete
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-blue h-2 rounded-full transition-all"
                style={{ width: `${inspection.completion_percentage}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inspection Form */}
      <InspectionForm
        inspection={inspection}
        template={inspection.template}
        projectId={inspection.project_id}
      />

      {/* Approval Info */}
      {inspection.status === 'approved' && inspection.approver && (
        <Card className="mt-8">
          <CardContent>
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <h3 className="text-h5 text-primary-charcoal mb-1">Inspection Approved</h3>
              <p className="text-body text-secondary-gray">
                Approved by {inspection.approver.full_name || inspection.approver.email} on{' '}
                {new Date(inspection.approved_at!).toLocaleDateString()}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </PageLayout>
  );
}
