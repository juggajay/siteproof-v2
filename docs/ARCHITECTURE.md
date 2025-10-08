# 🏛️ SiteProof v2 Architecture

> Comprehensive architecture documentation for the SiteProof construction management platform

## Table of Contents

- [System Overview](#system-overview)
- [Architecture Principles](#architecture-principles)
- [Tech Stack](#tech-stack)
- [Application Architecture](#application-architecture)
- [Data Architecture](#data-architecture)
- [Security Architecture](#security-architecture)
- [API Design](#api-design)
- [State Management](#state-management)
- [Offline-First Strategy](#offline-first-strategy)
- [Background Jobs](#background-jobs)
- [Performance Optimizations](#performance-optimizations)

---

## System Overview

SiteProof v2 is a **multi-tenant, offline-first** construction site management platform built with modern web technologies. The system enables construction teams to manage:

- **Daily Diaries**: Site progress tracking with weather, workforce, and equipment
- **Inspection Test Plans (ITP)**: Quality control workflows with lot-based tracking
- **Non-Conformance Reports (NCR)**: Issue detection and resolution workflows
- **Financial Management**: Role-based cost and rate tracking
- **Document Generation**: PDF/Excel export with background processing

### Key Characteristics

- **Multi-tenant**: Organization-based data isolation with Row Level Security (RLS)
- **Offline-First**: Full functionality without internet using IndexedDB (Dexie.js)
- **Real-time**: Supabase Realtime for collaborative features
- **Secure**: OWASP-compliant with 9.5/10 security score
- **Scalable**: Serverless architecture on Vercel + Supabase

---

## Architecture Principles

### 1. Security First

Every layer implements defense-in-depth:

- Database: Row Level Security (RLS) policies
- API: CSRF protection, rate limiting, input validation
- Frontend: CSP headers, XSS prevention
- Auth: Supabase Auth with httpOnly cookies

### 2. Feature-Based Organization

Code organized by feature, not by technical layer:

```
features/
  ├── diary/           # All diary-related code
  ├── itp-forms/       # All ITP-related code
  ├── ncr/             # All NCR-related code
  └── financials/      # All financial-related code
```

### 3. Type Safety

TypeScript strict mode with:

- Generated database types from Supabase
- Zod schemas for runtime validation
- Shared types across packages

### 4. Separation of Concerns

- **Features**: Business logic
- **Components**: Presentation
- **Lib**: Utilities and infrastructure
- **API**: Backend endpoints

### 5. Progressive Enhancement

Core functionality works without JavaScript, enhanced with React

---

## Tech Stack

### Frontend Layer

```
┌─────────────────────────────────────────────┐
│  Next.js 14 (App Router + Server Components)│
├─────────────────────────────────────────────┤
│  React 18  │  TypeScript 5.3  │  Tailwind   │
├─────────────────────────────────────────────┤
│  Zustand   │  React Hook Form │  Zod        │
└─────────────────────────────────────────────┘
```

### Backend Layer

```
┌─────────────────────────────────────────────┐
│  Supabase PostgreSQL (RLS + Realtime)       │
├─────────────────────────────────────────────┤
│  Supabase Auth  │  Storage  │  Edge Functions│
├─────────────────────────────────────────────┤
│  Trigger.dev (Background Jobs)              │
└─────────────────────────────────────────────┘
```

### Infrastructure Layer

```
┌─────────────────────────────────────────────┐
│  Vercel (Edge Network + Serverless)         │
├─────────────────────────────────────────────┤
│  Redis (Rate Limiting)  │  Dexie (Offline)  │
├─────────────────────────────────────────────┤
│  GitHub Actions (CI/CD)                     │
└─────────────────────────────────────────────┘
```

---

## Application Architecture

### Request Flow

```
User Request
    ↓
┌────────────────────────────────────────────┐
│  Next.js Middleware (middleware.ts)        │
│  - CSP Headers (nonce-based)               │
│  - CSRF Validation                         │
│  - Rate Limiting (Redis)                   │
│  - Security Headers                        │
└────────────────────────────────────────────┘
    ↓
┌────────────────────────────────────────────┐
│  Route Handler (app/api/*/route.ts)        │
│  - Input Validation (Zod)                  │
│  - Authentication Check                    │
│  - Permission Verification (RBAC)          │
└────────────────────────────────────────────┘
    ↓
┌────────────────────────────────────────────┐
│  Feature Module (features/*)               │
│  - Business Logic                          │
│  - Financial Filtering                     │
│  - Data Transformation                     │
└────────────────────────────────────────────┘
    ↓
┌────────────────────────────────────────────┐
│  Supabase Client (lib/supabase)            │
│  - RLS Policy Enforcement                  │
│  - Query Execution                         │
│  - Realtime Subscriptions                  │
└────────────────────────────────────────────┘
    ↓
Response with Financial Filtering
```

### Directory Structure

```
apps/web/src/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── diaries/              # Diary CRUD
│   │   ├── ncrs/                 # NCR management
│   │   ├── itp/                  # ITP & inspections
│   │   ├── projects/             # Projects
│   │   ├── lots/                 # Lot management
│   │   ├── auth/                 # Authentication
│   │   └── ai/                   # AI endpoints
│   ├── dashboard/                # Dashboard pages
│   ├── auth/                     # Auth pages
│   └── middleware.ts             # Global middleware
│
├── features/                     # Feature modules
│   ├── diary/
│   │   ├── components/           # Feature components
│   │   ├── hooks/                # Feature hooks
│   │   ├── types/                # Feature types
│   │   └── utils/                # Feature utilities
│   ├── itp-forms/
│   ├── ncr/
│   ├── financials/
│   └── reporting/
│
├── components/                   # Shared components
│   ├── ui/                       # Base UI (buttons, cards, etc.)
│   ├── dashboard/                # Dashboard-specific
│   ├── construction/             # Domain-specific
│   └── navigation/               # Navigation & layout
│
├── lib/                          # Infrastructure & utilities
│   ├── supabase/                 # Supabase client
│   ├── validation/               # Zod schemas
│   ├── auth/                     # Auth utilities & RBAC
│   ├── errors/                   # Error handling
│   ├── ai/                       # AI integration
│   ├── offline/                  # Offline sync
│   ├── rate-limiter/             # Rate limiting
│   └── export/                   # PDF/Excel export
│
├── hooks/                        # Global React hooks
├── jobs/                         # Trigger.dev jobs
└── types/                        # Global types
```

---

## Data Architecture

### Database Schema (Supabase PostgreSQL)

#### Core Tables

**organizations**

- Multi-tenant root entity
- Stores organization metadata
- Related to all other entities via org_id

**projects**

- Construction projects
- Belongs to organization
- Has many diaries, ITPs, NCRs, lots

**daily_diaries**

- Daily site progress tracking
- Weather data integration
- Labour, plant, material tracking
- Financial data (rates, costs)

**itp_templates**

- Inspection Test Plan templates
- Customizable per organization
- Cloned for project usage

**inspection_forms**

- ITP instances for specific lots
- Approval workflow
- Photo attachments

**ncrs** (Non-Conformance Reports)

- Issue tracking workflow
- Severity levels
- Resolution tracking

**lots**

- Project subdivisions
- ITP assignment targets
- Progress tracking

#### Supporting Tables

- **organization_members**: User-org relationships with roles
- **trades_on_site**: Labour tracking entries
- **plant_on_site**: Equipment tracking
- **materials_on_site**: Material usage
- **contractors**: Contractor database
- **material_suppliers**: Supplier database
- **employees**: Employee database
- **plant_equipment**: Equipment catalog

### Row Level Security (RLS) Policies

All tables have RLS policies enforcing:

1. **Organization Isolation**: Users can only access data from their organization
2. **Role-Based Access**: CRUD permissions based on user role
3. **Financial Protection**: Viewer role cannot access cost/rate data

Example RLS Policy:

```sql
CREATE POLICY "Users can view diaries from their organization"
ON daily_diaries
FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE organization_id = auth.organization_id()
  )
);
```

### Database Relationships

```
organizations (1)
    ↓ (many)
projects (1)
    ↓ (many)
    ├── daily_diaries (financial data filtered by role)
    ├── itp_templates → inspection_forms → lots
    └── ncrs (issue tracking)
```

---

## Security Architecture

### Multi-Layer Defense

#### 1. Network Layer (Vercel + Supabase)

- **TLS 1.3**: All traffic encrypted
- **DDoS Protection**: Vercel edge network
- **WAF**: Web Application Firewall

#### 2. Application Layer (Next.js Middleware)

```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  // 1. Generate CSP nonce
  const nonce = generateNonce();

  // 2. Set security headers
  response.headers.set('Content-Security-Policy', buildCSP(nonce));
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // 3. CSRF protection
  if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
    await validateCSRFToken(request);
  }

  // 4. Rate limiting
  await checkRateLimit(request);

  return response;
}
```

#### 3. API Layer (Route Handlers)

```typescript
// app/api/diaries/route.ts
export async function POST(request: NextRequest) {
  try {
    // 1. Input validation
    const body = await validateRequest(request, createDiarySchema);

    // 2. Authentication
    const user = await assertAuthenticated();

    // 3. Authorization
    const member = await assertPermission(user, 'diary', 'create');

    // 4. Business logic
    const diary = await createDiary(body, member);

    // 5. Financial filtering
    const filtered = filterFinancialData(diary, member.role);

    return NextResponse.json(filtered);
  } catch (error) {
    return handleAPIError(error); // Sanitized errors
  }
}
```

#### 4. Database Layer (Supabase RLS)

- All queries automatically filtered by RLS policies
- No direct database access from frontend
- Service role key only on server

### Role-Based Access Control (RBAC)

**Roles** (hierarchical):

1. `owner` - Full access including deletion
2. `admin` - Administrative access
3. `project_manager` - Project management
4. `site_foreman` - Daily operations
5. `finance_manager` - Financial access
6. `accountant` - Financial read access
7. `viewer` - Read-only access (no financial data)

**Resources**:

- diary, ncr, itp, inspection_form, project, lot, financial_data, reports

**Actions**:

- read, create, update, delete, approve, export

**Permission Matrix** (`lib/auth/permissions.ts`):

```typescript
const PERMISSIONS: Record<Role, Record<Resource, Action[]>> = {
  owner: {
    diary: ['read', 'create', 'update', 'delete', 'approve', 'export'],
    financial_data: ['read', 'create', 'update', 'delete', 'export'],
  },
  viewer: {
    diary: ['read'],
    financial_data: [], // NO ACCESS
  },
  // ... other roles
};
```

---

## API Design

### RESTful Conventions

```
GET     /api/diaries          - List diaries (paginated, filtered)
POST    /api/diaries          - Create diary
GET     /api/diaries/:id      - Get single diary
PUT     /api/diaries/:id      - Update diary
DELETE  /api/diaries/:id      - Delete diary
POST    /api/diaries/:id/approve - Approve diary
```

### Standard Response Format

**Success**:

```json
{
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

**Error**:

```json
{
  "error": "Validation failed",
  "validationErrors": {
    "diary_date": ["Invalid date format"],
    "project_id": ["Invalid UUID format"]
  }
}
```

### Input Validation

All requests validated with Zod schemas (`lib/validation/schemas.ts`):

```typescript
export const createDiarySchema = z.object({
  diary_date: dateSchema,
  project_id: uuidSchema,
  work_summary: z.string().min(10).max(5000),
  weather_morning: z.string().optional(),
  // ... more fields
});
```

### Financial Data Filtering

Responses automatically filtered based on user role:

```typescript
export function filterFinancialData<T>(data: T, role: Role): T {
  if (hasFinancialAccess(role)) return data;

  const filtered = { ...data };
  const financialFields = ['hourly_rate', 'daily_rate', 'total_cost', 'unit_cost'];
  financialFields.forEach((field) => delete filtered[field]);
  return filtered;
}
```

---

## State Management

### Global State (Zustand)

```typescript
// stores/auth-store.ts
interface AuthState {
  user: User | null;
  organization: Organization | null;
  member: OrganizationMember | null;
  permissions: PermissionMatrix;
}

// stores/offline-store.ts
interface OfflineState {
  isOnline: boolean;
  syncQueue: SyncItem[];
  pendingChanges: number;
}
```

### Server State (React Query)

```typescript
// hooks/use-diaries.ts
export function useDiaries(projectId: string) {
  return useQuery({
    queryKey: ['diaries', projectId],
    queryFn: () => fetchDiaries(projectId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

### Form State (React Hook Form)

```typescript
const form = useForm<DiaryFormData>({
  resolver: zodResolver(createDiarySchema),
  defaultValues: { ... },
});
```

---

## Offline-First Strategy

### IndexedDB Structure (Dexie.js)

```typescript
// lib/offline/db.ts
class SiteProofDB extends Dexie {
  diaries: Table<Diary>;
  ncrs: Table<NCR>;
  inspections: Table<InspectionForm>;

  constructor() {
    super('siteproof');
    this.version(1).stores({
      diaries: '++id, project_id, diary_date, synced',
      ncrs: '++id, project_id, created_at, synced',
      inspections: '++id, project_id, lot_id, synced',
    });
  }
}
```

### Sync Strategy

1. **Online**: Write to both Supabase and IndexedDB
2. **Offline**: Write to IndexedDB only, mark as `synced: false`
3. **Online Again**: Background sync uploads pending changes

```typescript
// lib/offline/sync.ts
export async function syncPendingChanges() {
  const pendingDiaries = await db.diaries.where('synced').equals(false).toArray();

  for (const diary of pendingDiaries) {
    try {
      await supabase.from('daily_diaries').upsert(diary);
      await db.diaries.update(diary.id, { synced: true });
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }
}
```

---

## Background Jobs

### Trigger.dev Integration

```typescript
// jobs/reports/generate-diary-pdf.ts
export const generateDiaryPDF = task({
  id: 'generate-diary-pdf',
  run: async (payload: { diaryId: string }) => {
    const diary = await fetchDiary(payload.diaryId);
    const pdf = await generatePDF(diary);
    const url = await uploadToStorage(pdf);
    await notifyUser(diary.created_by, url);
  },
});
```

### Job Types

- **Report Generation**: PDF/Excel exports (5-60 seconds)
- **Email Notifications**: Approval workflows
- **Data Aggregation**: Monthly/quarterly reports
- **Cleanup**: Old file deletion, archive

---

## Performance Optimizations

### 1. Code Splitting

```typescript
// Lazy load heavy components
const DiaryPDFPreview = dynamic(() => import('@/components/diary/PDFPreview'), {
  ssr: false,
  loading: () => <Skeleton />,
});
```

### 2. Image Optimization

```typescript
<Image
  src={photo.url}
  width={800}
  height={600}
  quality={80}
  loading="lazy"
  placeholder="blur"
/>
```

### 3. Database Indexes

```sql
CREATE INDEX idx_diaries_project_date ON daily_diaries(project_id, diary_date DESC);
CREATE INDEX idx_ncrs_severity ON ncrs(severity, created_at DESC);
```

### 4. Caching Strategy

- **Static pages**: ISR with 60s revalidation
- **API responses**: React Query with 5min stale time
- **Rate limiting**: Redis with TTL

### 5. Bundle Size

- Tree shaking enabled
- Dynamic imports for routes
- Tailwind CSS purging

---

## Deployment Architecture

```
GitHub Push
    ↓
GitHub Actions
    ├── Lint & Type Check
    ├── Unit Tests
    ├── Security Scan
    └── Build
        ↓
    Vercel Deploy
        ├── Edge Network (CDN)
        ├── Serverless Functions
        └── Environment Variables
            ↓
        Connected Services
            ├── Supabase (DB + Auth + Storage)
            ├── Trigger.dev (Jobs)
            ├── Redis (Rate Limit)
            └── Resend (Email)
```

### Environment Isolation

- **Development**: Local Supabase + local .env.local
- **Preview**: Vercel preview + staging Supabase
- **Production**: Vercel production + production Supabase

---

## Future Improvements

### Planned Enhancements

1. **GraphQL API**: Replace REST with GraphQL (Apollo)
2. **Real-time Collaboration**: Live cursors and presence
3. **Mobile Apps**: React Native with shared codebase
4. **2FA/MFA**: Two-factor authentication for privileged roles
5. **Audit Logging**: Complete activity trail
6. **Webhooks**: External system integration
7. **API Rate Limiting**: Per-user quotas

### Performance Goals

- **Lighthouse Score**: 95+ on all metrics
- **API Response**: <200ms p95
- **Page Load**: <1s FCP, <2.5s LCP
- **Bundle Size**: <500KB initial load

---

## References

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [OWASP Security Guidelines](https://owasp.org/)
