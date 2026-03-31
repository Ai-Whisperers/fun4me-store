# Test Utilities - Usage Examples

Real-world examples of using the test utilities in different testing scenarios.

## Testing API Routes

```typescript
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/pets/route'
import { createSupabaseMock, createMockPet, createMockProfile } from '@/lib/test-utils'

describe('GET /api/pets', () => {
  it('returns pets for authenticated owner', async () => {
    const { supabase, helpers } = createSupabaseMock()
    const owner = createMockProfile({ role: 'owner' })
    const pets = [
      createMockPet({ name: 'Max', owner_id: owner.id }),
      createMockPet({ name: 'Luna', owner_id: owner.id }),
    ]

    // Mock authentication
    helpers.setUser({ id: owner.id, email: owner.email })

    // Mock database query
    helpers.setQueryResult(pets)

    // Create request
    const request = new NextRequest('http://localhost:3000/api/pets')

    // Test the route
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(2)
  })

  it('returns 401 for unauthenticated users', async () => {
    const { supabase, helpers } = createSupabaseMock()

    // No user set - unauthenticated
    helpers.setUser(null)

    const request = new NextRequest('http://localhost:3000/api/pets')
    const response = await GET(request)

    expect(response.status).toBe(401)
  })
})
```

## Testing Server Actions

```typescript
import { createAppointment } from '@/app/actions/appointments'
import {
  createSupabaseMock,
  createMockPet,
  createMockProfile,
  createMockService,
} from '@/lib/test-utils'

describe('createAppointment', () => {
  it('creates an appointment with valid data', async () => {
    const { supabase, helpers } = createSupabaseMock()
    const owner = createMockProfile({ role: 'owner' })
    const pet = createMockPet({ owner_id: owner.id })
    const service = createMockService()

    helpers.setUser({ id: owner.id, email: owner.email })
    helpers.setQueryResult(pet) // For pet ownership check

    const result = await createAppointment({
      petId: pet.id,
      serviceId: service.id,
      startTime: new Date().toISOString(),
      reason: 'Consulta general',
    })

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
  })
})
```

## Testing Components with Data Fetching

```typescript
import { render, screen, waitFor } from '@/lib/test-utils'
import { PetList } from '@/components/pets/pet-list'
import { createMockPet, createSupabaseMock } from '@/lib/test-utils'

describe('PetList', () => {
  it('displays list of pets', async () => {
    const pets = [
      createMockPet({ name: 'Max', species: 'dog' }),
      createMockPet({ name: 'Whiskers', species: 'cat' })
    ]

    const { supabase, helpers } = createSupabaseMock()
    helpers.setQueryResult(pets)

    render(<PetList />)

    await waitFor(() => {
      expect(screen.getByText('Max')).toBeInTheDocument()
      expect(screen.getByText('Whiskers')).toBeInTheDocument()
    })
  })

  it('shows loading state', () => {
    render(<PetList />)
    expect(screen.getByText('Cargando...')).toBeInTheDocument()
  })

  it('handles errors gracefully', async () => {
    const { supabase, helpers } = createSupabaseMock()
    helpers.setError(new Error('Failed to fetch'))

    render(<PetList />)

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument()
    })
  })
})
```

## Testing Multi-Tenant Scenarios

```typescript
import { createMockPet, createMockProfile, createSupabaseMock } from '@/lib/test-utils'

describe('Multi-tenant isolation', () => {
  it('prevents cross-tenant data access', async () => {
    const { supabase, helpers } = createSupabaseMock()

    // Clinic A
    const clinicA = 'terrapet'
    const ownerA = createMockProfile({ tenant_id: clinicA })
    const petA = createMockPet({ tenant_id: clinicA, owner_id: ownerA.id })

    // Clinic B
    const clinicB = 'petlife'
    const ownerB = createMockProfile({ tenant_id: clinicB })

    // User from Clinic B trying to access Clinic A data
    helpers.setUser({ id: ownerB.id, email: ownerB.email })
    helpers.setQueryResult([]) // RLS should prevent access

    const result = await supabase.from('pets').select('*').eq('id', petA.id)

    // Should not return pet from different tenant
    expect(result.data).toHaveLength(0)
  })
})
```

## Testing Batch Operations

```typescript
import { createMockPets, createSupabaseMock } from '@/lib/test-utils'

describe('Batch pet operations', () => {
  it('updates multiple pets at once', async () => {
    const { supabase, helpers } = createSupabaseMock()
    const pets = createMockPets(10, { species: 'dog' })

    helpers.setQueryResult(pets)

    // Batch update all dogs
    const result = await supabase.from('pets').update({ is_neutered: true }).eq('species', 'dog')

    expect(result.error).toBeNull()
  })
})
```

## Testing Appointment Scheduling

