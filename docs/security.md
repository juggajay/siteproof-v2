# Security Documentation

## Overview

SiteProof v2 implements multiple layers of security to protect user data and ensure system integrity. This document outlines our security measures and best practices.

## Authentication & Authorization

### Authentication Flow

1. **Password Requirements**:
   - Minimum 8 characters
   - Must contain uppercase, lowercase, and numbers
   - Stored using bcrypt hashing via Supabase Auth

2. **Session Management**:
   - JWT tokens with 1-hour expiration
   - Refresh tokens with 30-day expiration
   - Secure HTTP-only cookies

3. **Multi-Factor Authentication** (planned):
   - TOTP support
   - SMS backup codes

### Authorization

1. **Row Level Security (RLS)**:
   - All database tables protected with RLS policies
   - Users can only access data from their organizations
   - Role-based access control (RBAC)

2. **Roles**:
   - `owner`: Full access to organization
   - `admin`: Administrative access
   - `project_manager`: Project management
   - `inspector`: Inspection and reporting
   - `viewer`: Read-only access
   - `finance_manager`: Financial data access
   - `accountant`: Financial reporting

## Data Protection

### Encryption

1. **In Transit**:
   - TLS 1.3 for all connections
   - HSTS with preload
   - Certificate pinning for mobile apps

2. **At Rest**:
   - Database encryption via Supabase
   - File storage encryption
   - Backup encryption

### Data Privacy

1. **Personal Data**:
   - GDPR compliant data handling
   - Right to erasure support
   - Data portability features

2. **Financial Data**:
   - Role-based visibility
   - Audit logging
   - Encrypted storage

## Security Headers

### Content Security Policy (CSP)

```
default-src 'self';
script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.supabase.co;
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https:;
connect-src 'self' https://*.supabase.co wss://*.supabase.co;
```

### Additional Headers

- `Strict-Transport-Security`: Forces HTTPS
- `X-Frame-Options`: Prevents clickjacking
- `X-Content-Type-Options`: Prevents MIME sniffing
- `Referrer-Policy`: Controls referrer information

## Rate Limiting

### Endpoint Limits

1. **Authentication** (`/api/auth/*`):
   - 5 requests per minute
   - Account lockout after 3 failed attempts
   - 15-minute lockout duration

2. **API Endpoints** (`/api/*`):
   - 60 requests per minute
   - Per-user tracking

3. **General Routes**:
   - 100 requests per minute
   - IP-based tracking

### DDoS Protection

- Vercel's built-in DDoS protection
- Cloudflare integration (optional)
- Rate limiting at application level

## Input Validation

### Schema Validation

All inputs validated using Zod schemas:

```typescript
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
```

### SQL Injection Prevention

- Parameterized queries via Supabase
- Input sanitization
- Stored procedures for complex operations

### XSS Prevention

- React's built-in XSS protection
- Content Security Policy
- Input sanitization for user content

## File Security

### Upload Restrictions

1. **File Types**:
   - Whitelist approach
   - MIME type validation
   - File extension validation

2. **Size Limits**:
   - 10MB default limit
   - Configurable per file type

3. **Storage**:
   - Separate storage bucket per organization
   - Signed URLs with expiration
   - Virus scanning (planned)

## API Security

### Authentication

- Bearer token authentication
- API key support for integrations
- Rate limiting per API key

### CORS Configuration

```typescript
cors({
  origin: process.env.ALLOWED_ORIGINS?.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
});
```

## Monitoring & Logging

### Security Monitoring

1. **Failed Login Attempts**:
   - Tracked and alerted
   - Automatic account lockout
   - IP-based tracking

2. **Suspicious Activity**:
   - Unusual access patterns
   - Bulk data exports
   - Permission escalation attempts

### Audit Logging

1. **Logged Events**:
   - Authentication events
   - Data modifications
   - Permission changes
   - Financial transactions

2. **Log Retention**:
   - 90 days minimum
   - Encrypted storage
   - Tamper-proof design

## Vulnerability Management

### Automated Scanning

1. **Dependency Scanning**:
   - Daily Dependabot scans
   - Weekly OWASP checks
   - Snyk integration

2. **Code Scanning**:
   - CodeQL analysis
   - SAST on every PR
   - Secret scanning

### Security Updates

1. **Patch Management**:
   - Automated dependency updates
   - Security patch prioritization
   - Zero-day response plan

## Incident Response

### Response Plan

1. **Detection**:
   - Automated alerting
   - User reports
   - Security monitoring

2. **Response Steps**:
   - Isolate affected systems
   - Assess impact
   - Implement fixes
   - Notify affected users

3. **Post-Incident**:
   - Root cause analysis
   - Security improvements
   - Documentation updates

## Security Best Practices

### For Developers

1. **Code Reviews**:
   - Security-focused reviews
   - Automated security checks
   - Principle of least privilege

2. **Secrets Management**:
   - Never commit secrets
   - Use environment variables
   - Rotate credentials regularly

3. **Dependencies**:
   - Regular updates
   - Security audits
   - Minimal dependencies

### For Users

1. **Strong Passwords**:
   - Use password managers
   - Unique passwords
   - Regular updates

2. **Account Security**:
   - Enable 2FA (when available)
   - Monitor account activity
   - Report suspicious activity

## Compliance

### Standards

- OWASP Top 10 compliance
- SOC 2 Type II (planned)
- ISO 27001 (planned)

### Regulations

- GDPR (EU)
- CCPA (California)
- Industry-specific requirements

## Security Contact

For security concerns or vulnerability reports:

- Email: security@siteproof.com
- PGP Key: [Available on request]
- Response time: 24 hours

Please do not disclose security vulnerabilities publicly.