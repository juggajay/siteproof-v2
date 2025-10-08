# Offline-First Implementation Audit

**Date:** 2025-10-08
**Scope:** Complete analysis of Dexie/IndexedDB offline-first functionality
**Risk Level:** HIGH - Design changes will likely break offline features

---

## Executive Summary

SiteProof v2 has a comprehensive offline-first architecture built on Dexie (IndexedDB wrapper). The implementation spans **two separate offline systems**: one for inspections and one for ITP forms. Both systems use different database schemas and sync mechanisms but share similar patterns.

**Critical Finding:** Any UI/component restructuring will break offline functionality due to tight coupling between:
- Form components and offline storage hooks
- Sync status indicators embedded in UI
- Photo/file upload components with offline blob storage
- Conflict resolution modals

---

## 1. Dexie Database Schemas

### 1.1 Inspection Database (`SiteProofInspections`)

**Location:** `/mnt/c/Users/jayso/siteproof-v2/apps/web/src/features/inspections/offline/db.ts`

**Database Version:** 1

**Tables:**

#### `assignments` - Cached ITP Assignments
```typescript
Schema: {
  id,
  template_id,
  project_id,
  lot_id,
  assigned_to,
  status,
  due_date,
  [project_id+assigned_to],      // Compound index
  [status+assigned_to]            // Compound index
}
```

#### `inspections` - Offline-First Inspections
```typescript
Schema: {
  id,
  _localId,                       // Client-generated ID
  assignment_id,
  template_id,
  project_id,
  lot_id,
  inspector_id,
  client_id,
  status,
  _syncStatus,                    // 'pending' | 'syncing' | 'synced' | 'conflict'
  [project_id+inspector_id],      // Compound index
  [assignment_id+inspector_id],   // Compound index
  [_syncStatus+inspector_id]      // Compound index
}

Extended Fields:
- _localId: string (auto-generated)
- _isDirty: boolean
- _lastModified: number (timestamp)
- _syncStatus: 'pending' | 'syncing' | 'synced' | 'conflict'
```

#### `attachments` - Photo/File Attachments
```typescript
Schema: {
  id,
  _localId,
  inspection_id,
  field_id,
  _uploadStatus,                  // 'pending' | 'uploading' | 'uploaded' | 'failed'
  [inspection_id+field_id],       // Compound index
  [_uploadStatus]
}

Extended Fields:
- _localPath: string
- _uploadProgress: number
- _blob: Blob (stored locally)
```

#### `syncQueue` - Retry Queue for Failed Syncs
```typescript
Schema: {
  ++id,                           // Auto-increment
  type,                           // 'inspection' | 'attachment'
  action,                         // 'create' | 'update' | 'delete'
  entityId,
  data: any,
  attempts: number,
  lastAttempt: number,
  error: string,
  createdAt,
  [type+entityId]                 // Compound index
}
```

#### `conflicts` - Sync Conflicts
```typescript
Schema: {
  id,
  inspection_id,
  resolved: boolean,
  detected_at: string
}

Full Type:
- server_data: any
- client_data: any
- conflict_type: string
- resolved_by: string
- resolution: 'server_wins' | 'client_wins' | 'merged'
- merged_data: any
```

#### `photos` - Local Photo Blobs
```typescript
Schema: {
  id,
  inspectionId,
  fieldId,
  [inspectionId+fieldId],         // Compound index
  createdAt
}

Full Type:
- blob: Blob
- thumbnail: Blob (200x200 generated)
- metadata: {
    fileName: string,
    fileSize: number,
    mimeType: string,
    capturedAt: number,
    location?: { latitude, longitude, accuracy }
  }
```

**Dexie Hooks:**
- `inspections.creating`: Auto-set `_localId`, `_isDirty`, `_lastModified`, `_syncStatus`
- `inspections.updating`: Auto-set `_isDirty`, `_lastModified`, reset `_syncStatus` to 'pending'
- `attachments.creating`: Auto-set `_localId`, `_uploadStatus`

### 1.2 ITP Forms Database (`siteproof_itp_forms`)

