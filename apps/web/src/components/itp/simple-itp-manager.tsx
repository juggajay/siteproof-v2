'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, MinusCircle } from 'lucide-react';

interface SimpleItpManagerProps {
  projectId: string;
  lotId: string;
}

export function SimpleItpManager({ projectId, lotId }: SimpleItpManagerProps) {
  const [instances, setInstances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [firstLoad, setFirstLoad] = useState(true);

  // Load ITP instances
  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch(`/api/projects/${projectId}/lots/${lotId}/itp`);
        if (response.ok) {
          const data = await response.json();
          const loadedInstances = data.instances || [];
          setInstances(loadedInstances);
          
          // Auto-expand first ITP on load
          if (firstLoad && loadedInstances.length > 0) {
            setExpandedId(loadedInstances[0].id);
            setFirstLoad(false);
          }
        }
      } catch (error) {
        console.error('Failed to load ITPs:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [projectId, lotId]);

  // Handle status update for an item
  async function updateItemStatus(instanceId: string, itemId: string, status: 'pass' | 'fail' | 'na') {
    setIsSaving(true);
    
    // Find and update local state immediately
    setInstances(prev => prev.map(instance => {
      if (instance.id === instanceId) {
        const newData = { ...(instance.data || {}) };
        const [sectionId, itemKey] = itemId.split('-');
        
        if (!newData[sectionId]) newData[sectionId] = {};
        newData[sectionId][itemKey] = {
          result: status,
          updated_at: new Date().toISOString()
        };
        
        return { ...instance, data: newData };
      }
      return instance;
    }));

    // Send update to server
    try {
      const instance = instances.find(i => i.id === instanceId);
      if (!instance) return;

      const updatedData = { ...(instance.data || {}) };
      const [sectionId, itemKey] = itemId.split('-');
      
      if (!updatedData[sectionId]) updatedData[sectionId] = {};
      updatedData[sectionId][itemKey] = {
        result: status,
        updated_at: new Date().toISOString()
      };

      const response = await fetch(`/api/projects/${projectId}/lots/${lotId}/itp/${instanceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: updatedData,
          inspection_status: 'in_progress'
        })
      });

      if (!response.ok) {
        console.error('Failed to save update');
        // Could revert local state here
      }
    } catch (error) {
      console.error('Error updating item:', error);
    } finally {
      setIsSaving(false);
    }
  }

  // Get all items from an instance
  function getItems(instance: any) {
    const items: any[] = [];
    const structure = instance.itp_templates?.structure;
    
    if (structure?.sections) {
      structure.sections.forEach((section: any) => {
        section.items?.forEach((item: any) => {
          const itemId = `${section.id}-${item.id}`;
          const currentStatus = instance.data?.[section.id]?.[item.id]?.result;
          
          items.push({
            id: itemId,
            name: item.title || item.description || 'Item',
            section: section.title || 'Section',
            status: currentStatus
          });
        });
      });
    } else if (structure?.inspection_items) {
      // Handle alternative structure
      structure.inspection_items?.forEach((item: any, index: number) => {
        const itemId = `items-${item.id || index}`;
        const currentStatus = instance.data?.items?.[item.id || index]?.result;
        
        items.push({
          id: itemId,
          name: item.description || item.title || 'Item',
          section: item.category || 'General',
          status: currentStatus
        });
      });
    }
    
    return items;
  }

  // Calculate completion percentage
  function getCompletionPercentage(instance: any) {
    const items = getItems(instance);
    if (items.length === 0) return 0;
    
    const completed = items.filter(item => item.status).length;
    return Math.round((completed / items.length) * 100);
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (instances.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-600">No ITPs assigned to this lot yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Save indicator */}
      {isSaving && (
        <div className="fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center z-50">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          Saving...
        </div>
      )}

      {/* ITP Instances */}
      {instances.map(instance => {
        const items = getItems(instance);
        const completion = getCompletionPercentage(instance);
        const isExpanded = expandedId === instance.id;

        return (
          <div key={instance.id} className="bg-white rounded-lg shadow border">
            {/* Header */}
            <div
              className="p-4 cursor-pointer"
              onClick={() => setExpandedId(isExpanded ? null : instance.id)}
            >
              <h3 className="font-semibold text-lg">
                {instance.itp_templates?.name || instance.name || 'ITP'}
              </h3>
              
              {/* Progress bar */}
              <div className="mt-2">
                <div className="flex items-center">
                  <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${completion}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{completion}%</span>
                </div>
              </div>
            </div>

            {/* Items */}
            {isExpanded && (
              <div className="border-t divide-y">
                {items.map(item => (
                  <div key={item.id} className="p-4 flex items-center justify-between">
                    <div className="flex-1 pr-4">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-500">{item.section}</p>
                    </div>
                    
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('Pass clicked for:', item.id);
                          updateItemStatus(instance.id, item.id, 'pass');
                        }}
                        className={`p-3 rounded-lg touch-manipulation ${
                          item.status === 'pass'
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 hover:bg-green-100 active:bg-green-200'
                        }`}
                        style={{ minWidth: '48px', minHeight: '48px' }}
                      >
                        <CheckCircle className="w-6 h-6" />
                      </button>
                      
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('Fail clicked for:', item.id);
                          updateItemStatus(instance.id, item.id, 'fail');
                        }}
                        className={`p-3 rounded-lg touch-manipulation ${
                          item.status === 'fail'
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-100 hover:bg-red-100 active:bg-red-200'
                        }`}
                        style={{ minWidth: '48px', minHeight: '48px' }}
                      >
                        <XCircle className="w-6 h-6" />
                      </button>
                      
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('NA clicked for:', item.id);
                          updateItemStatus(instance.id, item.id, 'na');
                        }}
                        className={`p-3 rounded-lg touch-manipulation ${
                          item.status === 'na'
                            ? 'bg-gray-600 text-white'
                            : 'bg-gray-100 hover:bg-gray-300 active:bg-gray-400'
                        }`}
                        style={{ minWidth: '48px', minHeight: '48px' }}
                      >
                        <MinusCircle className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}