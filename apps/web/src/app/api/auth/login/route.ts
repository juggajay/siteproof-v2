import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { loginSchema } from '@/features/auth/schemas/auth.schema';
import { headers } from 'next/headers';
import crypto from 'crypto';

// In-memory store for failed login attempts (in production, use Redis)
const failedAttempts = new Map<string, { count: number; lastAttempt: number; blockedUntil?: number }>();
const MAX_ATTEMPTS = 3;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes

function getClientIdentifier(_request: Request): string {
  const headersList = headers();
  const forwarded = headersList.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
  const userAgent = headersList.get('user-agent') || 'unknown';
  
  // Create a hash of IP + User Agent for better fingerprinting
  return crypto
    .createHash('sha256')
    .update(`${ip}:${userAgent}`)
    .digest('hex');
}

function checkFailedAttempts(identifier: string): { allowed: boolean; remainingAttempts?: number; blockedUntil?: number } {
  const record = failedAttempts.get(identifier);
  const now = Date.now();

  if (!record) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  // Check if blocked
  if (record.blockedUntil && now < record.blockedUntil) {
    return { allowed: false, blockedUntil: record.blockedUntil };
  }

  // Reset if outside attempt window
  if (now - record.lastAttempt > ATTEMPT_WINDOW) {
    failedAttempts.delete(identifier);
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  // Check if already at max attempts
  if (record.count >= MAX_ATTEMPTS) {
    record.blockedUntil = now + LOCKOUT_DURATION;
    return { allowed: false, blockedUntil: record.blockedUntil };
  }

  return { allowed: true, remainingAttempts: MAX_ATTEMPTS - record.count };
}

function recordFailedAttempt(identifier: string): void {
  const record = failedAttempts.get(identifier) || { count: 0, lastAttempt: 0 };
  record.count++;
  record.lastAttempt = Date.now();
  failedAttempts.set(identifier, record);
}

function clearFailedAttempts(identifier: string): void {
  failedAttempts.delete(identifier);
}

export async function POST(request: Request) {
  try {
    // Check rate limiting for this specific client
    const clientId = getClientIdentifier(request);
    const { allowed, blockedUntil } = checkFailedAttempts(clientId);

    if (!allowed) {
      const retryAfter = Math.ceil((blockedUntil! - Date.now()) / 1000);
      return NextResponse.json(
        { 
          message: 'Too many failed login attempts. Please try again later.',
          retryAfter,
        },
        { 
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
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
      recordFailedAttempt(clientId);
      const { remainingAttempts: remaining } = checkFailedAttempts(clientId);
      
      // Handle specific error cases
      if (error.message.includes('Invalid login credentials')) {
        return NextResponse.json(
          { 
            message: 'Invalid email or password',
            remainingAttempts: remaining,
          },
          { 
            status: 401,
            headers: {
              'X-RateLimit-Remaining': remaining?.toString() || '0',
            },
          }
        );
      }

      return NextResponse.json(
        { 
          message: error.message || 'Failed to sign in',
          remainingAttempts: remaining,
        },
        { status: 400 }
      );
    }

    if (!data.user) {
      return NextResponse.json(
        { message: 'Failed to sign in' },
        { status: 400 }
      );
    }

    // Clear failed attempts on successful login
    clearFailedAttempts(clientId);

    // Update last seen
    await supabase.rpc('update_user_last_seen', {
      user_id: data.user.id,
    });

    // Get user's organizations
    const { data: memberships } = await supabase
      .from('organization_members')
      .select(`
        organization_id,
        role,
        organizations (
          id,
          name,
          slug
        )
      `)
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
    return NextResponse.json(
      { message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}