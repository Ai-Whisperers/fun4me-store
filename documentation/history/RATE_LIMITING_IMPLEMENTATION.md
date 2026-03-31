# Rate Limiting Implementation Summary

## Overview

A comprehensive sliding window rate limiting system has been implemented for the Vete veterinary platform to protect API endpoints from abuse and ensure fair resource allocation.

## Implementation Details

### Core Files Created

1. **`web/lib/rate-limit.ts`** (437 lines)
   - Sliding window rate limiting algorithm
   - Dual storage backend (in-memory + optional Redis)
   - Support for different rate limit tiers
   - Helper functions and HOC wrapper
   - Automatic cleanup and resource management

2. **`web/tests/unit/lib/rate-limit.test.ts`** (291 lines)
   - Comprehensive test suite with 15 tests
   - Tests for basic functionality, different endpoint types, identification strategies
   - Sliding window behavior, response headers, and edge cases
   - All tests passing

3. **`documentation/api/rate-limiting.md`** (comprehensive documentation)
   - Usage examples for different scenarios
   - Configuration guidelines
   - Troubleshooting guide
   - Security considerations
   - Future enhancement roadmap

4. **`web/tests/__mocks__/redis.ts`**
   - Mock Redis client for testing
   - Allows tests to run without Redis dependency

### Files Modified

1. **`web/app/auth/actions.ts`**
   - Added rate limiting to `login()` - 5 req/min
   - Added rate limiting to `signup()` - 5 req/min
   - Added rate limiting to `requestPasswordReset()` - 5 req/min
   - Created `createMockRequest()` helper for server actions

2. **`web/app/api/booking/route.ts`**
   - Added rate limiting to `GET` endpoint - 30 req/min (search)
   - Added rate limiting to `POST` endpoint - 20 req/min (write)
   - Added rate limiting to `PUT` endpoint - 20 req/min (write)

3. **`web/app/api/diagnosis_codes/route.ts`**
   - Added rate limiting to `GET` endpoint - 30 req/min (search)

4. **`web/vitest.config.ts`**
   - Added Redis mock alias to prevent import errors in tests

## Rate Limit Tiers

| Tier | Requests/Min | Window | Use Case |
|------|--------------|--------|----------|
| **auth** | 5 | 60s | Login, signup, password reset |
| **search** | 30 | 60s | Search, autocomplete, diagnosis codes |
| **write** | 20 | 60s | Create/update operations |
| **default** | 60 | 60s | General API endpoints |

## Key Features

### 1. Sliding Window Algorithm
- More accurate than fixed windows
- Prevents burst attacks at window boundaries
- Automatically prunes old timestamps

### 2. Dual Storage Backend
- **In-Memory** (default): Works out of the box, no dependencies
- **Redis** (optional): Enable with `REDIS_URL` environment variable for distributed deployments
- Automatic fallback from Redis to in-memory on connection failure

### 3. Smart Identification
- Prioritizes user ID for authenticated requests (more accurate)
- Falls back to IP address for unauthenticated requests
- Handles proxies via `x-forwarded-for` and `x-real-ip` headers

### 4. Comprehensive Error Responses
```json
{
  "error": "Demasiadas solicitudes. Intente de nuevo en 42 segundos.",
  "code": "RATE_LIMITED",
  "details": {
    "retryAfter": 42,
    "limitType": "auth",
    "maxRequests": 5,
    "windowMs": 60000
  }
}
```

### 5. Standard HTTP Headers
- `Retry-After`: Seconds until limit resets
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in window
- `X-RateLimit-Reset`: ISO timestamp when limit resets

## Usage Examples

### Basic API Route
```typescript
import { rateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, 'search');
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  // Continue with normal processing...
}
```

### With Authentication Context
```typescript
import { withAuth } from '@/lib/api/with-auth';
import { rateLimit } from '@/lib/rate-limit';

export const POST = withAuth(async (ctx: AuthContext) => {
  const rateLimitResult = await rateLimit(ctx.request, 'write', ctx.user.id);
  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  // Process authenticated request...
});
```

### Higher-Order Wrapper
```typescript
import { withRateLimit } from '@/lib/rate-limit';

export const POST = withRateLimit(
  async (request: NextRequest) => {
    return NextResponse.json({ success: true });
  },
  'write'
);
```

### Server Actions
```typescript
import { headers } from 'next/headers';
import { rateLimit } from '@/lib/rate-limit';

async function createMockRequest() {
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for') || 'unknown';

  return new NextRequest(`http://localhost/`, {
    headers: new Headers({ 'x-forwarded-for': ip }),
  });
}

