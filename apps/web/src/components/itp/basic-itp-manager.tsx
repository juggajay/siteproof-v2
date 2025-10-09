'use client';

import React, { useState, useEffect } from 'react';
import { ChevronRight, CheckCircle, XCircle, MinusCircle, Trash2, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AssignITPModal } from '@/features/lots/components/AssignITPModal';

interface BasicItpManagerProps {
  projectId: string;
  lotId: string;
}

function deriveInspectionResults(data: any): Record<string, any> {
  if (!data || typeof data !== 'object') {
    return {};
  }

  if (data.inspection_results && typeof data.inspection_results === 'object') {
    return data.inspection_results as Record<string, any>;
  }

  return data as Record<string, any>;
}

function calculateCompletion(results: Record<string, any>): number {
  let totalItems = 0;
  let completedItems = 0;

  Object.values(results || {}).forEach((section: any) => {
    if (section && typeof section === 'object') {
      Object.values(section).forEach((item: any) => {
        if (item && typeof item === 'object') {
          totalItems += 1;
          if (item.result && ['pass', 'fail', 'na'].includes(item.result)) {
            completedItems += 1;
          }
        }
      });
    }
  });

  if (totalItems === 0) {
    return 0;
  }

  return Math.round((completedItems / totalItems) * 100);
}

function getStatusFromCompletion(completion: number): 'pending' | 'in_progress' | 'completed' {
  if (completion === 100) {
    return 'completed';
  }

  if (completion > 0) {
    return 'in_progress';
  }

  return 'pending';
}

