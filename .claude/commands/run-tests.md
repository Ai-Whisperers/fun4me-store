# Run Tests

Execute the test suite for the veterinary platform.

## Test Commands

```bash
cd web

# Run all tests
npm run test

# Run specific test suites
npm run test:unit           # Unit tests with coverage
npm run test:integration    # Integration tests
npm run test:api           # API route tests
npm run test:e2e           # Playwright E2E tests
```

## Test Structure

```
web/
├── tests/
│   ├── unit/              # Unit tests for utilities, hooks
│   ├── integration/       # Integration tests
│   └── api/               # API route tests
└── e2e/                   # End-to-end Playwright tests
```

## Writing Tests

### Unit Test Example
```typescript
// tests/unit/utils.test.ts
import { describe, it, expect } from 'vitest'
import { calculateAge } from '@/lib/utils'

describe('calculateAge', () => {
  it('should calculate pet age correctly', () => {
    const birthDate = new Date('2020-01-01')
    const result = calculateAge(birthDate)
    expect(result).toBeGreaterThan(0)
  })
})
```

### API Test Example
```typescript
// tests/api/pets.test.ts
import { describe, it, expect } from 'vitest'

describe('GET /api/pets', () => {
  it('should return 401 without authentication', async () => {
    const response = await fetch('/api/pets')
    expect(response.status).toBe(401)
  })
})
```

### E2E Test Example
```typescript
// e2e/booking.spec.ts
import { test, expect } from '@playwright/test'

test('user can book appointment', async ({ page }) => {
  await page.goto('/adris/book')
  await expect(page.getByRole('heading', { name: /reservar/i })).toBeVisible()
  // ... test booking flow
})
```

## Coverage Requirements

- **Target**: 80% minimum
- **Focus Areas**:
  - Business logic utilities
  - API route handlers
  - Server actions
  - Critical user flows

## Before Committing

1. Run `npm run test` to ensure all tests pass
2. Check coverage report for regressions
3. Add tests for new features
4. Update tests for modified behavior
