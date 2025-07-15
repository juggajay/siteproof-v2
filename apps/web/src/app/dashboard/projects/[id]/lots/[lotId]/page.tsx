import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LotDetailClient from './lot-detail-client';

interface PageProps {
  params: Promise<{ id: string; lotId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id, lotId } = await params;
  return {
    title: `Lot ${lotId} - Project ${id}`,
    description: 'Lot details and ITP management',
  };
}

async function getLotDetails(projectId: string, lotId: string) {
  console.log('[getLotDetails] Starting with:', { projectId, lotId });

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  console.log('[getLotDetails] Auth check:', { userId: user?.id, authError });

  if (!user) {
    console.error('[getLotDetails] No user found');
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

  console.log('[getLotDetails] Query result:', { lot, error });

  if (error) {
    console.error('[getLotDetails] Error fetching lot:', error);
    console.error('[getLotDetails] Lot ID:', lotId);
    console.error('[getLotDetails] Project ID:', projectId);
    console.error('[getLotDetails] Error details:', error.message, error.details);
    return null;
  }

  if (!lot) {
    console.error('[getLotDetails] No lot found with ID:', lotId);
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
  const { id, lotId } = await params;
  console.log('[LotDetailPage] Loading with params:', { id, lotId });

  try {
    const result = await getLotDetails(id, lotId);

    if (!result) {
      console.error('[LotDetailPage] No lot found for:', { projectId: id, lotId });
      notFound();
    }

    const { lot, userRole } = result;
    console.log('[LotDetailPage] Successfully loaded lot:', lot.id);

    return <LotDetailClient lot={lot} projectId={id} userRole={userRole} />;
  } catch (error) {
    console.error('[LotDetailPage] Error:', error);
    console.error('[LotDetailPage] Params:', { id, lotId });
    notFound();
  }
}
