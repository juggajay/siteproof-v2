# 🔌 SiteProof v2 API Documentation

> Complete API reference for the SiteProof construction management platform

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Endpoints](#endpoints)
  - [Daily Diaries](#daily-diaries-api)
  - [Non-Conformance Reports (NCR)](#ncr-api)
  - [Inspection Test Plans (ITP)](#itp-api)
  - [Projects](#projects-api)
  - [Lots](#lots-api)
  - [AI Integration](#ai-api)
- [Webhooks](#webhooks)
- [Code Examples](#code-examples)

---

## Overview

### Base URL

```
Development: http://localhost:3000/api
Production:  https://your-domain.com/api
```

### Request Format

- **Content-Type**: `application/json`
- **CSRF Token**: Required for POST/PUT/DELETE (header: `x-csrf-token`)
- **Authentication**: Session cookie (httpOnly, secure)

### Response Format

All successful responses return JSON with consistent structure:

```json
{
  "data": { ... },        // Single object or array
  "pagination": {         // Only for list endpoints
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## Authentication

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your-password"
}
```

**Response** (200 OK):

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "session": {
    "access_token": "...",
    "refresh_token": "..."
  }
}
```

### Register

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "full_name": "John Doe"
}
```

### Logout

```http
POST /api/auth/logout
```

### Get Current User

```http
GET /api/auth/me
```

**Response** (200 OK):

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe"
  },
  "organization": {
    "id": "uuid",
    "name": "ABC Construction"
  },
  "member": {
    "role": "site_foreman",
    "permissions": { ... }
  }
}
```

---

## Rate Limiting

### Limits by Scope

| Scope                       | Limit        | Window     |
| --------------------------- | ------------ | ---------- |
| Auth routes (`/api/auth/*`) | 5 requests   | 15 minutes |
| Auth pages (`/auth/*`)      | 10 requests  | 15 minutes |
| Dashboard (`/dashboard`)    | 100 requests | 1 minute   |
| API routes (`/api/*`)       | 60 requests  | 1 minute   |
| Default                     | 30 requests  | 1 minute   |

### Rate Limit Headers

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1633024800
```

### Rate Limit Exceeded (429)

```json
{
  "error": "Too many requests",
  "retryAfter": 60
}
```

---

## Error Handling

### Error Response Format

```json
{
  "error": "User-friendly error message",
  "validationErrors": {
    // Only for validation errors
    "field_name": ["Error message 1", "Error message 2"]
  }
}
```

### HTTP Status Codes

| Code | Meaning               | Example                                |
| ---- | --------------------- | -------------------------------------- |
| 200  | Success               | Resource retrieved/updated             |
| 201  | Created               | Resource created successfully          |
| 400  | Bad Request           | Validation failed                      |
| 401  | Unauthorized          | Not authenticated                      |
| 403  | Forbidden             | Insufficient permissions / CSRF failed |
| 404  | Not Found             | Resource doesn't exist                 |
| 429  | Too Many Requests     | Rate limit exceeded                    |
| 500  | Internal Server Error | Unexpected error (logged)              |

### Common Errors

**Validation Error (400)**:

```json
{
  "error": "Validation failed",
  "validationErrors": {
    "diary_date": ["Invalid date format"],
    "project_id": ["Invalid UUID format"]
  }
}
```

**Authentication Error (401)**:

```json
{
  "error": "Authentication required"
}
```

**Permission Error (403)**:

```json
{
  "error": "Access denied"
}
```

**CSRF Error (403)**:

```json
{
  "error": "Invalid CSRF token"
}
```

---

## Daily Diaries API

### List Diaries

```http
GET /api/diaries?project_id={uuid}&page=1&limit=20&search=keyword
```

**Query Parameters**:

- `project_id` (required): UUID of the project
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `search` (optional): Search in work summary

**Response** (200 OK):

```json
{
  "data": [
    {
      "id": "uuid",
      "diary_date": "2025-10-08T00:00:00.000Z",
      "project_id": "uuid",
      "work_summary": "Concrete pour completed",
      "weather_morning": "Clear, 22°C",
      "weather_afternoon": "Partly cloudy, 25°C",
      "created_at": "2025-10-08T10:00:00.000Z",
      "created_by": "uuid",
      "approved_by": "uuid",
      "approved_at": "2025-10-08T16:00:00.000Z",
      "trades_on_site": [
        {
          "trade_type": "Carpenter",
          "number_of_workers": 5,
          "hours_worked": 8,
          // Financial fields only for authorized roles:
          "hourly_rate": 45.00,      // Filtered for viewer role
          "total_cost": 1800.00      // Filtered for viewer role
        }
      ],
      "plant_on_site": [ ... ],
      "materials_on_site": [ ... ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

### Get Single Diary

```http
GET /api/diaries/{id}
```

**Response** (200 OK):

```json
{
  "id": "uuid",
  "diary_date": "2025-10-08T00:00:00.000Z",
  "project_id": "uuid",
  "work_summary": "Concrete pour completed for foundation",
  "weather_morning": "Clear, 22°C",
  "weather_afternoon": "Partly cloudy, 25°C",
  "delays_description": null,
  "visitors_description": "Client site visit at 2pm",
  "safety_incidents": null,
  "created_at": "2025-10-08T10:00:00.000Z",
  "created_by": "uuid",
  "approved_by": "uuid",
  "approved_at": "2025-10-08T16:00:00.000Z",
  "trades_on_site": [ ... ],
  "plant_on_site": [ ... ],
  "materials_on_site": [ ... ],
  "labour_entries": [ ... ],
  "project": {
    "id": "uuid",
    "name": "Residential Tower Project"
  },
  "creator": {
    "id": "uuid",
    "full_name": "John Doe"
  }
}
```

### Create Diary

```http
POST /api/diaries
Content-Type: application/json
X-CSRF-Token: {token}

{
  "diary_date": "2025-10-08T00:00:00.000Z",
  "project_id": "uuid",
  "work_summary": "Concrete pour for south wing foundation completed",
  "weather_morning": "Clear, 22°C",
  "weather_afternoon": "Partly cloudy, 25°C",
  "delays_description": null,
  "visitors_description": "Client inspection at 2pm",
  "safety_incidents": null
}
```

**Validation Rules**:

- `diary_date`: Required, valid ISO 8601 date
- `project_id`: Required, valid UUID
- `work_summary`: Required, min 10 chars, max 5000 chars
- `weather_morning`: Optional, max 200 chars
- `weather_afternoon`: Optional, max 200 chars

**Response** (201 Created):

```json
{
  "id": "uuid",
  "diary_date": "2025-10-08T00:00:00.000Z",
  "project_id": "uuid",
  "work_summary": "Concrete pour for south wing foundation completed"
  // ... full diary object
}
```

### Update Diary

```http
PUT /api/diaries/{id}
Content-Type: application/json
X-CSRF-Token: {token}

{
  "work_summary": "Updated summary",
  "weather_afternoon": "Rain, 18°C"
}
```

**Response** (200 OK):

```json
{
  "id": "uuid"
  // ... updated diary object
}
```

### Delete Diary

```http
DELETE /api/diaries/{id}
X-CSRF-Token: {token}
```

**Response** (200 OK):

```json
{
  "message": "Diary deleted successfully"
}
```

### Approve Diary

```http
POST /api/diaries/{id}/approve
X-CSRF-Token: {token}
```

**Permissions**: Requires `admin`, `project_manager`, or `owner` role

**Response** (200 OK):

```json
{
  "id": "uuid",
  "approved_by": "uuid",
  "approved_at": "2025-10-08T16:00:00.000Z"
  // ... full diary object
}
```

---

## NCR API

### List NCRs

```http
GET /api/ncrs?project_id={uuid}&status=open&severity=high&page=1&limit=20
```

**Query Parameters**:

- `project_id` (optional): Filter by project
- `status` (optional): `open`, `in_progress`, `resolved`, `closed`
- `severity` (optional): `low`, `medium`, `high`, `critical`
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response** (200 OK):

```json
{
  "data": [
    {
      "id": "uuid",
      "ncr_number": "NCR-2025-001",
      "title": "Concrete strength below specification",
      "description": "Test results show 25 MPa instead of required 30 MPa",
      "severity": "high",
      "status": "in_progress",
      "location": "Grid A3-B4, Level 2",
      "detected_date": "2025-10-07T00:00:00.000Z",
      "detected_by": "uuid",
      "assigned_to": "uuid",
      "root_cause": "Incorrect water-cement ratio",
      "corrective_action": "Remove and replace affected area",
      "target_close_date": "2025-10-15T00:00:00.000Z",
      "closed_date": null,
      "project_id": "uuid",
      "created_at": "2025-10-07T10:00:00.000Z"
    }
  ],
  "pagination": { ... }
}
```

### Create NCR

```http
POST /api/ncrs
Content-Type: application/json
X-CSRF-Token: {token}

{
  "title": "Concrete strength below specification",
  "description": "Test results show 25 MPa instead of required 30 MPa",
  "severity": "high",
  "location": "Grid A3-B4, Level 2",
  "detected_date": "2025-10-07T00:00:00.000Z",
  "project_id": "uuid"
}
```

**Validation Rules**:

- `title`: Required, min 5 chars, max 200 chars
- `description`: Required, min 20 chars, max 5000 chars
- `severity`: Required, enum: `low | medium | high | critical`
- `location`: Optional, max 200 chars
- `detected_date`: Required, valid ISO 8601 date
- `project_id`: Required, valid UUID

**Response** (201 Created):

```json
{
  "id": "uuid",
  "ncr_number": "NCR-2025-001"
  // ... full NCR object
}
```

---

## ITP API

### List ITP Templates

```http
GET /api/itp?organization_id={uuid}&category=structural
```

**Response** (200 OK):

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Concrete Pour Inspection",
      "category": "structural",
      "description": "Standard concrete pour inspection checklist",
      "inspection_items": [
        {
          "item_number": "1",
          "description": "Formwork properly aligned",
          "acceptance_criteria": "Within ±5mm tolerance",
          "inspection_method": "Visual + Measurement"
        }
      ],
      "organization_id": "uuid",
      "is_template": true
    }
  ]
}
```

### Create Inspection Form

```http
POST /api/itp-forms
Content-Type: application/json
X-CSRF-Token: {token}

{
  "itp_template_id": "uuid",
  "lot_id": "uuid",
  "inspector_id": "uuid",
  "scheduled_date": "2025-10-10T00:00:00.000Z"
}
```

**Response** (201 Created):

```json
{
  "id": "uuid",
  "form_number": "ITP-2025-001",
  "itp_template_id": "uuid",
  "lot_id": "uuid",
  "status": "pending",
  "inspection_results": [],
  "created_at": "2025-10-08T10:00:00.000Z"
}
```

---

## Projects API

### List Projects

```http
GET /api/projects?organization_id={uuid}
```

**Response** (200 OK):

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Residential Tower Project",
      "project_number": "PROJ-2025-001",
      "location": "123 Main St, City",
      "start_date": "2025-01-01T00:00:00.000Z",
      "target_end_date": "2026-12-31T00:00:00.000Z",
      "status": "in_progress",
      "organization_id": "uuid"
    }
  ]
}
```

### Create Project

```http
POST /api/projects
Content-Type: application/json
X-CSRF-Token: {token}

{
  "name": "Commercial Building Project",
  "project_number": "PROJ-2025-002",
  "location": "456 Oak Ave, City",
  "start_date": "2025-02-01T00:00:00.000Z",
  "target_end_date": "2026-06-30T00:00:00.000Z"
}
```

---

## Lots API

### List Lots

```http
GET /api/lots?project_id={uuid}
```

**Response** (200 OK):

```json
{
  "data": [
    {
      "id": "uuid",
      "lot_number": "LOT-001",
      "description": "Foundation - Grid A1 to A5",
      "project_id": "uuid",
      "status": "in_progress",
      "assigned_itps": [
        {
          "id": "uuid",
          "name": "Concrete Pour Inspection"
        }
      ]
    }
  ]
}
```

### Assign ITP to Lot

```http
POST /api/lots/{lotId}/assign-itp
Content-Type: application/json
X-CSRF-Token: {token}

{
  "itp_template_id": "uuid"
}
```

---

## AI API

### Get Form Assistance

```http
POST /api/ai/assist
Content-Type: application/json
X-CSRF-Token: {token}

{
  "context": "daily_diary",
  "prompt": "Summarize today's concrete work",
  "data": {
    "activity": "Poured 50m³ of concrete for foundation",
    "weather": "Sunny, 25°C"
  }
}
```

**Response** (200 OK):

```json
{
  "suggestion": "Completed foundation concrete pour (50m³) under favorable weather conditions (sunny, 25°C). No delays reported.",
  "confidence": 0.95
}
```

---

## Webhooks

### Register Webhook

```http
POST /api/webhooks
Content-Type: application/json
X-CSRF-Token: {token}

{
  "url": "https://your-domain.com/webhook",
  "events": ["diary.created", "ncr.created", "inspection.approved"],
  "secret": "your-webhook-secret"
}
```

### Webhook Events

| Event                 | Triggered When            |
| --------------------- | ------------------------- |
| `diary.created`       | New diary entry created   |
| `diary.approved`      | Diary approved by manager |
| `ncr.created`         | New NCR raised            |
| `ncr.resolved`        | NCR marked as resolved    |
| `inspection.approved` | ITP inspection approved   |

### Webhook Payload Example

```json
{
  "event": "diary.created",
  "timestamp": "2025-10-08T10:00:00.000Z",
  "data": {
    "id": "uuid",
    "diary_date": "2025-10-08T00:00:00.000Z",
    "project_id": "uuid"
    // ... full diary object
  },
  "organization_id": "uuid"
}
```

---

## Code Examples

### JavaScript/TypeScript (Fetch)

```typescript
// Get CSRF token from cookie
const csrfToken = document.cookie
  .split('; ')
  .find((row) => row.startsWith('csrf-token='))
  ?.split('=')[1];

// Create diary
const response = await fetch('/api/diaries', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken,
  },
  credentials: 'include',
  body: JSON.stringify({
    diary_date: '2025-10-08T00:00:00.000Z',
    project_id: 'uuid',
    work_summary: 'Concrete pour completed',
  }),
});

if (!response.ok) {
  const error = await response.json();
  console.error('Error:', error);
} else {
  const data = await response.json();
  console.log('Diary created:', data);
}
```

### React Hook Example

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function useDiaries(projectId: string) {
  return useQuery({
    queryKey: ['diaries', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/diaries?project_id=${projectId}`);
      if (!response.ok) throw new Error('Failed to fetch diaries');
      return response.json();
    },
  });
}

function useCreateDiary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: DiaryFormData) => {
      const csrfToken = getCsrfToken();
      const response = await fetch('/api/diaries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['diaries', data.project_id]);
    },
  });
}
```

### cURL Examples

```bash
# Login
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# List diaries (with cookie)
curl -X GET https://your-domain.com/api/diaries?project_id=uuid \
  -H "Cookie: auth-token=xxx" \
  -b cookies.txt

# Create diary
curl -X POST https://your-domain.com/api/diaries \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: xxx" \
  -H "Cookie: auth-token=xxx" \
  -d '{
    "diary_date":"2025-10-08T00:00:00.000Z",
    "project_id":"uuid",
    "work_summary":"Work completed"
  }'
```

---

## Rate Limiting Best Practices

1. **Cache Responses**: Use client-side caching to reduce API calls
2. **Batch Requests**: Combine multiple operations when possible
3. **Implement Exponential Backoff**: Retry with increasing delays on 429
4. **Monitor Headers**: Check `X-RateLimit-Remaining` to prevent hitting limits

---

## Security Best Practices

1. **Never Log Sensitive Data**: Don't log API keys, tokens, or passwords
2. **Validate All Inputs**: Client-side AND server-side
3. **Use HTTPS Only**: Never send requests over HTTP
4. **Handle Errors Gracefully**: Don't expose internal details
5. **Rotate Credentials**: Regular password and API key rotation

---

## Support

For API issues or questions:

- **Email**: api-support@siteproof.com
- **Documentation**: https://docs.siteproof.com
- **GitHub Issues**: https://github.com/your-org/siteproof-v2/issues