**Location:** `/mnt/c/Users/jayso/siteproof-v2/apps/web/src/features/itp-forms/utils/offline-storage.ts`

**Database Version:** 1
**Implementation:** Pure IndexedDB (not Dexie)

**Tables:**

#### `forms` - ITP Form Storage
```typescript
Schema: {
  keyPath: 'localId',
  indexes: {
    syncStatus,
    formType,
    projectId,
    createdAt
  }
}

Full Type:
- localId: string (auto-generated)
- formType: string
- projectId: string
- inspectorName: string
- inspectionDate: Date
- inspectionStatus: 'pending' | 'approved' | 'rejected'
- comments: string
- evidenceFiles: File[]
- syncStatus: 'pending' | 'synced' | 'failed'
- organizationId: string
- createdAt: Date
- updatedAt: Date
```

### 1.3 Inspection Sync Database (`InspectionOfflineDB`)

**Location:** `/mnt/c/Users/jayso/siteproof-v2/apps/web/src/lib/offline/inspection-sync.ts`

**Database Version:** 1
**Implementation:** Dexie

**Tables:**

#### `inspections`
```typescript
Schema: {
  id,
  template_id,
  project_id,
  lot_id,
  status,
  sync_status,
  updated_at
}
```

#### `templates`
```typescript
Schema: {
  id,
  organization_id,
  category,
  last_accessed
}
```

#### `syncMetadata`
```typescript
Schema: {
  key,  // Primary key
}

Example records:
- key: 'last_sync_timestamp', value: '2025-10-08T10:30:00Z'
```

---

## 2. Sync Components & UI Indicators

### 2.1 SyncStatusIndicator Component

**Location:** `/mnt/c/Users/jayso/siteproof-v2/apps/web/src/features/inspections/components/SyncStatusIndicator.tsx`

**UI Elements:**
- Status badge with icon (Cloud, CloudOff, Loader, AlertTriangle, CheckCircle)
- Color-coded background (gray, blue, yellow, orange, green)
- Expandable dropdown panel with:
  - Connection status (online/offline)
  - Pending sync count
  - Conflict count
  - Last sync time
  - Manual sync button
  - Conflict resolution link

**Dependencies:**
- `useInspectionSync` hook
- `db` (Dexie instance)
- Online/offline event listeners
- 5-second polling interval
- Auto-sync on reconnection

**Breaking Points:**
- Any change to button/badge layout
- Color scheme changes
- Icon system changes
- Modal/dropdown framework changes

### 2.2 ConflictResolverModal Component

**Location:** `/mnt/c/Users/jayso/siteproof-v2/apps/web/src/features/inspections/components/ConflictResolverModal.tsx`

**UI Elements:**
- Full-screen modal with focus trap
- Side-by-side data comparison (server vs. local)
- Radio button resolution options:
  1. Use Server Version
  2. Use Local Version
  3. Manual Merge (disabled/coming soon)
- Warning banner with conflict details
- Apply/Cancel buttons

**Dependencies:**
- `framer-motion` for animations
- `useFocusTrap` hook
- Design system Button component
- Direct Dexie writes to conflicts/inspections tables

**Breaking Points:**
- Modal framework changes
- Form control styling
- Animation system changes
- Button component API changes

### 2.3 InspectionForm Component

**Location:** `/mnt/c/Users/jayso/siteproof-v2/apps/web/src/features/inspections/components/InspectionForm.tsx`

**Offline Features:**
- Auto-save to IndexedDB every change
- Progress tracking (completion percentage)
- Photo capture with offline blob storage
- Signature pad with offline storage
- Multi-section wizard with state persistence

**Dependencies:**
- `react-hook-form` with Zod validation
- `useInspectionSync` hook
- `PhotoCapture` component (offline-capable)
- `SignaturePad` component
- Direct Dexie writes

**Breaking Points:**
- Form layout changes
- Wizard navigation changes
- Photo/signature component changes
- Progress indicator changes

---

## 3. Offline-Capable Forms

### 3.1 ITP Forms System

