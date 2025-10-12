# SiteProof Environment Variables Guide

## 1. ALL Required Environment Variables

### Core Supabase (REQUIRED)
```
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Optional but Recommended
```
# For server-side operations (you may have this as SUPABASE_SERVICE_KEY)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Application URL (defaults to http://localhost:3000)
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app

# Email service (Resend) - Without this, email features won't work
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM=SiteProof <notifications@yourdomain.com>

# Weather API (for weather features in diaries)
NEXT_PUBLIC_OPENWEATHER_API_KEY=your-openweather-api-key
```

### Background Jobs (if using Trigger.dev)
```
TRIGGER_API_KEY=your-trigger-api-key
TRIGGER_API_URL=https://api.trigger.dev
```

## 2. Authentication Setup

**NO NextAuth is used!** The app uses Supabase Auth directly. You do NOT need:
- ❌ NEXTAUTH_URL
- ❌ NEXTAUTH_SECRET
- ❌ OAuth keys

Authentication is handled entirely through Supabase using the SUPABASE_URL and SUPABASE_ANON_KEY.

## 3. Database/Prisma

**NO separate database configuration needed!** The app uses Supabase as the database. You do NOT need:
- ❌ DATABASE_URL
- ❌ Prisma configuration

All database operations go through Supabase using the environment variables above.

## 4. Email/Notification Services

The app uses **Resend** for emails:
```
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=SiteProof <notifications@yourdomain.com>
```

Without RESEND_API_KEY, email features will be disabled but the app will still work.

## 5. Local Testing Commands

To test locally with your actual Supabase instance:

```bash
cd apps/web

# Create .env.local with your actual values
cat > .env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-actual-service-key
RESEND_API_KEY=your-resend-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF

# Build and run
pnpm build
pnpm start
```

Then visit http://localhost:3000/auth/login

## 6. 500 Error Causes

The "Server Components render" error is likely due to:

1. **Missing SUPABASE environment variables** - The app tries to create a Supabase client but fails
2. **Invalid SUPABASE_URL format** - Must be a valid URL like `https://xxxxx.supabase.co`
3. **Incorrect SUPABASE_ANON_KEY** - Must be the actual anon key from your Supabase project

To debug:
- Check Vercel function logs for the exact error
- Ensure all environment variables are added in Vercel project settings
- Make sure there are no typos in variable names

## 7. Other Services

### Optional Services (not required for basic functionality):
- **Weather API**: OpenWeatherMap for diary weather data
- **Monitoring**: Sentry for error tracking (optional)
- **Analytics**: Google Analytics or PostHog (optional)
- **Slack**: For notifications (optional)

## Minimum Working Configuration

For a basic working deployment, you only need:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Vercel Deployment Checklist

1. ✅ Add environment variables in Vercel project settings
2. ✅ Ensure Root Directory is set to `apps/web`
3. ✅ Framework should be detected as Next.js
4. ✅ No build command overrides needed
5. ✅ Deploy and check function logs if errors occur

## Common Issues

1. **"Dynamic server usage" errors during build** - These are warnings, not errors. The build should still succeed.

2. **Missing environment variables** - The app validates env vars at startup. Check Vercel function logs for specific missing variables.

3. **Email not working** - Add RESEND_API_KEY or emails will be mocked in console.

4. **Weather not showing** - Add NEXT_PUBLIC_OPENWEATHER_API_KEY for weather features.