# ITP System Redesign - Foreman-First Approach

## Core Problems Identified
1. Database schema mismatch (columns exist in some environments but not others)
2. Complex JSONB data structure makes updates slow
3. Too many API calls for simple Pass/Fail actions
4. Not optimized for mobile use on construction sites

## Optimal Solution Design

### 1. Simplified Data Model
Instead of complex nested JSONB, use a flat structure:
```javascript
// Current (Complex)
data: {
  section1: {
    item1: { result: 'pass', notes: '...' },
    item2: { result: 'fail', notes: '...' }
  }
}

// New (Simple)
items: {
  'section1-item1': 'pass',
  'section1-item2': 'fail'
}
notes: {
  'section1-item2': 'Failed due to...'
}
```

### 2. Single Batch Update Endpoint
One API call to update multiple items:
```
POST /api/itp/batch-update
{
  updates: [
    { instanceId: '...', itemId: '...', status: 'pass' },
    { instanceId: '...', itemId: '...', status: 'fail' }
  ]
}
```

### 3. Mobile-First UI Components
- Large touch targets (min 48x48px)
- Swipe actions for quick status changes
- Color-coded visual feedback (Green=Pass, Red=Fail, Gray=NA)
- Progress bar at top showing completion %
- Offline queue for updates

### 4. Foreman Workflow Optimization
1. **Quick Add**: One-tap to add common ITP templates
2. **Bulk Actions**: "Mark All as Pass" button
3. **Smart Defaults**: Auto-progress to next item after marking
4. **Visual Progress**: Large % complete indicator
5. **Quick Submit**: One-tap submission when complete

### 5. Database Migration Strategy
Create a migration that standardizes the schema across all environments:
```sql
-- Ensure all required columns exist
ALTER TABLE itp_instances 
ADD COLUMN IF NOT EXISTS inspection_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS inspection_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS evidence_files JSONB,
ADD COLUMN IF NOT EXISTS sync_status VARCHAR(50) DEFAULT 'synced',
ADD COLUMN IF NOT EXISTS organization_id UUID;
```

## Implementation Priority
1. Fix database schema (immediate)
2. Create batch update API (immediate)
3. Simplify frontend component (next)
4. Add offline support (future)