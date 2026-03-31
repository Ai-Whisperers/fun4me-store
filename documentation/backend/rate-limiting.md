# Rate Limiting

Sliding window rate limiting implementation with in-memory and Redis support.

> **Location**: `web/lib/rate-limit.ts`
> **Last Updated**: January 2026

---

## Overview

The rate limiting system provides:
- Sliding window algorithm for accurate limiting
- Multiple rate limit types for different operations
- In-memory storage (single instance) or Redis (distributed)
- User ID or IP-based limiting
- Automatic cleanup of stale entries
- Integration with auth wrappers

---

## Rate Limit Types

| Type | Window | Max Requests | Use Case |
|------|--------|--------------|----------|
| `auth` | 1 min | 5 | Login attempts, password resets |
| `search` | 1 min | 30 | Search endpoints, autocomplete |
| `write` | 1 min | 20 | Create/update operations |
| `financial` | 1 min | 10 | Payment operations |
| `refund` | 1 hour | 5 | Refund processing (fraud prevention) |
| `checkout` | 1 min | 5 | Checkout attempts |
| `default` | 1 min | 60 | General API access |

---

## Quick Start

### With Auth Wrapper (Recommended)

```typescript
import { withApiAuth } from '@/lib/auth'

export const POST = withApiAuth(
  async ({ profile, supabase }) => {
    // Handler logic
    return NextResponse.json({ success: true })
  },
  {
    roles: ['vet', 'admin'],
    rateLimit: 'write',  // Apply write rate limit
  }
)
```

### Standalone Usage

```typescript
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  // Check rate limit
  const result = await rateLimit(request, 'auth')

  if (!result.success) {
    return result.response  // 429 Too Many Requests
  }

  // Continue with handler
  console.log(`Remaining requests: ${result.remaining}`)
  return NextResponse.json({ success: true })
}
```

### Higher-Order Function Wrapper

```typescript
import { withRateLimit } from '@/lib/rate-limit'

export const POST = withRateLimit(
  async (request) => {
    // Your handler logic
    return NextResponse.json({ success: true })
  },
  'checkout'  // Rate limit type
)
```

---

## Configuration

### Environment Variables

```env
# Optional: Redis URL for distributed rate limiting
REDIS_URL=redis://localhost:6379

# Without REDIS_URL, in-memory storage is used
```

### Rate Limit Configuration

```typescript
const RATE_LIMITS = {
  auth: {
    windowMs: 60 * 1000,      // 1 minute window
    maxRequests: 5,            // 5 requests per window
    message: 'Demasiadas solicitudes. Intente de nuevo en',
  },
  search: {
    windowMs: 60 * 1000,
    maxRequests: 30,
    message: 'Demasiadas búsquedas. Intente de nuevo en',
  },
  // ... other types
}
```

---

## API Reference

### rateLimit Function

```typescript
async function rateLimit(
  request: NextRequest,
  limitType?: RateLimitType,  // default: 'default'
  userId?: string              // optional: for authenticated users
): Promise<RateLimitResult | RateLimitError>
```

#### Returns on Success

```typescript
{
  success: true,
  remaining: number  // Requests remaining in window
}
```

#### Returns on Limit Exceeded

```typescript
{
  success: false,
  response: NextResponse  // 429 response with headers
}
```

### Error Response Format

```json
{
  "error": "Demasiadas solicitudes. Intente de nuevo en 45 segundos.",
  "code": "RATE_LIMITED",
  "details": {
    "retryAfter": 45,
    "limitType": "auth",
    "maxRequests": 5,
    "windowMs": 60000
  }
}
```

### Response Headers

```
Retry-After: 45
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2026-01-04T10:30:45.000Z
```

---

## Identifier Resolution

Rate limits are tracked by identifier:

1. **Authenticated users**: `user:{userId}`
2. **Unauthenticated requests**: `ip:{clientIP}`

The client IP is extracted from:
1. `x-forwarded-for` header (first IP)
2. `x-real-ip` header
3. Falls back to `unknown`

```typescript
// Example identifiers
"user:a1b2c3d4-e5f6-7890-abcd-ef1234567890"
"ip:192.168.1.100"
```

---

## Storage Backends

### In-Memory (Default)

