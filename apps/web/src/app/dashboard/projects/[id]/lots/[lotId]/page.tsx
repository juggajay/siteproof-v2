import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

interface PageProps {
  params: Promise<{ id: string; lotId: string }>;
}

export default async function LotDetailPage({ params }: PageProps) {
  const { id: projectId, lotId } = await params;

  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-red-600">Not Authenticated</h1>
        <p>Please log in to view this page.</p>
      </div>
    );
  }

  // Get lot details
  const { data: lot, error } = await supabase
    .from('lots')
    .select(
      `
      *,
      projects (
        id,
        name,
        organization_id
      ),
      itp_instances (
        id,
        name,
        status,
        completion_percentage,
        created_at,
        updated_at,
        itp_templates (
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

  if (error || !lot) {
    console.error('[LotDetailPage] Error:', error);
    notFound();
  }

  // Check user access
  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', lot.projects?.organization_id)
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
        <p>You don&apos;t have access to this lot.</p>
      </div>
    );
  }

  // Return the data without using the client component yet
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">
        Lot #{lot.lot_number}: {lot.name}
      </h1>
      <p>Project: {lot.projects?.name}</p>
      <p>Status: {lot.status}</p>
      <p>ITPs: {lot.itp_instances?.length || 0}</p>
      <p>Your Role: {membership.role}</p>
      <p className="mt-4 text-green-600">
        Data loaded successfully! Client component disabled for debugging.
      </p>
    </div>
  );
}
