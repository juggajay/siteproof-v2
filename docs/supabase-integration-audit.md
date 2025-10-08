# Supabase Integration Audit - SiteProof v2
**Date:** 2025-10-08
**Purpose:** Comprehensive audit of Supabase integration points to ensure design overhaul won't break critical functionality

---

## Executive Summary

This audit identifies **ALL** Supabase integration points in SiteProof v2 that could be affected by the design system overhaul. The application has **extensive** Supabase integration across authentication, database queries, storage, and realtime subscriptions.

### Critical Statistics
- **118 files** with authentication checks (`auth.getUser`/`auth.getSession`)
- **144 files** with database queries (`.from()` calls)
- **19 files** with storage operations
- **3 files** with realtime subscriptions
- **26 SQL migration files** defining database schema and RLS policies

### Risk Level: **HIGH**
The design overhaul poses **significant risk** to authentication flows, RLS-dependent components, and realtime features if not carefully managed.

---

## 1. Authentication Integration Points

### 1.1 Core Authentication Infrastructure

#### **Primary Files:**
| File | Line Numbers | Purpose | Risk Level |
|------|-------------|---------|------------|
| `/apps/web/src/lib/supabase/client.ts` | 1-26 | Browser client creation | **CRITICAL** |
| `/apps/web/src/lib/supabase/server.ts` | 1-45 | Server-side client with cookie management | **CRITICAL** |
| `/apps/web/src/middleware.ts` | 150-241 | Route protection & session refresh | **CRITICAL** |
| `/apps/web/src/lib/supabase/connection-pool.ts` | 1-259 | Connection pooling with retry logic | **HIGH** |

#### **Authentication Hooks:**
- **`/apps/web/src/features/auth/hooks/useAuth.ts`** (Lines 1-78)
  - Manages user state across app
  - Listens to `onAuthStateChange` events (Line 34)
  - Handles sign out flow (Line 47-70)
  - **Risk:** If hook re-renders excessively during design changes, could cause auth loops

- **`/apps/web/src/features/auth/hooks/useSession.ts`** (Lines 1-29)
  - Provides session data to components
  - Subscribes to auth state changes (Line 20)
  - **Risk:** Shared across many components - breaking changes cascade

### 1.2 Protected Routes (Middleware)

**File:** `/apps/web/src/middleware.ts` (Lines 200-241)

Protected route patterns:
```typescript
- /dashboard*       → Requires authentication
- /projects*        → Requires authentication
- /settings*        → Requires authentication
- /foreman*         → Requires authentication
- /auth/*           → Redirects authenticated users to /dashboard
```

**Critical Implementation Details:**
- Creates server client with cookie handlers (Lines 158-198)
- Calls `supabase.auth.getUser()` on EVERY request (Line 202)
- Redirects with `redirectTo` query param for post-login redirect (Line 214)

**Design Overhaul Risks:**
- ✅ Middleware runs before page load - design changes won't affect it
- ⚠️ Login/signup forms must POST to `/api/auth/login` endpoint
- ⚠️ Logout must call `/api/auth/logout` to clear cookies properly

### 1.3 Authentication API Routes

#### **Login Route**
**File:** `/apps/web/src/app/api/auth/login/route.ts` (Lines 1-139)
- Rate limiting with SHA-256 fingerprinting (Lines 8-16, 21-37)
- Uses Zod schema validation (Line 42)
- Updates `last_seen` via RPC (Lines 103-105)
- Returns organization memberships (Lines 108-122)

**Critical:** Login form must send `email` and `password` fields exactly as expected

#### **Logout Route**
**File:** `/apps/web/src/app/api/auth/logout/route.ts`
- Calls `supabase.auth.signOut()` server-side
- Clears session cookies

#### **User Info Route**
**File:** `/apps/web/src/app/api/auth/me/route.ts`
- Returns current user + organization membership
- Used by client components to check auth state

### 1.4 Authentication-Dependent UI Components

**Dashboard Pages** (All require authentication):
| Page | File | Auth Check | RLS Dependency |
|------|------|-----------|----------------|
| Main Dashboard | `/apps/web/src/app/dashboard/page.tsx` | Line 29-37 | Organizations, Members |
| Projects List | `/apps/web/src/app/dashboard/projects/new/page.tsx` | getUser() | Projects table |
| Project Detail | `/apps/web/src/app/dashboard/projects/[id]/page.tsx` | Lines 24-31, 53-62 | Projects + Members |
| Diaries | `/apps/web/src/app/dashboard/diaries/[id]/page.tsx` | getUser() | Daily diaries |
| Inspections | `/apps/web/src/app/dashboard/inspections/page.tsx` | getUser() | Inspections |

