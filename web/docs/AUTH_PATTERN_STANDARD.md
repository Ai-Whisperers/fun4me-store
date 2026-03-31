# API Authentication Pattern Standard

**TICKET**: TICKET-SEC-004  
**EPIC**: EPIC-001-Security-Vulnerabilities  
**Status**: Standardized as of January 2026

---

## Standard Pattern (USE THIS)

All API routes MUST use the `withApiAuth` wrapper:

```typescript
import { withApiAuth } from '@/lib/auth'
import { apiSuccess, apiError, HTTP_STATUS } from '@/lib/api/errors'

export const GET = withApiAuth(
  async ({ profile, supabase, scoped, log, perf }) => {
    log.info('Fetching data')
    perf.checkpoint('start-query')
    
    // CORRECT: Use scoped queries for automatic tenant filtering
    const { data, error } = await scoped.pets.findMany()
    
    // OR: Manual tenant filtering
    const { data, error } = await supabase
      .from('pets')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
    
    perf.checkpoint('query-complete')
    
    if (error) {
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
    
    return apiSuccess(data)
  },
  {
    roles: ['vet', 'admin'], // Optional: restrict to specific roles
    requireTenant: true,      // Optional: ensure user has tenant
    rateLimit: 'standard',    // Optional: apply rate limiting
  }
)
```

---

## What `withApiAuth` Provides

| Feature | Description |
|---------|-------------|
| **Authentication** | Automatically checks `supabase.auth.getUser()` |
| **Profile Loading** | Loads user profile with `tenant_id` and `role` |
| **Tenant Context** | Provides `profile.tenant_id` for all queries |
| **Scoped Queries** | `scoped.*` builders with automatic tenant filtering |
| **Request Logging** | `log.info/warn/error` with automatic context |
| **Performance Tracking** | `perf.checkpoint()` for timing analysis |
| **Error Handling** | Consistent error responses |
| **Rate Limiting** | Optional rate limiting per endpoint |
| **Sentry Integration** | Automatic error tracking |

---

## Anti-Patterns (DON'T DO THIS)

### ❌ Manual Auth (Verbose)
```typescript
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  
  // DON'T: Manual auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // DON'T: Manual profile fetch
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()
  
  if (!profile) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  // ... rest of handler
}
```

**Problem**: Verbose, error-prone, inconsistent

### ❌ No Tenant Filtering
```typescript
export const GET = withApiAuth(async ({ supabase }) => {
  // CRITICAL BUG: Missing tenant filter!
  const { data } = await supabase
    .from('pets')
    .select('*')
  
  return NextResponse.json(data)
})
```

**Problem**: Cross-tenant data leakage

### ❌ Hardcoded User IDs
```typescript
function getAuthenticatedUserId(): string {
  return 'mock-user-123' // ❌ CRITICAL VULNERABILITY
}
```

**Problem**: Authentication bypass

---

## Migration Script

To update non-compliant routes:

```bash
# Run audit to find non-compliant routes
npm run audit:auth

# Review findings
cat auth-audit-report.csv

# Update routes manually following the standard pattern
```

---

## Scoped Queries (Automatic Tenant Filtering)

The `scoped` object provides tenant-aware query builders:

```typescript
export const GET = withApiAuth(async ({ scoped }) => {
  // Automatically filters by tenant_id
  const pets = await scoped.pets.findMany()
  const appointments = await scoped.appointments.findMany({ status: 'scheduled' })
  const invoices = await scoped.invoices.findById('invoice-123')
  
  return apiSuccess({ pets, appointments, invoices })
})
```

Available scoped methods:
- `findMany(filters?)` - Find all records in tenant
- `findById(id)` - Find single record by ID (tenant-scoped)
- `create(data)` - Create new record with automatic `tenant_id`
- `update(id, data)` - Update record (tenant-scoped)
- `delete(id)` - Delete record (tenant-scoped)

---

## Rate Limiting

Apply rate limiting to prevent abuse:

```typescript
export const POST = withApiAuth(
  async ({ profile, supabase }) => {
    // ... mutation logic
  },
  {
    rateLimit: 'mutation', // 100 requests per 15 minutes
    roles: ['vet', 'admin'],
  }
)
```

Available rate limit types:
- `standard` - 300/15min (read operations)
- `mutation` - 100/15min (write operations)
- `strict` - 30/15min (sensitive operations)
- `auth` - 10/15min (authentication endpoints)

---

## Role-Based Access Control

Restrict endpoints to specific roles:

```typescript
export const DELETE = withApiAuth(
  async ({ profile, supabase }) => {
    // Only admins can delete
  },
  {
    roles: ['admin'], // Rejects vet, owner
  }
)

export const GET = withApiAuth(
  async ({ profile, supabase }) => {
    // Staff (vet or admin) can view
  },
  {
    roles: ['vet', 'admin'],
  }
)
```

---

## Request Logging Best Practices

Use the request-scoped logger for all logs:

```typescript
export const POST = withApiAuth(async ({ log, profile }) => {
  log.info('Creating appointment', {
    action: 'appointments.create',
    petId: '...',
  })
  
  try {
    // ... operation
    log.info('Appointment created', { appointmentId: '...' })
  } catch (error) {
    log.error('Failed to create appointment', {
      error: error.message,
      action: 'appointments.create',
    })
    throw error
  }
})
```

Logger automatically includes:
- `requestId` - For log correlation
- `tenantId` - From profile
- `userId` - From profile
- `path` - Request path
- `method` - HTTP method

---

## Performance Tracking

Use checkpoints to measure timing:

```typescript
export const GET = withApiAuth(async ({ perf, supabase }) => {
  perf.checkpoint('start')
  
  const { data: pets } = await supabase.from('pets').select('*')
  perf.checkpoint('pets-loaded')
  
  const { data: appointments } = await supabase.from('appointments').select('*')
  perf.checkpoint('appointments-loaded')
  
  // Automatically logged on response with all checkpoint durations
  
  return apiSuccess({ pets, appointments })
})
```

---

## Checklist for New API Routes

Before merging any new API route:

- [ ] Uses `withApiAuth` wrapper
- [ ] All queries filter by `tenant_id` (or use `scoped` queries)
- [ ] Uses `apiSuccess` / `apiError` for responses
- [ ] Includes role restrictions if needed
- [ ] Has rate limiting on mutations
- [ ] Uses request logger (`log.*`)
- [ ] Has performance checkpoints for slow operations
- [ ] Validated with `npm run audit:auth`

---

## See Also

- `/lib/auth/api-wrapper.ts` - Implementation
- `/lib/supabase/scoped.ts` - Scoped query builders
- `/lib/api/errors.ts` - Error handling
- `TICKET-SEC-001`, `TICKET-SEC-002` - Security fixes
