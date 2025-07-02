import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const checks = {
    environment: {
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      supabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      appUrl: !!process.env.NEXT_PUBLIC_APP_URL,
    },
    database: {
      connection: false,
      tables: {
        organizations: false,
        projects: false,
        users: false,
      },
    },
    auth: {
      user: null as any,
    },
  };

  try {
    const supabase = await createClient();
    
    // Check database connection
    const { error: orgError } = await supabase
      .from('organizations')
      .select('count')
      .limit(1);
    
    checks.database.connection = !orgError;
    checks.database.tables.organizations = !orgError;

    // Check projects table
    const { error: projectError } = await supabase
      .from('projects')
      .select('count')
      .limit(1);
    
    checks.database.tables.projects = !projectError;

    // Check users table
    const { error: userError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    checks.database.tables.users = !userError;

    // Check current auth
    const { data: { user } } = await supabase.auth.getUser();
    checks.auth.user = user;

  } catch (error) {
    console.error('Setup check error:', error);
  }

  return NextResponse.json({
    status: 'check',
    checks,
    recommendations: getRecommendations(checks),
  });
}

function getRecommendations(checks: any) {
  const recommendations = [];

  if (!checks.environment.supabaseUrl || !checks.environment.supabaseAnonKey) {
    recommendations.push('Set up Supabase environment variables in .env.local or Vercel dashboard');
  }

  if (!checks.database.connection) {
    recommendations.push('Check Supabase connection - ensure environment variables are correct');
  }

  if (!checks.database.tables.organizations || !checks.database.tables.projects || !checks.database.tables.users) {
    recommendations.push('Run database migrations in Supabase SQL editor');
  }

  if (!checks.auth.user) {
    recommendations.push('Sign in to create projects');
  }

  return recommendations;
}