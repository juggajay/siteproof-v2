# Deployment Ready Checklist

**Date**: October 8, 2025
**Migration**: Design System V2 Overhaul
**Strategy**: Zero-Downtime, Phased Rollout

---

## Documentation Complete ✅

### Core Documents
- [x] Production Safety Architecture (`/docs/production-safety-architecture.md`)
- [x] Rollback Procedure Runbook (`/docs/runbooks/rollback-procedure.md`)
- [x] Incident Response Checklist (`/docs/runbooks/incident-response-checklist.md`)
- [x] Design Overhaul Strategy (`/docs/design-overhaul-strategy.md`)
- [x] Design System Architecture (`/docs/design-system-architecture.md`)

### Configuration Files
- [x] Emergency Rollback Script (`/scripts/emergency-rollback.sh`)
- [x] Lighthouse CI Configuration (`.lighthouserc.js`)
- [x] Percy Visual Testing Config (`.percy.yml`)
- [x] Environment Variable Templates (`.env.production.example`)

---

## Pre-Implementation Setup

### 1. Feature Flag Infrastructure

**Tool**: Flagsmith (Self-Hosted)

**Setup Steps**:

```bash
# 1. Deploy Flagsmith (Docker)
docker run -d \
  -p 8000:8000 \
  -e DATABASE_URL=your_postgres_url \
  flagsmith/flagsmith:latest

# 2. Create environments
# - Development
# - Staging
# - Production

# 3. Create feature flags
# See: /docs/production-safety-architecture.md#flag-hierarchy
```

**Required Flags**:
- [ ] `design-system-v2` (global toggle)
- [ ] `design-system-rollout-percentage` (integer value)
- [ ] `new-navigation`
- [ ] `new-dashboard-widgets`
- [ ] `new-form-components`
- [ ] `new-mobile-ui`
- [ ] `new-data-tables`
- [ ] `new-modals`

**Segments to Create**:
- [ ] Internal team (`email CONTAINS @siteproof.com`)
- [ ] Beta users (`trait beta_tester = true`)
- [ ] Power users (`trait user_role IN [admin, project_manager]`)
- [ ] 50% rollout (`percentage_split = 50`)

### 2. Monitoring Tools

#### Sentry (Error Tracking)

```bash
# Install Sentry CLI
pnpm add -g @sentry/cli

# Create Sentry project
sentry-cli projects create siteproof-v2 \
  --org siteproof \
  --team platform

# Configure source maps upload
# Add to vercel.json or next.config.mjs
```

**Setup Checklist**:
- [ ] Organization created: `siteproof`
- [ ] Project created: `siteproof-v2`
- [ ] Source maps configured
- [ ] Alert rules set:
  - [ ] Error rate > 5% (critical)
  - [ ] Error rate > 2% (warning)
  - [ ] New error type (info)
- [ ] Slack integration configured
- [ ] Team members invited

#### PostHog (User Analytics)

```bash
# Self-hosted or cloud
# Cloud: https://app.posthog.com

# Create project: SiteProof V2
# Enable session recording
# Configure feature flag integration
```

**Setup Checklist**:
- [ ] Project created
- [ ] API key obtained
- [ ] Session recording enabled (10% sample rate)
- [ ] Feature flag tracking enabled
- [ ] User identification configured
- [ ] Event tracking validated

#### Vercel Analytics

**Setup Checklist**:
- [ ] Web Analytics enabled (automatic)
- [ ] Speed Insights enabled
- [ ] Audience insights configured
- [ ] Custom events defined

### 3. Testing Infrastructure

#### Playwright (E2E Testing)

```bash
# Install dependencies
pnpm add -D @playwright/test

# Install browsers
pnpm playwright install --with-deps

# Run tests
pnpm playwright test
```

**Setup Checklist**:
- [ ] Config file updated (`playwright.config.ts`)
- [ ] Test fixtures created
- [ ] Critical path tests written:
  - [ ] Authentication flow
  - [ ] Dashboard load
  - [ ] ITP form submission
  - [ ] NCR workflow
  - [ ] Daily diary export
- [ ] CI/CD integration configured
- [ ] Test reports uploaded

#### Percy (Visual Regression)

```bash
# Install Percy
pnpm add -D @percy/cli @percy/playwright

# Create project at https://percy.io
# Add PERCY_TOKEN to environment
```

**Setup Checklist**:
- [ ] Percy project created
- [ ] API token obtained
- [ ] Config file created (`.percy.yml`)
- [ ] Baseline snapshots captured
- [ ] CI/CD integration configured
- [ ] Review workflow established

#### Lighthouse CI (Performance)

```bash
# Install Lighthouse CI
pnpm add -D @lhci/cli

# Run locally
pnpm lighthouse:ci
```

**Setup Checklist**:
- [ ] Config file created (`.lighthouserc.js`)
- [ ] Performance budgets set
- [ ] CI/CD integration configured
- [ ] Assertions configured
- [ ] Dashboard setup (optional)

