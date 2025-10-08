import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { randomBytes, createHash } from 'crypto';

type RateLimitScope = 'default' | 'api' | 'auth' | 'auth-page' | 'dashboard';

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

  if (pathname.startsWith('/auth/')) {
    return 'auth-page';
  }

  if (pathname.startsWith('/dashboard')) {
    return 'dashboard';
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

  // Generate nonce for CSP
  const nonce = Buffer.from(randomBytes(16)).toString('base64');

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

  // Build CSP with nonce
  const cspHeader = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://*.supabase.co https://vercel.live`,
    `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openweathermap.org https://vercel.live",
    "media-src 'self'",
    "object-src 'none'",
    "frame-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ');

  // Apply security headers
  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(self), interest-cohort=()'
  );
  response.headers.set('X-Nonce', nonce);

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
    return response;
  }

  // CSRF Protection for state-changing methods
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    const csrfCookie = request.cookies.get('csrf-token')?.value;
    const csrfHeader = request.headers.get('x-csrf-token');

    // Skip CSRF check for auth routes (they have their own protection)
    if (!request.nextUrl.pathname.startsWith('/api/auth/')) {
      if (!csrfCookie || csrfCookie !== csrfHeader) {
        return new NextResponse('Invalid CSRF token', { status: 403 });
      }
    }
  }

  // Generate CSRF token for GET requests
  const sessionCookie = request.cookies.get('sb-access-token')?.value;
  if (sessionCookie && request.method === 'GET') {
    const csrfToken = createHash('sha256')
      .update(`${sessionCookie}-${process.env.CSRF_SECRET || 'fallback-secret'}`)
      .digest('hex');

    response.cookies.set('csrf-token', csrfToken, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({
          name,
          value,
          ...options,
        });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        // Re-apply security headers and nonce
        response.headers.set('Content-Security-Policy', cspHeader);
        response.headers.set('X-Nonce', nonce);
        response.cookies.set({
          name,
          value,
          ...options,
        });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({
          name,
          value: '',
          ...options,
        });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        // Re-apply security headers and nonce
        response.headers.set('Content-Security-Policy', cspHeader);
        response.headers.set('X-Nonce', nonce);
        response.cookies.set({
          name,
          value: '',
          ...options,
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
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Allow design-system page without authentication
  if (request.nextUrl.pathname === '/design-system') {
    return response;
  }

  // Auth routes (login, signup) - redirect to dashboard if already authenticated
  if (request.nextUrl.pathname.startsWith('/auth/')) {
    if (user && !request.nextUrl.pathname.includes('/logout')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Root redirect - show landing page to non-authenticated users
  if (request.nextUrl.pathname === '/') {
    if (user) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    // Allow landing page to render for non-authenticated users
    return response;
  }

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
