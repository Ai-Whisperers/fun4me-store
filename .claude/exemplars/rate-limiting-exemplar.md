# Rate Limiting Exemplar

This exemplar shows how to apply rate limiting to different types of endpoints in the Vete platform.

## Import Statement

```typescript
import { rateLimit } from '@/lib/rate-limit';
```

## Pattern 1: Basic API Route (Unauthenticated)

Use IP-based rate limiting for public endpoints.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  // Apply rate limiting based on IP address
  const rateLimitResult = await rateLimit(request, 'search');

  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  // Your endpoint logic here
  const data = await fetchSomeData();

  return NextResponse.json(data);
}
```

## Pattern 2: Authenticated API Route (with withAuth)

Use user ID-based rate limiting for better accuracy.

```typescript
import { withAuth, type AuthContext } from '@/lib/api/with-auth';
import { rateLimit } from '@/lib/rate-limit';

export const POST = withAuth(async (ctx: AuthContext) => {
  // Apply rate limiting with user ID
  const rateLimitResult = await rateLimit(ctx.request, 'write', ctx.user.id);

  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  // Your authenticated endpoint logic
  const { supabase, profile } = ctx;

  // ... create or update data

  return apiSuccess(data, 'Operación exitosa');
});
```

## Pattern 3: Server Action

Server actions require creating a mock request from headers.

```typescript
"use server";

import { headers } from 'next/headers';
import { rateLimit } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';

/**
 * Helper to create a mock NextRequest from headers for rate limiting
 */
async function createMockRequest(): Promise<NextRequest> {
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';

  const url = `http://localhost${headersList.get('x-pathname') || '/'}`;
  return new NextRequest(url, {
    headers: new Headers({
      'x-forwarded-for': ip,
    }),
  });
}

interface ActionState {
  error?: string;
  success?: boolean;
}

export async function createRecord(
  prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  // Apply rate limiting
  const request = await createMockRequest();
  const rateLimitResult = await rateLimit(request, 'write');

  if (!rateLimitResult.success) {
    const errorData = await rateLimitResult.response.json();
    return { error: errorData.error };
  }

  // Your action logic here
  const name = formData.get('name') as string;

  // ... validation and database operations

  return { success: true };
}
```

## Pattern 4: Using Higher-Order Wrapper

For simpler syntax, use the `withRateLimit` wrapper.

```typescript
import { withRateLimit } from '@/lib/rate-limit';
import { NextRequest, NextResponse } from 'next/server';

export const POST = withRateLimit(
  async (request: NextRequest) => {
    // Request is already rate-limited
    const body = await request.json();

    // Your handler logic
    return NextResponse.json({ success: true });
  },
  'write' // Rate limit type
);
```

## Pattern 5: Custom Rate Limit

For specialized endpoints, create custom limits.

First, edit `web/lib/rate-limit.ts`:

```typescript
export const RATE_LIMITS = {
  // ... existing limits

  // Custom limit for file uploads
  upload: {
    windowMs: 60 * 1000,     // 1 minute
    maxRequests: 3,           // Only 3 uploads per minute
    message: 'Demasiadas subidas de archivos. Intente de nuevo en',
  },
} as const;
```

Then use it:

```typescript
export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, 'upload');

  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  // Handle file upload
  // ...
}
```

## Pattern 6: Combining with Authentication Middleware

Rate limit after auth check for better identification.

```typescript
import { withAuth, type AuthContext } from '@/lib/api/with-auth';
import { rateLimit } from '@/lib/rate-limit';

