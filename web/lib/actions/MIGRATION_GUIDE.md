# Server Action Migration Guide

This guide explains how to migrate existing server actions to use the new `withActionAuth` wrapper.

## Overview

The `withActionAuth` wrapper provides:

- Automatic authentication and authorization
- Consistent error handling
- Access to user context (user, profile, isStaff, isAdmin, supabase)
- Type-safe action results

## Basic Pattern

### Before

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'

export async function myAction(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    return { success: false, error: 'No autorizado' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  // Business logic...

  return { success: true, data: result }
}
```

### After

```typescript
'use server'

import { withActionAuth, actionSuccess, actionError } from '@/lib/actions'

export const myAction = withActionAuth(
  async ({ user, profile, isStaff, isAdmin, supabase }, formData: FormData) => {
    // Business logic...

    return actionSuccess(result)
  }
)

// For staff-only actions:
export const staffAction = withActionAuth(
  async ({ supabase, profile }, data: string) => {
    // Only staff can access this
    return actionSuccess()
  },
  { requireStaff: true }
)

// For admin-only actions:
export const adminAction = withActionAuth(
  async ({ supabase }, data: string) => {
    // Only admin can access this
    return actionSuccess()
  },
  { requireAdmin: true }
)
```

## Migration Examples

### 1. Simple CRUD Action

```typescript
// BEFORE
export async function deletePet(petId: string): Promise<ActionResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'No autorizado' }
  }

  const { data: pet } = await supabase.from('pets').select('owner_id').eq('id', petId).single()

  if (!pet || pet.owner_id !== user.id) {
    return { success: false, error: 'No tienes permiso' }
  }

  const { error } = await supabase
    .from('pets')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', petId)

  if (error) {
    return { success: false, error: 'Error al eliminar' }
  }

  return { success: true }
}

// AFTER
export const deletePet = withActionAuth(async ({ user, supabase }, petId: string) => {
  const { data: pet } = await supabase.from('pets').select('owner_id').eq('id', petId).single()

  if (!pet || pet.owner_id !== user.id) {
    return actionError('No tienes permiso')
  }

  const { error } = await supabase
    .from('pets')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', petId)

  if (error) {
    return actionError('Error al eliminar')
  }

  return actionSuccess()
})
```

### 2. Staff-Only Action with Validation

```typescript
// BEFORE
export async function createInvoice(formData: InvoiceFormData): Promise<InvoiceResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No autorizado' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || !['vet', 'admin'].includes(profile.role)) {
    return { error: 'Solo el personal puede crear facturas' }
  }

  if (!formData.pet_id) {
    return { error: 'Debe seleccionar una mascota' }
  }

  // Create invoice logic...

  return { success: true, data: invoice }
}

// AFTER
export const createInvoice = withActionAuth(
  async ({ user, profile, supabase }, formData: InvoiceFormData) => {
    if (!formData.pet_id) {
      return actionError('Debe seleccionar una mascota')
    }

    // Create invoice logic...

    return actionSuccess(invoice)
  },
  { requireStaff: true } // Automatically checks for vet/admin role
)
```

### 3. Mixed Permission Action (Owner or Staff)

```typescript
// BEFORE
export async function updatePet(petId: string, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'No autorizado' }
  }

  const { data: pet } = await supabase
    .from('pets')
    .select('owner_id, tenant_id')
    .eq('id', petId)
    .single()

  if (!pet) {
    return { success: false, error: 'Mascota no encontrada' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  const isOwner = pet.owner_id === user.id
  const isStaff = profile?.role === 'vet' || profile?.role === 'admin'
  const sameTenant = profile?.tenant_id === pet.tenant_id

  if (!isOwner && !(isStaff && sameTenant)) {
    return { success: false, error: 'No tienes permiso' }
  }

  // Update logic...
}

// AFTER
export const updatePet = withActionAuth(
  async ({ user, profile, isStaff, supabase }, petId: string, formData: FormData) => {
    const { data: pet } = await supabase
      .from('pets')
      .select('owner_id, tenant_id')
      .eq('id', petId)
      .single()

    if (!pet) {
      return actionError('Mascota no encontrada')
    }

    const isOwner = pet.owner_id === user.id
    const sameTenant = profile.tenant_id === pet.tenant_id

    if (!isOwner && !(isStaff && sameTenant)) {
      return actionError('No tienes permiso')
    }

    // Update logic...
  }
)
```

### 4. Action with Field Validation Errors

```typescript
// BEFORE
export async function updateProfile(prevState: unknown, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'No autorizado' }
  }

  const validation = schema.safeParse(rawData)
  if (!validation.success) {
    const fieldErrors: FieldErrors = {}
    for (const issue of validation.error.issues) {
      const fieldName = issue.path[0] as string
      fieldErrors[fieldName] = issue.message
    }

    return {
      success: false,
      error: 'Errores de validación',
      fieldErrors,
    }
  }

  // Update logic...
}

