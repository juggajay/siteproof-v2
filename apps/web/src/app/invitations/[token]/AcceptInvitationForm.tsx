'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import Link from 'next/link';

import { Button, Input } from '@siteproof/design-system';
import { createClient } from '@/lib/supabase/client';

interface AcceptInvitationFormProps {
  invitation: {
    token: string;
    email: string;
    organizationName: string;
    role: string;
    isLoggedIn: boolean;
    userEmail?: string;
  };
}

const acceptInvitationSchema = z.object({
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password'),
  fullName: z
    .string()
    .min(1, 'Full name is required')
    .min(2, 'Full name must be at least 2 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type AcceptInvitationFormData = z.infer<typeof acceptInvitationSchema>;

export function AcceptInvitationForm({ invitation }: AcceptInvitationFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isAccepting, setIsAccepting] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AcceptInvitationFormData>({
    resolver: zodResolver(acceptInvitationSchema),
  });

  // If user is already logged in with correct email
  const handleAcceptAsExistingUser = async () => {
    if (invitation.userEmail !== invitation.email) {
      toast.error('Please log in with the email address that was invited');
      return;
    }

    setIsAccepting(true);
    try {
      const { error } = await supabase.rpc('accept_invitation', {
        invitation_token: invitation.token,
      });

      if (error) throw error;

      toast.success(`Successfully joined ${invitation.organizationName}!`);
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to accept invitation:', error);
      toast.error('Failed to accept invitation. Please try again.');
    } finally {
      setIsAccepting(false);
    }
  };

  // For new users who need to create an account
  const onSubmit = async (data: AcceptInvitationFormData) => {
    try {
      // Sign up the user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: invitation.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          toast.error('An account with this email already exists. Please log in instead.');
          router.push(`/auth/login?redirectTo=/invitations/${invitation.token}`);
          return;
        }
        throw signUpError;
      }

      if (!authData.user) {
        throw new Error('Failed to create account');
      }

      // Accept the invitation
      const { error: acceptError } = await supabase.rpc('accept_invitation', {
        invitation_token: invitation.token,
      });

      if (acceptError) {
        console.error('Failed to accept invitation:', acceptError);
        toast.error('Account created but failed to join organization. Please try again.');
        return;
      }

      toast.success(`Account created and joined ${invitation.organizationName}!`);
      router.push('/dashboard');
    } catch (error) {
      console.error('Signup error:', error);
      toast.error('Failed to create account. Please try again.');
    }
  };

  // Show different UI based on login status
  if (invitation.isLoggedIn) {
    if (invitation.userEmail === invitation.email) {
      return (
        <div className="space-y-6">
          <div className="rounded-lg bg-blue-50 p-4">
            <p className="text-sm text-blue-800">
              You&apos;re logged in as <strong>{invitation.userEmail}</strong>
            </p>
          </div>
          
          <p className="text-sm text-gray-600">
            Click below to accept your invitation and join {invitation.organizationName} as {invitation.role}.
          </p>

          <Button
            onClick={handleAcceptAsExistingUser}
            loading={isAccepting}
            fullWidth
            size="lg"
          >
            Accept Invitation
          </Button>
        </div>
      );
    } else {
      return (
        <div className="space-y-6">
          <div className="rounded-lg bg-amber-50 p-4">
            <p className="text-sm text-amber-800">
              You&apos;re logged in as <strong>{invitation.userEmail}</strong>, but this invitation is for <strong>{invitation.email}</strong>.
            </p>
          </div>
          
          <p className="text-sm text-gray-600">
            Please log out and sign in with the invited email address to accept this invitation.
          </p>

          <div className="space-y-3">
            <Button
              onClick={() => {
                supabase.auth.signOut();
                router.refresh();
              }}
              variant="secondary"
              fullWidth
            >
              Log Out
            </Button>
            
            <Link 
              href={`/auth/login?email=${invitation.email}&redirectTo=/invitations/${invitation.token}`}
              className="block"
            >
              <Button fullWidth>
                Log In with {invitation.email}
              </Button>
            </Link>
          </div>
        </div>
      );
    }
  }

  // Show signup form for new users
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="rounded-lg bg-gray-50 p-4">
        <p className="text-sm text-gray-700">
          Create an account with <strong>{invitation.email}</strong> to join {invitation.organizationName}.
        </p>
      </div>

      <div>
        <Input
          {...register('fullName')}
          type="text"
          label="Full Name"
          placeholder="John Doe"
          error={errors.fullName?.message}
          disabled={isSubmitting}
          autoComplete="name"
          fullWidth
        />
      </div>

      <div>
        <Input
          {...register('password')}
          type="password"
          label="Password"
          placeholder="••••••••"
          error={errors.password?.message}
          disabled={isSubmitting}
          autoComplete="new-password"
          fullWidth
        />
      </div>

      <div>
        <Input
          {...register('confirmPassword')}
          type="password"
          label="Confirm Password"
          placeholder="••••••••"
          error={errors.confirmPassword?.message}
          disabled={isSubmitting}
          autoComplete="new-password"
          fullWidth
        />
      </div>

      <Button
        type="submit"
        loading={isSubmitting}
        fullWidth
        size="lg"
      >
        Create Account & Join Team
      </Button>

      <div className="text-center text-sm">
        <span className="text-gray-600">Already have an account?</span>{' '}
        <Link
          href={`/auth/login?email=${invitation.email}&redirectTo=/invitations/${invitation.token}`}
          className="font-medium text-blue-600 hover:text-blue-700"
        >
          Sign in
        </Link>
      </div>
    </form>
  );
}