# Testing Guide

Comprehensive testing strategy for the Vete platform.

## Testing Stack

| Tool | Purpose | Location |
|------|---------|----------|
| **Vitest** | Unit & integration tests | `tests/` |
| **Playwright** | End-to-end tests | `e2e/` |
| **React Testing Library** | Component testing | `tests/` |

## Running Tests

```bash
# All tests
npm run test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests (requires dev server)
npm run test:e2e

# Coverage report
npm run test:coverage
```

## Test Structure

```
web/
├── tests/
│   ├── unit/               # Pure function tests
│   ├── integration/        # Component + API tests
│   ├── api/                # API route tests
│   ├── system/             # Full flow tests
│   ├── functionality/      # Feature-specific
│   ├── uat/                # User acceptance
│   ├── __fixtures__/       # Mock data
│   └── __helpers__/        # Test utilities
│
├── e2e/
│   ├── public.spec.ts      # Public page tests
│   ├── auth.spec.ts        # Authentication tests
│   ├── portal/             # Portal tests
│   └── dashboard/          # Dashboard tests
│
├── vitest.config.ts        # Vitest config
└── playwright.config.ts    # Playwright config
```

---

## Unit Tests

### What to Unit Test

- Utility functions
- Data transformations
- Calculations (drug dosages, WAC, etc.)
- Validation functions

### Example Unit Test

```typescript
// tests/unit/utils.test.ts
import { describe, it, expect } from 'vitest';
import { formatCurrency, calculateWAC } from '@/lib/utils';

describe('formatCurrency', () => {
  it('formats PYG correctly', () => {
    expect(formatCurrency(50000, 'PYG')).toBe('₲ 50.000');
  });

  it('handles zero', () => {
    expect(formatCurrency(0, 'PYG')).toBe('₲ 0');
  });
});

describe('calculateWAC', () => {
  it('calculates weighted average cost', () => {
    const result = calculateWAC(
      currentStock: 10,
      currentWAC: 100,
      newQuantity: 5,
      newCost: 120
    );
    expect(result).toBe(106.67);
  });
});
```

### Testing Utilities

```typescript
// tests/__helpers__/test-utils.ts
export function createMockPet(overrides = {}): Pet {
  return {
    id: 'test-pet-id',
    name: 'Test Pet',
    species: 'dog',
    tenant_id: 'adris',
    ...overrides
  };
}

export function createMockUser(role = 'owner'): User {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    role,
    tenant_id: 'adris'
  };
}
```

---

## Integration Tests

### What to Integration Test

- Component rendering with data
- Form submissions
- API route handlers
- Server Actions

### Example Component Test

```typescript
// tests/integration/service-card.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ServiceCard } from '@/components/services/service-card';

describe('ServiceCard', () => {
  const mockService = {
    id: '1',
    name: 'Consulta General',
    description: 'Examen completo',
    price: 150000,
    duration: 30
  };

  it('displays service name', () => {
    render(<ServiceCard service={mockService} />);
    expect(screen.getByText('Consulta General')).toBeInTheDocument();
  });

  it('displays formatted price', () => {
    render(<ServiceCard service={mockService} />);
    expect(screen.getByText(/₲ 150.000/)).toBeInTheDocument();
  });
});
```

### Example API Test

```typescript
// tests/api/pets.test.ts
import { describe, it, expect, vi } from 'vitest';
import { GET, POST } from '@/app/api/pets/route';
import { createMockRequest } from '../__helpers__/mock-request';

describe('GET /api/pets', () => {
  it('returns pets for authenticated user', async () => {
    const request = createMockRequest({
      method: 'GET',
      user: { id: 'user-1', tenant_id: 'adris' }
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  it('returns 401 for unauthenticated request', async () => {
    const request = createMockRequest({ method: 'GET' });
    const response = await GET(request);

    expect(response.status).toBe(401);
  });
});
```

---

## E2E Tests

### Setup

```bash
# Install browsers
npx playwright install

# Start dev server (required)
npm run dev

# Run E2E tests
npm run test:e2e

# Run with UI
npx playwright test --ui

# Debug mode
npx playwright test --debug
```

### Example E2E Test

```typescript
// e2e/public.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Public Website', () => {
  test('homepage loads correctly', async ({ page }) => {
    await page.goto('/adris');

    await expect(page).toHaveTitle(/Adris/);
    await expect(page.locator('h1')).toContainText('Veterinaria');
  });

  test('services page displays catalog', async ({ page }) => {
    await page.goto('/adris/services');

    await expect(page.locator('.service-card')).toHaveCount.greaterThan(0);
  });

  test('booking flow works', async ({ page }) => {
    await page.goto('/adris/book');

    // Select service
    await page.click('[data-testid="service-select"]');
    await page.click('[data-testid="service-option-1"]');

    // Select date
    await page.click('[data-testid="date-picker"]');
    await page.click('[data-testid="available-date"]');

    // Fill contact info
    await page.fill('[name="name"]', 'Test User');
    await page.fill('[name="phone"]', '0981123456');

    // Submit
    await page.click('[data-testid="submit-booking"]');

    await expect(page.locator('.booking-confirmation')).toBeVisible();
  });
});
```

