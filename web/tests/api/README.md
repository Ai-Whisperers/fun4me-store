# API Integration Tests

This directory contains integration tests for API routes. Tests verify authentication, authorization, tenant isolation, input validation, and security.

## Test Coverage Status

### ✅ GOAL ACHIEVED: 20/20 target routes - 100% Complete! 🎉

| Route | File | Test Count | Coverage |
|-------|------|------------|----------|
| `/api/billing/invoices` | `billing/invoices/route.test.ts` | 7 tests + security | ✅ Complete |
| `/api/appointments/slots` | `appointments/slots/route.test.ts` | 9 tests + security | ✅ Complete |
| `/api/inventory/adjust` | `inventory/adjust/route.test.ts` | 14 tests + security + concurrency | ✅ Complete |
| `/api/inventory/receive` | `inventory/receive/route.test.ts` | 24 tests + security + concurrency | ✅ Complete |
| `/api/inventory/catalog` | `inventory/catalog/route.test.ts` | 27 tests + security + edge cases | ✅ Complete |
| `/api/billing/payment-methods` | `billing/payment-methods/route.test.ts` | 10 tests + security | ✅ Complete |
| `/api/billing/pay-invoice` | `billing/pay-invoice/route.test.ts` | 16 tests + security | ✅ Complete |
| `/api/billing/bank-transfer` | `billing/bank-transfer/route.test.ts` | 14 tests + security + format | ✅ Complete |
| `/api/appointments/waitlist` | `appointments/waitlist/route.test.ts` | 22 tests + security | ✅ Complete |
| `/api/store/cart` (all methods) | `store/cart/route.test.ts` | 17 tests + security + isolation | ✅ Complete |
| `/api/store/checkout` | `store/checkout/route.test.ts` | 19 tests + security | ✅ Complete |
| `/api/store/products` | `store/products/route.test.ts` | 25 tests + security + XSS | ✅ Complete |
| `/api/vaccines` | `vaccines/route.test.ts` | 25 tests + security + CRUD | ✅ Complete |
| `/api/medical-records` | `medical-records/route.test.ts` | 28 tests + security + XSS | ✅ Complete |
| `/api/prescriptions` | `prescriptions/route.test.ts` | 35 tests + security + XSS | ✅ Complete |
| `/api/lab-orders` | `lab-orders/route.test.ts` | 35 tests + security + XSS | ✅ Complete |
| `/api/cron/release-reservations` | `cron/release-reservations/route.test.ts` | 24 tests + security + timing | ✅ Complete |
| `/api/cron/check-health` | `cron/check-health/route.test.ts` | 28 tests + security + timing | ✅ Complete |
| `/api/cron/expiry-alerts` | `cron/expiry-alerts/route.test.ts` | 32 tests + security + notifications | ✅ Complete |
| `/api/pets` | `../pets/route.test.ts` | 9 tests + security | ✅ Complete (existing) |

### Additional Routes for Future Coverage

**High Priority - Core Business**:
- [ ] `/api/appointments` - Appointment booking (POST/GET) - *May be Server Action instead*
- [ ] `/api/appointments/[id]/cancel` - Appointment cancellation - *May not exist as API route*

**Lower Priority**:
- [ ] `/api/hospitalization` - Hospitalization tracking

## Test Structure

Each test file follows this pattern:

### 1. Authentication & Authorization
```typescript
describe('GET /api/[route]', () => {
  it('requires authentication')
  it('requires correct role (admin/vet/owner)')
  it('enforces tenant isolation')
})
```

### 2. Input Validation
```typescript
describe('Validation', () => {
  it('validates required fields')
  it('validates field types and formats')
  it('validates enum values')
  it('rejects invalid JSON')
})
```

### 3. Business Logic
```typescript
describe('Business Logic', () => {
  it('performs operation correctly (happy path)')
  it('handles edge cases')
  it('returns correct response format')
})
```

### 4. Security
```typescript
describe('Security: SQL Injection Prevention', () => {
  it('handles malicious input in query parameters')
  it('handles malicious input in POST body')
  it('sanitizes XSS attempts')
})
```