**Main Page:** `/mnt/c/Users/jayso/siteproof-v2/apps/web/src/app/itp-forms/page.tsx`

**Features:**
- Online/offline indicator (Wifi/WifiOff icon)
- Auto-sync service (30-second interval)
- Form list from IndexedDB
- PDF generation from offline data

**Form Types:**
1. Earthworks Preconstruction
2. Earthworks Subgrade
3. (Additional form types in FORM_TYPE_LABELS)

### 3.2 EarthworksPreconstructionForm

**Location:** `/mnt/c/Users/jayso/siteproof-v2/apps/web/src/features/itp-forms/components/forms/EarthworksPreconstructionForm.tsx`

**Offline Features:**
- Photo upload with offline storage
- File upload with base64 conversion
- Signature pad
- Immediate IndexedDB save
- Opportunistic sync on submit

**Data Flow:**
1. Save to `offlineStorage` (IndexedDB)
2. Get `localId` from storage
3. If online: attempt `syncService.syncForm()`
4. If sync fails: queued for retry

---

## 4. Data Persistence Mechanisms

### 4.1 Inspection Sync Service

**Class:** `InspectionSyncService`
**Location:** `/mnt/c/Users/jayso/siteproof-v2/apps/web/src/lib/offline/inspection-sync.ts`

**Methods:**
- `saveInspectionLocally()` - Write to IndexedDB
- `getInspectionLocally()` - Read from IndexedDB
- `getPendingInspections()` - Query by sync_status
- `performSync()` - POST to `/api/inspections/sync`
- `downloadBulkData()` - Bulk download for offline use
- `getSyncStatus()` - Get counts and last sync time

**Sync Algorithm:**
```
1. Check navigator.onLine
2. Get pending inspections (sync_status = 'pending')
3. POST to /api/inspections/sync with:
   - lastSyncTimestamp
   - inspections[]
   - templates[] (access tracking)
4. Process response:
   - created[] → mark as 'synced'
   - updated[] → mark as 'synced'
   - conflicts[] → mark as 'conflict'
   - serverUpdates[] → merge into local DB
5. Update lastSyncTimestamp
```

### 4.2 ITP Forms Sync Service

**Class:** `SyncService`
**Location:** `/mnt/c/Users/jayso/siteproof-v2/apps/web/src/features/itp-forms/utils/sync-service.ts`

**Methods:**
- `syncForm()` - Sync single form to Supabase
- `syncAll()` - Sync all unsynced forms
- `startAutoSync()` - 30-second interval + online event listener
- `stopAutoSync()` - Cleanup

**Form-Specific Sync:**
- Inserts to `itp_forms` table
- Then inserts to form-type-specific table:
  - `itp_earthworks_preconstruction`
  - `itp_earthworks_subgrade`
  - etc.

### 4.3 Sync Manager (Background Orchestrator)

**Class:** `SyncManager`
**Location:** `/mnt/c/Users/jayso/siteproof-v2/apps/web/src/features/inspections/utils/syncManager.ts`

**Responsibilities:**
- Periodic sync (5-minute interval)
- Online/offline event handling
- Visibility change detection (sync when tab becomes visible)
- Sync queue processing (retry failed items up to 5 times)
- Background sync registration (service worker integration)

**Event Listeners:**
- `window.addEventListener('online')` → syncAll()
- `window.addEventListener('offline')` → log
- `document.addEventListener('visibilitychange')` → syncAll() if visible

---

## 5. Conflict Resolution

### 5.1 Detection

**Server-Side:** `/mnt/c/Users/jayso/siteproof-v2/apps/web/src/app/api/inspections/sync/route.ts`

```typescript
// Conflict occurs if:
serverUpdatedAt > lastSyncTimestamp && serverUpdatedAt > clientUpdatedAt
```

**Response:**
```json
{
  "inspections": {
    "conflicts": [
      {
        "client": { ...inspection },
        "server": { ...inspection },
        "conflict_type": "update_conflict"
      }
    ]
  }
}
```

### 5.2 Client-Side Handling

