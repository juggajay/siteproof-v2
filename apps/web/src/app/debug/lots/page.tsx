'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function DebugLotsPage() {
  const [lots, setLots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLots();
  }, []);

  const loadLots = async () => {
    try {
      const supabase = createClient();
      
      // Get all lots with their project info
      const { data, error } = await supabase
        .from('lots')
        .select(`
          id,
          lot_number,
          name,
          project_id,
          status,
          projects (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        setError(error.message);
        console.error('Error loading lots:', error);
      } else {
        setLots(data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Debug: Lots</h1>
      
      <div className="space-y-4">
        {lots.length === 0 ? (
          <p>No lots found</p>
        ) : (
          lots.map((lot) => (
            <div key={lot.id} className="border p-4 rounded-lg bg-white">
              <h3 className="font-semibold">
                Lot #{lot.lot_number} {lot.name && `- ${lot.name}`}
              </h3>
              <p className="text-sm text-gray-600">ID: {lot.id}</p>
              <p className="text-sm text-gray-600">Project ID: {lot.project_id}</p>
              <p className="text-sm text-gray-600">
                Project: {lot.projects?.name || 'No project linked'}
              </p>
              <p className="text-sm text-gray-600">Status: {lot.status}</p>
              
              <div className="mt-2 space-x-4">
                <a
                  href={`/dashboard/projects/${lot.project_id}/lots/${lot.id}`}
                  className="text-blue-600 hover:underline text-sm"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open in Dashboard
                </a>
                <span className="text-gray-500 text-sm">
                  URL: /dashboard/projects/{lot.project_id}/lots/{lot.id}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}