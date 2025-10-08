# Third-Party Integrations & External Dependencies

**Last Updated:** 2025-10-08
**Project:** SiteProof v2
**Status:** Complete Production Audit
**Purpose:** UI Design Overhaul Migration Guide

---

## Executive Summary

This document provides a **comprehensive inventory** of all third-party integrations, external dependencies, and production concerns that could be affected by the UI design overhaul. Any changes to UI components, API contracts, or data structures must maintain compatibility with these integrations.

**CRITICAL FINDING**: The application has extensive integration with external services across report generation, email delivery, file processing, push notifications, weather data, and AI services. Breaking changes to data structures or API contracts could result in production failures.

### Critical Integration Count
- **Background Job System:** Trigger.dev (5 report types, 4+ formats each)
- **Email Service:** Resend API (1 React Email template)
- **Push Notifications:** Web Push (3 API endpoints, 2 database tables)
- **File Generation:** jsPDF + html2canvas (client), xlsx (server), @react-pdf/renderer
- **AI Services:** Anthropic Claude (6 specialized assistants)
- **Weather API:** OpenWeatherMap (3 endpoints with caching)
- **Database:** Supabase (Storage, Auth, RLS, RPC functions)
- **Offline Sync:** IndexedDB via Dexie (4 stores)
- **Analytics:** Google Analytics, PostHog, Sentry (all optional)

### Migration Risk Assessment
- 🔴 **HIGH RISK**: Trigger.dev job payloads, Supabase storage paths, Email templates
- 🟡 **MEDIUM RISK**: File export formats, Push notification schema, Offline sync
- 🟢 **LOW RISK**: UI components (as long as data flow maintained), Analytics

---

## 1. Background Jobs (Trigger.dev)

### Integration Overview
**Packages**:
- `@trigger.dev/sdk` v3.3.17
- `@trigger.dev/nextjs` v3.3.12

**Configuration File**: `/apps/web/src/trigger.ts`
```typescript
export const client = new TriggerClient({
  id: "siteproof-v2",
  apiKey: process.env.TRIGGER_API_KEY,
  apiUrl: process.env.TRIGGER_API_URL,
});
```

