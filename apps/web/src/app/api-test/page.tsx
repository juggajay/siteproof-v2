'use client';

import { useState } from 'react';

export default function APITestPage() {
  const [orgId, setOrgId] = useState('');
  const [contractorId, setContractorId] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testAPI = async (url: string, method: string = 'GET', body?: any) => {
    setLoading(true);
    try {
      const options: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json' }
      };
      if (body) options.body = JSON.stringify(body);

      const res = await fetch(url, options);
      const data = await res.json();
      setResult({ status: res.status, data });
    } catch (error: any) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Foreman Flow API Test</h1>

      <div className="mb-6 p-4 bg-gray-100 rounded">
        <h2 className="font-bold mb-2">Configuration</h2>
        <div className="space-y-2">
          <div>
            <label className="block text-sm font-medium">Organization ID:</label>
            <input
              type="text"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="Get from Supabase: SELECT id FROM organizations LIMIT 1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Contractor ID (after creating):</label>
            <input
              type="text"
              value={contractorId}
              onChange={(e) => setContractorId(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="border rounded p-4">
          <h3 className="font-bold mb-2">1. Get All Labor Contractors</h3>
          <button
            onClick={() => testAPI('/api/contractors?type=labor')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            disabled={loading}
          >
            GET /api/contractors?type=labor
          </button>
        </div>

        <div className="border rounded p-4">
          <h3 className="font-bold mb-2">2. Create Labor Contractor</h3>
          <button
            onClick={() => testAPI('/api/contractors', 'POST', {
              organization_id: orgId,
              name: 'ABC Labor Contractors Ltd',
              type: 'labor',
              contact_email: 'contact@abc-labor.com',
              contact_phone: '+1-555-0123'
            })}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            disabled={loading || !orgId}
          >
            POST /api/contractors
          </button>
          <p className="text-sm text-gray-600 mt-2">
            ⚠️ Copy the returned `id` to &quot;Contractor ID&quot; above
          </p>
        </div>

        <div className="border rounded p-4">
          <h3 className="font-bold mb-2">3. Get Workers for Contractor</h3>
          <button
            onClick={() => testAPI(`/api/contractors/${contractorId}/workers`)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            disabled={loading || !contractorId}
          >
            GET /api/contractors/[id]/workers
          </button>
        </div>

        <div className="border rounded p-4">
          <h3 className="font-bold mb-2">4. Create Worker</h3>
          <button
            onClick={() => testAPI(`/api/contractors/${contractorId}/workers`, 'POST', {
              organization_id: orgId,
              name: 'John Smith',
              job_title: 'Machine Driver',
              hourly_rate: 45.00,
              contact_phone: '+1-555-0124'
            })}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            disabled={loading || !contractorId || !orgId}
          >
            POST /api/contractors/[id]/workers
          </button>
        </div>

        <div className="border rounded p-4">
          <h3 className="font-bold mb-2">5. Create Plant Contractor</h3>
          <button
            onClick={() => testAPI('/api/contractors', 'POST', {
              organization_id: orgId,
              name: 'XYZ Equipment Rental',
              type: 'plant',
              contact_email: 'contact@xyz-rental.com'
            })}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            disabled={loading || !orgId}
          >
            POST /api/contractors (type: plant)
          </button>
        </div>

        <div className="border rounded p-4">
          <h3 className="font-bold mb-2">6. Create Plant Item</h3>
          <button
            onClick={() => testAPI(`/api/contractors/${contractorId}/plant`, 'POST', {
              organization_id: orgId,
              name: 'CAT 320 Excavator',
              hourly_rate: 125.00
            })}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            disabled={loading || !contractorId || !orgId}
          >
            POST /api/contractors/[id]/plant
          </button>
        </div>
      </div>

      {result && (
        <div className="mt-6 p-4 bg-gray-900 text-green-400 rounded font-mono text-sm overflow-auto">
          <h3 className="text-white font-bold mb-2">Response:</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      {loading && (
        <div className="mt-4 text-center text-gray-600">
          Loading...
        </div>
      )}
    </div>
  );
}
