# ITP Display Issue Fix

## Problem
ITPs (Inspection Test Plans) were not showing up in the lot detail page after being assigned to a lot.

## Root Cause
The API endpoint `/api/projects/[projectId]/lots/[lotId]/itp` was only fetching raw `itp_instances` data without including the related `itp_templates` information. The frontend component `OptimizedMobileItpManager` expects instances to include nested template data for proper display.

## Solution
Updated the GET endpoint in `/apps/web/src/app/api/projects/[projectId]/lots/[lotId]/itp/route.ts` to:

1. Include the `itp_templates` relation in the Supabase query
2. Return the response in the expected format with an `instances` array

### Code Changes
```typescript
// Before: Only fetching raw instances
const { data: itpInstances, error } = await supabase
  .from('itp_instances')
  .select('*')
  .eq('lot_id', lotId)
  .order('created_at', { ascending: false });

return NextResponse.json(itpInstances || []);

// After: Fetching instances with template data
const { data: itpInstances, error } = await supabase
  .from('itp_instances')
  .select(`
    *,
    itp_templates (
      id,
      name,
      description,
      structure,
      organization_id,
      category
    )
  `)
  .eq('lot_id', lotId)
  .order('created_at', { ascending: false });

return NextResponse.json({ instances: itpInstances || [] });
```

## Impact
- ITPs now properly display in the lot detail page after assignment
- Template information (name, description, structure) is available for rendering
- The frontend can properly show ITP cards with all necessary data

## Testing
To verify the fix:
1. Navigate to a lot detail page
2. Assign an ITP template to the lot
3. The ITP should immediately appear in the lot's ITP list
4. The ITP card should show the template name and allow interaction

## Related Files
- `/apps/web/src/app/api/projects/[projectId]/lots/[lotId]/itp/route.ts` - API endpoint (fixed)
- `/apps/web/src/components/itp/optimized-mobile-itp-manager.tsx` - Frontend component
- `/apps/web/src/app/api/itp/instances/assign/route.ts` - ITP assignment endpoint

## Prevention
For future API endpoints:
- Always include related data that the frontend expects
- Match the response format to what components are designed to consume
- Use consistent data structures across similar endpoints