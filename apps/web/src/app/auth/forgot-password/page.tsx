'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Button, Input } from '@siteproof/design-system';
import { ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        throw error;
      }

      setSubmitted(true);
      toast.success('Password reset email sent!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send password reset email');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-sm">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Check your email</h2>
            <p className="mt-2 text-gray-600">
              We've sent a password reset link to {email}
            </p>
            <p className="mt-4 text-sm text-gray-500">
              Didn't receive the email? Check your spam folder or try again.
            </p>
          </div>
          
          <div className="space-y-4">
            <Button
              onClick={() => {
                setSubmitted(false);
                setEmail('');
              }}
              variant="secondary"
              fullWidth
            >
              Try another email
            </Button>
            
            <Link href="/auth/login">
              <Button variant="ghost" fullWidth>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-sm">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 text-center">
            Forgot your password?
          </h2>
          <p className="mt-2 text-center text-gray-600">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            type="email"
            label="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            fullWidth
            autoFocus
          />
          
          <Button
            type="submit"
            loading={loading}
            fullWidth
          >
            Send reset link
          </Button>
        </form>
        
        <div className="text-center">
          <Link href="/auth/login" className="text-sm text-blue-600 hover:text-blue-500">
            <ArrowLeft className="inline w-4 h-4 mr-1" />
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}