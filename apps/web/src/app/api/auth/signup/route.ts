import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { signUpSchema } from '@/features/auth/schemas/auth.schema';
import { signupRateLimiter } from '@/lib/rate-limiter';
import { headers } from 'next/headers';
import crypto from 'crypto';

function getClientIdentifier(): string {
  const headersList = headers();
  const forwarded = headersList.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
  const userAgent = headersList.get('user-agent') || 'unknown';

  // Create a hash of IP + User Agent for better fingerprinting
  return crypto.createHash('sha256').update(`${ip}:${userAgent}`).digest('hex');
}

export async function POST(request: Request) {
  try {
    // Check rate limiting
    const clientId = getClientIdentifier();
    const { allowed, retryAfter, remainingAttempts } = await signupRateLimiter.checkLimit(clientId);

    if (!allowed) {
      return NextResponse.json(
        {
          message: 'Too many signup attempts. Please try again later.',
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter?.toString() || '3600',
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(Date.now() + (retryAfter || 3600) * 1000).toISOString(),
          },
        }
      );
    }

    const body = await request.json();

    // Validate request body
    const validationResult = signUpSchema.safeParse(body);
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

    const { email, password, fullName } = validationResult.data;
    const supabase = await createClient();

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        {
          message: 'An account with this email already exists',
          field: 'email',
        },
        { status: 400 }
      );
    }

    // Create the user account
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    });

    if (error) {
      console.error('Supabase signup error:', error);

      // Handle specific error cases
      if (error.message.includes('already registered')) {
        return NextResponse.json(
          {
            message: 'An account with this email already exists',
            field: 'email',
          },
          { status: 400 }
        );
      }

      if (error.message.includes('password')) {
        return NextResponse.json(
          {
            message: error.message,
            field: 'password',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { message: error.message || 'Failed to create account' },
        { status: 400 }
      );
    }

    if (!data.user) {
      return NextResponse.json({ message: 'Failed to create account' }, { status: 400 });
    }

    // Record the signup attempt
    await signupRateLimiter.recordFailedAttempt(clientId);

    return NextResponse.json(
      {
        message: 'Account created successfully',
        user: {
          id: data.user.id,
          email: data.user.email,
        },
      },
      {
        status: 201,
        headers: {
          'X-RateLimit-Limit': '5',
          'X-RateLimit-Remaining': (remainingAttempts! - 1).toString(),
          'X-RateLimit-Reset': new Date(Date.now() + 3600000).toISOString(),
        },
      }
    );
  } catch (error) {
    console.error('Signup route error:', error);
    return NextResponse.json({ message: 'An unexpected error occurred' }, { status: 500 });
  }
}
