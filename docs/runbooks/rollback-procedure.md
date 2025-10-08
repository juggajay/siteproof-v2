# Rollback Procedure - Design System V2

**Last Updated**: October 8, 2025
**Owner**: Platform Engineering Team
**Review Frequency**: Weekly during rollout, monthly post-launch

---

## Quick Reference

| Action | Command | Time |
|--------|---------|------|
| **Emergency Rollback** | `./scripts/emergency-rollback.sh "reason"` | < 5 min |
| **Verify Rollback** | `npm run verify:rollback` | < 2 min |
| **Component Rollback** | See [Component-Level Rollback](#component-level-rollback) | < 10 min |
| **Full Revert** | See [Full Revert to V1](#full-revert-to-v1) | < 30 min |

---

## When to Rollback

### Immediate Rollback (< 5 minutes)

Execute immediate rollback if:
- Error rate > 5%
- Complete service outage
- Data loss detected
- Security vulnerability exploited
- P0 incident declared

### Planned Rollback (< 15 minutes)

Consider planned rollback if:
- Error rate 2-5%
- Major feature broken for > 15 minutes
- Performance degradation > 50%
- P1 incident with no quick fix

### Component Rollback (< 30 minutes)

Use component-level rollback if:
- Single component causing issues
- Isolated feature broken
- Performance issue in specific area
- P2 incident with known scope

### Monitor and Fix (No Rollback)

Monitor without rollback if:
- Error rate < 0.5%
- Visual glitches only
- Performance degradation < 10%
- P3 incident

---

## Emergency Rollback Procedure

### Step 1: Assess the Situation

**Time: 1 minute**

1. Check Sentry dashboard: https://sentry.io/siteproof
2. Review error rate (current vs baseline)
3. Check affected user percentage
4. Identify root cause if possible

**Decision Matrix:**

```
IF error_rate > 5% OR service_down THEN
  Execute immediate rollback
ELSE IF error_rate > 2% AND duration > 15min THEN
  Execute planned rollback
ELSE
  Continue monitoring
END
```

### Step 2: Execute Rollback Script

**Time: 2 minutes**

```bash
# Navigate to project root
cd /path/to/siteproof-v2

# Run emergency rollback script
./scripts/emergency-rollback.sh "Brief reason for rollback"

# Example:
# ./scripts/emergency-rollback.sh "Navigation component causing 10% error rate"
```

**What the script does:**
1. Disables `design-system-v2` feature flag in Flagsmith
2. Sets environment variable override `NEXT_PUBLIC_FORCE_OLD_DESIGN=true`
3. Triggers cache revalidation
4. Logs rollback event
5. Notifies team via Slack

### Step 3: Verify Rollback Success

**Time: 2 minutes**

```bash
# Run verification script
npm run verify:rollback

# Expected output:
# ✅ Feature Flag Disabled
# ✅ Old UI Serving
# ✅ Error Rate Normal
```

**Manual verification:**

1. Visit https://siteproof.com in incognito mode
2. Verify old UI is displayed (look for `data-version="v1"`)
3. Test critical paths:
   - Login
   - Dashboard load
   - Create inspection
   - Submit NCR

4. Check monitoring dashboards:
   - Sentry: Error rate should decrease within 1 minute
   - PostHog: User sessions should show V1 experience
   - Vercel: Performance metrics should stabilize

### Step 4: Communicate

**Time: 1 minute**

1. **Post in #incidents Slack channel:**

```markdown
🔄 **Design System Rollback Executed**

**Time**: [Current timestamp]
**Reason**: [Brief reason]
**Affected Users**: [Percentage or "All"]
**Status**: Rollback complete, monitoring

**Next Steps**:
- Root cause analysis in progress
- Fix ETA: [Estimate]
- Re-deployment plan: TBD

**Incident Lead**: [Your name]
```

2. **Update status page** (if applicable)

3. **Notify stakeholders** via email (if major incident)

---

## Component-Level Rollback

Use when only a specific component is causing issues.

### Identify Affected Component

```bash
# Check Sentry for error groupings
# Example: "NavigationV2: Cannot read property 'map' of undefined"

# Common components:
# - new-navigation
# - new-dashboard-widgets
# - new-form-components
# - new-mobile-ui
# - new-data-tables
# - new-modals
```

### Rollback Single Component

**Option 1: Via Flagsmith Dashboard**

1. Login to Flagsmith: https://flagsmith.siteproof.com
2. Navigate to Features
3. Find component flag (e.g., `new-navigation`)
4. Click "Disable"
5. Verify change propagated (< 60 seconds)

**Option 2: Via API**

```bash
# Set component-specific flag
curl -X PUT \
  https://flagsmith.siteproof.com/api/v1/features/new-navigation/ \
  -H "Authorization: Token ${FLAGSMITH_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": false,
    "description": "Rollback due to error rate spike"
  }'
```

**Option 3: Via Code**

```typescript
// In emergency, commit and deploy this change
// /apps/web/src/lib/feature-flags/overrides.ts

export const EMERGENCY_OVERRIDES = {
  'new-navigation': false, // Force old navigation
};
```

### Verify Component Rollback

```bash
# Test affected area specifically
npm run test:e2e -- --grep "Navigation"

# Check that old component is rendering
# Visit affected page and verify old UI
```

---

## Full Revert to V1

If feature flags fail or comprehensive rollback is needed.

### Step 1: Git Revert

```bash
# Find the merge commit that introduced V2
git log --oneline --grep="design system v2" | head -1

# Revert the merge commit
git revert -m 1 <commit-hash>

# Example:
# git revert -m 1 a1b2c3d4
```

### Step 2: Deploy Reverted Code

```bash
# Push revert commit
git push origin main

# Trigger production deployment
vercel --prod

# Or use CI/CD pipeline
git tag rollback-v2-$(date +%Y%m%d)
git push --tags
```

### Step 3: Database Rollback (if needed)

```bash
# Connect to production database
psql $DATABASE_URL

# Run rollback migration
\i apps/web/migrations/rollback/001_user_preferences.sql

# Verify rollback
SELECT COUNT(*) FROM user_preferences WHERE preference_key = 'ui_version';
```

### Step 4: Clear CDN Cache

```bash
# Vercel cache purge
vercel env pull .env.production
source .env.production

curl -X DELETE "https://api.vercel.com/v1/deployments/${VERCEL_DEPLOYMENT_ID}/cache" \
  -H "Authorization: Bearer ${VERCEL_TOKEN}"

# CloudFlare cache purge (if applicable)
curl -X POST "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"purge_everything":true}'
```

---

## Data Restoration

If user data was affected during rollback.

### Restore User Preferences

```bash
# Run restoration script
npm run restore:preferences -- --backup-id <backup-id>

# Or manually restore from IndexedDB backup
npm run restore:preferences:manual
```

### Restore Form Drafts

```bash
# Check for pending form submissions
npm run check:pending-forms

# Restore from backup
npm run restore:forms -- --backup-id <backup-id>
```

### Verify Data Integrity

```sql
-- Check user preference migration status
SELECT
  COUNT(*) as total_users,
  COUNT(CASE WHEN preferences->>'ui_version' = 'v1' THEN 1 END) as v1_users,
  COUNT(CASE WHEN preferences->>'ui_version' = 'v2' THEN 1 END) as v2_users
FROM users;

-- Check for orphaned data
SELECT COUNT(*) FROM user_preferences
WHERE user_id NOT IN (SELECT id FROM users);
```

---

## Post-Rollback Actions

### Immediate (< 1 hour)

- [ ] Verify error rate returned to baseline
- [ ] Confirm all critical paths functional
- [ ] Check user reports/feedback
- [ ] Update incident timeline
- [ ] Notify stakeholders of resolution

### Short-term (< 24 hours)

- [ ] Conduct root cause analysis
- [ ] Create post-mortem document
- [ ] Plan fix implementation
- [ ] Update rollout timeline
- [ ] Schedule retrospective meeting

### Long-term (< 1 week)

- [ ] Implement fix and test thoroughly
- [ ] Update rollback procedures based on learnings
- [ ] Improve monitoring/alerting
- [ ] Plan re-deployment strategy
- [ ] Communicate plan to team and stakeholders

---

## Rollback Testing

Test rollback procedures regularly to ensure they work when needed.

### Monthly Rollback Drill

```bash
# Run in staging environment
npm run test:rollback-drill

# Steps:
# 1. Deploy V2 to staging
# 2. Generate synthetic load
# 3. Execute rollback script
# 4. Verify old UI restored
# 5. Check data integrity
# 6. Document results
```

### Automated Rollback Testing

```yaml
# .github/workflows/rollback-test.yml

name: Rollback Procedure Test

on:
  schedule:
    - cron: '0 0 1 * *' # Monthly on 1st
  workflow_dispatch: # Manual trigger

jobs:
  test-rollback:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install

      # Deploy V2 to test environment
      - run: pnpm build
      - run: vercel deploy --env=preview

      # Execute rollback
      - run: ./scripts/emergency-rollback.sh "Rollback drill"

      # Verify rollback
      - run: npm run verify:rollback

      # Report results
      - uses: actions/upload-artifact@v3
        with:
          name: rollback-test-results
          path: logs/rollbacks.log
```

---

## Troubleshooting

### Rollback Script Fails

**Symptom**: Emergency rollback script returns error

**Causes**:
- Missing environment variables
- Flagsmith API unavailable
- Network connectivity issues

**Solution**:

```bash
# Check environment variables
echo $FLAGSMITH_API_TOKEN
echo $SLACK_WEBHOOK_URL

# Test Flagsmith connectivity
curl -I https://flagsmith.siteproof.com/health

# Manual feature flag disable via UI
# Login to Flagsmith dashboard and disable manually
```

### Old UI Not Appearing

**Symptom**: After rollback, new UI still shows

**Causes**:
- Browser cache
- CDN cache
- Service worker cache

**Solution**:

```bash
# Purge all caches
npm run cache:purge

# Force service worker update
# Add to /apps/web/public/sw.js:
# self.skipWaiting();

# Instruct users to hard refresh
# Ctrl+Shift+R (Windows/Linux)
# Cmd+Shift+R (Mac)
```

### Data Loss After Rollback

**Symptom**: User preferences or form data missing

**Causes**:
- Backup not created
- Migration script error
- Storage quota exceeded

**Solution**:

```bash
# Check for available backups
npm run backup:list

# Restore from latest backup
npm run backup:restore -- --latest

# Check IndexedDB quotas
npm run db:check-quota

# If backups missing, restore from database
npm run restore:from-database
```

---

## Contact

**For Rollback Assistance:**
- Slack: #platform-engineering
- On-Call: PagerDuty rotation
- Emergency: [Emergency contact list]

**Escalation Path:**
1. Engineering Lead
2. CTO
3. CEO (for critical incidents)

---

**Remember**: It's better to rollback quickly and fix properly than to let users suffer with a broken experience.