// AFTER
export const updateProfile = withActionAuth(
  async ({ user, supabase }, prevState: unknown, formData: FormData) => {
    const validation = schema.safeParse(rawData)

    if (!validation.success) {
      const fieldErrors: FieldErrors = {}
      for (const issue of validation.error.issues) {
        const fieldName = issue.path[0] as string
        fieldErrors[fieldName] = issue.message
      }

      return actionError('Errores de validación', fieldErrors)
    }

    // Update logic...
  }
)
```

## Available Context Properties

The action context provides:

```typescript
interface ActionContext {
  user: { id: string; email: string } // Authenticated user
  profile: {
    id: string
    tenant_id: string
    role: string // 'owner', 'vet', 'admin'
    full_name: string
  }
  isStaff: boolean // true if role is 'vet' or 'admin'
  isAdmin: boolean // true if role is 'admin'
  supabase: SupabaseClient // Pre-configured Supabase client
}
```

## Options

```typescript
interface ActionAuthOptions {
  requireStaff?: boolean // Require 'vet' or 'admin' role
  requireAdmin?: boolean // Require 'admin' role
  tenantId?: string // Require specific tenant (not commonly used)
}
```

## Helper Functions

```typescript
import { actionSuccess, actionError } from '@/lib/actions'

// Success with data
return actionSuccess(myData)

// Success without data
return actionSuccess()

// Error with message
return actionError('Error message')

// Error with field validation
return actionError('Validation failed', {
  email: 'Invalid email',
  phone: 'Invalid phone',
})
```

## Migration Checklist

When migrating an action:

1. [ ] Import `withActionAuth`, `actionSuccess`, `actionError` from `@/lib/actions`
2. [ ] Remove manual `createClient()` and `auth.getUser()` calls
3. [ ] Remove manual profile fetching unless needed for specific fields
4. [ ] Wrap action function with `withActionAuth()`
5. [ ] Use destructured context: `{ user, profile, isStaff, isAdmin, supabase }`
6. [ ] Replace `return { success: false, error }` with `return actionError()`
7. [ ] Replace `return { success: true, data }` with `return actionSuccess(data)`
8. [ ] Add `requireStaff` or `requireAdmin` option if applicable
9. [ ] Update function signature to match new pattern
10. [ ] Test the migrated action

## Common Patterns

### Pattern 1: Owner or Staff Access

```typescript
export const action = withActionAuth(async ({ user, profile, isStaff, supabase }, id: string) => {
  const { data: resource } = await supabase
    .from('table')
    .select('owner_id, tenant_id')
    .eq('id', id)
    .single()

  if (!resource) {
    return actionError('No encontrado')
  }

  const isOwner = resource.owner_id === user.id
  const sameTenant = profile.tenant_id === resource.tenant_id

  if (!isOwner && !(isStaff && sameTenant)) {
    return actionError('No tienes permiso')
  }

  // Proceed with action...
})
```

### Pattern 2: Staff Only

```typescript
export const action = withActionAuth(
  async ({ profile, supabase }, data: FormData) => {
    // Only staff can access - no need to check permissions
    // ...
  },
  { requireStaff: true }
)
```

### Pattern 3: Admin Only

```typescript
export const action = withActionAuth(
  async ({ supabase }, tenantId: string) => {
    // Only admin can access
    // ...
  },
  { requireAdmin: true }
)
```

### Pattern 4: Tenant Isolation

```typescript
export const action = withActionAuth(async ({ profile, supabase }, resourceId: string) => {
  // Always verify tenant_id on queries
  const { data, error } = await supabase
    .from('table')
    .select('*')
    .eq('id', resourceId)
    .eq('tenant_id', profile.tenant_id) // ✅ Tenant isolation
    .single()

  // NOT like this:
  // .eq('id', resourceId).single() // ❌ Missing tenant check
})
```

## Benefits

1. **Less Boilerplate**: No need to manually check auth in every action
2. **Consistent Error Handling**: Standardized error messages and codes
3. **Type Safety**: Full TypeScript support with proper types
4. **Centralized Logic**: Auth logic in one place, easy to update
5. **Better Security**: Harder to forget auth checks
6. **Cleaner Code**: Focus on business logic, not plumbing

## Notes

- The wrapper automatically handles try/catch for internal errors
- Profile is always fetched - no need to fetch it again unless you need additional fields
- `isStaff` and `isAdmin` are pre-computed for convenience
- All actions should use the wrapper for consistency
- Non-authenticated actions (like public pages) don't need this wrapper
