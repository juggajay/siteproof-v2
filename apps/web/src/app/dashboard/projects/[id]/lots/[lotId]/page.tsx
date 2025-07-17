import { Metadata } from 'next';
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
  let projectId = '';
  let lotId = '';

  try {
    const resolved = await params;
    projectId = resolved.id;
    lotId = resolved.lotId;

    // Debug: Log the parameters
    console.log('[LotDetailPage] Loading lot:', { projectId, lotId });

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.error('[LotDetailPage] No user found');
      return (
        <div className="min-h-screen bg-gray-50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h1>
              <p className="text-gray-600">
                You need to be logged in to view this lot. Please sign in and try again.
              </p>
              <a
                href="/auth/login"
                className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Sign In
              </a>
            </div>
          </div>
        </div>
      );
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
          template_id,
          project_id,
          lot_id,
          organization_id,
          created_by,
          data,
          evidence_files,
          inspection_status,
          inspection_date,
          sync_status,
          is_active,
          created_at,
          updated_at,
          deleted_at,
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

      return (
        <div className="min-h-screen bg-gray-50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Lot Not Found</h1>
              <p className="text-gray-600 mb-4">
                The lot you are looking for could not be found. This could be because:
              </p>
              <ul className="list-disc list-inside text-gray-600 mb-4 space-y-1">
                <li>The lot ID is incorrect</li>
                <li>The lot has been deleted</li>
                <li>You don&apos;t have permission to access this lot</li>
                <li>The project doesn&apos;t exist</li>
              </ul>
              <div className="space-x-4">
                <a
                  href={`/dashboard/projects/${projectId}`}
                  className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Back to Project
                </a>
                <a
                  href="/dashboard/projects"
                  className="inline-block px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  All Projects
                </a>
              </div>
              {error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-gray-500">
                    Technical Details
                  </summary>
                  <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto">
                    {JSON.stringify(
                      { error: error.message, code: error.code, hint: error.hint },
                      null,
                      2
                    )}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Check user access
    const orgId = lot.project?.organization_id;
    if (!orgId) {
      console.error('[LotDetailPage] No organization_id found in lot.project:', lot.project);
      return (
        <div className="min-h-screen bg-gray-50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Configuration Error</h1>
              <p className="text-gray-600">
                There&apos;s an issue with the project configuration. Please contact support.
              </p>
            </div>
          </div>
        </div>
      );
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

      return (
        <div className="min-h-screen bg-gray-50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
              <p className="text-gray-600 mb-4">
                You don&apos;t have permission to access this lot. You may need to:
              </p>
              <ul className="list-disc list-inside text-gray-600 mb-4 space-y-1">
                <li>Be invited to the organization</li>
                <li>Request access from an organization admin</li>
                <li>Sign in with a different account</li>
              </ul>
              <a
                href="/dashboard"
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Back to Dashboard
              </a>
            </div>
          </div>
        </div>
      );
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
            <div className="mt-4 space-x-4">
              <a
                href={`/dashboard/projects/${projectId}/lots/${lotId}`}
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Refresh Page
              </a>
              <a
                href="/dashboard"
                className="inline-block px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Back to Dashboard
              </a>
            </div>
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-gray-500">Technical Details</summary>
              <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto">
                {JSON.stringify(error, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      </div>
    );
  }
}