**Organization Setup Flow:**
- **File:** `/apps/web/src/app/dashboard/page.tsx` (Lines 40-70)
- Checks if user has `organization_members` record
- Shows setup modal if no organization
- **Risk:** Modal styling must be preserved or users get stuck

---

## 2. Row Level Security (RLS) Dependencies

### 2.1 RLS Policy Overview

**Policy Migration Files:**
- `/packages/database/migrations/0002_auth_rls_policies.sql` - Core auth tables
- `/packages/database/migrations/0015_proper_secure_policies.sql` - Secure organization policies
- `/packages/database/migrations/0003_projects_schema.sql` - Project access control
- `/packages/database/migrations/0006_ncr_schema.sql` - NCR access control
- `/packages/database/migrations/0005_itp_forms_schema.sql` - ITP forms access control

### 2.2 Organization-Based Access Control

**Critical Pattern:** Most database queries depend on user's organization membership

```sql
-- Example from 0002_auth_rls_policies.sql (Lines 12-22)
CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id = auth.uid()
    )
  );
```

**Tables with RLS Policies:**
1. `organizations` - Owner/admin role checks
2. `organization_members` - Self + admin management
3. `projects` - Organization membership required
4. `lots` - Via project relationship
5. `itp_instances` - Via lot relationship
6. `itp_templates` - Organization-scoped
7. `daily_diaries` - Project-scoped
8. `ncrs` (Non-Conformance Reports) - Project-scoped
9. `inspections` - Project-scoped
10. `contractors` - Organization-scoped
11. `companies` - Organization-scoped
12. `report_queue` - User or organization-scoped

### 2.3 Components That Will FAIL if Auth Breaks

**High-Risk Components** (Depend on RLS):

| Component | File | Database Tables | Failure Mode |
|-----------|------|----------------|--------------|
| Dashboard | `/apps/web/src/app/dashboard/page.tsx` | organizations, organization_members | Shows "no organization" modal |
| Project List | `/apps/web/src/features/projects/components/ProjectList.tsx` | projects | Returns empty array |
| NCR Form | `/apps/web/src/features/ncr/components/NcrFormV2.tsx` | projects, organization_members, organizations | Can't load users/contractors |
| Reports List | `/apps/web/src/features/reporting/components/RecentReportsList.tsx` | report_queue | Returns 403 Forbidden |
| Create Project | `/apps/web/src/features/projects/components/CreateProjectModal.tsx` | projects, organizations | Insert fails silently |

**Example from NCR Form** (`/apps/web/src/features/ncr/components/NcrFormV2.tsx`):
```typescript
// Lines 44-95
const { data: project } = await supabase
  .from('projects')
  .select('organization_id')
  .eq('id', projectId)
  .single();

const { data: orgMembers } = await supabase
  .from('organization_members')
  .select(`user_id, users!inner(id, email, display_name, full_name)`)
  .eq('organization_id', project.organization_id);
```
**Risk:** If auth is lost, both queries return empty - form shows no assignees

---

## 3. Realtime Subscriptions

### 3.1 Active Realtime Channels

**File:** `/apps/web/src/features/reporting/components/RecentReportsList.tsx` (Lines 165-213)

**Subscription Details:**
```typescript
const channel = supabase
  .channel('report-status-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'report_queue',
    filter: `requested_by=eq.${user.id}`
  }, (payload) => {
    // Show toast notifications on report completion
    queryClient.invalidateQueries({ queryKey: ['reports'] });
  })
  .subscribe();
```

**What It Does:**
- Listens for changes to `report_queue` table
- Shows toast when report generation completes
- Auto-refreshes report list

**Design Overhaul Risks:**
- Toast component must still work (uses Sonner library)
- If component unmounts incorrectly, channel leaks memory
- Network status indicator should show realtime connection state

### 3.2 Inspection Sync (Offline-First)

**File:** `/apps/web/src/features/inspections/hooks/useInspectionSync.ts` (Lines 1-175)

**Not a Realtime Subscription** - Uses RPC calls for conflict resolution:
```typescript
const { data, error } = await supabase.rpc('sync_inspection', {
  p_client_id: inspection.client_id,
  p_inspection_data: inspection.data,
  p_sync_version: inspection.sync_version,
});
```

