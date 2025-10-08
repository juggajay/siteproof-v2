/**
 * Centralized API error handling
 * Provides consistent error responses and prevents information leakage
 */

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

/**
 * Custom API Error class
 */
export class APIError extends Error {
  constructor(
    public statusCode: number,
    public userMessage: string,
    public internalMessage?: string,
    public details?: Record<string, any>
  ) {
    super(internalMessage || userMessage);
    this.name = 'APIError';
  }
}

/**
 * Common API error types
 */
export class UnauthorizedError extends APIError {
  constructor(internalMessage?: string) {
    super(401, 'Unauthorized access', internalMessage || 'User is not authenticated');
  }
}

export class ForbiddenError extends APIError {
  constructor(internalMessage?: string) {
    super(403, 'Access denied', internalMessage || 'User does not have permission');
  }
}

export class NotFoundError extends APIError {
  constructor(resource: string = 'Resource', internalMessage?: string) {
    super(404, `${resource} not found`, internalMessage || `${resource} does not exist`);
  }
}

export class ValidationError extends APIError {
  constructor(errors: Record<string, string[]>, internalMessage?: string) {
    super(400, 'Validation failed', internalMessage || 'Request validation failed', {
      validationErrors: errors,
    });
  }
}

export class ConflictError extends APIError {
  constructor(message: string = 'Resource conflict', internalMessage?: string) {
    super(409, message, internalMessage || 'Resource already exists');
  }
}

export class RateLimitError extends APIError {
  constructor(retryAfter: number = 60) {
    super(429, 'Too many requests', 'Rate limit exceeded', { retryAfter });
  }
}

export class InternalServerError extends APIError {
  constructor(internalMessage?: string) {
    super(500, 'An unexpected error occurred', internalMessage || 'Internal server error');
  }
}

/**
 * Format Zod validation errors
 */
function formatZodErrors(error: ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};

  error.errors.forEach((err) => {
    const path = err.path.join('.');
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(err.message);
  });

  return formatted;
}

/**
 * Handle API errors and return appropriate NextResponse
 */
export function handleAPIError(error: unknown): NextResponse {
  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const validationErrors = formatZodErrors(error);

    console.error('[Validation Error]', {
      errors: validationErrors,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        error: 'Validation failed',
        validationErrors,
      },
      { status: 400 }
    );
  }

  // Handle custom API errors
  if (error instanceof APIError) {
    // Log internal details (not sent to client)
    console.error('[API Error]', {
      statusCode: error.statusCode,
      userMessage: error.userMessage,
      internalMessage: error.internalMessage,
      details: error.details,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    const responseBody: Record<string, any> = {
      error: error.userMessage,
    };

    // Include validation errors if present
    if (error.details?.validationErrors) {
      responseBody.validationErrors = error.details.validationErrors;
    }

    // Include retry-after for rate limit errors
    if (error instanceof RateLimitError && error.details?.retryAfter) {
      return NextResponse.json(responseBody, {
        status: error.statusCode,
        headers: {
          'Retry-After': error.details.retryAfter.toString(),
        },
      });
    }

    return NextResponse.json(responseBody, { status: error.statusCode });
  }

  // Handle unknown errors - never expose details
  console.error('[Unexpected Error]', {
    error,
    message: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString(),
  });

  // In development, include more details
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.json(
      {
        error: 'An unexpected error occurred',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      error: 'An unexpected error occurred',
    },
    { status: 500 }
  );
}

/**
 * Async error wrapper for API routes
 * Automatically catches and handles errors
 */
export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<NextResponse | R>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      const result = await handler(...args);
      if (result instanceof NextResponse) {
        return result;
      }
      return NextResponse.json(result);
    } catch (error) {
      return handleAPIError(error);
    }
  };
}

/**
 * Assert that a condition is true, otherwise throw an error
 */
export function assert(condition: boolean, error: APIError): asserts condition {
  if (!condition) {
    throw error;
  }
}

/**
 * Type guard for checking if user exists
 */
export function assertAuthenticated(user: unknown): asserts user is { id: string } {
  if (!user || typeof user !== 'object' || !('id' in user)) {
    throw new UnauthorizedError('User is not authenticated');
  }
}

/**
 * Assert resource exists
 */
export function assertExists<T>(
  resource: T | null | undefined,
  resourceName: string = 'Resource'
): asserts resource is T {
  if (!resource) {
    throw new NotFoundError(resourceName);
  }
}

/**
 * Assert user has permission
 */
export function assertPermission(hasPermission: boolean, message?: string): void {
  if (!hasPermission) {
    throw new ForbiddenError(message || 'Insufficient permissions');
  }
}
