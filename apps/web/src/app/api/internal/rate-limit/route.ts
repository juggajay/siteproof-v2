import { NextRequest, NextResponse } from 'next/server';
import { RateLimiter } from '@/lib/rate-limiter';

export const runtime = 'nodejs';

const RATE_LIMITS = {
  default: { max: 100, windowMs: 60 * 1000, blockMs: 60 * 1000 },
  api: { max: 60, windowMs: 60 * 1000, blockMs: 5 * 60 * 1000 },
  auth: { max: 5, windowMs: 60 * 1000, blockMs: 15 * 60 * 1000 },
} as const;

type RateLimitScope = keyof typeof RATE_LIMITS;

type RateLimiters = {
  [K in RateLimitScope]: RateLimiter;
};

declare global {
  // eslint-disable-next-line no-var
  var __siteproofInternalRateLimiters: RateLimiters | undefined;
}

function getLimiters(): RateLimiters {
  if (globalThis.__siteproofInternalRateLimiters) {
    return globalThis.__siteproofInternalRateLimiters;
  }

  const limiters: RateLimiters = {
    default: new RateLimiter({
      maxAttempts: RATE_LIMITS.default.max,
      windowMs: RATE_LIMITS.default.windowMs,
      blockDurationMs: RATE_LIMITS.default.blockMs,
    }),
    api: new RateLimiter({
      maxAttempts: RATE_LIMITS.api.max,
      windowMs: RATE_LIMITS.api.windowMs,
      blockDurationMs: RATE_LIMITS.api.blockMs,
    }),
    auth: new RateLimiter({
      maxAttempts: RATE_LIMITS.auth.max,
      windowMs: RATE_LIMITS.auth.windowMs,
      blockDurationMs: RATE_LIMITS.auth.blockMs,
    }),
  };

  globalThis.__siteproofInternalRateLimiters = limiters;
  return limiters;
}

function resolveScope(scope: string | undefined): RateLimitScope {
  if (scope === 'api' || scope === 'auth') {
    return scope;
  }
  return 'default';
}

export async function POST(request: NextRequest) {
  const secret = process.env.INTERNAL_RATE_LIMIT_SECRET;
  if (secret) {
    const headerSecret = request.headers.get('x-internal-rate-limit-secret');
    if (headerSecret !== secret) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
  }

  let body: { key?: string; scope?: string };
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
  }

  const key = body.key;
  if (!key) {
    return NextResponse.json({ message: 'Missing rate limit key' }, { status: 400 });
  }

  const scope = resolveScope(body.scope);
  const limiters = getLimiters();
  const limiter = limiters[scope];
  const limits = RATE_LIMITS[scope];

  const result = await limiter.checkLimit(key);

  if (!result.allowed) {
    return NextResponse.json({
      allowed: false,
      limit: result.limit ?? limits.max,
      remaining: 0,
      retryAfter: result.retryAfter ?? Math.ceil(limits.blockMs / 1000),
      resetAt: result.resetAt ?? Date.now() + limits.blockMs,
    });
  }

  await limiter.recordFailedAttempt(key);

  const limit = result.limit ?? limits.max;
  const remainingBefore =
    result.remainingAttempts ??
    limits.max;
  const remaining = Math.max(remainingBefore - 1, 0);

  return NextResponse.json({
    allowed: true,
    limit,
    remaining,
    resetAt: result.resetAt ?? Date.now() + limits.windowMs,
  });
}
