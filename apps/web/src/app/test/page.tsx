'use client';

import { useState } from 'react';
import { Button } from '@siteproof/design-system';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function TestPage() {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runTests = async () => {
    setLoading(true);
    try {
      // Test 1: Health check
      const healthRes = await fetch('/api/health');
      const health = await healthRes.json();
      
      // Test 2: Auth debug
      const authRes = await fetch('/api/debug/auth');
      const auth = await authRes.json();
      
      setResults({
        health,
        auth,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      setResults({
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">SiteProof System Test</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Environment Status</h2>
          
          <Button onClick={runTests} loading={loading}>
            {loading ? 'Running Tests...' : 'Run System Tests'}
          </Button>
          
          {results && (
            <div className="mt-6 space-y-4">
              {/* Health Check Results */}
              <div className="border rounded p-4">
                <h3 className="font-semibold mb-2 flex items-center">
                  Health Check
                  {results.health?.status === 'healthy' ? (
                    <CheckCircle className="ml-2 h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="ml-2 h-5 w-5 text-red-500" />
                  )}
                </h3>
                <pre className="text-sm bg-gray-100 p-2 rounded overflow-x-auto">
                  {JSON.stringify(results.health, null, 2)}
                </pre>
              </div>
              
              {/* Auth Debug Results */}
              <div className="border rounded p-4">
                <h3 className="font-semibold mb-2">Authentication Debug</h3>
                <pre className="text-sm bg-gray-100 p-2 rounded overflow-x-auto">
                  {JSON.stringify(results.auth, null, 2)}
                </pre>
              </div>
              
              {/* Error Display */}
              {results.error && (
                <div className="border border-red-300 rounded p-4 bg-red-50">
                  <h3 className="font-semibold mb-2 text-red-700">Error</h3>
                  <p className="text-red-600">{results.error}</p>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Links</h2>
          <div className="space-y-2">
            <a href="/api/health" className="text-blue-600 hover:underline block">
              → Health Check API
            </a>
            <a href="/api/debug/auth" className="text-blue-600 hover:underline block">
              → Auth Debug API
            </a>
            <a href="/auth/login" className="text-blue-600 hover:underline block">
              → Login Page
            </a>
            <a href="/dashboard" className="text-blue-600 hover:underline block">
              → Dashboard (requires auth)
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}