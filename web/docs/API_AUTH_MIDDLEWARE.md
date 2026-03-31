# API Authentication Middleware - Complete Guide

## Overview

This project has comprehensive authentication middleware that eliminates the need for manual auth checks in every route. The middleware provides:

- ✅ Automatic authentication validation
- ✅ Role-based access control
- ✅ Tenant isolation enforcement
- ✅ Request logging with correlation IDs
- ✅ Performance tracking
- ✅ Sentry error capture
- ✅ Rate limiting support

**Location**: `web/lib/auth/api-wrapper.ts`

---

## Current Status

| Metric               | Value        |
| -------------------- | ------------ |
| **Total API Routes** | 311          |
| **Using Middleware** | 32 (10%) ✅  |
| **Manual Auth**      | 279 (90%) ⚠️ |
| **Migration Target** | 100%         |

---

## Available Middleware Functions

### 1. `withApiAuth` - Standard Routes

For routes without dynamic parameters.

```typescript
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth/api-wrapper'
import { NextResponse } from 'next/server'

export const GET = withApiAuth(
  async ({ request, profile, user, supabase, log, scoped }: ApiHandlerContext) => {
    // Your handler code - auth is already validated
    log.info('Fetching data', { action: 'data.fetch' })

    // Use scoped queries for automatic tenant filtering
    const data = await scoped.pets.list()

    return NextResponse.json(data)
  },
  {
    roles: ['vet', 'admin'], // Optional: restrict to specific roles
    rateLimit: 'moderate', // Optional: apply rate limiting
  }
)
```

**Context Properties**:

- `request` - NextRequest object
- `user` - Authenticated user from Supabase
- `profile` - User profile with role and tenant_id
- `supabase` - Supabase client
- `scoped` - Tenant-scoped query builders
- `log` - Request-scoped logger
- `perf` - Performance tracker
- `requestId` - Unique request identifier

### 2. `withApiAuthParams` - Dynamic Routes

For routes with dynamic parameters like `/api/pets/[id]/route.ts`.

```typescript
import { withApiAuthParams, type ApiHandlerContextWithParams } from '@/lib/auth/api-wrapper'

export const GET = withApiAuthParams<{ id: string }>(
  async ({ params, profile, supabase, log }: ApiHandlerContextWithParams<{ id: string }>) => {
    log.info('Fetching pet', { resourceId: params.id })

    const { data, error } = await supabase
      .from('pets')
      .select('*')
      .eq('id', params.id)
      .eq('tenant_id', profile.tenant_id) // Tenant isolation
      .single()

    if (error) {
      return apiError('NOT_FOUND', 404)
    }

    return NextResponse.json(data)
  },
  { roles: ['vet', 'admin'] }
)
```

### 3. Options

```typescript
interface ApiRouteOptions {
  roles?: UserRole[] // Allowed roles: 'owner', 'vet', 'admin'
  requireTenant?: boolean // Validate tenant from params
  requireActive?: boolean // User must have active account
  rateLimit?: RateLimitType // 'strict' | 'moderate' | 'lenient'
}
```

---

## Migration Guide

