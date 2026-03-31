# Add API Route

Create a new API route following the project's established patterns.

## API Route Structure

All API routes live in `web/app/api/[resource]/route.ts`

## Standard Pattern

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user's clinic context
  const { data: profile } = await supabase
    .from('profiles')
    .select('clinic_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  // Fetch data (RLS automatically filters by tenant)
  const { data, error } = await supabase
    .from('your_table')
    .select('*')
    .eq('clinic_id', profile.clinic_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse and validate body
  const body = await request.json()
  // Use Zod for validation

  // Insert data
  const { data, error } = await supabase
    .from('your_table')
    .insert(body)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
```

## Key Requirements

1. **Authentication**: Always check `supabase.auth.getUser()` first
2. **Authorization**: Verify user role if needed (`profile.role`)
3. **Tenant Isolation**: Filter by `clinic_id` for multi-tenant data
4. **Error Handling**: Return appropriate HTTP status codes
5. **Validation**: Use Zod for request body validation
6. **Type Safety**: Define TypeScript types for request/response

## Common HTTP Status Codes

- `200` - OK (GET success)
- `201` - Created (POST success)
- `400` - Bad Request (validation error)
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (not allowed)
- `404` - Not Found
- `500` - Server Error

## Testing

Create test file at `web/tests/api/[resource].test.ts`:

```typescript
import { describe, it, expect } from 'vitest'

describe('GET /api/[resource]', () => {
  it('should return 401 without auth', async () => {
    // Test implementation
  })

  it('should return data for authenticated user', async () => {
    // Test implementation
  })
})
```

## Checklist

- [ ] Route created at correct path
- [ ] Authentication check implemented
- [ ] Authorization check (if role-specific)
- [ ] Tenant isolation via clinic_id
- [ ] Request validation with Zod
- [ ] Proper error responses
- [ ] TypeScript types defined
- [ ] Tests written
