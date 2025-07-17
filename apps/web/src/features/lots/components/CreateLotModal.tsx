'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Upload, FileText, Loader2, ClipboardList, CheckCircle2 } from 'lucide-react';
import { Button, Input, Textarea } from '@siteproof/design-system';
import {
  validateFileSize,
  validateFileType,
  generateUniqueFileName,
} from '@/lib/file-upload/validation';
import { createClient } from '@/lib/supabase/client';

const createLotSchema = z.object({
  name: z.string().min(1, 'Lot name is required').max(100),
  description: z.string().optional(),
  selectedItpTemplates: z.array(z.string()).optional().default([]),
});

type CreateLotData = z.infer<typeof createLotSchema>;

interface CreateLotModalProps {
  projectId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ITPTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;
  is_active: boolean;
}

export function CreateLotModal({ projectId, onClose, onSuccess }: CreateLotModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [itpTemplates, setItpTemplates] = useState<ITPTemplate[]>([]);
  const [selectedItpTemplates, setSelectedItpTemplates] = useState<string[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<CreateLotData>({
    resolver: zodResolver(createLotSchema),
  });

  // Load ITP templates on component mount
  useEffect(() => {
    loadItpTemplates();
  }, []);

  // Update form value when selected templates change
  useEffect(() => {
    setValue('selectedItpTemplates', selectedItpTemplates);
  }, [selectedItpTemplates, setValue]);

  const loadItpTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const response = await fetch('/api/itp/templates?is_active=true');
      if (response.ok) {
        const data = await response.json();
        setItpTemplates(data.templates || []);
      } else {
        console.error('Failed to load ITP templates');
      }
    } catch (error) {
      console.error('Error loading ITP templates:', error);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const toggleItpTemplate = (templateId: string) => {
    setSelectedItpTemplates((prev) =>
      prev.includes(templateId) ? prev.filter((id) => id !== templateId) : [...prev, templateId]
    );
  };

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
      console.log('[CreateLotModal] Selected ITP templates:', selectedItpTemplates);
      console.log('[CreateLotModal] Files to upload:', files.length);

      // Create the lot first
      const response = await fetch(`/api/projects/${projectId}/lots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          status: 'pending',
          selectedItpTemplates: selectedItpTemplates,
          files: [], // Empty initially
        }),
      });

      console.log('[CreateLotModal] Response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error('[CreateLotModal] Error response:', error);
        throw new Error(error.message || 'Failed to create lot');
      }

      const responseData = await response.json();
      console.log('[CreateLotModal] Lot created:', responseData);
      const { lot } = responseData;

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

      // Wait a moment to ensure database operations complete
      await new Promise(resolve => setTimeout(resolve, 500));

      router.refresh();
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
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

            {/* ITP Template Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ITP Templates (Optional)
              </label>
              <p className="text-sm text-gray-500 mb-3">
                Select inspection templates to assign to this lot. You can also assign them later.
              </p>

              {isLoadingTemplates ? (
                <div className="flex items-center justify-center p-4 border border-gray-300 rounded-md">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span className="text-sm text-gray-600">Loading templates...</span>
                </div>
              ) : itpTemplates.length === 0 ? (
                <div className="text-center p-4 border border-gray-300 rounded-md">
                  <ClipboardList className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">No ITP templates available</p>
                </div>
              ) : (
                <div
                  className="space-y-2 border border-gray-300 rounded-md p-3"
                  style={{ maxHeight: '192px', overflowY: 'scroll' }}
                >
                  {itpTemplates.map((template) => (
                    <div
                      key={template.id}
                      className={`flex items-start p-3 rounded-md border cursor-pointer transition-colors ${
                        selectedItpTemplates.includes(template.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => toggleItpTemplate(template.id)}
                    >
                      <div className="flex-shrink-0 mr-3 pt-1">
                        {selectedItpTemplates.includes(template.id) ? (
                          <CheckCircle2 className="h-5 w-5 text-blue-600" />
                        ) : (
                          <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">{template.name}</h4>
                        {template.description && (
                          <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                        )}
                        {template.category && (
                          <span className="inline-block mt-1 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                            {template.category}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedItpTemplates.length > 0 && (
                <p className="mt-2 text-sm text-green-600">
                  {selectedItpTemplates.length} template
                  {selectedItpTemplates.length !== 1 ? 's' : ''} selected
                </p>
              )}
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
