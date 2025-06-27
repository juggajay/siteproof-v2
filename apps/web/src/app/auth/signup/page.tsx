import { Metadata } from 'next';
import Link from 'next/link';
import { SignUpForm } from '@/features/auth/components/SignUpForm';

export const metadata: Metadata = {
  title: 'Sign Up - SiteProof',
  description: 'Create your SiteProof account',
};

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex justify-center">
          <h1 className="text-3xl font-bold text-gray-900">SiteProof</h1>
        </Link>
        <h2 className="mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Start managing your website proofs professionally
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-[480px]">
        <div className="bg-white px-6 py-12 shadow sm:rounded-lg sm:px-12">
          <SignUpForm />
        </div>
      </div>
    </div>
  );
}