### Authentication in E2E

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('login flow', async ({ page }) => {
    await page.goto('/adris/portal/login');

    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'testpassword');
    await page.click('[type="submit"]');

    await expect(page).toHaveURL(/\/portal\/dashboard/);
  });
});

// Reusable login helper
async function login(page, email, password) {
  await page.goto('/adris/portal/login');
  await page.fill('[name="email"]', email);
  await page.fill('[name="password"]', password);
  await page.click('[type="submit"]');
  await page.waitForURL(/\/portal/);
}
```

### Page Object Pattern

```typescript
// e2e/pages/services-page.ts
import { Page, Locator } from '@playwright/test';

export class ServicesPage {
  readonly page: Page;
  readonly serviceCards: Locator;
  readonly searchInput: Locator;
  readonly categoryFilter: Locator;

  constructor(page: Page) {
    this.page = page;
    this.serviceCards = page.locator('.service-card');
    this.searchInput = page.locator('[data-testid="service-search"]');
    this.categoryFilter = page.locator('[data-testid="category-filter"]');
  }

  async goto(clinic: string) {
    await this.page.goto(`/${clinic}/services`);
  }

  async search(term: string) {
    await this.searchInput.fill(term);
  }

  async filterByCategory(category: string) {
    await this.categoryFilter.selectOption(category);
  }

  async getServiceCount() {
    return await this.serviceCards.count();
  }
}
```

---

## Mocking

### Mocking Supabase

```typescript
// tests/__mocks__/supabase.ts
import { vi } from 'vitest';

export const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
    })),
    insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    update: vi.fn(() => Promise.resolve({ data: null, error: null })),
    delete: vi.fn(() => Promise.resolve({ data: null, error: null }))
  })),
  auth: {
    getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null }))
  }
};

vi.mock('@/lib/supabase/client', () => ({
  createBrowserClient: () => mockSupabase
}));
```

### Mocking API Responses

```typescript
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const handlers = [
  http.get('/api/pets', () => {
    return HttpResponse.json([
      { id: '1', name: 'Buddy', species: 'dog' }
    ]);
  })
];

export const server = setupServer(...handlers);

// In test setup
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

## Test Data

### Fixtures

```typescript
// tests/__fixtures__/pets.ts
export const mockPets = [
  {
    id: 'pet-1',
    name: 'Buddy',
    species: 'dog',
    breed: 'Labrador',
    birth_date: '2020-01-15'
  },
  {
    id: 'pet-2',
    name: 'Whiskers',
    species: 'cat',
    breed: 'Siamese',
    birth_date: '2021-06-01'
  }
];

export const mockServices = [
  {
    id: 'srv-1',
    name: 'Consulta General',
    price: 150000,
    duration: 30
  }
];
```

### Database Seeding for E2E

```typescript
// e2e/setup/seed-data.ts
import { createClient } from '@supabase/supabase-js';

export async function seedTestData() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // Create test user
  const { data: user } = await supabase.auth.admin.createUser({
    email: 'e2e@test.com',
    password: 'testpassword',
    email_confirm: true
  });

  // Create test pet
  await supabase.from('pets').insert({
    name: 'E2E Test Pet',
    species: 'dog',
    owner_id: user.id,
    tenant_id: 'adris'
  });
}
```

---

## Coverage

### Running Coverage

```bash
npm run test:coverage
```

### Coverage Targets

| Type | Target |
|------|--------|
| Statements | 80% |
| Branches | 75% |
| Functions | 80% |
| Lines | 80% |

### Vitest Coverage Config

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*'
      ]
    }
  }
});
```

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci
        working-directory: web

      - name: Run unit tests
        run: npm run test:unit
        working-directory: web

      - name: Run E2E tests
        run: npx playwright test
        working-directory: web
```

---

## Best Practices

### DO

- Test behavior, not implementation
- Use meaningful test descriptions
- Keep tests isolated and independent
- Clean up test data after each test
- Use page objects for E2E tests

### DON'T

- Test external libraries
- Mock everything (integration matters)
- Write tests that depend on order
- Ignore flaky tests (fix them)
- Test private implementation details

---

## Related Documentation

- [Development Setup](setup.md)
- [Contributing Guide](contributing.md)
- [API Reference](../api/overview.md)
