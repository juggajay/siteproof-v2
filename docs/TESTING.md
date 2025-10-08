# 🧪 Testing Guide

> Comprehensive testing strategy and guidelines for SiteProof v2

## Table of Contents

- [Overview](#overview)
- [Testing Philosophy](#testing-philosophy)
- [Test Types](#test-types)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Security Testing](#security-testing)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

SiteProof v2 uses a comprehensive testing strategy:

- **Unit Tests**: Vitest
- **Component Tests**: React Testing Library
- **Integration Tests**: Vitest + Supabase
- **E2E Tests**: Playwright
- **Security Tests**: Custom security suite
- **Type Checking**: TypeScript strict mode

### Coverage Goals

- **Overall**: >80% code coverage
- **Critical Paths**: 100% (auth, permissions, financial filtering)
- **API Routes**: >90%
- **Components**: >75%

---

## Testing Philosophy

### 1. Test Behavior, Not Implementation

```typescript
// ❌ BAD: Testing implementation details
it('should call useState with initial value', () => {
  const spy = vi.spyOn(React, 'useState');
  render(<Component />);
  expect(spy).toHaveBeenCalledWith(0);
});

// ✅ GOOD: Testing user-facing behavior
it('should display initial count of 0', () => {
  render(<Component />);
  expect(screen.getByText('Count: 0')).toBeInTheDocument();
});
```

### 2. Write Tests First (TDD)

```typescript
// 1. Write failing test
it('should filter financial data for viewer role', () => {
  const data = { hourly_rate: 50, name: 'John' };
  const filtered = filterFinancialData(data, 'viewer');
  expect(filtered).not.toHaveProperty('hourly_rate');
  expect(filtered.name).toBe('John');
});

// 2. Implement feature
export function filterFinancialData(data, role) {
  if (hasFinancialAccess(role)) return data;
  const { hourly_rate, daily_rate, ...safe } = data;
  return safe;
}

// 3. Test passes ✅
```

### 3. Test Edge Cases

```typescript
describe('UUID Validation', () => {
  it('should accept valid UUID', () => {
    expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('should reject invalid UUID', () => {
    expect(isValidUUID('not-a-uuid')).toBe(false);
  });

  it('should reject empty string', () => {
    expect(isValidUUID('')).toBe(false);
  });

  it('should reject null', () => {
    expect(isValidUUID(null)).toBe(false);
  });

  it('should reject undefined', () => {
    expect(isValidUUID(undefined)).toBe(false);
  });
});
```

---

## Test Types

### Unit Tests

Test individual functions in isolation.

**Location**: `features/*/utils/*.test.ts`, `lib/*/*.test.ts`

**Example**:

```typescript
// lib/auth/permissions.test.ts
import { describe, it, expect } from 'vitest';
import { filterFinancialData, hasFinancialAccess } from './permissions';

describe('Financial Data Filtering', () => {
  const testData = {
    id: '123',
    name: 'John Doe',
    hourly_rate: 50,
    daily_rate: 400,
    total_cost: 3200,
  };

  it('should keep financial data for owner role', () => {
    const filtered = filterFinancialData(testData, 'owner');
    expect(filtered.hourly_rate).toBe(50);
    expect(filtered.daily_rate).toBe(400);
  });

  it('should remove financial data for viewer role', () => {
    const filtered = filterFinancialData(testData, 'viewer');
    expect(filtered).not.toHaveProperty('hourly_rate');
    expect(filtered).not.toHaveProperty('daily_rate');
    expect(filtered).not.toHaveProperty('total_cost');
    expect(filtered.name).toBe('John Doe');
  });

  it('should keep financial data for finance_manager role', () => {
    const filtered = filterFinancialData(testData, 'finance_manager');
    expect(filtered.hourly_rate).toBe(50);
  });
});
```

### Component Tests

Test React components and user interactions.

**Location**: `components/*/*.test.tsx`

**Example**:

```typescript
// components/diary/DiaryCard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DiaryCard from './DiaryCard';

describe('DiaryCard', () => {
  const mockDiary = {
    id: '123',
    diary_date: '2025-10-08T00:00:00.000Z',
    work_summary: 'Concrete pour completed',
    weather_morning: 'Clear, 22°C',
  };

  it('should render diary information', () => {
    render(<DiaryCard diary={mockDiary} />);

    expect(screen.getByText('Concrete pour completed')).toBeInTheDocument();
    expect(screen.getByText(/Clear, 22°C/)).toBeInTheDocument();
  });

  it('should call onEdit when edit button clicked', () => {
    const onEdit = vi.fn();
    render(<DiaryCard diary={mockDiary} onEdit={onEdit} />);

    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);

    expect(onEdit).toHaveBeenCalledWith('123');
  });

  it('should not show financial data for viewer role', () => {
    const diaryWithFinancials = {
      ...mockDiary,
      total_cost: 1500,
    };

    render(<DiaryCard diary={diaryWithFinancials} userRole="viewer" />);

    expect(screen.queryByText(/1500/)).not.toBeInTheDocument();
  });
});
```

### API Tests

Test API routes and endpoints.

**Location**: `app/api/*/*.test.ts`

**Example**:

```typescript
// app/api/diaries/route.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { POST } from './route';

describe('POST /api/diaries', () => {
  let request: Request;

  beforeEach(() => {
    // Set up test data
  });

  afterEach(() => {
    // Clean up test data
  });

  it('should create diary with valid data', async () => {
    request = new Request('http://localhost:3000/api/diaries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        diary_date: '2025-10-08T00:00:00.000Z',
        project_id: 'valid-uuid',
        work_summary: 'Test work summary that is long enough',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);

    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(data.work_summary).toBe('Test work summary that is long enough');
  });

  it('should reject invalid UUID', async () => {
    request = new Request('http://localhost:3000/api/diaries', {
      method: 'POST',
      body: JSON.stringify({
        diary_date: '2025-10-08T00:00:00.000Z',
        project_id: 'not-a-uuid',
        work_summary: 'Test work summary',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.validationErrors.project_id).toBeDefined();
  });

  it('should reject missing CSRF token', async () => {
    // Test CSRF protection
  });
});
```

### Integration Tests

Test multiple components working together.

**Example**:

```typescript
// tests/integration/diary-workflow.test.ts
import { describe, it, expect } from 'vitest';
import { createDiary, approveDiary, exportDiaryPDF } from '@/features/diary';

describe('Diary Workflow Integration', () => {
  it('should complete full diary workflow', async () => {
    // 1. Create diary
    const diary = await createDiary({
      diary_date: '2025-10-08T00:00:00.000Z',
      project_id: testProjectId,
      work_summary: 'Concrete pour completed',
    });

    expect(diary.id).toBeDefined();
    expect(diary.approved_by).toBeNull();

    // 2. Approve diary
    const approved = await approveDiary(diary.id, adminUserId);
    expect(approved.approved_by).toBe(adminUserId);
    expect(approved.approved_at).toBeDefined();

    // 3. Export PDF
    const pdfUrl = await exportDiaryPDF(diary.id);
    expect(pdfUrl).toMatch(/https:\/\/.+\.pdf$/);
  });
});
```

### E2E Tests (Playwright)

Test complete user workflows in a real browser.

**Location**: `tests/e2e/*.spec.ts`

**Example**:

```typescript
// tests/e2e/diary.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Diary Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should create new diary', async ({ page }) => {
    // Navigate to diaries
    await page.click('text=Daily Diaries');
    await page.click('button:has-text("New Diary")');

    // Fill form
    await page.fill('input[name="work_summary"]', 'Test diary entry');
    await page.selectOption('select[name="project_id"]', testProjectId);
    await page.fill('input[name="weather_morning"]', 'Sunny, 25°C');

    // Submit
    await page.click('button:has-text("Save")');

    // Verify creation
    await expect(page.locator('text=Test diary entry')).toBeVisible();
  });

  test('viewer should not see financial data', async ({ page }) => {
    // Login as viewer
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'viewer@example.com');
    await page.fill('input[name="password"]', 'ViewerPass123!');
    await page.click('button[type="submit"]');

    // View diary
    await page.goto(`/dashboard/diaries/${testDiaryId}`);

    // Financial data should not be visible
    await expect(page.locator('text=/hourly.rate/i')).not.toBeVisible();
    await expect(page.locator('text=/total.cost/i')).not.toBeVisible();
  });
});
```

---

## Running Tests

### Command Reference

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run tests in UI mode (interactive)
pnpm test:ui

# Run specific test file
pnpm test diary.test.ts

# Run tests matching pattern
pnpm test --grep "financial"

# Run E2E tests
pnpm exec playwright test

# Run security tests only
pnpm test tests/security/
```

### CI/CD Testing

Tests run automatically on:

- **Pull Requests**: All tests must pass
- **Main Branch**: Full test suite + coverage
- **Pre-commit**: Linting + type checking

---

## Writing Tests

### Test File Structure

```typescript
// [feature].test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Feature Name', () => {
  // Setup
  beforeEach(() => {
    // Runs before each test
  });

  afterEach(() => {
    // Runs after each test
  });

  describe('Subfeature', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = doSomething(input);

      // Assert
      expect(result).toBe('expected');
    });

    it('should handle edge case', () => {
      // Test edge cases
    });
  });
});
```

### Mocking

**Mock Supabase Client**:

```typescript
import { vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: mockData, error: null })),
        })),
      })),
    })),
  })),
}));
```

**Mock Functions**:

```typescript
const mockFn = vi.fn();
mockFn.mockReturnValue('mocked value');
mockFn.mockResolvedValue(Promise.resolve('async value'));
mockFn.mockRejectedValue(new Error('error'));
```

### Assertions

```typescript
// Equality
expect(value).toBe(expected);
expect(obj).toEqual({ key: 'value' });

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeUndefined();
expect(value).toBeDefined();