**Risk:** Button to trigger sync must remain accessible

### 3.3 Auth State Change Listeners

**Files with `onAuthStateChange`:**
1. `/apps/web/src/features/auth/hooks/useAuth.ts` (Line 34)
2. `/apps/web/src/features/auth/hooks/useSession.ts` (Line 20)

**Critical Behavior:**
```typescript
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN') {
    router.refresh();
  } else if (event === 'SIGNED_OUT') {
    router.push('/auth/login');
  }
});
```

**Design Overhaul Risks:**
- These hooks run in client components
- If design system breaks React context, auth state won't propagate
- Login/logout buttons must trigger proper auth state transitions

---

## 4. Storage Integration (File Uploads)

### 4.1 Storage Buckets

**Identified Buckets:**
1. `project-photos` - General project photos
2. `inspection-photos` - Inspection-specific photos
3. Storage operations in 19 files

### 4.2 Photo Upload Hook

**File:** `/apps/web/src/hooks/use-photo-upload.ts` (Lines 1-99)

**Upload Flow:**
```typescript
const { error } = await supabase.storage
  .from(bucket)
  .upload(fileName, file, {
    cacheControl: '3600',
    upsert: false,
  });

const { data: { publicUrl } } = supabase.storage
  .from(bucket)
  .getPublicUrl(fileName);
```

**Used By:**
- ITP Forms
- Daily Diary photos
- NCR attachments
- Inspection photos

**Design Overhaul Risks:**
- File input components must trigger upload correctly
- Progress bars must render (Lines 14, 55)
- Delete buttons must call `deletePhoto()` function (Lines 74-90)

### 4.3 Upload API Route

**File:** `/apps/web/src/app/api/photos/upload/route.ts` (Lines 1-80)

**Server-Side Upload:**
- Processes `multipart/form-data`
- Uploads to Supabase Storage
- Creates database record in `photos` table
- **Authentication Required** (Lines 8-15)

**Risk:** Form components must use correct `enctype="multipart/form-data"`

### 4.4 Inspection Photo Sync

**File:** `/apps/web/src/features/inspections/hooks/useInspectionSync.ts` (Lines 10-75)

**Offline-First Upload:**
- Stores photos locally in IndexedDB
- Uploads when online
- Retries on failure

**Design Risks:**
- Sync indicator must be visible
- Retry buttons must be accessible

---

## 5. Database Query Patterns

### 5.1 Server Components vs Client Components

**Server Component Pattern** (144 total usages):
```typescript
// Example from dashboard page
const supabase = await createClient(); // Server client
const { data: { user } } = await supabase.auth.getUser();
const { data: membership } = await supabase
  .from('organization_members')
  .select('*')
  .eq('user_id', user.id)
  .single();
```

**Client Component Pattern:**
```typescript
// Example from useProjects hook
const supabase = createClient(); // Browser client
const { data, error } = await supabase
  .from('projects')
  .select('*')
  .order('created_at', { ascending: false });
```

**Design Overhaul Rule:**
- Server components CAN'T use `useState`, `useEffect`, or design system's interactive components
- Client components MUST have `'use client'` directive
- Mixing them breaks authentication

### 5.2 Critical Query Locations

**Projects:**
- `/apps/web/src/app/dashboard/projects/[id]/page.tsx` (Lines 34-46)
- `/apps/web/src/features/projects/components/ProjectList.tsx`
- `/apps/web/src/features/projects/hooks/useProjects.ts`

**Diaries:**
- `/apps/web/src/app/dashboard/diaries/[id]/page.tsx`
- `/apps/web/src/features/diary/hooks/useDiary.ts`
- `/apps/web/src/app/api/diaries/route.ts`

**NCRs:**
- `/apps/web/src/features/ncr/hooks/useNcr.ts`
- `/apps/web/src/app/api/ncrs/route.ts`

**Reports:**
- `/apps/web/src/features/reporting/components/RecentReportsList.tsx` (Lines 108-162)
- Uses React Query for caching
- Realtime subscription for updates

---

## 6. Critical User Flows That MUST NOT Break

### 6.1 Authentication Flow

```
1. User visits /dashboard → Middleware checks auth
2. No session → Redirect to /auth/login?redirectTo=/dashboard
3. User fills login form → POST to /api/auth/login
4. Success → Middleware refreshes session → Redirect to /dashboard
5. Dashboard checks organization membership
6. No org → Show "Create Organization" modal
7. Has org → Load dashboard data
```

