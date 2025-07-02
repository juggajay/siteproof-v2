// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function TestDashboardPage() {
  try {
    // Test 1: Can we import the module?
    let importError = null;
    try {
      const { createClient } = await import('@/lib/supabase/server');
    } catch (e: any) {
      importError = e.message;
    }

    // Test 2: Check environment variables
    const envCheck = {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      nodeEnv: process.env.NODE_ENV,
    };

    // Test 3: Try creating client if import worked
    let clientError = null;
    let authError = null;
    let user = null;
    
    if (!importError) {
      try {
        const { createClient } = await import('@/lib/supabase/server');
        const supabase = await createClient();
        
        const { data: { user: authUser }, error } = await supabase.auth.getUser();
        if (error) {
          authError = error.message;
        } else {
          user = authUser;
        }
      } catch (e: any) {
        clientError = e.message;
      }
    }

    return (
      <div className="p-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Dashboard Test Page</h1>
        
        <div className="space-y-4">
          <div className="bg-white p-4 rounded shadow">
            <h2 className="font-semibold mb-2">Import Test</h2>
            <p className={importError ? 'text-red-600' : 'text-green-600'}>
              {importError ? `Failed: ${importError}` : 'Success'}
            </p>
          </div>

          <div className="bg-white p-4 rounded shadow">
            <h2 className="font-semibold mb-2">Environment Check</h2>
            <pre className="text-sm bg-gray-100 p-2 rounded">
              {JSON.stringify(envCheck, null, 2)}
            </pre>
          </div>

          <div className="bg-white p-4 rounded shadow">
            <h2 className="font-semibold mb-2">Client Creation</h2>
            <p className={clientError ? 'text-red-600' : 'text-green-600'}>
              {clientError ? `Failed: ${clientError}` : 'Success'}
            </p>
          </div>

          <div className="bg-white p-4 rounded shadow">
            <h2 className="font-semibold mb-2">Auth Check</h2>
            {authError ? (
              <p className="text-red-600">Error: {authError}</p>
            ) : user ? (
              <p className="text-green-600">Authenticated as: {user.email}</p>
            ) : (
              <p className="text-yellow-600">No user found</p>
            )}
          </div>
        </div>
      </div>
    );
  } catch (error: any) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Test Dashboard Error</h1>
        <div className="bg-red-50 p-4 rounded">
          <p className="font-semibold">Error Message:</p>
          <p className="text-red-700">{error.message}</p>
          {error.stack && process.env.NODE_ENV === 'development' && (
            <pre className="mt-4 text-xs overflow-auto">{error.stack}</pre>
          )}
        </div>
      </div>
    );
  }
}