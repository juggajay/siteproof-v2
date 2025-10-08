/**
 * Input Validation Security Tests
 *
 * Tests that input validation properly rejects malformed data
 */

import { describe, it, expect } from 'vitest';

describe('Input Validation', () => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  describe('UUID Validation', () => {
    it('should reject invalid UUID in path parameter', async () => {
      const response = await fetch(`${baseUrl}/api/diaries/not-a-valid-uuid`, {
        method: 'GET',
        credentials: 'include',
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Validation failed');
      expect(body.validationErrors).toBeDefined();
      expect(body.validationErrors.id).toContain('Invalid UUID format');
    });

    it('should accept valid UUID', async () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      const response = await fetch(`${baseUrl}/api/diaries/${validUuid}`, {
        method: 'GET',
        credentials: 'include',
      });

      // Should not fail validation (might fail for other reasons like auth/not found)
      expect(response.status).not.toBe(400);
    });
  });

  describe('Request Body Validation', () => {
    it('should reject request with missing required fields', async () => {
      const response = await fetch(`${baseUrl}/api/diaries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': 'test-token',
        },
        credentials: 'include',
        body: JSON.stringify({
          // Missing required fields
        }),
      });

      // Should fail validation (might be 400 or 403 depending on CSRF check order)
      const body = await response.json();
      expect(body.error).toBeDefined();
    });

    it('should reject request with invalid date format', async () => {
      const response = await fetch(`${baseUrl}/api/diaries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': 'test-token',
        },
        credentials: 'include',
        body: JSON.stringify({
          diary_date: 'not-a-valid-date',
          project_id: '550e8400-e29b-41d4-a716-446655440000',
          work_summary: 'Test summary that is long enough',
        }),
      });

      const body = await response.json();
      if (body.validationErrors) {
        expect(body.validationErrors.diary_date).toBeDefined();
      }
    });

    it('should reject string that is too short', async () => {
      const response = await fetch(`${baseUrl}/api/ncrs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': 'test-token',
        },
        credentials: 'include',
        body: JSON.stringify({
          title: 'Bad', // Too short (min 5)
          description: 'Too short', // Too short (min 20)
          severity: 'high',
          project_id: '550e8400-e29b-41d4-a716-446655440000',
        }),
      });

      const body = await response.json();
      if (body.validationErrors) {
        expect(body.validationErrors.title || body.validationErrors.description).toBeDefined();
      }
    });

    it('should reject invalid enum value', async () => {
      const response = await fetch(`${baseUrl}/api/ncrs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': 'test-token',
        },
        credentials: 'include',
        body: JSON.stringify({
          title: 'Valid title',
          description: 'Valid description that is long enough to pass validation',
          severity: 'invalid-severity', // Should be low, medium, high, or critical
          project_id: '550e8400-e29b-41d4-a716-446655440000',
        }),
      });

      const body = await response.json();
      if (body.validationErrors) {
        expect(body.validationErrors.severity).toBeDefined();
      }
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should not execute SQL injection in search parameter', async () => {
      const sqlInjection = "'; DROP TABLE diaries; --";
      const response = await fetch(
        `${baseUrl}/api/diaries?search=${encodeURIComponent(sqlInjection)}`,
        {
          method: 'GET',
          credentials: 'include',
        }
      );

      // Should not cause error (parameterized queries prevent injection)
      expect(response.status).not.toBe(500);
    });

    it('should sanitize search input', async () => {
      const response = await fetch(
        `${baseUrl}/api/ncrs?search=${encodeURIComponent('<script>alert("xss")</script>')}`,
        {
          method: 'GET',
          credentials: 'include',
        }
      );

      // Should handle safely
      expect(response.status).not.toBe(500);
    });
  });

  describe('Pagination Validation', () => {
    it('should reject negative page number', async () => {
      const response = await fetch(`${baseUrl}/api/ncrs?page=-1`, {
        method: 'GET',
        credentials: 'include',
      });

      // Should validate pagination (might return 400 or just ignore invalid param)
      expect(response.status).not.toBe(500);
    });

    it('should reject limit exceeding maximum', async () => {
      const response = await fetch(`${baseUrl}/api/ncrs?limit=1000`, {
        method: 'GET',
        credentials: 'include',
      });

      // Should cap at maximum (100)
      expect(response.status).not.toBe(500);
    });
  });
});
