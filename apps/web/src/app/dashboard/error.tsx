'use client';

import { useEffect } from 'react';
import { Button } from '@siteproof/design-system';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-sm">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-4 text-2xl font-bold text-gray-900">
            Something went wrong
          </h2>
          <p className="mt-2 text-gray-600">
            We encountered an error loading the dashboard. This might be due to:
          </p>
          <ul className="mt-4 text-left text-sm text-gray-600 space-y-2">
            <li>• Missing or invalid authentication</li>
            <li>• Server configuration issues</li>
            <li>• Network connectivity problems</li>
          </ul>
          {error.digest && (
            <p className="mt-4 text-xs text-gray-500">
              Error ID: {error.digest}
            </p>
          )}
        </div>
        
        <div className="space-y-4">
          <Button
            onClick={reset}
            fullWidth
            variant="default"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
          
          <Button
            onClick={() => window.location.href = '/auth/login'}
            fullWidth
            variant="outline"
          >
            Go to login
          </Button>
        </div>
      </div>
    </div>
  );
}