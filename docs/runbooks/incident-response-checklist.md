# Incident Response Checklist - Design System V2

**Purpose**: Quick reference for handling production incidents during design system rollout
**Last Updated**: October 8, 2025

---

## Severity Classification

### P0 - Critical (Complete Outage)
- **Response Time**: < 5 minutes
- **Examples**: Application down, authentication broken, data loss
- **Action**: Immediate rollback

### P1 - High (Major Feature Broken)
- **Response Time**: < 15 minutes
- **Examples**: Cannot create inspections, payment processing fails
- **Action**: Rollback or hotfix within 15 minutes

### P2 - Medium (Minor Feature Impacted)
- **Response Time**: < 1 hour
- **Examples**: Dashboard widget not loading, export PDF fails
- **Action**: Component rollback or scheduled fix

### P3 - Low (Visual Issues)
- **Response Time**: < 24 hours
- **Examples**: Button misalignment, color contrast issue
- **Action**: Fix in next deployment

---

## Incident Response Flow

```
┌─────────────────┐
│  Alert Received │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Acknowledge    │ ← Set status in PagerDuty/Slack
│  (< 1 minute)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Assess Impact  │ ← Check Sentry, PostHog, Vercel
│  (< 2 minutes)  │ ← Determine severity (P0-P3)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Communicate    │ ← Post in #incidents
│  (< 1 minute)   │ ← Notify stakeholders if P0/P1
└────────┬────────┘
         │
         ▼
    ┌───┴───┐
    │ P0/P1?│
    └───┬───┘
        │
   Yes  │  No
   ┌────┴────┐
   │         │
   ▼         ▼
┌──────┐  ┌──────────┐
│Rollback  │Investigate│
│(<5 min)│ │& Fix     │
└──────┘  └──────────┘
   │         │
   └────┬────┘
        │
        ▼
   ┌─────────┐
   │ Verify  │ ← Check metrics returned to normal
   │ Resolved│ ← Test critical paths
   └────┬────┘
        │
        ▼
   ┌──────────┐
   │Post-Mortem│ ← Within 24 hours
   └──────────┘
```

---

## Phase 1: Alert Acknowledgment

**Time Budget: < 1 minute**

### Checklist

- [ ] Acknowledge alert in PagerDuty/Slack
- [ ] Note current time
- [ ] Verify you're the incident commander
- [ ] Check if others are already responding

### Actions

```bash
# Respond in #incidents channel
"🚨 Acknowledged - [Your Name] investigating"
```

---

## Phase 2: Impact Assessment

**Time Budget: < 2 minutes**

### Checklist

- [ ] Check error rate in Sentry
- [ ] Review affected users in PostHog
- [ ] Check performance metrics in Vercel
- [ ] Identify which component/feature is affected
- [ ] Determine if issue is V2-specific

### Quick Assessment Commands

```bash
# Check recent deployments
vercel ls --limit 5

# Check Sentry error rate
curl "https://sentry.io/api/0/organizations/siteproof/stats_v2/?stat=sum(quantity)&interval=1h" \
  -H "Authorization: Bearer ${SENTRY_AUTH_TOKEN}"

# Check feature flag status
curl "https://flagsmith.siteproof.com/api/v1/flags/" \
  -H "X-Environment-Key: ${FLAGSMITH_ENV_KEY}"
```

### Impact Assessment Matrix

| Metric | Baseline | Warning | Critical |
|--------|----------|---------|----------|
| Error Rate | < 0.3% | 1-2% | > 5% |
| Response Time | < 500ms | 1-3s | > 5s |
| Affected Users | 0% | 1-10% | > 25% |
| Downtime | 0 min | 1-5 min | > 5 min |

### Severity Determination

```
IF error_rate > 5% OR downtime > 5min THEN
  severity = "P0"
  EXECUTE immediate_rollback()
ELSE IF error_rate > 2% OR critical_feature_broken THEN
  severity = "P1"
  EXECUTE planned_rollback()
ELSE IF error_rate > 0.5% OR minor_feature_broken THEN
  severity = "P2"
  EXECUTE component_rollback()
ELSE
  severity = "P3"
  CREATE ticket and MONITOR
END
```

---

## Phase 3: Communication

**Time Budget: < 1 minute**

### Checklist

- [ ] Post initial status in #incidents
- [ ] Update incident management tool (Jira/Linear)
- [ ] Notify stakeholders if P0/P1
- [ ] Set up status update cadence

### Communication Templates

#### P0 - Critical Incident