**Hook:** `useInspectionSync`
**Location:** `/mnt/c/Users/jayso/siteproof-v2/apps/web/src/features/inspections/hooks/useInspectionSync.ts`

**Process:**
1. Call `supabase.rpc('sync_inspection')`
2. If `data.status === 'conflict'`:
   - Add to `db.conflicts` table
   - Set inspection `_syncStatus = 'conflict'`
3. User sees conflict indicator in SyncStatusIndicator
4. User clicks "Resolve" → navigates to `/dashboard/inspections/conflicts`
5. ConflictResolverModal shows side-by-side comparison
6. User selects resolution:
   - `server_wins` → use server data
   - `client_wins` → use local data
   - `merged` → manual merge (not implemented)
7. Update `db.conflicts.resolved = true`
8. Update inspection with chosen data
9. Mark as `_syncStatus = 'pending'` to re-sync

---

## 6. Service Worker Integration

### 6.1 Current Status

**File:** `/mnt/c/Users/jayso/siteproof-v2/apps/web/public/sw.js.disabled`

**Status:** DISABLED (no PWA icons available)

**Implementation:**
```javascript
// Service worker registration is commented out
// in /mnt/c/Users/jayso/siteproof-v2/apps/web/src/lib/serviceWorker.ts
```

**Features (if enabled):**
- Cache-first for static assets
- Network-first for API calls
- Offline fallback page
- Background sync registration
- Cache management (CACHE_NAME, DYNAMIC_CACHE)

### 6.2 Offline Fallback Page

**Location:** `/mnt/c/Users/jayso/siteproof-v2/apps/web/public/offline.html`

**Features:**
- Styled offline indicator
- Auto-refresh on reconnection (5-second polling)
- Online event listener

---

## 7. Photo & File Storage

### 7.1 Photo Capture Workflow

**Component:** `PhotoCapture`
**Referenced in:** `InspectionForm`

**Process:**
1. User captures photo
2. Generate thumbnail (200x200, canvas-based)
3. Get geolocation (if available)
4. Store in `db.photos`:
   - Original blob
   - Thumbnail blob
   - Metadata (fileName, fileSize, mimeType, location)
5. Create attachment record in `db.attachments`
6. When online: upload to Supabase Storage
7. Update attachment with `file_url`
8. Delete local blob

### 7.2 File Upload (ITP Forms)

**Class:** `OfflineStorage`
**Methods:**
- `fileToBase64(file)` - Convert File to base64 string
- `base64ToFile(base64, filename)` - Convert back to File

**Process:**
1. Convert uploaded file to base64
2. Store in IndexedDB (no size limit issues)
3. On sync: convert back to File
4. Upload to server

---

## 8. Components That Will Break

### 8.1 High Risk - Direct Dexie Dependencies

| Component | File | Reason |
|-----------|------|--------|
| SyncStatusIndicator | `.../components/SyncStatusIndicator.tsx` | Direct `db` queries, status polling, UI tightly coupled |
| ConflictResolverModal | `.../components/ConflictResolverModal.tsx` | Direct `db.conflicts` writes, modal structure |
| InspectionForm | `.../components/InspectionForm.tsx` | Auto-save hooks, `db.inspections` writes |
| EarthworksPreconstructionForm | `.../forms/EarthworksPreconstructionForm.tsx` | `offlineStorage` calls, sync logic |
| ITP Forms Page | `.../app/itp-forms/page.tsx` | Online/offline indicator, form list rendering |

### 8.2 Medium Risk - Indirect Dependencies

| Component | File | Reason |
|-----------|------|--------|
| PhotoCapture | `.../components/PhotoCapture.tsx` | Blob storage, `db.photos` integration |
| SignaturePad | `.../components/SignaturePad.tsx` | Offline signature storage |
| ServiceWorkerProvider | `.../components/ServiceWorkerProvider.tsx` | Event listeners, sync triggers |

### 8.3 Low Risk - Utility/Service Layer