export async function myAction(formData: FormData) {
  const request = await createMockRequest();
  const rateLimitResult = await rateLimit(request, 'auth');

  if (!rateLimitResult.success) {
    const errorData = await rateLimitResult.response.json();
    return { error: errorData.error };
  }

  // Process action...
}
```

## Protected Endpoints

### Authentication Endpoints (5 req/min - strict)
- ✅ `POST /auth/actions/login`
- ✅ `POST /auth/actions/signup`
- ✅ `POST /auth/actions/requestPasswordReset`

### Search Endpoints (30 req/min - moderate)
- ✅ `GET /api/booking` (list appointments)
- ✅ `GET /api/diagnosis_codes` (search codes)

### Write Endpoints (20 req/min - moderate)
- ✅ `POST /api/booking` (create appointment)
- ✅ `PUT /api/booking` (update appointment)

## Test Coverage

All 15 tests passing:

### Basic Functionality (3 tests)
- ✅ Allow requests under limit
- ✅ Block requests over limit
- ✅ Return correct remaining count

### Different Endpoint Types (3 tests)
- ✅ Auth endpoint limits (5/min)
- ✅ Search endpoint limits (30/min)
- ✅ Write endpoint limits (20/min)

### Identification Strategies (2 tests)
- ✅ Track different IPs separately
- ✅ Track user IDs separately from IPs

### Sliding Window (2 tests)
- ✅ Allow requests after window expires
- ✅ Use sliding window, not fixed window

### Response Headers (2 tests)
- ✅ Include retry-after header when blocked
- ✅ Include rate limit headers (limit, remaining, reset)

### Edge Cases (3 tests)
- ✅ Handle missing IP address
- ✅ Handle concurrent requests correctly
- ✅ Clear rate limits when requested

## Configuration

### Optional Redis Support
```bash
# .env.local
REDIS_URL=redis://localhost:6379
```

### Customizing Limits
Edit `web/lib/rate-limit.ts`:
```typescript
export const RATE_LIMITS = {
  custom: {
    windowMs: 5 * 60 * 1000,  // 5 minutes
    maxRequests: 100,
    message: 'Custom limit exceeded. Wait',
  },
}
```

## Security Benefits

1. **Brute Force Protection**: Auth endpoints limited to 5 attempts/min
2. **DDoS Mitigation**: Prevents resource exhaustion
3. **Fair Resource Allocation**: Prevents one user from monopolizing resources
4. **Scraping Prevention**: Search endpoints protected
5. **Multi-tenant Isolation**: Rate limits apply per identifier, not per tenant

## Performance Characteristics

- **In-Memory Mode**:
  - Zero external dependencies
  - Sub-millisecond lookup times
  - Automatic cleanup every 5 minutes
  - Suitable for single-instance deployments

- **Redis Mode**:
  - Distributed rate limiting across instances
  - Persistent across restarts
  - Scales horizontally
  - Automatic fallback to in-memory on failure

## Future Enhancements

Potential improvements documented in `documentation/api/rate-limiting.md`:

- [ ] Dynamic rate limits based on user tier/role
- [ ] Exponential backoff for repeat offenders
- [ ] Whitelist for trusted IPs
- [ ] Dashboard for monitoring violations
- [ ] CloudFlare/Fastly integration for edge rate limiting
- [ ] Per-tenant rate limits
- [ ] GraphQL query complexity-based limiting

## Migration Guide

No database migrations required. The system works out of the box with in-memory storage.

For distributed deployments:

1. Install Redis: `npm install redis`
2. Set environment variable: `REDIS_URL=redis://your-redis-host:6379`
3. System automatically detects and uses Redis

## Testing

Run rate limit tests:
```bash
cd web
npm run test tests/unit/lib/rate-limit.test.ts
```

Manual testing with curl:
```bash
# Test auth endpoint (limit: 5/min)
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"test"}' \
    -w "\nStatus: %{http_code}\n"
done

# Should see 5x 401, then 1x 429
```

## Monitoring

Log messages to watch for:
- `"REDIS_URL not configured, using in-memory rate limiting"` - Expected in development
- `"Redis rate limiting enabled"` - Redis successfully connected
- `"Redis connection failed, falling back to in-memory store"` - Redis unavailable, using fallback

Error responses with code `"RATE_LIMITED"` indicate rate limit violations.

## Documentation

Full documentation available at:
- **API Documentation**: `documentation/api/rate-limiting.md`
- **Code Reference**: `web/lib/rate-limit.ts`
- **Test Examples**: `web/tests/unit/lib/rate-limit.test.ts`

## Conclusion

The rate limiting system is production-ready and provides:
- ✅ Protection against abuse
- ✅ Fair resource allocation
- ✅ Graceful degradation
- ✅ Comprehensive testing
- ✅ Clear error messages in Spanish
- ✅ Standard HTTP compliance
- ✅ Zero required dependencies
- ✅ Optional Redis support
- ✅ Full documentation

The implementation follows project standards:
- TypeScript with strict types
- Spanish user-facing messages
- Comprehensive test coverage
- Detailed documentation
- Production-ready error handling
