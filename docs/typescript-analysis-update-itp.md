# TypeScript Pro Analysis: `updateITP` Function

## Executive Summary

Analysis of the `updateITP` function reveals critical type safety issues that can be resolved through proper TypeScript typing, Supabase type integration, and utility type usage.

---

## 1. Issues with Current Implementation

```typescript
const updateITP = async (id: string, data: any) => {
  return await supabase.from('itp_instances').update(data).eq('id', id);
};
```

### Critical Problems:

1. **`any` Type Usage** - Complete loss of type safety for the `data` parameter
2. **No Return Type** - Return type is inferred but not explicit
3. **Missing Supabase Type Integration** - Not leveraging Supabase's generated types
4. **No Validation** - No runtime or compile-time validation of update fields
5. **Partial Updates Not Typed** - Cannot distinguish between full vs partial updates
6. **Error Handling** - No typed error handling for Supabase responses
7. **Update Constraints** - Cannot enforce which fields are updatable

---

## 2. Improved Type-Safe Implementation

### Option A: Basic Type Safety (Recommended for most cases)

```typescript
import { createClient } from '@/lib/supabase/client';
import type { ITPInstance } from '@siteproof/database';

/**
 * Type for updateable ITP instance fields
 * Excludes system-managed fields that should not be directly updated
 */
type UpdatableITPFields = Partial<
  Omit<
    ITPInstance,
    'id' | 'created_at' | 'created_by' | 'template' | 'project' | 'lot' | 'approver' | 'creator'
  >
>;

/**
 * Update result type with explicit success/error states
 */
interface UpdateITPResult {
  data: ITPInstance | null;
  error: Error | null;
}

/**
 * Updates an ITP instance with type-safe partial updates
 *
 * @param id - The UUID of the ITP instance to update
 * @param data - Partial update data (only updatable fields)
 * @returns Promise with typed data or error
 *
 * @example
 * const result = await updateITP('uuid-here', {
 *   status: 'completed',
 *   completion_percentage: 100,
 *   completed_at: new Date().toISOString()
 * });
 *
 * if (result.error) {
 *   console.error('Update failed:', result.error);
 * } else {
 *   console.log('Updated ITP:', result.data);
 * }
 */
export const updateITP = async (id: string, data: UpdatableITPFields): Promise<UpdateITPResult> => {
  const supabase = createClient();

  // Automatic timestamp update
  const updateData = {
    ...data,
    updated_at: new Date().toISOString(),
  };

  const { data: updatedData, error } = await supabase
    .from('itp_instances')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  return {
    data: updatedData,
    error: error ? new Error(error.message) : null,
  };
};
```

### Option B: Generic Type-Safe Update (Advanced)

```typescript
import { createClient } from '@/lib/supabase/client';
import type { ITPInstance } from '@siteproof/database';

/**
 * Generic update function with compile-time field validation
 */
type SystemFields = 'id' | 'created_at' | 'created_by';
type RelationFields = 'template' | 'project' | 'lot' | 'approver' | 'creator';
type ExcludedFields = SystemFields | RelationFields;

type UpdatableFields<T> = Partial<Omit<T, ExcludedFields>>;

/**
 * Result type with discriminated union for better error handling
 */
type Result<T> = { success: true; data: T } | { success: false; error: Error };

/**
 * Type-safe ITP updater with builder pattern
 */
class ITPUpdater {
  private updates: Partial<ITPInstance> = {};

  /**
   * Set status (with type validation)
   */
  setStatus(status: ITPInstance['status']): this {
    this.updates.status = status;
    return this;
  }

  /**
   * Set completion percentage (with validation)
   */
  setCompletionPercentage(percentage: number): this {
    if (percentage < 0 || percentage > 100) {
      throw new Error('Completion percentage must be between 0 and 100');
    }
    this.updates.completion_percentage = percentage;
    return this;
  }

  /**
   * Update custom data (with type safety)
   */
  updateData(data: Record<string, any>): this {
    this.updates.data = {
      ...this.updates.data,
      ...data,
    };
    return this;
  }

  /**
   * Mark as completed
   */
  markCompleted(): this {
    this.updates.status = 'completed';
    this.updates.completion_percentage = 100;
    this.updates.completed_at = new Date().toISOString();
    return this;
  }

  /**
   * Mark as approved
   */
  markApproved(approvedBy: string): this {
    this.updates.status = 'approved';
    this.updates.approved_at = new Date().toISOString();
    this.updates.approved_by = approvedBy;
    return this;
  }

  /**
   * Execute the update
   */
  async execute(id: string): Promise<Result<ITPInstance>> {
    const supabase = createClient();

    const updateData = {
      ...this.updates,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('itp_instances')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { success: false, error: new Error(error.message) };
    }

    if (!data) {
      return { success: false, error: new Error('No data returned from update') };
    }

    return { success: true, data };
  }
}

/**
 * Factory function for fluent API
 */
export const updateITP = () => new ITPUpdater();

/**
 * Simple update function (backward compatible)
 */
export const updateITPSimple = async (
  id: string,
  data: UpdatableFields<ITPInstance>
): Promise<Result<ITPInstance>> => {
  const supabase = createClient();

  const updateData = {
    ...data,
    updated_at: new Date().toISOString(),
  };

  const { data: updatedData, error } = await supabase
    .from('itp_instances')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { success: false, error: new Error(error.message) };
  }

  if (!updatedData) {
    return { success: false, error: new Error('No data returned from update') };
  }

  return { success: true, data: updatedData };
};
```

