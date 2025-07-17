'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@siteproof/design-system';
import { Button } from '@siteproof/design-system';
import { Input } from '@siteproof/design-system';
import { Select } from '@siteproof/design-system';
import { Textarea } from '@siteproof/design-system';
import { CheckCircle2, XCircle, MinusCircle, Clock, Camera, AlertCircle, Save, Send, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

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

const EnhancedITPForm: React.FC<EnhancedITPFormProps> = ({ 
  projectId, 
  lotId, 
  itpId,
  userRole 
}) => {
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
                photos: itemData.photos || []
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
    setInspectionData(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId] || { status: 'pending', value: null, comments: '', photos: [] },
        [field]: value,
        inspected_at: new Date().toISOString(),
        inspected_by: 'current-user' // This should be the actual user ID
      }
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
        photos: data.photos
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
        item => item.status !== 'pending'
      ).length;
      const completionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
      
      const response = await fetch(`/api/projects/${projectId}/lots/${lotId}/itp/${itpId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: jsonbData,
          inspection_status: submit ? 'completed' : 'in_progress',
          inspection_date: submit ? new Date().toISOString() : null,
          completion_percentage: completionPercentage
        })
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
        successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
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
    const section = itpInstance?.itp_templates?.structure?.sections?.find((s: any) => s.id === sectionId);
    const item = section?.items?.find((i: any) => i.id === itemId);
    return item?.hold_point || false;
  };

  const isWitnessPoint = (sectionId: string, itemId: string) => {
    // Check if this item is marked as a witness point in the template
    const section = itpInstance?.itp_templates?.structure?.sections?.find((s: any) => s.id === sectionId);
    const item = section?.items?.find((i: any) => i.id === itemId);
    return item?.witness_point || false;
  };

  const renderInspectionItem = (section: any, item: any) => {
    const fullItemId = `${section.id}_${item.id}`;
    const data = inspectionData[fullItemId] || {
      status: 'pending',
      value: null,
      comments: '',
      photos: []
    };

    return (
      <div key={fullItemId} className="border rounded-lg p-4 mb-4 bg-white">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">{item.title}</h4>
            {item.description && (
              <p className="text-sm text-gray-600 mt-1">{item.description}</p>
            )}
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

          {/* Render additional fields based on item.fields */}
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
                  options={field.options?.map((option: string) => ({ value: option, label: option })) || []}
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

          {/* Comments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <Textarea
              placeholder="Add any additional notes..."
              value={data.comments || ''}
              onChange={(e) => updateInspectionItem(fullItemId, 'comments', e.target.value)}
              className="min-h-[60px]"
            />
          </div>

          {/* Photo upload placeholder */}
          <Button 
            size="sm" 
            variant="secondary" 
            onClick={() => alert('Photo upload functionality coming soon!')}
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
  const completedItems = Object.values(inspectionData).filter(
    item => item.status !== 'pending'
  ).length;
  const totalItems = structure.sections?.reduce((total: number, section: any) => {
    return total + (section.items?.length || 0);
  }, 0) || 0;
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
            
            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Progress: {completedItems} / {totalItems} items completed</span>
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
          {structure.sections?.map((section: any) => (
            <Card key={section.id}>
              <CardHeader>
                <CardTitle className="text-xl">{section.title}</CardTitle>
                {section.description && (
                  <p className="text-gray-600">{section.description}</p>
                )}
              </CardHeader>
              <CardContent>
                {section.items?.map((item: any) => renderInspectionItem(section, item))}
              </CardContent>
            </Card>
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
              
              <Button
                onClick={() => saveInspection(true)}
                disabled={saving}
                variant="primary"
              >
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