**Environment Variables**:
- `TRIGGER_API_KEY` (required)
- `TRIGGER_API_URL` (default: https://api.trigger.dev)

### Job Definition: Report Generation

**Primary File**: `/apps/web/src/jobs/generate-report.ts`
**Trigger Event**: `report.generate`
**Job ID**: `generate-report`
**Version**: 1.0.0

**Supported Report Types**:
1. **project_summary** - Project overview with diaries, inspections, NCRs, financial data
2. **daily_diary_export** - Daily diaries with workforce, equipment, materials, weather
3. **inspection_summary** - Inspection statistics, pass rates, template analysis
4. **ncr_report** - Non-conformance reports with severity breakdown, resolution tracking
5. **financial_summary** - Cost reports (requires `has_financial_access` permission)

**Supported Output Formats**: `pdf`, `excel`, `csv`, `json`

### API Contract (MUST NOT CHANGE)

**Event Payload Schema**:
```typescript
{
  reportId: string (uuid),          // Primary key in report_queue table
  reportType: enum [
    "project_summary",
    "daily_diary_export",
    "inspection_summary",
    "ncr_report",
    "financial_summary",
    "safety_report",          // Reserved for future
    "quality_report",         // Reserved for future
    "custom"                  // Reserved for future
  ],
  format: enum ["pdf", "excel", "csv", "json"],
  parameters: Record<string, any>,  // Report-specific filters/options
  organizationId: string (uuid),
  requestedBy: string (uuid)
}
```

**Response Structure**:
```typescript
{
  success: boolean,
  reportId: string,
  fileUrl: string,        // URL to download generated file
  fileSize: number        // Size in bytes
}
```

### Database Dependencies

**Table**: `report_queue`
```sql
Columns: id, report_type, format, parameters, status, progress,
         current_step, file_url, file_size, error_message,
         organization_id, requested_by, created_at, updated_at
```

**RPC Functions**:
- `update_report_status(p_report_id, p_status, p_progress, p_current_step, p_file_url?, p_file_size?, p_error_message?)`
- `has_financial_access(p_organization_id, p_user_id)` → boolean

### Job Implementation Files

1. **Daily Diary Export**: `/apps/web/src/jobs/reports/daily-diary-export.ts`
   - Status: Stub implementation (returns mock data)
   - Expected: Full implementation with Excel/PDF/CSV generation

2. **Project Summary**: `/apps/web/src/jobs/reports/project-summary.ts`
   - Status: Stub implementation
   - Expected: Aggregate data from diaries, inspections, NCRs

3. **Inspection Summary**: `/apps/web/src/jobs/reports/inspection-summary.ts`
   - Status: Stub implementation

4. **NCR Report**: `/apps/web/src/jobs/reports/ncr-report.ts`
   - Status: Stub implementation

5. **Financial Summary**: `/apps/web/src/jobs/reports/financial-summary.ts`
   - Status: Stub implementation
   - Requires: Financial access check

### UI Components Affected

**Report Generation UI**:
- **Location**: `/apps/web/src/features/reporting/components/ReportGenerationForm.tsx`
- **Features**: Report type selection, date range picker, format selector, filter options
- **API Call**: `POST /api/reports/generate` → Triggers Trigger.dev job

**Report Status Display**:
- **Location**: `/apps/web/src/features/reporting/components/RecentReportsList.tsx`
- **Features**: Real-time status updates, progress bars, download buttons
- **Status Flow**: `pending` → `processing` (with progress 0-100%) → `completed` | `failed`
- **Polling**: Client-side polling every 2-5 seconds for status updates

**API Endpoints**:
- `POST /api/reports/generate` - Trigger report generation
- `GET /api/reports` - List all reports for organization
- `GET /api/reports/[id]` - Get report status
- `GET /api/reports/[id]/download` - Download completed report
- `POST /api/reports/[id]/retry` - Retry failed report
- `POST /api/reports/[id]/cancel` - Cancel pending report

### Migration Risks 🔴 HIGH

1. **Payload Structure**: Any changes to form data must maintain exact field names and types
2. **Status Tracking**: Progress indicators depend on specific status values and progress percentage
3. **Download URLs**: File URLs from Trigger.dev must be properly handled in UI
4. **Error Handling**: Error messages from jobs must be displayed correctly
5. **Permissions**: Financial report access control must be maintained

**Testing Requirements**:
- [ ] Generate all 5 report types in all 4 formats (20 combinations)
- [ ] Verify status updates appear correctly in UI
- [ ] Test download functionality for each format
- [ ] Validate error handling and retry mechanisms
- [ ] Test with concurrent report generation (10+ reports)

---

## 2. Email Service (Resend)

### Integration Overview
**Package**: `resend` v3.2.0
**React Email**: `@react-email/components` v0.0.15, `@react-email/render` v0.0.12

**Service File**: `/apps/web/src/lib/email.ts`

**Configuration**:
```typescript
const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_FROM = process.env.EMAIL_FROM || 'SiteProof <notifications@siteproof.io>';
```

**Environment Variables**:
- `RESEND_API_KEY` (required, fallback to mock mode if missing)
- `EMAIL_FROM` (optional, default: `SiteProof <notifications@siteproof.io>`)

### Email Templates

#### Invitation Email
**Template File**: `/apps/web/src/emails/InvitationEmail.tsx`

**Props Interface** (MUST NOT CHANGE):
```typescript
interface InvitationEmailProps {
  inviterName: string,        // Full name of person sending invitation
  inviterEmail: string,       // Email of inviter
  organizationName: string,   // Organization name
  invitationUrl: string,      // Full URL to accept invitation
  recipientEmail: string      // Email of invited person
}
```

**Template Structure**:
- Preview text: "{inviterName} invited you to join {organizationName} on SiteProof"
- Subject line: "You're invited to join {organizationName}"
- CTA Button: "Accept Invitation" → links to `invitationUrl`
- Expiration: 7 days
- Fallback link provided for email clients without button support

**Email Styling** (Must remain email-client compatible):
- Background: `#f6f9fc`
- Container: `#ffffff` with border radius and shadow
- Primary button: `#2563eb` (blue-600)
- Text color: `#333`
- Footer text: `#697386`
- Link color: `#2563eb`

### API Flow

**Endpoint**: `POST /api/organizations/[id]/invite`
**Location**: `/apps/web/src/app/api/organizations/[id]/invite/route.ts`

**Flow**:
1. UI form submits invitation request
2. API creates invitation record in database
3. Generates unique invitation token (7-day expiration)
4. Renders React Email template with props
5. Sends email via Resend API
6. Returns success/failure response

### UI Components Affected

**Invitation Form**:
- **Location**: `/apps/web/src/features/auth/components/InviteMemberForm.tsx`
- **Fields**: Email address, role selection (optional)
- **API Call**: `POST /api/organizations/[id]/invite`
- **Success**: Shows success toast with "Invitation sent to {email}"
- **Error Handling**: Displays Resend API errors to user

**Organization Members Management**:
- **Location**: Various organization settings pages
- **Features**: Send invitation, resend invitation, revoke invitation

### Fallback Behavior

If `RESEND_API_KEY` is not configured:
- Email sending logs to console instead
- Returns mock email ID: `mock-email-id`
- No actual email sent (development mode)

### Migration Risks 🔴 HIGH

1. **Template Props**: React Email template expects exact prop structure
2. **URL Generation**: Invitation URL must be absolute and correctly formatted
3. **Email Styling**: Must use inline styles (no Tailwind in email)
4. **Button Compatibility**: CTA button must work in all major email clients
5. **Token Expiration**: UI must handle expired invitation links gracefully

**Testing Requirements**:
- [ ] Send test invitation and verify email receipt
- [ ] Test email rendering in Gmail, Outlook, Apple Mail
- [ ] Verify invitation link works correctly
- [ ] Test expired invitation link handling
- [ ] Validate error messages for invalid emails

---

## 3. File Processing & Export

### 3.1 PDF Generation (Client-Side)

**Package**: `jspdf` v3.0.1
**Companion**: `html2canvas` v1.4.1 (for HTML → Image conversion)

**Primary Component**: `/apps/web/src/components/reports/BrandedPDFExport.tsx`

**Features**:
- Custom branded PDFs with company logo
- Configurable color schemes (primary/secondary colors)
- Watermarks and page numbers
- Generation date stamps
- Multi-page support with consistent branding

**Branding Settings Interface**:
```typescript
interface BrandingSettings {
  companyName: string,
  logoUrl: string,              // Stored in Supabase storage
  primaryColor: string,         // Hex color for headers
  secondaryColor: string,       // Hex color for text
  footerText: string,           // Custom footer text
  includeWatermark: boolean,
  includePageNumbers: boolean,
  includeGeneratedDate: boolean
}
```

**Supported Report Types**:
- ITP (Inspection & Test Plans)
- NCR (Non-Conformance Reports)
- Inspection Reports
- Daily Diary Reports
- Project Summary Reports

**Logo Handling**:
```typescript
// Logo must be accessible as window.Image()
const img = new window.Image();
img.src = brandingSettings.logoUrl;
await new Promise((resolve) => { img.onload = resolve; });
pdf.addImage(img, 'PNG', x, y, width, height);
```

**UI Components**:
- Branding settings modal with logo upload
- Color picker inputs (type="color")
- Preview and export buttons
- Progress indicators during PDF generation

**API Endpoints**:
- `GET /api/organizations/[id]/branding` - Fetch branding settings
- `PUT /api/organizations/[id]/branding` - Save branding settings
- `POST /api/organizations/upload-logo` - Upload company logo
- `POST /api/reports/export-log` - Log PDF exports for analytics

**Migration Risks** 🟡 MEDIUM:
- Logo URLs must remain accessible after UI changes
- Color values must be valid hex codes
- PDF layout tied to current data structure
- Download functionality depends on browser support

### 3.2 PDF Generation (Server-Side - Future)

**Package**: `@react-pdf/renderer` v4.3.0
**Status**: Installed but not actively used
**Purpose**: Server-side PDF generation for complex layouts

### 3.3 Excel Generation

**Package**: `xlsx` v0.18.5 (also known as SheetJS)

**Primary Service**: `/apps/web/src/lib/reports/excel-generator.ts`
**Export Service**: `/apps/web/src/lib/export/diary-export.ts`

**Excel Report Types**:

1. **Project Summary Excel**
   ```typescript
   Sheets:
   - Project Overview: Basic project metadata
   - Daily Diaries: List of all diary entries
   - Inspections: Inspection summary and pass rates
   - NCRs: Non-conformance tracking
   ```

2. **Daily Diary Export**
   ```typescript
   Sheets:
   - Diary Summary: Header information, weather, notes
   - Workforce: Trades, companies, workers, hours, costs*
   - Equipment: Type, description, supplier, hours
   - Materials: Material, quantity, supplier, delivery details
   - Delays: Type, description, duration, impact
   - Safety Incidents: Type, description, action, reporting
   - Inspections: Type, inspector, findings
   - Visitors: Name, company, purpose, time in/out
   - Milestones: Achievements list
   * Costs only included if user has financial access
   ```

3. **Inspection Summary Excel**
   ```typescript
   Sheets:
   - Summary: Aggregate statistics
   - Inspection Details: Individual inspection records
   - By Template: Grouped by inspection template
   - By Inspector: Grouped by inspector name
   ```

4. **NCR Report Excel**
   ```typescript
   Sheets:
   - NCR Summary: Count by status
   - NCR List: Full details of each NCR
   - By Severity: Critical, Major, Minor breakdown
   - By Category: Categorized NCRs
   ```

**Excel Features**:
- Auto-sized columns (10-50 char limit)
- Summary rows with formulas
- Metadata header (title, org, date, generated by)
- Sheet index in summary sheet
- Custom formatting (bold headers, borders)

**API Endpoints**:
- `GET /api/diaries/[id]/export?format=excel` - Export single diary
- `GET /api/reports/[id]/download` - Download report from Trigger.dev job
- `GET /api/projects/[projectId]/lots/[lotId]/export` - Export lot data
- `GET /api/inspections/bulk-download` - Bulk export inspections

**Migration Risks** 🟡 MEDIUM:
- Column headers hardcoded to match current field names
- Data structure changes will break sheet generation
- Summary calculations depend on specific field types
- Sheet names have character limit (31 chars, no special chars)

### 3.4 Image Processing

**Package**: `html2canvas` v1.4.1

**Usage**: Converting HTML elements to images for embedding in PDFs or reports

**Browser Compatibility**:
```typescript
// Must use browser's Image constructor
const img = new window.Image();
```

**Use Cases**:
- Logo embedding in PDFs
- Chart/graph capture for reports
- Screenshot functionality (future)

---

## 4. Push Notifications (Web Push)

### Integration Overview
**Package**: `web-push` v3.6.7

**Service File**: `/apps/web/src/app/api/notifications/send/route.ts`

**Configuration**:
```typescript
webpush.setVapidDetails(
  'mailto:support@siteproof.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);
```

**Environment Variables**:
- `VAPID_PUBLIC_KEY` (required for push notifications)
- `VAPID_PRIVATE_KEY` (required for push notifications)

### Database Schema

**Table: push_subscriptions**
```sql
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,        -- Encryption key
  auth TEXT NOT NULL,           -- Authentication secret
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Table: notification_logs**
```sql
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY,
  sent_by UUID NOT NULL,
  recipient_ids UUID[] NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  success_count INTEGER,
  total_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Notification Payload Structure

**Request Schema**:
```typescript
{
  userId?: string (uuid),              // Single recipient
  userIds?: string[] (uuid[]),         // Multiple recipients
  title: string,                       // Notification title
  body: string,                        // Notification body
  icon?: string,                       // Icon URL (default: /icons/icon-192x192.png)
  badge?: string,                      // Badge URL (default: /icons/icon-72x72.png)
  url?: string,                        // Click action URL
  tag?: string,                        // Notification grouping tag
  requireInteraction?: boolean,        // Persistent notification
  actions?: Array<{                    // Action buttons
    action: string,
    title: string,
    icon?: string
  }>,
  data?: any                           // Custom data payload
}
```

**Generated Payload** (sent to browser):
```json
{
  "title": "Notification Title",
  "body": "Notification body text",
  "icon": "/icons/icon-192x192.png",
  "badge": "/icons/icon-72x72.png",
  "url": "/dashboard/ncrs/123",
  "tag": "notification-1234567890",
  "requireInteraction": false,
  "actions": [
    {"action": "view", "title": "View"},
    {"action": "dismiss", "title": "Dismiss"}
  ],
  "data": {
    "timestamp": "2025-10-08T12:00:00Z",
    "customField": "value"
  }
}
```

### API Endpoints

1. **Send Notification**: `POST /api/notifications/send`
   - Requires authentication
   - Sends to one or more users
   - Logs success/failure per recipient
   - Removes expired subscriptions (HTTP 410)

2. **Subscribe**: `POST /api/notifications/subscribe`
   - Registers push subscription for current user
   - Stores endpoint and encryption keys

3. **VAPID Public Key**: `GET /api/notifications/vapid-public-key`
   - Returns public key for browser subscription
   - Used by service worker

### UI Components

**Notification Settings**:
- **Location**: `/apps/web/src/components/notifications/NotificationSettings.tsx`
- **Features**: Enable/disable notifications, test notification, subscription management
- **Browser Permission**: Requests `Notification.requestPermission()`

**Service Worker** (Required for PWA):
- Must be registered to handle push events
- Icon assets must exist at `/public/icons/`

### Migration Risks 🟡 MEDIUM

1. **Icon Paths**: Notification icons must remain at `/icons/` directory
2. **Payload Structure**: Browser expects specific JSON structure
3. **Subscription Management**: Breaking changes to subscription flow will break notifications
4. **Action URLs**: Click action URLs must match new routing structure
5. **Service Worker**: Must remain compatible with new UI architecture

**Testing Requirements**:
- [ ] Test notification subscription flow
- [ ] Verify notifications appear in browser
- [ ] Test action buttons click behavior
- [ ] Validate icon and badge display
- [ ] Test notification on different browsers (Chrome, Firefox, Edge, Safari)

---

## 5. Weather API (OpenWeatherMap)

### Integration Overview
**API Provider**: OpenWeatherMap
**Package**: None (direct fetch API calls)

**Service File**: `/apps/web/src/features/diary/services/weatherService.ts`

**Environment Variable**:
- `NEXT_PUBLIC_OPENWEATHER_API_KEY` (optional, falls back to mock data if missing)

### API Endpoints Used

1. **Current Weather**:
   ```
   GET https://api.openweathermap.org/data/2.5/weather
   Params: lat, lon, appid, units=metric
   ```

2. **5-Day Forecast**:
   ```
   GET https://api.openweathermap.org/data/2.5/forecast
   Params: lat, lon, appid, units=metric
   Returns: 3-hour interval forecasts
   ```

3. **Geocoding**:
   ```
   GET http://api.openweathermap.org/geo/1.0/direct
   Params: q (location name), limit, appid
   Returns: lat/lon coordinates
   ```

### Data Structure

**WeatherData Interface**:
```typescript
interface WeatherData {
  temperature: {
    min: number,           // Celsius
    max: number,           // Celsius
    unit: string           // Always "C"
  },
  conditions: string,      // e.g., "Clouds", "Rain", "Clear"
  description: string,     // e.g., "Partly Cloudy With Light Winds"
  humidity: number,        // Percentage
  wind: {
    speed: number,         // km/h (converted from m/s)
    direction: string,     // e.g., "NW", "SE"
    unit: string           // Always "km/h"
  },
  precipitation: {
    amount: number,        // mm
    probability: number    // Percentage
  },
  uv_index: number,        // 0-11+ scale
  sunrise: string,         // HH:MM format
  sunset: string,          // HH:MM format
  fetched_at: string,      // ISO timestamp
  source: string           // "OpenWeatherMap" or "Mock Data"
}
```

### Caching Strategy

**In-Memory Cache**:
- TTL: 1 hour (3600000 ms)
- Cache Key Format: `{location}-{date}` or `{lat},{lon}-today`
- Automatic cleanup of expired entries

### Fallback Behavior

**Mock Data** (used when API key missing or API fails):
```javascript
{
  temperature: { min: 15, max: 25, unit: 'C' },
  conditions: 'Partly Cloudy',
  description: 'Partly Cloudy With Light Winds',
  humidity: 65,
  wind: { speed: 12, direction: 'NW', unit: 'km/h' },
  precipitation: { amount: 0, probability: 10 },
  uv_index: 6,
  sunrise: '06:30',
  sunset: '18:45',
  fetched_at: new Date().toISOString(),
  source: 'Mock Data'
}
```

### UI Components Affected

**Weather Display**:
- **Location**: `/apps/web/src/features/diary/components/WeatherDisplay.tsx`
- **Features**: Temperature, conditions, wind, humidity display
- **Icons**: Weather condition icons (must remain accessible)

**Daily Diary Weather Section**:
- **Location**: `/apps/web/src/features/diary/components/DiaryForm/SimplifiedWeatherSection.tsx`
- **Features**: Auto-fetch weather for diary date and location
- **Manual Override**: Users can manually edit fetched weather data

**AI Weather Dashboard**:
- **Location**: `/apps/web/src/features/ai/components/WeatherDashboard.tsx`
- **Features**: Weather-based construction recommendations

### Usage in Reports

**Daily Diary Reports**:
- Weather data included in PDF and Excel exports
- Shows in report header with icons
- Historical weather data preserved in database

### Migration Risks 🟢 LOW

1. **Data Structure**: UI must handle both real and mock data identically
2. **Display Format**: Temperature, wind speed units must remain consistent
3. **Error Handling**: Graceful degradation when API unavailable
4. **Caching**: Cache invalidation must work correctly with new UI

**Testing Requirements**:
- [ ] Test with valid API key (real weather data)
- [ ] Test without API key (mock data)
- [ ] Verify weather displays correctly in diary form
- [ ] Test weather data in exported reports
- [ ] Validate caching behavior

---

## 6. Database (Supabase)

### Integration Overview
**Package**: `@supabase/supabase-js` v2.39.3
**SSR Package**: `@supabase/ssr` v0.1.0

**Configuration**: `/apps/web/src/lib/supabase/server.ts`

**Environment Variables**:
- `NEXT_PUBLIC_SUPABASE_URL` (required)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (required, public API key)
- `SUPABASE_SERVICE_ROLE_KEY` (required for server-side operations)

### Supabase Storage

**Purpose**: File uploads for photos, reports, logos, signatures

**Expected Bucket Structure**:
```
Storage Buckets:
├── photos/
│   ├── diaries/{diary_id}/{photo_id}.jpg
│   ├── inspections/{inspection_id}/{photo_id}.jpg
│   └── ncrs/{ncr_id}/{photo_id}.jpg
├── reports/
│   └── {organization_id}/{report_id}.{pdf|xlsx|csv|json}
├── logos/
│   └── {organization_id}/logo.{png|jpg|svg}
├── signatures/
│   └── {user_id}/{signature_id}.png
└── attachments/
    └── {entity_type}/{entity_id}/{file_name}
```

### File Upload Constraints

**From `/apps/web/src/config/env.ts`**:
```typescript
NEXT_PUBLIC_MAX_FILE_SIZE: 10485760,  // 10MB
NEXT_PUBLIC_ALLOWED_FILE_TYPES: "image/*,application/pdf"
```

### File Upload Components

**Photo Upload**:
- **Location**: `/apps/web/src/components/photo/PhotoUpload.tsx`
- **Hook**: `/apps/web/src/hooks/use-photo-upload.ts`
- **Features**: Drag-and-drop, preview, progress tracking, validation

**Photo Capture (Mobile)**:
- **Location**: `/apps/web/src/features/inspections/components/PhotoCapture.tsx`
- **Features**: Camera access, real-time capture, offline support

### API Endpoints for Files

1. **Photo Upload**: `POST /api/photos/upload`
2. **Diary Photos**: `GET /api/diaries/[id]/photos`
3. **Logo Upload**: `POST /api/organizations/upload-logo`
4. **Report Download**: `GET /api/reports/[id]/download`

### Row-Level Security (RLS)

**All tables have RLS enabled**:
- Users can only access data from their organization
- Role-based permissions (admin, manager, foreman, worker)
- Financial data requires special permission

### Remote Procedure Calls (RPC)

**Used by Trigger.dev and API routes**:
- `update_report_status(...)` - Update report generation status
- `has_financial_access(...)` - Check user permissions
- Various CRUD operations wrapped in RPC for security

### Migration Risks 🔴 HIGH

1. **Storage Paths**: Hardcoded paths in components must match bucket structure
2. **Public URLs**: URL generation logic depends on bucket configuration
3. **RLS Policies**: Must remain compatible with new UI auth flow
4. **RPC Functions**: Payload structures must not change
5. **File Upload Progress**: UI progress indicators tied to Supabase upload events

**Testing Requirements**:
- [ ] Test file upload to each bucket
- [ ] Verify public URL generation
- [ ] Test file download from storage
- [ ] Validate RLS policies with different user roles
- [ ] Test with 10MB+ files (should fail gracefully)

---

## 7. Offline Functionality (IndexedDB via Dexie)

### Integration Overview
**Package**: `dexie` v3.2.7

**Database File**: `/apps/web/src/features/inspections/offline/db.ts`

### IndexedDB Schema

**Database Name**: `SiteProofOfflineDB`

**Stores**:
```typescript
{
  inspections: 'id, status, lastModified',
  inspectionItems: 'id, inspectionId, lastModified',
  photos: 'id, inspectionId, blob',
  syncQueue: '++id, type, status, createdAt'
}
```

### Sync Manager

**Service File**: `/apps/web/src/features/inspections/utils/syncManager.ts`

**Sync Strategy**:
1. Queue changes in IndexedDB when offline
2. Periodically attempt sync when online
3. Conflict resolution based on timestamps
4. Retry failed syncs with exponential backoff

**Sync Queue Item**:
```typescript
{
  id: number,
  type: 'create' | 'update' | 'delete',
  entity: 'inspection' | 'inspectionItem' | 'photo',
  entityId: string,
  data: any,
  status: 'pending' | 'syncing' | 'synced' | 'error',
  createdAt: number,
  attempts: number
}
```

### API Endpoints

1. **Sync Endpoint**: `POST /api/inspections/sync`
   - Accepts batch of changes
   - Returns conflicts if any
   - Updates local lastModified timestamps

2. **Resolve Conflicts**: `POST /api/inspections/resolve-conflicts`
   - Manual conflict resolution
   - Allows user to choose server or local version

### UI Hooks

**useInspectionSync**:
- **Location**: `/apps/web/src/features/inspections/hooks/useInspectionSync.ts`
- **Features**: Auto-sync on network reconnection, sync status, manual sync trigger
- **UI Indicators**: Offline badge, sync progress, conflict notifications

### Service File

**Offline Sync Service**: `/apps/web/src/lib/offline/inspection-sync.ts`

### Migration Risks 🟡 MEDIUM

1. **Schema Changes**: IndexedDB schema changes require migrations
2. **Sync Logic**: Must handle data structure changes gracefully
3. **Conflict Resolution**: UI must support new field conflicts
4. **Backward Compatibility**: Existing offline data must migrate correctly

**Testing Requirements**:
- [ ] Create data while offline, verify sync when online
- [ ] Test conflict resolution UI
- [ ] Verify photo upload queue works offline
- [ ] Test with large sync queue (100+ items)
- [ ] Validate migration from old schema to new

---

## 8. AI Services (Anthropic Claude)

### Integration Overview
**Package**: `@anthropic-ai/sdk` v0.40.0

**Environment Variable**: (Not explicitly shown in code, likely in env)

### AI Assistants

**Specialized AI Services** (located in `/apps/web/src/lib/ai/services/`):

1. **Weather Decision Engine** (`weather-decision-engine.ts`)
   - Analyzes weather impact on construction activities
   - Provides recommendations for scheduling

2. **Project Timeline Analyzer** (`project-timeline-analyzer.ts`)
   - Analyzes project schedules
   - Predicts delays and suggests optimizations

3. **ITP Generator** (`itp-generator.ts`)
   - Generates Inspection & Test Plans from project requirements
   - Customizes based on project type

4. **Compliance Checker** (`compliance-checker.ts`)
   - Validates compliance with regulations
   - Identifies potential issues

5. **Automated Inspection Analyzer** (`automated-inspection-analyzer.ts`)
   - Analyzes inspection photos and data
   - Identifies defects and concerns

6. **AI Scheduling Optimizer** (`ai-scheduling-optimizer.ts`)
   - Optimizes crew schedules
   - Considers weather, resources, dependencies

### AI Tool Registry

**File**: `/apps/web/src/lib/ai/tools/tool-registry.ts`

**Construction-Specific Tools** (`construction-tools.ts`):
- Project data queries
- Schedule analysis
- Resource optimization
- Risk assessment

**Weather Tool** (`check-weather.ts`):
- Integration with OpenWeatherMap
- Construction-specific weather analysis

### API Endpoints

1. **AI Assistant**: `POST /api/ai/ask`
   - General-purpose AI assistant
   - Tool calling with construction context

2. **Generate ITP Report**: `POST /api/ai/generate-itp-report`
   - AI-generated ITP documents

### UI Components

**AI Construction Assistant**:
- **Location**: `/apps/web/src/features/ai/components/AIConstructionAssistant.tsx`
- **Features**: Chat interface, tool execution, context awareness

**Project Timeline Dashboard**:
- **Location**: `/apps/web/src/features/ai/components/ProjectTimelineDashboard.tsx`
- **Features**: Timeline visualization, AI insights

**Weather Dashboard**:
- **Location**: `/apps/web/src/features/ai/components/WeatherDashboard.tsx`
- **Features**: Weather forecast, construction impact analysis

**AI Report Generator**:
- **Location**: `/apps/web/src/features/ai/components/AIReportGenerator.tsx`
- **Features**: Natural language report generation

### Migration Risks 🟡 MEDIUM

1. **Tool Definitions**: AI tools depend on current data structures
2. **Prompt Engineering**: Prompts reference specific database fields
3. **Response Parsing**: UI expects specific AI response formats
4. **Context Building**: AI context built from current schema

**Testing Requirements**:
- [ ] Test AI assistant with sample queries
- [ ] Verify tool execution returns correct data
- [ ] Validate ITP generation produces valid documents
- [ ] Test with missing or incomplete data

---

## 9. Analytics & Monitoring (Optional)

### Google Analytics
**Environment Variable**: `NEXT_PUBLIC_GA_MEASUREMENT_ID`
**Feature Flag**: `NEXT_PUBLIC_ENABLE_ANALYTICS`
**Status**: Optional, not required for core functionality

### PostHog (Product Analytics)
**Environment Variables**:
- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST`

**Feature Flag**: `NEXT_PUBLIC_ENABLE_ANALYTICS`
**Status**: Optional

### Sentry (Error Tracking)
**Environment Variables**:
- `SENTRY_DSN`
- `SENTRY_AUTH_TOKEN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`

**Feature Flag**: `NEXT_PUBLIC_ENABLE_SENTRY`
**Status**: Optional

**Migration Risk**: 🟢 LOW - These are optional and do not affect core functionality

---

## 10. State Management & Caching

### React Query (TanStack Query)
**Package**: `@tanstack/react-query` v5.17.19
**Devtools**: `@tanstack/react-query-devtools` v5.17.19

**Usage**: Primary data fetching and caching library

**Key Patterns**:
- Query keys based on entity and ID
- Automatic refetch on window focus
- Optimistic updates for mutations
- Cache invalidation on mutations

### SWR
**Package**: `swr` v2.3.6

**Usage**: Real-time data for dashboard widgets

**API Endpoints**:
- `/api/dashboard/widgets/project-summary`
- `/api/dashboard/widgets/active-itps`
- `/api/dashboard/widgets/ncr-overview`

### Redis (Optional)
**Package**: `ioredis` v5.6.1
**Environment Variable**: `REDIS_URL` (default: redis://localhost:6379)

**Usage**:
- API rate limiting
- Session storage (optional)
- Cache for expensive queries

**Status**: Optional, not required for development

---

## 11. Form Libraries & Validation

### React Hook Form
**Package**: `react-hook-form` v7.49.3
**Resolver**: `@hookform/resolvers` v3.3.4

**Usage**: All forms in application (50+ forms)

### Zod
**Package**: `zod` v3.22.4

**Schema Example**: `/apps/web/src/features/auth/schemas/auth.schema.ts`

**Migration Risk** 🟡 MEDIUM:
- Form schemas tied to current data model
- Error messages hardcoded in schemas
- Field names must match API contracts

---

## 12. Testing Infrastructure

### End-to-End Testing
**Package**: `@playwright/test` v1.54.1, `playwright` v1.54.2

**Test Files**: `/tests/*.spec.ts`, `/apps/web/tests/e2e/*.spec.ts`

**Coverage**:
- Complete user flows (login, create diary, generate report, etc.)
- Multi-step workflows
- Mobile responsiveness

### Unit/Integration Testing
**Package**: `vitest` v3.2.4
**React Testing**: `@testing-library/react` v16.3.0

**Test Files**: `*.test.ts`, `*.test.tsx` files throughout codebase

### Mocking
**Package**: `@faker-js/faker` v9.9.0

**Usage**: Generate realistic test data

**Migration Risk** 🟡 MEDIUM:
- Test selectors (data-testid, IDs, classes) will break with UI changes
- Visual regression tests need updating
- E2E test flows tied to current UI structure

---

## Migration Strategy

### Phase 1: Pre-Migration Audit ✅ COMPLETE

1. ✅ Document all integration points (this document)
2. ⏳ Create comprehensive integration test suite
3. ⏳ Establish baseline performance metrics
4. ⏳ Document all API contracts in detail

### Phase 2: Design Migration with Feature Flags

**Strategy**: Parallel component development

1. **Create New Components Alongside Old**:
   ```typescript
   // Old component stays
   import { OldReportForm } from './OldReportForm';

   // New component added
   import { NewReportForm } from './NewReportForm';

   // Feature flag toggle
   const ReportForm = useFeatureFlag('new-design')
     ? NewReportForm
     : OldReportForm;
   ```

2. **Maintain API Contracts**:
   - Do NOT change payload structures
   - Add new fields as optional
   - Deprecate old fields gradually
   - Maintain backward compatibility

3. **Test Both Versions**:
   - Run integration tests against both old and new UI
   - Verify data flows identically
   - Check all external integrations

### Phase 3: Integration Testing Checklist

#### Report Generation 🔴 CRITICAL
- [ ] Generate project_summary in PDF format
- [ ] Generate project_summary in Excel format
- [ ] Generate daily_diary_export in all formats
- [ ] Generate inspection_summary in all formats
- [ ] Generate ncr_report in all formats
- [ ] Verify financial_summary requires permission
- [ ] Test report status polling and progress updates
- [ ] Test download functionality for completed reports
- [ ] Test error handling for failed reports
- [ ] Test concurrent report generation (10+ reports)

#### Email Delivery 🔴 CRITICAL
- [ ] Send invitation email
- [ ] Verify email receipt in Gmail
- [ ] Verify email receipt in Outlook
- [ ] Test invitation link acceptance
- [ ] Test expired invitation link
- [ ] Verify email template renders correctly
- [ ] Test with invalid email addresses

#### File Uploads 🔴 CRITICAL
- [ ] Upload photo to diary
- [ ] Upload photo to inspection
- [ ] Upload photo to NCR
- [ ] Upload company logo
- [ ] Upload signature
- [ ] Test 10MB file upload
- [ ] Test file upload progress indicator
- [ ] Verify public URL generation

#### Push Notifications 🟡 IMPORTANT
- [ ] Subscribe to notifications
- [ ] Send test notification
- [ ] Verify notification appears in browser
- [ ] Test notification click action
- [ ] Test action buttons
- [ ] Test on Chrome, Firefox, Edge
- [ ] Test notification icons display

#### Weather Integration 🟢 NICE-TO-HAVE
- [ ] Fetch weather with valid API key
- [ ] Fetch weather without API key (mock data)
- [ ] Display weather in diary form
- [ ] Include weather in PDF export
- [ ] Include weather in Excel export
- [ ] Test weather caching

#### Offline Sync 🟡 IMPORTANT
- [ ] Create inspection offline
- [ ] Edit inspection offline
- [ ] Add photos offline
- [ ] Sync when back online
- [ ] Resolve conflicts
- [ ] Test with large sync queue

#### AI Features 🟢 NICE-TO-HAVE
- [ ] Ask AI assistant question
- [ ] Generate ITP report
- [ ] Analyze project timeline
- [ ] Get weather recommendations

### Phase 4: Performance Validation

**Baseline Metrics** (to be established):
- Report generation time: Target < 10s
- File upload latency: Target < 2s for 5MB
- API response times: Target < 500ms p95
- Page load time: Target < 2s
- Bundle size: Target < 1MB initial JS

**Monitoring During Migration**:
- Track Core Web Vitals (LCP, FID, CLS)
- Monitor API error rates
- Track report success rates
- Monitor email delivery rates
- Track offline sync success rates

### Phase 5: Gradual Rollout

1. **Internal Testing** (Week 1):
   - Enable new design for development team
   - Run comprehensive integration tests
   - Fix critical bugs

2. **Beta Testing** (Week 2-3):
   - Enable for 10% of users (feature flag)
   - Monitor error rates and user feedback
   - Compare metrics between old and new UI

3. **Staged Rollout** (Week 4-6):
   - 25% → 50% → 75% → 100%
   - Monitor each stage for issues
   - Be prepared to rollback

4. **Full Migration** (Week 7):
   - Remove old components
   - Clean up feature flags
   - Update documentation

---

## Critical Reminders for Developers

### MUST NOT CHANGE ❌

1. **Trigger.dev Event Payload Structure**
   ```typescript
   // This structure is sacred
   {
     reportId: string (uuid),
     reportType: enum,
     format: enum,
     parameters: Record<string, any>,
     organizationId: string (uuid),
     requestedBy: string (uuid)
   }
   ```

2. **Email Template Props**
   ```typescript
   // React Email expects these exact props
   interface InvitationEmailProps {
     inviterName: string,
     inviterEmail: string,
     organizationName: string,
     invitationUrl: string,
     recipientEmail: string
   }
   ```

3. **Supabase Storage Paths**
   ```
   photos/{entity_type}/{entity_id}/{photo_id}.jpg
   reports/{organization_id}/{report_id}.{extension}
   logos/{organization_id}/logo.{extension}
   ```

4. **Push Notification Payload**
   ```typescript
   {
     title: string,
     body: string,
     icon?: string,
     badge?: string,
     url?: string,
     // ... other fields
   }
   ```

5. **Weather Data Structure**
   ```typescript
   interface WeatherData {
     temperature: { min: number; max: number; unit: string },
     conditions: string,
     // ... exact structure required
   }
   ```

### CAN CHANGE (WITH CARE) ⚠️

1. UI component structure (maintain data flow)
2. Styling and layout
3. Animation and interactions
4. Form layouts (maintain validation schemas)
5. Dashboard widgets (maintain API contracts)

### SAFE TO CHANGE ✅

1. Component styling (CSS, Tailwind classes)
2. Layout and responsive design
3. Animations and transitions
4. Color schemes (except in emails and PDFs)
5. Typography

---

## Appendix A: Complete Dependency List

### Production Dependencies (from package.json)

**Core Framework**:
- `next` v14.1.0
- `react` v18.2.0
- `react-dom` v18.2.0

**Supabase**:
- `@supabase/supabase-js` v2.39.3
- `@supabase/ssr` v0.1.0

**Background Jobs**:
- `@trigger.dev/sdk` v3.3.17
- `@trigger.dev/nextjs` v3.3.12

**Email**:
- `resend` v3.2.0
- `@react-email/components` v0.0.15
- `@react-email/render` v0.0.12

**File Processing**:
- `jspdf` v3.0.1
- `html2canvas` v1.4.1
- `@react-pdf/renderer` v4.3.0
- `xlsx` v0.18.5
- `pdf-lib` v1.17.1

**Notifications**:
- `web-push` v3.6.7

**AI**:
- `@anthropic-ai/sdk` v0.40.0

**Forms & Validation**:
- `react-hook-form` v7.49.3
- `@hookform/resolvers` v3.3.4
- `zod` v3.22.4

**State Management**:
- `@tanstack/react-query` v5.17.19
- `swr` v2.3.6
- `dexie` v3.2.7 (IndexedDB)

**UI & Interactions**:
- `framer-motion` v11.0.3
- `lucide-react` v0.323.0
- `sonner` v1.4.0
- `@dnd-kit/core` v6.1.0
- `react-grid-layout` v1.5.2
- `react-signature-canvas` v1.0.6
- `react-intersection-observer` v9.16.0

**Utilities**:
- `date-fns` v4.1.0
- `clsx` v2.1.0
- `tailwind-merge` v2.2.0
- `use-debounce` v10.0.5
- `bcryptjs` v2.4.3

**Infrastructure**:
- `ioredis` v5.6.1 (optional)

### Dev Dependencies

**Testing**:
- `@playwright/test` v1.54.1
- `vitest` v3.2.4
- `@testing-library/react` v16.3.0
- `@faker-js/faker` v9.9.0

**TypeScript**:
- `typescript` v5.3.3
- `@types/*` (various)

**Linting**:
- `eslint` v8.56.0
- `prettier` v3.6.2

---

## Appendix B: Environment Variables Reference

### Required
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# Application
NEXT_PUBLIC_APP_URL=https://app.siteproof.io
```

### Important (for full functionality)
```bash
# Background Jobs
TRIGGER_API_KEY=tr_dev_xxx
TRIGGER_API_URL=https://api.trigger.dev

# Email
RESEND_API_KEY=re_xxx
EMAIL_FROM=SiteProof <notifications@siteproof.io>

# Push Notifications
VAPID_PUBLIC_KEY=BNxxx...
VAPID_PRIVATE_KEY=xxx
```

### Optional
```bash
# Weather
NEXT_PUBLIC_OPENWEATHER_API_KEY=xxx

# Redis
REDIS_URL=redis://localhost:6379

# Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-xxx
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Error Tracking
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_AUTH_TOKEN=xxx
SENTRY_ORG=siteproof
SENTRY_PROJECT=web

# Feature Flags
NEXT_PUBLIC_ENABLE_PWA=false
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_SENTRY=false
```

---

## Appendix C: API Endpoint Reference

### Report Management (Critical)
- `POST /api/reports/generate` - Trigger report generation
- `GET /api/reports` - List all reports
- `GET /api/reports/[id]` - Get report status
- `GET /api/reports/[id]/download` - Download report
- `POST /api/reports/[id]/retry` - Retry failed report
- `POST /api/reports/[id]/cancel` - Cancel report

### Email & Invitations
- `POST /api/organizations/[id]/invite` - Send invitation

### File Uploads
- `POST /api/photos/upload` - Upload photo
- `GET /api/diaries/[id]/photos` - Get diary photos
- `POST /api/organizations/upload-logo` - Upload logo

### Notifications
- `POST /api/notifications/send` - Send push notification
- `POST /api/notifications/subscribe` - Subscribe to notifications
- `GET /api/notifications/vapid-public-key` - Get VAPID public key

### Offline Sync
- `POST /api/inspections/sync` - Sync offline changes
- `POST /api/inspections/resolve-conflicts` - Resolve conflicts

### AI Features
- `POST /api/ai/ask` - AI assistant
- `POST /api/ai/generate-itp-report` - Generate ITP

### Daily Diaries
- `GET /api/diaries` - List diaries
- `POST /api/diaries` - Create diary
- `GET /api/diaries/[id]` - Get diary
- `PUT /api/diaries/[id]` - Update diary
- `DELETE /api/diaries/[id]` - Delete diary
- `GET /api/diaries/[id]/export` - Export diary

### Inspections
- `GET /api/inspections` - List inspections
- `POST /api/inspections` - Create inspection
- `GET /api/inspections/[id]` - Get inspection
- `PUT /api/inspections/[id]` - Update inspection
- `POST /api/inspections/[id]/submit` - Submit inspection
- `GET /api/inspections/bulk-download` - Bulk download

### NCRs
- `GET /api/ncrs` - List NCRs
- `POST /api/ncrs` - Create NCR
- `GET /api/ncrs/[id]` - Get NCR
- `PUT /api/ncrs/[id]` - Update NCR
- `POST /api/ncrs/[id]/acknowledge` - Acknowledge NCR
- `POST /api/ncrs/[id]/start_work` - Start work on NCR
- `POST /api/ncrs/[id]/resolve` - Resolve NCR
- `POST /api/ncrs/[id]/verify` - Verify resolution
- `POST /api/ncrs/[id]/reopen` - Reopen NCR

### Projects & Lots
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/[id]` - Get project
- `GET /api/projects/[projectId]/lots` - List lots
- `GET /api/projects/[projectId]/lots/[lotId]` - Get lot
- `GET /api/projects/[projectId]/lots/[lotId]/export` - Export lot

**Total API Endpoints**: 97 routes, 4,176 lines of code

---

## Document Change Log

**Version 1.0** (2025-10-08):
- Initial comprehensive audit
- Documented all major integrations
- Created migration strategy
- Established testing checklist

---

**End of Document**
