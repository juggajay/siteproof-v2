import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// Force dynamic rendering for pages that use authentication
export const dynamic = 'force-dynamic';

export default async function MinimalDashboardPage() {
  try {
    console.log('Dashboard: Creating Supabase client...');
    const supabase = await createClient();
    
    console.log('Dashboard: Getting user...');
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Dashboard: Auth error:', error);
      throw new Error(`Authentication error: ${error.message}`);
    }
    
    if (!user) {
      console.log('Dashboard: No user, redirecting to login');
      redirect('/auth/login');
    }

    console.log('Dashboard: User authenticated:', user.id);

    // Minimal return with no components
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <h1 className="text-3xl font-bold">Minimal Dashboard</h1>
        <p className="mt-4">Welcome, {user.email}!</p>
        <p className="mt-2 text-sm text-gray-600">User ID: {user.id}</p>
        <div className="mt-8 p-4 bg-white rounded shadow">
          <h2 className="font-semibold">Debug Info</h2>
          <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
            {JSON.stringify({ userId: user.id, email: user.email }, null, 2)}
          </pre>
        </div>
      </div>
    );
  } catch (error: any) {
    console.error('MinimalDashboard: Caught error:', error);
    throw error;
  }
}