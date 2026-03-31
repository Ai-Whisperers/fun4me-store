# Vete Testing Guide

> Comprehensive guide for writing and running tests in the Vete platform.

---

## 📚 Table of Contents

1. [Quick Start](#quick-start)
2. [Test Categories](#test-categories)
3. [Running Tests](#running-tests)
4. [Writing Tests](#writing-tests)
5. [Mock Patterns](#mock-patterns)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Run All Tests
```bash
cd web
npm test
```

### Run Specific Test File
```bash
npm test -- pet-service.test.ts
```

### Run with Coverage
```bash
npm test -- --coverage
```

### Run in Watch Mode
```bash
npm test -- --watch
```

---

## 📁 Test Categories

| Category | Location | Purpose | Runner |
|----------|----------|---------|--------|
| Unit | `tests/unit/` | Single function/module | Vitest |
| Service | `tests/services/` | Service layer | Vitest |
| API | `tests/api/` | HTTP routes | Vitest |
| Component | `tests/components/` | React components | Vitest + Testing Library |
| Integration | `tests/integration/` | Multiple modules | Vitest |
| Database | `tests/database/` | RLS, migrations | Vitest + Real DB |
| E2E | `e2e/` | Full user flows | Playwright |

---

## 🏃 Running Tests

### By Category

```bash
# Unit tests only
npm run test:unit

# Service tests only
npm test -- tests/services/

# API tests only
npm test -- tests/api/

# E2E tests
npm run test:e2e
```

### With Options

```bash
# Verbose output
npm test -- --reporter=verbose

# Specific pattern
npm test -- --grep "should create"

# Update snapshots
npm test -- --update

# Bail on first failure
npm test -- --bail
```

---

## ✍️ Writing Tests

### Test File Naming

```
tests/
├── services/
│   └── pet-service.test.ts      # Unit tests for pet-service.ts
├── api/
│   └── pets/
│       └── route.test.ts        # Tests for /api/pets route
├── components/
│   └── PetCard.test.tsx         # Tests for PetCard component
└── integration/
    └── pet-workflow.test.ts     # Integration test for pet workflows
```

### Test Structure (AAA Pattern)

```typescript
describe('ServiceName', () => {
  describe('methodName', () => {
    it('should do X when Y', async () => {
      // Arrange - Set up test data and mocks
      const input = { name: 'Max', species: 'dog' };
      mockSupabase.from.mockReturnValue(createChainableQueryMock(input));

      // Act - Execute the code under test
      const result = await service.create(input);

      // Assert - Verify the outcome
      expect(result.data).toMatchObject(input);
      expect(result.error).toBeNull();
    });
  });
});
```

### Service Test Template

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PetService } from '@/lib/services/pet-service';
import { createMockSupabase, createChainableQueryMock } from '../__mocks__/supabase-mock';

describe('PetService', () => {
  let service: PetService;
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
    service = new PetService(mockSupabase);
  });

  describe('list', () => {
    it('returns pets for owner', async () => {
      const mockPets = [{ id: '1', name: 'Max' }];
      mockSupabase.from.mockReturnValue(createChainableQueryMock(mockPets));

      const result = await service.list('owner-1', 'tenant-1');

      expect(result.data).toEqual(mockPets);
      expect(mockSupabase.from).toHaveBeenCalledWith('pets');
    });

    it('handles database errors', async () => {
      mockSupabase.from.mockReturnValue(
        createChainableQueryMock(null, { message: 'DB error' })
      );

      const result = await service.list('owner-1', 'tenant-1');

      expect(result.error).toBe('DB error');
    });
  });
});
```

### API Test Template

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/pets/route';
import { createAuthenticatedRequest } from '../setup';

describe('GET /api/pets', () => {
  describe('authentication', () => {
    it('returns 401 for unauthenticated requests', async () => {
      const req = new Request('http://localhost/api/pets');
      const response = await GET(req);
      expect(response.status).toBe(401);
    });
  });

  describe('success', () => {
    it('returns pets for authenticated user', async () => {
      const req = createAuthenticatedRequest('/api/pets', {
        userId: 'user-1',
        tenantId: 'tenant-1'
      });

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });
  });
});
```

### Component Test Template

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PetCard } from '@/components/pets/pet-card';

describe('PetCard', () => {
  const mockPet = {
    id: '1',
    name: 'Max',
    species: 'dog',
    breed: 'Golden Retriever'
  };

  it('renders pet information', () => {
    render(<PetCard pet={mockPet} />);
    
    expect(screen.getByText('Max')).toBeInTheDocument();
    expect(screen.getByText('Golden Retriever')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<PetCard pet={mockPet} onClick={onClick} />);
    
    await userEvent.click(screen.getByRole('article'));
    
    expect(onClick).toHaveBeenCalledWith(mockPet);
  });
});
```

---

## 🎭 Mock Patterns

### Supabase Query Mock

```typescript
import { createChainableQueryMock } from '../__mocks__/query-mock';

// Success with data
mockSupabase.from.mockReturnValue(
  createChainableQueryMock([{ id: '1', name: 'Max' }])
);

// Error
mockSupabase.from.mockReturnValue(
  createChainableQueryMock(null, { message: 'Not found', code: 'PGRST116' })
);

// Empty result
mockSupabase.from.mockReturnValue(
  createChainableQueryMock([])
);
```

### Auth Mock

```typescript
mockSupabase.auth.getUser.mockResolvedValue({
  data: { user: { id: 'user-1', email: 'test@example.com' } },
  error: null
});

mockSupabase.auth.getSession.mockResolvedValue({
  data: { session: { access_token: 'token', user: {...} } },
  error: null
});
```

### RPC Mock

```typescript
mockSupabase.rpc.mockImplementation((funcName, params) => {
  if (funcName === 'record_payment') {
    return Promise.resolve({ data: { success: true }, error: null });
  }
  return Promise.resolve({ data: null, error: { message: 'Unknown RPC' } });
});
```

---

## 💡 Best Practices

### DO ✅

1. **One assertion focus per test**
   ```typescript
   // Good - tests one thing
   it('validates required name field', async () => {
     const result = await service.create({ species: 'dog' });
     expect(result.error).toContain('name');
   });
   ```

2. **Descriptive test names**
   ```typescript
   // Good - describes scenario and expected behavior
   it('returns 403 when owner tries to access other tenant data');
   
   // Bad - vague
   it('handles error');
   ```

3. **Test edge cases**
   ```typescript
   it('handles empty string input');
   it('handles null input');
   it('handles very long strings');
   it('handles special characters');
   ```

4. **Clean up after tests**
   ```typescript
   afterEach(() => {
     vi.clearAllMocks();
   });
   ```

### DON'T ❌

1. **Don't test implementation details**
   ```typescript
   // Bad - tests internal implementation
   expect(service._internalMethod).toHaveBeenCalled();
   
   // Good - tests behavior
   expect(result.data).toEqual(expected);
   ```

2. **Don't use hardcoded dates**
   ```typescript
   // Bad - will break
   expect(result.date).toBe('2026-02-03');
   
   // Good - relative comparison
   expect(new Date(result.date)).toBeInstanceOf(Date);
   ```

3. **Don't skip without reason**
   ```typescript
   // Bad
   it.skip('should work', () => {});
   
   // Good - has ticket reference
   it.skip('should work - blocked by #123', () => {});
   ```

---

## 🔧 Troubleshooting

### Common Errors

#### "cookies was called outside request scope"
```typescript
// Add mock at top of test file
vi.mock('next/headers', () => ({
  cookies: () => ({
    get: vi.fn().mockReturnValue({ value: 'token' })
  })
}));
```

#### "Cannot read property 'from' of undefined"
```typescript
// Ensure mock is set up in beforeEach
beforeEach(() => {
  mockSupabase = createMockSupabase();
});
```

#### "Timeout" errors
```typescript
// Increase timeout for slow tests
it('handles large dataset', async () => {
  // ...
}, 10000); // 10 second timeout
```

---

## 📊 Coverage Thresholds

| Metric | Threshold |
|--------|-----------|
| Statements | 50% |
| Branches | 40% |
| Functions | 50% |
| Lines | 50% |

Check coverage:
```bash
npm test -- --coverage
```

---

*Last Updated: 2026-02-03*