**Test Cases Needed:**
- [ ] Login with valid credentials
- [ ] Login with invalid credentials (rate limiting)
- [ ] Logout and verify redirect
- [ ] Access protected route while logged out
- [ ] Organization setup flow

### 6.2 Project Creation Flow

```
1. Click "Create Project" button
2. Modal opens with form
3. User fills project details
4. Submit → POST to /api/projects
5. Server validates user has organization
6. Insert project with organization_id
7. RLS allows insert if user is org member
8. Success → Redirect to /dashboard/projects/[id]
```

**RLS Dependencies:**
- User must be in `organization_members` table
- Project must have valid `organization_id`

**Test Cases Needed:**
- [ ] Create project as org owner
- [ ] Create project as org admin
- [ ] Create project as org member
- [ ] Create project without organization (should fail gracefully)

### 6.3 Report Generation Flow (Realtime)

```
1. User clicks "Generate Report" button
2. Modal shows report options
3. Submit → POST to /api/reports/generate
4. Server creates record in report_queue (status: 'queued')
5. Background job processes report
6. Updates status: 'processing' → Realtime triggers
7. Client shows progress bar
8. Updates status: 'completed' → Realtime triggers
9. Toast notification appears
10. Download button enabled
```

**Realtime Subscription:**
- Channel: `report-status-changes`
- Table: `report_queue`
- Filter: `requested_by=eq.${user.id}`

**Test Cases Needed:**
- [ ] Generate report and wait for completion
- [ ] Cancel report mid-generation
- [ ] Download completed report
- [ ] Verify toast notification appears
- [ ] Multiple users don't see each other's reports

### 6.4 Photo Upload Flow

```
1. User clicks photo upload button
2. File picker opens
3. User selects photos
4. usePhotoUpload hook triggers
5. Upload to Supabase Storage (bucket: project-photos)
6. Get public URL
7. Create record in photos table
8. Show preview with delete button
```

**Storage Permissions:**
- Upload requires authentication
- Delete requires ownership check

**Test Cases Needed:**
- [ ] Upload single photo
- [ ] Upload multiple photos
- [ ] Delete uploaded photo
- [ ] Upload fails gracefully (offline, large file)
- [ ] Progress indicator works

---

## 7. Migration Risks Specific to Supabase

### 7.1 Component State Management

**Current Pattern:**
Many components use Supabase client in `useEffect`:
```typescript
useEffect(() => {
  const fetchData = async () => {
    const supabase = createClient();
    const { data } = await supabase.from('table').select('*');
    setState(data);
  };
  fetchData();
}, []);
```

**Risk:** Design system components might trigger extra re-renders

**Mitigation:**
- Use React Query for data fetching (already used in RecentReportsList)
- Memoize Supabase client creation
- Add dependency arrays carefully

### 7.2 Cookie Management

**Critical:** Middleware manages auth cookies (Lines 159-197 in `/apps/web/src/middleware.ts`)

```typescript
cookies: {
  get(name: string) {
    return request.cookies.get(name)?.value;
  },
  set(name: string, value: string, options: CookieOptions) {
    response.cookies.set({ name, value, ...options });
  },
  remove(name: string, options: CookieOptions) {
    response.cookies.set({ name, value: '', ...options });
  },
}
```

**Risk:** If Next.js `cookies()` import breaks, auth fails completely

**Test:** Verify cookies persist across page refreshes

### 7.3 Connection Pooling

**File:** `/apps/web/src/lib/supabase/connection-pool.ts`

**Purpose:**
- Reduces latency by reusing connections
- Implements retry logic
- Cleans up idle connections

**Risk:**
- If design system triggers many client re-renders, connection pool might exhaust
- Memory leaks if cleanup interval breaks (Line 156)

**Test:** Monitor connection pool size during heavy usage

### 7.4 Type Safety

**Current State:** Supabase client is untyped (no generated types)

**Risk:** Database schema changes won't trigger TypeScript errors

**Recommendation:** Generate types before design overhaul
```bash
npx supabase gen types typescript --project-id <project-id> > types/database.ts
```

---

## 8. Test Cases for Design Overhaul Validation

### 8.1 Authentication Tests

