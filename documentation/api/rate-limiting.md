# Rate Limiting

The Vete platform implements sliding window rate limiting to protect API endpoints from abuse and ensure fair resource allocation across all users.

## Overview

Rate limiting is applied at different levels depending on the sensitivity and resource intensity of the endpoint:

| Endpoint Type | Limit | Window | Description |
|--------------|-------|--------|-------------|
| **Auth** | 5 requests | 1 minute | Login, signup, password reset |
| **Search** | 30 requests | 1 minute | Diagnosis codes, autocomplete |
| **Write** | 20 requests | 1 minute | Creating/updating records |
| **Default** | 60 requests | 1 minute | General API endpoints |

## Implementation

### Storage Backend

The rate limiter supports two storage backends:

1. **In-Memory Store** (Default)
   - No external dependencies
   - Works out of the box
   - Suitable for single-instance deployments
   - Automatically cleans up old entries

2. **Redis Store** (Optional)
   - Distributed rate limiting
   - Suitable for multi-instance deployments
   - Enabled by setting `REDIS_URL` environment variable
   - Automatic fallback to in-memory if Redis unavailable

### Algorithm

The implementation uses a **sliding window** algorithm:

1. Each request is timestamped
2. Requests outside the time window are pruned
3. Remaining requests are counted
4. If count exceeds limit, request is rejected
5. Window "slides" with each new request

This is more accurate than fixed windows and prevents burst attacks at window boundaries.

## Usage

### Basic Rate Limiting

For API routes (using NextRequest):

```typescript
import { rateLimit } from '@/lib/rate-limit';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Check rate limit
  const rateLimitResult = await rateLimit(request, 'search');

  if (!rateLimitResult.success) {
    // Return 429 response with retry information
    return rateLimitResult.response;
  }

  // Continue with normal request handling
  return NextResponse.json({ data: 'success' });
}
```

### With User Authentication

When you have a user ID (preferred for authenticated endpoints):

```typescript
import { rateLimit } from '@/lib/rate-limit';
import { withAuth, type AuthContext } from '@/lib/api/with-auth';

export const POST = withAuth(async (ctx: AuthContext) => {
  // Apply rate limiting with user ID
  const rateLimitResult = await rateLimit(ctx.request, 'write', ctx.user.id);

  if (!rateLimitResult.success) {
    return rateLimitResult.response;
  }

  // Continue with request handling...
});
```

### For Server Actions

Server actions require creating a mock NextRequest:

