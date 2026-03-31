# TECH-010: Set Up GitHub Actions CI/CD Pipeline

**Category**: Technical Debt  
**Priority**: P1 - High  
**Status**: Open  
**Effort**: 4-6 hours  
**Impact**: High - Automated quality gates  
**Created**: 2025-01-19  
**Source**: critique/10-dependencies-roast.md (DEP-006)

## Summary

No GitHub Actions workflow exists. Tests, linting, and type-checking only run locally (maybe), leading to "works on my machine" syndrome.

## Problem

```bash
ls .github/workflows/
# No such file or directory
```

**Current reality:**
- Tests run locally (or not at all)
- No automated security scanning
- Type errors discovered in production
- Manual deployment process
- No quality gates before merge

## Solution

Create comprehensive CI/CD pipeline with multiple jobs.

### Step 1: Create CI Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      - run: cd web && npm ci
      - run: cd web && npm run lint

  type-check:
    name: Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      - run: cd web && npm ci
      - run: cd web && npx tsc --noEmit

  test-unit:
    name: Unit Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      - run: cd web && npm ci
      - run: cd web && npm run test:unit

  test-e2e:
    name: E2E Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      - run: cd web && npm ci
      - run: cd web && npx playwright install --with-deps
      - run: cd web && npm run test:e2e

  security:
    name: Security Audit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      - run: cd web && npm audit --audit-level=moderate

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [lint, type-check, test-unit]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      - run: cd web && npm ci
      - run: cd web && npm run build
```

### Step 2: Add Status Badges to README

```markdown
# Vete

![CI](https://github.com/owner/vete/workflows/CI/badge.svg)
![Tests](https://github.com/owner/vete/workflows/Tests/badge.svg)
```

### Step 3: Branch Protection Rules

Configure on GitHub:
- Require CI to pass before merge
- Require code review
- Require branch to be up to date

## Acceptance Criteria
- [ ] `.github/workflows/ci.yml` created
- [ ] All jobs pass on main branch
- [ ] Pull requests trigger CI automatically
- [ ] Branch protection rules configured
- [ ] Status badges added to README
- [ ] Team trained on CI process

## Future Enhancements

After basic CI:
- Add code coverage reporting (Codecov)
- Add dependency vulnerability scanning (Dependabot)
- Add automated deployment to staging
- Add performance testing
- Add lighthouse CI for performance metrics

## Related
- TECH-008: Enable ESLint in builds
- TECH-009: Enable TypeScript checking
- TST-020: Add pre-commit hooks
- SEC-025: Remove credentials from git
