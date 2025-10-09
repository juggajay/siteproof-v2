import { NextRequest } from 'next/server';
import { vi } from 'vitest';

/**
 * Create a mock NextRequest for testing API routes
 */
export function createMockRequest(options: {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  searchParams?: Record<string, string>;
}): NextRequest {
  const {
    url = 'http://localhost:3000',
    method = 'GET',
    headers = {},
    body,
    searchParams = {},
  } = options;

  // Build URL with search params
  const urlObj = new URL(url);
  Object.entries(searchParams).forEach(([key, value]) => {
    urlObj.searchParams.set(key, value);
  });

  const init: {
    method: string;
    headers: Record<string, string>;
    body?: string | FormData;
    signal?: AbortSignal;
  } = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body && method !== 'GET') {
    if (body instanceof FormData) {
      init.body = body;
      delete (init.headers as any)['Content-Type']; // Let browser set it
    } else {
      init.body = JSON.stringify(body);
    }
  }

  // Cast to any to avoid RequestInit type incompatibility between Next.js and standard types
  return new NextRequest(urlObj.toString(), init as any);
}

/**
 * Create a mock Supabase client for testing
 */
export function createMockSupabaseClient(overrides: any = {}) {
  const mockClient = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
        error: null,
      }),
      ...overrides.auth,
    },
    from: vi.fn((table: string) => {
      const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        then: vi.fn((resolve) => {
          resolve({ data: [], error: null });
        }),
      };

      // Apply table-specific overrides
      if (overrides.from && overrides.from[table]) {
        Object.assign(queryBuilder, overrides.from[table]);
      }

      return queryBuilder;
    }),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: {}, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/file.jpg' },
        }),
      })),
      ...overrides.storage,
    },
    ...overrides,
  };

  return mockClient;
}

/**
 * Extract JSON from a Response
 */
export async function extractJSON(response: Response): Promise<any> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Mock params object for dynamic routes (Next.js 15 requires Promise)
 */
export function createMockParams<T extends Record<string, string>>(
  params: T
): { params: Promise<T> } {
  return {
    params: Promise.resolve(params),
  };
}
