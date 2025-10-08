/**
 * Lighthouse CI Configuration
 * Performance budgets and quality gates for the design overhaul
 */

module.exports = {
  ci: {
    collect: {
      // Run multiple times to get consistent results
      numberOfRuns: 3,

      // Server configuration
      startServerCommand: 'pnpm run start',
      startServerReadyPattern: 'ready on',
      startServerReadyTimeout: 30000,

      // URLs to test
      url: [
        'http://localhost:3000',
        'http://localhost:3000/auth/login',
        'http://localhost:3000/dashboard',
        'http://localhost:3000/dashboard/projects',
        'http://localhost:3000/dashboard/ncrs',
        'http://localhost:3000/dashboard/inspections',
        'http://localhost:3000/dashboard/diaries',
      ],

      // Lighthouse settings
      settings: {
        // Desktop preset for primary testing
        preset: 'desktop',

        // Throttling settings (fast 4G)
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
        },

        // Only run performance, accessibility, and best practices
        onlyCategories: ['performance', 'accessibility', 'best-practices'],

        // Skip PWA checks (not relevant for this migration)
        skipAudits: ['service-worker', 'installable-manifest', 'splash-screen', 'themed-omnibox'],
      },
    },

    assert: {
      // Use recommended preset as baseline
      preset: 'lighthouse:recommended',

      // Custom assertions
      assertions: {
        // Category Scores (0-1 scale)
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],

        // Core Web Vitals
        'first-contentful-paint': ['error', { maxNumericValue: 1800 }], // 1.8s
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }], // 2.5s
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }], // 0.1
        'total-blocking-time': ['error', { maxNumericValue: 300 }], // 300ms
        'speed-index': ['error', { maxNumericValue: 3000 }], // 3s
        'interactive': ['warn', { maxNumericValue: 3500 }], // 3.5s

        // Resource Optimization
        'total-byte-weight': ['warn', { maxNumericValue: 500000 }], // 500 KB
        'unused-javascript': ['warn', { maxNumericValue: 100000 }], // 100 KB
        'unused-css-rules': ['warn', { maxNumericValue: 50000 }], // 50 KB
        'modern-image-formats': ['warn', { minScore: 0.8 }],
        'uses-optimized-images': ['warn', { minScore: 0.8 }],
        'uses-text-compression': ['error', { minScore: 1 }],
        'uses-responsive-images': ['warn', { minScore: 0.8 }],

        // JavaScript Optimization
        'bootup-time': ['warn', { maxNumericValue: 3000 }], // 3s
        'mainthread-work-breakdown': ['warn', { maxNumericValue: 4000 }], // 4s
        'dom-size': ['warn', { maxNumericValue: 1500 }], // 1500 nodes

        // Network Optimization
        'uses-long-cache-ttl': ['warn', { minScore: 0.8 }],
        'efficient-animated-content': ['warn', { minScore: 0.9 }],
        'server-response-time': ['warn', { maxNumericValue: 600 }], // 600ms

        // Accessibility (WCAG 2.1 AA)
        'aria-required-attr': 'error',
        'aria-valid-attr': 'error',
        'aria-valid-attr-value': 'error',
        'button-name': 'error',
        'color-contrast': 'error',
        'document-title': 'error',
        'duplicate-id-aria': 'error',
        'html-has-lang': 'error',
        'html-lang-valid': 'error',
        'image-alt': 'error',
        'input-image-alt': 'error',
        'label': 'error',
        'link-name': 'error',
        'list': 'error',
        'listitem': 'error',
        'meta-viewport': 'error',
        'valid-lang': 'error',

        // Best Practices
        'errors-in-console': 'error',
        'no-vulnerable-libraries': 'error',
        'uses-https': 'error',
        'is-on-https': 'error',
        'geolocation-on-start': 'warn',
        'notification-on-start': 'warn',
        'password-inputs-can-be-pasted-into': 'error',
      },
    },

    upload: {
      // Upload to temporary public storage for PR comments
      target: 'temporary-public-storage',

      // Alternative: Upload to custom server
      // target: 'lhci',
      // serverBaseUrl: 'https://lighthouse.siteproof.com',
      // token: process.env.LHCI_TOKEN,
    },
  },
};
