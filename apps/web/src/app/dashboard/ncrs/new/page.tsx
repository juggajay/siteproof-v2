'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { Button } from '@siteproof/design-system';
import { NcrForm } from '@/features/ncr/components/NcrForm';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { toast } from 'sonner';

export default function NewNCRPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams?.get('project_id');
  const inspectionId = searchParams?.get('inspection_id');
  // const lotId = searchParams?.get('lot_id'); // Reserved for future use

  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectId || '');

  // Fetch all projects for selection
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await fetch('/api/projects');
      if (!response.ok) throw new Error('Failed to fetch projects');
      const data = await response.json();
      return data.projects;
    },
    enabled: !projectId,
  });

  // Fetch specific project if ID provided
  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', selectedProjectId || projectId],
    queryFn: async () => {
      const id = selectedProjectId || projectId;
      if (!id) return null;
      const response = await fetch(`/api/projects/${id}`);
      if (!response.ok) throw new Error('Failed to fetch project');
      const data = await response.json();
      return data.project;
    },
    enabled: !!(selectedProjectId || projectId),
  });

  // Fetch inspection if ID provided
  const { data: inspection } = useQuery({
    queryKey: ['inspection', inspectionId],
    queryFn: async () => {
      if (!inspectionId) return null;
      const response = await fetch(`/api/inspections/${inspectionId}`);
      if (!response.ok) throw new Error('Failed to fetch inspection');
      return response.json();
    },
    enabled: !!inspectionId,
  });

  const handleSuccess = (ncrId: string) => {
    toast.success('NCR created successfully');
    router.push(`/dashboard/ncrs/${ncrId}`);
  };

  const handleCancel = () => {
    router.push('/dashboard/ncrs');
  };

  const isLoading = projectsLoading || projectLoading;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/dashboard/ncrs">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to NCRs
              </Button>
            </Link>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Raise Non-Conformance Report
                </h1>
                <p className="text-gray-600">
                  Document quality issues, safety violations, or any non-conformances that need to
                  be addressed.
                </p>
              </div>
            </div>
          </div>

          {/* Guidelines */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-blue-900 mb-2">NCR Guidelines</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Provide clear and detailed descriptions of the issue</li>
              <li>• Include photographic evidence when possible</li>
              <li>• Specify exact location and trade involved</li>
              <li>• Assign appropriate severity based on impact</li>
              <li>• Set realistic due dates for resolution</li>
            </ul>
          </div>
        </div>

        {/* Form Section */}
        <div className="bg-white shadow rounded-lg p-6">
          {!project && !isLoading ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Project</h3>
              <p className="text-gray-600 mb-6">Choose a project to raise an NCR for</p>

              {projects && projects.length > 0 ? (
                <div className="max-w-sm mx-auto">
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                  >
                    <option value="">Select a project...</option>
                    {projects.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.client_name && `- ${p.client_name}`}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="text-gray-500">No projects available</p>
              )}
            </div>
          ) : isLoading ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="text-gray-600">Loading project details...</span>
              </div>
            </div>
          ) : project ? (
            <NcrForm
              project={project}
              inspection={inspection}
              inspectionItemRef={searchParams?.get('item_ref') || undefined}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          ) : null}
        </div>

        {/* Tips Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h4 className="font-medium text-gray-900 mb-2">Severity Levels</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full mt-1"></span>
                <div>
                  <span className="font-medium">Low:</span> Minor issues with minimal impact
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-2 h-2 bg-yellow-500 rounded-full mt-1"></span>
                <div>
                  <span className="font-medium">Medium:</span> Moderate impact on quality
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-2 h-2 bg-orange-500 rounded-full mt-1"></span>
                <div>
                  <span className="font-medium">High:</span> Significant quality/safety concern
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full mt-1"></span>
                <div>
                  <span className="font-medium">Critical:</span> Immediate action required
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h4 className="font-medium text-gray-900 mb-2">Categories</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Quality - Workmanship issues</li>
              <li>• Safety - Safety violations</li>
              <li>• Environmental - Environmental concerns</li>
              <li>• Documentation - Missing/incorrect docs</li>
              <li>• Materials - Material defects</li>
              <li>• Design - Design conflicts</li>
            </ul>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h4 className="font-medium text-gray-900 mb-2">Best Practices</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Take photos from multiple angles</li>
              <li>• Reference drawings/specifications</li>
              <li>• Include measurements if relevant</li>
              <li>• Document who was notified</li>
              <li>• Follow up regularly</li>
              <li>• Update status promptly</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