**Critical Path Tests:**
```typescript
describe('Authentication Flow', () => {
  test('User can log in with valid credentials', async () => {
    // 1. Visit login page
    // 2. Fill email/password
    // 3. Submit form
    // 4. Verify redirect to dashboard
    // 5. Verify user session exists
  });

  test('Protected routes redirect to login', async () => {
    // 1. Clear session
    // 2. Visit /dashboard
    // 3. Verify redirect to /auth/login?redirectTo=/dashboard
  });

  test('User can log out', async () => {
    // 1. Log in
    // 2. Click logout button
    // 3. Verify redirect to login
    // 4. Verify session cleared
  });
});
```

### 8.2 RLS Tests

```typescript
describe('Row Level Security', () => {
  test('User can only see their organization projects', async () => {
    // 1. Log in as user A (org 1)
    // 2. Fetch projects
    // 3. Verify only org 1 projects returned
    // 4. Log in as user B (org 2)
    // 5. Verify different projects returned
  });

  test('User cannot create project without organization', async () => {
    // 1. Log in
    // 2. Remove user from all organizations
    // 3. Attempt to create project
    // 4. Verify error
  });
});
```

### 8.3 Realtime Tests

```typescript
describe('Realtime Subscriptions', () => {
  test('Report status updates trigger notifications', async () => {
    // 1. Start report generation
    // 2. Wait for status change
    // 3. Verify toast notification appears
    // 4. Verify report list refreshes
  });

  test('Subscription cleans up on unmount', async () => {
    // 1. Mount component with subscription
    // 2. Unmount component
    // 3. Verify channel.unsubscribe() called
    // 4. Check for memory leaks
  });
});
```

### 8.4 Storage Tests

```typescript
describe('Photo Upload', () => {
  test('User can upload photos', async () => {
    // 1. Click upload button
    // 2. Select file
    // 3. Verify upload progress
    // 4. Verify photo appears in list
    // 5. Verify storage URL is public
  });

  test('User can delete uploaded photos', async () => {
    // 1. Upload photo
    // 2. Click delete button
    // 3. Verify file removed from storage
    // 4. Verify database record deleted
  });
});
```

---

## 9. Monitoring & Debugging

### 9.1 Supabase Dashboard Checks

**Before Design Overhaul:**
- [ ] Verify all RLS policies are enabled
- [ ] Check storage bucket permissions
- [ ] Review realtime subscriptions in dashboard
- [ ] Confirm no pending migrations

**During Design Overhaul:**
- [ ] Monitor auth errors in Supabase logs
- [ ] Watch for 403 Forbidden errors (RLS failures)
- [ ] Check realtime message queue
- [ ] Monitor storage upload success rate

**After Design Overhaul:**
- [ ] Run full test suite
- [ ] Verify all user flows manually
- [ ] Check for orphaned connections
- [ ] Review performance metrics

### 9.2 Client-Side Debugging

**Add to browser console during testing:**
```javascript
// Check auth state
supabase.auth.getSession().then(console.log);

// Monitor auth changes
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth event:', event, session);
});

// Check realtime connection
supabase.getChannels().forEach(channel => {
  console.log('Channel:', channel.topic, 'State:', channel.state);
});
```

---

## 10. Recommendations

### 10.1 Pre-Migration Steps

1. **Generate TypeScript Types**
   ```bash
   npx supabase gen types typescript --project-id <id> > types/supabase.ts
   ```

2. **Create Rollback Plan**
   - Tag current version in git
   - Document all env variables
   - Export current database schema

3. **Increase Monitoring**
   - Set up Sentry for client errors
   - Enable Supabase logs
   - Add performance tracking

### 10.2 During Migration

1. **Incremental Changes**
   - Migrate one page at a time
   - Test auth after each page
   - Keep old components as fallback

2. **Preserve Critical Patterns**
   - Don't change middleware logic
   - Keep auth hooks unchanged
   - Maintain cookie management

3. **Test Authentication First**
   - Before any design changes, verify login/logout
   - Test protected routes
   - Verify organization setup

### 10.3 Post-Migration Validation

1. **Full User Flow Tests**
   - Complete each critical flow (Section 6)
   - Test on multiple browsers
   - Test offline scenarios

2. **Performance Check**
   - Monitor connection pool usage
   - Check for memory leaks in realtime subscriptions
   - Verify no excessive re-renders

3. **Security Audit**
   - Verify RLS policies still enforced
   - Test unauthorized access attempts
   - Check for exposed secrets

---

## 11. High-Risk Components Requiring Extra Testing

### 11.1 Authentication-Critical Components

