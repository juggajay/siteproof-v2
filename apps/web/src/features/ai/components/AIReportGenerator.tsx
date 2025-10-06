'use client';

import React, { useState } from 'react';
import { useITPGenerator } from '@/lib/ai/hooks/use-itp-generator';
import type { InspectionData, ITPReportRequest } from '@/lib/ai/types';
import { format } from 'date-fns';

interface AIReportGeneratorProps {
  inspection: InspectionData;
  onReportGenerated?: (reportId: string) => void;
}

export function AIReportGenerator({ inspection, onReportGenerated }: AIReportGeneratorProps) {
  const [selectedStandards, setSelectedStandards] = useState<string[]>([]);
  const [reportType, setReportType] = useState<'detailed' | 'summary' | 'non-conformance'>(
    'detailed'
  );
  const [includeRecommendations, setIncludeRecommendations] = useState(true);
  const [includePhotos, setIncludePhotos] = useState(true);

  const { generateReport, loading, error, report } = useITPGenerator({
    onSuccess: (report) => {
      console.log('Report generated:', report);
      onReportGenerated?.(report.id);
    },
    onError: (error) => {
      console.error('Report generation failed:', error);
    },
  });

  // Determine applicable standards based on inspection type
  const getApplicableStandards = () => {
    switch (inspection.type) {
      case 'earthworks':
        return ['AS_3798'];
      case 'drainage':
        return ['AS_NZS_3500_3'];
      case 'concrete':
        return ['AS_2870', 'AS_4671'];
      case 'reinforcement':
        return ['AS_4671'];
      default:
        return ['AS_3798', 'AS_NZS_3500_3', 'AS_2870', 'AS_4671'];
    }
  };

  const handleGenerateReport = async () => {
    const standards = selectedStandards.length > 0 ? selectedStandards : getApplicableStandards();

    const request: ITPReportRequest = {
      inspection,
      standards,
      reportType,
      includeRecommendations,
      includePhotos: includePhotos && inspection.images && inspection.images.length > 0,
    };

    await generateReport(request);
  };

  const standardOptions = [
    { value: 'AS_3798', label: 'AS 3798 - Earthworks' },
    { value: 'AS_NZS_3500_3', label: 'AS/NZS 3500.3 - Drainage' },
    { value: 'AS_2870', label: 'AS 2870 - Residential Slabs' },
    { value: 'AS_4671', label: 'AS 4671 - Steel Reinforcement' },
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-4">AI Report Generator</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-600">Inspection Type</p>
            <p className="font-medium">
              {inspection.type.charAt(0).toUpperCase() + inspection.type.slice(1)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Date</p>
            <p className="font-medium">{format(new Date(inspection.date), 'dd/MM/yyyy')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Location</p>
            <p className="font-medium">{inspection.location}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Weather</p>
            <p className="font-medium">
              {inspection.weather.conditions}, {inspection.weather.temperature}°C
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Applicable Standards
          </label>
          <div className="space-y-2">
            {standardOptions.map((option) => (
              <label key={option.value} className="flex items-center">
                <input
                  type="checkbox"
                  value={option.value}
                  checked={
                    selectedStandards.includes(option.value) ||
                    (selectedStandards.length === 0 &&
                      getApplicableStandards().includes(option.value))
                  }
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedStandards([...selectedStandards, option.value]);
                    } else {
                      setSelectedStandards(selectedStandards.filter((s) => s !== option.value));
                    }
                  }}
                  className="mr-2"
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="detailed">Detailed Report</option>
            <option value="summary">Summary Report</option>
            <option value="non-conformance">Non-Conformance Report</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={includeRecommendations}
              onChange={(e) => setIncludeRecommendations(e.target.checked)}
              className="mr-2"
            />
            Include AI Recommendations
          </label>
          {inspection.images && inspection.images.length > 0 && (
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includePhotos}
                onChange={(e) => setIncludePhotos(e.target.checked)}
                className="mr-2"
              />
              Include Photos in Report
            </label>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700">Error: {error.message}</p>
        </div>
      )}

      <button
        onClick={handleGenerateReport}
        disabled={loading}
        className={`w-full py-2 px-4 rounded-md font-medium text-white transition-colors ${
          loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {loading ? 'Generating Report...' : 'Generate AI Report'}
      </button>

      {report && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <h3 className="font-semibold text-green-800 mb-2">Report Generated Successfully!</h3>
          <p className="text-sm text-green-700 mb-4">Report ID: {report.id}</p>

          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-700 mb-1">Summary</h4>
              <p className="text-sm text-gray-600">{report.summary}</p>
            </div>

            <div>
              <h4 className="font-medium text-gray-700 mb-1">Compliance Status</h4>
              <div className="space-y-1">
                {report.compliance.map((result, index) => (
                  <div key={index} className="flex items-center text-sm">
                    <span
                      className={`inline-block w-2 h-2 rounded-full mr-2 ${
                        result.compliant ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    ></span>
                    <span>
                      {result.standard}: {result.compliant ? 'Compliant' : 'Non-Compliant'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {report.recommendations.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-1">Key Recommendations</h4>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  {report.recommendations.slice(0, 3).map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}

            {report.nextActions.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-1">Next Actions</h4>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  {report.nextActions.map((action, index) => (
                    <li key={index}>{action}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => {
                // Download report as markdown
                const blob = new Blob([report.reportMarkdown], { type: 'text/markdown' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `itp-report-${report.id}.md`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Download Report
            </button>
            <button
              onClick={() => {
                // Copy report to clipboard
                navigator.clipboard.writeText(report.reportMarkdown);
                alert('Report copied to clipboard!');
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Copy to Clipboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