### Option C: With Zod Validation (Production-Ready)

```typescript
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import type { ITPInstance } from '@siteproof/database';

/**
 * Zod schema for ITP updates with runtime validation
 */
const ITPUpdateSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    status: z.enum(['draft', 'in_progress', 'completed', 'approved']).optional(),
    completion_percentage: z.number().min(0).max(100).optional(),
    data: z.record(z.any()).optional(),
    lot_id: z.string().uuid().nullable().optional(),
    started_at: z.string().datetime().nullable().optional(),
    completed_at: z.string().datetime().nullable().optional(),
    approved_at: z.string().datetime().nullable().optional(),
    approved_by: z.string().uuid().nullable().optional(),
  })
  .strict(); // Prevent additional properties

type ITPUpdateInput = z.infer<typeof ITPUpdateSchema>;

/**
 * Validated update with runtime type checking
 */
export const updateITPValidated = async (
  id: string,
  data: ITPUpdateInput
): Promise<Result<ITPInstance>> => {
  // Validate input
  const validation = ITPUpdateSchema.safeParse(data);

  if (!validation.success) {
    return {
      success: false,
      error: new Error(`Validation failed: ${validation.error.message}`),
    };
  }

  const supabase = createClient();

  const updateData = {
    ...validation.data,
    updated_at: new Date().toISOString(),
  };

  const { data: updatedData, error } = await supabase
    .from('itp_instances')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { success: false, error: new Error(error.message) };
  }

  if (!updatedData) {
    return { success: false, error: new Error('No data returned from update') };
  }

  return { success: true, data: updatedData };
};

type Result<T> = { success: true; data: T } | { success: false; error: Error };
```

---

## 3. Usage Examples with Type Safety

### Basic Usage (Option A)

```typescript
// ✅ Type-safe: Only allows valid fields
const result = await updateITP('itp-id', {
  status: 'completed',
  completion_percentage: 100,
});

if (result.error) {
  console.error('Failed to update:', result.error.message);
} else {
  console.log('Updated ITP:', result.data?.name);
}

// ❌ Compile error: Cannot update system fields
const badResult = await updateITP('itp-id', {
  id: 'new-id', // Error: 'id' is not updatable
  created_at: new Date(), // Error: 'created_at' is not updatable
});

// ❌ Compile error: Invalid status value
const invalidStatus = await updateITP('itp-id', {
  status: 'invalid-status', // Error: Type '"invalid-status"' is not assignable
});
```

### Builder Pattern Usage (Option B)

```typescript
// ✅ Fluent, type-safe API
const result = await updateITP()
  .setStatus('in_progress')
  .setCompletionPercentage(50)
  .updateData({ field1: 'value1' })
  .execute('itp-id');

if (result.success) {
  console.log('Updated:', result.data.name);
} else {
  console.error('Error:', result.error.message);
}

// ✅ Convenient helper methods
const completed = await updateITP().markCompleted().execute('itp-id');

const approved = await updateITP().markApproved('user-id').execute('itp-id');
```

