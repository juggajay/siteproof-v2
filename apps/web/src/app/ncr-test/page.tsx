'use client';

import { useState } from 'react';

export default function NCRTestPage() {
  const [result, setResult] = useState<string>('');
  const [resultType, setResultType] = useState<'info' | 'success' | 'error'>('info');
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('Test NCR from Diagnostic Page');
  const [description, setDescription] = useState(
    'This is a test NCR created from the diagnostic page to debug the 500 error'
  );
  const [severity, setSeverity] = useState('medium');
  const [category, setCategory] = useState('Quality');
  const [contractorId, setContractorId] = useState('');

  const showResult = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setResult(message);
    setResultType(type);
  };

  const testDiagnostic = async () => {
    showResult('Running diagnostic test...', 'info');

    if (!projectId) {
      showResult('Error: Project ID is required!', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('project_id', projectId);
    formData.append('title', title);
    formData.append('description', description);
    formData.append('severity', severity);
    formData.append('category', category);

    if (contractorId) {
      formData.append('contractor_id', contractorId);
    }

    try {
      const response = await fetch('/api/ncrs/test', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      showResult(JSON.stringify(data, null, 2), response.ok ? 'success' : 'error');
    } catch (error: any) {
      showResult(`Error: ${error.message}`, 'error');
    }
  };

  const testActualNCR = async () => {
    showResult('Testing actual NCR creation...', 'info');

    if (!projectId) {
      showResult('Error: Project ID is required!', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('project_id', projectId);
    formData.append('title', title);
    formData.append('description', description);
    formData.append('severity', severity);
    formData.append('category', category);
    formData.append('tags', JSON.stringify(['test', 'diagnostic']));

    // Don't send contractor_id if empty
    if (contractorId && contractorId.trim()) {
      formData.append('contractor_id', contractorId);
    }

    try {
      const response = await fetch('/api/ncrs', {
        method: 'POST',
        body: formData,
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { rawResponse: text };
      }

      showResult(JSON.stringify(data, null, 2), response.ok ? 'success' : 'error');
    } catch (error: any) {
      showResult(`Error: ${error.message}`, 'error');
    }
  };

  const checkAuth = async () => {
    showResult('Checking authentication...', 'info');

    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();
      showResult(JSON.stringify(data, null, 2), response.ok ? 'success' : 'error');
    } catch (error: any) {
      showResult(`Error: ${error.message}`, 'error');
    }
  };

  const listNCRs = async () => {
    showResult('Fetching NCRs...', 'info');

    try {
      const response = await fetch('/api/ncrs');
      const data = await response.json();
      showResult(JSON.stringify(data, null, 2), response.ok ? 'success' : 'error');
    } catch (error: any) {
      showResult(`Error: ${error.message}`, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-800 border-b-2 border-blue-500 pb-3 mb-6">
            🔍 NCR API Diagnostic Test
          </h1>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project ID (Required):
              </label>
              <input
                type="text"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                placeholder="Enter your project UUID"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <small className="text-gray-500">Get this from the URL when viewing a project</small>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title:</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description:</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Severity:</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category:</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Quality">Quality</option>
                <option value="Safety">Safety</option>
                <option value="Environmental">Environmental</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contractor ID (Optional - leave empty to test):
              </label>
              <input
                type="text"
                value={contractorId}
                onChange={(e) => setContractorId(e.target.value)}
                placeholder="Leave empty"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-3">Tests</h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={testDiagnostic}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                1. Run Diagnostic Test
              </button>
              <button
                onClick={testActualNCR}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                2. Test Actual NCR Creation
              </button>
              <button
                onClick={checkAuth}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                3. Check Authentication
              </button>
              <button
                onClick={listNCRs}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                4. List NCRs
              </button>
            </div>
          </div>

          {result && (
            <div
              className={`mt-6 p-4 rounded-md font-mono text-xs overflow-auto max-h-96 ${
                resultType === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : resultType === 'error'
                    ? 'bg-red-50 border border-red-200 text-red-800'
                    : 'bg-blue-50 border border-blue-200 text-blue-800'
              }`}
            >
              <pre className="whitespace-pre-wrap">{result}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
