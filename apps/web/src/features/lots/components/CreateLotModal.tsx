'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Upload, FileText, Loader2, CheckCircle2 } from 'lucide-react';
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

interface ITPTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;
  is_active?: boolean;
}

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
  const [templates, setTemplates] = useState<ITPTemplate[]>([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateLotData>({
    resolver: zodResolver(createLotSchema),
  });

  useEffect(() => {
    void loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setIsLoadingTemplates(true);
    setTemplatesError(null);

    try {
      const response = await fetch('/api/itp/templates?is_active=true');
      if (!response.ok) {
        throw new Error('Failed to load ITP templates');
      }

      const data = await response.json();
      const availableTemplates: ITPTemplate[] = data.templates || [];
      setTemplates(availableTemplates);
    } catch (loadError) {
      console.error('[CreateLotModal] Failed to load templates:', loadError);
      setTemplatesError('Unable to load ITP templates right now. You can still create the lot.');
      setTemplates([]);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const toggleTemplateSelection = (templateId: string) => {
    setSelectedTemplateIds((prev) =>
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

    setFiles((prev) => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
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
      console.log('[CreateLotModal] Selected templates:', selectedTemplateIds);

      const response = await fetch(`/api/projects/${projectId}/lots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          status: 'pending',
          files: [],
          selectedItpTemplates: selectedTemplateIds,
        }),
      });

      console.log('[CreateLotModal] Response status:', response.status);

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        console.error('[CreateLotModal] Error response:', errorPayload);
        throw new Error(errorPayload.message || errorPayload.error || 'Failed to create lot');
      }

      const result = await response.json();
      console.log('[CreateLotModal] Lot creation result:', result);

      const { lot, itpAssignmentResults, partialSuccess } = result;

      if (partialSuccess && itpAssignmentResults) {
        const { success = [], failed = [] } = itpAssignmentResults;
        const successCount = success.length;
        const failedCount = failed.length;
        toast.warning(
          `Lot created. ${successCount} ITP template${successCount === 1 ? '' : 's'} assigned, ${failedCount} failed. You can retry from the lot screen.`
        );
      } else {
        toast.success('Lot created successfully!');
      }

      if (!lot?.id) {
        throw new Error('Lot was created but response did not include the lot record.');
      }

      if (files.length > 0) {
        const uploadedFiles = await uploadFiles(lot.id);
        console.log('[CreateLotModal] Files uploaded:', uploadedFiles.length);

        const updateResponse = await fetch(`/api/projects/${projectId}/lots/${lot.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: uploadedFiles }),
        });

        if (!updateResponse.ok) {
          const updatePayload = await updateResponse.json().catch(() => ({}));
          console.error('[CreateLotModal] Failed to persist file metadata:', updatePayload);
          toast.error('Lot created but file metadata could not be saved.');
        } else {
          console.log('[CreateLotModal] Lot updated with files');
        }
      }

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
      <div className="w-full max-w-3xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold">Create New Lot</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
            disabled={isSubmitting}
            aria-label="Close create lot modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-6">
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
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Assign ITP Templates (Optional)
              </label>

              {isLoadingTemplates ? (
                <div className="flex items-center justify-center rounded-md border border-dashed border-gray-300 py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-sm text-gray-600">Loading templates�</span>
                </div>
              ) : templates.length === 0 ? (
                <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                  <p className="font-medium">No templates available</p>
                  <p className="mt-1">
                    You can create the lot now and assign templates later from the lot detail page.
                  </p>
                  {templatesError && <p className="mt-2 text-red-600">{templatesError}</p>}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="max-h-56 space-y-3 overflow-y-auto pr-1">
                    {templates.map((template) => {
                      const isSelected = selectedTemplateIds.includes(template.id);
                      return (
                        <button
                          type="button"
                          key={template.id}
                          onClick={() => toggleTemplateSelection(template.id)}
                          className={`w-full rounded-lg border p-4 text-left transition-colors ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                              : 'border-gray-200 hover:border-blue-200 hover:bg-blue-50/40'
                          }`}
                          disabled={isSubmitting}
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={`mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                                isSelected
                                  ? 'border-blue-600 bg-blue-600 text-white'
                                  : 'border-gray-300 text-transparent'
                              }`}
                              aria-hidden
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-3">
                                <p className="truncate text-sm font-medium text-gray-900">
                                  {template.name}
                                </p>
                                {template.category && (
                                  <span className="inline-flex shrink-0 items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                                    {template.category}
                                  </span>
                                )}
                              </div>
                              {template.description && (
                                <p className="mt-1 line-clamp-2 text-xs text-gray-600">
                                  {template.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {selectedTemplateIds.length > 0 && (
                    <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                      {selectedTemplateIds.length} template
                      {selectedTemplateIds.length === 1 ? '' : 's'} selected
                    </div>
                  )}

                  {templatesError && (
                    <div className="rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-700">
                      {templatesError}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Attachments (Optional)
              </label>
              <div className="mt-1 flex justify-center rounded-md border-2 border-dashed border-gray-300 px-6 pt-5 pb-6">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer rounded-md bg-white font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2"
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
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between rounded bg-gray-50 p-2"
                  >
                    <div className="flex items-center">
                      <FileText className="mr-2 h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-900">{file.name}</span>
                      <span className="ml-2 text-sm text-gray-500">
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
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}

            {error && (
              <div className="rounded-md bg-red-50 p-4 text-sm text-red-800 whitespace-pre-line">
                {error}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3">
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
