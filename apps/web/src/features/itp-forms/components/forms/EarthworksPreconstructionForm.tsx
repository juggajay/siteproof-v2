'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@siteproof/design-system';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { EarthworksPreconstructionForm as FormType } from '../../types/form.types';
import { PhotoUpload } from '../PhotoUpload';
import { FileUpload } from '../FileUpload';
import { SignaturePad } from '../SignaturePad';
import { offlineStorage } from '../../utils/offline-storage';
import { syncService } from '../../utils/sync-service';

const schema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  approvedPlansAvailable: z.boolean(),
  startDateAdvised: z.date().optional(),
  erosionControlImplemented: z.boolean(),
  holdPointDate: z.date().optional(),
  comments: z.string().optional(),
  inspectorName: z.string().min(1, 'Inspector name is required'),
  inspectionStatus: z.enum(['pending', 'approved', 'rejected'])
});

interface Props {
  projects: Array<{ id: string; name: string }>;
  onSubmit: (data: FormType) => void;
  initialData?: Partial<FormType>;
}

export function EarthworksPreconstructionForm({ projects, onSubmit, initialData }: Props) {
  const [erosionControlPhoto, setErosionControlPhoto] = useState<File | string | undefined>(
    initialData?.erosionControlPhoto
  );
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [holdPointSignature, setHoldPointSignature] = useState<string | undefined>(
    initialData?.holdPointSignature
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      projectId: initialData?.projectId || '',
      approvedPlansAvailable: initialData?.approvedPlansAvailable || false,
      startDateAdvised: initialData?.startDateAdvised,
      erosionControlImplemented: initialData?.erosionControlImplemented || false,
      holdPointDate: initialData?.holdPointDate,
      comments: initialData?.comments || '',
      inspectorName: initialData?.inspectorName || '',
      inspectionStatus: initialData?.inspectionStatus || 'pending'
    }
  });

  const onFormSubmit = async (data: z.infer<typeof schema>) => {
    setIsSubmitting(true);
    try {
      const formData: FormType = {
        ...data,
        formType: 'earthworks_preconstruction',
        inspectionDate: new Date(),
        erosionControlPhoto,
        evidenceFiles,
        holdPointSignature,
        organizationId: '', // Would come from context
        createdBy: '', // Would come from auth context
      };

      // Save to offline storage first
      const localId = await offlineStorage.saveForm(formData);
      formData.localId = localId;

      // Try to sync immediately if online
      if (navigator.onLine) {
        try {
          await syncService.syncForm(formData);
        } catch (error) {
          console.error('Sync failed, will retry later:', error);
        }
      }

      onSubmit(formData);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const erosionControlImplemented = watch('erosionControlImplemented');

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* Project Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Project <span className="text-red-500">*</span>
        </label>
        <select
          {...register('projectId')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        {errors.projectId && (
          <p className="mt-1 text-sm text-red-600">{errors.projectId.message}</p>
        )}
      </div>

      {/* Approved Plans Available */}
      <div className="flex items-center">
        <input
          type="checkbox"
          {...register('approvedPlansAvailable')}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label className="ml-2 block text-sm text-gray-900">
          Approved plans available
        </label>
      </div>

      {/* Start Date Advised */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Start date advised to authorities
        </label>
        <input
          type="date"
          {...register('startDateAdvised', { valueAsDate: true })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Erosion Control */}
      <div>
        <div className="flex items-center mb-3">
          <input
            type="checkbox"
            {...register('erosionControlImplemented')}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label className="ml-2 block text-sm text-gray-900">
            Erosion and sediment control plan implemented
          </label>
        </div>
        
        {erosionControlImplemented && (
          <PhotoUpload
            label="Erosion Control Photo"
            currentPhoto={erosionControlPhoto}
            onPhotoSelect={setErosionControlPhoto}
            onRemove={() => setErosionControlPhoto(undefined)}
          />
        )}
      </div>

      {/* Hold Point */}
      <div className="border-t pt-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">
          Hold point for commencing clearing
        </h3>
        
        {!showSignaturePad && !holdPointSignature ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowSignaturePad(true)}
          >
            Add Signature
          </Button>
        ) : showSignaturePad ? (
          <SignaturePad
            onSave={(signature) => {
              setHoldPointSignature(signature);
              setShowSignaturePad(false);
              setValue('holdPointDate', new Date());
            }}
            onCancel={() => setShowSignaturePad(false)}
          />
        ) : (
          <div className="space-y-2">
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800">Signature captured</p>
              {watch('holdPointDate') && (
                <p className="text-xs text-green-600 mt-1">
                  Date: {watch('holdPointDate') ? format(watch('holdPointDate')!, 'PPP') : 'Not set'}
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setHoldPointSignature(undefined);
                setValue('holdPointDate', undefined);
              }}
            >
              Remove Signature
            </Button>
          </div>
        )}
      </div>

      {/* Comments and Evidence */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Comments/Evidence
        </label>
        <textarea
          {...register('comments')}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter any additional comments..."
        />
      </div>

      <FileUpload
        label="Evidence Files"
        currentFiles={evidenceFiles}
        onFilesSelect={setEvidenceFiles}
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
        multiple
      />

      {/* Inspector Details */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Inspector Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          {...register('inspectorName')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.inspectorName && (
          <p className="mt-1 text-sm text-red-600">{errors.inspectorName.message}</p>
        )}
      </div>

      {/* Inspection Status */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Inspection Status
        </label>
        <select
          {...register('inspectionStatus')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Inspection'
          )}
        </Button>
      </div>
    </form>
  );
}