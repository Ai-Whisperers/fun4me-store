# API Rate Limiting Guide

**Last Updated**: January 2026  
**Status**: ✅ Production Ready (95% coverage)

---

## Table of Contents

1. [Overview](#overview)
2. [Rate Limit Tiers](#rate-limit-tiers)
3. [Implementation Patterns](#implementation-patterns)
4. [Choosing a Tier](#choosing-a-tier)
5. [Testing Rate Limits](#testing-rate-limits)
6. [Response Headers](#response-headers)
7. [Error Handling](#error-handling)
8. [Public Endpoints](#public-endpoints)
9. [Monitoring & Analytics](#monitoring--analytics)

---

## Overview

All API endpoints in the Vete platform use **declarative rate limiting** through the `withApiAuth` and `withApiAuthParams` wrappers. Rate limiting is enforced **before** the handler executes, ensuring consistent protection across the application.

### Key Features

- ✅ **Declarative Configuration** - Rate limits defined in route options, not handler code
- ✅ **User-Based Limiting** - Tracks limits per authenticated user (not IP)
- ✅ **Sliding Window Algorithm** - Smooth rate limiting without burst traffic
- ✅ **Redis-Backed** - Distributed rate limiting in production (in-memory for dev)
- ✅ **Automatic Headers** - Rate limit info included in all responses
- ✅ **Spanish Error Messages** - User-friendly messages for Paraguay market

### Architecture

```
Request → Auth → Rate Limit Check → Handler
                      ↓
                 If exceeded → 429 Response
                      ↓
                 If allowed → Continue
```

---

## Rate Limit Tiers

### Tier Configuration

| Tier | Limit | Window | Use Case | Files |
|------|-------|--------|----------|-------|
| **`auth`** | 5 requests | 1 hour | Signup, login, password reset | Manual |
| **`booking`** | 5 requests | 1 hour | Appointment creation | ~3 |
| **`financial`** | 10 requests | 1 minute | Invoices, payments, refunds | ~5 |
| **`checkout`** | 10 requests | 1 minute | Store checkout, order placement | ~2 |
| **`write`** | 20 requests | 1 minute | Standard CRUD mutations | ~80 |
| **`cart`** | 60 requests | 1 minute | Shopping cart updates | Manual |
| **`search`** | 30 requests | 1 minute | Search/list endpoints | ~25 |
| **`default`** | 60 requests | 1 minute | General read operations | ~10 |

### Tier Details

#### `auth` - Authentication Endpoints
- **Limit**: 5 requests per hour
- **Rationale**: Prevent brute force attacks on login/signup
- **Example**: User registration, password reset requests
- **Error Message**: "Demasiadas solicitudes. Intente de nuevo en X segundos."

```typescript
// Used in manual public endpoints only
const rateLimitResult = await rateLimit(request, 'auth', 'public')
```

#### `booking` - Appointment Creation
- **Limit**: 5 requests per hour
- **Rationale**: Prevent spam bookings and calendar abuse
- **Example**: Creating new appointments
- **Error Message**: "Demasiadas solicitudes de reserva. Intente de nuevo en X segundos."

```typescript
export const POST = withApiAuth(
  async ({ supabase, profile }) => {
    // Create appointment logic
  },
  { roles: ['owner', 'vet', 'admin'], rateLimit: 'booking' }
)
```

#### `financial` - Financial Operations
- **Limit**: 10 requests per minute
- **Rationale**: Extra protection for sensitive operations
- **Example**: Invoice creation, payment processing, refunds
- **Error Message**: "Demasiadas operaciones financieras. Intente de nuevo en X segundos."

```typescript
export const POST = withApiAuth(
  async ({ supabase, profile }) => {
    // Process payment
  },
  { roles: ['admin'], rateLimit: 'financial' }
)
```

#### `checkout` - Store Checkout
- **Limit**: 10 requests per minute
- **Rationale**: Prevent rapid order submission
- **Example**: Order placement, checkout completion
- **Error Message**: "Demasiados intentos de pago. Intente de nuevo en X segundos."

```typescript
export const POST = withApiAuth(
  async ({ supabase, user }) => {
    // Complete order
  },
  { rateLimit: 'checkout' }
)
```

#### `write` - Standard Mutations
- **Limit**: 20 requests per minute
- **Rationale**: Balanced protection for CRUD operations
- **Example**: Creating pets, medical records, prescriptions
- **Error Message**: "Demasiadas solicitudes. Intente de nuevo en X segundos."

```typescript
export const POST = withApiAuth(
  async ({ supabase, profile }) => {
    // Create resource
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)

export const PATCH = withApiAuthParams<{ id: string }>(
  async ({ params, supabase }) => {
    // Update resource
  },
  { roles: ['vet', 'admin'], rateLimit: 'write' }
)
```

#### `cart` - Shopping Cart
- **Limit**: 60 requests per minute
- **Rationale**: Allow frequent cart updates during shopping
- **Example**: Add to cart, update quantity, remove items
- **Error Message**: "Demasiadas operaciones de carrito. Intente de nuevo en X segundos."

```typescript
// Used in manual public endpoints (cart before login)
const rateLimitResult = await rateLimit(request, 'cart')
```

#### `search` - Search & Listing
- **Limit**: 30 requests per minute
- **Rationale**: Balance between usability and protection
- **Example**: Product search, client search, pet listing
- **Error Message**: "Demasiadas búsquedas. Intente de nuevo en X segundos."

```typescript
export const GET = withApiAuth(
  async ({ supabase, profile, request }) => {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    // Search logic
  },
  { rateLimit: 'search' }
)
```

#### `default` - General Operations
- **Limit**: 60 requests per minute
- **Rationale**: Generous limit for read-heavy operations
- **Example**: Fetching lists, viewing details, reference data
- **Error Message**: "Demasiadas solicitudes. Intente de nuevo en X segundos."

```typescript
export const GET = withApiAuth(
  async ({ supabase, profile }) => {
    // Fetch data
  },
  { rateLimit: 'default' }
)
```

---

## Implementation Patterns

### Pattern 1: Simple Authenticated Endpoint

```typescript
// app/api/pets/route.ts
import { withApiAuth } from '@/lib/auth/api-wrapper'
import { NextResponse } from 'next/server'

export const POST = withApiAuth(
  async ({ supabase, profile, log }) => {
    log.info('Creating pet', { action: 'pets.create' })
    
    const { data, error } = await supabase
      .from('pets')
      .insert({ tenant_id: profile.tenant_id, ...petData })
      .select()
      .single()
    
    if (error) {
      log.error('Failed to create pet', { error })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json(data)
  },
  { 
    roles: ['vet', 'admin'], 
    rateLimit: 'write' // ← Declarative rate limiting
  }
)

export const GET = withApiAuth(
  async ({ supabase, profile }) => {
    const { data } = await supabase
      .from('pets')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
    
    return NextResponse.json(data)
  },
  { rateLimit: 'default' } // ← Read operation
)
```

### Pattern 2: Dynamic Route with Params

```typescript
// app/api/pets/[id]/route.ts
import { withApiAuthParams } from '@/lib/auth/api-wrapper'
import { NextResponse } from 'next/server'

export const PATCH = withApiAuthParams<{ id: string }>(
  async ({ params, supabase, profile, log }) => {
    log.info('Updating pet', { action: 'pets.update', resourceId: params.id })
    
    const { data, error } = await supabase
      .from('pets')
      .update(updates)
      .eq('id', params.id)
      .eq('tenant_id', profile.tenant_id)
      .select()
      .single()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json(data)
  },
  { 
    roles: ['vet', 'admin'], 
    rateLimit: 'write' 
  }
)

export const DELETE = withApiAuthParams<{ id: string }>(
  async ({ params, supabase, profile }) => {
    const { error } = await supabase
      .from('pets')
      .delete()
      .eq('id', params.id)
      .eq('tenant_id', profile.tenant_id)
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
  },
  { 
    roles: ['admin'], 
    rateLimit: 'write' 
  }
)
```

### Pattern 3: Search Endpoint

```typescript
// app/api/search/route.ts
import { withApiAuth } from '@/lib/auth/api-wrapper'
import { NextResponse } from 'next/server'

export const GET = withApiAuth(
  async ({ supabase, profile, request }) => {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const type = searchParams.get('type') || 'all'
    
    // Search logic across multiple tables
    const results = await performSearch(supabase, profile.tenant_id, query, type)
    
    return NextResponse.json(results)
  },
  { 
    rateLimit: 'search' // ← Search tier (30 req/min)
  }
)
```

### Pattern 4: Financial Endpoint

```typescript
// app/api/invoices/route.ts
import { withApiAuth } from '@/lib/auth/api-wrapper'
import { NextResponse } from 'next/server'

export const POST = withApiAuth(
  async ({ supabase, profile, log }) => {
    log.info('Creating invoice', { action: 'invoices.create' })
    
    // Invoice creation logic
    const invoice = await createInvoice(supabase, profile.tenant_id, data)
    
    return NextResponse.json(invoice)
  },
  { 
    roles: ['admin', 'vet'], 
    rateLimit: 'financial' // ← Financial tier (10 req/min)
  }
)
```

### Pattern 5: Booking Endpoint

```typescript
// app/api/appointments/route.ts
import { withApiAuth } from '@/lib/auth/api-wrapper'
import { NextResponse } from 'next/server'

export const POST = withApiAuth(
  async ({ supabase, profile, user }) => {
    // Check slot availability
    const isAvailable = await checkSlotAvailability(...)
    
    if (!isAvailable) {
      return NextResponse.json(
        { error: 'Slot no disponible' },
        { status: 409 }
      )
    }
    
    // Create appointment
    const appointment = await createAppointment(...)
    
    return NextResponse.json(appointment)
  },
  { 
    rateLimit: 'booking' // ← Strict booking tier (5 req/hour)
  }
)
```

---

## Choosing a Tier

Use this decision tree to select the appropriate rate limit tier:

### Step 1: Identify Operation Type

```
Is this a mutation (POST/PUT/PATCH/DELETE)?
├─ YES → Continue to Step 2
└─ NO (GET) → Continue to Step 3
```

### Step 2: Mutation Classification

```
What type of mutation?
├─ Appointment creation → 'booking'
├─ Financial operation (invoice, payment, refund) → 'financial'
├─ Store checkout → 'checkout'
├─ Standard CRUD (create/update/delete resource) → 'write'
└─ Public operation (signup, claim) → 'auth' (manual)
```

### Step 3: Read Operation Classification

```
What type of read?
├─ Search with query params → 'search'
├─ Frequent polling/updates → 'cart'
├─ General listing/detail view → 'default'
└─ Public endpoint → Manual rate limiting
```

### Quick Reference Chart

| Endpoint | Example | Tier |
|----------|---------|------|
| POST /api/appointments | Create appointment | `booking` |
| POST /api/invoices | Create invoice | `financial` |
| POST /api/payments | Process payment | `financial` |
| POST /api/orders | Place order | `checkout` |
| POST /api/pets | Create pet | `write` |
| PATCH /api/pets/[id] | Update pet | `write` |
| DELETE /api/pets/[id] | Delete pet | `write` |
| GET /api/search | Global search | `search` |
| GET /api/clients?q=... | Search clients | `search` |
| PUT /api/store/cart | Update cart | Manual (`cart`) |
| GET /api/pets | List pets | `default` |
| GET /api/services | List services | `default` |
| POST /api/claim | Claim clinic (signup) | Manual (`auth`) |

---

## Testing Rate Limits

### Manual Testing with curl

```bash
# Test rate limit exhaustion
for i in {1..25}; do
  curl -i http://localhost:3000/api/pets \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"Test Pet '$i'"}' \
    -s | head -n 1
  sleep 0.1
done

# Expected output:
# HTTP/1.1 200 OK (requests 1-20)
# HTTP/1.1 429 Too Many Requests (requests 21+)
```

### Check Response Headers

```bash
curl -i http://localhost:3000/api/pets \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response headers:
# HTTP/1.1 200 OK
# x-ratelimit-limit: 20
# x-ratelimit-remaining: 15
# x-ratelimit-reset: 2026-01-14T21:15:00.000Z
# x-request-id: 123e4567-e89b-12d3-a456-426614174000
# x-response-time: 45ms
```

### Automated Testing

Create a test file:

```typescript
// tests/api/rate-limiting.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { clearRateLimits } from '@/lib/rate-limit'

describe('Rate Limiting', () => {
  beforeEach(() => {
    clearRateLimits()
  })

  it('should allow requests within limit', async () => {
    const responses = await Promise.all(
      Array.from({ length: 10 }, () =>
        fetch('/api/pets', {
          method: 'POST',
          headers: { Authorization: 'Bearer TOKEN' },
        })
      )
    )

    responses.forEach((res) => {
      expect(res.status).toBe(200)
    })
  })

  it('should reject requests exceeding limit', async () => {
    // Exhaust the limit (20 for 'write')
    await Promise.all(
      Array.from({ length: 20 }, () =>
        fetch('/api/pets', { method: 'POST' })
      )
    )

    // 21st request should fail
    const response = await fetch('/api/pets', { method: 'POST' })
    expect(response.status).toBe(429)

    const data = await response.json()
    expect(data.code).toBe('RATE_LIMITED')
    expect(data.details.limitType).toBe('write')
  })

  it('should include rate limit headers', async () => {
    const response = await fetch('/api/pets')

    expect(response.headers.get('x-ratelimit-limit')).toBe('60')
    expect(response.headers.get('x-ratelimit-remaining')).toMatch(/\d+/)
    expect(response.headers.get('x-ratelimit-reset')).toBeTruthy()
  })
})
```

Run tests:

```bash
cd web
npx vitest run tests/api/rate-limiting.test.ts
```

---

## Response Headers

All API responses include these headers:

| Header | Description | Example |
|--------|-------------|---------|
| `X-RateLimit-Limit` | Maximum requests allowed in window | `20` |
| `X-RateLimit-Remaining` | Requests remaining in current window | `15` |
| `X-RateLimit-Reset` | When the window resets (ISO 8601) | `2026-01-14T21:15:00.000Z` |
| `X-Request-ID` | Unique request identifier for tracing | `uuid-v4` |
| `X-Response-Time` | Handler execution time | `45ms` |

### Rate Limit Exceeded Response (429)

```json
{
  "error": "Demasiadas solicitudes. Intente de nuevo en 42 segundos.",
  "code": "RATE_LIMITED",
  "details": {
    "retryAfter": 42,
    "limitType": "write",
    "maxRequests": 20,
    "windowMs": 60000
  }
}
```

**Headers:**
```
HTTP/1.1 429 Too Many Requests
Retry-After: 42
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2026-01-14T21:15:00.000Z
X-Request-ID: 123e4567-e89b-12d3-a456-426614174000
Content-Type: application/json
```

---

## Error Handling

### Client-Side Error Handling

```typescript
// Example: Fetch with retry logic
async function createPet(data: PetData): Promise<Pet> {
  const response = await fetch('/api/pets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (response.status === 429) {
    const error = await response.json()
    const retryAfter = parseInt(response.headers.get('Retry-After') || '60')
    
    throw new RateLimitError(
      `Por favor espere ${retryAfter} segundos antes de intentar nuevamente.`,
      retryAfter
    )
  }

  if (!response.ok) {
    throw new Error('Error al crear mascota')
  }

  return response.json()
}

// In your UI component
try {
  await createPet(formData)
} catch (error) {
  if (error instanceof RateLimitError) {
    // Show countdown timer or disable button
    showToast(`Por favor espere ${error.retryAfter} segundos`)
  } else {
    showToast('Error al guardar')
  }
}
```

### React Query Integration

```typescript
import { useMutation } from '@tanstack/react-query'

const createPetMutation = useMutation({
  mutationFn: createPet,
  onError: (error) => {
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers.get('Retry-After')
      toast.error(`Demasiadas solicitudes. Intente en ${retryAfter}s`)
    }
  },
  retry: (failureCount, error) => {
    // Don't retry on rate limit
    if (error.response?.status === 429) return false
    return failureCount < 3
  },
})
```

---

## Public Endpoints

Some endpoints allow unauthenticated access and use manual rate limiting:

### Pattern: Manual Rate Limiting

```typescript
// app/api/services/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  // Apply rate limiting for public access
  const rateLimitResult = await rateLimit(request, 'search', 'public-services')
  if (!rateLimitResult.success) {
    return rateLimitResult.response
  }

  // Fetch public services
  const { data } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)

  return NextResponse.json(data)
}
```

### Current Public Endpoints

| Endpoint | Tier | Identifier |
|----------|------|------------|
| `GET /api/services` | `search` | `'public-services'` |
| `GET /api/store/search` | `search` | `user?.id \|\| 'public'` |
| `POST /api/claim` | `auth` | `'public'` |
| `POST /api/ambassador` | `auth` | `'public'` |

---

## Monitoring & Analytics

### Recommended Monitoring

1. **Rate Limit Hit Rate**
   - Track % of requests hitting 429
   - Alert if >5% of requests are rate limited

2. **Top Rate Limited Users**
   - Identify users frequently hitting limits
   - May indicate bots or misuse

3. **Tier Distribution**
   - Most common tiers being used
   - Helps identify if limits are too strict/loose

4. **Performance Impact**
   - Rate limit check latency (<5ms expected)
   - Redis connection health

### Implementation Example

```typescript
// Add to logging context
log.info('Rate limit check', {
  action: 'rate_limit.check',
  tier: 'write',
  remaining: rateLimitResult.remaining,
  userId: user.id,
})

// On rate limit exceeded
log.warn('Rate limit exceeded', {
  action: 'rate_limit.exceeded',
  tier: 'write',
  userId: user.id,
  endpoint: request.url,
})
```

### Datadog Dashboard (if configured)

```typescript
// In production with Datadog enabled
if (process.env.DATADOG_API_KEY) {
  metrics.increment('api.rate_limit.check', 1, {
    tier: 'write',
    endpoint: '/api/pets',
  })
  
  if (!rateLimitResult.success) {
    metrics.increment('api.rate_limit.exceeded', 1, {
      tier: 'write',
      userId: user.id,
    })
  }
}
```

---

## Migration Status

As of January 2026:

- ✅ **133 files** migrated to declarative rate limiting
- ✅ **95% coverage** of mutation endpoints
- ✅ **7 public endpoints** use manual rate limiting (intentional)
- ⏳ **169 GET endpoints** without rate limiting (low priority)

See `docs/RATE_LIMITING_FINAL_STATUS.md` for complete migration details.

---

## Best Practices

### ✅ DO

- Use declarative rate limiting in `withApiAuth` options
- Choose the most restrictive tier that won't impact UX
- Include tier in options: `{ rateLimit: 'write' }`
- Test rate limits in development
- Handle 429 errors gracefully in UI
- Log rate limit hits for monitoring

### ❌ DON'T

- Don't call `rateLimit()` manually in handlers (use declarative)
- Don't use overly generous limits for sensitive operations
- Don't ignore 429 errors on client side
- Don't retry immediately after 429 (respect `Retry-After`)
- Don't hardcode rate limit values (use tiers)

---

## Troubleshooting

### Issue: Rate limits not working

**Check:**
1. Is `rateLimit` option specified in `withApiAuth`?
2. Is Redis connected in production? (check logs)
3. Is the endpoint using `withApiAuth` wrapper?

**Solution:**
```typescript
// Ensure you're using the wrapper
export const POST = withApiAuth(
  handler,
  { rateLimit: 'write' } // ← Must be specified
)
```

### Issue: Rate limits too strict for users

**Check:**
1. Which tier is being used?
2. What's the actual user behavior pattern?
3. Are multiple clients sharing the same user ID?

**Solution:**
```typescript
// Consider bumping to higher tier
{ rateLimit: 'default' } // 60/min instead of 'write' (20/min)
```

### Issue: Rate limit bypass suspected

**Check:**
1. Are users creating multiple accounts?
2. Is rate limiting applied to all HTTP methods?
3. Are there public endpoints without limits?

**Solution:**
```typescript
// Ensure all methods are protected
export const GET = withApiAuth(handler, { rateLimit: 'default' })
export const POST = withApiAuth(handler, { rateLimit: 'write' })
export const PATCH = withApiAuthParams(handler, { rateLimit: 'write' })
export const DELETE = withApiAuthParams(handler, { rateLimit: 'write' })
```

---

## Future Enhancements

1. **Dynamic Tier Adjustment** - Adjust limits based on tenant tier (Free/Pro/Enterprise)
2. **Per-Tenant Limits** - Different limits per clinic
3. **IP-Based Fallback** - Rate limit by IP for unauthenticated endpoints
4. **Burst Allowance** - Allow short bursts above limit
5. **Custom Tiers** - Per-endpoint custom limits

---

## References

- **Implementation**: `web/lib/rate-limit.ts`
- **Auth Wrapper**: `web/lib/auth/api-wrapper.ts`
- **Migration Status**: `web/docs/RATE_LIMITING_FINAL_STATUS.md`
- **Test Suite**: `web/tests/api/rate-limiting.test.ts`

---

**Questions?** See `CLAUDE.md` for full project documentation.
