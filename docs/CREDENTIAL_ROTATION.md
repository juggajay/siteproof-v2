# Credential Rotation Guide

## 🔐 Overview

This document provides step-by-step instructions for rotating compromised or expired credentials in the SiteProof application.

## ⚠️ When to Rotate Credentials

Rotate credentials immediately if:

- Credentials were accidentally committed to version control
- A team member with access leaves the organization
- You suspect unauthorized access
- As part of regular security maintenance (quarterly recommended)
- After a security incident

## 🚨 Emergency Rotation (Credentials Compromised)

### Timeline: Complete within 1 hour

### 1. Supabase Service Role Key Rotation

**Step 1: Access Supabase Dashboard**

```
https://app.supabase.com/project/[your-project-id]/settings/api
```

**Step 2: Generate New Service Role Key**

1. Navigate to Settings → API
2. Under "Project API keys" section
3. Click "Generate new service_role key"
4. Copy the new key immediately (it won't be shown again)

**Step 3: Revoke Old Key**

1. In the same section, find the old service_role key
2. Click "Revoke" or "Delete"
3. Confirm the revocation

**Step 4: Update Production Environment**

```bash
# Vercel (if using)
vercel env rm SUPABASE_SERVICE_ROLE_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production

# Or update in your hosting dashboard
```

**Step 5: Update Local Development**

```bash
# Update apps/web/.env.local (DO NOT COMMIT)
SUPABASE_SERVICE_ROLE_KEY=<new-service-role-key>
```

**Step 6: Verify**

```bash
# Test that the new key works
npm run dev
# Navigate to app and test database operations
```

### 2. Supabase Anon Key Rotation

**Note:** Anon keys are public and should have proper RLS policies. Rotation is less critical but recommended.

**Step 1: Generate New Anon Key**

```
https://app.supabase.com/project/[your-project-id]/settings/api
```

**Step 2: Update Environment Variables**

```bash
# Update .env.local (DO NOT COMMIT)
NEXT_PUBLIC_SUPABASE_ANON_KEY=<new-anon-key>
```

**Step 3: Update Production**

```bash
vercel env rm NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
```

**Step 4: Redeploy**

```bash
vercel --prod
```

### 3. Anthropic API Key Rotation

**Step 1: Access Anthropic Console**

```
https://console.anthropic.com/settings/keys
```

**Step 2: Create New API Key**

1. Click "Create Key"
2. Name it appropriately (e.g., "SiteProof Production - 2025-10")
3. Copy the key immediately

**Step 3: Revoke Old Key**

1. Find the old key in the list
2. Click "Revoke"
3. Confirm revocation

**Step 4: Update Environment Variables**

```bash
# Local
# Update apps/web/.env.local (DO NOT COMMIT)
ANTHROPIC_API_KEY=<new-api-key>

# Production
vercel env rm ANTHROPIC_API_KEY production
vercel env add ANTHROPIC_API_KEY production
```

**Step 5: Monitor Usage**

```
https://console.anthropic.com/settings/billing
```

Check for any unauthorized usage with the old key.

## 🔍 Post-Rotation Verification Checklist

- [ ] Test login/authentication
- [ ] Test database operations (read/write)
- [ ] Test AI features (if using Anthropic)
- [ ] Check error logs for authentication failures
- [ ] Verify no old credentials remain in:
  - [ ] Git history
  - [ ] Local files
  - [ ] CI/CD pipelines
  - [ ] Team member machines
  - [ ] Backup systems

## 📊 Monitoring After Rotation

### Supabase

```
https://app.supabase.com/project/[your-project-id]/logs/explorer
```

- Enable audit logs
- Monitor for failed authentication attempts
- Check for unusual query patterns

### Anthropic

```
https://console.anthropic.com/settings/usage
```

- Monitor API usage for anomalies
- Set up budget alerts
- Review usage logs

## 🔒 Git History Cleanup (If Credentials Were Committed)

**⚠️ WARNING: This rewrites git history. Coordinate with your team first!**

### Option 1: Using git-filter-repo (Recommended)

```bash
# Install git-filter-repo
pip install git-filter-repo

# Backup your repository first!
git clone --mirror [repo-url] backup-repo

# Remove .env.local files from history
cd /path/to/repo
git filter-repo --path .env.local --invert-paths --force
git filter-repo --path apps/web/.env.local --invert-paths --force

# Force push (coordinate with team!)
git push origin --force --all
git push origin --force --tags
```

### Option 2: Using BFG Repo-Cleaner

```bash
# Install BFG
# Download from https://rtyley.github.io/bfg-repo-cleaner/

# Remove .env.local files
java -jar bfg.jar --delete-files .env.local

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push
git push origin --force --all
```

### Verify Cleanup

```bash
# Search git history for secrets
git log -S "SUPABASE_SERVICE_ROLE_KEY" --all
git log -S "ANTHROPIC_API_KEY" --all

# Should return no results
```

## 📅 Regular Rotation Schedule

### Quarterly Rotation (Every 3 months)

- [ ] Rotate Anthropic API keys
- [ ] Review and rotate Supabase service role keys
- [ ] Update documentation
- [ ] Test all rotations in staging first

### Annual Security Audit

- [ ] Review all credentials and access
- [ ] Remove access for departed team members
- [ ] Update security documentation
- [ ] Conduct penetration testing

## 🔐 Credential Storage Best Practices

### ✅ DO

- Store credentials in environment variables
- Use secret management tools (AWS Secrets Manager, HashiCorp Vault)
- Keep .env.local files local only
- Use different credentials for dev/staging/prod
- Enable MFA on all service accounts

### ❌ DON'T

- Commit credentials to git
- Share credentials via email/Slack
- Use the same credentials across environments
- Store credentials in code comments
- Share service role keys with frontend

## 🆘 Emergency Contacts

### Supabase Support

- Dashboard: https://app.supabase.com
- Support: https://supabase.com/support
- Docs: https://supabase.com/docs

### Anthropic Support

- Console: https://console.anthropic.com
- Support: https://support.anthropic.com
- Status: https://status.anthropic.com

### Internal Security Team

- Email: security@siteproof.com (update with your team's contact)
- Slack: #security (update with your channel)

## 📝 Incident Log Template

When rotating credentials due to a security incident:

```markdown
### Incident: [Date] - Credential Exposure

**What happened:**
[Description of how credentials were exposed]

**When discovered:**
[Date and time]

**Credentials affected:**

- [ ] Supabase Service Role Key
- [ ] Supabase Anon Key
- [ ] Anthropic API Key
- [ ] Other: ****\_\_\_****

**Actions taken:**

1. [Timestamp] - Discovered exposure
2. [Timestamp] - Rotated credentials
3. [Timestamp] - Updated production
4. [Timestamp] - Verified no unauthorized access
5. [Timestamp] - Cleaned git history

**Lessons learned:**
[What can we do better?]

**Prevention measures added:**
[New safeguards implemented]
```

## 🔧 Automation Scripts

### Quick Rotation Script

```bash
#!/bin/bash
# scripts/rotate-credentials.sh

echo "🔐 Credential Rotation Assistant"
echo "================================"
echo ""
echo "This script will guide you through credential rotation."
echo ""
echo "⚠️  Have you:"
echo "  1. Generated new credentials in the respective dashboards?"
echo "  2. Copied them to a secure location?"
echo "  3. Coordinated with your team?"
echo ""
read -p "Ready to proceed? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Rotation cancelled."
  exit 0
fi

echo ""
echo "Updating local environment files..."

# Backup existing .env.local
if [ -f "apps/web/.env.local" ]; then
  cp apps/web/.env.local "apps/web/.env.local.backup.$(date +%Y%m%d-%H%M%S)"
  echo "✅ Backed up existing .env.local"
fi

echo ""
echo "Manual steps required:"
echo "1. Update apps/web/.env.local with new credentials"
echo "2. Update production environment variables in Vercel/hosting dashboard"
echo "3. Redeploy production"
echo "4. Monitor logs for any issues"
echo ""
echo "Run this checklist after rotation:"
echo "npm run test"
echo "npm run build"
```

## 📚 Additional Resources

- [OWASP Secret Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/security)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)

---

**Last Updated:** 2025-10-08
**Next Review:** 2025-11-08