### 4. Deployment Pipeline

#### Vercel Configuration

```bash
# Install Vercel CLI
pnpm add -g vercel

# Link project
vercel link

# Set environment variables
vercel env add NEXT_PUBLIC_FLAGSMITH_ENV_ID production
vercel env add NEXT_PUBLIC_SENTRY_DSN production
vercel env add NEXT_PUBLIC_POSTHOG_KEY production
```

**Setup Checklist**:
- [ ] Project linked to Vercel
- [ ] Environment variables set (see `.env.production.example`)
- [ ] Build command verified
- [ ] Preview deployments enabled
- [ ] Production branch: `main`
- [ ] Auto-deploy enabled
- [ ] Domain configured
- [ ] SSL certificate active

#### GitHub Actions (CI/CD)

**Workflows to Create**:

1. **Test Suite** (`.github/workflows/test-suite.yml`)
   - Unit tests
   - Integration tests
   - E2E tests
   - Visual regression
   - Accessibility tests
   - Performance benchmarks

2. **Deployment** (`.github/workflows/deploy.yml`)
   - Build verification
   - Test gate
   - Deploy to Vercel
   - Post-deployment validation

3. **Rollback Test** (`.github/workflows/rollback-test.yml`)
   - Monthly rollback drill
   - Verify rollback procedures

**Setup Checklist**:
- [ ] Workflows created
- [ ] GitHub Secrets configured:
  - [ ] `VERCEL_TOKEN`
  - [ ] `PERCY_TOKEN`
  - [ ] `SENTRY_AUTH_TOKEN`
  - [ ] `FLAGSMITH_API_TOKEN`
  - [ ] `SLACK_WEBHOOK_URL`
- [ ] Branch protection rules set
- [ ] Required checks configured
- [ ] Auto-merge rules (optional)

### 5. Communication Channels

#### Slack Workspace

**Channels to Create**:
- [ ] `#design-system-v2` - General discussion
- [ ] `#incidents` - Production incidents
- [ ] `#deployments` - Deployment notifications
- [ ] `#user-feedback` - User feedback collection
- [ ] `#monitoring-alerts` - Automated alerts

**Integrations**:
- [ ] Sentry → `#incidents`
- [ ] Vercel → `#deployments`
- [ ] PagerDuty → `#incidents`
- [ ] GitHub Actions → `#deployments`

#### Status Page

**Options**:
- Statuspage.io (paid)
- Instatus (paid)
- Custom Next.js page (free)

**Setup Checklist**:
- [ ] Status page created: `status.siteproof.com`
- [ ] Components defined:
  - [ ] Application
  - [ ] API
  - [ ] Database
  - [ ] Authentication
- [ ] Incident templates created
- [ ] Subscriber list imported
- [ ] Email notifications configured

### 6. On-Call Rotation

#### PagerDuty Setup

```bash
# Create service: "Design System V2 Rollout"
# Add escalation policies
# Configure alert rules
```

**Setup Checklist**:
- [ ] Service created
- [ ] Escalation policy defined:
  - [ ] Primary: On-call engineer (5 min)
  - [ ] Secondary: Engineering lead (10 min)
  - [ ] Tertiary: CTO (15 min)
- [ ] Schedule created
- [ ] Team members added
- [ ] Mobile app installed
- [ ] Test alert sent

---

## Implementation Checklist

### Phase 0: Pre-Flight (Before Week 1)

**Infrastructure**:
- [ ] Flagsmith deployed and configured
- [ ] Sentry project created
- [ ] PostHog project created
- [ ] Vercel production ready
- [ ] CI/CD pipelines tested

**Code**:
- [ ] Feature flag provider implemented
- [ ] Error boundaries added
- [ ] Analytics tracking added
- [ ] Monitoring instrumentation complete
- [ ] Backup scripts created
- [ ] Migration scripts tested

**Testing**:
- [ ] E2E test suite complete
- [ ] Visual regression baseline captured
- [ ] Accessibility audit passed
- [ ] Performance benchmarks set
- [ ] Load testing completed

**Team**:
- [ ] Documentation reviewed by team
- [ ] Runbooks practiced
- [ ] Roles assigned
- [ ] On-call rotation scheduled
- [ ] Emergency contacts shared

### Phase 1: Internal Testing (Week 1)

**Deployment**:
- [ ] Deploy to staging
- [ ] Enable flags for internal team
- [ ] Smoke tests passing
- [ ] Performance within budget

**Validation**:
- [ ] All components functional
- [ ] No critical bugs
- [ ] Team approval obtained
- [ ] Monitoring validated

**Go/No-Go Criteria**:
- [ ] Zero P0/P1 bugs
- [ ] Performance within 10% of baseline
- [ ] 100% internal team approval
- [ ] Rollback tested successfully

