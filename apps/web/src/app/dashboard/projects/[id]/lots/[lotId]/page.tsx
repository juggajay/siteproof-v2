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
  
  console.log('[LotDetailPage] Loading lot:', { projectId, lotId });

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
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

  if (error || !lot) {
    console.error('Error fetching lot:', error);
    return notFound();
  }

  // Check user access
  const orgId = lot.projects?.organization_id;
  if (!orgId) {
    return notFound();
  }

  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', orgId)
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    return notFound();
  }

  // Ensure itp_instances is an array
  if (!lot.itp_instances) {
    lot.itp_instances = [];
  }

  return <LotDetailClient lot={lot} userRole={membership.role} projectId={projectId} />;
}