### 5. Additional Tests (as applicable)
- Pagination
- Filtering/Search
- Concurrency (atomic operations)
- Transaction rollback
- Rate limiting

## Running Tests

```bash
# Run all API integration tests
npm run test:api

# Run specific test file
npm run test -- tests/api/billing/invoices/route.test.ts

# Run tests in watch mode (for development)
npm run test:watch -- tests/api

# Run with coverage
npm run test:coverage -- tests/api
```

## Test Helpers

Located in `__helpers__/integration-setup.ts`:

### User Management
- `createTestAuthUser(role, tenantId)` - Creates auth user + profile
- `createTestProfile(role, tenantId)` - Creates profile only

### Test Data Creation
- `createTestPet(ownerId, tenantId)` - Creates pet record
- `createTestProduct(tenantId)` - Creates store product + inventory
- `createTestSupplier(tenantId)` - Creates supplier
- `createTestLabTest(tenantId)` - Creates lab test catalog entry
- `createTestLabOrder(petId, orderedBy, tenantId)` - Creates lab order
- `createTestStaffProfile(profileId, tenantId)` - Creates staff profile

### Request & Response Helpers
- `createTestRequest(url, options)` - Creates NextRequest for testing
- `expectSuccess(response)` - Asserts 2xx status, returns parsed body
- `expectError(response, status, message?)` - Asserts error status
- `expectResponse(response, status)` - Asserts exact status

### Cleanup
- `cleanupManager.track(table, id)` - Track resource for cleanup
- `cleanupManager.cleanupWithRetry()` - Clean up tracked resources (use in afterEach)

## Writing New Tests

### Step 1: Read the API Route

```bash
# Find the route implementation
web/app/api/[route]/route.ts

# Understand:
# - HTTP methods (GET, POST, PUT, DELETE)
# - Required parameters
# - Authentication/authorization requirements
# - Business logic
```

### Step 2: Create Test File

```bash
# Create test file matching route structure
web/tests/api/[route]/route.test.ts
```

### Step 3: Use the Template

```typescript
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { GET, POST } from '@/app/api/[route]/route'
import {
  setupIntegrationTest,
  cleanupIntegrationTest,
  createTestAuthUser,
  TEST_TENANT_ID,
  cleanupManager,
  createTestRequest,
  expectSuccess,
  expectError,
} from '../../__helpers__/integration-setup'
import { SupabaseClient } from '@supabase/supabase-js'

describe('API: /api/[route]', () => {
  let supabase: SupabaseClient
  let userId: string
  let profileId: string

  beforeAll(async () => {
    supabase = await setupIntegrationTest()
    const user = await createTestAuthUser(supabase, 'vet', TEST_TENANT_ID)
    userId = user.userId
    profileId = user.profile.id
  })

  afterAll(async () => {
    await cleanupIntegrationTest()
  })

  afterEach(async () => {
    await cleanupManager.cleanupWithRetry()
  })

  describe('GET /api/[route]', () => {
    it('requires authentication', async () => {
      const request = createTestRequest('http://localhost:3000/api/[route]')
      const response = await GET(request)
      await expectError(response, 401)
    })

    // Add more tests following the pattern above
  })
})
```

### Step 4: Test Categories Checklist

For each route, cover:

- [ ] **Authentication**: Requires valid auth token
- [ ] **Authorization**: Enforces role-based access (vet/admin/owner)
- [ ] **Tenant Isolation**: Cannot access other tenants' data
- [ ] **Required Fields**: Validates all required parameters
- [ ] **Field Types**: Validates types (string, number, date, enum)
- [ ] **Field Formats**: Validates formats (email, phone, date)
- [ ] **Business Logic (Happy Path)**: Performs operation correctly with valid data
- [ ] **Edge Cases**: Handles empty values, boundaries, special characters
- [ ] **Error Handling**: Returns appropriate error codes and messages
- [ ] **SQL Injection**: Handles malicious SQL in all inputs
- [ ] **XSS Prevention**: Sanitizes script tags and HTML
- [ ] **Response Format**: Returns expected structure

## Security Testing

### SQL Injection Test Patterns

