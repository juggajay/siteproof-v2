'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, ClipboardList } from 'lucide-react';
import { MobileItpCard } from './mobile-itp-card';

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
  data?: any; // JSONB data from database
}

export function MobileItpManager({ projectId, lotId }: MobileItpManagerProps) {
  const [itpInstances, setItpInstances] = useState<ITPInstance[]>([]);
  const [availableTemplates, setAvailableTemplates] = useState<ITPTemplate[]>([]);
  const [showTemplateSelection, setShowTemplateSelection] = useState(false);
  const [loading, setLoading] = useState(true);
  const [assigningTemplate, setAssigningTemplate] = useState(false);

  const loadItpInstances = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/lots/${lotId}/itp`);
      if (response.ok) {
        const data = await response.json();

        // DEBUG: Log the raw response
        console.log('🔍 Raw API Response:', data);

        // Transform the API response to match our interface
        const instances: ITPInstance[] = (data.instances || []).map((instance: any) => {
          // DEBUG: Log each instance structure
          console.log('📋 Processing instance:', {
            id: instance.id,
            hasTemplate: !!instance.itp_templates,
            templateStructure: instance.itp_templates?.structure,
            hasData: !!instance.data,
            currentData: instance.data,
          });

          return {
            id: instance.id,
            name: instance.name || instance.itp_templates?.name || 'Unknown Template',
            description: instance.itp_templates?.description,
            status: instance.inspection_status || 'draft',
            completion_percentage:
              instance.completion_percentage || instance.data?.completion_percentage || 0,
            template_id: instance.template_id,
            data: instance.data, // Include the raw JSONB data for ITP items
            // ADD: Pass the full instance for debugging
            _raw: instance,
          };
        });
        setItpInstances(instances);
      } else {
        console.error('Failed to load ITP instances:', response.status);
        setItpInstances([]);
      }
    } catch (error) {
      console.error('Error loading ITP instances:', error);
      setItpInstances([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, lotId]);

  const loadAvailableTemplates = async () => {
    try {
      const response = await fetch('/api/itp/templates?is_active=true');
      if (response.ok) {
        const data = await response.json();
        setAvailableTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  useEffect(() => {
    loadItpInstances();
    loadAvailableTemplates();
  }, [loadItpInstances]);

  const assignTemplate = async (templateId: string) => {
    setAssigningTemplate(true);
    try {
      const response = await fetch('/api/itp/instances/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateIds: [templateId], // Fix: API expects array of template IDs
          projectId: projectId,
          lotId: lotId,
        }),
      });

      if (response.ok) {
        // Reload instances to get the updated list
        await loadItpInstances();
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
  };

  const handleStatusChange = async (
    sectionId: string,
    itemId: string,
    status: 'pass' | 'fail' | 'na'
  ) => {
    console.log('🎯 handleStatusChange called:', { sectionId, itemId, status });

    // Find the ITP instance
    let targetInstance = null;
    let foundIn = '';

    // Check each instance
    for (const instance of itpInstances) {
      console.log(`🔍 Checking instance ${instance.id}`);

      // Access the raw instance data
      const raw = (instance as any)._raw;
      if (!raw) {
        console.log('❌ No raw data for instance');
        continue;
      }

      // Check if this instance has the template structure
      if (raw.itp_templates?.structure?.sections) {
        const sections = raw.itp_templates.structure.sections;
        console.log(`📑 Instance has ${sections.length} sections`);

        // Look for the section
        const section = sections.find((s: any) => s.id === sectionId);
        if (section) {
          console.log(`✅ Found section ${sectionId} in instance ${instance.id}`);
          const item = section.items?.find((i: any) => i.id === itemId);
          if (item) {
            console.log(`✅ Found item ${itemId} in section`);
            targetInstance = instance;
            foundIn = 'template_structure';
            break;
          }
        }
      }
    }

    if (!targetInstance) {
      console.error('❌ Could not find instance for section/item:', { sectionId, itemId });
      console.log('Available instances:', itpInstances);
      return;
    }

    console.log(`🎯 Updating instance ${targetInstance.id} via ${foundIn}`);

    // Get the raw instance for the API call
    const raw = (targetInstance as any)._raw;

    // Build the update data matching desktop structure
    const currentData = raw.data || {};
    const updatedData = {
      ...currentData,
      [sectionId]: {
        ...currentData[sectionId],
        [itemId]: {
          ...currentData[sectionId]?.[itemId],
          result: status,
          updated_at: new Date().toISOString(),
        },
      },
    };

    console.log('📤 Sending update:', {
      instanceId: targetInstance.id,
      data: updatedData,
    });

    try {
      const response = await fetch(
        `/api/projects/${projectId}/lots/${lotId}/itp/${targetInstance.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: updatedData,
            inspection_status: 'in_progress',
          }),
        }
      );

      console.log('📥 API Response:', {
        status: response.status,
        ok: response.ok,
      });

      if (response.ok) {
        console.log('✅ Update successful');
        await loadItpInstances();
      } else {
        const error = await response.text();
        console.error('❌ API Error:', error);
      }
    } catch (error) {
      console.error('❌ Network error:', error);
    }
  };

  const handleAddComment = async (itemId: string, comment: string) => {
    console.log(`Comment added to item ${itemId}:`, comment);
    // TODO: Implement API call to add comment
  };

  const handleAddPhoto = async (itemId: string) => {
    console.log(`Photo upload requested for item ${itemId}`);
    // TODO: Implement photo upload functionality
  };

  const handleDeleteItp = async (itpId: string) => {
    console.log(`🗑️ Deleting ITP: ${itpId}`);

    try {
      const response = await fetch(`/api/projects/${projectId}/lots/${lotId}/itp/${itpId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        console.log(`✅ ITP ${itpId} deleted successfully`);
        // Reload the instances to get updated list
        await loadItpInstances();
      } else {
        console.error('Failed to delete ITP:', response.status);
        alert('Failed to delete ITP. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting ITP:', error);
      alert('Failed to delete ITP. Please try again.');
    }
  };

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
        <h2 className="text-xl font-semibold text-gray-900">ITP Inspections</h2>
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
            <MobileItpCard
              key={itp.id}
              itp={itp}
              onStatusChange={handleStatusChange}
              onAddComment={handleAddComment}
              onAddPhoto={handleAddPhoto}
              onDeleteItp={handleDeleteItp}
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
      {showTemplateSelection && (
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
      )}
    </div>
  );
}
