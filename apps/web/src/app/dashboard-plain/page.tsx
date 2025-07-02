import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function PlainDashboardPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900">Plain Dashboard</h1>
        <p className="mt-2 text-gray-600">Welcome back, {user.email}!</p>
        
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/dashboard/projects/new"
            className="rounded-lg bg-white p-6 shadow-sm hover:shadow-md"
          >
            <h3 className="font-semibold">Create Project</h3>
            <p className="mt-1 text-sm text-gray-600">Start a new construction project</p>
          </Link>
          
          <Link
            href="/dashboard/diaries/new"
            className="rounded-lg bg-white p-6 shadow-sm hover:shadow-md"
          >
            <h3 className="font-semibold">Daily Diary</h3>
            <p className="mt-1 text-sm text-gray-600">Record today&apos;s site activities</p>
          </Link>
          
          <Link
            href="/dashboard/ncrs/new"
            className="rounded-lg bg-white p-6 shadow-sm hover:shadow-md"
          >
            <h3 className="font-semibold">New NCR</h3>
            <p className="mt-1 text-sm text-gray-600">Report non-conformance</p>
          </Link>
          
          <Link
            href="/dashboard/reports"
            className="rounded-lg bg-white p-6 shadow-sm hover:shadow-md"
          >
            <h3 className="font-semibold">Generate Report</h3>
            <p className="mt-1 text-sm text-gray-600">Create project reports</p>
          </Link>
        </div>
      </div>
    </div>
  );
}