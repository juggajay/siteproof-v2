# Security Policy

## 🛡️ Overview

SiteProof takes security seriously. This document outlines our security policies, vulnerability reporting procedures, and security best practices.

## 🔒 Supported Versions

We release security updates for the following versions:

| Version | Supported |
| ------- | --------- |
| 1.x.x   | ✅ Yes    |
| < 1.0   | ❌ No     |

## 🚨 Reporting a Vulnerability

**Please do NOT report security vulnerabilities through public GitHub issues.**

### How to Report

1. **Email:** Send details to `security@siteproof.com` (replace with your actual security email)
2. **GitHub Security:** Use [GitHub's private vulnerability reporting](https://github.com/your-org/siteproof/security/advisories/new)

### What to Include

Please include the following information:

- Type of vulnerability (e.g., XSS, SQL injection, authentication bypass)
- Full paths of affected source files
- Location of the affected code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the vulnerability
- Suggested fix (if you have one)

### Response Timeline

- **Acknowledgment:** Within 24 hours
- **Initial Assessment:** Within 3 business days
- **Status Update:** Within 7 days
- **Fix Released:** Within 30 days for critical issues, 90 days for others

### Disclosure Policy

- Report vulnerabilities privately first
- Allow 90 days for fix before public disclosure
- Coordinate disclosure with our security team
- You will be credited in the security advisory (unless you prefer anonymity)

## 🎯 Security Measures

### Authentication & Authorization

- ✅ **Supabase Authentication** - Industry-standard auth provider
- ✅ **Role-Based Access Control (RBAC)** - Granular permissions system
- ✅ **Row Level Security (RLS)** - Database-level access control
- ✅ **Session Management** - Secure cookie handling
- ✅ **Rate Limiting** - Prevents brute force attacks

### Data Protection

- ✅ **Encryption at Rest** - Supabase provides AES-256 encryption
- ✅ **Encryption in Transit** - TLS 1.3 for all connections
- ✅ **Input Validation** - Zod schema validation on all inputs
- ✅ **Output Encoding** - React's built-in XSS protection
- ✅ **CSRF Protection** - Token-based protection for state-changing operations

### Infrastructure Security

- ✅ **Content Security Policy (CSP)** - Nonce-based CSP with strict-dynamic
- ✅ **Security Headers** - HSTS, X-Frame-Options, X-Content-Type-Options
- ✅ **Secrets Management** - Environment variables, never in code
- ✅ **Dependency Scanning** - Automated vulnerability scanning
- ✅ **Code Scanning** - CodeQL analysis on every push

### Application Security

- ✅ **SQL Injection Protection** - Parameterized queries via Supabase
- ✅ **XSS Protection** - No `dangerouslySetInnerHTML`, output encoding
- ✅ **CSRF Protection** - Token validation on state-changing operations
- ✅ **Clickjacking Protection** - X-Frame-Options: DENY
- ✅ **Directory Traversal Prevention** - Path validation and sanitization

## 🔐 Security Architecture

### Authentication Flow

```
User → Login Form → API Route (/api/auth/login)
                        ↓
                   Rate Limit Check (5 req/15 min)
                        ↓
                   Input Validation (Zod)
                        ↓
                   Supabase Auth
                        ↓
                   Set Secure Cookies (httpOnly, sameSite, secure)
                        ↓
                   CSRF Token Generation
                        ↓
                   Redirect to Dashboard
```

### Authorization Flow

```
API Request → Middleware → Rate Limit Check
                              ↓
                          CSRF Validation (for POST/PUT/DELETE)
                              ↓
                          Session Validation
                              ↓
                      API Route Handler
                              ↓
                          UUID Validation (params)
                              ↓
                          Zod Validation (body)
                              ↓
                          User Authentication Check
                              ↓
                          Organization Membership Check
                              ↓
                          Permission Check (RBAC)
                              ↓
                          Resource Owner Check (if applicable)
                              ↓
                          Financial Data Filtering
                              ↓
                          Response
```

### Financial Data Access Control

```
Request → Check User Role → Has Financial Access?
                                    ↓                    ↓
                                  YES                   NO
                                    ↓                    ↓
                            Return Full Data    Filter Financial Fields
                                                    ↓
                                            Destructure & Remove:
                                            - hourly_rate
                                            - daily_rate
                                            - total_cost
                                            - unit_cost
                                            - standard_rate
                                            - overtime_rate
```

## 📋 Security Checklist for Developers

Before merging any PR, ensure:

- [ ] All API routes have UUID validation on parameters
- [ ] All request bodies validated with Zod schemas
- [ ] Authentication checked with `assertAuthenticated()`
- [ ] Authorization checked with permission helpers
- [ ] Financial data filtered based on user role
- [ ] No secrets in code or config files
- [ ] Error messages don't leak internal details
- [ ] CSRF token required for state-changing operations
- [ ] Rate limiting covers the new endpoints
- [ ] Tests include security test cases
- [ ] ESLint security checks pass
- [ ] No `dangerouslySetInnerHTML` usage
- [ ] No `eval()` or `new Function()`
- [ ] SQL queries use parameterized queries
- [ ] File paths validated and sanitized

## 🛠️ Security Tools

### Development

```bash
# Run security linter
cd apps/web && pnpm run lint

# Check for vulnerable dependencies
pnpm audit

# Check for secrets in code
git diff | grep -E "(API_KEY|SECRET|PASSWORD)"
```

### CI/CD

- **Snyk** - Dependency vulnerability scanning
- **CodeQL** - Static analysis
- **TruffleHog** - Secret scanning
- **ESLint Security Plugin** - Code security checks
- **npm audit** - Dependency auditing
- **OSV Scanner** - Vulnerability database checking

## 🔑 Credential Management

### Never Commit

- ❌ API keys
- ❌ Database passwords
- ❌ Service role keys
- ❌ Private keys
- ❌ OAuth secrets
- ❌ JWT secrets
- ❌ Encryption keys

### Use Environment Variables

```bash
# .env.local (NEVER COMMIT)
SUPABASE_URL=your_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
ANTHROPIC_API_KEY=your_api_key
```

### Rotation Schedule

- **Quarterly:** Rotate API keys
- **Annually:** Full security audit
- **Immediately:** On suspected compromise

See [`docs/CREDENTIAL_ROTATION.md`](./docs/CREDENTIAL_ROTATION.md) for detailed procedures.

## 🔍 Security Testing

### Manual Testing

```bash
# Test CSRF protection
curl -X POST http://localhost:3000/api/diaries \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
# Should return 403 Invalid CSRF token

# Test rate limiting
for i in {1..10}; do
  curl http://localhost:3000/api/auth/login
done
# Should return 429 Too Many Requests after 5 attempts

# Test UUID validation
curl http://localhost:3000/api/diaries/invalid-uuid
# Should return 400 Validation failed
```

### Automated Testing

```bash
# Run security tests
pnpm run test:security

# Run all tests with coverage
pnpm run test:coverage
```

## 📚 Security Resources

### Internal Documentation

- [Security Audit Report](./docs/SECURITY_AUDIT_REPORT.md)
- [Credential Rotation Guide](./docs/CREDENTIAL_ROTATION.md)
- [Security Fixes Progress](./docs/SECURITY_FIXES_PROGRESS.md)
- [ESLint Security Config](./docs/ESLINT_SECURITY_CONFIG.md)

### External Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/security)
- [Next.js Security](https://nextjs.org/docs/advanced-features/security-headers)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

## 🎓 Security Training

### For Developers

Required training topics:

1. **OWASP Top 10** - Common web vulnerabilities
2. **Secure Coding in TypeScript** - Language-specific security
3. **API Security** - RESTful API best practices
4. **Authentication vs Authorization** - Understanding the difference
5. **CSRF and XSS Prevention** - Common attack vectors
6. **Secrets Management** - Proper credential handling

### Security Champions

We have designated security champions in each team:

- **Backend Team:** TBD
- **Frontend Team:** TBD
- **DevOps Team:** TBD

## 🔔 Security Notifications

### Subscribe to Alerts

- GitHub Security Advisories (Watch this repo)
- Supabase Status Page: https://status.supabase.com
- Anthropic Status Page: https://status.anthropic.com

### Internal Communication

- **Critical:** Slack #security-alerts + Email
- **High:** Slack #security
- **Medium/Low:** Weekly digest

## 📊 Security Metrics

We track the following security metrics:

- Time to detect vulnerabilities
- Time to patch vulnerabilities
- Number of vulnerabilities by severity
- Security test coverage
- Dependency update frequency
- Failed authentication attempts
- Rate limit violations

## ✅ Compliance

SiteProof follows these security standards:

- **OWASP ASVS** (Application Security Verification Standard)
- **CWE Top 25** (Common Weakness Enumeration)
- **GDPR** (General Data Protection Regulation) - for EU users
- **SOC 2** (in progress)

## 🆘 Incident Response

In case of a security incident:

1. **Immediate Response** (< 1 hour)
   - Assess the severity
   - Contain the incident
   - Notify security team

2. **Short-term** (< 24 hours)
   - Rotate compromised credentials
   - Review audit logs
   - Identify affected users
   - Prepare communication

3. **Long-term** (< 1 week)
   - Complete investigation
   - Implement permanent fixes
   - Post-mortem analysis
   - Update security procedures

See [`docs/CREDENTIAL_ROTATION.md`](./docs/CREDENTIAL_ROTATION.md) for detailed incident response procedures.

## 📞 Contact

- **Security Team:** security@siteproof.com
- **Emergency:** security@siteproof.com (24/7 monitoring)
- **General Inquiries:** support@siteproof.com

## 🏆 Acknowledgments

We thank the following security researchers for responsibly disclosing vulnerabilities:

- (List will be updated as researchers are credited)

## 📄 License

This security policy is licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

---

**Last Updated:** 2025-10-08
**Next Review:** 2025-11-08
**Version:** 1.0.0
