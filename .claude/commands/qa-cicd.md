# CI/CD Test Integration Review

Review and improve test integration with CI/CD pipeline.

## Analyze Current Setup

1. Check GitHub Actions workflows:
   ```bash
   ls .github/workflows/
   cat .github/workflows/*.yml
   ```

2. Verify test configuration:
   - Are unit tests running on every PR?
   - Are integration tests running?
   - Is coverage being tracked?
   - Are E2E tests running?

## Identify Issues

### Common Problems
- [ ] Tests not running on PR
- [ ] Missing coverage thresholds
- [ ] Flaky tests causing false failures
- [ ] Slow test runs blocking merges
- [ ] Missing test database for integration tests

## Recommended Workflow

```yaml
name: Tests

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: cd web && npm ci
      - run: cd web && npm run test:unit -- --coverage
      - name: Check coverage threshold
        run: |
          # Fail if coverage drops below 70%
          coverage=$(cat web/coverage/coverage-summary.json | jq '.total.lines.pct')
          if (( $(echo "$coverage < 70" | bc -l) )); then
            echo "Coverage $coverage% is below 70% threshold"
            exit 1
          fi

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
    steps:
      - uses: actions/checkout@v4
      - run: cd web && npm ci
      - run: cd web && npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd web && npm ci
      - run: npx playwright install --with-deps
      - run: cd web && npm run test:e2e
```

## Improvements to Add

1. **Test splitting** - Run tests in parallel across multiple jobs
2. **Test retries** - Retry flaky tests up to 2 times
3. **Coverage badges** - Display coverage in README
4. **PR comments** - Post coverage diff on PRs
5. **Caching** - Cache node_modules and Playwright browsers

## Output

Update or create `.github/workflows/tests.yml` with improvements.
