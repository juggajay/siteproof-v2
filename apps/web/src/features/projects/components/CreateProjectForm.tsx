'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input, Button } from '@siteproof/design-system';
import { Globe, Lock, Eye } from 'lucide-react';

const createProjectSchema = z
  .object({
    name: z.string().min(1, 'Project name is required'),
    description: z.string().optional(),
    clientName: z.string().optional(),
    clientEmail: z.string().email('Invalid email').optional().or(z.literal('')),
    clientCompany: z.string().optional(),
    dueDate: z.string().optional(),
    visibility: z.enum(['private', 'public', 'password']).default('private'),
    password: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.visibility === 'password' && !data.password) {
        return false;
      }
      return true;
    },
    {
      message: 'Password is required for password-protected projects',
      path: ['password'],
    }
  );

type FormData = z.infer<typeof createProjectSchema>;

interface CreateProjectFormProps {
  onSubmit: (data: FormData) => void | Promise<void>;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

export function CreateProjectForm({ onSubmit, isSubmitting, onCancel }: CreateProjectFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      visibility: 'private',
    },
  });

  const visibility = watch('visibility');

  const handleFormSubmit = (data: FormData) => {
    // Transform empty strings to undefined for optional fields
    const cleanedData = {
      ...data,
      description: data.description || undefined,
      clientName: data.clientName || undefined,
      clientEmail: data.clientEmail || undefined,
      clientCompany: data.clientCompany || undefined,
      dueDate: data.dueDate || undefined,
      password: data.password || undefined,
    };
    onSubmit(cleanedData);
  };

  const visibilityOptions = [
    {
      value: 'private',
      label: 'Private',
      description: 'Only team members can access',
      icon: Lock,
    },
    {
      value: 'public',
      label: 'Public',
      description: 'Anyone with the link can view',
      icon: Globe,
    },
    {
      value: 'password',
      label: 'Password Protected',
      description: 'Requires password to access',
      icon: Eye,
    },
  ];

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Project Details */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Project Details</h3>
        <div className="space-y-4">
          <Input
            {...register('name')}
            label="Project Name"
            placeholder="Website Redesign"
            error={errors.name?.message}
            fullWidth
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Brief description of the project..."
            />
          </div>

          <Input
            {...register('dueDate')}
            type="date"
            label="Due Date (Optional)"
            error={errors.dueDate?.message}
            fullWidth
          />
        </div>
      </div>

      {/* Client Information */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Client Information (Optional)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            {...register('clientName')}
            label="Client Name"
            placeholder="John Doe"
            error={errors.clientName?.message}
            fullWidth
          />

          <Input
            {...register('clientEmail')}
            type="email"
            label="Client Email"
            placeholder="john@example.com"
            error={errors.clientEmail?.message}
            fullWidth
          />

          <Input
            {...register('clientCompany')}
            label="Company"
            placeholder="Acme Inc"
            error={errors.clientCompany?.message}
            fullWidth
          />
        </div>
      </div>

      {/* Visibility Settings */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Visibility Settings</h3>
        <div className="space-y-3">
          {visibilityOptions.map((option) => {
            const Icon = option.icon;
            return (
              <label
                key={option.value}
                className={`
                  relative flex cursor-pointer rounded-lg border p-4
                  ${
                    visibility === option.value
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-300 bg-white hover:bg-gray-50'
                  }
                `}
              >
                <input
                  type="radio"
                  {...register('visibility')}
                  value={option.value}
                  className="sr-only"
                />
                <div className="flex flex-1">
                  <div className="flex items-center">
                    <Icon className="h-5 w-5 text-gray-600" />
                  </div>
                  <div className="ml-3">
                    <span className="block text-sm font-medium">{option.label}</span>
                    <span className="block text-sm text-gray-500">{option.description}</span>
                  </div>
                </div>
              </label>
            );
          })}

          {visibility === 'password' && (
            <div className="mt-4 ml-12">
              <Input
                {...register('password')}
                type="password"
                label="Password"
                placeholder="Enter password"
                error={errors.password?.message}
                fullWidth
              />
            </div>
          )}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={isSubmitting}>
          Create Project
        </Button>
      </div>
    </form>
  );
}
