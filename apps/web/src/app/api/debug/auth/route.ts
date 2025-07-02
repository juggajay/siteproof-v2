import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    // Check if we can create Supabase client
    const { createClient } = await import('@/lib/supabase/server');
    
    let supabaseClientStatus = 'unknown';
    let userStatus = null;
    let cookieInfo = {};
    let error = null;
    
    try {
      const supabase = await createClient();
      supabaseClientStatus = 'created';
      
      // Try to get user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        error = {
          message: userError.message,
          status: userError.status,
          name: userError.name
        };
      }
      
      userStatus = user ? {
        id: user.id,
        email: user.email,
        authenticated: true
      } : {
        authenticated: false
      };
      
    } catch (clientError: any) {
      supabaseClientStatus = 'failed';
      error = {
        message: clientError.message,
        type: 'client_creation_error'
      };
    }
    
    // Check cookies
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    
    // Filter for Supabase auth cookies
    const authCookies = allCookies.filter(cookie => 
      cookie.name.includes('supabase') || 
      cookie.name.includes('auth')
    );
    
    cookieInfo = {
      totalCookies: allCookies.length,
      authCookies: authCookies.map(c => ({
        name: c.name,
        hasValue: !!c.value,
        httpOnly: c.httpOnly,
        secure: c.secure
      }))
    };
    
    return NextResponse.json({
      status: 'debug',
      timestamp: new Date().toISOString(),
      supabase: {
        clientStatus: supabaseClientStatus,
        urlConfigured: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        keyConfigured: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      },
      auth: {
        user: userStatus,
        error: error
      },
      cookies: cookieInfo,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV
      }
    });
    
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}