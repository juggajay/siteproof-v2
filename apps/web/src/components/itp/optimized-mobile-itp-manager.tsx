'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, ClipboardList } from 'lucide-react';
import { OptimizedMobileItpCard } from './optimized-mobile-itp-card';
import { useDebouncedCallback } from '@/hooks/use-debounce';
import { useOptimisticUpdate } from '@/hooks/use-optimistic-update';

interface MobileItpManagerProps {
  projectId: string;
  lotId: string;
  userRole: string;
}

interface ITPTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;
}

interface ITPInstance {
  id: string;
  name: string;
  description?: string;
  status: string;
  completion_percentage?: number;
  template_id: string;
  data?: any;
  itp_templates?: {
    id: string;
    name: string;
    description?: string;
    structure: any;
    organization_id: string;
  };
}

// Performance optimization: Batch API updates
interface PendingUpdate {
  instanceId: string;
  sectionId: string;
  itemId: string;
  status: 'pass' | 'fail' | 'na';
  timestamp: number;
}

export function OptimizedMobileItpManager({ projectId, lotId }: MobileItpManagerProps) {
  const [availableTemplates, setAvailableTemplates] = useState<ITPTemplate[]>([]);
  const [showTemplateSelection, setShowTemplateSelection] = useState(false);
  const [loading, setLoading] = useState(true);
  const [assigningTemplate, setAssigningTemplate] = useState(false);

  // Track pending updates for batching
  const pendingUpdatesRef = useRef<Map<string, PendingUpdate>>(new Map());

  // Fetch ITP instances function
  const fetchItpInstances = async (): Promise<ITPInstance[]> => {
    const response = await fetch(`/api/projects/${projectId}/lots/${lotId}/itp`);
    if (!response.ok) throw new Error('Failed to load ITP instances');

    const data = await response.json();
    return (data.instances || []).map((instance: any) => ({
      id: instance.id,
      name: instance.name || instance.itp_templates?.name || 'Unknown Template',
      description: instance.itp_templates?.description,
      status: instance.inspection_status || 'draft',
      completion_percentage:
        instance.completion_percentage || instance.data?.completion_percentage || 0,
      template_id: instance.template_id,
      data: instance.data,
      itp_templates: instance.itp_templates,
    }));
  };

  // Update ITP instances on server
  const updateItpInstancesOnServer = async (instances: ITPInstance[]): Promise<ITPInstance[]> => {
    // Process pending batch updates
    if (pendingUpdatesRef.current.size > 0) {
      const updates = Array.from(pendingUpdatesRef.current.values());
      pendingUpdatesRef.current.clear();

      // Batch update API call
      await Promise.all(
        updates.map(async (update) => {
          const instance = instances.find((i) => i.id === update.instanceId);
          if (!instance) return;

          const currentData = instance.data || {};
          const updatedData = {
            ...currentData,
            [update.sectionId]: {
              ...currentData[update.sectionId],
              [update.itemId]: {
                ...currentData[update.sectionId]?.[update.itemId],
                result: update.status,
                updated_at: new Date(update.timestamp).toISOString(),
              },
            },
          };

          const response = await fetch(
            `/api/projects/${projectId}/lots/${lotId}/itp/${update.instanceId}`,
            {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                data: updatedData,
                inspection_status: 'in_progress',
              }),
            }
          );

          if (!response.ok) {
            throw new Error(`Failed to update ITP instance ${update.instanceId}`);
          }
        })
      );
    }

    // Return updated instances from server
    return fetchItpInstances();
  };

  // Use optimistic updates for ITP instances
  const {
    data: itpInstances,
    isPending,
    update: updateInstances,
  } = useOptimisticUpdate<ITPInstance[]>([], updateItpInstancesOnServer, {
    onError: (error) => {
      console.error('Failed to update ITP instances:', error);
      alert('Failed to save changes. Your changes have been reverted.');
    },
    retryCount: 2,
    retryDelay: 1000,
  });

  // Debounced API update function (batches updates every 500ms)
  const debouncedBatchUpdate = useDebouncedCallback(() => {
    if (pendingUpdatesRef.current.size > 0) {
      updateInstances(itpInstances);
    }
  }, 500);

  // Load available templates
  const loadAvailableTemplates = useCallback(async () => {
    try {
      const response = await fetch('/api/itp/templates?is_active=true');
      if (response.ok) {
        const data = await response.json();
        setAvailableTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [instances] = await Promise.all([fetchItpInstances(), loadAvailableTemplates()]);
        updateInstances(instances);
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, lotId]);

  // Optimistic status change handler with batching
  const handleStatusChange = useCallback(
    (sectionId: string, itemId: string, status: 'pass' | 'fail' | 'na') => {
      // Find the target instance
      const targetInstance = itpInstances.find((instance) => {
        const templateStructure = instance.itp_templates?.structure;
        if (!templateStructure) return false;

        // Check sections-based structure
        if (templateStructure.sections) {
          const section = templateStructure.sections.find((s: any) => s.id === sectionId);
          if (section?.items?.find((i: any) => i.id === itemId)) {
            return true;
          }
        }

        // Check inspection_items structure
        if (templateStructure.inspection_items && sectionId === 'inspection_items') {
          if (templateStructure.inspection_items.find((i: any) => i.id === itemId)) {
            return true;
          }
        }

        // Check mock items
        if (
          sectionId === 'mock_section' &&
          ['AS001', 'AS002', 'AS003', 'AS004', 'AS005'].includes(itemId)
        ) {
          return true;
        }

        return false;
      });

      if (!targetInstance) {
        console.error('Could not find instance for update');
        return;
      }

      // Create update key for deduplication
      const updateKey = `${targetInstance.id}-${sectionId}-${itemId}`;

      // Add to pending updates (will overwrite if exists)
      pendingUpdatesRef.current.set(updateKey, {
        instanceId: targetInstance.id,
        sectionId,
        itemId,
        status,
        timestamp: Date.now(),
      });

      // Apply optimistic update immediately to UI
      const optimisticUpdate = itpInstances.map((instance) => {
        if (instance.id === targetInstance.id) {
          const currentData = instance.data || {};
          return {
            ...instance,
            data: {
              ...currentData,
              [sectionId]: {
                ...currentData[sectionId],
                [itemId]: {
                  ...currentData[sectionId]?.[itemId],
                  result: status,
                  updated_at: new Date().toISOString(),
                },
              },
            },
          };
        }
        return instance;
      });

      // Update UI immediately
      updateInstances(optimisticUpdate);

      // Trigger debounced batch update
      debouncedBatchUpdate();
    },
    [itpInstances, updateInstances, debouncedBatchUpdate]
  );

  // Assign template handler
  const assignTemplate = useCallback(
    async (templateId: string) => {
      setAssigningTemplate(true);
      try {
        const response = await fetch('/api/itp/instances/assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateIds: [templateId],
            projectId: projectId,
            lotId: lotId,
          }),
        });

        if (response.ok) {
          const instances = await fetchItpInstances();
          updateInstances(instances);
          setShowTemplateSelection(false);
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to assign template');
        }
      } catch (error) {
        console.error('Error assigning template:', error);
        alert(
          `Failed to assign ITP template: ${error instanceof Error ? error.message : 'Please try again.'}`
        );
      } finally {
        setAssigningTemplate(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [projectId, lotId, updateInstances]
  );

  // Delete ITP handler
  const handleDeleteItp = useCallback(
    async (itpId: string) => {
      // Optimistic delete
      const optimisticUpdate = itpInstances.filter((i) => i.id !== itpId);
      updateInstances(optimisticUpdate);

      try {
        const response = await fetch(`/api/projects/${projectId}/lots/${lotId}/itp/${itpId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete ITP');
        }
      } catch (error) {
        console.error('Error deleting ITP:', error);
        // Revert on error
        updateInstances(itpInstances);
        alert('Failed to delete ITP. Please try again.');
      }
    },
    [projectId, lotId, itpInstances, updateInstances]
  );

  // Submit for review handler
  const handleSubmitForReview = useCallback(
    async (itpId: string) => {
      try {
        const response = await fetch(`/api/projects/${projectId}/lots/${lotId}/itp/${itpId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inspection_status: 'completed',
            inspection_date: new Date().toISOString(),
          }),
        });

        if (response.ok) {
          alert('ITP submitted for review successfully!');
          window.location.href = `/dashboard/projects/${projectId}/lots/${lotId}`;
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to submit ITP');
        }
      } catch (error) {
        console.error('Error submitting ITP:', error);
        alert(
          `Failed to submit ITP: ${error instanceof Error ? error.message : 'Please try again.'}`
        );
      }
    },
    [projectId, lotId]
  );

  // Memoized template selection modal
  const templateSelectionModal = useMemo(() => {
    if (!showTemplateSelection) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
        <div className="w-full max-w-lg bg-white rounded-t-xl sm:rounded-xl shadow-xl max-h-[80vh] overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-semibold">Select ITP Template</h3>
            <button
              onClick={() => setShowTemplateSelection(false)}
              className="text-gray-400 hover:text-gray-500"
            >
              ✕
            </button>
          </div>

          <div className="p-4 max-h-96 overflow-y-auto">
            {availableTemplates.length > 0 ? (
              <div className="space-y-3">
                {availableTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => assignTemplate(template.id)}
                    disabled={assigningTemplate}
                    className="w-full p-4 text-left bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 disabled:opacity-50"
                  >
                    <h4 className="font-medium text-gray-900">{template.name}</h4>
                    {template.description && (
                      <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                    )}
                    {template.category && (
                      <span className="inline-block mt-2 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                        {template.category}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No ITP templates available</p>
              </div>
            )}
          </div>

          {assigningTemplate && (
            <div className="p-4 border-t">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
                <span className="text-sm text-gray-600">Assigning template...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }, [showTemplateSelection, availableTemplates, assigningTemplate, assignTemplate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          ITP Inspections
          {isPending && <span className="ml-2 text-sm text-gray-500">(Saving...)</span>}
        </h2>
        <button
          onClick={() => setShowTemplateSelection(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add ITP
        </button>
      </div>

      {/* ITP Cards */}
      {itpInstances.length > 0 ? (
        <div className="space-y-4">
          {itpInstances.map((itp) => (
            <OptimizedMobileItpCard
              key={itp.id}
              itp={itp}
              onStatusChange={handleStatusChange}
              onDeleteItp={handleDeleteItp}
              onSubmitForReview={handleSubmitForReview}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No ITP Inspections</h3>
          <p className="text-gray-600 mb-4">Add an ITP template to start inspecting this lot.</p>
          <button
            onClick={() => setShowTemplateSelection(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Your First ITP
          </button>
        </div>
      )}

      {/* Template Selection Modal */}
      {templateSelectionModal}
    </div>
  );
}
