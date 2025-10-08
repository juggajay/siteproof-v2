# GitHub Actions Workflows

## pr-review.yml - Automated PR Review

Production-ready workflow that performs automated code review on pull requests to the main branch.

### Features

- ✅ **Multi-agent review framework** for code-reviewer, security-auditor, and typescript-pro
- ✅ **SiteProof-specific checks** for database schemas, types, security, and performance
- ✅ **Static analysis** with TypeScript and ESLint
- ✅ **Database validation** for migrations and RLS policies
- ✅ **Automated PR comments** with review summaries
- ✅ **Artifact uploads** for detailed analysis
- ✅ **Concurrent execution** with smart caching

### Quick Setup

1. **Add API Key Secret**:
   - Go to: Settings → Secrets and variables → Actions
   - Create: `ANTHROPIC_API_KEY` with your API key from https://console.anthropic.com/

2. **Enable Workflow Permissions**:
   - Go to: Settings → Actions → General
   - Under "Workflow permissions":
     - ✅ Read and write permissions
     - ✅ Allow GitHub Actions to create and approve pull requests

3. **Test It**:
   ```bash
   git checkout -b test-pr-review
   echo "// Test" >> apps/web/src/app/page.tsx
   git add . && git commit -m "test: PR review workflow"
   git push origin test-pr-review
   # Create PR on GitHub
   ```

### What Gets Checked

#### Database Schema Issues ❌

- Column existence (e.g., `itp_instances.name` vs `template_name`)
- Enum type values (e.g., `report_type` includes 'daily_diary_entry')
- RLS policy recursion issues
- Migration file ordering

#### Type Safety ❌

- UUID validation in API routes
- TypeScript strict mode compliance
- Unsafe `any` type usage
- Supabase query typing

#### Security ❌

- RLS policies on all tables
- Authentication in API routes
- Input validation
- SQL injection prevention

#### Performance ❌

- N+1 query patterns
- Missing database indexes
- Inefficient queries

### Workflow Outputs

1. **PR Comment**: Summary posted directly on the PR
2. **Artifacts**: Detailed analysis files (retained 30 days)
   - `pr-diff.txt` - Full PR diff
   - `typecheck.log` - TypeScript errors
   - `eslint.json` - Linting results
   - `review-config.json` - SiteProof review rules

### Advanced Configuration

#### Change Agents

Edit the workflow file to modify which agents review:

```yaml
'agents': ['code-reviewer', 'security-auditor', 'typescript-pro']
```

Available agents: code-analyzer, tester, backend-dev, mobile-dev, system-architect

#### Adjust Triggers

```yaml
on:
  pull_request:
    types: [opened, synchronize, reopened]
    branches:
      - main
      - develop # Add more branches
```

#### Skip Draft PRs

Already configured - draft PRs are skipped:

```yaml
if: github.event.pull_request.draft == false
```

### Troubleshooting

**"ANTHROPIC_API_KEY secret is not set"**

- Verify secret exists: Settings → Secrets and variables → Actions
- Name must match exactly (case-sensitive)

**No PR comment posted**

- Check Actions tab for workflow run logs
- Verify permissions: Settings → Actions → General → Workflow permissions

**Workflow timeout**

- Default: 30 minutes
- Adjust: `timeout-minutes: 45` in workflow file

### Cost Estimation

This workflow uses static analysis only (no AI API calls by default).

For full AI-powered reviews:

- Set up claude-flow MCP server locally
- Run `claude` manually on PRs
- Typical cost: ~$0.10-0.50 per PR review

### Security

- ✅ API keys stored as encrypted secrets
- ✅ Read-only code access
- ✅ Limited write permissions (comments only)
- ✅ No code execution from untrusted sources

### Support

- Workflow issues: Create issue in this repository
- Claude Code: https://github.com/anthropics/claude-code
- Claude Flow: https://github.com/ruvnet/claude-flow
