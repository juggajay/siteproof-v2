# ITP Creation During Lot Creation - Test Plan

## Implementation Summary

✅ **Completed Features:**

1. **Modified CreateLotModal**: Added ITP template selection UI
2. **Updated API Schema**: Added `selectedItpTemplates` field to lot creation
3. **Enhanced API Handler**: Creates ITP instances when templates are selected
4. **Database Integration**: Uses existing `itp_instances` table for lot-template linking

## Test Steps

### 1. Test Template Loading

- Open the Create Lot modal
- Verify that ITP templates are loaded and displayed
- Check that templates show name, description, and category

### 2. Test Template Selection

- Click on templates to select/deselect them
- Verify visual feedback (checkmarks, highlight)
- Confirm selected count updates

### 3. Test Lot Creation Without ITPs

- Create a lot without selecting any templates
- Verify lot is created normally
- Check that no ITP instances are created

### 4. Test Lot Creation With ITPs

- Create a lot with 2-3 templates selected
- Verify lot is created successfully
- Check that corresponding ITP instances are created in the database
- Verify instances have correct naming pattern: `{template.name} - {lot.name}`

### 5. Test Error Handling

- Test with invalid template IDs
- Test with templates from different organization
- Verify lot creation still succeeds even if ITP instance creation fails

## Database Queries for Verification

```sql
-- Check created lots
SELECT * FROM lots WHERE name LIKE '%Test%' ORDER BY created_at DESC;

-- Check created ITP instances
SELECT
  i.id,
  i.name,
  i.status,
  t.name as template_name,
  l.name as lot_name
FROM itp_instances i
JOIN itp_templates t ON i.template_id = t.id
JOIN lots l ON i.lot_id = l.id
WHERE l.name LIKE '%Test%';
```

## Expected Behavior

1. **UI**: Templates are loaded and selectable during lot creation
2. **API**: Lot creation request includes selected template IDs
3. **Database**: ITP instances are created with proper relationships
4. **Error Handling**: Graceful degradation if ITP creation fails

## Files Modified

- `/apps/web/src/features/lots/components/CreateLotModal.tsx`
- `/apps/web/src/app/api/projects/[id]/lots/route.ts`

## Database Schema Used

- `itp_templates` - Template definitions
- `itp_instances` - Instantiated templates for specific lots
- `lots` - Lot records with optional ITP assignments
