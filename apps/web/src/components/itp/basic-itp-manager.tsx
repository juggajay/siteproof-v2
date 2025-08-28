'use client';

import React, { useState, useEffect } from 'react';

interface BasicItpManagerProps {
  projectId: string;
  lotId: string;
}

export function BasicItpManager({ projectId, lotId }: BasicItpManagerProps) {
  const [instances, setInstances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string>('');

  // Simple load function
  useEffect(() => {
    fetch(`/api/projects/${projectId}/lots/${lotId}/itp`)
      .then(res => res.json())
      .then(data => {
        const items = data.instances || [];
        setInstances(items);
        if (items.length > 0) {
          setExpandedId(items[0].id);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading ITPs:', err);
        setLoading(false);
      });
  }, [projectId, lotId]);

  // Simple update function
  const updateItem = async (instanceId: string, sectionId: string, itemId: string, status: string) => {
    console.log('Updating:', { instanceId, sectionId, itemId, status });
    
    // Update local state
    const newInstances = instances.map(inst => {
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
      const instance = instances.find(i => i.id === instanceId);
      const updatedData = { ...(instance?.data || {}) };
      if (!updatedData[sectionId]) updatedData[sectionId] = {};
      updatedData[sectionId][itemId] = { result: status };

      await fetch(`/api/projects/${projectId}/lots/${lotId}/itp/${instanceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: updatedData,
          inspection_status: 'in_progress'
        })
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

  return (
    <div className="p-4 space-y-4">
      {instances.map(instance => {
        const isOpen = expandedId === instance.id;
        const structure = instance.itp_templates?.structure;
        
        return (
          <div key={instance.id} className="border rounded-lg bg-white">
            <div 
              className="p-4 font-semibold cursor-pointer bg-gray-50"
              onClick={() => setExpandedId(isOpen ? '' : instance.id)}
            >
              {instance.itp_templates?.name || instance.name || 'ITP'}
              <span className="ml-2 text-sm text-gray-500">
                (Tap to {isOpen ? 'close' : 'open'})
              </span>
            </div>
            
            {isOpen && structure?.sections && (
              <div className="p-4 space-y-4">
                {structure.sections.map((section: any) => (
                  <div key={section.id}>
                    <h4 className="font-medium mb-2">{section.title}</h4>
                    <div className="space-y-2">
                      {section.items?.map((item: any) => {
                        const currentStatus = instance.data?.[section.id]?.[item.id]?.result;
                        
                        return (
                          <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="text-sm">{item.title || item.description}</span>
                            <div className="flex gap-2">
                              <button
                                className={`px-3 py-1 rounded ${
                                  currentStatus === 'pass' ? 'bg-green-600 text-white' : 'bg-gray-200'
                                }`}
                                onClick={() => updateItem(instance.id, section.id, item.id, 'pass')}
                              >
                                ✓
                              </button>
                              <button
                                className={`px-3 py-1 rounded ${
                                  currentStatus === 'fail' ? 'bg-red-600 text-white' : 'bg-gray-200'
                                }`}
                                onClick={() => updateItem(instance.id, section.id, item.id, 'fail')}
                              >
                                ✗
                              </button>
                              <button
                                className={`px-3 py-1 rounded ${
                                  currentStatus === 'na' ? 'bg-gray-600 text-white' : 'bg-gray-200'
                                }`}
                                onClick={() => updateItem(instance.id, section.id, item.id, 'na')}
                              >
                                NA
                              </button>
                            </div>
                          </div>
                        );
                      })}
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