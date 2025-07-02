import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    console.log('[Test Supabase] Starting test...');
    
    // Log environment variables (partially)
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    console.log('[Test Supabase] URL exists:', !!url);
    console.log('[Test Supabase] Key exists:', !!key);
    console.log('[Test Supabase] URL prefix:', url?.substring(0, 30));
    
    // Try to create client
    console.log('[Test Supabase] Creating client...');
    const supabase = await createClient();
    console.log('[Test Supabase] Client created successfully');
    
    // Try to get user
    console.log('[Test Supabase] Getting user...');
    const { data: { user }, error } = await supabase.auth.getUser();
    console.log('[Test Supabase] User result:', { userId: user?.id, error });
    
    // Try a simple query
    console.log('[Test Supabase] Testing database query...');
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .limit(1);
    console.log('[Test Supabase] Query result:', { count: orgs?.length, error: orgError });
    
    return NextResponse.json({
      success: true,
      env: {
        urlExists: !!url,
        keyExists: !!key,
        urlPrefix: url?.substring(0, 30)
      },
      auth: {
        userExists: !!user,
        userId: user?.id,
        error: error?.message
      },
      database: {
        querySuccess: !orgError,
        error: orgError?.message
      }
    });
  } catch (error) {
    console.error('[Test Supabase] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}