| Component | Risk Level | Why |
|-----------|-----------|-----|
| `useAuth` hook | **CRITICAL** | Used by 50+ components |
| Middleware | **CRITICAL** | Guards ALL protected routes |
| Login Form | **HIGH** | Entry point for all users |
| Dashboard Page | **HIGH** | First page after login |

### 11.2 RLS-Dependent Components

| Component | Risk Level | Why |
|-----------|-----------|-----|
| Project List | **HIGH** | Queries depend on organization membership |
| NCR Form | **HIGH** | Loads users from RLS-protected table |
| Reports List | **HIGH** | Filters by current user |
| Diary Form | **MEDIUM** | Project-scoped queries |

### 11.3 Realtime Components

| Component | Risk Level | Why |
|-----------|-----------|-----|
| Reports List | **HIGH** | Only component with active subscription |
| Inspection Sync | **MEDIUM** | Offline-first pattern is complex |

---

## 12. Emergency Rollback Triggers

**Stop migration immediately if:**
1. ❌ Login stops working after ANY design change
2. ❌ Protected routes become accessible without auth
3. ❌ Users can see other organizations' data
4. ❌ File uploads fail completely
5. ❌ Realtime notifications stop appearing

**Rollback Procedure:**
```bash
# 1. Revert to previous git tag
git checkout <pre-migration-tag>

# 2. Clear all user sessions
# Run in Supabase SQL editor:
# DELETE FROM auth.sessions;

# 3. Clear browser cache and cookies

# 4. Verify auth flow works
npm run dev
```

---

## Appendix A: File Reference Index

### Core Supabase Files
- `/apps/web/src/lib/supabase/client.ts` - Browser client
- `/apps/web/src/lib/supabase/server.ts` - Server client
- `/apps/web/src/lib/supabase/connection-pool.ts` - Connection pooling
- `/apps/web/src/middleware.ts` - Route protection

### Auth Hooks
- `/apps/web/src/features/auth/hooks/useAuth.ts` - Main auth hook
- `/apps/web/src/features/auth/hooks/useSession.ts` - Session hook

### Auth API Routes
- `/apps/web/src/app/api/auth/login/route.ts` - Login endpoint
- `/apps/web/src/app/api/auth/logout/route.ts` - Logout endpoint
- `/apps/web/src/app/api/auth/signup/route.ts` - Signup endpoint
- `/apps/web/src/app/api/auth/me/route.ts` - Current user endpoint

### Storage Hooks
- `/apps/web/src/hooks/use-photo-upload.ts` - Photo upload hook
- `/apps/web/src/app/api/photos/upload/route.ts` - Upload endpoint

### Realtime Components
- `/apps/web/src/features/reporting/components/RecentReportsList.tsx` - Report status subscription
- `/apps/web/src/features/inspections/hooks/useInspectionSync.ts` - Inspection sync

### Migration Files
- `/packages/database/migrations/0002_auth_rls_policies.sql` - Auth RLS
- `/packages/database/migrations/0015_proper_secure_policies.sql` - Organization RLS
- `/packages/database/migrations/0003_projects_schema.sql` - Projects
- `/packages/database/migrations/0006_ncr_schema.sql` - NCRs
- `/packages/database/migrations/0005_itp_forms_schema.sql` - ITPs

---

## Appendix B: Environment Variables

**Required for Supabase:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

**Build-time Handling:**
- Client creation allows dummy values during build (Lines 7-20 in `client.ts`)
- Server creation throws error if missing (Lines 10-14 in `server.ts`)

---

## Conclusion

The SiteProof v2 application has **deep integration** with Supabase across all critical features. The design overhaul poses **high risk** to authentication, database queries, and realtime features.

**Key Success Factors:**
1. **Do NOT modify** middleware, auth hooks, or server/client creation logic
2. **Test authentication** after every incremental change
3. **Preserve** `'use client'` directives on interactive components
4. **Monitor** Supabase logs during migration
5. **Have rollback plan** ready at all times

**Estimated Impact:**
- **118 files** may need design system component updates
- **3 authentication hooks** are shared across app - breaking them cascades
- **26 migration files** define database structure - schema must stay stable
- **1 realtime subscription** requires careful testing
- **Storage operations** in 19 files depend on correct authentication

**Next Steps:**
1. Review this audit with development team
2. Create test plan based on Section 8
3. Set up monitoring per Section 9
4. Implement recommendations from Section 10
5. Proceed with design overhaul incrementally

---

**Document Version:** 1.0
**Last Updated:** 2025-10-08
**Auditor:** Claude (Research & Analysis Agent)
