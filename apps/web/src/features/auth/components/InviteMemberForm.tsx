'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { UserPlus, Mail } from 'lucide-react';

import { Button, Input } from '@siteproof/design-system';

interface InviteMemberFormProps {
  organizationId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const inviteMemberSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
  role: z.enum(['admin', 'member', 'viewer'], {
    required_error: 'Please select a role',
  }),
});

type InviteMemberFormData = z.infer<typeof inviteMemberSchema>;

const roleDescriptions = {
  admin: 'Can manage team members, settings, and all projects',
  member: 'Can create and manage their own projects',
  viewer: 'Can view projects and leave comments only',
};

export function InviteMemberForm({ organizationId, onSuccess, onCancel }: InviteMemberFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
  } = useForm<InviteMemberFormData>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      role: 'member',
    },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: InviteMemberFormData) => {
    try {
      const response = await fetch(`/api/organizations/${organizationId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.message || 'Failed to send invitation');
        return;
      }

      toast.success(`Invitation sent to ${data.email}`);
      reset();
      onSuccess?.();
    } catch (error) {
      console.error('Failed to send invitation:', error);
      toast.error('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <Input
          {...register('email')}
          type="email"
          label="Email Address"
          placeholder="colleague@example.com"
          error={errors.email?.message}
          disabled={isSubmitting}
          autoComplete="off"
          fullWidth
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Role
        </label>
        <div className="space-y-3">
          {(['admin', 'member', 'viewer'] as const).map((role) => (
            <label
              key={role}
              className={`
                relative flex cursor-pointer rounded-lg border p-4
                ${selectedRole === role
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-300 bg-white hover:bg-gray-50'
                }
              `}
            >
              <input
                {...register('role')}
                type="radio"
                value={role}
                className="sr-only"
                disabled={isSubmitting}
              />
              <div className="flex flex-1">
                <div className="flex flex-col">
                  <span className="block text-sm font-medium text-gray-900 capitalize">
                    {role}
                  </span>
                  <span className="mt-1 flex items-center text-sm text-gray-500">
                    {roleDescriptions[role]}
                  </span>
                </div>
              </div>
              {selectedRole === role && (
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
          ))}
        </div>
        {errors.role && (
          <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
        )}
      </div>

      <div className="flex gap-3">
        <Button
          type="submit"
          loading={isSubmitting}
          className="flex-1"
        >
          <Mail className="w-4 h-4 mr-2" />
          Send Invitation
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
      </div>

      <div className="rounded-lg bg-blue-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <UserPlus className="h-5 w-5 text-blue-400" aria-hidden="true" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-800">
              The invited user will receive an email with a link to join your organization.
              They'll need to create an account or sign in to accept the invitation.
            </p>
          </div>
        </div>
      </div>
    </form>
  );
}