# Test Automation Strategy

Complete strategy for automating tests across the Vete platform, including execution, CI/CD integration, and best practices.

## Overview

This document outlines the comprehensive automation strategy for the Vete platform testing suite, covering test execution, CI/CD integration, test data management, environment setup, and performance considerations.

**Last Updated:** December 2024

---

## Table of Contents

1. [Test Execution Strategy](#test-execution-strategy)
2. [CI/CD Integration](#cicd-integration)
3. [Test Data Management](#test-data-management)
4. [Test Environment Setup](#test-environment-setup)
5. [Performance Considerations](#performance-considerations)
6. [Best Practices](#best-practices)
7. [Maintenance Strategy](#maintenance-strategy)

---

## Test Execution Strategy

### Execution Modes

#### 1. Local Development

**Watch Mode (Recommended for Development):**
```bash
npm run test:watch
```
- Runs tests in watch mode
- Re-runs tests on file changes
- Fast feedback loop
- Use during active development

**Single Run:**
```bash
npm run test              # All tests
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests only
npm run test:system       # System tests only
npm run test:e2e          # E2E tests only
```

**Coverage Report:**
```bash
npm run test:coverage      # Generate coverage report
npm run test:coverage:html # HTML coverage report
```

#### 2. Pre-Commit

**Fast Validation:**
```bash
npm run test:pre-commit
```
- Runs unit tests only
- Runs linting
- Runs type checking
- Must pass before commit

#### 3. Pull Request

**Comprehensive Validation:**
```bash
npm run test:pr
```
- All unit tests
- All integration tests
- Security tests
- E2E smoke tests
- Coverage report

#### 4. Continuous Integration

**Full Test Suite:**
```bash
npm run test:ci
```
- Complete test suite
- Parallel execution
- Coverage reporting
- Test result artifacts

### Execution Order

1. **Fast Tests First** (Parallel)
   - Unit tests (< 1s each)
   - Integration tests (< 5s each)
   - Security tests

2. **Medium Tests** (After fast feedback)
   - System tests (< 30s each)
   - Functionality tests (< 10s each)

3. **Slow Tests** (After medium tests)
   - E2E tests (< 60s each)
   - Performance tests

### Test Tagging

**Tag System:**
```typescript
// Critical tests - must pass
test('login flow', { tags: ['@critical'] }, () => {
  // ...
});

// Smoke tests - quick validation
test('homepage loads', { tags: ['@smoke'] }, () => {
  // ...
});

// Slow tests - run separately
test('full workflow', { tags: ['@slow'] }, () => {
  // ...
});

// Integration tests - require database
test('pet creation', { tags: ['@integration'] }, () => {
  // ...
});

// E2E tests - require browser
test('user journey', { tags: ['@e2e'] }, () => {
  // ...
});
```

**Tag Usage:**
```bash
# Run only critical tests
npm run test -- --grep @critical

# Run smoke tests
npm run test -- --grep @smoke

# Skip slow tests
npm run test -- --grep -@slow
```

---

## CI/CD Integration

### GitHub Actions Workflow

#### Pre-Commit Hook

**Trigger:** Before commit  
**Runs:**
- Unit tests
- Linting
- Type checking

**Failure:** Blocks commit

#### Pull Request Workflow

**Trigger:** On PR creation/update  
**Runs:**
- All unit tests
- All integration tests
- Security tests
- E2E smoke tests
- Coverage report

**Failure:** Blocks merge

#### Merge to Main Workflow

**Trigger:** On merge to main  
**Runs:**
- Full test suite
- All E2E tests
- Performance tests
- Coverage report
- Test artifacts

**Failure:** Blocks deployment

### Workflow Configuration

```yaml
name: Test Suite

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Generate coverage
        run: npm run test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

---

## Test Data Management

### Test Database Strategy

**Separate Test Database:**
- Isolated from development/production
- Reset before each test suite
- Seed with fixtures
- Clean up after tests

**Database Setup:**
```bash
# Reset test database
npm run test:db:reset

# Seed test data
npm run test:db:seed

# Reset + seed
npm run test:db:setup
```

### Fixtures

**Purpose:** Provide consistent, realistic test data

**Location:** `tests/__fixtures__/`

**Usage:**
```typescript
import { testTenant, testUser, testPet } from '@/tests/__fixtures__';

test('create appointment', () => {
  const tenant = testTenant();
  const user = testUser({ tenantId: tenant.id });
  const pet = testPet({ ownerId: user.id });
  // ...
});
```

### Factories

**Purpose:** Generate test data dynamically

**Location:** `tests/__helpers__/factories.ts`

**Usage:**
```typescript
import { createTestTenant, createTestUser, createTestPet } from '@/tests/__helpers__/factories';

test('create appointment', async () => {
  const tenant = await createTestTenant();
  const user = await createTestUser({ tenantId: tenant.id, role: 'owner' });
  const pet = await createTestPet({ ownerId: user.id });
  // ...
});
```

### Test Data Cleanup

**Strategy:**
- Clean up after each test
- Use transactions where possible
- Reset database between test suites
- Remove test data after test completion

**Implementation:**
```typescript
afterEach(async () => {
  await cleanupTestData();
});

afterAll(async () => {
  await resetTestDatabase();
});
```

---

## Test Environment Setup

### Environment Variables

**Test Environment:**
```env
NODE_ENV=test
DATABASE_URL=postgresql://localhost:5432/vete_test
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=test_key
SUPABASE_SERVICE_KEY=test_service_key
```

### Test Configuration

**Vitest Config:**
```typescript
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/'],
    },
  },
});
```

**Playwright Config:**
```typescript
export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:3000',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## Performance Considerations

### Test Execution Speed

**Targets:**
- Unit tests: < 1s each
- Integration tests: < 5s each
- System tests: < 30s each
- E2E tests: < 60s each

**Optimization Strategies:**
- Run tests in parallel
- Use test database instead of production
- Mock external services
- Cache test data where possible
- Use test fixtures instead of API calls

### Parallel Execution

**Vitest:**
```typescript
export default defineConfig({
  test: {
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 4,
        minThreads: 2,
      },
    },
  },
});
```

**Playwright:**
```typescript
export default defineConfig({
  workers: 4, // Run 4 tests in parallel
});
```

### Test Timeout Management

**Timeouts:**
```typescript
test('slow operation', { timeout: 10000 }, async () => {
  // Test that may take longer
});
```

---

## Best Practices

### Test Organization

1. **Group Related Tests:**
   ```typescript
   describe('Pet Management', () => {
     describe('Create Pet', () => {
       test('creates pet successfully', () => {});
       test('validates required fields', () => {});
     });
   });
   ```

2. **Use Descriptive Names:**
   ```typescript
   // Good
   test('creates pet with valid data', () => {});
   
   // Bad
   test('test1', () => {});
   ```

3. **One Assertion Per Test (When Possible):**
   ```typescript
   // Good
   test('pet has correct name', () => {
     expect(pet.name).toBe('Fluffy');
   });
   
   // Also acceptable for related assertions
   test('pet has all required fields', () => {
     expect(pet.name).toBe('Fluffy');
     expect(pet.species).toBe('dog');
     expect(pet.breed).toBe('Golden Retriever');
   });
   ```

### Test Data

1. **Use Factories for Dynamic Data:**
   ```typescript
   const pet = createTestPet({ name: 'Custom Name' });
   ```

2. **Use Fixtures for Static Data:**
   ```typescript
   const tenant = testTenant;
   ```

3. **Clean Up After Tests:**
   ```typescript
   afterEach(async () => {
     await cleanup();
   });
   ```

### Error Handling

1. **Test Error Scenarios:**
   ```typescript
   test('handles invalid input', async () => {
     await expect(createPet({})).rejects.toThrow('Name is required');
   });
   ```

2. **Test Edge Cases:**
   ```typescript
   test('handles empty list', () => {
     expect(getPets([])).toEqual([]);
   });
   ```

### Maintainability

1. **Keep Tests Simple:**
   - One test, one purpose
   - Clear test names
   - Minimal setup/teardown

2. **Avoid Test Interdependence:**
   - Each test should be independent
   - No shared state between tests
   - Tests should run in any order

3. **Update Tests with Code:**
   - Update tests when code changes
   - Remove obsolete tests
   - Refactor tests when needed

---

## Maintenance Strategy

### Regular Reviews

**Weekly:**
- Review test coverage
- Identify flaky tests
- Review test execution time
- Check for obsolete tests

**Monthly:**
- Review test strategy
- Update test plans
- Optimize slow tests
- Review test data

### Flaky Test Management

**Identification:**
- Track test failure rates
- Identify patterns
- Review test logs

**Resolution:**
- Fix race conditions
- Add proper waits
- Improve test isolation
- Update test data

### Test Coverage Monitoring

**Metrics:**
- Overall coverage percentage
- Coverage by area
- Coverage trends
- Coverage gaps

**Tools:**
- Codecov for coverage reporting
- GitHub Actions for CI integration
- Coverage reports in PRs

---

## Related Documentation

- [Test Strategy](../01-TEST-STRATEGY.md)
- [Platform Critique](../02-PLATFORM-CRITIQUE.md)
- [Implementation Roadmap](../03-IMPLEMENTATION-ROADMAP.md)
- [Feature Test Plans](./FEATURE_TEST_PLANS.md)

---

*This document should be reviewed and updated regularly as the test suite evolves.*

