# 🚀 Developer Onboarding Guide

> Welcome to SiteProof v2! This guide will help you get set up and productive quickly.

## Table of Contents

- [Day 1: Setup & Orientation](#day-1-setup--orientation)
- [Day 2-3: Codebase Exploration](#day-2-3-codebase-exploration)
- [Day 4-5: First Contribution](#day-4-5-first-contribution)
- [Week 2+: Advanced Topics](#week-2-advanced-topics)
- [Resources](#resources)

---

## Day 1: Setup & Orientation

### 1.1 System Requirements

Ensure you have the following installed:

- **Node.js**: v20+ ([Download](https://nodejs.org/))
- **pnpm**: v8+ (`npm install -g pnpm`)
- **Git**: Latest version
- **VS Code**: Recommended editor ([Download](https://code.visualstudio.com/))

**VS Code Extensions** (recommended):

- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- Tailwind CSS IntelliSense
- GitLens
- Supabase (snippets and autocomplete)

### 1.2 Repository Setup

```bash
# Clone the repository
git clone https://github.com/your-org/siteproof-v2.git
cd siteproof-v2

# Install dependencies
pnpm install

# Set up Git hooks (pre-commit)
pnpm prepare
```

### 1.3 Environment Configuration

```bash
# Copy environment template
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```bash
# Supabase (get from https://app.supabase.com)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Anthropic AI (optional for development)
ANTHROPIC_API_KEY=sk-ant-xxx

# Trigger.dev (optional for development)
TRIGGER_SECRET_KEY=tr_xxx

# Resend Email (optional for development)
RESEND_API_KEY=re_xxx

# Redis (optional - rate limiting uses memory fallback)
REDIS_URL=redis://localhost:6379
```

### 1.4 Supabase Setup

Two options:

**Option A: Use Shared Development Instance**

- Get credentials from team lead
- Update `.env.local` with provided values
- **Caution**: Don't modify database schema directly

**Option B: Local Supabase (Recommended for isolation)**

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize local Supabase
supabase init

# Start local Supabase
supabase start

# Apply migrations
supabase db reset

# Get your local credentials
supabase status
```

### 1.5 First Run

```bash
# Start development server
pnpm dev

# In separate terminal, run tests
pnpm test

# Run type checking
pnpm type-check

# Run linting
pnpm lint
```

Open http://localhost:3000 - you should see the login page!

### 1.6 Create Test Account

```bash
# Using Supabase Studio (local: http://localhost:54323)
# Or via API:
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dev@example.com",
    "password": "DevPassword123!",
    "full_name": "Developer User"
  }'
```

### 1.7 Orientation Checklist

- [ ] Successfully started dev server
- [ ] Logged in to the application
- [ ] Explored dashboard interface
- [ ] Created a test project
- [ ] Created a test diary entry
- [ ] Ran test suite successfully
- [ ] Read [ARCHITECTURE.md](./ARCHITECTURE.md)
- [ ] Read [API.md](./API.md)
- [ ] Joined team Slack/Discord
- [ ] Scheduled 1:1 with mentor

---

## Day 2-3: Codebase Exploration

### 2.1 Understanding the Architecture

Read these docs in order:

1. [README.md](../README.md) - Project overview
2. [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
3. [API.md](./API.md) - API reference
4. [SECURITY_REVIEW_2025-10-08.md](./SECURITY_REVIEW_2025-10-08.md) - Security posture

### 2.2 Key Directories

```
apps/web/src/
├── app/                  # Next.js App Router
│   ├── api/              # 🔥 START HERE: API endpoints
│   │   ├── diaries/      # Daily diary CRUD
│   │   ├── ncrs/         # NCR management
│   │   └── itp/          # ITP workflows
│   └── dashboard/        # Dashboard pages
│
├── features/             # 🔥 FEATURE MODULES (business logic)
│   ├── diary/            # Diary feature
│   ├── ncr/              # NCR feature
│   └── itp-forms/        # ITP feature
│
├── components/           # React components
│   ├── ui/               # Base components (Button, Card, etc.)
│   └── dashboard/        # Dashboard-specific components
│
└── lib/                  # 🔥 CORE UTILITIES
    ├── validation/       # Zod schemas
    ├── auth/             # RBAC & permissions
    ├── errors/           # Error handling
    └── supabase/         # DB client
```

### 2.3 Code Reading Exercise

Follow this learning path:

#### Exercise 1: API Request Flow

Trace a diary creation request:

1. Start: `apps/web/src/app/api/diaries/route.ts` (POST handler)
2. Validation: `lib/validation/schemas.ts` (createDiarySchema)
3. Auth: `lib/auth/permissions.ts` (diaryPermissions)
4. Error handling: `lib/errors/api-errors.ts` (handleAPIError)

#### Exercise 2: RBAC System

Understand permission checking:

1. Read: `lib/auth/permissions.ts`
2. Find: How `filterFinancialData()` works
3. Test: Create user with `viewer` role, verify financial data is hidden

#### Exercise 3: Offline Sync

Explore offline-first architecture:

1. Read: `lib/offline/db.ts` (Dexie setup)
2. Read: `lib/offline/sync.ts` (sync logic)
3. Test: Go offline, create diary, go online, verify sync

### 2.4 Database Schema

Study the schema:

```bash
# View migrations
ls packages/database/migrations/

# Generate TypeScript types
pnpm db:generate-types

# Explore in Supabase Studio
# Local: http://localhost:54323
# Remote: https://app.supabase.com
```

Key tables:

- `organizations` - Multi-tenant root
- `projects` - Construction projects
- `daily_diaries` - Daily logs
- `ncrs` - Non-conformance reports
- `itp_templates` - Inspection templates
- `inspection_forms` - ITP instances

### 2.5 Testing Strategy

Run and study existing tests:

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test diary.test.ts

# Run with coverage
pnpm test:coverage

# Run security tests
pnpm test tests/security/
```

Study test patterns:

- Unit tests: `features/*/utils/*.test.ts`
- Component tests: `components/*/*.test.tsx`
- API tests: `app/api/*/*.test.ts`
- Security tests: `tests/security/*.test.ts`

---

## Day 4-5: First Contribution

### 3.1 Choose a Starter Task

Good first issues:

- [ ] Add validation for new field
- [ ] Create new UI component
- [ ] Write missing test case
- [ ] Fix TypeScript warning
- [ ] Update documentation

Ask mentor for a "good first issue" label task.

### 3.2 Development Workflow

```bash
# 1. Create feature branch
git checkout -b feat/your-feature-name

# 2. Make changes
# ... edit files ...

# 3. Run quality checks locally
pnpm lint:fix
pnpm type-check
pnpm test
pnpm format

# 4. Commit (pre-commit hooks will run)
git add .
git commit -m "feat: Add new diary field for equipment count"

# 5. Push and create PR
git push -u origin feat/your-feature-name
gh pr create --title "feat: Add equipment count to diary" --body "Description..."
```

### 3.3 Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types**:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Test additions/changes
- `chore`: Build/tooling changes

**Examples**:

```
feat(diary): Add equipment count field
fix(ncr): Correct severity dropdown options
docs(api): Update diary endpoint documentation
test(security): Add CSRF protection tests
```

### 3.4 Code Review Process

Your PR will be reviewed for:

- [ ] Functionality works as expected
- [ ] Tests pass (unit + integration)
- [ ] Code follows style guide
- [ ] Security considerations addressed
- [ ] Performance impact minimal
- [ ] Documentation updated
- [ ] No console.log() left behind
- [ ] TypeScript strict mode compliance

**Tips for successful review**:

1. Keep PRs small (<300 lines)
2. Write descriptive PR description
3. Add screenshots for UI changes
4. Link related issues
5. Respond promptly to feedback

### 3.5 Your First PR Checklist

Before submitting:

- [ ] Code runs locally without errors
- [ ] All tests pass (`pnpm test`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Type checking passes (`pnpm type-check`)
- [ ] Added tests for new functionality
- [ ] Updated relevant documentation
- [ ] Self-reviewed code diff
- [ ] Tested in both online and offline mode (if applicable)
- [ ] Verified financial data filtering works (if applicable)

---

## Week 2+: Advanced Topics

### 4.1 Security Development

**Required Reading**:

- [SECURITY.md](../SECURITY.md)
- [SECURITY_REVIEW_2025-10-08.md](./SECURITY_REVIEW_2025-10-08.md)
- [CREDENTIAL_ROTATION.md](./CREDENTIAL_ROTATION.md)

**Security Checklist for Every Feature**:

- [ ] Input validation with Zod schemas
- [ ] CSRF token on state-changing operations
- [ ] Permission checks using RBAC
- [ ] Financial data filtering for viewer role
- [ ] Sanitized error messages (no internal details)
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (no dangerouslySetInnerHTML)

**Common Pitfalls**:

```typescript
// ❌ BAD: Setting to undefined doesn't remove property
const filtered = {
  ...data,
  hourly_rate: undefined, // Still accessible!
};

// ✅ GOOD: Destructuring removes property
const { hourly_rate, daily_rate, ...filtered } = data;
```

### 4.2 Performance Optimization

**Best Practices**:

1. **Code Splitting**: Use dynamic imports for heavy components

   ```typescript
   const HeavyComponent = dynamic(() => import('@/components/HeavyComponent'), {
     ssr: false,
     loading: () => <Skeleton />,
   });
   ```

2. **React Query**: Cache server state with proper stale times

   ```typescript
   useQuery({
     queryKey: ['diaries', projectId],
     queryFn: fetchDiaries,
     staleTime: 5 * 60 * 1000, // 5 minutes
   });
   ```

3. **Image Optimization**: Use Next.js Image component
   ```typescript
   <Image
     src={photo.url}
     width={800}
     height={600}
     quality={80}
     loading="lazy"
   />
   ```

### 4.3 Background Jobs (Trigger.dev)

Create background jobs for long-running tasks:

```typescript
// jobs/reports/generate-diary-pdf.ts
import { task } from '@trigger.dev/sdk/v3';

export const generateDiaryPDF = task({
  id: 'generate-diary-pdf',
  run: async (payload: { diaryId: string }) => {
    // 1. Fetch data
    const diary = await fetchDiary(payload.diaryId);

    // 2. Generate PDF
    const pdf = await generatePDF(diary);

    // 3. Upload to storage
    const url = await uploadToStorage(pdf);

    // 4. Notify user
    await notifyUser(diary.created_by, url);

    return { url };
  },
});
```

### 4.4 Offline-First Development

Test offline scenarios:

```typescript
// Toggle offline mode in Chrome DevTools
// Network tab → Throttling → Offline

// Your code should handle offline gracefully:
const { data, error } = await supabase.from('diaries').select('*').single();

if (error && error.message.includes('offline')) {
  // Fall back to IndexedDB
  const localData = await db.diaries.get(id);
  return localData;
}
```

### 4.5 Debugging Tips

**React Query DevTools**:

```typescript
// Already enabled in development
// Open bottom panel to inspect queries/mutations
```

**Supabase Logs**:

```bash
# View real-time logs
supabase functions logs

# View database logs
supabase db inspect
```

**VS Code Debugging**:

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node-terminal",
      "request": "launch",
      "command": "pnpm dev"
    }
  ]
}
```

---

## Resources

### Documentation

- [README.md](../README.md) - Project overview
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [API.md](./API.md) - API reference
- [TESTING.md](./TESTING.md) - Testing guide
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Contribution guidelines
- [SECURITY.md](../SECURITY.md) - Security policy

### External Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Zod Documentation](https://zod.dev/)
- [React Query Docs](https://tanstack.com/query/latest/docs/react/overview)

### Team Communication

- **Slack**: #siteproof-dev channel
- **Daily Standup**: 9:00 AM (your timezone)
- **Code Review**: Check GitHub notifications
- **Office Hours**: Thursday 2-4 PM with tech lead

### Getting Help

1. **Search Existing Issues**: https://github.com/your-org/siteproof-v2/issues
2. **Ask in Slack**: #siteproof-dev channel
3. **Schedule 1:1**: With your mentor or tech lead
4. **Documentation**: Check docs/ folder first

---

## Quick Reference

### Common Commands

```bash
# Development
pnpm dev                 # Start dev server
pnpm build               # Production build
pnpm start               # Start production server

# Code Quality
pnpm lint                # Run ESLint
pnpm lint:fix            # Fix ESLint errors
pnpm type-check          # TypeScript check
pnpm format              # Format with Prettier
pnpm format:check        # Check formatting

# Testing
pnpm test                # Run all tests
pnpm test:watch          # Watch mode
pnpm test:coverage       # With coverage
pnpm test:ui             # UI mode

# Database
supabase start           # Start local Supabase
supabase stop            # Stop local Supabase
supabase db reset        # Reset database
supabase db diff         # Check for schema changes
```

### File Naming Conventions

- Components: `PascalCase.tsx` (e.g., `DiaryCard.tsx`)
- Utilities: `kebab-case.ts` (e.g., `format-date.ts`)
- Tests: `*.test.ts` or `*.test.tsx`
- Types: `types.ts` or `*.types.ts`
- Hooks: `use-*.ts` (e.g., `use-diaries.ts`)

### Code Snippets

**API Route Template**:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { validateRequest, createDiarySchema } from '@/lib/validation/schemas';
import { handleAPIError, assertAuthenticated, assertPermission } from '@/lib/errors/api-errors';
import { diaryPermissions } from '@/lib/auth/permissions';

export async function POST(request: NextRequest) {
  try {
    const body = await validateRequest(request, createDiarySchema);
    const user = await assertAuthenticated();
    const member = await assertPermission(user, 'diary', 'create');

    // Your logic here

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return handleAPIError(error);
  }
}
```

---

## Welcome to the Team! 🎉

You're now ready to contribute to SiteProof v2. Remember:

- **Ask questions** - No question is too basic
- **Write tests** - They save time in the long run
- **Security first** - Always validate and sanitize
- **Document** - Future you (and teammates) will thank you
- **Have fun** - Building great software should be enjoyable!

Happy coding! 🚀
