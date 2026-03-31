# Test Documentation Generator

Generate comprehensive test documentation.

## Scan Test Files

1. Find all test files:
   ```bash
   find web/tests -name "*.test.ts" -o -name "*.spec.ts"
   ```

2. Extract metadata:
   - `@tags` comments (integration, security, critical, etc.)
   - `describe()` block names
   - `it()` test descriptions
   - File locations

## Generate Documentation

### TEST-CATALOG.md

Organize all tests by feature:

```markdown
# Test Catalog

## Authentication
- `tests/integration/auth/login.test.ts` (5 tests)
  - should login with valid credentials
  - should reject invalid password
  ...

## Payments
- `tests/integration/payments/payment-recording.test.ts` (12 tests)
  ...
```

### COVERAGE-GAPS.md

Document known untested areas:

```markdown
# Known Coverage Gaps

## High Priority
- [ ] Webhook signature verification
- [ ] Concurrent payment race conditions

## Medium Priority
- [ ] Email template rendering
...
```

### RUN-GUIDE.md

Commands for running test subsets:

```markdown
# Test Run Guide

## By Category
npm test -- --grep "@critical"
npm test -- --grep "@security"

## By Feature
npm test -- tests/integration/payments/
npm test -- tests/unit/actions/

## By File
npx vitest run tests/integration/payments/duplicate-prevention.test.ts
```

## Output Location

Create files in `docs/testing/`:
- `docs/testing/TEST-CATALOG.md`
- `docs/testing/COVERAGE-GAPS.md`
- `docs/testing/RUN-GUIDE.md`
