import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import EnhancedITPForm from '@/components/itp/enhanced-itp-form';

interface PageProps {
  params: Promise<{ id: string; lotId: string; itpId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const { id, lotId } = await params;
    return {
      title: `Enhanced ITP Instance - Lot ${lotId} - Project ${id}`,
      description: 'Enhanced inspection test plan instance for lot',
    };
  } catch (error) {
    console.error('[generateMetadata] Error:', error);
    return {
      title: 'Enhanced ITP Instance',
      description: 'Enhanced inspection test plan instance',
    };
  }
}

export default async function EnhancedItpInstancePage({ params }: PageProps) {
  let projectId = '';
  let lotId = '';
  let itpId = '';
  
  try {
    const resolved = await params;
    projectId = resolved.id;
    lotId = resolved.lotId;
    itpId = resolved.itpId;

    console.log('[EnhancedItpInstancePage] Loading enhanced ITP instance:', { projectId, lotId, itpId });

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.error('[EnhancedItpInstancePage] No user found');
      return (
        <div className="min-h-screen bg-gray-50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h1>
              <p className="text-gray-600">
                You need to be logged in to view this ITP instance. Please sign in and try again.
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

    console.log('[EnhancedItpInstancePage] User authenticated:', user.id);

    // Get ITP instance with template structure
    const { data: itpInstance, error } = await supabase
      .from('itp_instances')
      .select(`
        *,
        itp_templates!inner(
          id,
          name,
          description,
          structure,
          organization_id
        ),
        lot:lots!inner(
          id,
          lot_number,
          name,
          project_id,
          project:projects!inner(
            id,
            name,
            organization_id
          )
        )
      `)
      .eq('id', itpId)
      .eq('lot_id', lotId)
      .single();

    console.log('[EnhancedItpInstancePage] ITP instance query result:', { 
      hasInstance: !!itpInstance, 
      error: error?.message 
    });

    if (error || !itpInstance) {
      console.error('[EnhancedItpInstancePage] Error fetching ITP instance:', {
        error: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        itpId,
        lotId,
        projectId,
      });

      return (
        <div className="min-h-screen bg-gray-50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">ITP Instance Not Found</h1>
              <p className="text-gray-600 mb-4">
                The ITP instance you are looking for could not be found. This could be because:
              </p>
              <ul className="list-disc list-inside text-gray-600 mb-4 space-y-1">
                <li>The ITP instance ID is incorrect</li>
                <li>The ITP instance has been deleted</li>
                <li>You don&apos;t have permission to access this ITP instance</li>
                <li>The lot or project doesn&apos;t exist</li>
              </ul>
              <div className="space-x-4">
                <a
                  href={`/dashboard/projects/${projectId}/lots/${lotId}`}
                  className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Back to Lot
                </a>
                <a
                  href={`/dashboard/projects/${projectId}`}
                  className="inline-block px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Back to Project
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

    // Check user access to organization
    const orgId = (itpInstance as any).itp_templates.organization_id;
    if (!orgId) {
      console.error('[EnhancedItpInstancePage] No organization_id found in template');
      notFound();
    }

    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', orgId)
      .eq('user_id', user.id)
      .single();

    console.log('[EnhancedItpInstancePage] Membership result:', {
      hasMembership: !!membership,
      error: membershipError?.message,
    });

    if (!membership) {
      console.error('[EnhancedItpInstancePage] No membership found for user in organization:', {
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
                You don&apos;t have permission to access this ITP instance. You may need to:
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

    console.log('[EnhancedItpInstancePage] Successfully loaded enhanced ITP instance:', {
      instanceId: itpInstance.id,
      templateName: (itpInstance as any).itp_templates?.name,
      lotNumber: (itpInstance as any).lot?.lot_number,
      projectName: (itpInstance as any).lot?.project?.name,
      userRole: membership.role,
    });

    return (
      <EnhancedITPForm
        projectId={projectId}
        lotId={lotId}
        itpId={itpId}
        userRole={membership.role}
      />
    );
  } catch (error) {
    console.error('[EnhancedItpInstancePage] Unexpected error:', error);
    // Return a fallback UI instead of throwing
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Enhanced ITP Instance</h1>
            <p className="text-gray-600">
              There was an error loading this enhanced ITP instance. Please try refreshing the page or contact support
              if the issue persists.
            </p>
            <div className="mt-4 space-x-4">
              <a
                href={`/dashboard/projects/${projectId}/lots/${lotId}`}
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Back to Lot
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