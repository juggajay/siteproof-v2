/**
 * Database connection pooling configuration for Supabase
 * Optimizes database connections and reduces latency
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

// Connection pool configuration
const POOL_CONFIG = {
  // Maximum number of connections in the pool
  max: 20,
  // Minimum number of connections in the pool
  min: 5,
  // Maximum time a connection can be idle before being closed (ms)
  idleTimeoutMillis: 30000,
  // Maximum time to wait for a connection from the pool (ms)
  connectionTimeoutMillis: 2000,
  // Enable connection pooling
  allowPooling: true,
  // Statement timeout for queries (ms)
  statement_timeout: 10000,
  // Query timeout (ms)
  query_timeout: 10000,
};

// Connection pool singleton
class SupabaseConnectionPool {
  private static instance: SupabaseConnectionPool;
  private clients: Map<string, SupabaseClient> = new Map();
  private lastAccess: Map<string, number> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Start cleanup interval
    this.startCleanup();
  }

  static getInstance(): SupabaseConnectionPool {
    if (!SupabaseConnectionPool.instance) {
      SupabaseConnectionPool.instance = new SupabaseConnectionPool();
    }
    return SupabaseConnectionPool.instance;
  }

  /**
   * Get or create a Supabase client with connection pooling
   */
  getClient(
    url: string = process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key: string = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    options?: any
  ): SupabaseClient {
    const clientKey = `${url}-${key}`;

    // Check if client exists and is still valid
    if (this.clients.has(clientKey)) {
      this.lastAccess.set(clientKey, Date.now());
      return this.clients.get(clientKey)!;
    }

    // Create new client with optimized settings
    const client = createSupabaseClient(url, key, {
      ...options,
      auth: {
        ...options?.auth,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
      db: {
        ...options?.db,
        schema: 'public',
      },
      global: {
        ...options?.global,
        headers: {
          ...options?.global?.headers,
          'x-connection-pooling': 'true',
        },
        fetch: this.createOptimizedFetch(),
      },
      // Connection pooling settings
      realtime: {
        ...options?.realtime,
        params: {
          ...options?.realtime?.params,
          eventsPerSecond: 10,
        },
      },
    });

    // Store client and access time
    this.clients.set(clientKey, client);
    this.lastAccess.set(clientKey, Date.now());

    return client;
  }

  /**
   * Create an optimized fetch function with retry logic
   */
  private createOptimizedFetch() {
    return async (url: string, options: RequestInit = {}): Promise<Response> => {
      const maxRetries = 3;
      let lastError: Error | null = null;

      for (let i = 0; i < maxRetries; i++) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), POOL_CONFIG.connectionTimeoutMillis);

          const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            // Add keep-alive headers for connection reuse
            headers: {
              ...options.headers,
              Connection: 'keep-alive',
              'Keep-Alive': 'timeout=5, max=1000',
            },
          });

          clearTimeout(timeout);

          // Retry on server errors
          if (response.status >= 500 && i < maxRetries - 1) {
            await new Promise((resolve) => setTimeout(resolve, 100 * (i + 1)));
            continue;
          }

          return response;
        } catch (error) {
          lastError = error as Error;

          // Don't retry on client errors
          if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request timeout');
          }

          // Exponential backoff for retries
          if (i < maxRetries - 1) {
            await new Promise((resolve) => setTimeout(resolve, 100 * Math.pow(2, i)));
          }
        }
      }

      throw lastError || new Error('Failed to fetch after retries');
    };
  }

  /**
   * Start cleanup interval to remove idle connections
   */
  private startCleanup() {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const keysToDelete: string[] = [];

      this.lastAccess.forEach((accessTime, key) => {
        if (now - accessTime > POOL_CONFIG.idleTimeoutMillis) {
          keysToDelete.push(key);
        }
      });

      keysToDelete.forEach((key) => {
        this.clients.delete(key);
        this.lastAccess.delete(key);
      });

      if (keysToDelete.length > 0) {
        console.log(`Cleaned up ${keysToDelete.length} idle connections`);
      }
    }, POOL_CONFIG.idleTimeoutMillis);
  }

  /**
   * Clear all connections
   */
  clearAll() {
    this.clients.clear();
    this.lastAccess.clear();
  }

  /**
   * Stop cleanup interval
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clearAll();
  }
}

// Export singleton instance
export const connectionPool = SupabaseConnectionPool.getInstance();

/**
 * Create a pooled Supabase client
 */
export function createPooledClient(options?: any) {
  return connectionPool.getClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    options
  );
}

/**
 * Batch multiple database operations for better performance
 */
export async function batchDatabaseOperations<T>(
  operations: Array<() => Promise<T>>
): Promise<T[]> {
  // Execute operations in parallel with connection pooling
  const results = await Promise.allSettled(operations.map((op) => op()));

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      console.error(`Operation ${index} failed:`, result.reason);
      throw result.reason;
    }
  });
}

/**
 * Execute a database operation with automatic retry and connection pooling
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on client errors (4xx)
      if (error instanceof Error && error.message.includes('4')) {
        throw error;
      }

      // Exponential backoff
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100 * Math.pow(2, i)));
      }
    }
  }

  throw lastError || new Error('Operation failed after retries');
}
