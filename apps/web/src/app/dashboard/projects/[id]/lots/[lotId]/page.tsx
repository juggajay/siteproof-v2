// File: apps/web/src/app/dashboard/projects/[id]/lots/[lotId]/page-simple.tsx

import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

interface PageProps {
  params: Promise<{ id: string; lotId: string }>;
}

export default async function LotDetailPage({ params }: PageProps) {
  // Await the params (Next.js 15 requirement)
  const { id: projectId, lotId } = await params;

  console.log('[LotDetailPage] Rendering with:', { projectId, lotId });

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
      )
    `
    )
    .eq('id', lotId)
    .eq('project_id', projectId)
    .single();

  console.log('[LotDetailPage] Query result:', { lot, error });

  if (error || !lot) {
    console.error('[LotDetailPage] Lot not found:', error);
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

  // Simple display of lot information
  return (
    <div className="p-8">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-4">
          Lot #{lot.lot_number}: {lot.name}
        </h1>

        <div className="space-y-2">
          <p>
            <strong>Project:</strong> {lot.projects?.name}
          </p>
          <p>
            <strong>Status:</strong> {lot.status}
          </p>
          <p>
            <strong>Created:</strong> {new Date(lot.created_at).toLocaleDateString()}
          </p>
          {lot.description && (
            <p>
              <strong>Description:</strong> {lot.description}
            </p>
          )}
        </div>

        <div className="mt-6 p-4 bg-gray-100 rounded">
          <p className="text-sm text-gray-600">Debug Info:</p>
          <p className="text-xs font-mono">Lot ID: {lot.id}</p>
          <p className="text-xs font-mono">Project ID: {lot.project_id}</p>
          <p className="text-xs font-mono">Your Role: {membership.role}</p>
        </div>
      </div>
    </div>
  );
}
