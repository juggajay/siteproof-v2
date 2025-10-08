import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Security headers configuration
const securityHeaders = {
  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.supabase.co https://vercel.live",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openweathermap.org https://vercel.live https://fonts.googleapis.com https://fonts.gstatic.com",
    "media-src 'self'",
    "object-src 'none'",
    "frame-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; '),

  // Strict Transport Security
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',

  // Other security headers
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-DNS-Prefetch-Control': 'on',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self), interest-cohort=()',
};

type RateLimitScope = 'default' | 'api' | 'auth';

interface RateLimitResult {
  allowed: boolean;
  limit?: number;
  remaining?: number;
  resetAt?: number;
  retryAfter?: number;
}

function shouldBypassMiddleware(pathname: string): boolean {
  return pathname.startsWith('/api/internal/rate-limit');
}

function getRateLimitScope(pathname: string): RateLimitScope {
  if (pathname.startsWith('/api/auth/')) {
    return 'auth';
  }

  if (pathname.startsWith('/api/')) {
    return 'api';
  }

  return 'default';
}

function getRateLimitKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : (request.ip ?? 'unknown');
  return `${ip}:${request.nextUrl.pathname}`;
}

async function performRateLimitCheck(
  request: NextRequest,
  key: string,
  scope: RateLimitScope
): Promise<RateLimitResult> {
  const endpoint = `${request.nextUrl.origin}/api/internal/rate-limit`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const secret = process.env.INTERNAL_RATE_LIMIT_SECRET;
  if (secret) {
    headers['x-internal-rate-limit-secret'] = secret;
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ key, scope }),
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('Rate limit service returned non-OK response', response.status);
      return { allowed: true };
    }

    const data = (await response.json()) as RateLimitResult;
    return data;
  } catch (error) {
    console.error('Rate limit check failed', error);
    return { allowed: true };
  }
}

export async function middleware(request: NextRequest) {
  if (shouldBypassMiddleware(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const scope = getRateLimitScope(request.nextUrl.pathname);
  const key = getRateLimitKey(request);
  const rateLimitResult = await performRateLimitCheck(request, key, scope);

  if (!rateLimitResult.allowed) {
    const headers: Record<string, string> = {
      'Retry-After': rateLimitResult.retryAfter?.toString() ?? '60',
      'X-RateLimit-Limit': rateLimitResult.limit?.toString() ?? '0',
      'X-RateLimit-Remaining': '0',
    };

    if (typeof rateLimitResult.resetAt === 'number') {
      headers['X-RateLimit-Reset'] = new Date(rateLimitResult.resetAt).toISOString();
    }

    return new NextResponse('Too Many Requests', {
      status: 429,
      headers,
    });
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Set rate limit headers first (these are informational and safe to set early)
  if (typeof rateLimitResult.limit === 'number') {
    response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
  }
  if (typeof rateLimitResult.remaining === 'number') {
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
  }
  if (typeof rateLimitResult.resetAt === 'number') {
    response.headers.set('X-RateLimit-Reset', new Date(rateLimitResult.resetAt).toISOString());
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables in middleware');

    // Apply security headers before returning
    Object.entries(securityHeaders).forEach(([headerKey, value]) => {
      response.headers.set(headerKey, value);
    });

    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        // Ensure proper cookie attributes for mobile browsers
        const cookieOptions = {
          ...options,
          sameSite: (options.sameSite as 'lax' | 'strict' | 'none' | undefined) || 'lax',
          secure: process.env.NODE_ENV === 'production',
        };

        // Update both request and response cookies without recreating response
        request.cookies.set({
          name,
          value,
          ...cookieOptions,
        });
        response.cookies.set({
          name,
          value,
          ...cookieOptions,
        });
      },
      remove(name: string, options: CookieOptions) {
        // Ensure proper cookie attributes for mobile browsers
        const cookieOptions = {
          ...options,
          sameSite: (options.sameSite as 'lax' | 'strict' | 'none' | undefined) || 'lax',
          secure: process.env.NODE_ENV === 'production',
        };

        // Update both request and response cookies without recreating response
        request.cookies.set({
          name,
          value: '',
          ...cookieOptions,
        });
        response.cookies.set({
          name,
          value: '',
          ...cookieOptions,
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes
  if (
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/projects') ||
    request.nextUrl.pathname.startsWith('/settings') ||
    request.nextUrl.pathname.startsWith('/foreman')
  ) {
    if (!user) {
      // Redirect to login with return URL
      const redirectUrl = new URL('/auth/login', request.url);
      redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
      const redirectResponse = NextResponse.redirect(redirectUrl);

      // Apply security headers to redirect response
      Object.entries(securityHeaders).forEach(([headerKey, value]) => {
        redirectResponse.headers.set(headerKey, value);
      });

      return redirectResponse;
    }
  }

  // Allow design-system page without authentication
  if (request.nextUrl.pathname === '/design-system') {
    // Apply security headers before returning
    Object.entries(securityHeaders).forEach(([headerKey, value]) => {
      response.headers.set(headerKey, value);
    });

    return response;
  }

  // Auth routes (login, signup) - redirect to dashboard if already authenticated
  if (request.nextUrl.pathname.startsWith('/auth/')) {
    if (user && !request.nextUrl.pathname.includes('/logout')) {
      const redirectResponse = NextResponse.redirect(new URL('/dashboard', request.url));

      // Apply security headers to redirect response
      Object.entries(securityHeaders).forEach(([headerKey, value]) => {
        redirectResponse.headers.set(headerKey, value);
      });

      return redirectResponse;
    }
  }

  // Root redirect - show landing page to non-authenticated users
  if (request.nextUrl.pathname === '/') {
    if (user) {
      const redirectResponse = NextResponse.redirect(new URL('/dashboard', request.url));

      // Apply security headers to redirect response
      Object.entries(securityHeaders).forEach(([headerKey, value]) => {
        redirectResponse.headers.set(headerKey, value);
      });

      return redirectResponse;
    }
    // Allow landing page to render for non-authenticated users
  }

  // Apply security headers to the final response after all auth operations
  Object.entries(securityHeaders).forEach(([headerKey, value]) => {
    response.headers.set(headerKey, value);
  });

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