| Component | File | Reason |
|-----------|------|--------|
| useInspectionSync | `.../hooks/useInspectionSync.ts` | Hook API stable, but Supabase calls |
| SyncManager | `.../utils/syncManager.ts` | Singleton, event-driven |
| InspectionSyncService | `.../offline/inspection-sync.ts` | Class-based, no UI |

---

## 9. Migration Risks for Offline Features

### 9.1 Critical Risks

1. **Component Restructuring**
   - Moving SyncStatusIndicator to different layout
   - Changing modal system (breaks ConflictResolverModal)
   - Redesigning forms (breaks InspectionForm auto-save)

2. **State Management Changes**
   - If migrating from react-hook-form to different form library
   - If changing from framer-motion animations
   - If replacing design system buttons

3. **Data Flow Changes**
   - Any changes to form submission flow
   - Changes to photo/file upload mechanisms
   - Modifications to sync API endpoints

### 9.2 Moderate Risks

1. **UI Framework Changes**
   - Icon library changes (lucide-react icons throughout)
   - CSS framework changes (Tailwind classes everywhere)
   - Animation library changes

2. **Hook Dependencies**
   - Changes to custom hooks (useFocusTrap, useInspectionSync)
   - Changes to React Query usage
   - Auth context changes

### 9.3 Low Risks

1. **Backend Changes**
   - Supabase RPC function signatures (as long as contract maintained)
   - Database schema changes (IndexedDB independent)
   - API route changes (if paths stay same)

---

## 10. Test Strategy for Offline Functionality

### 10.1 Unit Tests Needed

```typescript
// Dexie Database Tests
describe('InspectionDatabase', () => {
  test('should auto-generate _localId on inspection creation')
  test('should set _isDirty on inspection update')
  test('should track sync status transitions')
  test('should generate thumbnails for photos')
  test('should capture geolocation in photo metadata')
})

// Sync Service Tests
describe('InspectionSyncService', () => {
  test('should save inspection offline when network unavailable')
  test('should sync pending inspections when online')
  test('should handle sync conflicts correctly')
  test('should retry failed syncs')
  test('should update lastSyncTimestamp')
})

// ITP Forms Tests
describe('OfflineStorage', () => {
  test('should convert files to base64')
  test('should restore files from base64')
  test('should track sync status')
  test('should filter by formType/projectId')
})
```

### 10.2 Integration Tests Needed

```typescript
describe('Offline-First Flow', () => {
  test('should create inspection while offline')
  test('should auto-sync when coming back online')
  test('should display sync status accurately')
  test('should handle concurrent edits (conflict)')
  test('should resolve conflicts correctly')
  test('should upload photos after sync')
  test('should persist form data across page reload')
})

describe('ITP Forms Offline', () => {
  test('should save form offline')
  test('should show pending count')
  test('should sync form on reconnection')
  test('should generate PDF from offline data')
})
```

### 10.3 E2E Tests (Playwright)

```typescript
test('Offline inspection workflow', async ({ page, context }) => {
  // Go offline
  await context.setOffline(true)

  // Fill inspection form
  await page.fill('[name="field1"]', 'value1')

  // Verify saved to IndexedDB
  const saved = await page.evaluate(() => {
    return db.inspections.count()
  })
  expect(saved).toBe(1)

  // Go online
  await context.setOffline(false)

  // Wait for auto-sync
  await page.waitForSelector('.sync-status:has-text("Synced")')

  // Verify on server
  const response = await page.request.get('/api/inspections')
  expect(response.ok()).toBeTruthy()
})

test('Conflict resolution', async ({ page, context }) => {
  // Create inspection offline
  // Modify same inspection on server
  // Go online and trigger sync
  // Verify conflict modal appears
  // Resolve conflict
  // Verify resolution applied
})
```

### 10.4 Manual Test Checklist

