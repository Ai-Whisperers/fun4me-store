# Supabase API Route Pattern Exemplar

## Overview

Pattern for creating API routes with Supabase in the veterinary platform.

## When to Use

- **Use for**: CRUD operations, data mutations, integrations
- **Critical for**: Any endpoint that reads/writes database

## Good Pattern

```typescript
// app/api/pets/route.ts

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Zod schema for validation
const createPetSchema = z.object({
  name: z.string().min(1).max(100),
  species: z.enum(['dog', 'cat', 'bird', 'other']),
  breed: z.string().optional(),
  birth_date: z.string().datetime().optional(),
  weight_kg: z.number().positive().optional(),
})

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // 1. Authentication check
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json(
      { error: 'No autorizado' },
      { status: 401 }
    )
  }

  // 2. Get user profile for tenant context
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('clinic_id, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json(
      { error: 'Perfil no encontrado' },
      { status: 404 }
    )
  }

  // 3. Query params for filtering
  const { searchParams } = new URL(request.url)
  const species = searchParams.get('species')

  // 4. Build query with tenant isolation
  let query = supabase
    .from('pets')
    .select(`
      id,
      name,
      species,
      breed,
      birth_date,
      weight_kg,
      created_at,
      owner:profiles!owner_id(id, full_name)
    `)

  // Staff sees all clinic pets, owners see only their own
  if (['vet', 'admin'].includes(profile.role)) {
    query = query.eq('clinic_id', profile.clinic_id)
  } else {
    query = query.eq('owner_id', user.id)
  }

  // Apply optional filters
  if (species) {
    query = query.eq('species', species)
  }

  // 5. Execute query
  const { data, error } = await query.order('name')

  if (error) {
    console.error('[API] pets GET error:', error)
    return NextResponse.json(
      { error: 'Error al obtener mascotas' },
      { status: 500 }
    )
  }

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // 1. Authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json(
      { error: 'No autorizado' },
      { status: 401 }
    )
  }

  // 2. Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('clinic_id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json(
      { error: 'Perfil no encontrado' },
      { status: 404 }
    )
  }

  // 3. Parse and validate body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'JSON inválido' },
      { status: 400 }
    )
  }

  const validation = createPetSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Datos inválidos',
        details: validation.error.flatten().fieldErrors
      },
      { status: 400 }
    )
  }

  // 4. Insert with tenant context
  const { data, error } = await supabase
    .from('pets')
    .insert({
      ...validation.data,
      owner_id: user.id,
      clinic_id: profile.clinic_id,
    })
    .select()
    .single()

  if (error) {
    console.error('[API] pets POST error:', error)
    return NextResponse.json(
      { error: 'Error al crear mascota' },
      { status: 500 }
    )
  }

  return NextResponse.json(data, { status: 201 })
}
```

**Why this is good:**
- Always checks authentication first
- Gets profile for tenant context
- Role-based query filtering (staff vs owner)
- Zod validation for request body
- Explicit error messages in Spanish
- Returns appropriate HTTP status codes
- Logs errors for debugging
- Uses parameterized queries (RLS handles SQL injection)
- Includes related data in response

## Bad Pattern

```typescript
// app/api/pets/route.ts

import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data } = await supabase.from('pets').select('*')
  return Response.json(data)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { data } = await supabase.from('pets').insert(body)
  return Response.json(data)
}
```

**Why this is bad:**
- No authentication check (anyone can call)
- No tenant isolation (returns ALL pets in database)
- No validation (accepts any data)
- No error handling (will crash on failure)
- Uses client-side supabase (no server context)
- No role checking (owner could see others' pets)
- Direct body insertion (no sanitization)
- Generic Response instead of NextResponse

## Common Patterns

### DELETE with ownership check
```typescript
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // RLS ensures user can only delete their own
  const { error } = await supabase
    .from('pets')
    .delete()
    .eq('id', id)
    .eq('owner_id', user.id)  // Double-check ownership

  if (error) {
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
```

### PATCH with partial updates
```typescript
const updatePetSchema = createPetSchema.partial()

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const validation = updatePetSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  // ... auth checks ...

  const { data, error } = await supabase
    .from('pets')
    .update(validation.data)
    .eq('id', id)
    .select()
    .single()

  return NextResponse.json(data)
}
```

### Staff-only endpoint
```typescript
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, clinic_id')
    .eq('id', user.id)
    .single()

  // Require staff role
  if (!profile || !['vet', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  // Staff-only query
  const { data } = await supabase
    .from('appointments')
    .select('*')
    .eq('clinic_id', profile.clinic_id)

  return NextResponse.json(data)
}
```

## Final Must-Pass Checklist

- [ ] Uses `createClient` from `@/lib/supabase/server`
- [ ] Checks `auth.getUser()` for authentication
- [ ] Returns 401 for unauthenticated requests
- [ ] Gets profile for clinic_id context
- [ ] Filters queries by clinic_id or owner_id
- [ ] Uses Zod for request body validation
- [ ] Returns proper HTTP status codes
- [ ] Error messages in Spanish
- [ ] Logs errors with context
- [ ] No direct body insertion (always validate)
