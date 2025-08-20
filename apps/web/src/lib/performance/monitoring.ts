/**
 * Performance monitoring utilities for tracking and reporting performance metrics
 */

interface PerformanceEntry {
  name: string;
  startTime: number;
  duration: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private entries: Map<string, PerformanceEntry> = new Map();
  private marks: Map<string, number> = new Map();

  /**
   * Start measuring performance for an operation
   */
  startMeasure(name: string, metadata?: Record<string, any>): void {
    const startTime = performance.now();
    this.marks.set(name, startTime);

    if (metadata) {
      this.entries.set(name, {
        name,
        startTime,
        duration: 0,
        metadata,
      });
    }
  }

  /**
   * End measuring performance for an operation
   */
  endMeasure(name: string): number {
    const startTime = this.marks.get(name);
    if (!startTime) {
      console.warn(`No start mark found for "${name}"`);
      return 0;
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    const entry: PerformanceEntry = {
      name,
      startTime,
      duration,
      ...(this.entries.get(name) || {}),
    };

    this.entries.set(name, entry);
    this.marks.delete(name);

    // Log slow operations
    if (duration > 100) {
      console.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  /**
   * Get all performance entries
   */
  getEntries(): PerformanceEntry[] {
    return Array.from(this.entries.values());
  }

  /**
   * Get entry by name
   */
  getEntry(name: string): PerformanceEntry | undefined {
    return this.entries.get(name);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries.clear();
    this.marks.clear();
  }

  /**
   * Report performance metrics to analytics
   */
  report(): void {
    const entries = this.getEntries();

    // Group by operation type
    const grouped = entries.reduce(
      (acc, entry) => {
        const type = entry.name.split(':')[0];
        if (!acc[type]) {
          acc[type] = [];
        }
        acc[type].push(entry);
        return acc;
      },
      {} as Record<string, PerformanceEntry[]>
    );

    // Calculate statistics
    Object.entries(grouped).forEach(([type, typeEntries]) => {
      const durations = typeEntries.map((e) => e.duration);
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      const max = Math.max(...durations);
      const min = Math.min(...durations);

      console.log(`Performance Report - ${type}:`, {
        count: typeEntries.length,
        avgDuration: `${avg.toFixed(2)}ms`,
        maxDuration: `${max.toFixed(2)}ms`,
        minDuration: `${min.toFixed(2)}ms`,
      });
    });

    // Send to analytics if available
    if (typeof window !== 'undefined' && (window as any).gtag) {
      entries.forEach((entry) => {
        (window as any).gtag('event', 'timing_complete', {
          name: entry.name,
          value: Math.round(entry.duration),
          event_category: 'Performance',
        });
      });
    }
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * React hook for measuring component render performance
 */
export function useRenderPerformance(componentName: string) {
  const renderCount = useRef(0);
  const renderTimes = useRef<number[]>([]);

  useEffect(() => {
    const startTime = performance.now();
    renderCount.current++;

    return () => {
      const renderTime = performance.now() - startTime;
      renderTimes.current.push(renderTime);

      // Log slow renders
      if (renderTime > 16.67) {
        // Slower than 60fps
        console.warn(`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
      }

      // Report every 10 renders
      if (renderCount.current % 10 === 0) {
        const avg = renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length;
        console.log(`${componentName} render performance:`, {
          renderCount: renderCount.current,
          avgRenderTime: `${avg.toFixed(2)}ms`,
          lastRenderTime: `${renderTime.toFixed(2)}ms`,
        });
      }
    };
  });
}

/**
 * Measure API call performance
 */
export async function measureApiCall<T>(name: string, apiCall: () => Promise<T>): Promise<T> {
  performanceMonitor.startMeasure(`api:${name}`);

  try {
    const result = await apiCall();
    const duration = performanceMonitor.endMeasure(`api:${name}`);

    // Log slow API calls
    if (duration > 1000) {
      console.warn(`Slow API call: ${name} took ${duration.toFixed(2)}ms`);
    }

    return result;
  } catch (error) {
    performanceMonitor.endMeasure(`api:${name}`);
    throw error;
  }
}

/**
 * Measure database query performance
 */
export function measureQuery<T>(queryName: string, queryFn: () => T): T {
  performanceMonitor.startMeasure(`db:${queryName}`);

  try {
    const result = queryFn();
    performanceMonitor.endMeasure(`db:${queryName}`);
    return result;
  } catch (error) {
    performanceMonitor.endMeasure(`db:${queryName}`);
    throw error;
  }
}

/**
 * Web Vitals monitoring
 */
export function reportWebVitals(metric: any) {
  const { name, value, id } = metric;

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`Web Vital - ${name}:`, {
      value: `${value.toFixed(2)}ms`,
      id,
    });
  }

  // Send to analytics
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', name, {
      value: Math.round(value),
      event_category: 'Web Vitals',
      event_label: id,
    });
  }
}

import { useRef, useEffect } from 'react';
