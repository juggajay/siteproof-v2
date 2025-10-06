// React hook for ITP Report Generation

import { useState, useCallback } from 'react';
import type { ITPReportRequest, ITPReportResponse } from '../types';

interface UseITPGeneratorOptions {
  onSuccess?: (report: ITPReportResponse) => void;
  onError?: (error: Error) => void;
}

export function useITPGenerator(options: UseITPGeneratorOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [report, setReport] = useState<ITPReportResponse | null>(null);

  const generateReport = useCallback(
    async (request: ITPReportRequest) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/ai/generate-itp-report', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to generate report');
        }

        const reportData = await response.json();
        setReport(reportData);
        options.onSuccess?.(reportData);

        return reportData;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error occurred');
        setError(error);
        options.onError?.(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [options]
  );

  const reset = useCallback(() => {
    setReport(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    generateReport,
    loading,
    error,
    report,
    reset,
  };
}
