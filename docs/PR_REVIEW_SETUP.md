# Automated PR Review Setup Guide

## Overview

This guide explains how to set up automatic PR reviews using GitHub Actions and Claude Flow agents for the SiteProof repository.

## Prerequisites

- GitHub repository with admin access
- Anthropic API key with Claude Code access

## Step-by-Step Setup

### 1. Configure GitHub Repository Settings

#### A. Enable GitHub Actions

1. Go to your repository: `https://github.com/YOUR_USERNAME/siteproof-v2`
2. Click **Settings** → **Actions** → **General**
3. Under "Actions permissions", select **Allow all actions and reusable workflows**
4. Under "Workflow permissions", select:
   - ✅ **Read and write permissions**
   - ✅ **Allow GitHub Actions to create and approve pull requests**
5. Click **Save**

#### B. Add Required Secrets

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add the following secret:
   - **Name**: `ANTHROPIC_API_KEY`
   - **Value**: Your Anthropic API key (get from https://console.anthropic.com/)
4. Click **Add secret**

> **Note**: `GITHUB_TOKEN` is automatically provided by GitHub Actions

### 2. Required Permissions

The workflow needs these permissions (already configured in `.github/workflows/pr-review.yml`):

- ✅ **contents: read** - Read repository code
- ✅ **pull-requests: write** - Comment on PRs
- ✅ **issues: write** - Post review results

### 3. Review Agents Configuration

The workflow uses three specialized agents:

| Agent                | Purpose                  | Focus Areas                               |
| -------------------- | ------------------------ | ----------------------------------------- |
| **code-reviewer**    | General code quality     | Best practices, patterns, maintainability |
| **security-auditor** | Security vulnerabilities | SQL injection, XSS, auth issues, secrets  |
| **typescript-pro**   | TypeScript excellence    | Type safety, interfaces, strict mode      |

### 4. How It Works

1. **Trigger**: PR opened, updated, or reopened against `main` branch
2. **Swarm Init**: Creates mesh topology for parallel reviews
3. **Agent Spawn**: Spawns 3 specialized reviewers simultaneously
4. **Review Process**: Each agent analyzes the PR diff in parallel
5. **Results**: Consolidated review posted as PR comment

### 5. Workflow File Location

```
.github/workflows/pr-review.yml
```

### 6. Testing the Setup

#### Create a Test PR:

```bash
# Create a test branch
git checkout -b test-pr-review

# Make a simple change
echo "// Test change" >> apps/web/src/app/page.tsx

# Commit and push
git add .
git commit -m "test: Trigger automated PR review"
git push origin test-pr-review
```

#### Create PR on GitHub:

1. Go to your repository on GitHub
2. Click **Pull requests** → **New pull request**
3. Select `test-pr-review` → `main`
4. Click **Create pull request**
5. Watch the **Actions** tab for the workflow run

### 7. Expected Output

After the workflow completes, you'll see a comment on your PR:

```
🤖 Automated Code Review

✅ Code Quality: No major issues found
⚠️  Security: 2 recommendations
✅ TypeScript: Type safety verified

[Detailed review results...]

---
Reviewed by: code-reviewer, security-auditor, typescript-pro
```

### 8. Customization Options

#### Modify Agent Selection

Edit `.github/workflows/pr-review.yml`:

```yaml
--agents "code-reviewer,security-auditor,typescript-pro"
```

Available agents:

- `code-analyzer` - Advanced code analysis
- `tester` - Test coverage review
- `backend-dev` - Backend-specific review
- `mobile-dev` - Mobile optimization review
- `system-architect` - Architecture review

#### Change Trigger Branches

```yaml
on:
  pull_request:
    branches:
      - main
      - develop # Add more branches
```

#### Adjust Swarm Topology

```yaml
npx claude-flow@alpha swarm init --topology hierarchical --max-agents 5
```

Topologies:

- `mesh` - Parallel, independent reviews (fastest)
- `hierarchical` - Coordinated, sequential reviews (most thorough)
- `adaptive` - Dynamic based on PR complexity

### 9. Troubleshooting

#### Workflow fails with "API key not found"

- Verify `ANTHROPIC_API_KEY` is set in repository secrets
- Check the secret name matches exactly (case-sensitive)

#### No comment posted on PR

- Check **Actions** tab for error logs
- Verify workflow permissions are set to "Read and write"
- Ensure "Allow GitHub Actions to create and approve pull requests" is enabled

#### Review takes too long

- Reduce number of agents
- Use `mesh` topology for parallel execution
- Limit PR diff size with branch protections

### 10. Branch Protection Rules (Optional)

To require reviews before merging:

1. Go to **Settings** → **Branches**
2. Click **Add branch protection rule**
3. Branch name pattern: `main`
4. Enable:
   - ✅ **Require status checks to pass before merging**
   - ✅ Select: `automated-review`
   - ✅ **Require branches to be up to date before merging**
5. Click **Create**

## Security Considerations

- ✅ API keys stored as encrypted secrets
- ✅ Workflow only triggers on PRs (not on untrusted code execution)
- ✅ Read-only access to code
- ✅ Limited write access (only comments)

## Cost Management

Each PR review consumes Anthropic API tokens:

- Typical PR: ~10,000-50,000 tokens
- Large PR: ~100,000+ tokens

Monitor usage at: https://console.anthropic.com/

## Support

- Claude Flow docs: https://github.com/ruvnet/claude-flow
- GitHub Actions docs: https://docs.github.com/actions
- Issues: Create an issue in your repository
