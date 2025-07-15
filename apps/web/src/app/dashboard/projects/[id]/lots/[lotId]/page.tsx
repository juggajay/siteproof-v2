import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LotDetailClient from './lot-detail-client';

interface PageProps {
  params: { id: string; lotId: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return {
    title: `Lot ${params.lotId} - Project ${params.id}`,
    description: 'Lot details and ITP management',
  };
}

async function getLotDetails(projectId: string, lotId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  // Get lot details with related ITP instances
  const { data: lot, error } = await supabase
    .from('lots')
    .select(
      `
      *,
      projects(
        id,
        name,
        organization_id,
        organizations(
          id,
          name
        )
      ),
      itp_instances(
        id,
        name,
        status,
        completion_percentage,
        created_at,
        updated_at,
        itp_templates(
          id,
          name,
          description,
          category,
          structure
        )
      )
    `
    )
    .eq('id', lotId)
    .eq('project_id', projectId)
    .single();

  if (error) {
    console.error('Error fetching lot:', error);
    console.error('Lot ID:', lotId);
    console.error('Project ID:', projectId);
    console.error('Error details:', error.message, error.details);
    return null;
  }

  // Check if lot has project data
  if (!lot.projects) {
    console.error('Lot has no project data:', lot);
    throw new Error('Lot is not associated with a project');
  }

  // Verify user has access to this project
  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', lot.projects.organization_id)
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    console.error('User has no membership in organization:', lot.projects.organization_id);
    throw new Error('Access denied');
  }

  return { lot, userRole: membership.role };
}

export default async function LotDetailPage({ params }: PageProps) {
  try {
    const result = await getLotDetails(params.id, params.lotId);

    if (!result) {
      console.error('No lot found for:', { projectId: params.id, lotId: params.lotId });
      notFound();
    }

    const { lot, userRole } = result;

    return <LotDetailClient lot={lot} projectId={params.id} userRole={userRole} />;
  } catch (error) {
    console.error('Error in LotDetailPage:', error);
    console.error('Params:', params);
    notFound();
  }
}