- [ ] Create inspection while offline
- [ ] Take photo while offline (verify blob storage)
- [ ] Fill signature while offline
- [ ] Reload page - verify data persisted
- [ ] Go online - verify auto-sync triggers
- [ ] Verify sync status indicator updates
- [ ] Create conflict - verify modal shows
- [ ] Resolve conflict - verify applied
- [ ] Create ITP form offline
- [ ] Generate PDF from offline form
- [ ] Verify form syncs on reconnection
- [ ] Test with multiple pending items
- [ ] Test sync retry on failure
- [ ] Test network interruption during sync
- [ ] Test photo upload retry
- [ ] Verify old data cleanup (30-day retention)

---

## 11. Recommendations for Design Overhaul

### 11.1 Preserve Offline Contracts

**DO:**
- Keep all Dexie table schemas unchanged
- Maintain all `_` prefixed fields (_localId, _isDirty, _syncStatus, etc.)
- Preserve sync API endpoints and request/response formats
- Keep useInspectionSync hook API stable
- Maintain SyncManager event listeners

**DON'T:**
- Change form submission flow without updating offline storage
- Remove SyncStatusIndicator without replacement
- Change ConflictResolverModal without ensuring conflict resolution works
- Modify photo/file storage without testing blob handling

### 11.2 Refactoring Strategy

1. **Extract UI from Logic**
   ```typescript
   // Before: Tightly coupled
   function SyncStatusIndicator() {
     const { syncAll, isSyncing } = useInspectionSync()
     // UI + logic mixed
   }

   // After: Separated
   function useSyncStatus() {
     // Logic only
     return { isOnline, unsyncedCount, hasConflicts }
   }

   function SyncBadge({ status }) {
     // UI only
   }
   ```

2. **Create Abstraction Layer**
   ```typescript
   // Abstract away Dexie
   interface OfflineStore {
     saveInspection(data: any): Promise<string>
     getInspection(id: string): Promise<any>
     getPendingSync(): Promise<any[]>
   }

   // Dexie implementation
   class DexieOfflineStore implements OfflineStore {
     // Dexie-specific code
   }
   ```

3. **Component Replacement Checklist**
   - [ ] Identify all offline-related props/state
   - [ ] Extract to custom hook
   - [ ] Create new UI component
   - [ ] Wire up hook to new component
   - [ ] Test offline scenarios
   - [ ] Test sync scenarios
   - [ ] Test conflict scenarios

### 11.3 Migration Path

**Phase 1: Audit & Document (DONE)**
- Document all offline components
- Map dependencies
- Create test strategy

**Phase 2: Isolate Logic**
- Extract offline logic to hooks
- Create service abstractions
- Add unit tests for services

**Phase 3: UI Redesign**
- Create new UI components (no logic)
- Wire up existing hooks
- Test with existing backend

**Phase 4: Validation**
- E2E tests for offline flows
- Manual testing checklist
- Performance testing (IndexedDB queries)

**Phase 5: Gradual Rollout**
- Feature flag for new UI
- Monitor sync success rates
- Monitor conflict rates
- Check for IndexedDB errors

---

## 12. Key Metrics to Monitor

### 12.1 Functional Metrics

- **Sync Success Rate:** % of inspections synced without manual intervention
- **Conflict Rate:** % of syncs resulting in conflicts
- **Retry Success Rate:** % of failed syncs that succeed on retry
- **Offline Save Success:** % of offline saves that persist correctly

### 12.2 Performance Metrics

- **IndexedDB Write Time:** Should be <50ms for inspection save
- **IndexedDB Query Time:** Should be <100ms for typical queries
- **Photo Storage Time:** Should be <200ms for photo + thumbnail
- **Sync Duration:** Average time to sync one inspection
- **Bulk Download Time:** Time to download all project data for offline use

### 12.3 User Experience Metrics

- **Time to First Sync:** After coming online
- **Conflict Resolution Time:** How long users take to resolve conflicts
- **Offline Form Completion Rate:** % of forms started offline that are submitted

---

## Appendix A: File Inventory

### Core Offline Files

