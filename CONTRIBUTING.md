# 🤝 Contributing to SiteProof v2

Thank you for your interest in contributing to SiteProof v2! This document provides guidelines and best practices for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Security](#security)
- [Questions](#questions)

---

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inspiring community for all. Please be respectful and professional in all interactions.

### Our Standards

**Positive behavior includes:**

- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards others

**Unacceptable behavior includes:**

- Harassment, trolling, or discriminatory comments
- Publishing others' private information
- Other conduct which could reasonably be considered inappropriate

---

## Getting Started

### Prerequisites

Before you begin, ensure you have:

- Read the [README.md](./README.md)
- Reviewed the [ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- Completed the [ONBOARDING.md](./docs/ONBOARDING.md) guide
- Set up your development environment

### First Contribution

Look for issues labeled with:

- `good first issue` - Perfect for newcomers
- `help wanted` - Additional help needed
- `bug` - Bug fixes
- `documentation` - Documentation improvements

---

## Development Workflow

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then:
git clone https://github.com/YOUR-USERNAME/siteproof-v2.git
cd siteproof-v2

# Add upstream remote
git remote add upstream https://github.com/original-owner/siteproof-v2.git
```

### 2. Create a Branch

```bash
# Update main branch
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feat/your-feature-name

# Or for bug fixes
git checkout -b fix/bug-description
```

### Branch Naming Convention

- `feat/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `docs/topic` - Documentation updates
- `refactor/component-name` - Code refactoring
- `test/feature-name` - Test additions
- `chore/task-description` - Maintenance tasks

### 3. Make Changes

```bash
# Make your changes
# ... edit files ...

# Run quality checks
pnpm lint:fix
pnpm type-check
pnpm test
pnpm format

# Commit changes
git add .
git commit -m "feat: Add new diary field for equipment count"
```

### 4. Keep Your Branch Updated

```bash
# Fetch upstream changes
git fetch upstream

# Rebase your branch
git rebase upstream/main

# Or merge if preferred
git merge upstream/main
```

### 5. Push and Create PR

```bash
# Push to your fork
git push origin feat/your-feature-name

# Create pull request on GitHub
gh pr create --title "feat: Add equipment count field" \
  --body "Description of changes..."
```

---

## Coding Standards

### TypeScript

**Use strict mode**:

```typescript
// ✅ GOOD
function processData(data: DiaryData): ProcessedResult {
  // Type-safe code
}

// ❌ BAD
function processData(data: any): any {
  // Avoid any type
}
```

**Prefer interfaces over types** for object shapes:

```typescript
// ✅ GOOD
interface DiaryFormData {
  diary_date: string;
  project_id: string;
  work_summary: string;
}

// ⚠️ OK for unions/utility types
type DiaryStatus = 'draft' | 'submitted' | 'approved';
```

### React Components

**Use functional components with hooks**:

```typescript
// ✅ GOOD
export function DiaryCard({ diary }: { diary: Diary }) {
  const [isExpanded, setIsExpanded] = useState(false);
  // ...
}

// ❌ BAD (Class components)
export class DiaryCard extends React.Component {
  // Don't use class components for new code
}
```

**Extract custom hooks**:

```typescript
// ✅ GOOD
function useDiaries(projectId: string) {
  return useQuery({
    queryKey: ['diaries', projectId],
    queryFn: () => fetchDiaries(projectId),
  });
}

function DiaryList({ projectId }: Props) {
  const { data: diaries } = useDiaries(projectId);
  // ...
}
```

### File Organization

**Keep files focused and under 500 lines**:

```typescript
// ❌ BAD: 1000+ line file with everything
// diary-utils.ts
export function createDiary() { ... }
export function updateDiary() { ... }
export function deleteDiary() { ... }
export function validateDiary() { ... }
// ... 50 more functions

// ✅ GOOD: Organized into focused modules
// diary/
//   - create.ts
//   - update.ts
//   - delete.ts
//   - validation.ts
```

### Naming Conventions

| Type       | Convention       | Example                            |
| ---------- | ---------------- | ---------------------------------- |
| Components | PascalCase       | `DiaryCard`, `NCRList`             |
| Functions  | camelCase        | `fetchDiaries`, `validateInput`    |
| Hooks      | use + PascalCase | `useDiaries`, `useAuth`            |
| Constants  | UPPER_SNAKE_CASE | `MAX_FILE_SIZE`                    |
| Files      | kebab-case       | `diary-card.tsx`, `use-diaries.ts` |
| Interfaces | PascalCase       | `DiaryData`, `UserPermissions`     |

### Security-First Coding

**Always validate inputs**:

```typescript
// ✅ GOOD
export async function POST(request: NextRequest) {
  const body = await validateRequest(request, createDiarySchema);
  // Validated data is type-safe
}

// ❌ BAD
export async function POST(request: NextRequest) {
  const body = await request.json(); // No validation!
}
```

**Filter financial data**:

```typescript
// ✅ GOOD
const filtered = filterFinancialData(diary, member.role);
return NextResponse.json(filtered);

// ❌ BAD
return NextResponse.json(diary); // Exposes all financial data!
```

**Use CSRF tokens**:

```typescript
// ✅ GOOD
fetch('/api/diaries', {
  method: 'POST',
  headers: { 'X-CSRF-Token': csrfToken },
  // ...
});

// ❌ BAD
fetch('/api/diaries', {
  method: 'POST', // No CSRF token!
});
```

---

## Commit Guidelines

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, missing semicolons, etc.)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding missing tests
- `chore`: Changes to build process or auxiliary tools

### Scopes

- `diary`: Daily diary module
- `ncr`: NCR module
- `itp`: ITP module
- `auth`: Authentication/authorization
- `api`: API routes
- `ui`: UI components
- `db`: Database

### Examples

```
feat(diary): Add equipment count field to diary form

- Added equipment_count field to daily_diaries table
- Updated DiaryForm component with new field
- Added validation for equipment count (min: 0)

Closes #123
```

```
fix(auth): Correct financial data filtering for viewer role

Previous implementation set fields to undefined instead of removing
them, which allowed access via Object.keys(). Now using destructuring
to completely remove financial fields.

Fixes #456
```

```
docs(api): Update diary endpoint documentation

Added examples for:
- Financial data filtering
- CSRF token usage
- Rate limiting headers
```

### Commit Best Practices

1. **Keep commits atomic** - One logical change per commit
2. **Write descriptive messages** - Future you will thank you
3. **Reference issues** - Use `Closes #123` or `Fixes #456`
4. **Sign commits** - Use `git commit -s` for DCO sign-off

---

## Pull Request Process

### Before Submitting

Ensure your PR:

- [ ] Passes all tests (`pnpm test`)
- [ ] Passes linting (`pnpm lint`)
- [ ] Passes type checking (`pnpm type-check`)
- [ ] Has no console.log() statements
- [ ] Includes tests for new functionality
- [ ] Updates relevant documentation
- [ ] Has been tested manually
- [ ] Follows security best practices

### PR Template

Use this template for your PR description:

```markdown
## Description

Brief description of the changes.

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## How Has This Been Tested?

Describe the tests you ran.

- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing
- [ ] E2E tests

## Screenshots (if applicable)

Add screenshots to help explain your changes.

## Checklist

- [ ] My code follows the style guidelines
- [ ] I have performed a self-review
- [ ] I have commented my code where needed
- [ ] I have updated the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective
- [ ] New and existing unit tests pass locally

## Related Issues

Closes #123
Related to #456
```

### Review Process

1. **Automated Checks**: CI/CD runs tests, linting, security scans
2. **Code Review**: At least one approval required
3. **Address Feedback**: Make requested changes
4. **Final Approval**: Maintainer approves and merges

### Responding to Feedback

```bash
# Make requested changes
git add .
git commit -m "refactor: Address PR feedback"
git push origin feat/your-feature-name

# If significant changes, add comment explaining
# If minor, just push and comment "Done ✅"
```

### After Merge

```bash
# Update your local main
git checkout main
git pull upstream main

# Delete feature branch
git branch -d feat/your-feature-name
git push origin --delete feat/your-feature-name
```

---

## Security

### Reporting Security Issues

**DO NOT** open a public issue for security vulnerabilities.

Instead:

1. Email security@siteproof.com with details
2. Include steps to reproduce
3. Provide any proof of concept
4. Allow 48 hours for initial response

See [SECURITY.md](./SECURITY.md) for details.

### Security Checklist

When contributing code, ensure:

- [ ] No hardcoded secrets or API keys
- [ ] All inputs validated with Zod schemas
- [ ] CSRF protection on state-changing operations
- [ ] Financial data filtered by role
- [ ] SQL injection prevented (parameterized queries)
- [ ] XSS prevention (no dangerouslySetInnerHTML)
- [ ] Error messages don't leak internal details
- [ ] Authentication checked on protected routes
- [ ] Authorization enforced with RBAC

---

## Testing

### Test Requirements

All contributions must include tests:

- **New features**: Unit tests + integration tests
- **Bug fixes**: Test that reproduces the bug + fix
- **Refactoring**: Existing tests still pass
- **Documentation**: No tests required

### Writing Tests

```typescript
// Good test structure
describe('Feature Name', () => {
  it('should handle expected case', () => {
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

  it('should throw on invalid input', () => {
    expect(() => doSomething(null)).toThrow();
  });
});
```

See [TESTING.md](./docs/TESTING.md) for detailed testing guidelines.

---

## Documentation

### Documentation Standards

When adding features:

- Update README.md if it changes setup/usage
- Update API.md for new/changed endpoints
- Add inline code comments for complex logic
- Update ARCHITECTURE.md for structural changes

### Code Comments

```typescript
// ✅ GOOD: Explains WHY, not WHAT
// Use destructuring to completely remove properties from response object.
// Setting to undefined is insufficient as properties remain accessible.
const { hourly_rate, daily_rate, ...filtered } = data;

// ❌ BAD: States the obvious
// Remove hourly_rate and daily_rate
const { hourly_rate, daily_rate, ...filtered } = data;
```

---

## Code Review Guidelines

### As a Reviewer

- **Be respectful**: Critique code, not people
- **Be specific**: Point to exact lines, provide examples
- **Be constructive**: Suggest alternatives
- **Be timely**: Respond within 48 hours
- **Approve or request changes**: Don't leave PRs hanging

### As a Contributor

- **Don't take it personally**: Reviews improve code quality
- **Ask questions**: If feedback is unclear, ask
- **Explain your reasoning**: Help reviewers understand your approach
- **Be open to change**: There may be better solutions
- **Thank reviewers**: Appreciate the time they spent

---

## Community

### Getting Help

- **Documentation**: Check docs/ folder first
- **Issues**: Search existing issues before creating new ones
- **Discussions**: Use GitHub Discussions for questions
- **Slack**: #siteproof-dev channel (for team members)

### Recognition

Contributors are recognized in:

- CONTRIBUTORS.md file
- Release notes
- Annual contributor acknowledgments

---

## License

By contributing to SiteProof v2, you agree that your contributions will be licensed under the project's proprietary license.

---

## Questions?

If you have questions about contributing:

- Open a GitHub Discussion
- Email dev@siteproof.com
- Ask in #siteproof-dev Slack channel

**Thank you for contributing to SiteProof v2!** 🎉
