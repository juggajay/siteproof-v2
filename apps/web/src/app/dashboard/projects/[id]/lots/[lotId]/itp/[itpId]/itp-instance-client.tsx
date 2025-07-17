'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, XCircle, Minus, Save, Send, AlertCircle } from 'lucide-react';

interface ItpInstanceClientProps {
  itpInstance: any;
  userRole: string;
  projectId: string;
  lotId: string;
}

type InspectionResult = 'pass' | 'fail' | 'na';

interface FormData {
  [sectionId: string]: {
    [itemId: string]: {
      result: InspectionResult;
      notes?: string;
      [fieldId: string]: any;
    };
  };
}

export default function ItpInstanceClient({
  itpInstance,
  userRole,
  projectId,
  lotId,
}: ItpInstanceClientProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form data from existing instance data
  useEffect(() => {
    if (itpInstance.data) {
      setFormData(itpInstance.data as FormData);
    }
  }, [itpInstance]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };


  const updateItemResult = (sectionId: string, itemId: string, result: InspectionResult) => {
    setFormData(prev => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [itemId]: {
          ...prev[sectionId]?.[itemId],
          result,
        },
      },
    }));
    setHasChanges(true);
  };

  const updateItemNotes = (sectionId: string, itemId: string, notes: string) => {
    setFormData(prev => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [itemId]: {
          ...prev[sectionId]?.[itemId],
          notes,
        },
      },
    }));
    setHasChanges(true);
  };

  const updateFieldValue = (sectionId: string, itemId: string, fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [itemId]: {
          ...prev[sectionId]?.[itemId],
          [fieldId]: value,
        },
      },
    }));
    setHasChanges(true);
  };

  const saveInstance = async (submit = false) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/lots/${lotId}/itp/${itpInstance.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: formData,
          inspection_status: submit ? 'completed' : 'in_progress',
          inspection_date: submit ? new Date().toISOString() : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save ITP instance');
      }

      setHasChanges(false);
      
      if (submit) {
        router.push(`/dashboard/projects/${projectId}/lots/${lotId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const template = itpInstance.itp_templates;
  const structure = template.structure;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-4">
            <button
              onClick={() => router.push(`/dashboard/projects/${projectId}/lots/${lotId}`)}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Lot
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {template.name}
                </h1>
                <p className="text-lg text-gray-600 mt-2">
                  Lot #{itpInstance.lot?.lot_number} - {itpInstance.lot?.project?.name}
                </p>
                {template.description && (
                  <p className="text-sm text-gray-500 mt-1">
                    {template.description}
                  </p>
                )}
              </div>
              <div className="flex items-center space-x-4">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(itpInstance.inspection_status)}`}
                >
                  {itpInstance.inspection_status?.charAt(0).toUpperCase() + itpInstance.inspection_status?.slice(1) || 'Draft'}
                </span>
                <span className="text-sm text-gray-500">Role: {userRole}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-6">
          {structure.sections?.map((section: any) => (
            <div key={section.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">{section.title}</h2>
                {section.description && (
                  <p className="text-sm text-gray-600 mt-1">{section.description}</p>
                )}
              </div>
              
              <div className="p-6 space-y-6">
                {section.items?.map((item: any) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{item.title}</h3>
                        {item.description && (
                          <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                        )}
                      </div>
                      
                      {/* Pass/Fail/N/A Buttons */}
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => updateItemResult(section.id, item.id, 'pass')}
                          className={`p-2 rounded-full transition-colors ${
                            formData[section.id]?.[item.id]?.result === 'pass'
                              ? 'bg-green-100 text-green-600'
                              : 'text-gray-400 hover:bg-green-50 hover:text-green-600'
                          }`}
                          title="Pass"
                        >
                          <CheckCircle className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => updateItemResult(section.id, item.id, 'fail')}
                          className={`p-2 rounded-full transition-colors ${
                            formData[section.id]?.[item.id]?.result === 'fail'
                              ? 'bg-red-100 text-red-600'
                              : 'text-gray-400 hover:bg-red-50 hover:text-red-600'
                          }`}
                          title="Fail"
                        >
                          <XCircle className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => updateItemResult(section.id, item.id, 'na')}
                          className={`p-2 rounded-full transition-colors ${
                            formData[section.id]?.[item.id]?.result === 'na'
                              ? 'bg-gray-100 text-gray-600'
                              : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                          }`}
                          title="N/A"
                        >
                          <Minus className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    {/* Additional Fields */}
                    {item.fields?.map((field: any) => (
                      <div key={field.id} className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        
                        {field.type === 'text' && (
                          <input
                            type="text"
                            value={formData[section.id]?.[item.id]?.[field.id] || ''}
                            onChange={(e) => updateFieldValue(section.id, item.id, field.id, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder={field.placeholder}
                          />
                        )}
                        
                        {field.type === 'textarea' && (
                          <textarea
                            value={formData[section.id]?.[item.id]?.[field.id] || ''}
                            onChange={(e) => updateFieldValue(section.id, item.id, field.id, e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder={field.placeholder}
                          />
                        )}
                        
                        {field.type === 'select' && (
                          <select
                            value={formData[section.id]?.[item.id]?.[field.id] || ''}
                            onChange={(e) => updateFieldValue(section.id, item.id, field.id, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select...</option>
                            {field.options?.map((option: string) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        )}
                        
                        {field.type === 'checkbox' && (
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={formData[section.id]?.[item.id]?.[field.id] || false}
                              onChange={(e) => updateFieldValue(section.id, item.id, field.id, e.target.checked)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">{field.label}</span>
                          </div>
                        )}
                        
                        {field.type === 'date' && (
                          <input
                            type="date"
                            value={formData[section.id]?.[item.id]?.[field.id] || ''}
                            onChange={(e) => updateFieldValue(section.id, item.id, field.id, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        )}
                      </div>
                    ))}

                    {/* Notes Field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes
                      </label>
                      <textarea
                        value={formData[section.id]?.[item.id]?.notes || ''}
                        onChange={(e) => updateItemNotes(section.id, item.id, e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Add any additional notes..."
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Last updated: {formatDate(itpInstance.updated_at)}
              </span>
              {hasChanges && (
                <div className="flex items-center text-yellow-600">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  <span className="text-sm">Unsaved changes</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => saveInstance(false)}
                disabled={isSubmitting || !hasChanges}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2 inline-block" />
                    Save Draft
                  </>
                )}
              </button>
              
              <button
                onClick={() => saveInstance(true)}
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2 inline-block" />
                    Submit for Review
                  </>
                )}
              </button>
            </div>
          </div>
          
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}