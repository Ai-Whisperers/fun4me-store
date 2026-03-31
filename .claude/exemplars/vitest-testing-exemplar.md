# Vitest Testing Pattern Exemplar

## Overview

Pattern for writing tests using Vitest in the veterinary platform.

## When to Use

- **Use for**: Unit tests, integration tests, API tests
- **Critical for**: Business logic, utilities, API routes

## Good Pattern - Unit Test

```typescript
// tests/unit/lib/pet-age.test.ts

import { describe, it, expect, beforeEach } from 'vitest'
import { calculatePetAge, formatPetAge, getPetLifeStage } from '@/lib/pet-age'

describe('calculatePetAge', () => {
  describe('when given a valid birth date', () => {
    it('calculates age in years for dogs older than 1 year', () => {
      const birthDate = new Date()
      birthDate.setFullYear(birthDate.getFullYear() - 3)

      const result = calculatePetAge(birthDate, 'dog')

      expect(result.years).toBe(3)
      expect(result.months).toBe(0)
    })

    it('calculates age in months for puppies under 1 year', () => {
      const birthDate = new Date()
      birthDate.setMonth(birthDate.getMonth() - 6)

      const result = calculatePetAge(birthDate, 'dog')

      expect(result.years).toBe(0)
      expect(result.months).toBe(6)
    })

    it('handles leap years correctly', () => {
      const birthDate = new Date('2020-02-29')
      const today = new Date('2024-02-29')

      const result = calculatePetAge(birthDate, 'cat', today)

      expect(result.years).toBe(4)
    })
  })

  describe('when given invalid input', () => {
    it('throws error for future birth date', () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)

      expect(() => calculatePetAge(futureDate, 'dog')).toThrow(
        'Birth date cannot be in the future'
      )
    })

    it('throws error for invalid species', () => {
      const birthDate = new Date('2020-01-01')

      expect(() => calculatePetAge(birthDate, 'invalid' as any)).toThrow(
        'Invalid species'
      )
    })
  })
})

describe('formatPetAge', () => {
  it('formats age in Spanish for years', () => {
    const result = formatPetAge({ years: 3, months: 0 })
    expect(result).toBe('3 años')
  })

  it('formats singular year correctly', () => {
    const result = formatPetAge({ years: 1, months: 0 })
    expect(result).toBe('1 año')
  })

  it('formats months for young pets', () => {
    const result = formatPetAge({ years: 0, months: 8 })
    expect(result).toBe('8 meses')
  })

  it('formats singular month correctly', () => {
    const result = formatPetAge({ years: 0, months: 1 })
    expect(result).toBe('1 mes')
  })
})

describe('getPetLifeStage', () => {
  it.each([
    { species: 'dog', years: 0, months: 6, expected: 'puppy' },
    { species: 'dog', years: 1, months: 0, expected: 'adult' },
    { species: 'dog', years: 8, months: 0, expected: 'senior' },
    { species: 'cat', years: 0, months: 8, expected: 'kitten' },
    { species: 'cat', years: 2, months: 0, expected: 'adult' },
    { species: 'cat', years: 11, months: 0, expected: 'senior' },
  ])('returns $expected for $species at $years years $months months', ({ species, years, months, expected }) => {
    const result = getPetLifeStage(species as 'dog' | 'cat', { years, months })
    expect(result).toBe(expected)
  })
})
```

**Why this is good:**
- Descriptive `describe` blocks organize tests
- Clear test names describe expected behavior
- Tests both happy path and error cases
- Parameterized tests with `it.each`
- Tests edge cases (leap years, singular/plural)
- Spanish output verified
- Type safety with `as any` for invalid inputs

## Good Pattern - API Integration Test

```typescript
// tests/api/pets.test.ts

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createClient } from '@/lib/supabase/server'
import { GET, POST } from '@/app/api/pets/route'
import { NextRequest } from 'next/server'

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

describe('GET /api/pets', () => {
  const mockSupabase = {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    })),
  }

  beforeEach(() => {
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })

    const request = new NextRequest('http://localhost/api/pets')
    const response = await GET(request)

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('No autorizado')
  })

  it('returns pets for authenticated user', async () => {
    const mockUser = { id: 'user-123' }
    const mockPets = [
      { id: 'pet-1', name: 'Luna', species: 'dog' },
      { id: 'pet-2', name: 'Milo', species: 'cat' },
    ]

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { clinic_id: 'clinic-1', role: 'owner' },
            error: null,
          }),
        }),
      }),
    })

    // Second call for pets query
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockPets,
            error: null,
          }),
        }),
      }),
    })

    const request = new NextRequest('http://localhost/api/pets')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toHaveLength(2)
    expect(body[0].name).toBe('Luna')
  })

  it('filters by species when query param provided', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    })

    const request = new NextRequest('http://localhost/api/pets?species=dog')
    await GET(request)

    // Verify filter was applied
    expect(mockSupabase.from).toHaveBeenCalledWith('pets')
  })
})

describe('POST /api/pets', () => {
  it('returns 400 for invalid body', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { clinic_id: 'clinic-1' },
              error: null,
            }),
          }),
        }),
      }),
    }

    vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

    const request = new NextRequest('http://localhost/api/pets', {
      method: 'POST',
      body: JSON.stringify({ invalid: 'data' }),
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('Datos inválidos')
  })

  it('creates pet with valid data', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { clinic_id: 'clinic-1' },
              error: null,
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'pet-new', name: 'Luna', species: 'dog' },
              error: null,
            }),
          }),
        }),
      }),
    }

    vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

    const request = new NextRequest('http://localhost/api/pets', {
      method: 'POST',
      body: JSON.stringify({ name: 'Luna', species: 'dog' }),
    })

    const response = await POST(request)

    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.name).toBe('Luna')
  })
})
```

**Why this is good:**
- Mocks Supabase client properly
- Tests authentication failures
- Tests validation errors
- Tests successful operations
- Clears mocks between tests
- Uses proper NextRequest
- Verifies Spanish error messages

## Bad Pattern

```typescript
// tests/pets.test.ts

import { test } from 'vitest'

test('pets work', async () => {
  const response = await fetch('/api/pets')
  expect(response.ok).toBe(true)
})
```

**Why this is bad:**
- No `describe` organization
- Vague test name
- Tests real endpoint (not unit test)
- No setup/teardown
- No error case testing
- No mocking

## Test File Organization

```
web/
├── tests/
│   ├── unit/              # Pure function tests
│   │   ├── lib/
│   │   │   ├── pet-age.test.ts
│   │   │   └── validators.test.ts
│   │   └── hooks/
│   │       └── use-debounce.test.ts
│   ├── integration/       # Component tests
│   │   └── components/
│   │       └── pet-card.test.tsx
│   └── api/               # API route tests
│       ├── pets.test.ts
│       └── appointments.test.ts
└── e2e/                   # Playwright E2E tests
    ├── booking.spec.ts
    └── auth.spec.ts
```

## Final Must-Pass Checklist

- [ ] Tests organized in `describe` blocks
- [ ] Test names describe expected behavior
- [ ] Happy path tested
- [ ] Error cases tested
- [ ] Edge cases tested
- [ ] Mocks cleared between tests (`afterEach`)
- [ ] No real API/DB calls in unit tests
- [ ] Parameterized tests for multiple cases
- [ ] Spanish output verified where applicable
- [ ] TypeScript types correct
