'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Globe, Eye } from 'lucide-react';
import { Button, Input } from '@siteproof/design-system';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useCreateProject, type CreateProjectData } from '../hooks/useProjects';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
}

const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(255),
  description: z.string().optional(),
  clientName: z.string().optional(),
  clientEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  clientCompany: z.string().optional(),
  dueDate: z.string().optional(),
  visibility: z.enum(['private', 'public', 'password']),
  password: z.string().optional(),
}).refine((data) => {
  if (data.visibility === 'password' && !data.password) {
    return false;
  }
  return true;
}, {
  message: 'Password is required for password-protected projects',
  path: ['password'],
});

type FormData = z.infer<typeof createProjectSchema>;

export function CreateProjectModal({ isOpen, onClose, organizationId }: CreateProjectModalProps) {
  const focusTrapRef = useFocusTrap(isOpen);
  const createProject = useCreateProject();
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      visibility: 'private',
    },
  });

  const visibility = watch('visibility');

  React.useEffect(() => {
    const handleEscape = (e: Event) => {
      if ((e as CustomEvent).type === 'focustrap:escape') {
        onClose();
      }
    };

    if (isOpen && focusTrapRef.current) {
      focusTrapRef.current.addEventListener('focustrap:escape', handleEscape);
      return () => {
        focusTrapRef.current?.removeEventListener('focustrap:escape', handleEscape);
      };
    }
  }, [isOpen, onClose, focusTrapRef]);

  const onSubmit = async (data: FormData) => {
    try {
      await createProject.mutateAsync({
        ...data,
        organizationId,
      } as CreateProjectData);
      reset();
      onClose();
    } catch (error) {
      // Error is handled by the mutation hook
    }
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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-25"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="flex min-h-full items-center justify-center p-4">
          <motion.div
            ref={focusTrapRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Create New Project
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4">
              <div className="space-y-6">
                {/* Project Details */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Project Details
                  </h3>
                  <div className="space-y-4">
                    <Input
                      {...register('name')}
                      label="Project Name"
                      placeholder="Website Redesign"
                      error={errors.name?.message}
                      fullWidth
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
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Client Information (Optional)
                  </h3>
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
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Visibility Settings
                  </h3>
                  <div className="space-y-3">
                    {visibilityOptions.map((option) => {
                      const Icon = option.icon;
                      return (
                        <label
                          key={option.value}
                          className={`
                            relative flex cursor-pointer rounded-lg border p-4
                            ${visibility === option.value
                              ? 'border-blue-600 bg-blue-50'
                              : 'border-gray-300 bg-white hover:bg-gray-50'
                            }
                          `}
                        >
                          <input
                            {...register('visibility')}
                            type="radio"
                            value={option.value}
                            className="sr-only"
                          />
                          <div className="flex items-center">
                            <Icon className="w-5 h-5 text-gray-400 mr-3" />
                            <div className="flex-1">
                              <span className="block text-sm font-medium text-gray-900">
                                {option.label}
                              </span>
                              <span className="block text-sm text-gray-500">
                                {option.description}
                              </span>
                            </div>
                          </div>
                          {visibility === option.value && (
                            <div className="ml-3 flex-shrink-0">
                              <svg
                                className="h-5 w-5 text-blue-600"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                          )}
                        </label>
                      );
                    })}
                  </div>

                  {visibility === 'password' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4"
                    >
                      <Input
                        {...register('password')}
                        type="password"
                        label="Access Password"
                        placeholder="Enter a secure password"
                        error={errors.password?.message}
                        helperText="Share this password with clients to grant access"
                        fullWidth
                      />
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onClose}
                  disabled={createProject.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={createProject.isPending}
                >
                  Create Project
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}