- Used when `REDIS_URL` is not set
- Suitable for single-instance deployments
- Automatic cleanup every 5 minutes
- State lost on server restart

### Redis (Distributed)

- Used when `REDIS_URL` is configured
- Required for multi-instance deployments
- Automatic key expiration
- Shared state across instances

```typescript
// Redis keys format
ratelimit:auth:user:abc123
ratelimit:search:ip:192.168.1.100
```

---

## Usage Patterns

### Authentication Endpoints

```typescript
// app/api/auth/login/route.ts
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  // Strict rate limiting for auth
  const result = await rateLimit(request, 'auth')
  if (!result.success) return result.response

  // Process login
  const { email, password } = await request.json()
  // ...
}
```

### Search Endpoints

```typescript
// app/api/search/route.ts
import { withApiAuth } from '@/lib/auth'

export const GET = withApiAuth(
  async ({ request, user }) => {
    const query = new URL(request.url).searchParams.get('q')
    // Search logic
    return NextResponse.json(results)
  },
  { rateLimit: 'search' }
)
```

### Financial Operations

```typescript
// app/api/invoices/[id]/refund/route.ts
import { withApiAuthParams } from '@/lib/auth'

export const POST = withApiAuthParams<{ id: string }>(
  async ({ profile, supabase }, params) => {
    // Refund logic
    return NextResponse.json({ success: true })
  },
  {
    roles: ['admin'],
    rateLimit: 'refund',  // Very strict: 5/hour
  }
)
```

### Checkout Flow

```typescript
// app/api/store/checkout/route.ts
import { withApiAuth } from '@/lib/auth'

export const POST = withApiAuth(
  async ({ profile, supabase, request }) => {
    // Process checkout
    return NextResponse.json({ orderId: order.id })
  },
  { rateLimit: 'checkout' }
)
```

---

## Error Messages (Spanish)

| Type | Message |
|------|---------|
| auth | Demasiadas solicitudes. Intente de nuevo en X segundos. |
| search | Demasiadas búsquedas. Intente de nuevo en X segundos. |
| write | Demasiadas solicitudes. Intente de nuevo en X segundos. |
| financial | Demasiadas operaciones financieras. Intente de nuevo en X segundos. |
| refund | Límite de reembolsos alcanzado. Intente de nuevo en X segundos. |
| checkout | Demasiados intentos de pago. Intente de nuevo en X segundos. |

---

## Testing

### Clear Rate Limits

```typescript
import { clearRateLimits } from '@/lib/rate-limit'

// In tests
beforeEach(() => {
  clearRateLimits()
})
```

### Cleanup on Shutdown

```typescript
import { shutdown } from '@/lib/rate-limit'

// In server shutdown handler
process.on('SIGTERM', () => {
  shutdown()
  process.exit(0)
})
```

---

## Best Practices

### DO

- Apply rate limiting to all public-facing endpoints
- Use stricter limits for auth and financial operations
- Monitor rate limit hits in logs
- Configure Redis for multi-instance deployments
- Return helpful error messages with retry timing

### DON'T

- Skip rate limiting on sensitive endpoints
- Use overly strict limits that harm UX
- Rely solely on IP-based limiting (use user ID when available)
- Forget to handle the error response

### Recommended Limits by Endpoint Type

| Endpoint Category | Recommended Type |
|-------------------|------------------|
| Login/Register | `auth` |
| Search/Autocomplete | `search` |
| CRUD operations | `write` |
| Payments | `financial` |
| Refunds | `refund` |
| Checkout | `checkout` |
| General API | `default` |

---

## Monitoring

### Log Rate Limit Events

```typescript
import { logger } from '@/lib/logger'

const result = await rateLimit(request, 'auth', userId)

if (!result.success) {
  logger.warn('Rate limit exceeded', {
    type: 'auth',
    userId,
    ip: request.headers.get('x-forwarded-for'),
  })
}
```

### Metrics to Track

- Rate limit hits per endpoint type
- Rate limit hits per user/IP
- Retry-After values (indicates severity)
- Redis connection failures (if applicable)

---

## Related Documentation

- [Authentication Patterns](authentication-patterns.md)
- [Error Handling](error-handling.md)
- [API Overview](../api/overview.md)
