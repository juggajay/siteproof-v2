'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import Link from 'next/link';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

import { Button, Input } from '@siteproof/design-system';
import { loginSchema, type LoginFormData } from '../schemas/auth.schema';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  
  const isRegistered = searchParams.get('registered') === 'true';
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      rememberMe: true,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setError('email', {
            message: 'Invalid email or password',
          });
          setError('password', {
            message: 'Invalid email or password',
          });
        } else {
          toast.error(result.message || 'Failed to sign in');
        }
        return;
      }

      toast.success('Welcome back!');
      
      // Redirect to dashboard or requested page
      router.push(redirectTo);
      router.refresh();
    } catch (error) {
      console.error('Login error:', error);
      toast.error('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {isRegistered && (
        <div className="rounded-lg bg-green-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-green-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                Account created successfully! Please check your email to verify your account.
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <Input
            {...register('email')}
            type="email"
            label="Email Address"
            placeholder="john@example.com"
            error={errors.email?.message}
            disabled={isSubmitting}
            autoComplete="email"
            autoFocus
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
              autoComplete="current-password"
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

        <div className="flex items-center justify-between">
          <label className="flex items-center">
            <input
              {...register('rememberMe')}
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              disabled={isSubmitting}
            />
            <span className="ml-2 text-sm text-gray-600">Remember me</span>
          </label>

          <Link
            href="/auth/forgot-password"
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Forgot your password?
          </Link>
        </div>

        <Button
          type="submit"
          loading={isSubmitting}
          fullWidth
          size="lg"
        >
          Sign In
        </Button>

        <div className="text-center text-sm">
          <span className="text-gray-600">Don't have an account?</span>{' '}
          <Link
            href="/auth/signup"
            className="font-medium text-blue-600 hover:text-blue-700"
          >
            Create an account
          </Link>
        </div>
      </form>
    </div>
  );
}