function normalizeInstance(instance: any) {
  const rawData = instance?.data || {};
  const inspectionResults = deriveInspectionResults(rawData);
  const completion = calculateCompletion(inspectionResults);
  const status =
    instance?.inspection_status || rawData?.overall_status || getStatusFromCompletion(completion);

  return {
    ...instance,
    data: inspectionResults,
    inspection_status: status,
    completion_percentage: completion,
    __rawData: {
      ...rawData,
      inspection_results: inspectionResults,
      completion_percentage: completion,
      overall_status: status,
    },
  };
}
export function BasicItpManager({ projectId, lotId }: BasicItpManagerProps) {
  const router = useRouter();
  const [instances, setInstances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  // Load function
  const loadItps = () => {
    setLoading(true);
    fetch(`/api/projects/${projectId}/lots/${lotId}/itp`)
      .then((res) => res.json())
      .then((data) => {
        console.log('ITP Data received:', data); // Debug log
        const items = Array.isArray(data?.instances) ? data.instances : [];
        const normalizedItems = items.map(normalizeInstance);
        setInstances(normalizedItems);

        if (normalizedItems.length === 1) {
          setExpandedIds(new Set([normalizedItems[0].id]));
        }

        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading ITPs:', err);
        setLoading(false);
      });
  };

  // Simple load function
  useEffect(() => {
    loadItps();
  }, [projectId, lotId]);

  // Simple update function
  const updateItem = async (
    instanceId: string,
    sectionId: string,
    itemId: string,
    status: string
  ) => {
    console.log('Updating:', { instanceId, sectionId, itemId, status });

    const targetInstance = instances.find((inst) => inst.id === instanceId);
    if (!targetInstance) {
      console.warn('Attempted to update unknown ITP instance', instanceId);
      return;
    }

    const inspectionResults = { ...(targetInstance.data || {}) };
    const sectionResults = { ...(inspectionResults[sectionId] || {}) };
    const existingResult = sectionResults[itemId] || {};

    sectionResults[itemId] = { ...existingResult, result: status };
    inspectionResults[sectionId] = sectionResults;

    const completion = calculateCompletion(inspectionResults);
    const nextStatus = getStatusFromCompletion(completion);

    const updatedRawData = {
      ...(targetInstance.__rawData || {}),
      inspection_results: inspectionResults,
      completion_percentage: completion,
      overall_status: nextStatus,
    };

    setInstances((prev) =>
      prev.map((inst) =>
        inst.id === instanceId
          ? {
              ...inst,
              data: inspectionResults,
              inspection_status: nextStatus,
              completion_percentage: completion,
              __rawData: updatedRawData,
            }
          : inst
      )
    );

    try {
      const response = await fetch(`/api/projects/${projectId}/lots/${lotId}/itp/${instanceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: updatedRawData,
          inspection_status: nextStatus,
          completion_percentage: completion,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || payload.message || 'Failed to update ITP instance');
      }
    } catch (error) {
      console.error('Update failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update ITP instance.');
      loadItps();
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Loading...</div>;
  }

  const assignedTemplateIds = instances
    .map((inst) => inst.template_id || inst.itp_templates?.id)
    .filter(Boolean);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const deleteItp = async (itpId: string) => {
    setDeletingId(itpId);
    try {
      const response = await fetch(`/api/projects/${projectId}/lots/${lotId}/itp/${itpId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete ITP');
      }

      // Remove from local state
      setInstances((prev) => prev.filter((inst) => inst.id !== itpId));
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting ITP:', error);
      toast.error('Failed to delete ITP. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">ITP Inspections</h3>
        <button
          onClick={() => setShowAssignModal(true)}
          className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add ITP
        </button>
      </div>

      {instances.length === 0 && (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500 mb-4">No ITPs assigned yet</p>
          <button
            onClick={() => setShowAssignModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Assign First ITP
          </button>
        </div>
      )}
      {instances.map((instance) => {
        const isOpen = expandedIds.has(instance.id);
        const structure = instance.itp_templates?.structure || instance.template?.structure;
        const templateName =
          instance.itp_templates?.name || instance.template?.name || instance.name || 'ITP';

        // Debug logging
        console.log('Instance:', instance);
        console.log('Structure:', structure);

        // Handle different possible structure formats
        const sections = structure?.sections || structure?.inspection_items || [];
        const hasContent = sections && sections.length > 0;

        return (
          <div
            key={instance.id}
            className="relative border-2 rounded-lg bg-white shadow-sm overflow-hidden"
          >
            <div className="p-4 bg-gray-50 transition-all duration-200 flex items-center justify-between">
              <div
                className="flex-1 font-semibold cursor-pointer hover:bg-gray-100 rounded p-2 -m-2 transition-colors flex items-center group"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleExpanded(instance.id);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleExpanded(instance.id);
                  }
                }}
                aria-expanded={isOpen}
                aria-label={`Toggle ${templateName}`}
              >
                <div className="flex items-center flex-1">
                  <div
                    className="mr-3 transition-transform duration-200"
                    style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0)' }}
                  >
                    <ChevronRight className="h-5 w-5 text-gray-500" />
                  </div>
                  <div className="flex-1">
                    <span className="text-gray-900">{templateName}</span>
                    {instance.description && (
                      <p className="text-sm text-gray-500 font-normal mt-1">
                        {instance.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2 mr-4">
                  <span className="text-sm text-gray-500 group-hover:text-gray-700">
                    {isOpen ? 'Click to collapse' : 'Click to expand'}
                  </span>
                  {!hasContent && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      No items
                    </span>
                  )}
                </div>
              </div>

              {/* Delete Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(instance.id);
                }}
                className="ml-2 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors group"
                aria-label={`Delete ${templateName}`}
                disabled={deletingId === instance.id}
              >
                {deletingId === instance.id ? (
                  <div className="h-5 w-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="h-5 w-5 group-hover:scale-110 transition-transform" />
                )}
              </button>
            </div>

            {/* Confirmation Dialog */}
            {showDeleteConfirm === instance.id && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-lg shadow-xl border-2 border-gray-200 max-w-sm w-full mx-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Delete</h3>
                  <p className="text-gray-600 mb-4">
                    Are you sure you want to remove &ldquo;{templateName}&rdquo; from this lot? This
                    action cannot be undone.
                  </p>
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setShowDeleteConfirm(null)}
                      className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => deleteItp(instance.id)}
                      className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                    >
                      Delete ITP
                    </button>
                  </div>
                </div>
              </div>
            )}

            {isOpen && (
              <div
                className={`border-t-2 border-gray-100 ${hasContent ? 'p-4' : 'p-8'} bg-white transition-all duration-300`}
              >
                {hasContent ? (
                  <div className="space-y-6">
                    {sections.map((section: any, sectionIndex: number) => {
                      // Handle both section-based and flat item structures
                      const sectionItems = section.items || (section.id ? [section] : []);
                      const sectionTitle =
                        section.title || section.name || `Section ${sectionIndex + 1}`;
                      const sectionId = section.id || `section-${sectionIndex}`;

                      return (
                        <div key={sectionId} className="space-y-3">
                          {section.title && (
                            <h4 className="font-semibold text-gray-900 text-base border-b pb-2">
                              {sectionTitle}
                            </h4>
                          )}
                          <div className="space-y-2">
                            {sectionItems.map((item: any, itemIndex: number) => {
                              const itemId = item.id || `item-${itemIndex}`;
                              const currentStatus = instance.data?.[sectionId]?.[itemId]?.result;
                              const itemTitle =
                                item.title ||
                                item.name ||
                                item.description ||
                                `Item ${itemIndex + 1}`;

                              return (
                                <div
                                  key={itemId}
                                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                                >
                                  <div className="flex-1 mb-3 sm:mb-0 sm:mr-4">
                                    <span className="text-sm font-medium text-gray-900">
                                      {itemTitle}
                                    </span>
                                    {item.description && item.description !== itemTitle && (
                                      <p className="text-xs text-gray-500 mt-1">
                                        {item.description}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex gap-2 justify-end">
                                    <button
                                      className={`px-3 py-2 rounded-md font-medium transition-all transform active:scale-95 flex items-center ${
                                        currentStatus === 'pass'
                                          ? 'bg-green-600 text-white shadow-md'
                                          : 'bg-white border border-green-500 text-green-600 hover:bg-green-50'
                                      }`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateItem(instance.id, sectionId, itemId, 'pass');
                                      }}
                                      aria-label="Mark as Pass"
                                    >
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      Pass
                                    </button>
                                    <button
                                      className={`px-3 py-2 rounded-md font-medium transition-all transform active:scale-95 flex items-center ${
                                        currentStatus === 'fail'
                                          ? 'bg-red-600 text-white shadow-md'
                                          : 'bg-white border border-red-500 text-red-600 hover:bg-red-50'
                                      }`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateItem(instance.id, sectionId, itemId, 'fail');
                                      }}
                                      aria-label="Mark as Fail"
                                    >
                                      <XCircle className="h-4 w-4 mr-1" />
                                      Fail
                                    </button>
                                    <button
                                      className={`px-3 py-2 rounded-md font-medium transition-all transform active:scale-95 flex items-center ${
                                        currentStatus === 'na'
                                          ? 'bg-gray-600 text-white shadow-md'
                                          : 'bg-white border border-gray-400 text-gray-600 hover:bg-gray-50'
                                      }`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateItem(instance.id, sectionId, itemId, 'na');
                                      }}
                                      aria-label="Mark as N/A"
                                    >
                                      <MinusCircle className="h-4 w-4 mr-1" />
                                      N/A
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center text-gray-500">
                    <p className="text-base mb-2">No inspection items found</p>
                    <p className="text-sm">
                      This ITP template may not have any configured items yet.
                    </p>
                  </div>
                )}

                {/* Complete ITP Button */}
                <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
                  <button
                    onClick={() =>
                      router.push(
                        `/dashboard/projects/${projectId}/lots/${lotId}/itp/${instance.id}`
                      )
                    }
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
                  >
                    Complete ITP
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Assign ITP Modal */}
      {showAssignModal && (
        <AssignITPModal
          isOpen={showAssignModal}
          onClose={() => setShowAssignModal(false)}
          onITPAssigned={() => {
            setShowAssignModal(false);
            loadItps(); // Reload ITPs after assignment
          }}
          lotId={lotId}
          projectId={projectId}
          assignedTemplateIds={assignedTemplateIds}
        />
      )}
    </div>
  );
}
