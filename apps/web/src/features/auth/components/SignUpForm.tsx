'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';

import { Button, Input } from '@siteproof/design-system';
import { signUpSchema, type SignUpFormData } from '../schemas/auth.schema';

export function SignUpForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      acceptTerms: false,
    },
  });

  const onSubmit = async (data: SignUpFormData) => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.field && result.message) {
          setError(result.field as keyof SignUpFormData, {
            message: result.message,
          });
        } else {
          toast.error(result.message || 'Failed to create account');
        }
        return;
      }

      toast.success('Account created successfully! Please check your email to verify your account.');
      
      // Redirect to login or dashboard
      router.push('/auth/login?registered=true');
    } catch (error) {
      console.error('Signup error:', error);
      toast.error('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
          {...register('email')}
          type="email"
          label="Email Address"
          placeholder="john@example.com"
          error={errors.email?.message}
          disabled={isSubmitting}
          autoComplete="email"
          fullWidth
        />
      </div>

      <div>
        <div className="relative">
          <Input
            {...register('password')}
            type={showPassword ? 'text' : 'password'}
            label="Password"
            placeholder="••••••••"
            error={errors.password?.message}
            disabled={isSubmitting}
            autoComplete="new-password"
            fullWidth
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-[34px] text-gray-500 hover:text-gray-700"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      <div>
        <div className="relative">
          <Input
            {...register('confirmPassword')}
            type={showConfirmPassword ? 'text' : 'password'}
            label="Confirm Password"
            placeholder="••••••••"
            error={errors.confirmPassword?.message}
            disabled={isSubmitting}
            autoComplete="new-password"
            fullWidth
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-[34px] text-gray-500 hover:text-gray-700"
            tabIndex={-1}
          >
            {showConfirmPassword ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      <div>
        <label className="flex items-start">
          <input
            {...register('acceptTerms')}
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            disabled={isSubmitting}
          />
          <span className="ml-2 text-sm text-gray-600">
            I accept the{' '}
            <Link
              href="/terms"
              className="text-blue-600 hover:text-blue-700 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Terms and Conditions
            </Link>{' '}
            and{' '}
            <Link
              href="/privacy"
              className="text-blue-600 hover:text-blue-700 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy Policy
            </Link>
          </span>
        </label>
        {errors.acceptTerms && (
          <p className="mt-1 text-sm text-red-600">{errors.acceptTerms.message}</p>
        )}
      </div>

      <Button
        type="submit"
        loading={isSubmitting}
        fullWidth
        size="lg"
      >
        Create Account
      </Button>

      <div className="text-center text-sm">
        <span className="text-gray-600">Already have an account?</span>{' '}
        <Link
          href="/auth/login"
          className="font-medium text-blue-600 hover:text-blue-700"
        >
          Sign in
        </Link>
      </div>
    </form>
  );
}