// Numbers
expect(value).toBeGreaterThan(10);
expect(value).toBeLessThan(100);
expect(value).toBeCloseTo(0.3, 5);

// Strings
expect(str).toMatch(/pattern/);
expect(str).toContain('substring');

// Arrays/Objects
expect(array).toHaveLength(3);
expect(obj).toHaveProperty('key');
expect(array).toContain(item);

// Exceptions
expect(() => fn()).toThrow();
expect(() => fn()).toThrow(Error);
expect(() => fn()).toThrow('error message');

// Async
await expect(promise).resolves.toBe(value);
await expect(promise).rejects.toThrow();
```

---

## Security Testing

### Security Test Suite

Location: `tests/security/`

**CSRF Protection** (`csrf.test.ts`):

```typescript
it('should reject POST request without CSRF token', async () => {
  const response = await fetch('/api/diaries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ... }),
  });

  expect(response.status).toBe(403);
  const body = await response.text();
  expect(body).toContain('Invalid CSRF token');
});
```

**Rate Limiting** (`rate-limit.test.ts`):

```typescript
it('should rate limit after 5 login attempts', async () => {
  const requests = [];
  for (let i = 0; i < 6; i++) {
    requests.push(fetch('/api/auth/login', { method: 'POST', ... }));
  }

  const responses = await Promise.all(requests);
  const sixth = responses[5];

  expect(sixth.status).toBe(429);
});
```

**Input Validation** (`input-validation.test.ts`):

```typescript
it('should reject invalid UUID in path parameter', async () => {
  const response = await fetch('/api/diaries/not-a-valid-uuid');
  expect(response.status).toBe(400);

  const body = await response.json();
  expect(body.validationErrors.id).toContain('Invalid UUID format');
});
```

**Authorization** (`authorization.test.ts`):

```typescript
it('should filter financial data for viewer role', async () => {
  // Login as viewer
  await loginAs('viewer@example.com');

  // Fetch diary
  const response = await fetch('/api/diaries/123');
  const diary = await response.json();

  // Verify financial fields removed
  expect(diary).not.toHaveProperty('hourly_rate');
  expect(diary).not.toHaveProperty('total_cost');
});
```

---

## Best Practices

### 1. AAA Pattern

```typescript
it('should calculate total cost', () => {
  // Arrange
  const rate = 50;
  const hours = 8;

  // Act
  const total = calculateCost(rate, hours);

  // Assert
  expect(total).toBe(400);
});
```

### 2. Descriptive Test Names

```typescript
// ❌ BAD
it('works', () => { ... });
it('test 1', () => { ... });

