# Deployment Guide

## Prerequisites

1. **GitHub Repository**: Ensure your code is pushed to GitHub
2. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
3. **Supabase Project**: Create a project at [supabase.com](https://supabase.com)
4. **Environment Variables**: Have all required environment variables ready

## Environment Variables

### Required Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Trigger.dev
TRIGGER_API_KEY=your-trigger-api-key
TRIGGER_API_URL=https://api.trigger.dev

# Security
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
SESSION_SECRET=generate-with-openssl-rand-base64-32
```

### Optional Variables

See `.env.example` for the complete list of optional environment variables.

## Deployment Steps

### 1. Set Up Supabase

1. Create a new Supabase project
2. Run database migrations:
   ```bash
   supabase link --project-ref your-project-ref
   supabase db push
   ```
3. Copy your project URL and keys

### 2. Configure GitHub Secrets

Add the following secrets to your GitHub repository:

1. Go to Settings → Secrets and variables → Actions
2. Add these repository secrets:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY`
   - `SUPABASE_PROJECT_REF`
   - `SUPABASE_DB_PASSWORD`
   - `SUPABASE_ACCESS_TOKEN`
   - `TRIGGER_API_KEY`
   - `TRIGGER_API_URL`
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`
   - `SNYK_TOKEN` (optional)
   - `CODECOV_TOKEN` (optional)
   - `SLACK_WEBHOOK_URL` (optional)

### 3. Set Up Vercel

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Link your project:
   ```bash
   vercel link
   ```

3. Add environment variables:
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   # Add all other required variables
   ```

4. Get your Vercel project details:
   ```bash
   vercel project ls
   ```
   Copy the project ID and org ID for GitHub secrets.

### 4. Deploy

#### Automatic Deployment

Push to the `main` branch to trigger automatic deployment:

```bash
git push origin main
```

The GitHub Actions workflow will:
1. Run tests and quality checks
2. Check for security vulnerabilities
3. Build the application
4. Run database migrations
5. Deploy to Vercel

#### Manual Deployment

To deploy manually:

```bash
vercel --prod
```

## Post-Deployment

### 1. Verify Deployment

1. Check the deployment URL
2. Test authentication flow
3. Verify database connections
4. Test file uploads
5. Check background jobs

### 2. Set Up Monitoring

1. **Sentry** (optional):
   - Create a project at [sentry.io](https://sentry.io)
   - Add `SENTRY_DSN` to environment variables
   - Enable `NEXT_PUBLIC_ENABLE_SENTRY`

2. **Analytics** (optional):
   - Set up Google Analytics or PostHog
   - Add tracking IDs to environment variables

### 3. Configure Security

1. **Domain Configuration**:
   - Add custom domain in Vercel
   - Configure SSL certificate
   - Update `NEXT_PUBLIC_APP_URL`

2. **Security Headers**:
   - Headers are automatically applied via middleware
   - Review CSP policy for your specific needs

3. **Rate Limiting**:
   - Default limits are configured
   - For production, consider using Redis:
     ```bash
     vercel env add REDIS_URL
     ```

## Rollback Procedure

If issues arise after deployment:

1. **Immediate Rollback**:
   ```bash
   vercel rollback
   ```

2. **Database Rollback**:
   ```bash
   supabase db reset --db-url $DATABASE_URL
   ```

3. **Fix and Redeploy**:
   - Fix the issue in a new branch
   - Create a pull request
   - Let CI/CD run checks
   - Merge and auto-deploy

## Troubleshooting

### Build Failures

1. Check build logs in Vercel dashboard
2. Common issues:
   - Missing environment variables
   - TypeScript errors
   - Dependency issues

### Database Issues

1. Check Supabase logs
2. Verify RLS policies
3. Test migrations locally first

### Performance Issues

1. Check Vercel Analytics
2. Review Lighthouse scores
3. Enable caching headers
4. Optimize images

## Maintenance

### Regular Tasks

1. **Weekly**:
   - Review Dependabot PRs
   - Check security scan results
   - Monitor error rates

2. **Monthly**:
   - Update dependencies
   - Review and optimize database
   - Check backup status

3. **Quarterly**:
   - Security audit
   - Performance review
   - Cost optimization

## Support

For deployment issues:
1. Check Vercel status page
2. Review Supabase status
3. Check GitHub Actions logs
4. Contact support teams