'use client';

import React, { useState, useEffect } from 'react';
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
  inspection_status: string;
  completion_percentage?: number;
  template_id: string;
}

export function MobileItpManager({ projectId, lotId }: MobileItpManagerProps) {
  const [itpInstances, setItpInstances] = useState<ITPInstance[]>([]);
  const [availableTemplates, setAvailableTemplates] = useState<ITPTemplate[]>([]);
  const [showTemplateSelection, setShowTemplateSelection] = useState(false);
  const [loading, setLoading] = useState(true);
  const [assigningTemplate, setAssigningTemplate] = useState(false);

  useEffect(() => {
    loadItpInstances();
    loadAvailableTemplates();
  }, [projectId, lotId]);

  const loadItpInstances = async () => {
    try {
      // This would be the actual API call to get ITP instances for the lot
      // For now, using mock data
      const mockInstances: ITPInstance[] = [
        {
          id: '1',
          name: 'Asphalt Seal',
          description: 'Inspection checklist for asphalt sealing works',
          inspection_status: 'in_progress',
          completion_percentage: 40,
          template_id: 'template-1',
        },
      ];
      setItpInstances(mockInstances);
    } catch (error) {
      console.error('Error loading ITP instances:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const assignTemplate = async (templateId: string) => {
    setAssigningTemplate(true);
    try {
      const response = await fetch('/api/itp/instances/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: templateId,
          project_id: projectId,
          lot_id: lotId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setItpInstances((prev) => [...prev, data.instance]);
        setShowTemplateSelection(false);
      } else {
        throw new Error('Failed to assign template');
      }
    } catch (error) {
      console.error('Error assigning template:', error);
      alert('Failed to assign ITP template. Please try again.');
    } finally {
      setAssigningTemplate(false);
    }
  };

  const handleStatusChange = async (itemId: string, status: 'pass' | 'fail' | 'na') => {
    console.log(`Item ${itemId} status changed to ${status}`);
    // TODO: Implement API call to update item status
  };

  const handleAddComment = async (itemId: string, comment: string) => {
    console.log(`Comment added to item ${itemId}:`, comment);
    // TODO: Implement API call to add comment
  };

  const handleAddPhoto = async (itemId: string) => {
    console.log(`Photo upload requested for item ${itemId}`);
    // TODO: Implement photo upload functionality
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
