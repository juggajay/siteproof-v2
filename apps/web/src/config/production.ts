import { env } from './env';

// Production-specific configuration
export const productionConfig = {
  // Security settings
  security: {
    // Content Security Policy
    csp: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // Remove in future for better security
          "'unsafe-eval'", // Required for Next.js in some cases
          'https://*.supabase.co',
          'https://www.googletagmanager.com',
          'https://www.google-analytics.com',
          env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
        ],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        fontSrc: ["'self'", 'data:'],
        connectSrc: [
          "'self'",
          'https://*.supabase.co',
          'wss://*.supabase.co',
          'https://api.openweathermap.org',
          'https://www.google-analytics.com',
          env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
          env.SENTRY_DSN ? 'https://*.ingest.sentry.io' : '',
        ].filter(Boolean),
        mediaSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'self'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: true,
      },
    },
    
    // Security headers
    headers: {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-DNS-Prefetch-Control': 'on',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self), interest-cohort=()',
    },
    
    // Rate limiting
    rateLimit: {
      windowMs: 60 * 1000, // 1 minute
      auth: {
        max: 5,
        skipSuccessfulRequests: false,
      },
      api: {
        max: 60,
        skipSuccessfulRequests: true,
      },
      general: {
        max: 100,
        skipSuccessfulRequests: true,
      },
    },
    
    // Session configuration
    session: {
      maxAge: 30 * 24 * 60 * 60, // 30 days
      updateAge: 24 * 60 * 60, // 24 hours
      cookie: {
        secure: true,
        httpOnly: true,
        sameSite: 'lax' as const,
      },
    },
  },
  
  // Performance settings
  performance: {
    // Image optimization
    images: {
      domains: ['avatars.githubusercontent.com', 'lh3.googleusercontent.com'],
      formats: ['image/avif', 'image/webp'],
      deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
      imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    },
    
    // API timeouts
    timeouts: {
      default: 30000, // 30 seconds
      upload: 300000, // 5 minutes
      report: 300000, // 5 minutes
    },
    
    // Caching
    cache: {
      // Static assets
      static: {
        maxAge: 31536000, // 1 year
        immutable: true,
      },
      // API responses
      api: {
        public: {
          maxAge: 300, // 5 minutes
          sMaxAge: 600, // 10 minutes
          staleWhileRevalidate: 86400, // 1 day
        },
        private: {
          maxAge: 0,
          sMaxAge: 0,
          noStore: true,
        },
      },
    },
  },
  
  // Logging configuration
  logging: {
    level: 'info',
    // Redact sensitive fields from logs
    redactFields: [
      'password',
      'token',
      'secret',
      'authorization',
      'cookie',
      'x-api-key',
    ],
  },
  
  // Error handling
  errorHandling: {
    // Show generic error messages in production
    exposeErrors: false,
    // Report to Sentry if configured
    reportToSentry: env.NEXT_PUBLIC_ENABLE_SENTRY,
    // Custom error pages
    errorPages: {
      404: '/404',
      500: '/500',
    },
  },
  
  // Feature toggles for production
  features: {
    // Enable service worker for offline support
    serviceWorker: true,
    // Enable aggressive prefetching
    prefetch: true,
    // Enable response compression
    compression: true,
    // Enable HTTP/2 push
    http2Push: true,
  },
};

// Export configuration based on environment
export const getProductionConfig = () => {
  if (!env.NODE_ENV || env.NODE_ENV === 'development') {
    throw new Error('Production configuration should not be used in development');
  }
  
  return productionConfig;
};