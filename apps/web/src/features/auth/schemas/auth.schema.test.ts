import { describe, it, expect } from 'vitest';
import { loginSchema, signUpSchema } from './auth.schema';

describe('Auth Schemas', () => {
  describe('loginSchema', () => {
    it('validates correct login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('rejects empty email', () => {
      const invalidData = {
        email: '',
        password: 'password123',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Email is required');
      }
    });

    it('rejects invalid email format', () => {
      const invalidData = {
        email: 'not-an-email',
        password: 'password123',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid email address');
      }
    });

    it('rejects empty password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: '',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Password is required');
      }
    });

    it('accepts any non-empty password for login', () => {
      const validData = {
        email: 'test@example.com',
        password: '12345', // Login schema only requires non-empty password
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('signUpSchema', () => {
    it('validates correct signup data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'StrongP@ss123',
        confirmPassword: 'StrongP@ss123',
        fullName: 'John Doe',
        acceptTerms: true,
      };

      const result = signUpSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('rejects mismatched passwords', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'StrongP@ss123',
        confirmPassword: 'DifferentPassword',
        fullName: 'John Doe',
        acceptTerms: true,
      };

      const result = signUpSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Passwords don't match");
      }
    });

    it('rejects weak password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'weak',
        confirmPassword: 'weak',
        fullName: 'John Doe',
        acceptTerms: true,
      };

      const result = signUpSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Password must be at least 8 characters');
      }
    });

    it('rejects empty full name', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'StrongP@ss123',
        confirmPassword: 'StrongP@ss123',
        fullName: '',
        acceptTerms: true,
      };

      const result = signUpSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Full name is required');
      }
    });

    it('rejects when terms not accepted', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'StrongP@ss123',
        confirmPassword: 'StrongP@ss123',
        fullName: 'John Doe',
        acceptTerms: false,
      };

      const result = signUpSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('You must accept the terms and conditions');
      }
    });

    it('validates password requirements', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'password123', // Missing uppercase
        confirmPassword: 'password123',
        fullName: 'John Doe',
        acceptTerms: true,
      };

      const result = signUpSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('uppercase letter');
      }
    });
  });
});