```typescript
const maliciousInputs = [
  "'; DROP TABLE users; --",
  "1' OR '1'='1",
  'admin"--',
  "\" OR 1=1 --",
]

for (const malicious of maliciousInputs) {
  const request = createTestRequest(
    `http://localhost:3000/api/route?param=${encodeURIComponent(malicious)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )

  const response = await GET(request)

  // Should not crash (500), should handle gracefully
  expect(response.status).not.toBe(500)
}
```

### XSS Test Patterns

```typescript
const xssInputs = [
  '<script>alert("xss")</script>',
  '"><script>alert("xss")</script>',
  'javascript:alert("xss")',
  '<img src=x onerror=alert("xss")>',
]

// Test in all text fields
```

## Common Pitfalls

### ❌ DON'T:
- Forget to call `setupIntegrationTest()` in `beforeAll`
- Forget to call `cleanupIntegrationTest()` in `afterAll`
- Forget to track resources with `cleanupManager.track()`
- Test with hardcoded credentials (use `createTestAuthUser`)
- Reuse same test data across tests (creates flaky tests)
- Forget to test error cases (not just happy path)

### ✅ DO:
- Use unique identifiers (`Date.now()`, `idGenerator.generate()`)
- Clean up test data after each test (`afterEach` with cleanupManager)
- Test all HTTP methods the route supports
- Test both success and failure paths
- Test edge cases (empty arrays, null values, boundary conditions)
- Test security (SQL injection, XSS, auth bypass attempts)
- Use TypeScript for type safety
- Follow existing test patterns for consistency

## Performance Considerations

### Keep Tests Fast
- Use `setupIntegrationTest()` once per file (in `beforeAll`)
- Create minimal test data (only what's needed for the test)
- Clean up incrementally (in `afterEach`, not just `afterAll`)
- Use database transactions where possible (future enhancement)

### Parallel Execution
- Tests in different files run in parallel
- Tests within a file run sequentially
- Ensure tests don't depend on each other's state

## Debugging Failed Tests

### Common Issues

**1. "Cannot find module" or Import errors**
```bash
# Ensure tsconfig.json includes test paths
# Check that @/... imports are configured correctly
```

**2. "Database connection failed"**
```bash
# Check .env.local has valid Supabase credentials
# Ensure SUPABASE_SERVICE_ROLE_KEY is set (not just ANON_KEY)
```

**3. "Cleanup failed" errors**
```bash
# Foreign key constraints causing deletion failures
# Solution: cleanupManager handles retry with proper order
# If persists, check RLS policies aren't blocking service_role
```

**4. "User already exists" errors**
```bash
# Cleanup not running properly
# Solution: Ensure afterAll is called
# Use unique emails: `${role}-${Date.now()}@test.local`
```

**5. "Test timeout" errors**
```bash
# Database operations taking too long
# Solution: Increase timeout in vitest.config.ts
# Check database indexes on frequently queried columns
```

### Debug Mode

```bash
# Run single test with verbose output
npm run test -- tests/api/[route]/route.test.ts --reporter=verbose

# Run with inspector (for breakpoints)
node --inspect-brk ./node_modules/.bin/vitest run tests/api/[route]/route.test.ts
```

## Integration with CI/CD

### Pre-Commit Hook
```bash
# Should run before every commit
npm run test:api
```

### CI Pipeline
```yaml
# .github/workflows/ci.yml
jobs:
  test:
    steps:
      - run: npm run test:api
      - run: npm run test:coverage -- tests/api --reporter=json
```

## Next Steps

1. **Week 1 Goal**: Complete 20 critical route tests
2. **Week 2**: Add performance benchmarks to tests
3. **Week 3**: Increase coverage to 50% of all API routes
4. **Week 4**: Integrate with CI/CD pipeline

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Supabase Testing Guide](https://supabase.com/docs/guides/api/testing)
- [Next.js Testing](https://nextjs.org/docs/app/building-your-application/testing/vitest)
- [STRATEGIC_ACTION_PLAN.md](../../STRATEGIC_ACTION_PLAN.md) - Overall improvement plan

---

**Last Updated**: January 19, 2026  
**Status**: Week 1, Day 1-2 - API Integration Tests (In Progress)
