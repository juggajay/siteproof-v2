import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // During build time, create a dummy client to prevent build errors
  if (!supabaseUrl || !supabaseAnonKey) {
    // In production/runtime, throw error. During build, create dummy client.
    if (typeof window !== 'undefined') {
      throw new Error(
        'Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your environment.'
      );
    }
    // Return dummy client for build time
    return createBrowserClient(
      'https://dummy.supabase.co',
      'dummy-anon-key'
    );
  }

  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
  );
}