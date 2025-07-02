'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

export default function ClientDashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClient();
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          setError(error.message);
        } else if (!user) {
          router.push('/auth/login');
        } else {
          setUser(user);
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 p-6 rounded">
          <h1 className="text-red-600 font-bold mb-2">Error</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-4">Client Dashboard</h1>
        <p className="text-gray-600 mb-8">Welcome back, {user.email}!</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <a
            href="/dashboard/projects/new"
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold mb-2">Create Project</h3>
            <p className="text-sm text-gray-600">Start a new construction project</p>
          </a>
          
          <a
            href="/dashboard/diaries/new"
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold mb-2">Daily Diary</h3>
            <p className="text-sm text-gray-600">Record site activities</p>
          </a>
          
          <a
            href="/dashboard/ncrs/new"
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold mb-2">New NCR</h3>
            <p className="text-sm text-gray-600">Report non-conformance</p>
          </a>
          
          <a
            href="/dashboard/reports"
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold mb-2">Reports</h3>
            <p className="text-sm text-gray-600">Generate reports</p>
          </a>
        </div>
      </div>
    </div>
  );
}