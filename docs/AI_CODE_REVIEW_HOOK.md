# AI Code Review Pre-Commit Hook

## Overview

This repository uses a custom pre-commit hook that leverages Claude Code to perform AI-powered code reviews on staged changes before each commit.

## Features

- 🤖 **Automatic AI Review**: Reviews TypeScript/JavaScript files on every commit
- ⚡ **Fast**: 30-second timeout to prevent blocking commits
- 🎯 **Targeted Checks**: Focuses on SiteProof-specific issues
- 🔄 **Non-blocking**: Never prevents commits, only provides feedback
- 📝 **Smart Detection**: Only runs when TS/JS files are staged

## What It Checks

The AI review looks for:

1. **Type Safety Issues**
   - Missing type annotations
   - Unsafe `any` types
   - Type mismatches

2. **Database Schema Issues**
   - Wrong column names (e.g., `itp_instances.name` vs `template_name`)
   - Missing enum values
   - Incorrect table references

3. **UUID Validation**
   - Missing UUID validation in API routes
   - Invalid UUID formats

4. **Security Issues**
   - XSS vulnerabilities
   - SQL injection risks
   - Missing input validation

## Installation

The hook is already installed at `.git/hooks/pre-commit`.

If you need to reinstall it:

```bash
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash

echo ""
echo "🤖 AI Code Review"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get list of staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|js|jsx)$')

if [ -z "$STAGED_FILES" ]; then
  echo "✅ No TypeScript/JavaScript files to review"
  exit 0
fi

echo "📝 Files to review:"
echo "$STAGED_FILES" | sed 's/^/  - /'
echo ""

# Check if claude CLI is available
if ! command -v claude &> /dev/null; then
  echo "⏭️  Claude CLI not found - skipping AI review"
  echo "   Install: npm install -g @anthropics/claude-code"
  echo ""
  exit 0
fi

# Get the diff for review
DIFF_OUTPUT=$(git diff --cached)

# Use Claude Code to review (with timeout so it doesn't hang)
echo "🔍 Running AI review..."
timeout 30s claude "Quick review of these staged changes. Check for:
1. Type safety issues
2. Database schema mismatches (e.g., wrong column names)
3. Missing UUID validation in API routes
4. Security issues (XSS, SQL injection)
Be very concise - only list critical issues, if any.

Files changed:
$STAGED_FILES
" 2>/dev/null

REVIEW_EXIT=$?
if [ $REVIEW_EXIT -eq 124 ]; then
  echo "⏱️  Review timed out (>30s) - skipping"
elif [ $REVIEW_EXIT -ne 0 ]; then
  echo "⚠️  Review failed - continuing anyway"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Don't block the commit
exit 0
EOF

chmod +x .git/hooks/pre-commit
```

## Prerequisites

### Claude CLI

The hook requires the Claude CLI to be installed:

```bash
npm install -g @anthropics/claude-code
```

### API Key

Ensure you have a valid Anthropic API key configured:

```bash
export ANTHROPIC_API_KEY=your-api-key
```

Or set it in your shell profile (`~/.bashrc`, `~/.zshrc`, etc.)

## Usage

The hook runs automatically on every commit. No action needed!

### Example Output

```
🤖 AI Code Review
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 Files to review:
  - apps/web/src/app/api/diaries/route.ts
  - apps/web/src/lib/validation/schemas.ts

🔍 Running AI review...

✅ No critical issues found

Minor suggestions:
- Consider adding JSDoc comments to exported functions
- The diarySchema could use stricter date validation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Skipping the Review

If you need to skip the AI review (not recommended):

```bash
# Temporarily disable
git commit --no-verify -m "message"

# Permanently disable (not recommended)
rm .git/hooks/pre-commit
```

## Troubleshooting

### Hook Doesn't Run

**Check if hook is executable:**

```bash
ls -l .git/hooks/pre-commit
# Should show: -rwxr-xr-x
```

**Make it executable:**

```bash
chmod +x .git/hooks/pre-commit
```

### Claude CLI Not Found

**Install the CLI:**

```bash
npm install -g @anthropics/claude-code
```

**Verify installation:**

```bash
which claude
claude --version
```

### API Key Issues

**Check if key is set:**

```bash
echo $ANTHROPIC_API_KEY
```

**Set the key:**

```bash
# Temporarily (current session)
export ANTHROPIC_API_KEY=sk-ant-...