### Phase 2: Beta Rollout (Week 2-3)

**Deployment**:
- [ ] Set rollout percentage to 5%
- [ ] Enable for beta users
- [ ] Monitor continuously

**Validation**:
- [ ] Error rate < 1%
- [ ] Performance degradation < 10%
- [ ] Positive feedback > 70%
- [ ] No critical issues

**Go/No-Go Criteria**:
- [ ] Error rate stable at < 1%
- [ ] No user-reported critical bugs
- [ ] Performance acceptable
- [ ] Support ticket increase < 20%

### Phase 3: Controlled Expansion (Week 4-5)

**Deployment**:
- [ ] Increase rollout to 50%
- [ ] A/B testing active
- [ ] Enhanced monitoring

**Validation**:
- [ ] Error rate < 0.5%
- [ ] Performance on par with V1
- [ ] NPS > 40
- [ ] Feature adoption > 60%

**Go/No-Go Criteria**:
- [ ] All metrics within targets
- [ ] Zero P0/P1 incidents
- [ ] User satisfaction high
- [ ] Team confidence high

### Phase 4: Full Rollout (Week 6)

**Deployment**:
- [ ] Set rollout to 100%
- [ ] 24/7 monitoring active
- [ ] On-call rotation active

**Validation**:
- [ ] Error rate < 0.3%
- [ ] All performance targets met
- [ ] User satisfaction > 4.0/5.0
- [ ] Feature adoption > 80%

**Success Criteria**:
- [ ] All metrics within targets for 72 hours
- [ ] Zero rollbacks needed
- [ ] Positive user feedback
- [ ] Team satisfaction high

---

## Installation Commands

```bash
# 1. Install monitoring dependencies
pnpm add @sentry/nextjs
pnpm add posthog-js posthog-js/react
pnpm add flagsmith

# 2. Install testing dependencies
pnpm add -D @playwright/test @percy/playwright @percy/cli
pnpm add -D @axe-core/playwright jest-axe
pnpm add -D @lhci/cli

# 3. Install build dependencies
pnpm add -D webpack-bundle-analyzer
pnpm add -D @vercel/analytics

# 4. Install development tools
pnpm add -g @sentry/cli
pnpm add -g vercel
pnpm add -g lighthouse

# 5. Initialize configuration
pnpm playwright install --with-deps
```

---

## Quick Start Guide

### For Developers

```bash
# 1. Clone and install
git clone <repo>
cd siteproof-v2
pnpm install

# 2. Copy environment variables
cp .env.example .env.local
# Edit .env.local with your values

# 3. Run tests
pnpm test           # Unit tests
pnpm test:e2e       # E2E tests
pnpm test:a11y      # Accessibility tests

# 4. Start development server
pnpm dev

# 5. Enable new design locally
# Set in .env.local:
NEXT_PUBLIC_ENABLE_NEW_DESIGN=true
```

### For QA Engineers

```bash
# Run full test suite
pnpm test:all

# Run visual regression tests
pnpm percy:test

# Run performance tests
pnpm lighthouse:ci

# Run accessibility audit
pnpm test:a11y
```

### For DevOps Engineers

```bash
# Deploy to staging
vercel --env=preview

# Deploy to production
vercel --prod

# Execute rollback
./scripts/emergency-rollback.sh "reason"

# Verify rollback
npm run verify:rollback
```

---

## Support Resources

### Documentation
- [Production Safety Architecture](/docs/production-safety-architecture.md)
- [Rollback Procedure](/docs/runbooks/rollback-procedure.md)
- [Incident Response](/docs/runbooks/incident-response-checklist.md)
- [Design System Docs](/docs/design-system-architecture.md)

### Monitoring Dashboards
- Sentry: https://sentry.io/siteproof
- PostHog: https://app.posthog.com/project/siteproof
- Vercel: https://vercel.com/siteproof/analytics
- Flagsmith: https://flagsmith.siteproof.com

### Communication
- Slack: `#design-system-v2`, `#incidents`
- PagerDuty: https://siteproof.pagerduty.com
- Status Page: https://status.siteproof.com

---

## Success Metrics

### Technical Health
- ✅ Error rate < 0.5%
- ✅ Uptime > 99.9%
- ✅ Page load < 3s
- ✅ Core Web Vitals: "Good"

### User Experience
- ✅ NPS > 40
- ✅ CSAT > 4.0/5.0
- ✅ Feature adoption > 80%
- ✅ Support tickets < baseline + 10%

### Business Impact
- ✅ No revenue loss
- ✅ User retention maintained
- ✅ Positive press/reviews
- ✅ Team morale high

---

**Next Steps**:
1. Review this checklist with the team
2. Assign owners to each setup task
3. Set target dates for each phase
4. Begin Phase 0 implementation
5. Schedule weekly sync meetings

**Questions?** Contact the Platform Engineering team in `#design-system-v2`
