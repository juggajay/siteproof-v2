'use client';

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { Button, Input, StateDisplay } from '@siteproof/design-system';
import type { ITPTemplate, Inspection } from '@siteproof/database';
import { db } from '../offline/db';
import { useInspectionSync } from '../hooks/useInspectionSync';
import { PhotoCapture } from './PhotoCapture';
import { SignaturePad } from './SignaturePad';
import { FieldRenderer } from './FieldRenderer';
import type { TemplateField, TemplateSection } from '@/features/templates/types/template.types';
import { RaiseNcrModal } from '@/features/ncr/components/RaiseNcrModal';
import { useQuery } from '@tanstack/react-query';

interface InspectionFormProps {
  template: ITPTemplate;
  inspection?: Inspection;
  assignmentId?: string;
  projectId: string;
  lotId?: string;
  onSave?: (data: any) => void;
  onSubmit?: (data: any) => void;
}

const inspectionSchema = z.object({
  data: z.record(z.any()),
});

type InspectionFormData = z.infer<typeof inspectionSchema>;

export function InspectionForm({
  template,
  inspection,
  assignmentId,
  projectId,
  lotId,
  onSave,
  onSubmit,
}: InspectionFormProps) {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [ncrModal, setNcrModal] = useState<{
    isOpen: boolean;
    itemRef?: string;
    itemTitle?: string;
  }>({ isOpen: false });
  const { syncInspection, isSyncing } = useInspectionSync();

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<InspectionFormData>({
    resolver: zodResolver(inspectionSchema),
    defaultValues: {
      data: inspection?.data || {},
    },
  });

  const formData = watch('data');
  const sections = template.structure as TemplateSection[];
  const currentSection = sections[currentSectionIndex];

  // Fetch project data for NCR creation
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) throw new Error('Failed to fetch project');
      return response.json();
    },
    enabled: !!projectId,
  });

  // Auto-save functionality
  useEffect(() => {
    if (!isDirty) return;

    const saveTimeout = setTimeout(async () => {
      await handleAutoSave(formData);
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(saveTimeout);
  }, [formData, isDirty]);

  const handleAutoSave = async (data: any) => {
    setIsSaving(true);
    try {
      const inspectionData = {
        assignment_id: assignmentId || null,
        template_id: template.id,
        project_id: projectId,
        lot_id: lotId || null,
        inspector_id: 'current-user-id', // TODO: Get from auth context
        data,
        status: 'draft' as const,
        completion_percentage: calculateCompletionPercentage(data),
        client_id: inspection?.client_id || `client-${Date.now()}`,
        sync_version: (inspection?.sync_version || 0) + 1,
      };

      if (inspection?.id) {
        await db.inspections.update(inspection.id, inspectionData);
      } else {
        await db.inspections.add({
          ...inspectionData,
          id: `inspection-${Date.now()}`,
          started_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      setLastSaved(new Date());
      onSave?.(data);
    } catch (error) {
      console.error('Failed to save inspection:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const calculateCompletionPercentage = (data: any): number => {
    const requiredFields: string[] = [];
    const completedFields: string[] = [];

    sections.forEach(section => {
      section.items.forEach(item => {
        item.fields.forEach(field => {
          if (field.required) {
            requiredFields.push(field.id);
            if (data[field.id] !== undefined && data[field.id] !== null && data[field.id] !== '') {
              completedFields.push(field.id);
            }
          }
        });
      });
    });

    if (requiredFields.length === 0) return 100;
    return Math.round((completedFields.length / requiredFields.length) * 100);
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setValue(`data.${fieldId}`, value, { shouldDirty: true });
  };

  const handlePhotoCapture = async (fieldId: string, blob: Blob) => {
    const photoId = await db.storePhoto(
      inspection?.id || 'temp',
      fieldId,
      blob
    );
    handleFieldChange(fieldId, { photoId, type: 'photo' });
  };

  const handleSignature = (fieldId: string, dataUrl: string) => {
    handleFieldChange(fieldId, { dataUrl, type: 'signature' });
  };

  const onSubmitForm = async (data: InspectionFormData) => {
    try {
      await handleAutoSave(data.data);
      
      // Update status to submitted
      if (inspection?.id) {
        await db.inspections.update(inspection.id, {
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        });
      }

      // Trigger sync
      await syncInspection(inspection?.id || '');
      
      onSubmit?.(data.data);
    } catch (error) {
      console.error('Failed to submit inspection:', error);
    }
  };

  const goToSection = (index: number) => {
    if (index >= 0 && index < sections.length) {
      setCurrentSectionIndex(index);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700">Progress</h3>
          <span className="text-sm text-gray-500">
            {calculateCompletionPercentage(formData)}% Complete
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <motion.div
            className="bg-blue-600 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${calculateCompletionPercentage(formData)}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Section Navigation */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {currentSection.title}
          </h2>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            Section {currentSectionIndex + 1} of {sections.length}
          </div>
        </div>
        
        {currentSection.description && (
          <p className="text-gray-600 mb-4">{currentSection.description}</p>
        )}
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit(onSubmitForm)}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSectionIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {currentSection.items.map((item, itemIndex) => (
              <div
                key={item.id}
                className="bg-white rounded-lg border border-gray-200 p-6"
              >
                <div className="mb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">
                        {item.title}
                        {item.required && (
                          <span className="ml-1 text-red-500">*</span>
                        )}
                      </h3>
                      {item.description && (
                        <p className="mt-1 text-sm text-gray-600">
                          {item.description}
                        </p>
                      )}
                    </div>
                    
                    {/* Check if any field in this item has failed */}
                    {item.fields.some(field => 
                      field.type === 'checkbox' && 
                      field.label.toLowerCase().includes('pass') &&
                      formData[field.id] === false
                    ) && (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => setNcrModal({
                          isOpen: true,
                          itemRef: item.id,
                          itemTitle: item.title
                        })}
                      >
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        Raise NCR
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {item.fields.map((field) => (
                    <div key={field.id}>
                      {field.type === 'photo' ? (
                        <PhotoCapture
                          label={field.label}
                          required={field.required}
                          value={formData[field.id]}
                          onChange={(blob) => handlePhotoCapture(field.id, blob)}
                        />
                      ) : field.type === 'signature' ? (
                        <SignaturePad
                          label={field.label}
                          required={field.required}
                          value={formData[field.id]?.dataUrl}
                          onChange={(dataUrl) => handleSignature(field.id, dataUrl)}
                        />
                      ) : (
                        <Controller
                          name={`data.${field.id}`}
                          control={control}
                          render={({ field: controllerField }) => (
                            <FieldRenderer
                              field={field}
                              value={controllerField.value}
                              onChange={controllerField.onChange}
                              error={errors.data?.[field.id]?.message}
                            />
                          )}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Navigation and Actions */}
        <div className="mt-8 flex items-center justify-between">
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => goToSection(currentSectionIndex - 1)}
              disabled={currentSectionIndex === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => goToSection(currentSectionIndex + 1)}
              disabled={currentSectionIndex === sections.length - 1}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          <div className="flex items-center gap-3">
            {/* Save Status */}
            <div className="flex items-center gap-2 text-sm">
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                  <span className="text-gray-500">Saving...</span>
                </>
              ) : lastSaved ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-gray-500">
                    Saved {lastSaved.toLocaleTimeString()}
                  </span>
                </>
              ) : null}
            </div>

            {/* Submit Button */}
            {currentSectionIndex === sections.length - 1 && (
              <Button
                type="submit"
                loading={isSyncing}
                disabled={calculateCompletionPercentage(formData) < 100}
              >
                <Send className="w-4 h-4 mr-2" />
                Submit Inspection
              </Button>
            )}
          </div>
        </div>
      </form>

      {/* Section Quick Nav */}
      <div className="mt-8 border-t pt-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Jump to Section</h4>
        <div className="flex flex-wrap gap-2">
          {sections.map((section, index) => {
            const sectionFields = section.items.flatMap(item => item.fields);
            const requiredInSection = sectionFields.filter(f => f.required);
            const completedInSection = requiredInSection.filter(
              f => formData[f.id] !== undefined && formData[f.id] !== null && formData[f.id] !== ''
            );
            const isComplete = requiredInSection.length === 0 || 
              completedInSection.length === requiredInSection.length;

            return (
              <button
                key={section.id}
                type="button"
                onClick={() => goToSection(index)}
                className={`
                  px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${currentSectionIndex === index
                    ? 'bg-blue-600 text-white'
                    : isComplete
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                {section.title}
                {isComplete && currentSectionIndex !== index && (
                  <CheckCircle className="w-3 h-3 inline-block ml-1" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* NCR Modal */}
      {project && (
        <RaiseNcrModal
          isOpen={ncrModal.isOpen}
          onClose={() => setNcrModal({ isOpen: false })}
          inspection={inspection}
          project={project}
          inspectionItemRef={ncrModal.itemRef}
          failedItemTitle={ncrModal.itemTitle}
        />
      )}
    </div>
  );
}