| File Path | Type | Lines | Purpose |
|-----------|------|-------|---------|
| `/apps/web/src/features/inspections/offline/db.ts` | Database | 349 | Dexie schema + helpers |
| `/apps/web/src/lib/offline/inspection-sync.ts` | Service | 365 | Sync service + Dexie DB |
| `/apps/web/src/features/inspections/utils/syncManager.ts` | Service | 154 | Background sync orchestrator |
| `/apps/web/src/features/inspections/hooks/useInspectionSync.ts` | Hook | 175 | React hook for sync |
| `/apps/web/src/features/inspections/components/SyncStatusIndicator.tsx` | Component | 234 | UI status indicator |
| `/apps/web/src/features/inspections/components/ConflictResolverModal.tsx` | Component | 272 | Conflict resolution UI |
| `/apps/web/src/features/inspections/components/InspectionForm.tsx` | Component | ~500 | Form with offline save |
| `/apps/web/src/features/itp-forms/utils/offline-storage.ts` | Service | 172 | ITP forms IndexedDB |
| `/apps/web/src/features/itp-forms/utils/sync-service.ts` | Service | 133 | ITP forms sync |
| `/apps/web/src/app/api/inspections/sync/route.ts` | API | 240 | Server sync endpoint |

### Supporting Files

- `/apps/web/src/lib/serviceWorker.ts` - Service worker registration (disabled)
- `/apps/web/src/components/ServiceWorkerProvider.tsx` - SW provider component
- `/apps/web/public/sw.js.disabled` - Service worker implementation
- `/apps/web/public/offline.html` - Offline fallback page
- `/apps/web/src/app/itp-forms/page.tsx` - ITP forms list with offline indicator

### Total Offline-Related Code

- **~2,500 lines** of TypeScript/TSX
- **7 core files** with Dexie/IndexedDB code
- **10 supporting files** with offline features
- **2 databases** (InspectionDatabase, InspectionOfflineDB)
- **9 IndexedDB tables** total

---

## Appendix B: Dexie vs. Pure IndexedDB

### InspectionDatabase (Dexie)

**Pros:**
- Auto-generated IDs
- Compound indexes
- Hooks for auto-setting fields
- TypeScript-first API
- Transaction helpers

**Cons:**
- Additional dependency
- Larger bundle size
- Learning curve for Dexie-specific features

### ITP Forms (Pure IndexedDB)

**Pros:**
- No external dependencies
- More control
- Smaller bundle impact

**Cons:**
- Verbose API
- Manual transaction management
- No auto-hooks
- More boilerplate

**Recommendation:** Standardize on Dexie for consistency and maintainability.

---

## Appendix C: Sync Flow Diagrams

### Inspection Sync Flow

```
[User Creates Inspection]
         |
         v
[Save to db.inspections]
    _syncStatus = 'pending'
    _isDirty = true
         |
         v
[Add to db.syncQueue]
         |
         v
    [Is Online?]
    /           \
  No             Yes
   |              |
   v              v
[Wait]      [syncInspection()]
   |              |
   |              v
   |      [POST /api/inspections/sync]
   |              |
   |         [Response]
   |         /        \
   |    Success    Conflict
   |      |            |
   |      v            v
   | [Mark Synced] [Add to db.conflicts]
   |                   |
   |                   v
   |          [User Resolves Conflict]
   |                   |
   v-------------------v
[Auto-sync on Reconnect]
```

### ITP Form Sync Flow

```
[User Fills Form]
       |
       v
[Save to offlineStorage]
  syncStatus = 'pending'
       |
       v
  [Is Online?]
   /        \
  No        Yes
  |          |
  v          v
[Wait]  [syncForm()]
  |          |
  |          v
  |    [Insert to itp_forms]
  |          |
  |          v
  |    [Insert to form-specific table]
  |          |
  v----------v
[Auto-sync (30s interval)]
```

---

## Conclusion

The offline-first implementation is **comprehensive and production-ready**, but **tightly coupled to current UI components**. Any design overhaul must:

1. Preserve all Dexie table schemas
2. Maintain sync API contracts
3. Test offline scenarios extensively
4. Extract logic from UI before redesign
5. Monitor metrics during migration

**Estimated effort to preserve offline features during redesign:** 40-60 hours

**Risk mitigation:** Create comprehensive test suite before starting UI changes.
