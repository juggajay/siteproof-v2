'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@siteproof/design-system';
import { Button } from '@siteproof/design-system';
import { Input } from '@siteproof/design-system';
import { Select } from '@siteproof/design-system';
import { Textarea } from '@siteproof/design-system';
import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  Clock,
  Camera,
  AlertCircle,
  Save,
  Send,
  ArrowLeft,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface InspectionData {
  status: 'pending' | 'pass' | 'fail' | 'na';
  value: boolean | number | string | null;
  comments: string;
  inspected_by?: string;
  inspected_at?: string;
  photos: string[];
}

interface EnhancedITPFormProps {
  projectId: string;
  lotId: string;
  itpId: string;
  userRole: string;
}

const EnhancedITPForm: React.FC<EnhancedITPFormProps> = ({ projectId, lotId, itpId, userRole }) => {
  const router = useRouter();
  const [itpInstance, setItpInstance] = useState<any>(null);
  const [inspectionData, setInspectionData] = useState<Record<string, InspectionData>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const loadItpInstance = useCallback(async () => {
    try {
      setError(null);

      const response = await fetch(`/api/projects/${projectId}/lots/${lotId}/itp/${itpId}`);

      if (!response.ok) {
        throw new Error('Failed to load ITP instance');
      }

      const data = await response.json();
      setItpInstance(data.itpInstance);

      // Convert existing JSONB data to structured format
      const existingData = data.itpInstance.data || {};
      const convertedData: Record<string, InspectionData> = {};

      // Convert from current JSONB structure to inspection data format
      Object.entries(existingData).forEach(([sectionId, sectionData]: [string, any]) => {
        if (typeof sectionData === 'object' && sectionData !== null) {
          Object.entries(sectionData).forEach(([itemId, itemData]: [string, any]) => {
            if (typeof itemData === 'object' && itemData !== null) {
              convertedData[`${sectionId}_${itemId}`] = {
                status: itemData.result || 'pending',
                value: itemData.value || null,
                comments: itemData.notes || '',
                inspected_by: itemData.inspected_by || '',
                inspected_at: itemData.inspected_at || '',
                photos: itemData.photos || [],
              };
            }
          });
        }
      });

      setInspectionData(convertedData);
    } catch (error) {
      console.error('Error loading ITP instance:', error);
      setError(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [projectId, lotId, itpId]);

  useEffect(() => {
    loadItpInstance();
  }, [loadItpInstance]);

  const updateInspectionItem = (itemId: string, field: keyof InspectionData, value: any) => {
    setInspectionData((prev) => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || { status: 'pending', value: null, comments: '', photos: [] }),
        [field]: value,
        inspected_at: new Date().toISOString(),
        inspected_by: 'current-user', // This should be the actual user ID
      },
    }));
    setHasChanges(true);
  };

  const handleNumericInput = (itemId: string, value: string, field: any) => {
    const numValue = parseFloat(value);

    if (value === '' || isNaN(numValue)) {
      updateInspectionItem(itemId, 'value', null);
      return;
    }

    // Auto-validate against min/max if provided
    if (field.validation?.min !== undefined && numValue < field.validation.min) {
      updateInspectionItem(itemId, 'status', 'fail');
    } else if (field.validation?.max !== undefined && numValue > field.validation.max) {
      updateInspectionItem(itemId, 'status', 'fail');
    } else {
      updateInspectionItem(itemId, 'status', 'pass');
    }

    updateInspectionItem(itemId, 'value', numValue);
  };

  const convertToJsonbFormat = () => {
    const jsonbData: any = {};

    Object.entries(inspectionData).forEach(([fullItemId, data]) => {
      const [sectionId, itemId] = fullItemId.split('_');

      if (!jsonbData[sectionId]) {
        jsonbData[sectionId] = {};
      }

      jsonbData[sectionId][itemId] = {
        result: data.status,
        value: data.value,
        notes: data.comments,
        inspected_by: data.inspected_by,
        inspected_at: data.inspected_at,
        photos: data.photos,
      };
    });

    return jsonbData;
  };

  const saveInspection = async (submit = false) => {
    try {
      setSaving(true);
      setError(null);

      const jsonbData = convertToJsonbFormat();

      // Calculate completion percentage
      const totalItems = Object.keys(inspectionData).length;
      const completedItems = Object.values(inspectionData).filter(
        (item) => item.status !== 'pending'
      ).length;
      const completionPercentage =
        totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

      const response = await fetch(`/api/projects/${projectId}/lots/${lotId}/itp/${itpId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: jsonbData,
          inspection_status: submit ? 'completed' : 'in_progress',
          inspection_date: submit ? new Date().toISOString() : null,
          completion_percentage: completionPercentage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save inspection');
      }

      setHasChanges(false);

      if (submit) {
        router.push(`/dashboard/projects/${projectId}/lots/${lotId}`);
      } else {
        // Show success message for draft save
        const successMessage = document.createElement('div');
        successMessage.className =
          'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
        successMessage.textContent = 'Draft saved successfully!';
        document.body.appendChild(successMessage);
        setTimeout(() => {
          document.body.removeChild(successMessage);
        }, 3000);
      }
    } catch (error) {
      console.error('Error saving inspection:', error);
      setError(error instanceof Error ? error.message : 'Failed to save inspection');
    } finally {
      setSaving(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'fail':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'na':
        return <MinusCircle className="w-5 h-5 text-gray-600" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-600" />;
    }
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

  const isHoldPoint = (sectionId: string, itemId: string) => {
    // Check if this item is marked as a hold point in the template
    if (structure.hold_points?.includes(itemId)) {
      return true;
    }

    // Fallback: check in sections structure
    const section = itpInstance?.itp_templates?.structure?.sections?.find(
      (s: any) => s.id === sectionId
    );
    const item = section?.items?.find((i: any) => i.id === itemId);
    return item?.hold_point || false;
  };

  const isWitnessPoint = (sectionId: string, itemId: string) => {
    // Check if this item is marked as a witness point in the template
    if (structure.witness_points?.includes(itemId)) {
      return true;
    }

    // Fallback: check in sections structure
    const section = itpInstance?.itp_templates?.structure?.sections?.find(
      (s: any) => s.id === sectionId
    );
    const item = section?.items?.find((i: any) => i.id === itemId);
    return item?.witness_point || false;
  };

  const renderInspectionItem = (section: any, item: any) => {
    const fullItemId = `${section.id}_${item.id}`;
    const data = inspectionData[fullItemId] || {
      status: 'pending',
      value: null,
      comments: '',
      photos: [],
    };

    // Handle both simple and complex template structures
    const itemTitle = item.title || item.label || 'Inspection Item';
    const itemDescription = item.description;
    const itemRequired = item.required || false;

    return (
      <div key={fullItemId} className="border rounded-lg p-4 mb-4 bg-white">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">
              {itemTitle}
              {itemRequired && <span className="text-red-500 ml-1">*</span>}
            </h4>
            {itemDescription && <p className="text-sm text-gray-600 mt-1">{itemDescription}</p>}
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(data.status)}
            {isHoldPoint(section.id, item.id) && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">HOLD</span>
            )}
            {isWitnessPoint(section.id, item.id) && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">WITNESS</span>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {/* Status buttons */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={data.status === 'pass' ? 'primary' : 'secondary'}
              className={`transition-colors ${
                data.status === 'pass'
                  ? 'bg-green-100 text-green-600 hover:bg-green-200'
                  : 'hover:bg-green-50 hover:text-green-600'
              }`}
              onClick={() => updateInspectionItem(fullItemId, 'status', 'pass')}
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Pass
            </Button>
            <Button
              size="sm"
              variant={data.status === 'fail' ? 'danger' : 'secondary'}
              className={`transition-colors ${
                data.status === 'fail'
                  ? 'bg-red-100 text-red-600 hover:bg-red-200'
                  : 'hover:bg-red-50 hover:text-red-600'
              }`}
              onClick={() => updateInspectionItem(fullItemId, 'status', 'fail')}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Fail
            </Button>
            <Button
              size="sm"
              variant={data.status === 'na' ? 'secondary' : 'ghost'}
              className={`transition-colors ${
                data.status === 'na'
                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  : 'hover:bg-gray-50 hover:text-gray-600'
              }`}
              onClick={() => updateInspectionItem(fullItemId, 'status', 'na')}
            >
              <MinusCircle className="w-4 h-4 mr-1" />
              N/A
            </Button>
          </div>

          {/* Handle additional input based on item type */}
          {item.type === 'checkbox' && (
            <div className="space-y-1">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={data.value === true}
                  onChange={(e) => updateInspectionItem(fullItemId, 'value', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Compliant</span>
              </div>
            </div>
          )}

          {item.type === 'text' && (
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Value</label>
              <Input
                value={data.value?.toString() || ''}
                onChange={(e) => updateInspectionItem(fullItemId, 'value', e.target.value)}
                placeholder={item.placeholder || 'Enter text value'}
                className="w-full"
              />
            </div>
          )}

          {item.type === 'number' && (
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Value {item.unit && `(${item.unit})`}
              </label>
              <Input
                type="number"
                value={data.value !== null ? data.value.toString() : ''}
                onChange={(e) => handleNumericInput(fullItemId, e.target.value, item)}
                min={item.min}
                max={item.max}
                placeholder={`Enter value ${item.unit ? `(${item.unit})` : ''}`}
                className="w-48"
              />
              {item.min !== undefined && item.max !== undefined && (
                <p className="text-xs text-gray-500">
                  Range: {item.min} - {item.max} {item.unit || ''}
                </p>
              )}
            </div>
          )}

          {item.type === 'select' && item.options && (
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Select Option</label>
              <Select
                options={item.options.map((option: string) => ({ value: option, label: option }))}
                value={data.value?.toString() || ''}
                onChange={(value) => updateInspectionItem(fullItemId, 'value', value)}
                placeholder="Select..."
                className="w-64"
              />
            </div>
          )}

          {item.type === 'textarea' && (
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <Textarea
                value={data.value?.toString() || ''}
                onChange={(e) => updateInspectionItem(fullItemId, 'value', e.target.value)}
                placeholder={item.placeholder || 'Enter detailed notes'}
                rows={3}
                className="w-full"
              />
            </div>
          )}

          {item.type === 'date' && (
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <Input
                type="date"
                value={data.value?.toString() || ''}
                onChange={(e) => updateInspectionItem(fullItemId, 'value', e.target.value)}
                className="w-48"
              />
            </div>
          )}

          {/* Render additional fields if they exist (complex structure) */}
          {item.fields?.map((field: any) => (
            <div key={field.id} className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>

              {field.type === 'text' && (
                <Input
                  value={data.value?.toString() || ''}
                  onChange={(e) => updateInspectionItem(fullItemId, 'value', e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full"
                />
              )}

              {field.type === 'number' && (
                <div className="space-y-1">
                  <Input
                    type="number"
                    value={data.value !== null ? data.value.toString() : ''}
                    onChange={(e) => handleNumericInput(fullItemId, e.target.value, field)}
                    min={field.validation?.min}
                    max={field.validation?.max}
                    placeholder={`Enter value ${field.unit ? `(${field.unit})` : ''}`}
                    className="w-48"
                  />
                  {field.validation?.min !== undefined && field.validation?.max !== undefined && (
                    <p className="text-xs text-gray-500">
                      Range: {field.validation.min} - {field.validation.max} {field.unit || ''}
                    </p>
                  )}
                </div>
              )}

              {field.type === 'select' && (
                <Select
                  options={
                    field.options?.map((option: string) => ({ value: option, label: option })) || []
                  }
                  value={data.value?.toString() || ''}
                  onChange={(value) => updateInspectionItem(fullItemId, 'value', value)}
                  placeholder="Select..."
                  className="w-64"
                />
              )}

              {field.type === 'textarea' && (
                <Textarea
                  value={data.value?.toString() || ''}
                  onChange={(e) => updateInspectionItem(fullItemId, 'value', e.target.value)}
                  placeholder={field.placeholder}
                  rows={3}
                  className="w-full"
                />
              )}

              {field.type === 'date' && (
                <Input
                  type="date"
                  value={data.value?.toString() || ''}
                  onChange={(e) => updateInspectionItem(fullItemId, 'value', e.target.value)}
                  className="w-48"
                />
              )}

              {field.type === 'checkbox' && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={data.value === true}
                    onChange={(e) => updateInspectionItem(fullItemId, 'value', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">{field.label}</span>
                </div>
              )}
            </div>
          ))}

          {/* Comments section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
            <Textarea
              placeholder="Add any additional notes or observations..."
              value={data.comments || ''}
              onChange={(e) => updateInspectionItem(fullItemId, 'comments', e.target.value)}
              className="min-h-[60px]"
            />
          </div>

          {/* Photo upload placeholder */}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => toast.info('Photo upload functionality coming soon!')}
          >
            <Camera className="w-4 h-4 mr-2" />
            Add Photo
          </Button>

          {data.photos.length > 0 && (
            <p className="text-sm text-gray-600">{data.photos.length} photo(s) attached</p>
          )}
        </div>
      </div>
    );
  };

  if (loading) return <div className="flex justify-center p-8">Loading...</div>;

  if (error) {
    return (
      <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg">
        <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  if (!itpInstance) return <div>ITP instance not found</div>;

  const template = itpInstance.itp_templates;
  const structure = template.structure;

  // Debug logging
  console.log('Template:', template);
  console.log('Structure:', structure);
  console.log('Structure type:', typeof structure);
  console.log('Structure.sections:', structure?.sections);
  console.log('Structure.inspection_items:', structure?.inspection_items);

  const completedItems = Object.values(inspectionData).filter(
    (item) => item.status !== 'pending'
  ).length;

  // Support both structure formats: sections-based and inspection_items-based
  let totalItems = 0;
  let sectionsData: any[] = [];

  if (structure.sections) {
    // Original sections-based structure
    totalItems = structure.sections.reduce((total: number, section: any) => {
      return total + (section.items?.length || 0);
    }, 0);
    sectionsData = structure.sections;
  } else if (structure.inspection_items) {
    // New inspection_items-based structure - group by category
    const categories = structure.categories || [];
    totalItems = structure.inspection_items.length;

    // Create sections from categories
    sectionsData = categories
      .map((category: string) => {
        const categoryItems = structure.inspection_items
          .filter((item: any) => item.category === category)
          .sort((a: any, b: any) => a.order - b.order);

        return {
          id: category,
          title: category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' '),
          description: `${category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ')} inspection items`,
          items: categoryItems.map((item: any) => ({
            id: item.id,
            title: item.description,
            description: item.description,
            type:
              item.type === 'boolean' ? 'checkbox' : item.type === 'numeric' ? 'number' : item.type,
            required: item.required,
            min: item.min,
            max: item.max,
            unit: item.unit,
            hold_point: structure.hold_points?.includes(item.id),
            witness_point: structure.witness_points?.includes(item.id),
          })),
        };
      })
      .filter((section: any) => section.items.length > 0);
  }
  const completionPercentage = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

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
                <h1 className="text-3xl font-bold text-gray-900">{template.name}</h1>
                <p className="text-lg text-gray-600 mt-2">
                  Lot #{itpInstance.lot?.lot_number} - {itpInstance.lot?.project?.name}
                </p>
                {template.description && (
                  <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                )}
              </div>
              <div className="flex items-center space-x-4">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(itpInstance.inspection_status)}`}
                >
                  {itpInstance.inspection_status?.charAt(0).toUpperCase() +
                    itpInstance.inspection_status?.slice(1) || 'Draft'}
                </span>
                <span className="text-sm text-gray-500">Role: {userRole}</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>
                  Progress: {completedItems} / {totalItems} items completed
                </span>
                <span>{Math.round(completionPercentage)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-6">
          {sectionsData.length > 0 ? (
            sectionsData.map((section: any) => (
              <Card key={section.id}>
                <CardHeader>
                  <CardTitle className="text-xl">{section.title}</CardTitle>
                  {section.description && <p className="text-gray-600">{section.description}</p>}
                </CardHeader>
                <CardContent>
                  {section.items?.map((item: any) => renderInspectionItem(section, item))}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="space-y-4">
                  <AlertCircle className="h-12 w-12 mx-auto text-yellow-500" />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">No Inspection Items Found</h3>
                    <p className="text-gray-600 mt-1">
                      This ITP template appears to be empty or has an invalid structure.
                    </p>
                    <details className="mt-4 text-left">
                      <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-700">
                        Debug Information (Click to expand)
                      </summary>
                      <pre className="mt-2 text-xs bg-gray-100 p-4 rounded overflow-auto">
                        {JSON.stringify({ template, structure, sectionsData, totalItems }, null, 2)}
                      </pre>
                    </details>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
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
              <Button
                onClick={() => saveInspection(false)}
                disabled={saving || !hasChanges}
                variant="secondary"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Draft
                  </>
                )}
              </Button>

              <Button onClick={() => saveInspection(true)} disabled={saving} variant="primary">
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit for Review
                  </>
                )}
              </Button>
            </div>
          </div>

          {error && (
            <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg mt-4">
              <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
              <p className="text-red-800">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedITPForm;
