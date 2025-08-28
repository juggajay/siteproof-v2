'use client';

import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Upload, FileText, Loader2 } from 'lucide-react';
import { Button, Input, Textarea } from '@siteproof/design-system';
import { toast } from 'sonner';
import {
  validateFileSize,
  validateFileType,
  generateUniqueFileName,
} from '@/lib/file-upload/validation';
import { createClient } from '@/lib/supabase/client';

const createLotSchema = z.object({
  name: z.string().min(1, 'Lot name is required').max(100),
  description: z.string().optional(),
});

type CreateLotData = z.infer<typeof createLotSchema>;

interface CreateLotModalProps {
  projectId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateLotModal({ projectId, onClose, onSuccess }: CreateLotModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateLotData>({
    resolver: zodResolver(createLotSchema),
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles) return;

    const validFiles: File[] = [];
    const fileErrors: string[] = [];

    Array.from(selectedFiles).forEach((file) => {
      const typeError = validateFileType(file);
      if (typeError) {
        fileErrors.push(`${file.name}: ${typeError}`);
        return;
      }

      const sizeError = validateFileSize(file);
      if (sizeError) {
        fileErrors.push(`${file.name}: ${sizeError}`);
        return;
      }

      validFiles.push(file);
    });

    if (fileErrors.length > 0) {
      setError(fileErrors.join('\n'));
    } else {
      setError(null);
    }

    setFiles([...files, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const uploadFiles = async (lotId: string) => {
    if (files.length === 0) return [];

    const supabase = createClient();
    const uploadedFiles = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = generateUniqueFileName(file.name);
      const filePath = `projects/${projectId}/lots/${lotId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('project-attachments')
        .upload(filePath, file);

      if (uploadError) {
        console.error('File upload error:', uploadError);
        throw new Error(`Failed to upload ${file.name}`);
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('project-attachments').getPublicUrl(filePath);

      uploadedFiles.push({
        url: publicUrl,
        name: file.name,
        size: file.size,
        type: file.type,
      });

      setUploadProgress(((i + 1) / files.length) * 100);
    }

    return uploadedFiles;
  };

  const onSubmit = async (data: CreateLotData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      console.log('[CreateLotModal] Creating lot for project:', projectId);
      console.log('[CreateLotModal] Lot data:', data);
      console.log('[CreateLotModal] Files to upload:', files.length);

      // Create the lot first
      const response = await fetch(`/api/projects/${projectId}/lots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          status: 'pending',
          files: [], // Empty initially
        }),
      });

      console.log('[CreateLotModal] Response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error('[CreateLotModal] Error response:', error);
        throw new Error(error.message || 'Failed to create lot');
      }

      const result = await response.json();
      console.log('[CreateLotModal] Lot creation result:', result);
      
      // Handle partial ITP assignment success
      if (result.partialSuccess) {
        const { itpAssignmentResults } = result;
        const failedCount = itpAssignmentResults.failed.length;
        const successCount = itpAssignmentResults.success.length;
        
        toast.warning(
          `Lot created successfully. ${successCount} ITP(s) assigned, ${failedCount} failed. ` +
          `You can assign the failed templates manually.`
        );
      } else if (result.lot) {
        toast.success('Lot created successfully!');
      }
      
      const { lot } = result;

      // Upload files if any, using the actual lot ID
      if (files.length > 0) {
        const uploadedFiles = await uploadFiles(lot.id);
        console.log('[CreateLotModal] Files uploaded:', uploadedFiles.length);

        // Update lot with file attachments
        const updateResponse = await fetch(`/api/projects/${projectId}/lots/${lot.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            files: uploadedFiles,
          }),
        });

        if (!updateResponse.ok) {
          console.error('Failed to update lot with files');
        } else {
          console.log('[CreateLotModal] Lot updated with files');
        }
      }

      // Trigger success callback and close modal
      onSuccess?.();
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-lg bg-white rounded-lg shadow-xl">
        <div className="flex items-center justify-between border-b p-6">
          <h2 className="text-xl font-semibold">Create New Lot</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
            disabled={isSubmitting}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          <div className="space-y-4">
            <div>
              <Input
                label="Lot Name"
                {...register('name')}
                error={errors.name?.message}
                placeholder="Enter lot name"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Textarea
                label="Description (Optional)"
                {...register('description')}
                error={!!errors.description}
                helperText={errors.description?.message}
                placeholder="Enter lot description"
                rows={3}
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attachments (Optional)
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                    >
                      <span>Upload files</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        multiple
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
                        onChange={handleFileChange}
                        disabled={isSubmitting}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">PDF, DOC, DOCX, images up to 25MB</p>
                </div>
              </div>
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">{file.name}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-red-600 hover:text-red-700"
                      disabled={isSubmitting}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800 whitespace-pre-line">{error}</p>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Lot'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
