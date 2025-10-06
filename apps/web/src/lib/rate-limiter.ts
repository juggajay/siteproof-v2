// Simple in-memory rate limiter (no Redis dependency)
interface RateLimitRecord {
  attempts: number;
  lastAttempt: number;
  blockedUntil?: number;
}

class LoginRateLimiter {
  private records: Map<string, RateLimitRecord> = new Map();
  private readonly maxAttempts = 5;
  private readonly windowMs = 15 * 60 * 1000; // 15 minutes
  private readonly blockDurationMs = 15 * 60 * 1000; // 15 minutes

  async checkLimit(identifier: string): Promise<{
    allowed: boolean;
    remainingAttempts?: number;
    retryAfter?: number;
  }> {
    const now = Date.now();
    const record = this.records.get(identifier);

    // Clean up old records
    this.cleanup();

    if (!record) {
      return { allowed: true, remainingAttempts: this.maxAttempts };
    }

    // Check if currently blocked
    if (record.blockedUntil && now < record.blockedUntil) {
      const retryAfter = Math.ceil((record.blockedUntil - now) / 1000);
      return { allowed: false, retryAfter, remainingAttempts: 0 };
    }

    // Reset if outside window
    if (now - record.lastAttempt > this.windowMs) {
      this.records.delete(identifier);
      return { allowed: true, remainingAttempts: this.maxAttempts };
    }

    // Check if at limit
    if (record.attempts >= this.maxAttempts) {
      record.blockedUntil = now + this.blockDurationMs;
      const retryAfter = Math.ceil(this.blockDurationMs / 1000);
      return { allowed: false, retryAfter, remainingAttempts: 0 };
    }

    return {
      allowed: true,
      remainingAttempts: this.maxAttempts - record.attempts,
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

// Create a singleton instance
export const loginRateLimiter = new LoginRateLimiter();
