'use client';

import React, { useState, useEffect } from 'react';
import { ChevronRight, CheckCircle, XCircle, MinusCircle } from 'lucide-react';

interface BasicItpManagerProps {
  projectId: string;
  lotId: string;
}

export function BasicItpManager({ projectId, lotId }: BasicItpManagerProps) {
  const [instances, setInstances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Simple load function
  useEffect(() => {
    fetch(`/api/projects/${projectId}/lots/${lotId}/itp`)
      .then((res) => res.json())
      .then((data) => {
        console.log('ITP Data received:', data); // Debug log
        const items = data.instances || [];
        setInstances(items);
        // Start with ITPs collapsed so user can see the expand action
        // Only expand first one if there's only one ITP
        if (items.length === 1) {
          setExpandedIds(new Set([items[0].id]));
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading ITPs:', err);
        setLoading(false);
      });
  }, [projectId, lotId]);

  // Simple update function
  const updateItem = async (
    instanceId: string,
    sectionId: string,
    itemId: string,
    status: string
  ) => {
    console.log('Updating:', { instanceId, sectionId, itemId, status });

    // Update local state
    const newInstances = instances.map((inst) => {
      if (inst.id === instanceId) {
        const newData = { ...(inst.data || {}) };
        if (!newData[sectionId]) newData[sectionId] = {};
        newData[sectionId][itemId] = { result: status };
        return { ...inst, data: newData };
      }
      return inst;
    });
    setInstances(newInstances);

    // Send to server
    try {
      const instance = instances.find((i) => i.id === instanceId);
      const updatedData = { ...(instance?.data || {}) };
      if (!updatedData[sectionId]) updatedData[sectionId] = {};
      updatedData[sectionId][itemId] = { result: status };

      await fetch(`/api/projects/${projectId}/lots/${lotId}/itp/${instanceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: updatedData,
          inspection_status: 'in_progress',
        }),
      });
    } catch (error) {
      console.error('Update failed:', error);
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Loading...</div>;
  }

  if (instances.length === 0) {
    return <div className="p-4 text-center text-gray-500">No ITPs assigned</div>;
  }

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

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">ITP Inspections</h3>
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
          <div key={instance.id} className="border-2 rounded-lg bg-white shadow-sm overflow-hidden">
            <div
              className="p-4 font-semibold cursor-pointer bg-gray-50 hover:bg-gray-100 transition-all duration-200 flex items-center justify-between group"
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
              <div className="flex items-center">
                <div
                  className="mr-3 transition-transform duration-200"
                  style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0)' }}
                >
                  <ChevronRight className="h-5 w-5 text-gray-500" />
                </div>
                <div>
                  <span className="text-gray-900">{templateName}</span>
                  {instance.description && (
                    <p className="text-sm text-gray-500 font-normal mt-1">{instance.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
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
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
