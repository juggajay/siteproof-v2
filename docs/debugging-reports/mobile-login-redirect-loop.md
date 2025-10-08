# Mobile Login Redirect Loop - Root Cause Analysis

**Date**: 2025-10-09
**Severity**: CRITICAL
**Environment**: Mobile browsers (iOS Safari, Chrome Mobile)
**Status**: IDENTIFIED

## Problem Description

Users attempting to login on mobile devices experience a redirect loop - they are sent back to the login page instead of being authenticated successfully.

## Root Cause

The issue is in the **middleware cookie synchronization** with Supabase auth cookies. There are multiple contributing factors:

### 1. Cookie Handler Race Condition

**File**: `/apps/web/src/middleware.ts` (lines 158-198)

The middleware creates its own Supabase client with custom cookie handlers that:

- Create a NEW response object on every cookie set/remove operation (lines 169-178, 187-195)
- This replaces the response, potentially discarding cookies set by previous handlers
- The response is recreated multiple times during auth check

```typescript
set(name: string, value: string, options: CookieOptions) {
  request.cookies.set({ name, value, ...options });
  response = NextResponse.next({  // ← CREATES NEW RESPONSE, LOSES PREVIOUS COOKIES
    request: { headers: request.headers },
  });
  response.cookies.set({ name, value, ...options });
}
```

### 2. Security Headers Applied Before Cookie Sync

**File**: `/apps/web/src/middleware.ts` (lines 135-148)

Security headers are applied to the response BEFORE Supabase auth operations:

- Headers are set on the initial response object (lines 136-138)
- Then Supabase auth operations may create a NEW response
- The new response may not have the security headers OR may lose cookies

### 3. Mobile-Specific Cookie Issues

Mobile browsers are more strict about:

- **SameSite attribute**: The cookies need explicit `SameSite=Lax` or `SameSite=None; Secure`
- **Timing**: Mobile browsers may delay cookie writes until after redirects complete
- **Cross-origin**: Mobile browsers enforce stricter CORS and cookie policies

### 4. Login Flow Timing Issue

**File**: `/apps/web/src/features/auth/components/LoginForm.tsx` (line 61)

The login form uses `window.location.href = redirectTo` which:

- Forces a full page reload
- Expects cookies to be set synchronously
- On mobile, the middleware may run BEFORE the cookies are fully written

## Evidence

1. The middleware compiles `/dashboard` when accessing `/auth/login` (from server logs)
2. curl returns 200 for `/auth/login`, indicating redirect logic is working
3. The cookie handlers in middleware recreate the response object multiple times
4. No explicit SameSite or Secure attributes are set in the Supabase cookie handlers

## Impact

- **Users affected**: All mobile users attempting to login
- **Desktop users**: Likely unaffected due to faster cookie sync
- **Severity**: Complete login failure on mobile devices

## Proposed Solutions

### Solution 1: Fix Middleware Cookie Handlers (RECOMMENDED)

Prevent response object recreation in cookie handlers:

```typescript
const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
  cookies: {
    get(name: string) {
      return request.cookies.get(name)?.value;
    },
    set(name: string, value: string, options: CookieOptions) {
      // Don't recreate response - just update cookies
      request.cookies.set({ name, value, ...options });
      response.cookies.set({ name, value, ...options });
    },
    remove(name: string, options: CookieOptions) {
      // Don't recreate response - just update cookies
      request.cookies.set({ name, value: '', ...options });
      response.cookies.set({ name, value: '', ...options });
    },
  },
});
```

### Solution 2: Add Explicit Cookie Attributes

Ensure cookies have proper SameSite and Secure attributes for mobile:

```typescript
set(name: string, value: string, options: CookieOptions) {
  const cookieOptions = {
    ...options,
    sameSite: options.sameSite || 'lax',
    secure: process.env.NODE_ENV === 'production',
  };
  request.cookies.set({ name, value, ...cookieOptions });
  response.cookies.set({ name, value, ...cookieOptions });
}
```

### Solution 3: Apply Security Headers After Auth Check

Move security header application to after auth operations to ensure cookies are preserved:

```typescript
// Get user first
const {
  data: { user },
} = await supabase.auth.getUser();

// Then apply security headers to the final response
Object.entries(securityHeaders).forEach(([headerKey, value]) => {
  response.headers.set(headerKey, value);
});
```

### Solution 4: Add Server-Side Cookie Setting in Login Route

Ensure cookies are set on the server side in the login route:

```typescript
// In /api/auth/login/route.ts
const response = NextResponse.json({...}, { status: 200 });

// Explicitly set auth cookies in response
response.cookies.set('sb-access-token', data.session.access_token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 7, // 7 days
});

return response;
```

## Testing Plan

1. Test login flow on Chrome DevTools mobile emulation (iPhone 12 Pro, 375x812)
2. Test on actual iOS Safari device
3. Test on Chrome Mobile (Android)
4. Verify cookies are set correctly in browser DevTools
5. Check for any console errors during login
6. Verify redirect works on first attempt (no loop)
7. Test remember me functionality
8. Test logout and re-login flow

## Next Steps

1. Implement Solution 1 (fix middleware cookie handlers)
2. Implement Solution 2 (add explicit cookie attributes)
3. Test on mobile emulation
4. Deploy to staging
5. Test on real devices
6. Monitor for any errors

## Related Files

- `/apps/web/src/middleware.ts` - Main middleware with auth check
- `/apps/web/src/lib/supabase/server.ts` - Server-side Supabase client
- `/apps/web/src/app/api/auth/login/route.ts` - Login API route
- `/apps/web/src/features/auth/components/LoginForm.tsx` - Login form component

## References

- [Supabase SSR Documentation](https://supabase.com/docs/guides/auth/server-side-rendering)
- [Next.js Middleware Cookies](https://nextjs.org/docs/app/building-your-application/routing/middleware#using-cookies)
- [SameSite Cookie Attribute](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite)