```markdown
🚨 **CRITICAL INCIDENT - P0**

**Time Detected**: [HH:MM UTC]
**Incident Commander**: [Your Name]
**Severity**: P0 - Complete Outage

**Impact**:
- Application unavailable
- Affected Users: [Percentage/All]
- Critical paths blocked: [List]

**Current Status**: Investigating
**ETA**: Rollback in progress (< 5 minutes)

**Actions**:
- [ ] Assessing root cause
- [ ] Executing rollback
- [ ] Verifying resolution

**Updates**: Every 5 minutes until resolved
**Bridge**: [Call link if needed]
```

#### P1 - High Severity

```markdown
⚠️ **HIGH SEVERITY INCIDENT - P1**

**Time Detected**: [HH:MM UTC]
**Incident Commander**: [Your Name]
**Severity**: P1 - Major Feature Broken

**Impact**:
- [Specific feature] unavailable
- Affected Users: [Percentage]
- Workaround: [If available]

**Current Status**: Investigating
**ETA**: [Estimate]

**Actions**:
- [ ] Root cause identified
- [ ] Fix or rollback plan determined
- [ ] Implementation in progress

**Updates**: Every 15 minutes until resolved
```

#### P2 - Medium Severity

```markdown
ℹ️ **Medium Severity Issue - P2**

**Time Detected**: [HH:MM UTC]
**Owner**: [Your Name]
**Severity**: P2 - Minor Feature Impact

**Impact**:
- [Component] experiencing issues
- Affected Users: [Small percentage]
- Workaround: [Instructions]

**Plan**:
- Investigating root cause
- Component rollback if needed
- Fix ETA: [Within 1 hour]

**Updates**: Hourly or when resolved
```

---

## Phase 4: Mitigation

**Time Budget: Varies by severity**

### P0: Immediate Rollback (< 5 minutes)

```bash
# Execute emergency rollback
./scripts/emergency-rollback.sh "Brief description of issue"

# Example:
./scripts/emergency-rollback.sh "Dashboard completely broken - Cannot read property map of undefined"
```

**Checklist:**
- [ ] Execute rollback script
- [ ] Verify feature flags disabled
- [ ] Check old UI is serving
- [ ] Test critical paths
- [ ] Confirm error rate decreasing
- [ ] Update #incidents with status

### P1: Planned Rollback (< 15 minutes)

**Option 1: Full Rollback**
```bash
./scripts/emergency-rollback.sh "Description"
```

**Option 2: Component Rollback**
```bash
# Via Flagsmith dashboard
# 1. Login to Flagsmith
# 2. Disable specific component flag
# 3. Verify in 60 seconds
```

**Checklist:**
- [ ] Determine rollback scope
- [ ] Execute rollback
- [ ] Verify affected component
- [ ] Test related functionality
- [ ] Monitor metrics for 10 minutes
- [ ] Update stakeholders

### P2: Component Fix or Rollback (< 1 hour)

**Assess if component rollback is sufficient:**

```typescript
// Quick component disable
// apps/web/src/lib/feature-flags/overrides.ts

export const EMERGENCY_OVERRIDES = {
  'new-dashboard-widgets': false, // Disable problematic component
};
```

**Or deploy hotfix:**

```bash
# Create hotfix branch
git checkout -b hotfix/component-name

# Make fix
# ... edit code ...

# Test locally
npm run test
npm run test:e2e -- --grep "ComponentName"

# Deploy to staging
vercel --env=preview

# If verified, deploy to production
git push origin hotfix/component-name
# Merge via fast-track PR
```

**Checklist:**
- [ ] Identified root cause
- [ ] Determined fix or rollback
- [ ] Implemented solution
- [ ] Tested in staging
- [ ] Deployed to production
- [ ] Monitored for 30 minutes
- [ ] Resolved incident ticket

---

## Phase 5: Verification

**Time Budget: < 5 minutes**

### Automated Verification

```bash
# Run verification script
npm run verify:rollback

# Expected output:
# ✅ Feature Flag Status: Correct
# ✅ UI Version: Correct
# ✅ Error Rate: Normal
# ✅ Performance: Within Budget
# ✅ Critical Paths: Functional
```

### Manual Verification Checklist

**Critical Paths to Test:**

- [ ] **Authentication**
  - [ ] Login with valid credentials
  - [ ] Logout
  - [ ] Password reset flow

- [ ] **Dashboard**
  - [ ] Dashboard loads within 3 seconds
  - [ ] All widgets display correctly
  - [ ] No JavaScript errors in console

- [ ] **Inspections**
  - [ ] Create new inspection
  - [ ] Upload photo
  - [ ] Submit form
  - [ ] View submitted inspection

