/**
 * Bundle Size Analyzer Utilities
 * Use to track and optimize bundle sizes
 */

export interface BundleStats {
  totalSize: number;
  gzippedSize: number;
  components: {
    name: string;
    size: number;
    gzipped: number;
  }[];
}

/**
 * Performance marks for measuring loading times
 */
export const performanceMarks = {
  start: (name: string) => {
    if (typeof window !== 'undefined' && window.performance) {
      window.performance.mark(`${name}-start`);
    }
  },

  end: (name: string) => {
    if (typeof window !== 'undefined' && window.performance) {
      window.performance.mark(`${name}-end`);
      window.performance.measure(name, `${name}-start`, `${name}-end`);

      const measure = window.performance.getEntriesByName(name)[0];
      console.log(`[Performance] ${name}: ${measure.duration.toFixed(2)}ms`);

      return measure.duration;
    }
    return 0;
  },

  clear: (name: string) => {
    if (typeof window !== 'undefined' && window.performance) {
      window.performance.clearMarks(`${name}-start`);
      window.performance.clearMarks(`${name}-end`);
      window.performance.clearMeasures(name);
    }
  },
};

/**
 * Report Web Vitals to analytics
 */
export function reportWebVitals(metric: any) {
  if (process.env.NODE_ENV === 'production') {
    // Send to analytics endpoint
    console.log('[Web Vitals]', metric);

    // You can send to your analytics service here
    // Example: analytics.track(metric.name, metric.value);
  }
}

/**
 * Monitor bundle sizes in development
 */
export function logBundleSize() {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    const resources = window.performance.getEntriesByType('resource');
    const jsResources = resources.filter(r => r.name.endsWith('.js'));

    const totalSize = jsResources.reduce((acc: number, r: any) => acc + (r.transferSize || 0), 0);
    const gzippedSize = jsResources.reduce((acc: number, r: any) => acc + (r.encodedBodySize || 0), 0);

    console.group('[Bundle Analysis]');
    console.log(`Total JS: ${(totalSize / 1024).toFixed(2)} KB`);
    console.log(`Gzipped: ${(gzippedSize / 1024).toFixed(2)} KB`);
    console.log(`Files: ${jsResources.length}`);

    if (gzippedSize > 300 * 1024) {
      console.warn('⚠️ Bundle size exceeds 300KB!');
    }
    console.groupEnd();
  }
}
