import { getRedisClient, isRedisAvailable } from '@/lib/redis/client';

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts?: number;
  blockedUntil?: number;
  retryAfter?: number;
  limit?: number;
  remaining?: number;
  resetAt?: number;
}

interface RateLimitOptions {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
}

// In-memory fallback for when Redis is not available
const inMemoryStore = new Map<
  string,
  { count: number; lastAttempt: number; blockedUntil?: number }
>();

export class RateLimiter {
  private redis = getRedisClient();
  private useRedis = true;

  constructor(private options: RateLimitOptions) {
    // Check if Redis is available on initialization
    isRedisAvailable().then((available) => {
      this.useRedis = available;
      if (!available) {
        console.warn('RateLimiter: Falling back to in-memory storage');
      }
    });
  }

  async checkLimit(identifier: string): Promise<RateLimitResult> {
    if (this.useRedis) {
      try {
        return await this.checkLimitRedis(identifier);
      } catch (error) {
        console.error('Redis rate limit check failed, falling back to in-memory:', error);
        this.useRedis = false;
      }
    }

    return this.checkLimitInMemory(identifier);
  }

  async recordFailedAttempt(identifier: string): Promise<void> {
    if (this.useRedis) {
      try {
        await this.recordFailedAttemptRedis(identifier);
        return;
      } catch (error) {
        console.error('Redis record failed attempt failed, falling back to in-memory:', error);
        this.useRedis = false;
      }
    }

    this.recordFailedAttemptInMemory(identifier);
  }

  async clearAttempts(identifier: string): Promise<void> {
    if (this.useRedis) {
      try {
        await this.clearAttemptsRedis(identifier);
        return;
      } catch (error) {
        console.error('Redis clear attempts failed, falling back to in-memory:', error);
        this.useRedis = false;
      }
    }

    this.clearAttemptsInMemory(identifier);
  }

  // Redis implementations
  private async checkLimitRedis(identifier: string): Promise<RateLimitResult> {
    const now = Date.now();
    const blockKey = `block:${identifier}`;
    const attemptsKey = `attempts:${identifier}`;

    // Check if blocked
    const blockedUntil = await this.redis.get(blockKey);
    if (blockedUntil) {
      const blockedUntilMs = parseInt(blockedUntil, 10);
      if (now < blockedUntilMs) {
        const retryAfter = Math.ceil((blockedUntilMs - now) / 1000);
        return {
          allowed: false,
          blockedUntil: blockedUntilMs,
          retryAfter,
          limit: this.options.maxAttempts,
          remaining: 0,
          resetAt: blockedUntilMs,
        };
      } else {
        // Block expired, remove it
        await this.redis.del(blockKey);
      }
    }

    // Get current attempts
    const attempts = await this.redis.get(attemptsKey);
    const attemptCount = attempts ? parseInt(attempts, 10) : 0;

    if (attemptCount >= this.options.maxAttempts) {
      // Block the user
      const blockedUntilMs = now + this.options.blockDurationMs;
      await this.redis.setex(
        blockKey,
        Math.ceil(this.options.blockDurationMs / 1000),
        blockedUntilMs.toString()
      );
      const retryAfter = Math.ceil(this.options.blockDurationMs / 1000);
      return {
        allowed: false,
        blockedUntil: blockedUntilMs,
        retryAfter,
        limit: this.options.maxAttempts,
        remaining: 0,
        resetAt: blockedUntilMs,
      };
    }

    const resetAt = now + this.options.windowMs;
    return {
      allowed: true,
      remainingAttempts: this.options.maxAttempts - attemptCount,
      limit: this.options.maxAttempts,
      remaining: this.options.maxAttempts - attemptCount,
      resetAt,
    };
  }

  private async recordFailedAttemptRedis(identifier: string): Promise<void> {
    const attemptsKey = `attempts:${identifier}`;
    const ttl = Math.ceil(this.options.windowMs / 1000);

    // Increment attempts with TTL
    const attempts = await this.redis.incr(attemptsKey);
    if (attempts === 1) {
      // First attempt, set TTL
      await this.redis.expire(attemptsKey, ttl);
    }
  }

  private async clearAttemptsRedis(identifier: string): Promise<void> {
    const attemptsKey = `attempts:${identifier}`;
    const blockKey = `block:${identifier}`;
    await this.redis.del(attemptsKey, blockKey);
  }

  // In-memory implementations (fallback)
  private checkLimitInMemory(identifier: string): RateLimitResult {
    const record = inMemoryStore.get(identifier);
    const now = Date.now();

    if (!record) {
      const resetAt = now + this.options.windowMs;
      return {
        allowed: true,
        remainingAttempts: this.options.maxAttempts,
        limit: this.options.maxAttempts,
        remaining: this.options.maxAttempts,
        resetAt,
      };
    }

    // Check if blocked
    if (record.blockedUntil && now < record.blockedUntil) {
      const retryAfter = Math.ceil((record.blockedUntil - now) / 1000);
      return {
        allowed: false,
        blockedUntil: record.blockedUntil,
        retryAfter,
        limit: this.options.maxAttempts,
        remaining: 0,
        resetAt: record.blockedUntil,
      };
    }

    // Reset if outside attempt window
    if (now - record.lastAttempt > this.options.windowMs) {
      inMemoryStore.delete(identifier);
      const resetAt = now + this.options.windowMs;
      return {
        allowed: true,
        remainingAttempts: this.options.maxAttempts,
        limit: this.options.maxAttempts,
        remaining: this.options.maxAttempts,
        resetAt,
      };
    }

    // Check if already at max attempts
    if (record.count >= this.options.maxAttempts) {
      record.blockedUntil = now + this.options.blockDurationMs;
      const retryAfter = Math.ceil(this.options.blockDurationMs / 1000);
      return {
        allowed: false,
        blockedUntil: record.blockedUntil,
        retryAfter,
        limit: this.options.maxAttempts,
        remaining: 0,
        resetAt: record.blockedUntil,
      };
    }

    const resetAt = record.lastAttempt + this.options.windowMs;
    return {
      allowed: true,
      remainingAttempts: this.options.maxAttempts - record.count,
      limit: this.options.maxAttempts,
      remaining: this.options.maxAttempts - record.count,
      resetAt,
    };
  }

  private recordFailedAttemptInMemory(identifier: string): void {
    const record = inMemoryStore.get(identifier) || { count: 0, lastAttempt: 0 };
    record.count++;
    record.lastAttempt = Date.now();
    inMemoryStore.set(identifier, record);

    // Clean up old entries periodically
    if (Math.random() < 0.01) {
      // 1% chance on each call
      this.cleanupInMemoryStore();
    }
  }

  private clearAttemptsInMemory(identifier: string): void {
    inMemoryStore.delete(identifier);
  }

  private cleanupInMemoryStore(): void {
    const now = Date.now();
    for (const [key, value] of inMemoryStore.entries()) {
      if (now - value.lastAttempt > this.options.windowMs * 2) {
        inMemoryStore.delete(key);
      }
    }
  }
}

// Create singleton instances for different use cases
export const loginRateLimiter = new RateLimiter({
  maxAttempts: 3,
  windowMs: 15 * 60 * 1000, // 15 minutes
  blockDurationMs: 15 * 60 * 1000, // 15 minutes
});

export const signupRateLimiter = new RateLimiter({
  maxAttempts: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
  blockDurationMs: 60 * 60 * 1000, // 1 hour
});

export const apiRateLimiter = new RateLimiter({
  maxAttempts: 100,
  windowMs: 60 * 1000, // 1 minute
  blockDurationMs: 5 * 60 * 1000, // 5 minutes
});
