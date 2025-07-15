import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
// import LotDetailClient from './lot-detail-client';
import LotDetailClientSimple from './lot-detail-client-simple';

interface PageProps {
  params: Promise<{ id: string; lotId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const { id, lotId } = await params;
    return {
      title: `Lot ${lotId} - Project ${id}`,
      description: 'Lot details and ITP management',
    };
  } catch (error) {
    console.error('[generateMetadata] Error:', error);
    return {
      title: 'Lot Detail',
      description: 'Lot details and ITP management',
    };
  }
}

export default async function LotDetailPage({ params }: PageProps) {
  try {
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
        projectId,
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

    console.log('[LotDetailPage] Membership result:', {
      hasMembership: !!membership,
      error: membershipError?.message,
    });

    if (!membership) {
      console.error('[LotDetailPage] No membership found for user in organization:', {
        orgId,
        userId: user.id,
        error: membershipError?.message,
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
      userRole: membership.role,
    });

    return <LotDetailClientSimple lot={lot} userRole={membership.role} projectId={projectId} />;
  } catch (error) {
    console.error('[LotDetailPage] Unexpected error:', error);
    // Return a fallback UI instead of throwing
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Lot</h1>
            <p className="text-gray-600">
              There was an error loading this lot. Please try refreshing the page or contact support
              if the issue persists.
            </p>
            <pre className="mt-4 p-4 bg-gray-100 rounded text-sm">
              {JSON.stringify(error, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    );
  }
}
