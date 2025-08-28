'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CheckCircle, XCircle, MinusCircle, Save } from 'lucide-react';

interface ForemanItpManagerProps {
  projectId: string;
  lotId: string;
}

interface ITPInstance {
  id: string;
  name: string;
  template_id: string;
  data: any;
  completion_percentage?: number;
  inspection_status?: string;
  status?: string;
  itp_templates?: {
    name: string;
    structure: any;
  };
}

interface PendingUpdate {
  instanceId: string;
  itemId: string;
  status: 'pass' | 'fail' | 'na';
  notes?: string;
}

export function ForemanItpManager({ projectId, lotId }: ForemanItpManagerProps) {
  const [instances, setInstances] = useState<ITPInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
  const [pendingUpdates, setPendingUpdates] = useState<PendingUpdate[]>([]);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Fetch ITP instances
  const fetchInstances = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/lots/${lotId}/itp`);
      if (response.ok) {
        const data = await response.json();
        setInstances(data.instances || []);
      }
    } catch (error) {
      console.error('Failed to fetch ITP instances:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId, lotId]);

  useEffect(() => {
    fetchInstances();
  }, [fetchInstances]);

  // Batch save updates
  const saveUpdates = useCallback(async () => {
    if (pendingUpdates.length === 0) return;

    setSaving(true);
    const groupedUpdates: Record<string, PendingUpdate[]> = {};
    
    // Group updates by instance
    pendingUpdates.forEach(update => {
      if (!groupedUpdates[update.instanceId]) {
        groupedUpdates[update.instanceId] = [];
      }
      groupedUpdates[update.instanceId].push(update);
    });

    // Prepare batch update
    const batchUpdates = Object.entries(groupedUpdates).map(([instanceId, updates]) => ({
      instanceId,
      updates: updates.map(u => ({
        itemId: u.itemId,
        status: u.status,
        notes: u.notes
      }))
    }));

    try {
      const response = await fetch('/api/itp/batch-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: batchUpdates })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Batch update successful:', result);
        setPendingUpdates([]);
        await fetchInstances(); // Refresh data
      } else {
        console.error('Batch update failed');
      }
    } catch (error) {
      console.error('Error saving updates:', error);
    } finally {
      setSaving(false);
    }
  }, [pendingUpdates, fetchInstances]);

  // Auto-save after 1 second of inactivity
  useEffect(() => {
    if (pendingUpdates.length > 0) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveUpdates();
      }, 1000);
    }
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [pendingUpdates, saveUpdates]);

  // Handle status change
  const handleStatusChange = (instanceId: string, itemId: string, status: 'pass' | 'fail' | 'na') => {
    // Update local state immediately for instant feedback
    setInstances(prev => prev.map(instance => {
      if (instance.id === instanceId) {
        const newData = { ...instance.data };
        const [sectionId, itemKey] = itemId.includes('-') ? itemId.split('-') : ['items', itemId];
        
        if (!newData[sectionId]) newData[sectionId] = {};
        newData[sectionId][itemKey] = { result: status, updated_at: new Date().toISOString() };
        
        // Calculate new completion percentage
        let total = 0, completed = 0;
        Object.values(newData).forEach((section: any) => {
          Object.values(section).forEach((item: any) => {
            total++;
            if (item.result) completed++;
          });
        });
        
        return {
          ...instance,
          data: newData,
          completion_percentage: Math.round((completed / total) * 100)
        };
      }
      return instance;
    }));

    // Add to pending updates
    setPendingUpdates(prev => [
      ...prev.filter(u => !(u.instanceId === instanceId && u.itemId === itemId)),
      { instanceId, itemId, status }
    ]);
  };

  // Mark all as pass
  const markAllAsPass = (instanceId: string) => {
    const instance = instances.find(i => i.id === instanceId);
    if (!instance) return;

    const updates: PendingUpdate[] = [];
    const structure = instance.itp_templates?.structure;
    
    if (structure?.sections) {
      structure.sections.forEach((section: any) => {
        section.items?.forEach((item: any) => {
          const itemId = `${section.id}-${item.id}`;
          updates.push({ instanceId, itemId, status: 'pass' });
        });
      });
    }

    setPendingUpdates(prev => [...prev, ...updates]);
  };

  // Get items from template structure
  const getItems = (instance: ITPInstance) => {
    const items: any[] = [];
    const structure = instance.itp_templates?.structure;
    
    if (structure?.sections) {
      structure.sections.forEach((section: any) => {
        section.items?.forEach((item: any) => {
          items.push({
            id: `${section.id}-${item.id}`,
            sectionName: section.title,
            name: item.title || item.description,
            status: instance.data?.[section.id]?.[item.id]?.result
          });
        });
      });
    }
    
    return items;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Header with save indicator */}
      <div className="sticky top-0 bg-white z-10 pb-4 border-b">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">ITP Inspections</h1>
          {saving && (
            <div className="flex items-center text-blue-600">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
              Saving...
            </div>
          )}
          {pendingUpdates.length > 0 && !saving && (
            <button
              onClick={saveUpdates}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center"
            >
              <Save className="w-5 h-5 mr-2" />
              Save ({pendingUpdates.length})
            </button>
          )}
        </div>
      </div>

      {/* ITP Instances */}
      <div className="space-y-6 mt-6">
        {instances.map(instance => {
          const items = getItems(instance);
          const isExpanded = selectedInstance === instance.id;
          
          return (
            <div key={instance.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              {/* Instance Header */}
              <div 
                className="p-4 bg-gray-50 cursor-pointer"
                onClick={() => setSelectedInstance(isExpanded ? null : instance.id)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold">{instance.itp_templates?.name || 'Unknown ITP'}</h3>
                    <div className="flex items-center mt-2">
                      {/* Progress Bar */}
                      <div className="flex-1 bg-gray-200 rounded-full h-3 mr-4">
                        <div 
                          className="bg-blue-600 h-3 rounded-full transition-all"
                          style={{ width: `${instance.completion_percentage || 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{instance.completion_percentage || 0}%</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      markAllAsPass(instance.id);
                    }}
                    className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm"
                  >
                    All Pass
                  </button>
                </div>
              </div>

              {/* Items List */}
              {isExpanded && (
                <div className="divide-y">
                  {items.map(item => (
                    <div key={item.id} className="p-4 flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-500">{item.sectionName}</p>
                      </div>
                      
                      {/* Status Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStatusChange(instance.id, item.id, 'pass')}
                          className={`p-3 rounded-lg transition-all ${
                            item.status === 'pass' 
                              ? 'bg-green-600 text-white' 
                              : 'bg-gray-100 text-gray-600 hover:bg-green-100'
                          }`}
                        >
                          <CheckCircle className="w-6 h-6" />
                        </button>
                        <button
                          onClick={() => handleStatusChange(instance.id, item.id, 'fail')}
                          className={`p-3 rounded-lg transition-all ${
                            item.status === 'fail' 
                              ? 'bg-red-600 text-white' 
                              : 'bg-gray-100 text-gray-600 hover:bg-red-100'
                          }`}
                        >
                          <XCircle className="w-6 h-6" />
                        </button>
                        <button
                          onClick={() => handleStatusChange(instance.id, item.id, 'na')}
                          className={`p-3 rounded-lg transition-all ${
                            item.status === 'na' 
                              ? 'bg-gray-600 text-white' 
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-300'
                          }`}
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
    </div>
  );
}