export const POST = withAuth(
  async (ctx: AuthContext) => {
    // User is authenticated at this point

    // Apply user-specific rate limiting
    const rateLimitResult = await rateLimit(
      ctx.request,
      'write',
      ctx.user.id // Use user ID for accurate tracking
    );

    if (!rateLimitResult.success) {
      return rateLimitResult.response;
    }

    // Your authenticated logic
    const { supabase, profile } = ctx;

    return apiSuccess(data);
  }
);
```

## Rate Limit Tiers Reference

Choose the appropriate tier for your endpoint:

| Tier | Limit | Use For |
|------|-------|---------|
| `auth` | 5/min | Login, signup, password reset |
| `search` | 30/min | Search, autocomplete, filters |
| `write` | 20/min | Create, update, delete operations |
| `default` | 60/min | General read operations |

## Best Practices

### 1. Always Rate Limit Authentication
```typescript
// ✅ GOOD - Prevents brute force attacks
export async function login(formData: FormData) {
  const request = await createMockRequest();
  const rateLimitResult = await rateLimit(request, 'auth');
  // ...
}
```

### 2. Use User ID When Available
```typescript
// ❌ BAD - Less accurate, shared IPs
await rateLimit(request, 'write');

// ✅ GOOD - Per-user tracking
await rateLimit(request, 'write', userId);
```

### 3. Apply Stricter Limits to Sensitive Operations
```typescript
// ❌ BAD - Password reset with lenient limit
await rateLimit(request, 'default'); // 60/min

// ✅ GOOD - Strict limit for security
await rateLimit(request, 'auth'); // 5/min
```

### 4. Check Rate Limit Early
```typescript
// ✅ GOOD - Check before expensive operations
export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, 'write');
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  // Now do expensive database operations
  // ...
}
```

### 5. Provide Clear Error Messages
The rate limiter automatically provides Spanish error messages:
```json
{
  "error": "Demasiadas solicitudes. Intente de nuevo en 42 segundos.",
  "code": "RATE_LIMITED"
}
```

## Testing Rate Limits

```typescript
import { rateLimit, clearRateLimits, RATE_LIMITS } from '@/lib/rate-limit';
import { describe, it, expect, beforeEach } from 'vitest';

describe('My Endpoint Rate Limiting', () => {
  beforeEach(() => {
    clearRateLimits(); // Reset between tests
  });

  it('should rate limit after max requests', async () => {
    const request = createMockRequest();

    // Use up the limit
    for (let i = 0; i < RATE_LIMITS.write.maxRequests; i++) {
      const result = await rateLimit(request, 'write');
      expect(result.success).toBe(true);
    }

    // Next request should be blocked
    const blocked = await rateLimit(request, 'write');
    expect(blocked.success).toBe(false);
  });
});
```

## Common Mistakes to Avoid

### ❌ Forgetting to Check Result
```typescript
await rateLimit(request, 'write'); // Result ignored!
// Continues to process request even if rate limited
```

### ✅ Always Check Result
```typescript
const rateLimitResult = await rateLimit(request, 'write');
if (!rateLimitResult.success) {
  return rateLimitResult.response;
}
```

### ❌ Wrong Limit Type
```typescript
// Password reset with lenient limit
await rateLimit(request, 'search'); // 30/min - too many!
```

### ✅ Appropriate Limit
```typescript
// Password reset with strict limit
await rateLimit(request, 'auth'); // 5/min - secure
```

### ❌ Not Using User ID for Authenticated Requests
```typescript
export const POST = withAuth(async (ctx: AuthContext) => {
  await rateLimit(ctx.request, 'write'); // Uses IP only
  // ...
});
```

### ✅ Using User ID
```typescript
export const POST = withAuth(async (ctx: AuthContext) => {
  await rateLimit(ctx.request, 'write', ctx.user.id); // Per-user
  // ...
});
```

## Response Headers

The rate limiter automatically adds standard headers:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 42
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2024-12-18T15:30:42.000Z
```

These can be used by clients to implement exponential backoff or show countdown timers.

## Related Documentation

- **Full Documentation**: `documentation/api/rate-limiting.md`
- **Implementation**: `web/lib/rate-limit.ts`
- **Tests**: `web/tests/unit/lib/rate-limit.test.ts`
- **Applied Examples**:
  - `web/app/auth/actions.ts` - Server actions
  - `web/app/api/booking/route.ts` - API routes with auth
  - `web/app/api/diagnosis_codes/route.ts` - Simple API route
