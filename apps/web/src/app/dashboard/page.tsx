import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="py-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">Welcome back, {user.email}!</p>
          
          <div className="mt-8 rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-medium text-gray-900">Quick Start</h2>
            <p className="mt-2 text-gray-600">
              You're successfully logged in. Start by creating your first project.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}