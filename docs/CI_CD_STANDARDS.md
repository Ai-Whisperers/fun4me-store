# CI/CD and Type Enforcement Standards

## Overview

This document outlines the standards for the Vete platform CI/CD pipeline and TypeScript type enforcement.

## Type Enforcement Strategy

We distinguish between different areas of the codebase to balance safety and development speed.

| Area | Strictness | Config File | CI Command |
|------|------------|-------------|------------|
| **Production Code** (`app/`, `lib/`) | 🚨 **High** | `tsconfig.json` | `npm run typecheck` |
| **Tests & E2E** (`tests/`, `e2e/`) | ⚠️ **Moderate** | `tsconfig.test.json` | `npm run typecheck:tests` |
| **Utility Scripts** (`scripts/`) | ✅ **Loose** | `tsconfig.scripts.json` | `npm run typecheck:scripts` |

### Production Code Standards
- `strict: true` is mandatory.
- No non-null assertions (`!`) unless documented as safe (see `NON_NULL_ASSERTIONS_ANALYSIS.md`).
- Explicit return types for all public API handlers and server actions.
- Zod validation for all external inputs.

### Test Code Standards
- `strict: false` is allowed to facilitate mocking.
- `noImplicitAny: false` allowed to reduce boilerplate in complex mocks.
- Focus is on ensuring tests compile and match service interfaces.

### Script Standards
- `allowJs: true` enabled.
- Loose enforcement to allow quick utility development.

## CI/CD Pipeline Structure

### 1. Fast Checks (Lint + Type Check)
- **ESLint**: Standard rules with some relaxed rules for tests.
- **Type Check**: Three distinct checks for Production, Tests, and Scripts.

### 2. Unit Testing
- **Vitest**: Aiming for 100% pass rate for unit tests.
- **Node Version**: Standardized on **Node 20** across all workflows.

### 3. Integration & API Testing
- Requires database setup (WIP for fully automated CI).
- Currently allowed to fail with `continue-on-error: true` until database isolation is solved.

### 4. E2E Testing
- **Playwright**: Comprehensive browser testing.
- Target: `main` and `develop` branches.

## Deployment Strategy

### Primary Production
- **GCP VM**: `34.151.201.27:3000`.
- Automated via `.github/workflows/deploy-gcp.yml`.

### Secondary/Staging
- **Vercel**: `https://vetepy-bay.vercel.app`.
- Automated via `.github/workflows/deploy-vercel.yml`.

## Cron Jobs

- Managed via GitHub Actions `.github/workflows/cron.yml`.
- Calls authenticated endpoints at `/api/cron/*`.
- **Health check** mandatory before calling cron logic.
- **Timing-safe authentication** via `CRON_SECRET`.

---

*Last Updated: February 16, 2026*
