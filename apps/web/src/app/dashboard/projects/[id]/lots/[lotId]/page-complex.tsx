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

  console.log('[getLotDetails] Auth check:', {
    hasUser: !!user,
    userId: user?.id,
    authError: authError?.message,
  });

  if (!user) {
    console.error('[getLotDetails] No user found');
    return null;
  }

  // First, let's check if the lot exists at all
  const { data: lotExists, error: existsError } = await supabase
    .from('lots')
    .select('id, project_id')
    .eq('id', lotId)
    .single();

  console.log('[getLotDetails] Lot exists check:', {
    exists: !!lotExists,
    lotProjectId: lotExists?.project_id,
    expectedProjectId: projectId,
    error: existsError?.message,
  });

  if (!lotExists) {
    console.error('[getLotDetails] Lot does not exist in database');
    return null;
  }

  if (lotExists.project_id !== projectId) {
    console.error('[getLotDetails] Lot exists but project_id mismatch:', {
      lotProjectId: lotExists.project_id,
      urlProjectId: projectId,
    });
    return null;
  }

  // Now get the full lot details
  const { data: lot, error } = await supabase
    .from('lots')
    .select(
      `
      *,
      projects!inner(
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

  console.log('[getLotDetails] Full query result:', {
    hasLot: !!lot,
    hasProject: !!lot?.projects,
    hasOrganization: !!lot?.projects?.organizations,
    error: error?.message,
  });

  if (error || !lot) {
    console.error('[getLotDetails] Error fetching lot:', error);
    return null;
  }

  // Check user access
  const orgId = lot.projects?.organization_id;
  if (!orgId) {
    console.error('[getLotDetails] No organization_id found');
    return null;
  }

  const { data: membership, error: membershipError } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', orgId)
    .eq('user_id', user.id)
    .single();

  console.log('[getLotDetails] Membership check:', {
    hasAccess: !!membership,
    role: membership?.role,
    error: membershipError?.message,
  });

  if (!membership) {
    console.error('[getLotDetails] User does not have access to organization');
    return null;
  }

  // Ensure itp_instances is an array
  if (!lot.itp_instances) {
    lot.itp_instances = [];
  }

  console.log('[getLotDetails] Success! Returning lot data');
  return { lot, userRole: membership.role };
}

export default async function LotDetailPage({ params }: PageProps) {
  const { id: projectId, lotId } = await params;

  console.log('[LotDetailPage] Page params:', { projectId, lotId });

  try {
    const result = await getLotDetails(projectId, lotId);

    if (!result) {
      console.error('[LotDetailPage] No result from getLotDetails, showing 404');
      notFound();
    }

    const { lot, userRole } = result;

    return <LotDetailClient lot={lot} userRole={userRole} projectId={projectId} />;
  } catch (error) {
    console.error('[LotDetailPage] Unexpected error:', error);
    notFound();
  }
}
