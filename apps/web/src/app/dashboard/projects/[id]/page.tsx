import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ProjectDetailClient from './project-detail-client';

export const dynamic = 'force-dynamic';

interface Props {
  params: { id: string };
}

export async function generateMetadata(_props: Props): Promise<Metadata> {
  return {
    title: 'Project Details - SiteProof',
    description: 'View project details and manage construction documentation',
  };
}

export default async function ProjectDetailPage({ params }: Props) {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  // Fetch project data
  const { data: project, error } = await supabase
    .from('projects')
    .select(
      `
      *,
      organizations (
        id,
        name
      )
    `
    )
    .eq('id', params.id)
    .single();

  if (error || !project) {
    notFound();
  }

  // Check if user has access to this project
  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', project.organization_id)
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    notFound();
  }

  return <ProjectDetailClient project={project} userRole={membership.role} />;
}
