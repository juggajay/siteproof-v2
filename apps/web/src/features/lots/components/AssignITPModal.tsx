'use client';

import { useState, useEffect } from 'react';
import { X, ClipboardList, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@siteproof/design-system';

interface ITPTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;
  is_active: boolean;
}

interface AssignITPModalProps {
  isOpen: boolean;
  onClose: () => void;
  onITPAssigned: () => void;
  lotId: string;
  projectId: string;
  assignedTemplateIds?: string[];
}

export function AssignITPModal({
  isOpen,
  onClose,
  onITPAssigned,
  lotId,
  projectId,
  assignedTemplateIds = [],
}: AssignITPModalProps) {
  const [templates, setTemplates] = useState<ITPTemplate[]>([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      setSelectedTemplateIds([]);
      setError(null);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const response = await fetch('/api/itp/templates?is_active=true');
      if (response.ok) {
        const data = await response.json();
        // Filter out already assigned templates
        const availableTemplates = (data.templates || []).filter(
          (template: ITPTemplate) => !assignedTemplateIds.includes(template.id)
        );
        setTemplates(availableTemplates);
      } else {
        setError('Failed to load ITP templates');
      }
    } catch (error) {
      console.error('Error loading ITP templates:', error);
      setError('An unexpected error occurred');
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleAssign = async () => {
    if (selectedTemplateIds.length === 0) {
      setError('Please select at least one ITP template');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/itp/instances/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateIds: selectedTemplateIds,
          lotId,
          projectId,
        }),
      });

      if (response.ok) {
        onITPAssigned();
        onClose();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to assign ITP templates');
      }
    } catch (error) {
      console.error('Error assigning ITPs:', error);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTemplate = (templateId: string) => {
    setSelectedTemplateIds((prev) =>
      prev.includes(templateId) ? prev.filter((id) => id !== templateId) : [...prev, templateId]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Center modal */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full max-h-[90vh] flex flex-col">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Assign ITP Templates</h3>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
                disabled={isLoading}
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="mb-4">
              <p className="text-sm text-gray-600">Select ITP templates to assign to this lot.</p>
            </div>

            {/* Template Selection */}
            <div className="flex-1 min-h-0 overflow-hidden">
              {isLoadingTemplates ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                  <p className="text-gray-600">Loading templates...</p>
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8">
                  <ClipboardList className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-sm font-medium text-gray-900">No Available Templates</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    {assignedTemplateIds.length > 0
                      ? 'All templates are already assigned to this lot.'
                      : 'No ITP templates are available. Contact your administrator to create templates.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3 overflow-y-auto pr-2 h-full">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className={`relative rounded-lg border p-4 cursor-pointer transition-colors ${
                        selectedTemplateIds.includes(template.id)
                          ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => toggleTemplate(template.id)}
                    >
                      <div className="flex items-start">
                        <div className="flex-shrink-0 mr-3 pt-1">
                          {selectedTemplateIds.includes(template.id) ? (
                            <CheckCircle2 className="h-5 w-5 text-blue-600" />
                          ) : (
                            <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-gray-900">{template.name}</h4>
                          </div>
                          {template.description && (
                            <p className="mt-1 text-sm text-gray-500">{template.description}</p>
                          )}
                          {template.category && (
                            <div className="mt-2">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {template.category}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedTemplateIds.length > 0 && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-700">
                  {selectedTemplateIds.length} template{selectedTemplateIds.length !== 1 ? 's' : ''}{' '}
                  selected
                </p>
              </div>
            )}
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <Button
              onClick={handleAssign}
              disabled={isLoading || selectedTemplateIds.length === 0 || templates.length === 0}
              className="w-full sm:w-auto sm:ml-3"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                'Assign ITPs'
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isLoading}
              className="mt-3 w-full sm:mt-0 sm:w-auto"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
