# 🔌 API Design Roast

> *"An API is a contract. You've written it in crayon."*

**Score: 7/10** — *"The endpoints work, the patterns don't agree"*

---

## Overview

You have 87 REST API endpoints and 22 Server Actions. The individual implementations are generally solid. But zoom out and you'll see two auth patterns fighting for dominance, three error formats, and rate limiting that protects everything except the endpoints that actually need it.

---

## 🔴 Critical Issues

### API-001: Two Auth Patterns

**The Crime:**

**Pattern A: The Right Way™**
```typescript
// lib/api/with-auth.ts
export const GET = withAuth(async ({ user, profile, supabase, request }) => {
  // Already authenticated, profile loaded, supabase ready
  const data = await supabase.from('invoices').select('*')
  return NextResponse.json(data)
})
```

**Pattern B: The Copy-Paste Way**
```typescript
// app/api/appointments/slots/route.ts (and 20+ other files)
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
  }

  // Finally, 15 lines later, the actual logic starts
}
```

**Why It Hurts:**
- 15 lines of boilerplate in every route
- Easy to forget a check (and someone has)
- Inconsistent error messages
- Can't centrally add new auth checks

**The Fix:**

Make `withAuth` mandatory:
```typescript
// EVERY route should look like this:
export const GET = withAuth(async (ctx) => {
  // ctx.user, ctx.profile, ctx.supabase already available
})

export const POST = withAuth(async (ctx) => {
  // Same pattern
}, { roles: ['vet', 'admin'] })  // Optional role restriction
```

**Audit Command:**
```bash
# Find routes NOT using withAuth
grep -rL "withAuth" app/api/**/*.ts | grep "route.ts"
```

**Effort:** 🟡 Medium (2-3 days to migrate all routes)

---

### API-002: Missing Rate Limiting

**The Crime:**

Rate limiting exists:
```typescript
// lib/api/rate-limit.ts - You built this!
import { rateLimit } from '@/lib/api/rate-limit'

// But only used on public service endpoint
// app/api/services/route.ts
export async function GET(request: NextRequest) {
  const rateLimitResult = await rateLimit(request)
  // ...
}
```

**Unprotected endpoints:**
- `/api/invoices` — Financial data, brute-forceable
- `/api/appointments/slots` — Staff schedules exposed
- `/api/store/cart` — User cart manipulation
- `/api/pets/[id]/qr` — Sensitive pet data
- `/api/auth/login` — No brute-force protection?!

**The Fix:**

Apply rate limiting by endpoint sensitivity:

```typescript
// lib/api/rate-limits.ts
export const RateLimits = {
  public: { requests: 100, window: '1m' },
  authenticated: { requests: 60, window: '1m' },
  sensitive: { requests: 10, window: '1m' },
  auth: { requests: 5, window: '1m' },  // Login/signup
}

// Usage
export const POST = withAuth(async (ctx) => {
  await rateLimit(ctx.request, RateLimits.sensitive)
  // ...
})
```

**Effort:** 🟢 Low (1 day)

---

## 🟠 High Priority Issues

### API-003: Inconsistent Error Responses

**The Crime:**

**Format 1:**
```json
{ "error": "No autorizado" }
```

**Format 2:**
```json
{
  "code": "DATABASE_ERROR",
  "message": "Error al cargar datos",
  "details": { "table": "invoices" }
}
```

**Format 3 (Server Actions):**
```json
{
  "success": false,
  "error": "El nombre es obligatorio",
  "fieldErrors": { "name": "Requerido" }
}
```

**Frontend Chaos:**
```typescript
// How do you handle errors? NOBODY KNOWS
try {
  const data = await fetch('/api/something')
  const json = await data.json()

  if (json.error) { /* Format 1 */ }
  if (json.code) { /* Format 2 */ }
  if (!json.success) { /* Format 3 */ }

  // Just throw your laptop away at this point
} catch (e) { }
```

**The Fix:**

One response format for everything:
```typescript
// lib/api/responses.ts
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

// Success
return apiSuccess({ invoices: data })

// Error
return apiError('UNAUTHORIZED', 'No autorizado', 401)
```

**Effort:** 🟡 Medium (3-4 days)

---

### API-004: Pagination Inconsistency

**The Crime:**

Some endpoints paginate:
```typescript
// app/api/invoices/route.ts
const { page, limit } = parsePagination(request)
return paginatedResponse(data, page, limit, total)
```

Some don't:
```typescript
// app/api/appointments/route.ts
const { data } = await supabase.from('appointments').select('*')
return NextResponse.json(data)  // ALL appointments. Ever. Good luck.
```

**The Fix:**

Paginate everything that could grow:
```typescript
// Default pagination for all list endpoints
const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

export const GET = withAuth(async ({ request, supabase }) => {
  const { page, limit } = parsePagination(request, DEFAULT_LIMIT, MAX_LIMIT)

  const { data, count } = await supabase
    .from('table')
    .select('*', { count: 'exact' })
    .range((page - 1) * limit, page * limit - 1)

  return paginatedResponse(data, page, limit, count)
})
```

