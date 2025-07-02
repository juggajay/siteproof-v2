import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { loginSchema } from '@/features/auth/schemas/auth.schema';
import { headers } from 'next/headers';
import crypto from 'crypto';
import { loginRateLimiter } from '@/lib/rate-limiter';

function getClientIdentifier(_request: Request): string {
  const headersList = headers();
  const forwarded = headersList.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
  const userAgent = headersList.get('user-agent') || 'unknown';

  // Create a hash of IP + User Agent for better fingerprinting
  return crypto.createHash('sha256').update(`${ip}:${userAgent}`).digest('hex');
}

export async function POST(request: Request) {
  try {
    // Check rate limiting for this specific client
    const clientId = getClientIdentifier(request);
    const { allowed, retryAfter } = await loginRateLimiter.checkLimit(clientId);

    if (!allowed) {
      return NextResponse.json(
        {
          message: 'Too many failed login attempts. Please try again later.',
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter?.toString() || '900',
          },
        }
      );
    }

    const body = await request.json();

    // Validate request body
    const validationResult = loginSchema.safeParse(body);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      return NextResponse.json(
        {
          message: firstError.message,
          field: firstError.path[0],
        },
        { status: 400 }
      );
    }

    const { email, password } = validationResult.data;
    const supabase = await createClient();

    // Attempt to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Supabase login error:', error);

      // Record failed attempt
      await loginRateLimiter.recordFailedAttempt(clientId);
      const { remainingAttempts } = await loginRateLimiter.checkLimit(clientId);

      // Handle specific error cases
      if (error.message.includes('Invalid login credentials')) {
        return NextResponse.json(
          {
            message: 'Invalid email or password',
            remainingAttempts,
          },
          {
            status: 401,
            headers: {
              'X-RateLimit-Remaining': remainingAttempts?.toString() || '0',
            },
          }
        );
      }

      return NextResponse.json(
        {
          message: error.message || 'Failed to sign in',
          remainingAttempts,
        },
        { status: 400 }
      );
    }

    if (!data.user) {
      return NextResponse.json({ message: 'Failed to sign in' }, { status: 400 });
    }

    // Clear failed attempts on successful login
    await loginRateLimiter.clearAttempts(clientId);

    // Update last seen
    await supabase.rpc('update_user_last_seen', {
      user_id: data.user.id,
    });

    // Get user's organizations
    const { data: memberships } = await supabase
      .from('organization_members')
      .select(
        `
        organization_id,
        role,
        organizations (
          id,
          name,
          slug
        )
      `
      )
      .eq('user_id', data.user.id);

    return NextResponse.json(
      {
        message: 'Signed in successfully',
        user: {
          id: data.user.id,
          email: data.user.email,
          organizations: memberships || [],
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Login route error:', error);
    return NextResponse.json({ message: 'An unexpected error occurred' }, { status: 500 });
  }
}
