// Simple in-memory rate limiter (no Redis dependency)
interface RateLimitRecord {
  attempts: number;
  lastAttempt: number;
  blockedUntil?: number;
}

export class RateLimiter {
  private records: Map<string, RateLimitRecord> = new Map();
  private readonly maxAttempts: number;
  private readonly windowMs: number;
  private readonly blockDurationMs: number;

  constructor(options: {
    maxAttempts: number;
    windowMs: number;
    blockDurationMs: number;
  }) {
    this.maxAttempts = options.maxAttempts;
    this.windowMs = options.windowMs;
    this.blockDurationMs = options.blockDurationMs;
  }

  async checkLimit(identifier: string): Promise<{
    allowed: boolean;
    remainingAttempts?: number;
    retryAfter?: number;
    limit?: number;
    resetAt?: number;
  }> {
    const now = Date.now();
    const record = this.records.get(identifier);

    // Clean up old records
    this.cleanup();

    if (!record) {
      return {
        allowed: true,
        remainingAttempts: this.maxAttempts,
        limit: this.maxAttempts,
        resetAt: now + this.windowMs
      };
    }

    // Check if currently blocked
    if (record.blockedUntil && now < record.blockedUntil) {
      const retryAfter = Math.ceil((record.blockedUntil - now) / 1000);
      return {
        allowed: false,
        retryAfter,
        remainingAttempts: 0,
        limit: this.maxAttempts,
        resetAt: record.blockedUntil
      };
    }

    // Reset if outside window
    if (now - record.lastAttempt > this.windowMs) {
      this.records.delete(identifier);
      return {
        allowed: true,
        remainingAttempts: this.maxAttempts,
        limit: this.maxAttempts,
        resetAt: now + this.windowMs
      };
    }

    // Check if at limit
    if (record.attempts >= this.maxAttempts) {
      record.blockedUntil = now + this.blockDurationMs;
      const retryAfter = Math.ceil(this.blockDurationMs / 1000);
      return {
        allowed: false,
        retryAfter,
        remainingAttempts: 0,
        limit: this.maxAttempts,
        resetAt: record.blockedUntil
      };
    }

    return {
      allowed: true,
      remainingAttempts: this.maxAttempts - record.attempts,
      limit: this.maxAttempts,
      resetAt: now + this.windowMs
    };
  }

  async recordFailedAttempt(identifier: string): Promise<void> {
    const now = Date.now();
    const record = this.records.get(identifier);

    if (!record) {
      this.records.set(identifier, {
        attempts: 1,
        lastAttempt: now,
      });
    } else {
      record.attempts++;
      record.lastAttempt = now;

      // Block if max attempts reached
      if (record.attempts >= this.maxAttempts) {
        record.blockedUntil = now + this.blockDurationMs;
      }
    }
  }

  async clearAttempts(identifier: string): Promise<void> {
    this.records.delete(identifier);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.records.entries()) {
      // Remove old records that are outside the window and not blocked
      if (
        now - record.lastAttempt > this.windowMs &&
        (!record.blockedUntil || now > record.blockedUntil)
      ) {
        this.records.delete(key);
      }
    }
  }
}

// Compatibility class for existing code
class LoginRateLimiter extends RateLimiter {
  constructor() {
    super({
      maxAttempts: 5,
      windowMs: 15 * 60 * 1000, // 15 minutes
      blockDurationMs: 15 * 60 * 1000, // 15 minutes
    });
  }
}

// Create singleton instances
export const loginRateLimiter = new LoginRateLimiter();
export const signupRateLimiter = new LoginRateLimiter();
export const apiRateLimiter = new LoginRateLimiter();
