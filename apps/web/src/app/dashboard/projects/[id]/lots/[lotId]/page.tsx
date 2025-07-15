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

  // Get lot details with project and ITP info
  const { data: lot, error } = await supabase
    .from('lots')
    .select(
      `
      *,
      projects!inner (
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
          structure
        )
      )
    `
    )
    .eq('id', lotId)
    .eq('project_id', projectId)
    .single();

  if (error || !lot) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-red-600">Error Loading Lot</h1>
        <p>Error: {error?.message || 'Lot not found'}</p>
        <p>Lot ID: {lotId}</p>
        <p>Project ID: {projectId}</p>
      </div>
    );
  }

  // Return the basic lot data
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">
        Lot #{lot.lot_number}: {lot.name}
      </h1>
      <p>Project: {lot.projects?.name}</p>
      <p>Status: {lot.status}</p>
      <p>Created: {new Date(lot.created_at).toLocaleDateString()}</p>
      <p>ITPs: {lot.itp_instances?.length || 0}</p>
      <p className="mt-4 text-green-600">Lot data with project and ITPs loaded successfully!</p>
      <pre className="mt-4 p-4 bg-gray-100 rounded text-xs">{JSON.stringify(lot, null, 2)}</pre>
    </div>
  );
}
