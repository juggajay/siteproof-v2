import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import LotsPageClient from './lots-page-client';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: project } = await supabase.from('projects').select('name').eq('id', id).single();

    return {
      title: project ? `Lots - ${project.name}` : 'Lots',
      description: 'View and manage project lots',
    };
  } catch (error) {
    console.error('[generateMetadata] Error:', error);
    return {
      title: 'Lots',
      description: 'View and manage project lots',
    };
  }
}

export default async function LotsPage({ params }: PageProps) {
  const { id: projectId } = await params;

  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Get project details
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select(
      `
      id,
      name,
      description,
      status,
      organization_id,
      organizations (
        id,
        name
      )
    `
    )
    .eq('id', projectId)
    .single();

  if (projectError || !project) {
    console.error('[LotsPage] Error fetching project:', projectError);
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Project Not Found</h1>
            <p className="text-gray-600">The project you are looking for could not be found.</p>
            <a
              href="/dashboard/projects"
              className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Projects
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Check user permissions
  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', project.organization_id)
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600 mb-4">
              You don&apos;t have permission to access this project.
            </p>
            <a
              href="/dashboard"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  const canEdit = ['owner', 'admin', 'member'].includes(membership.role);

  // Transform the organizations array from Supabase into a single object
  const transformedProject = {
    ...project,
    organizations: Array.isArray(project.organizations)
      ? project.organizations[0]
      : project.organizations,
  };

  return (
    <LotsPageClient project={transformedProject} userRole={membership.role} canEdit={canEdit} />
  );
}