```typescript
import { createMockAppointment, createMockAppointments, createSupabaseMock } from '@/lib/test-utils'

describe('Appointment scheduling', () => {
  it('detects overlapping appointments', () => {
    const appointment1 = createMockAppointment({
      start_time: '2024-01-15T10:00:00Z',
      end_time: '2024-01-15T10:30:00Z',
    })

    const appointment2 = createMockAppointment({
      start_time: '2024-01-15T10:15:00Z',
      end_time: '2024-01-15T10:45:00Z',
    })

    // Check overlap logic
    const start1 = new Date(appointment1.start_time)
    const end1 = new Date(appointment1.end_time)
    const start2 = new Date(appointment2.start_time)
    const end2 = new Date(appointment2.end_time)

    const hasOverlap = start1 < end2 && start2 < end1
    expect(hasOverlap).toBe(true)
  })

  it('generates daily appointment slots', () => {
    const appointments = createMockAppointments(5)

    // All should be in the future
    appointments.forEach((apt) => {
      const startTime = new Date(apt.start_time)
      expect(startTime.getTime()).toBeGreaterThan(Date.now())
    })
  })
})
```

## Testing Invoice Calculations

```typescript
import { createMockInvoice, createSupabaseMock } from '@/lib/test-utils'

describe('Invoice calculations', () => {
  it('calculates totals correctly', () => {
    const invoice = createMockInvoice({
      subtotal: 100000,
      discount_amount: 10000,
    })

    const expectedSubtotal = 90000 // After discount
    const expectedTax = 9000 // 10%
    const expectedTotal = 99000

    expect(invoice.subtotal - invoice.discount_amount).toBe(expectedSubtotal)
  })

  it('tracks payment balance', () => {
    const invoice = createMockInvoice({
      total_amount: 100000,
      amount_paid: 60000,
    })

    expect(invoice.balance_due).toBe(40000)
  })
})
```

## Testing Role-Based Access

```typescript
import { createMockProfile, createSupabaseMock } from '@/lib/test-utils'

describe('Role-based access', () => {
  it('allows vets to access all pets in tenant', async () => {
    const { supabase, helpers } = createSupabaseMock()
    const vet = createMockProfile({ role: 'vet', tenant_id: 'terrapet' })

    helpers.setUser({ id: vet.id, email: vet.email })

    // Vet should be able to query all pets
    const result = await supabase.from('pets').select('*').eq('tenant_id', 'terrapet')

    expect(result.error).toBeNull()
  })

  it('restricts owners to their own pets', async () => {
    const { supabase, helpers } = createSupabaseMock()
    const owner = createMockProfile({ role: 'owner', tenant_id: 'terrapet' })

    helpers.setUser({ id: owner.id, email: owner.email })

    // Owner should only see their pets
    const result = await supabase.from('pets').select('*').eq('owner_id', owner.id)

    expect(result.error).toBeNull()
  })
})
```

## Testing Complex Queries

```typescript
import { createMockPet, createMockAppointments, createSupabaseMock } from '@/lib/test-utils'

describe('Complex queries', () => {
  it('fetches pet with appointments and medical records', async () => {
    const { supabase, helpers } = createSupabaseMock()
    const pet = createMockPet({ name: 'Max' })
    const appointments = createMockAppointments(3, { pet_id: pet.id })

    const petWithRelations = {
      ...pet,
      appointments,
    }

    helpers.setQueryResult(petWithRelations)

    const result = await supabase
      .from('pets')
      .select(
        `
        *,
        appointments (*)
      `
      )
      .eq('id', pet.id)
      .single()

    expect(result.data.appointments).toHaveLength(3)
  })
})
```

## Testing Error Recovery

```typescript
import { createSupabaseMock } from '@/lib/test-utils'

describe('Error handling', () => {
  it('retries failed operations', async () => {
    const { supabase, helpers } = createSupabaseMock()
    let attemptCount = 0

    // Simulate retry logic
    const operation = async () => {
      attemptCount++
      if (attemptCount < 3) {
        throw new Error('Network error')
      }
      return { success: true }
    }

    let result
    for (let i = 0; i < 3; i++) {
      try {
        result = await operation()
        break
      } catch (error) {
        if (i === 2) throw error
      }
    }

    expect(result?.success).toBe(true)
    expect(attemptCount).toBe(3)
  })
})
```

## Testing Date Ranges

```typescript
import { createMockAppointments } from '@/lib/test-utils'

describe('Date range filtering', () => {
  it('filters appointments by date range', () => {
    const appointments = createMockAppointments(10)

    const today = new Date()
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

    const filtered = appointments.filter((apt) => {
      const aptDate = new Date(apt.start_time)
      return aptDate >= today && aptDate <= nextWeek
    })

    expect(filtered.length).toBeGreaterThan(0)
  })
})
```

## Best Practices Demonstrated

1. **Consistent Setup** - Use `beforeEach()` to reset state
2. **Realistic Data** - Factories create valid, related data
3. **Test Both Paths** - Success and error scenarios
4. **Isolation** - Each test is independent
5. **Clear Intent** - Test names describe what's being tested
6. **Mock Properly** - Use helpers to set up expected responses
7. **Assert Clearly** - One concept per test
