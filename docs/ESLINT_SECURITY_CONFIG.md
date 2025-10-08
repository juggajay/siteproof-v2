# ESLint Security Plugin Configuration

## Installation Instructions

Due to the pnpm workspace configuration, install the security plugins manually:

```bash
# From project root
pnpm add -D eslint-plugin-security --filter @siteproof/web
```

If you encounter store location errors, run:

```bash
pnpm install
```

## Configuration

Add to `apps/web/.eslintrc.json`:

```json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended",
    "plugin:security/recommended"
  ],
  "plugins": ["@typescript-eslint", "security"],
  "rules": {
    // Security rules
    "security/detect-object-injection": "warn",
    "security/detect-non-literal-regexp": "warn",
    "security/detect-unsafe-regex": "error",
    "security/detect-buffer-noassert": "error",
    "security/detect-child-process": "warn",
    "security/detect-disable-mustache-escape": "error",
    "security/detect-eval-with-expression": "error",
    "security/detect-no-csrf-before-method-override": "error",
    "security/detect-non-literal-fs-filename": "warn",
    "security/detect-non-literal-require": "warn",
    "security/detect-possible-timing-attacks": "warn",
    "security/detect-pseudoRandomBytes": "error",

    // React security rules
    "react/no-danger": "error",
    "react/no-danger-with-children": "error",

    // TypeScript security rules
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-non-null-assertion": "warn",
    "@typescript-eslint/no-unsafe-assignment": "off",
    "@typescript-eslint/no-unsafe-member-access": "off",
    "@typescript-eslint/no-unsafe-call": "off",
    "@typescript-eslint/no-unsafe-return": "off"
  }
}
```

## Security Rules Explained

### Critical Rules (error)

#### `security/detect-unsafe-regex`

Detects potentially catastrophic exponential-time regular expressions.

**Bad:**

```javascript
const regex = /(a+)+$/; // Can cause ReDoS
```

**Good:**

```javascript
const regex = /^[a-z]+$/; // Linear time
```

#### `security/detect-buffer-noassert`

Detects calls to buffer methods that don't validate input.

**Bad:**

```javascript
buffer.writeUInt32BE(value, offset, true); // noAssert = true
```

**Good:**

```javascript
buffer.writeUInt32BE(value, offset); // validates by default
```

#### `security/detect-eval-with-expression`

Prevents use of eval() with expressions.

**Bad:**

```javascript
eval(userInput); // Code injection risk
```

**Good:**

```javascript
JSON.parse(userInput); // Safe alternative
```

#### `react/no-danger`

Prevents use of dangerouslySetInnerHTML.

**Bad:**

```tsx
<div dangerouslySetInnerHTML={{ __html: userContent }} /> // XSS risk
```

**Good:**

```tsx
<div>{userContent}</div> // Auto-escaped
```

### Warning Rules (warn)

#### `security/detect-object-injection`

Detects potential object injection attacks.

**Example:**

```javascript
// May warn on:
const value = obj[userInput];

// Prefer:
const allowedKeys = ['name', 'email'];
if (allowedKeys.includes(userInput)) {
  const value = obj[userInput];
}
```

#### `security/detect-non-literal-fs-filename`

Warns when file paths come from user input.

**Example:**

```javascript
// May warn on:
fs.readFile(userProvidedPath);

// Prefer:
const sanitized = path.join(SAFE_DIR, path.basename(userProvidedPath));
fs.readFile(sanitized);
```

#### `security/detect-possible-timing-attacks`

Detects string comparisons that may be vulnerable to timing attacks.

**Bad:**

```javascript
if (userToken === storedToken) {
  // Timing attack vulnerable
  // ...
}
```

**Good:**

```javascript
import { timingSafeEqual } from 'crypto';

const userBuf = Buffer.from(userToken);
const storedBuf = Buffer.from(storedToken);
if (userBuf.length === storedBuf.length && timingSafeEqual(userBuf, storedBuf)) {
  // ...
}
```

## Running Security Checks

```bash
# Check for security issues
cd apps/web
npm run lint

# Auto-fix where possible
npm run lint:fix

# CI/CD integration
npm run lint -- --max-warnings 0
```

## False Positives

If you encounter false positives, you can disable specific rules for specific lines:

```javascript
// eslint-disable-next-line security/detect-object-injection
const value = obj[dynamicKey];
```

**Important:** Always add a comment explaining why it's safe:

```javascript
// Safe: dynamicKey is validated against allowlist above
// eslint-disable-next-line security/detect-object-injection
const value = obj[dynamicKey];
```

## Pre-commit Integration

The security linter runs automatically on pre-commit via Husky (if configured):

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "eslint --max-warnings 0"]
  }
}
```

## CI/CD Integration

Add to `.github/workflows/security.yml`:

```yaml
- name: Run ESLint Security Check
  run: |
    cd apps/web
    npm run lint -- --max-warnings 0
```

## Additional Resources

- [eslint-plugin-security](https://github.com/eslint-community/eslint-plugin-security)
- [OWASP Secure Coding Practices](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
