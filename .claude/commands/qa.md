# QA Commands Index

List all available QA slash commands for this project.

## Available Commands

| Command | Description |
|---------|-------------|
| `/qa-coverage` | Analyze test coverage and identify gaps |
| `/qa-migrate-tests` | Find and migrate high-boilerplate test files |
| `/qa-auth-audit` | Audit API routes for authorization tests |
| `/qa-db-mocks` | Verify database mocking and cleanup |
| `/qa-e2e-gaps` | Analyze E2E test coverage vs user journeys |
| `/qa-fixtures` | Expand test fixtures for all entity types |
| `/qa-performance` | Profile and optimize slow tests |
| `/qa-errors` | Audit error handling test coverage |
| `/qa-docs` | Generate test documentation |
| `/qa-cicd` | Review CI/CD test integration |

## Quick Commands

```bash
# Run all unit tests
cd web && npm run test:unit

# Run with coverage
cd web && npm run test:unit -- --coverage

# Run specific test file
cd web && npx vitest run tests/integration/payments/

# Run tests matching pattern
cd web && npx vitest run --grep "payment"

# Watch mode
cd web && npx vitest --watch
```

## QA Infrastructure

Key files:
- `lib/test-utils/` - Test utilities, fixtures, mocks
- `lib/test-utils/CHEATSHEET.md` - Quick reference
- `tests/__helpers__/` - Cleanup manager, factories
- `vitest.setup.ts` - Global test setup

## Current Stats

- Unit tests: 563 passing
- Integration tests: 498 passing
- Refactored test files: 3

Run any command above by typing it in the chat!
