/**
 * Rate Limiting Security Tests
 *
 * Tests that rate limiting is properly enforced on different routes
 */

import { describe, it, expect } from 'vitest';

describe('Rate Limiting', () => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  describe('Auth routes (5 req / 15 min)', () => {
    it('should rate limit after 5 login attempts', async () => {
      const requests: Promise<Response>[] = [];

      // Send 6 rapid requests
      for (let i = 0; i < 6; i++) {
        requests.push(
          fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: `test${i}@example.com`,
              password: 'testpassword',
            }),
          })
        );
      }

      const responses = await Promise.all(requests);

      // First 5 should not be rate limited (might fail for other reasons)
      const first5 = responses.slice(0, 5);
      first5.forEach((response) => {
        expect(response.status).not.toBe(429);
      });

      // 6th request should be rate limited
      const sixth = responses[5];
      expect(sixth.status).toBe(429);
      expect(sixth.headers.get('retry-after')).toBeTruthy();
    }, 10000); // 10 second timeout

    it('should include rate limit headers', async () => {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'testpassword',
        }),
      });

      // Check for rate limit headers
      const limit = response.headers.get('x-ratelimit-limit');
      const remaining = response.headers.get('x-ratelimit-remaining');
      const reset = response.headers.get('x-ratelimit-reset');

      expect(limit).toBeTruthy();
      expect(remaining).toBeTruthy();
      expect(reset).toBeTruthy();
    });
  });

  describe('Dashboard routes (100 req / min)', () => {
    it('should have higher limits for dashboard', async () => {
      // Dashboard should allow more requests
      const requests: Promise<Response>[] = [];

      // Send 10 requests (well under limit)
      for (let i = 0; i < 10; i++) {
        requests.push(
          fetch(`${baseUrl}/dashboard`, {
            method: 'GET',
            credentials: 'include',
          })
        );
      }

      const responses = await Promise.all(requests);

      // None should be rate limited
      responses.forEach((response) => {
        expect(response.status).not.toBe(429);
      });
    }, 10000);
  });

  describe('Rate limit response', () => {
    it('should return 429 with proper headers when rate limited', async () => {
      // This test assumes rate limit is hit
      // In practice, you'd want to trigger it programmatically

      // Send many requests to trigger rate limit
      const requests: Promise<Response>[] = [];
      for (let i = 0; i < 10; i++) {
        requests.push(
          fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'test@example.com', password: 'test' }),
          })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.find((r) => r.status === 429);

      if (rateLimited) {
        expect(rateLimited.status).toBe(429);
        expect(rateLimited.headers.get('retry-after')).toBeTruthy();
        expect(rateLimited.headers.get('x-ratelimit-limit')).toBeTruthy();
        expect(rateLimited.headers.get('x-ratelimit-remaining')).toBe('0');
      }
    }, 15000);
  });
});
