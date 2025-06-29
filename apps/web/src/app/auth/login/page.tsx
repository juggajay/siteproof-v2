import { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { LoginForm } from '@/features/auth/components/LoginForm';

export const metadata: Metadata = {
  title: 'Sign In - SiteProof',
  description: 'Sign in to your SiteProof account',
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex justify-center">
          <h1 className="text-3xl font-bold text-gray-900">SiteProof</h1>
        </Link>
        <h2 className="mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Welcome back! Please enter your details.
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-[480px]">
        <div className="bg-white px-6 py-12 shadow sm:rounded-lg sm:px-12">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}