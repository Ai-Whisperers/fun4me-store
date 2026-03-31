# Test Performance Optimization

Profile and optimize the test suite performance.

## Profile Tests

```bash
cd web && npm run test:unit -- --reporter=verbose 2>&1 | tee test-timing.log
```

## Find Slow Tests

1. Parse timing output to find slowest files
2. Analyze each slow file for:
   - Heavy mock setup in beforeEach (should be beforeAll if shared)
   - Unnecessary async waits (remove artificial delays)
   - State leaking between tests (missing cleanup)
   - Large fixture data (should use minimal data)

## Optimization Patterns

### Move shared setup to beforeAll
```typescript
// BEFORE (runs for each test)
beforeEach(() => {
  heavySetup()
})

// AFTER (runs once)
beforeAll(() => {
  heavySetup()
})
beforeEach(() => {
  lightReset()
})
```

### Use test.concurrent for independent tests
```typescript
describe('Independent tests', () => {
  test.concurrent('test 1', async () => { /* ... */ })
  test.concurrent('test 2', async () => { /* ... */ })
})
```

### Replace heavy mocks with mockState
```typescript
// BEFORE (creates new mock each time)
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({ /* 50 lines of mock */ })
}))

// AFTER (reuses singleton)
vi.mock('@/lib/supabase/server', () => getSupabaseServerMock())
mockState.setAuthScenario('VET')
```

## Target

- Reduce total test time by 30%
- No single test file > 5 seconds
- Parallel execution where possible

## Measure

```bash
# Before
time npm run test:unit

# After optimizations
time npm run test:unit
```