- [ ] **NCRs**
  - [ ] Create new NCR
  - [ ] Assign to contractor
  - [ ] Change status
  - [ ] View NCR details

- [ ] **Daily Diary**
  - [ ] Create diary entry
  - [ ] Add multiple entries
  - [ ] Export as PDF
  - [ ] Download succeeds

### Metrics Verification

**Check these dashboards:**

1. **Sentry** - Error rate should be:
   - Decreasing trend
   - Below 0.5% within 5 minutes
   - No new critical errors

2. **PostHog** - User behavior should show:
   - Normal session duration
   - Expected page view patterns
   - No unusual drop-offs

3. **Vercel** - Performance should be:
   - Response times < 500ms (p95)
   - No 5xx errors
   - Cache hit ratio normal

### User Feedback Check

```bash
# Check recent support tickets
# Check #user-feedback Slack channel
# Check in-app feedback widget
# Check social media mentions
```

---

## Phase 6: Post-Incident

**Time Budget: 24 hours for initial post-mortem**

### Immediate Actions (< 1 hour after resolution)

- [ ] Update #incidents with resolution
- [ ] Mark incident as resolved in tracking tool
- [ ] Thank team members who helped
- [ ] Document timeline in incident notes
- [ ] Schedule post-mortem meeting (within 24 hours)

### Post-Mortem Template

```markdown
# Post-Mortem: [Incident Title]

**Date**: [YYYY-MM-DD]
**Severity**: [P0/P1/P2/P3]
**Duration**: [Total time from detection to resolution]
**Incident Commander**: [Name]

## Summary
[2-3 sentence summary of what happened]

## Timeline
- [HH:MM] Alert triggered
- [HH:MM] Incident acknowledged
- [HH:MM] Root cause identified
- [HH:MM] Mitigation started
- [HH:MM] Incident resolved
- [HH:MM] Verification complete

## Impact
- **Users Affected**: [Number/Percentage]
- **Duration**: [Minutes]
- **Features Impacted**: [List]
- **Revenue Impact**: [If applicable]

## Root Cause
[Detailed explanation of what caused the issue]

## Resolution
[What actions were taken to resolve the incident]

## What Went Well
- [Things that worked well during response]
- [Good decisions made]
- [Effective communication]

## What Could Be Improved
- [Areas for improvement]
- [Missed opportunities]
- [Process gaps]

## Action Items
- [ ] [Action 1] - Owner: [Name], Due: [Date]
- [ ] [Action 2] - Owner: [Name], Due: [Date]
- [ ] [Action 3] - Owner: [Name], Due: [Date]

## Lessons Learned
- [Key takeaway 1]
- [Key takeaway 2]
- [Key takeaway 3]

## Follow-up
- Next review: [Date]
- Related incidents: [Links]
```

### Long-term Improvements

- [ ] Update runbooks based on learnings
- [ ] Improve monitoring/alerting if gaps found
- [ ] Add automated tests for issue scenario
- [ ] Document new edge cases
- [ ] Train team on new procedures
- [ ] Update rollback automation if needed

---

## Reference Links

### Monitoring Dashboards
- Sentry: https://sentry.io/siteproof
- PostHog: https://app.posthog.com/project/siteproof
- Vercel: https://vercel.com/siteproof/analytics
- Flagsmith: https://flagsmith.siteproof.com

### Runbooks
- [Emergency Rollback Procedure](/docs/runbooks/rollback-procedure.md)
- [Feature Flag Management](/docs/runbooks/feature-flag-management.md)
- [Database Rollback](/docs/runbooks/database-rollback.md)

### Communication Channels
- Slack: #incidents
- PagerDuty: https://siteproof.pagerduty.com
- Status Page: https://status.siteproof.com

### Escalation
1. Engineering Lead: [Contact]
2. CTO: [Contact]
3. CEO: [Contact] (P0 only)

---

## Quick Command Reference

```bash
# Emergency rollback
./scripts/emergency-rollback.sh "reason"

# Verify rollback
npm run verify:rollback

# Check error rate
npm run check:errors

# Check performance
npm run check:performance

# Disable specific component
npm run flag:disable new-navigation

# Check deployment status
vercel ls --limit 5

# View recent logs
vercel logs siteproof-v2 --limit 100

# Check database health
npm run db:health
```

---

**Remember**:
- Stay calm and methodical
- Communication is as important as technical response
- Document everything in real-time
- Don't hesitate to rollback if uncertain
- Learn from every incident to prevent future ones