// ✅ GOOD
it('should filter financial data for viewer role', () => { ... });
it('should reject invalid UUID format', () => { ... });
it('should return 403 when CSRF token missing', () => { ... });
```

### 3. One Assertion Per Test (when possible)

```typescript
// ❌ BAD: Multiple unrelated assertions
it('should work', () => {
  expect(fn1()).toBe(1);
  expect(fn2()).toBe(2);
  expect(fn3()).toBe(3);
});

// ✅ GOOD: Focused tests
it('should return 1 for fn1', () => {
  expect(fn1()).toBe(1);
});

it('should return 2 for fn2', () => {
  expect(fn2()).toBe(2);
});
```

### 4. Avoid Test Interdependence

```typescript
// ❌ BAD: Tests depend on order
let userId;

it('should create user', () => {
  userId = createUser();
});

it('should fetch user', () => {
  const user = getUser(userId); // Fails if first test fails
});

// ✅ GOOD: Independent tests
it('should create user', () => {
  const userId = createUser();
  expect(userId).toBeDefined();
});

it('should fetch user', () => {
  const userId = createUser(); // Create fresh data
  const user = getUser(userId);
  expect(user).toBeDefined();
});
```

### 5. Clean Up After Tests

```typescript
afterEach(async () => {
  // Clean up test data
  await db.diaries.clear();
  await db.ncrs.clear();

  // Reset mocks
  vi.clearAllMocks();
});
```

---

## Troubleshooting

### Common Issues

**Tests fail locally but pass in CI**:

- Check Node.js version matches CI
- Clear node_modules and reinstall
- Check for environment-specific issues

**Timeout errors**:

```typescript
// Increase timeout for slow tests
it('should generate PDF', async () => {
  // ... test code
}, 10000); // 10 second timeout
```

**Mock not working**:

```typescript
// Ensure mock is before import
vi.mock('@/lib/supabase/server');
import { createClient } from '@/lib/supabase/server';
```

**Test database issues**:

```bash
# Reset test database
supabase db reset --db-url postgresql://...

# Run migrations
supabase db push
```

---

## Coverage Reports

### View Coverage

```bash
# Generate coverage report
pnpm test:coverage

# View HTML report
open coverage/index.html
```

### Coverage Thresholds

```json
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },
  },
});
```

---

## Continuous Improvement

- **Add tests** for every bug fix
- **Increase coverage** incrementally
- **Refactor** tests as code evolves
- **Review** test failures carefully
- **Document** complex test scenarios

Remember: **Good tests are an investment, not a cost!**