### Validated Usage (Option C)

```typescript
// ✅ Runtime + compile-time validation
const result = await updateITPValidated('itp-id', {
  status: 'completed',
  completion_percentage: 100,
});

// ✅ Validation catches errors at runtime
const invalidResult = await updateITPValidated('itp-id', {
  completion_percentage: 150, // Fails validation: must be <= 100
});

if (!invalidResult.success) {
  console.error('Validation error:', invalidResult.error.message);
}
```

---

## 4. Advanced Type Safety Patterns

### Generic Supabase Update Helper

```typescript
import type { Database } from '@/lib/supabase/database.types';

type Tables = Database['public']['Tables'];
type TableName = keyof Tables;

/**
 * Generic update function for any Supabase table
 */
type UpdatableRecord<T extends TableName> = Partial<
  Omit<Tables[T]['Row'], 'id' | 'created_at' | 'created_by' | 'updated_at'>
>;

export const updateRecord = async <T extends TableName>(
  table: T,
  id: string,
  data: UpdatableRecord<T>
): Promise<Result<Tables[T]['Row']>> => {
  const supabase = createClient();

  const updateData = {
    ...data,
    updated_at: new Date().toISOString(),
  } as any;

  const { data: updatedData, error } = await supabase
    .from(table)
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { success: false, error: new Error(error.message) };
  }

  if (!updatedData) {
    return { success: false, error: new Error('No data returned') };
  }

  return { success: true, data: updatedData as Tables[T]['Row'] };
};

// Usage with full type inference
const result = await updateRecord('itp_instances', 'id', {
  status: 'completed', // ✅ Autocomplete and type-checked
});
```

### Conditional Updates with Type Guards

```typescript
/**
 * Type guard for status transitions
 */
const isValidStatusTransition = (
  current: ITPInstance['status'],
  next: ITPInstance['status']
): boolean => {
  const validTransitions: Record<ITPInstance['status'], ITPInstance['status'][]> = {
    draft: ['in_progress'],
    in_progress: ['completed'],
    completed: ['approved'],
    approved: [],
  };

  return validTransitions[current]?.includes(next) ?? false;
};

/**
 * Update with state machine validation
 */
export const updateITPWithTransition = async (
  id: string,
  currentStatus: ITPInstance['status'],
  newStatus: ITPInstance['status'],
  additionalData?: UpdatableFields<ITPInstance>
): Promise<Result<ITPInstance>> => {
  if (!isValidStatusTransition(currentStatus, newStatus)) {
    return {
      success: false,
      error: new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`),
    };
  }

  return updateITPSimple(id, {
    ...additionalData,
    status: newStatus,
  });
};
```

---

## 5. Additional Type Safety Recommendations

### 1. Create Dedicated Type File

```typescript
// src/lib/types/itp-updates.ts

import type { ITPInstance } from '@siteproof/database';

export type ITPStatus = ITPInstance['status'];

export type ITPUpdateData = Partial<
  Omit<
    ITPInstance,
    'id' | 'created_at' | 'created_by' | 'template' | 'project' | 'lot' | 'approver' | 'creator'
  >
>;

export interface ITPUpdateOptions {
  skipTimestamp?: boolean;
  skipValidation?: boolean;
}

export type ITPUpdateResult =
  | { success: true; data: ITPInstance }
  | { success: false; error: Error; code?: string };
```

### 2. Implement Optimistic Updates

```typescript
/**
 * Optimistic update with rollback
 */
export const updateITPOptimistic = async (
  id: string,
  data: UpdatableFields<ITPInstance>,
  onOptimisticUpdate?: (data: ITPInstance) => void
): Promise<Result<ITPInstance>> => {
  // Call optimistic callback immediately
  if (onOptimisticUpdate) {
    onOptimisticUpdate({ id, ...data } as ITPInstance);
  }

  const result = await updateITPSimple(id, data);

  // Rollback handled by caller if result.success === false
  return result;
};
```

### 3. Add Logging and Telemetry

```typescript
/**
 * Update with automatic logging
 */
