# Authentication Patterns

Centralized authentication and authorization system for API routes and Server Actions.

> **Location**: `web/lib/auth/`
> **Last Updated**: January 2026

---

## Overview

The authentication system provides:
- Unified auth wrappers for API routes and Server Actions
- Role-based access control (owner, vet, admin)
- Tenant isolation with automatic scoping
- Rate limiting integration
- Type-safe context objects

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Request                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   withApiAuth / withActionAuth               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │ AuthService     │  │ Rate Limiting   │  │ Role Check  │  │
│  │ .validateAuth() │  │ (optional)      │  │             │  │
│  └────────┬────────┘  └────────┬────────┘  └──────┬──────┘  │
└───────────┼────────────────────┼──────────────────┼─────────┘
            │                    │                  │
            ▼                    ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    Handler Context                           │
│  user, profile, supabase, scoped (tenant queries)           │
└─────────────────────────────────────────────────────────────┘
```

---

## User Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| `owner` | Pet owners | Own pets, book appointments, view records |
| `vet` | Veterinarians | All patients, prescriptions, clinical tools |
| `admin` | Clinic admins | Everything + settings, team, finances |

---

## API Route Wrappers

### withApiAuth

Use for standard API routes without dynamic parameters.

```typescript
import { withApiAuth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export const GET = withApiAuth(
  async ({ user, profile, supabase, scoped, request }) => {
    // scoped provides tenant-filtered queries
    const { data } = await scoped.pets.select('*')

    return NextResponse.json(data)
  },
  {
    roles: ['vet', 'admin'],     // Optional: restrict to specific roles
    requireTenant: true,          // Optional: require tenant context
    requireActive: true,          // Optional: require active account
    rateLimit: 'search',          // Optional: apply rate limiting
  }
)
```

### withApiAuthParams

Use for routes with dynamic parameters (e.g., `/api/pets/[id]`).

```typescript
import { withApiAuthParams } from '@/lib/auth'

export const GET = withApiAuthParams<{ id: string }>(
  async ({ profile, supabase }, params) => {
    const { data } = await supabase
      .from('pets')
      .select('*')
      .eq('id', params.id)
      .single()

    return NextResponse.json(data)
  },
  { roles: ['vet', 'admin'] }
)
```

---

## Server Action Wrappers

### withActionAuth

Use for server actions that require authentication.

```typescript
'use server'

import { withActionAuth } from '@/lib/auth'
import { actionSuccess, actionError } from '@/lib/actions/result'

export const createAppointment = withActionAuth(
  async ({ profile, supabase }, appointmentData: AppointmentInput) => {
    const { data, error } = await supabase
      .from('appointments')
      .insert({
        ...appointmentData,
        tenant_id: profile.tenant_id,
      })
      .select()
      .single()

    if (error) {
      return actionError('Error al crear cita')
    }

    return actionSuccess(data)
  },
  { roles: ['vet', 'admin'] }
)
```

---

## Context Objects

### ApiHandlerContext

Available in `withApiAuth` handlers:

```typescript
interface ApiHandlerContext {
  user: User              // Supabase auth user
  profile: UserProfile    // User's profile with role/tenant
  supabase: SupabaseClient
  request: NextRequest
  scoped: ScopedQueries   // Tenant-filtered query builders
}
```

### AuthContext

Available in `withActionAuth` handlers:

```typescript
interface AuthContext {
  user: User
  profile: UserProfile
  supabase: SupabaseClient
}
```

### UserProfile

```typescript
interface UserProfile {
  id: string
  tenant_id: string
  role: 'owner' | 'vet' | 'admin'
  full_name: string
  email: string
  phone?: string
  is_active: boolean
  avatar_url?: string
  created_at: string
}
```

---

## Scoped Queries

The `scoped` object provides tenant-filtered query builders:

```typescript
export const GET = withApiAuth(async ({ scoped }) => {
  // All queries automatically filter by tenant_id
  const pets = await scoped.pets.select('*')
  const appointments = await scoped.appointments.select('*')
  const invoices = await scoped.invoices.select('*')

  return NextResponse.json({ pets, appointments, invoices })
})
```

---

## Authorization Utilities

### Role Checks

```typescript
import { isStaff, isAdmin, requireOwnership } from '@/lib/auth'

// Check if user is staff (vet or admin)
if (isStaff(profile)) {
  // Allow staff actions
}

// Check if user is admin
if (isAdmin(profile)) {
  // Allow admin-only actions
}

// Check if user can access resource (owner or staff)
if (requireOwnership(resourceOwnerId, { profile })) {
  // Allow access
}
```

### Tenant Checks

```typescript
import { belongsToTenant, requireTenantAccess } from '@/lib/auth'

// Check tenant membership
if (belongsToTenant(profile, tenantId)) {
  // User belongs to tenant
}

// Check tenant access (includes admin bypass)
if (requireTenantAccess(tenantId, context)) {
  // User can access tenant resources
}
```

---

## Options Reference

### ApiRouteOptions

```typescript
interface ApiRouteOptions {
  roles?: UserRole[]           // Allowed roles
  requireTenant?: boolean      // Require tenant_id in profile
  requireActive?: boolean      // Require active account
  rateLimit?: RateLimitType    // Rate limit type to apply
}
```

### ActionOptions

```typescript
interface ActionOptions {
  roles?: UserRole[]           // Allowed roles
  requireTenant?: boolean      // Require tenant_id in profile
  tenantId?: string            // Specific tenant required
  requireActive?: boolean      // Require active account
}
```

---

## Error Responses

The wrappers automatically return appropriate errors:

| Condition | Error Code | HTTP Status |
|-----------|------------|-------------|
| Not authenticated | `UNAUTHORIZED` | 401 |
| Wrong role | `INSUFFICIENT_ROLE` | 403 |
| Inactive account | `ACCOUNT_INACTIVE` | 403 |
| Wrong tenant | `TENANT_MISMATCH` | 403 |
| Rate limited | `RATE_LIMITED` | 429 |

---

## Complete Examples

### Full API Route

```typescript
// app/api/pets/route.ts
import { withApiAuth } from '@/lib/auth'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const createPetSchema = z.object({
  name: z.string().min(1),
  species: z.enum(['dog', 'cat', 'bird', 'other']),
})

export const GET = withApiAuth(
  async ({ scoped }) => {
    const { data, error } = await scoped.pets.select('*')

    if (error) {
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    return NextResponse.json(data)
  }
)

export const POST = withApiAuth(
  async ({ request, profile, supabase }) => {
    const body = await request.json()
    const validated = createPetSchema.parse(body)

    const { data, error } = await supabase
      .from('pets')
      .insert({
        ...validated,
        owner_id: profile.id,
        tenant_id: profile.tenant_id,
      })
      .select()
      .single()

    if (error) {
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    return NextResponse.json(data, { status: 201 })
  },
  { rateLimit: 'write' }
)
```

### Full Server Action

```typescript
// app/actions/appointments.ts
'use server'

import { withActionAuth } from '@/lib/auth'
import { actionSuccess, actionError } from '@/lib/actions/result'
import { revalidatePath } from 'next/cache'

interface CancelInput {
  appointmentId: string
  reason?: string
}

export const cancelAppointment = withActionAuth<void, [CancelInput]>(
  async ({ profile, supabase }, { appointmentId, reason }) => {
    // Verify ownership or staff
    const { data: appointment } = await supabase
      .from('appointments')
      .select('pet_id, tenant_id')
      .eq('id', appointmentId)
      .single()

    if (!appointment) {
      return actionError('Cita no encontrada')
    }

    if (appointment.tenant_id !== profile.tenant_id) {
      return actionError('Sin permisos')
    }

    // Cancel appointment
    const { error } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
      })
      .eq('id', appointmentId)

    if (error) {
      return actionError('Error al cancelar cita')
    }

    revalidatePath('/[clinic]/portal/schedule')
    return actionSuccess()
  },
  { roles: ['owner', 'vet', 'admin'] }
)
```

---

## Migration from Legacy Patterns

### Old Pattern (Deprecated)

```typescript
// OLD - manual auth checking
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // ... rest of handler
}
```

### New Pattern (Recommended)

```typescript
// NEW - using withApiAuth
export const GET = withApiAuth(
  async ({ user, profile, supabase }) => {
    // Authentication already handled
    // ... handler logic
  }
)
```

---

## Best Practices

### DO

- Use `withApiAuth` for all API routes
- Use `withActionAuth` for all server actions
- Use `scoped` queries for tenant isolation
- Specify `roles` when access is restricted
- Use rate limiting on sensitive endpoints

### DON'T

- Manually check authentication in handlers
- Trust client-provided tenant IDs
- Skip role checks for sensitive operations
- Bypass auth wrappers with raw supabase queries

---

## Related Documentation

- [Error Handling](error-handling.md)
- [Rate Limiting](rate-limiting.md)
- [API Overview](../api/overview.md)
- [Database RLS Policies](../database/rls-policies.md)