**Effort:** 🟢 Low (per endpoint)

---

### API-005: Missing Input Validation

**The Crime:**

Some routes validate:
```typescript
// app/api/pets/route.ts
const schema = z.object({
  name: z.string().min(1),
  species: z.enum(['dog', 'cat', 'bird', 'other']),
  // ...
})

const body = schema.parse(await request.json())
```

Some trust blindly:
```typescript
// app/api/appointments/route.ts
const body = await request.json()
// No validation. YOLO.
await supabase.from('appointments').insert(body)
```

**Why It Hurts:**
- Invalid data in database
- Cryptic Supabase errors to users
- Potential injection vectors

**The Fix:**

Validation decorator:
```typescript
// lib/api/validation.ts
export function withValidation<T>(schema: z.ZodSchema<T>) {
  return (handler: (data: T, ctx: AuthContext) => Promise<Response>) => {
    return async (request: NextRequest, ctx: AuthContext) => {
      const body = await request.json()
      const result = schema.safeParse(body)

      if (!result.success) {
        return apiError('VALIDATION_ERROR', 'Datos inválidos', 400, {
          errors: result.error.flatten()
        })
      }

      return handler(result.data, ctx)
    }
  }
}

// Usage
export const POST = withAuth(
  withValidation(createAppointmentSchema)(async (data, ctx) => {
    // data is typed and validated
  })
)
```

**Effort:** 🟡 Medium

---

## 🟡 Medium Priority Issues

### API-006: No API Versioning

**The Crime:**

All endpoints are unversioned:
```
/api/invoices
/api/appointments
/api/store/products
```

When you need to make breaking changes, you're stuck.

**The Fix:**

Version from the start:
```
/api/v1/invoices
/api/v1/appointments
```

Or use header versioning:
```typescript
const version = request.headers.get('API-Version') || 'v1'
```

**Effort:** 🟡 Medium (but do it before you have external clients)

---

### API-007: Inconsistent HTTP Methods

**The Crime:**

```typescript
// Some routes use proper REST
POST /api/appointments          // Create
PUT /api/appointments/[id]      // Update
DELETE /api/appointments/[id]   // Delete

// Some routes don't
POST /api/appointments/cancel   // Should be PATCH /api/appointments/[id]/status
POST /api/invoices/pay          // Should be POST /api/payments
```

**The Fix:**

Follow REST conventions:
```
GET    /api/resources           # List
POST   /api/resources           # Create
GET    /api/resources/[id]      # Read
PUT    /api/resources/[id]      # Update (full)
PATCH  /api/resources/[id]      # Update (partial)
DELETE /api/resources/[id]      # Delete

# Actions as sub-resources
POST   /api/invoices/[id]/payments     # Pay invoice
POST   /api/appointments/[id]/cancel   # Cancel appointment
```

**Effort:** 🟠 High (breaking change)

---

### API-008: No Request/Response Logging

**The Crime:**

Debugging production issues:
```
User: "My payment didn't go through"
You: "What did you send? What did we return? When?"
Database: *shrugs*
```

**The Fix:**

Add request logging middleware:
```typescript
// lib/api/logging.ts
export function withLogging(handler: Handler): Handler {
  return async (request, ...args) => {
    const requestId = crypto.randomUUID()
    const start = Date.now()

    logger.info('API Request', {
      requestId,
      method: request.method,
      path: request.url,
      // Don't log body in production (PII)
    })

    const response = await handler(request, ...args)

    logger.info('API Response', {
      requestId,
      status: response.status,
      duration: Date.now() - start,
    })

    return response
  }
}
```

**Effort:** 🟢 Low

---

## 📊 API Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Routes using withAuth | ~60% | 100% | 🟠 |
| Routes with rate limiting | ~5% | 100% sensitive | 🔴 |
| Routes with input validation | ~50% | 100% | 🟠 |
| Consistent error format | No | Yes | 🟠 |
| Paginated list endpoints | ~30% | 100% | 🟡 |

---

## API Route Checklist

For every API route, verify:

- [ ] Uses `withAuth` wrapper (not manual auth)
- [ ] Has rate limiting (appropriate for sensitivity)
- [ ] Validates input with Zod schema
- [ ] Returns consistent error format
- [ ] Includes tenant_id filter in queries
- [ ] Has proper HTTP method (REST semantics)
- [ ] Is paginated (if list endpoint)
- [ ] Has request logging (in production)
- [ ] Is documented (OpenAPI/Swagger)
- [ ] Has integration tests

---

## Summary

The API endpoints work individually, but the lack of consistency creates a maintenance burden. You have good patterns (`withAuth`, rate limiting, validation schemas) but they're not applied universally.

**Priority Actions:**
1. Add rate limiting to financial/auth endpoints (today)
2. Migrate all routes to `withAuth` wrapper (this week)
3. Standardize error response format (this sprint)
4. Add input validation to all POST/PUT routes (this sprint)

*"A good API is like a good joke. If you have to explain it, it's not that good."*
