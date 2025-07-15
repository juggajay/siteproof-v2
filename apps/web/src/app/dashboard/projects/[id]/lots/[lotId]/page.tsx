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
  
  // Debug: Log the parameters
  console.log('[LotDetailPage] Loading lot:', { projectId, lotId });

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.error('[LotDetailPage] No user found, returning 404');
    return notFound();
  }

  console.log('[LotDetailPage] User authenticated:', user.id);

  // Get lot details with related ITP instances
  const { data: lot, error } = await supabase
    .from('lots')
    .select(
      `
      *,
      project:projects!inner(
        id,
        name,
        organization_id,
        organization:organizations(
          id,
          name
        )
      ),
      itp_instances(
        id,
        status,
        completion_percentage,
        created_at,
        updated_at,
        itp_templates(
          id,
          name,
          description,
          structure
        )
      )
    `
    )
    .eq('id', lotId)
    .eq('project_id', projectId)
    .single();

  console.log('[LotDetailPage] Lot query result:', { hasLot: !!lot, error: error?.message });

  if (error || !lot) {
    console.error('[LotDetailPage] Error fetching lot:', {
      error: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
      lotId,
      projectId
    });
    return notFound();
  }

  // Check user access
  const orgId = lot.project?.organization_id;
  if (!orgId) {
    console.error('[LotDetailPage] No organization_id found in lot.project:', lot.project);
    return notFound();
  }

  console.log('[LotDetailPage] Checking membership for org:', orgId);

  const { data: membership, error: membershipError } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', orgId)
    .eq('user_id', user.id)
    .single();

  console.log('[LotDetailPage] Membership result:', { hasMembership: !!membership, error: membershipError?.message });

  if (!membership) {
    console.error('[LotDetailPage] No membership found for user in organization:', {
      orgId,
      userId: user.id,
      error: membershipError?.message
    });
    return notFound();
  }

  // Ensure itp_instances is an array
  if (!lot.itp_instances) {
    lot.itp_instances = [];
  }

  console.log('[LotDetailPage] Successfully loaded lot detail page:', {
    lotId: lot.id,
    lotNumber: lot.lot_number,
    projectName: lot.project?.name,
    itpCount: lot.itp_instances.length,
    userRole: membership.role
  });

  return <LotDetailClient lot={lot} userRole={membership.role} projectId={projectId} />;
}