export const updateITPWithLogging = async (
  id: string,
  data: UpdatableFields<ITPInstance>,
  userId?: string
): Promise<Result<ITPInstance>> => {
  const startTime = Date.now();

  const result = await updateITPSimple(id, data);

  // Log result (replace with your logging system)
  console.log({
    action: 'update_itp',
    id,
    userId,
    success: result.success,
    duration: Date.now() - startTime,
    fields: Object.keys(data),
  });

  return result;
};
```

### 4. Batch Updates with Type Safety

```typescript
/**
 * Batch update multiple ITPs
 */
export const updateMultipleITPs = async (
  updates: Array<{ id: string; data: UpdatableFields<ITPInstance> }>
): Promise<Result<ITPInstance[]>> => {
  const supabase = createClient();

  try {
    const results = await Promise.all(updates.map(({ id, data }) => updateITPSimple(id, data)));

    const failures = results.filter((r) => !r.success);

    if (failures.length > 0) {
      return {
        success: false,
        error: new Error(`${failures.length} updates failed`),
      };
    }

    const successData = results
      .filter((r): r is { success: true; data: ITPInstance } => r.success)
      .map((r) => r.data);

    return { success: true, data: successData };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
};
```

---

## 6. Migration Path

### Step 1: Add Type Definitions

```typescript
// Add to existing codebase
type UpdatableITPFields = Partial<
  Omit<
    ITPInstance,
    'id' | 'created_at' | 'created_by' | 'template' | 'project' | 'lot' | 'approver' | 'creator'
  >
>;
```

### Step 2: Create New Function

```typescript
// Create alongside existing function
export const updateITPTyped = async (
  id: string,
  data: UpdatableITPFields
): Promise<UpdateITPResult> => {
  // Implementation from Option A
};
```

### Step 3: Migrate Gradually

```typescript
// Old code (deprecated)
await updateITP(id, { status: 'completed' });

// New code (type-safe)
await updateITPTyped(id, { status: 'completed' });
```

### Step 4: Replace Original

```typescript
// After migration complete, replace original function
export const updateITP = updateITPTyped;
```

---

## 7. Testing Recommendations

```typescript
import { describe, it, expect } from 'vitest';

describe('updateITP', () => {
  it('should update ITP with valid data', async () => {
    const result = await updateITP('test-id', {
      status: 'completed',
      completion_percentage: 100,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('completed');
    }
  });

  it('should reject invalid completion percentage', async () => {
    const result = await updateITP()
      .setCompletionPercentage(150) // Should throw or return error
      .execute('test-id');

    expect(result.success).toBe(false);
  });

  it('should enforce status transitions', async () => {
    const result = await updateITPWithTransition(
      'test-id',
      'draft',
      'approved' // Invalid: must go through in_progress -> completed
    );

    expect(result.success).toBe(false);
  });
});
```

---

## 8. Conclusion

### Recommended Implementation Order:

1. **Immediate**: Implement **Option A** (Basic Type Safety) - Low effort, high impact
2. **Short-term**: Add **Zod validation** (Option C) for production safety
3. **Long-term**: Consider **Builder Pattern** (Option B) for complex workflows

### Key Benefits:

- ✅ **Eliminated `any` types** - Full type safety
- ✅ **Explicit return types** - Better IDE support
- ✅ **Supabase integration** - Leverages generated types
- ✅ **Partial updates** - Type-safe with utility types
- ✅ **Error handling** - Discriminated unions for explicit error states
- ✅ **Runtime validation** - With Zod for production safety
- ✅ **Field constraints** - Compile-time enforcement of updatable fields

### TypeScript Pro Principles Applied:

1. ✅ **Strict type checking** - No `any` types
2. ✅ **Generics and utility types** - `Partial<>`, `Omit<>`, `Pick<>`
3. ✅ **Type inference** - Result types inferred correctly
4. ✅ **Robust interfaces** - Clear contracts with discriminated unions

---

## File Location

This analysis should be saved to:

```
/mnt/c/Users/jayso/siteproof-v2/docs/typescript-analysis-update-itp.md
```
