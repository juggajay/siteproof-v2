import { z } from 'zod';

// Environment variable validation schema
const envSchema = z.object({
  // Required environment variables
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_KEY: z.string().min(1).optional(),
  
  // Trigger.dev
  TRIGGER_API_KEY: z.string().min(1).optional(),
  TRIGGER_API_URL: z.string().url().optional(),
  
  // Application
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_SITE_NAME: z.string().default('SiteProof'),
  
  // Security
  NEXTAUTH_SECRET: z.string().min(32).optional(),
  SESSION_SECRET: z.string().min(32).optional(),
  
  // Rate limiting
  REDIS_URL: z.string().optional(),
  
  // File upload
  NEXT_PUBLIC_MAX_FILE_SIZE: z.string().transform(Number).default('10485760'),
  NEXT_PUBLIC_ALLOWED_FILE_TYPES: z.string().default('image/*,application/pdf'),
  
  // Email (optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),
  
  // Monitoring (optional)
  SENTRY_DSN: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
  
  // Analytics (optional)
  NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
  
  // Weather API
  NEXT_PUBLIC_WEATHER_API_KEY: z.string().optional(),
  
  // Slack (optional)
  SLACK_CLIENT_ID: z.string().optional(),
  SLACK_CLIENT_SECRET: z.string().optional(),
  SLACK_WEBHOOK_URL: z.string().url().optional(),
  
  // Feature flags
  NEXT_PUBLIC_ENABLE_PWA: z.string().transform(val => val === 'true').default('false'),
  NEXT_PUBLIC_ENABLE_ANALYTICS: z.string().transform(val => val === 'true').default('false'),
  NEXT_PUBLIC_ENABLE_SENTRY: z.string().transform(val => val === 'true').default('false'),
  
  // Environment
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  VERCEL_ENV: z.enum(['production', 'preview', 'development']).optional(),
});

// Parse and validate environment variables
const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(e => e.path.join('.')).join(', ');
      throw new Error(`Missing or invalid environment variables: ${missingVars}`);
    }
    throw error;
  }
};

// Export validated environment variables
export const env = parseEnv();

// Environment helpers
export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

// Feature flags
export const features = {
  pwa: env.NEXT_PUBLIC_ENABLE_PWA,
  analytics: env.NEXT_PUBLIC_ENABLE_ANALYTICS,
  sentry: env.NEXT_PUBLIC_ENABLE_SENTRY,
} as const;

// Configuration objects
export const config = {
  app: {
    url: env.NEXT_PUBLIC_APP_URL,
    name: env.NEXT_PUBLIC_SITE_NAME,
  },
  
  supabase: {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceKey: env.SUPABASE_SERVICE_KEY,
  },
  
  trigger: {
    apiKey: env.TRIGGER_API_KEY,
    apiUrl: env.TRIGGER_API_URL,
  },
  
  upload: {
    maxFileSize: env.NEXT_PUBLIC_MAX_FILE_SIZE,
    allowedTypes: env.NEXT_PUBLIC_ALLOWED_FILE_TYPES.split(','),
  },
  
  email: env.SMTP_HOST ? {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT!,
    user: env.SMTP_USER!,
    pass: env.SMTP_PASS!,
    from: env.SMTP_FROM!,
  } : undefined,
  
  monitoring: {
    sentry: env.SENTRY_DSN ? {
      dsn: env.SENTRY_DSN,
      authToken: env.SENTRY_AUTH_TOKEN,
      org: env.SENTRY_ORG,
      project: env.SENTRY_PROJECT,
    } : undefined,
  },
  
  analytics: {
    ga: env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
    posthog: env.NEXT_PUBLIC_POSTHOG_KEY ? {
      key: env.NEXT_PUBLIC_POSTHOG_KEY,
      host: env.NEXT_PUBLIC_POSTHOG_HOST!,
    } : undefined,
  },
  
  integrations: {
    weather: {
      apiKey: env.NEXT_PUBLIC_WEATHER_API_KEY,
    },
    slack: env.SLACK_CLIENT_ID ? {
      clientId: env.SLACK_CLIENT_ID,
      clientSecret: env.SLACK_CLIENT_SECRET!,
      webhookUrl: env.SLACK_WEBHOOK_URL,
    } : undefined,
  },
} as const;