```typescript
import { headers } from 'next/headers';
import { rateLimit } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';

async function createMockRequest(): Promise<NextRequest> {
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';

  const url = `http://localhost${headersList.get('x-pathname') || '/'}`;
  return new NextRequest(url, {
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

  // Continue with action logic...
}
```

### Using the Higher-Order Wrapper

For cleaner code, use the `withRateLimit` wrapper:

```typescript
import { withRateLimit } from '@/lib/rate-limit';
import { NextRequest, NextResponse } from 'next/server';

export const POST = withRateLimit(
  async (request: NextRequest) => {
    // Your handler logic
    return NextResponse.json({ success: true });
  },
  'write' // Rate limit type
);
```

## Response Format

### Successful Request

When a request is allowed:

```typescript
{
  success: true,
  remaining: 18  // Requests remaining in current window
}
```

### Rate Limited Response

When a request exceeds the limit (HTTP 429):

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

Headers:
```
HTTP/1.1 429 Too Many Requests
Retry-After: 42
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2024-12-18T15:30:42.000Z
```

## Identification Strategy

Rate limits are tracked by:

1. **User ID** (if authenticated) - Preferred
   - More accurate per-user limiting
   - Survives IP changes (mobile networks)
   - Format: `user:{user_id}`

2. **IP Address** (fallback)
   - For unauthenticated endpoints
   - Reads from `x-forwarded-for` or `x-real-ip` headers
   - Format: `ip:{ip_address}`

## Configuration

### Environment Variables

```bash
# Optional: Redis URL for distributed rate limiting
REDIS_URL=redis://localhost:6379

# If not set, uses in-memory storage
```

### Customizing Limits

Edit `web/lib/rate-limit.ts`:

```typescript
export const RATE_LIMITS = {
  auth: {
    windowMs: 60 * 1000,    // Time window in ms
    maxRequests: 5,          // Max requests in window
    message: 'Demasiadas solicitudes. Intente de nuevo en',
  },
  // Add custom limit types...
  custom: {
    windowMs: 5 * 60 * 1000,  // 5 minutes
    maxRequests: 100,
    message: 'Límite personalizado excedido. Espere',
  },
}
```

## Currently Protected Endpoints

### Authentication
- `POST /auth/actions/login` - 5 req/min
- `POST /auth/actions/signup` - 5 req/min
- `POST /auth/actions/requestPasswordReset` - 5 req/min

### API Routes
- `GET /api/booking` - 30 req/min (search)
- `POST /api/booking` - 20 req/min (write)
- `PUT /api/booking` - 20 req/min (write)
- `GET /api/diagnosis_codes` - 30 req/min (search)

## Best Practices

### When to Apply Rate Limiting

1. **Always rate limit:**
   - Authentication endpoints (prevent brute force)
   - Password reset (prevent enumeration)
   - Public APIs (prevent abuse)
   - Search/autocomplete (prevent scraping)

2. **Consider rate limiting:**
   - Resource-intensive operations
   - Endpoints that send emails/SMS
   - File uploads
   - Export operations

3. **Don't rate limit:**
   - Static asset requests
   - Health check endpoints
   - Internal service-to-service calls

### Choosing the Right Limit

- **Strict (5-10/min):** Auth, password reset, account creation
- **Moderate (20-30/min):** Writes, searches, autocomplete
- **Lenient (60+/min):** Reads, listing operations
- **Very Lenient (100+/min):** Cached data, low-cost operations

### Multi-Tenant Considerations

Rate limits apply **per identifier** (user or IP), not per tenant. This means:

- A user can't abuse one tenant and switch to another
- DDoS attacks are mitigated regardless of target tenant
- Fair resource allocation across all tenants

If you need per-tenant limits, add tenant filtering:

```typescript
const identifier = `${tenantId}:${getIdentifier(request, userId)}`;
```

## Monitoring

### Metrics to Track

1. **Rate limit hits** - How often are limits reached?
2. **Blocked requests** - Which endpoints are being abused?
3. **User patterns** - Are limits too strict or too lenient?

### Logging

The rate limiter logs:
- Redis connection status
- Rate limit violations (in error responses)
- Fallback to in-memory store

### Adjusting Limits

Monitor your application metrics:

```typescript
// If users frequently hit limits legitimately:
// Increase maxRequests or windowMs

// If abuse is occurring:
// Decrease maxRequests or add additional protection

// If system is overloaded:
// Decrease limits across the board
```

## Testing

### Unit Tests

Run the rate limit test suite:

```bash
npm run test web/lib/__tests__/rate-limit.test.ts
```

### Manual Testing

Test rate limiting with curl:

```bash
# Make 6 requests quickly (auth limit is 5)
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"test"}' \
    -w "\nStatus: %{http_code}\n"
done

# Should see 5x 200/401 responses, then 1x 429
```

### Load Testing

Use tools like Apache Bench or k6:

```bash
# Test with ab
ab -n 100 -c 10 http://localhost:3000/api/some-endpoint

# Test with k6
k6 run scripts/load-test-rate-limit.js
```

## Troubleshooting

### Issue: "Too many requests" but user hasn't made many

**Cause:** Multiple users behind the same IP (NAT, corporate proxy)

**Solution:** Ensure user ID is passed when authenticated:
```typescript
await rateLimit(request, 'write', userId); // Not just request
```

### Issue: Rate limits not working in development

**Cause:** Hot reloading resets in-memory store

**Solution:** Use Redis in development or accept the limitation

### Issue: Rate limits persist after tests

**Cause:** Test cleanup not called

**Solution:** Call `clearRateLimits()` in test cleanup:
```typescript
import { clearRateLimits } from '@/lib/rate-limit';

afterEach(() => {
  clearRateLimits();
});
```

### Issue: Redis connection errors

**Cause:** Redis not running or wrong URL

**Solution:**
1. Check `REDIS_URL` environment variable
2. System automatically falls back to in-memory
3. Check logs for connection errors

## Security Considerations

1. **Don't expose limit details to attackers**
   - The current implementation includes limit details in responses
   - Consider removing for production if security is critical

2. **Distributed attacks**
   - In-memory store won't protect against distributed attacks
   - Use Redis + reverse proxy rate limiting (nginx, CloudFlare)

3. **IP spoofing**
   - Trust `x-forwarded-for` only behind a reverse proxy
   - Configure proxy to set trusted headers

4. **Credential stuffing**
   - Auth limits help but aren't sufficient alone
   - Implement CAPTCHA after N failed attempts
   - Consider additional account lockout policies

## Future Enhancements

Potential improvements:

- [ ] Dynamic rate limits based on user tier/role
- [ ] Exponential backoff for repeat offenders
- [ ] Whitelist for trusted IPs
- [ ] Dashboard for monitoring rate limit violations
- [ ] Integration with CloudFlare/Fastly for edge rate limiting
- [ ] Per-tenant rate limits for multi-tenancy fairness
- [ ] GraphQL query complexity-based rate limiting

## Related Documentation

- [API Authentication](./authentication.md)
- [API Error Handling](./errors.md)
- [Security Best Practices](../architecture/security.md)