### Before (Manual Auth)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // Manual auth check (BOILERPLATE)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Manual profile fetch (BOILERPLATE)
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  if (!profile) {
    return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
  }

  // Manual role check (BOILERPLATE)
  if (!['vet', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  // ACTUAL BUSINESS LOGIC STARTS HERE
  const { data } = await supabase.from('pets').select('*').eq('tenant_id', profile.tenant_id)

  return NextResponse.json(data)
}
```

**Lines of boilerplate**: ~30 lines

### After (With Middleware)

```typescript
import { withApiAuth } from '@/lib/auth/api-wrapper'
import { NextResponse } from 'next/server'

export const GET = withApiAuth(
  async ({ profile, scoped }) => {
    // ACTUAL BUSINESS LOGIC - AUTH HANDLED
    const data = await scoped.pets.list()
    return NextResponse.json(data)
  },
  { roles: ['vet', 'admin'] }
)
```

**Lines of boilerplate**: 0 lines

**Savings**: ~30 lines per route × 279 routes = **8,370 lines eliminated**

---

## Automatic Features

### 1. Request Logging

All requests are logged with correlation IDs:

```typescript
export const GET = withApiAuth(async ({ log }) => {
  log.info('Processing request', { action: 'data.process' })
  log.warn('Rate limit approaching', { remaining: 10 })
  log.error('Database error', { error: dbError })

  // Logs include: requestId, tenant, userId, userRole, IP
})
```

### 2. Performance Tracking

Track performance checkpoints:

```typescript
export const GET = withApiAuth(async ({ perf }) => {
  perf.checkpoint('query_start')
  const data = await db.query()
  perf.checkpoint('query_complete')

  perf.checkpoint('processing_start')
  const result = processData(data)
  perf.checkpoint('processing_complete')

  // Automatically logged in response headers as x-response-time
})
```

### 3. Tenant-Scoped Queries

Automatic tenant filtering:

```typescript
export const GET = withApiAuth(async ({ scoped }) => {
  // Automatically filters by tenant_id
  const pets = await scoped.pets.list()
  const appointments = await scoped.appointments.list()

  // No need to add .eq('tenant_id', profile.tenant_id) manually
})
```

### 4. Error Handling

Errors are automatically caught and logged:

```typescript
export const GET = withApiAuth(async () => {
  throw new Error('Database connection failed')

  // Automatically:
  // - Logged with full context
  // - Sent to Sentry
  // - Returned as 500 with x-request-id header
  // - Performance timing recorded
})
```

---

## Common Patterns

### Pattern 1: Staff-Only Endpoint

```typescript
export const POST = withApiAuth(
  async ({ profile, supabase, log }) => {
    // Only vet/admin can access
    log.info('Creating invoice', { user: profile.id })
    // ... business logic
  },
  { roles: ['vet', 'admin'] }
)
```

### Pattern 2: Owner Can View Own Data

```typescript
export const GET = withApiAuthParams<{ petId: string }>(async ({ params, profile, supabase }) => {
  const { data: pet } = await supabase
    .from('pets')
    .select('*')
    .eq('id', params.petId)
    .eq('tenant_id', profile.tenant_id)
    .single()

  // Additional check: owners can only see their own pets
  const isStaff = ['vet', 'admin'].includes(profile.role)
  if (!isStaff && pet.owner_id !== profile.id) {
    return apiError('FORBIDDEN', 403)
  }

  return NextResponse.json(pet)
})
```

### Pattern 3: Public Endpoint (No Auth)

```typescript
// For truly public endpoints, don't use middleware
export async function GET(request: NextRequest) {
  // No authentication required
  return NextResponse.json({ status: 'ok' })
}
```

### Pattern 4: With Rate Limiting

```typescript
export const POST = withApiAuth(
  async ({ profile, supabase }) => {
    // Rate-limited endpoint
    // ...
  },
  {
    roles: ['owner', 'vet', 'admin'],
    rateLimit: 'strict', // 10 req/min
  }
)
```

---

## Migration Checklist

For each route being migrated:

- [ ] Remove manual `createClient()` call
- [ ] Remove manual `auth.getUser()` check
- [ ] Remove manual profile fetch
- [ ] Remove manual role checks
- [ ] Wrap handler in `withApiAuth` or `withApiAuthParams`
- [ ] Add role restrictions in options if needed
- [ ] Replace manual tenant filtering with `scoped` queries
- [ ] Update imports
- [ ] Test the route
- [ ] Verify diagnostics are clean

---

## Testing

### Unit Tests

Middleware handles auth - your route tests can focus on business logic:

```typescript
import { mockState, testStaffOnlyEndpoint } from '@/lib/test-utils'

// Test auth (1 line - generates 5 tests)
testStaffOnlyEndpoint(POST, createRequest, 'Create Invoice')

// Test business logic
describe('Business Logic', () => {
  beforeEach(() => {
    mockState.reset()
    mockState.setAuthScenario('VET')
  })

  it('creates invoice correctly', async () => {
    // Auth already mocked - focus on business logic
    const response = await POST(request)
    expect(response.status).toBe(200)
  })
})
```

---

## Migration Script

Use the automated migration helper:

```bash
# Generate migration for a specific route
npm run migrate:auth app/api/pets/route.ts

# Migrate an entire directory
npm run migrate:auth app/api/billing/

# Dry run (preview changes)
npm run migrate:auth app/api/pets/route.ts --dry-run
```

---

## Troubleshooting

### Issue 1: "Cannot read property 'role' of undefined"

**Cause**: Profile not loaded  
**Solution**: Middleware handles this - ensure you're using `withApiAuth`

### Issue 2: "Tenant isolation not working"

**Cause**: Using raw `supabase` client instead of `scoped`  
**Solution**: Use `scoped.pets.list()` instead of manual tenant filtering

### Issue 3: "Tests failing after migration"

**Cause**: Mock setup needs updating  
**Solution**: Use `mockState.setAuthScenario('VET')` instead of manual mocks

---

## Benefits Summary

| Benefit            | Impact                    |
| ------------------ | ------------------------- |
| **Code Reduction** | ~8,370 lines eliminated   |
| **Consistency**    | Same auth flow everywhere |
| **Logging**        | Automatic correlation IDs |
| **Performance**    | Built-in tracking         |
| **Security**       | Centralized validation    |
| **Testing**        | Simpler test setup        |
| **Debugging**      | Request IDs in headers    |
| **Monitoring**     | Sentry integration        |

---

## Examples in Codebase

**Good examples** (already migrated):

- `app/api/appointments/slots/route.ts`
- `app/api/pets/[id]/vaccines/route.ts`
- `app/api/store/products/route.ts`

**Needs migration**:

- `app/api/billing/invoices/route.ts` (manual auth)
- `app/api/inventory/adjust/route.ts` (manual auth)
- Most routes in `app/api/cron/` (could use middleware)

---

## FAQ

**Q: What about cron jobs?**  
A: Cron jobs can use middleware with `requireAuth: false` or skip it if they use API keys.

**Q: Can I use middleware for Server Actions?**  
A: No, use `withActionAuth` from `@/lib/auth` instead.

**Q: How do I add custom auth logic?**  
A: Add it inside the handler after middleware validates base auth:

```typescript
export const GET = withApiAuth(async ({ profile }) => {
  // Middleware validated auth + role

  // Custom logic
  if (profile.subscription_status !== 'active') {
    return apiError('SUBSCRIPTION_REQUIRED', 402)
  }

  // ...
})
```

**Q: Does this work with Edge Runtime?**  
A: Yes, middleware is compatible with Edge Runtime.

---

**Last Updated**: January 23, 2026  
**Migration Progress**: 32/311 routes (10%)  
**Target**: 100% by Q1 2026
