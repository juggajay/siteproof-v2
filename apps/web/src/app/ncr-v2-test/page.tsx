'use client';

import { useState, useEffect } from 'react';
import { NcrFormV2 } from '@/features/ncr/components/NcrFormV2';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

export default function NcrV2TestPage() {
  const [projectId, setProjectId] = useState('');
  const [testResults, setTestResults] = useState<any>(null);
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [createdNcr, setCreatedNcr] = useState<any>(null);

  // Auto-detect project ID from localStorage or previous usage
  useEffect(() => {
    const savedProjectId = localStorage.getItem('test_project_id');
    if (savedProjectId) {
      setProjectId(savedProjectId);
    }
  }, []);

  const testApiEndpoint = async () => {
    if (!projectId) {
      toast.error('Please enter a Project ID');
      return;
    }

    setIsTestingApi(true);
    setTestResults(null);
    localStorage.setItem('test_project_id', projectId);

    try {
      // Test the diagnostic endpoint first
      const formData = new FormData();
      formData.append('project_id', projectId);
      formData.append('title', 'API Test NCR');
      formData.append('description', 'Testing the new NCR API endpoint');
      formData.append('severity', 'low');
      formData.append('category', 'Quality');

      const response = await fetch('/api/ncrs/test', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      setTestResults(result);

      if (result.success) {
        toast.success('API test passed! You can create NCRs.');
      } else {
        toast.error('API test failed. Check the results below.');
      }
    } catch (error) {
      console.error('Test failed:', error);
      toast.error('Test failed with an error');
      setTestResults({
        error: 'Test failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsTestingApi(false);
    }
  };

  const handleNcrCreated = (ncr: any) => {
    setCreatedNcr(ncr);
    setShowForm(false);
    toast.success('NCR created successfully using the new API!');
  };

  const listNcrs = async () => {
    try {
      const response = await fetch(`/api/ncrs-v2?project_id=${projectId}`);
      const result = await response.json();

      if (response.ok) {
        toast.success(`Found ${result.data.length} NCRs`);
        console.log('NCRs:', result.data);
      } else {
        toast.error('Failed to fetch NCRs');
      }
    } catch (error) {
      toast.error('Error fetching NCRs');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">NCR V2 Test Page</h1>
          <p className="mt-2 text-gray-600">
            Test the new NCR API implementation with proper field handling
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Configuration Card */}
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
              <CardDescription>Enter your project ID to get started</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Project ID</label>
                <input
                  type="text"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  placeholder="Enter your project UUID"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Get this from the URL when viewing a project
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={testApiEndpoint}
                  disabled={!projectId || isTestingApi}
                  className="flex-1"
                >
                  {isTestingApi ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    'Test API'
                  )}
                </Button>
                <Button
                  onClick={listNcrs}
                  disabled={!projectId}
                  variant="outline"
                  className="flex-1"
                >
                  List NCRs
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Test Results Card */}
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
              <CardDescription>API diagnostic results</CardDescription>
            </CardHeader>
            <CardContent>
              {testResults ? (
                <div className="space-y-3">
                  {testResults.success ? (
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-green-700">All checks passed!</p>
                        <p className="text-sm text-gray-600">You can create NCRs</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-700">Some checks failed</p>
                        <p className="text-sm text-gray-600">{testResults.error}</p>
                      </div>
                    </div>
                  )}

                  {testResults.diagnostics && (
                    <div className="mt-4">
                      <p className="font-medium text-sm mb-2">Diagnostic Details:</p>
                      <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-64">
                        {JSON.stringify(testResults.diagnostics, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">Run the API test to see results</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* NCR Creation Form */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Create NCR (New Implementation)</CardTitle>
            <CardDescription>Use the new form with proper field validation</CardDescription>
          </CardHeader>
          <CardContent>
            {!showForm ? (
              <Button
                onClick={() => setShowForm(true)}
                disabled={!projectId || !testResults?.success}
                className="w-full"
              >
                Open NCR Form
              </Button>
            ) : (
              <NcrFormV2
                projectId={projectId}
                onSuccess={handleNcrCreated}
                onCancel={() => setShowForm(false)}
              />
            )}
          </CardContent>
        </Card>

        {/* Created NCR Display */}
        {createdNcr && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Successfully Created NCR</CardTitle>
              <CardDescription>NCR #{createdNcr.ncr_number}</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto">
                {JSON.stringify(createdNcr, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