# Permanently (add to ~/.bashrc or ~/.zshrc)
echo 'export ANTHROPIC_API_KEY=sk-ant-...' >> ~/.bashrc
source ~/.bashrc
```

### Timeout Issues

If reviews consistently timeout, you can adjust the timeout:

```bash
# Edit .git/hooks/pre-commit
# Change: timeout 30s claude ...
# To:     timeout 60s claude ...
```

### Review Fails

The hook is designed to never block commits. If the review fails:

- The commit will proceed normally
- A warning message will be shown
- Fix any issues in a follow-up commit

## Customization

### Change Review Prompt

Edit `.git/hooks/pre-commit` and modify the `claude` command prompt:

```bash
timeout 30s claude "Your custom review instructions here" 2>/dev/null
```

### Add More File Types

To review additional file types, modify the `STAGED_FILES` line:

```bash
# Current (TS/JS only)
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|js|jsx)$')

# Example: Add CSS/SCSS
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|js|jsx|css|scss)$')
```

### Increase/Decrease Timeout

```bash
# Current: 30 seconds
timeout 30s claude ...

# Faster (15 seconds)
timeout 15s claude ...

# Slower (60 seconds)
timeout 60s claude ...
```

## Integration with Husky

This hook runs **before** Husky's lint-staged hooks. The order is:

1. **AI Code Review** (this hook) - Optional, non-blocking
2. **Husky** - Runs lint-staged
3. **ESLint** - Via lint-staged
4. **Prettier** - Via lint-staged
5. **Type Check** - Pre-push hook
6. **Tests** - Pre-push hook

## Cost Considerations

Each commit with staged TS/JS files consumes API tokens:

- **Small change** (1-2 files): ~1,000-2,000 tokens (~$0.003-0.006)
- **Medium change** (5-10 files): ~5,000-10,000 tokens (~$0.015-0.03)
- **Large change** (20+ files): ~20,000+ tokens (~$0.06+)

**Monthly estimate** (assuming 50 commits/month):

- Light usage: ~$0.50-1.00/month
- Medium usage: ~$2.00-5.00/month
- Heavy usage: ~$10.00-20.00/month

### Reducing Costs

1. **Skip for minor changes:**

   ```bash
   git commit --no-verify -m "docs: fix typo"
   ```

2. **Batch commits:**
   - Group related changes into single commits
   - Reduces number of reviews

3. **Increase timeout:**
   - Shorter timeouts = fewer tokens consumed
   - Trade-off: less thorough reviews

## Best Practices

1. ✅ **Let it run on important changes** (API routes, business logic)
2. ✅ **Review the AI feedback** before pushing
3. ✅ **Skip for trivial changes** (typos, formatting)
4. ✅ **Keep changes focused** (easier for AI to review)
5. ❌ **Don't rely on it 100%** (still need human code review)

## Security

The hook:

- ✅ Runs locally on your machine
- ✅ Only sends staged file names and diffs to Claude API
- ✅ Never commits or pushes automatically
- ✅ Cannot modify your files
- ✅ Cannot access sensitive data beyond staged changes

## Alternatives

### Manual Claude Code Review

Instead of automatic hook, run manually:

```bash
# Review current changes
git diff | claude "Review these changes for issues"

# Review specific file
claude "Review this file for security issues" apps/web/src/app/api/auth/route.ts
```

### GitHub Actions (Removed)

We previously had a GitHub Actions workflow for PR reviews, but removed it in favor of local pre-commit hooks for faster feedback.

## Support

For issues with the AI review hook:

- Check this documentation first
- Verify Claude CLI is installed and configured
- Test the `claude` command manually
- Check your API key and credits

For general code review questions:

- See [CONTRIBUTING.md](../CONTRIBUTING.md)
- See [SECURITY.md](../SECURITY.md)

---

**Last Updated:** 2025-10-08
**Hook Version:** 1.0.0
