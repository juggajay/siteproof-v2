import { NextResponse } from 'next/server';

export async function GET() {
  const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasSupabaseAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const hasServiceRoleKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hasResendKey = !!process.env.RESEND_API_KEY;
  
  const status = hasSupabaseUrl && hasSupabaseAnonKey ? 'healthy' : 'unhealthy';
  
  return NextResponse.json({
    status,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    checks: {
      supabase_url: hasSupabaseUrl,
      supabase_anon_key: hasSupabaseAnonKey,
      supabase_service_key: hasServiceRoleKey,
      resend_api_key: hasResendKey,
    },
    required: {
      NEXT_PUBLIC_SUPABASE_URL: hasSupabaseUrl ? 'Set' : 'Missing',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: hasSupabaseAnonKey ? 'Set' : 'Missing',
    },
    optional: {
      SUPABASE_SERVICE_ROLE_KEY: hasServiceRoleKey ? 'Set' : 'Not set',
      RESEND_API_KEY: hasResendKey ? 'Set' : 'Not set',
    },
  }, {
    status: status === 'healthy' ? 200 : 503,
  });
}