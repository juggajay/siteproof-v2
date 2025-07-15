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

export default async function LotDetailPage({ params }: PageProps) {
  const { id: projectId, lotId } = await params;

  console.log('[LotDetailPage] Page params:', { projectId, lotId });

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  console.log('[LotDetailPage] Auth check:', {
    hasUser: !!user,
    userId: user?.id,
    authError: authError?.message,
  });

  if (!user) {
    console.error('[LotDetailPage] No user found');
    return notFound();
  }

  // Get lot details with related ITP instances
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

  console.log('[LotDetailPage] Query result:', {
    hasLot: !!lot,
    hasProject: !!lot?.projects,
    error: error?.message,
  });

  if (error || !lot) {
    console.error('[LotDetailPage] Error fetching lot:', error);
    return notFound();
  }

  // Check user access
  const orgId = lot.projects?.organization_id;
  if (!orgId) {
    console.error('[LotDetailPage] No organization_id found');
    return notFound();
  }

  const { data: membership, error: membershipError } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', orgId)
    .eq('user_id', user.id)
    .single();

  console.log('[LotDetailPage] Membership check:', {
    hasAccess: !!membership,
    role: membership?.role,
    error: membershipError?.message,
  });

  if (!membership) {
    console.error('[LotDetailPage] User does not have access to organization');
    return notFound();
  }

  // Ensure itp_instances is an array
  if (!lot.itp_instances) {
    lot.itp_instances = [];
  }

  console.log('[LotDetailPage] Success! Returning lot data');
  return <LotDetailClient lot={lot} userRole={membership.role} projectId={projectId} />;
}
