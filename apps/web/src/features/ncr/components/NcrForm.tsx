'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, Tag, Upload, X } from 'lucide-react';
import { Button, Input } from '@siteproof/design-system';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Inspection, Project } from '@siteproof/database';

const ncrSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  category: z.string().min(1, 'Category is required'),
  location: z.string().optional(),
  trade: z.string().optional(),
  assigned_to: z.string().optional(),
  contractor_id: z.string().optional(),
  due_date: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

type NCRFormData = z.infer<typeof ncrSchema>;

interface NcrFormProps {
  inspection?: Inspection;
  project: Project;
  inspectionItemRef?: string;
  ncr?: any; // NCR being edited
  editMode?: boolean;
  onSuccess?: (ncrId: string) => void;
  onCancel?: () => void;
}

const severityOptions = [
  { value: 'low', label: 'Low', color: 'text-blue-600 bg-blue-50' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-600 bg-yellow-50' },
  { value: 'high', label: 'High', color: 'text-orange-600 bg-orange-50' },
  { value: 'critical', label: 'Critical', color: 'text-red-600 bg-red-50' },
];

const categoryOptions = [
  'Quality',
  'Safety',
  'Environmental',
  'Documentation',
  'Workmanship',
  'Materials',
  'Design',
  'Other',
];

const tradeOptions = [
  'General',
  'Concrete',
  'Steel',
  'Electrical',
  'Plumbing',
  'HVAC',
  'Carpentry',
  'Masonry',
  'Roofing',
  'Landscaping',
];

export function NcrForm({
  inspection,
  project,
  inspectionItemRef,
  ncr,
  editMode = false,
  onSuccess,
  onCancel,
}: NcrFormProps) {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [customTags, setCustomTags] = useState<string[]>(ncr?.tags || []);
  const [tagInput, setTagInput] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<NCRFormData>({
    resolver: zodResolver(ncrSchema),
    defaultValues:
      editMode && ncr
        ? {
            title: ncr.title,
            description: ncr.description,
            severity: ncr.severity,
            category: ncr.category,
            location: ncr.location || '',
            trade: ncr.trade || '',
            assigned_to: ncr.assigned_to || '',
            contractor_id: ncr.contractor_id || '',
            due_date: ncr.due_date ? new Date(ncr.due_date).toISOString().split('T')[0] : '',
            tags: ncr.tags || [],
          }
        : {
            severity: 'medium',
            tags: [],
          },
  });

  const selectedSeverity = watch('severity');

  // Fetch team members for assignment
  const { data: teamMembers } = useQuery({
    queryKey: ['organization-members', project.organization_id],
    queryFn: async () => {
      const response = await fetch(`/api/organizations/${project.organization_id}/members`);
      if (!response.ok) throw new Error('Failed to fetch team members');
      return response.json();
    },
  });

  // Fetch contractors
  const { data: contractors } = useQuery({
    queryKey: ['contractors', project.id],
    queryFn: async () => {
      // Fetch contractors associated with the project
      const response = await fetch(`/api/projects/${project.id}/contractors`);
      if (!response.ok) {
        console.error('Failed to fetch contractors');
        return [];
      }
      const data = await response.json();
      return data.contractors || [];
    },
    enabled: !!project.id,
  });

  const createOrUpdateNCR = useMutation({
    mutationFn: async (data: NCRFormData) => {
      if (editMode && ncr) {
        // Update existing NCR
        const response = await fetch(`/api/ncrs/${ncr.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...data,
            tags: customTags,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to update NCR');
        }

        return response.json();
      } else {
        // Create new NCR
        const formData = new FormData();

        // Add form fields
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            if (key === 'tags') {
              // Send tags as JSON string
              formData.append(key, JSON.stringify(customTags));
            } else if (Array.isArray(value)) {
              formData.append(key, JSON.stringify(value));
            } else {
              formData.append(key, String(value));
            }
          }
        });

        // Add metadata
        formData.append('project_id', project.id);
        if (inspection) {
          formData.append('inspection_id', inspection.id);
          formData.append('lot_id', inspection.lot_id || '');
        }
        if (inspectionItemRef) {
          formData.append('inspection_item_ref', inspectionItemRef);
        }

        // Add files
        uploadedFiles.forEach((file, index) => {
          formData.append(`evidence_${index}`, file);
        });

        const response = await fetch('/api/ncrs', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to create NCR');
        }

        return response.json();
      }
    },
    onSuccess: (data) => {
      toast.success(editMode ? 'NCR updated successfully' : 'NCR created successfully');
      onSuccess?.(editMode ? ncr.id : data.ncr.id);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (data: NCRFormData) => {
    createOrUpdateNCR.mutate(data);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const addTag = () => {
    if (tagInput.trim() && !customTags.includes(tagInput.trim())) {
      const newTags = [...customTags, tagInput.trim()];
      setCustomTags(newTags);
      setValue('tags', newTags);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    const newTags = customTags.filter((t) => t !== tag);
    setCustomTags(newTags);
    setValue('tags', newTags);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Header with context */}
      {inspection && (
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">
            Raising NCR from inspection in <strong>{project.name}</strong>
            {inspection.lot_id && ` - Lot ${inspection.lot_id}`}
          </p>
        </div>
      )}

      {/* Title */}
      <Input
        label="Title"
        {...register('title')}
        error={errors.title?.message}
        placeholder="Brief description of the non-conformance"
        required
        fullWidth
      />

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          {...register('description')}
          rows={4}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
            errors.description
              ? 'border-red-300 focus:ring-red-500'
              : 'border-gray-300 focus:ring-blue-500'
          }`}
          placeholder="Detailed description of the issue, including what was expected vs what was found"
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      {/* Severity */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Severity <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {severityOptions.map((option) => (
            <label key={option.value} className="relative cursor-pointer">
              <input
                type="radio"
                value={option.value}
                {...register('severity')}
                className="sr-only"
              />
              <div
                className={`
                  p-3 rounded-lg border-2 text-center transition-all
                  ${
                    selectedSeverity === option.value
                      ? `border-current ${option.color}`
                      : 'border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <AlertTriangle className="w-5 h-5 mx-auto mb-1" />
                <span className="text-sm font-medium">{option.label}</span>
              </div>
            </label>
          ))}
        </div>
        {errors.severity && <p className="mt-1 text-sm text-red-600">{errors.severity.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            {...register('category')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select category</option>
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          {errors.category && (
            <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
          )}
        </div>

        {/* Trade */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Trade</label>
          <select
            {...register('trade')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select trade</option>
            {tradeOptions.map((trade) => (
              <option key={trade} value={trade}>
                {trade}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Location */}
        <Input
          label="Location"
          {...register('location')}
          placeholder="e.g., Level 2, Grid B-4"
          fullWidth
        />

        {/* Due Date */}
        <Input type="date" label="Due Date" {...register('due_date')} fullWidth />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Assign To */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
          <select
            {...register('assigned_to')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select assignee</option>
            {teamMembers?.members?.map((member: any) => (
              <option key={member.user_id} value={member.user_id}>
                {member.user.full_name || member.user.email}
              </option>
            ))}
          </select>
        </div>

        {/* Contractor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contractor</label>
          <select
            {...register('contractor_id')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select contractor</option>
            {contractors?.map((contractor: any) => (
              <option key={contractor.id} value={contractor.id}>
                {contractor.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            placeholder="Add tags..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button type="button" variant="secondary" onClick={addTag} disabled={!tagInput.trim()}>
            <Tag className="w-4 h-4" />
          </Button>
        </div>
        {customTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {customTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-sm"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Evidence Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Evidence / Attachments
        </label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
          <input
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx"
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="flex flex-col items-center cursor-pointer">
            <Upload className="w-8 h-8 text-gray-400 mb-2" />
            <span className="text-sm text-gray-600">Click to upload or drag and drop</span>
            <span className="text-xs text-gray-500 mt-1">
              Images, PDFs, or documents up to 10MB each
            </span>
          </label>
        </div>

        {uploadedFiles.length > 0 && (
          <div className="mt-3 space-y-2">
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
              >
                <span className="text-sm text-gray-700 truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>
          {editMode ? 'Update NCR' : 'Create NCR'}
        </Button>
      </div>
    </form>
  );
}
