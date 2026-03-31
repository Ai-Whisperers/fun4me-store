# NPM Scripts Reference - Vete Platform

Complete reference for all 83 npm scripts available in the project.

## Quick Reference

| Category | Count | Most Used |
|----------|-------|-----------|
| Development | 8 | `npm run dev`, `npm run build` |
| Testing - Core | 14 | `npm run test`, `npm run test:unit` |
| Testing - E2E | 10 | `npm run test:e2e`, `npm run test:e2e:ui` |
| Testing - Features | 7 | `npm run test:feature:*` |
| Database | 4 | `npm run db:setup`, `npm run db:clean` |
| Seeding V1 | 8 | `npm run seed`, `npm run seed:demo` |
| Seeding V2 | 12 | `npm run seed:v2`, `npm run seed:v2:demo` |
| Screenshots | 7 | `npm run screenshots` |
| Utilities | 13 | `npm run sync:images`, `npm run reset-dev` |

---

## Development Scripts

### Core Development

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js development server on port 3000 |
| `npm run build` | Create production build |
| `npm run start` | Start production server (requires build first) |

### Code Quality

| Command | Description |
|---------|-------------|
| `npm run lint` | Run ESLint on the codebase |
| `npm run lint:fix` | Run ESLint and auto-fix issues |
| `npm run typecheck` | Run TypeScript compiler (tsc --noEmit) |
| `npm run format` | Format all files with Prettier |
| `npm run format:check` | Check formatting without modifying files |

### Git Hooks

| Command | Description |
|---------|-------------|
| `npm run prepare` | Set up Husky git hooks (runs automatically on npm install) |

---

## Testing Scripts

### Core Testing

| Command | Description |
|---------|-------------|
| `npm run test` | Run all tests (unit + integration + api + e2e) |
| `npm run test:all` | Alias for `npm run test` |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run test:coverage` | Run tests and generate coverage report |
| `npm run test:coverage:html` | Generate HTML coverage report |

### Unit & Integration Tests

| Command | Description |
|---------|-------------|
| `npm run test:unit` | Run unit tests with coverage (`tests/unit/`) |
| `npm run test:integration` | Run integration tests (`tests/integration/`) |
| `npm run test:system` | Run system tests (`tests/system/`) |
| `npm run test:functionality` | Run functionality tests (`tests/functionality/`) |
| `npm run test:uat` | Run user acceptance tests (`tests/uat/`) |
| `npm run test:api` | Run API route tests (`tests/api/`) |
| `npm run test:security` | Run security tests (`tests/security/`) |

### End-to-End Tests (Playwright)

| Command | Description |
|---------|-------------|
| `npm run test:e2e` | Run all Playwright E2E tests |
| `npm run test:e2e:headed` | Run E2E tests with visible browser |
| `npm run test:e2e:ui` | Run E2E tests with Playwright UI |
| `npm run test:public` | E2E tests for public pages only |
| `npm run test:store` | E2E tests for store pages only |
| `npm run test:portal` | E2E tests for portal pages only |
| `npm run test:dashboard` | E2E tests for dashboard pages only |
| `npm run test:tools` | E2E tests for tools pages only |

### Critical Path Testing

| Command | Description |
|---------|-------------|
| `npm run test:critical` | Run critical path tests (tagged @critical) |
| `npm run test:smoke` | Quick smoke tests (unit + public E2E) |

### Feature-Specific Tests

| Command | Description |
|---------|-------------|
| `npm run test:feature:pets` | Pet management tests |
| `npm run test:feature:booking` | Booking/appointment tests |
| `npm run test:feature:vaccines` | Vaccine tracking tests |
| `npm run test:feature:inventory` | Inventory management tests |
| `npm run test:feature:finance` | Finance/expense tests |
| `npm run test:feature:medical` | Medical records tests |
| `npm run test:feature:store` | E-commerce store tests |

### Test Database

| Command | Description |
|---------|-------------|
| `npm run test:db:reset` | Reset test database |
| `npm run test:db:seed` | Seed test database |
| `npm run test:db:setup` | Reset and seed test database |

---

## Database Scripts

### Setup & Maintenance

| Command | Description |
|---------|-------------|
| `npm run db:setup` | Full database setup (schema + functions + migrations) |
| `npm run db:schema` | Apply schema only |
| `npm run db:clean` | Clean/reset database |
| `npm run db:fixes` | Apply database fixes |

---

## Seeding Scripts

### V1 Seeder (Original)

| Command | Description |
|---------|-------------|
| `npm run seed` | Run default seed |
| `npm run seed:basic` | Seed basic/minimal data |
| `npm run seed:reference` | Seed reference data only |
| `npm run seed:full` | Seed complete dataset |
| `npm run seed:demo` | Seed demo data |
| `npm run seed:clear` | Clear seeded data |
| `npm run seed:reset` | Reset seed data (same as clear) |
| `npm run seed:dashboard` | Seed dashboard test data |

### V2 Seeder (Enhanced)

The V2 seeder supports variants, tenants, and additional options.

| Command | Description |
|---------|-------------|
| `npm run seed:v2` | Run V2 seeder (default variant) |
| `npm run seed:v2:basic` | V2 seeder with basic variant |
| `npm run seed:v2:integration` | V2 seeder for integration testing |
| `npm run seed:v2:e2e` | V2 seeder for E2E testing |
| `npm run seed:v2:demo` | V2 seeder with demo data |
| `npm run seed:v2:reset` | V2 reset variant |
| `npm run seed:v2:dry-run` | V2 dry run (no actual changes) |
| `npm run seed:v2:verbose` | V2 with verbose logging |

### V2 Tenant-Specific

| Command | Description |
|---------|-------------|
| `npm run seed:v2:terrapet` | Seed Adris clinic only |
| `npm run seed:v2:petlife` | Seed PetLife clinic only |
| `npm run seed:v2:all` | Seed all clinics (terrapet, petlife) |

### Demo Data Generator

| Command | Description |
|---------|-------------|
| `npm run seed:demo-data` | Generate demo data |
| `npm run seed:demo-data:all` | Generate demo data for all tenants (verbose) |

---

## Screenshot Scripts

Used for generating screenshots for documentation and marketing.

| Command | Description |
|---------|-------------|
| `npm run screenshots` | Run screenshot capture tests |
| `npm run screenshots:owner` | Capture owner role screenshots |
| `npm run screenshots:vet` | Capture vet role screenshots |
| `npm run screenshots:admin` | Capture admin role screenshots |
| `npm run screenshots:public` | Capture public page screenshots |
| `npm run screenshots:all` | Capture all role combinations |
| `npm run screenshots:capture` | Run capture script directly |

---

## Utility Scripts

### Image Management

| Command | Description |
|---------|-------------|
| `npm run sync:images` | Sync clinic images from storage |
| `npm run sync:images:watch` | Sync images with file watching |
| `npm run update:images` | Update product images |
| `npm run update:images:dry-run` | Preview image updates (no changes) |

### Inventory Management

| Command | Description |
|---------|-------------|
| `npm run inventory:template` | Generate inventory import template |
| `npm run inventory:gsheet:create` | Create Google Sheets inventory template |
| `npm run inventory:gsheet:update` | Update Google Sheets inventory |

### Development Utilities

| Command | Description |
|---------|-------------|
| `npm run reset-dev` | Full development environment reset (PowerShell) |
| `npm run kill-node` | Force kill all Node.js processes (PowerShell) |

---

## Script Usage Examples

### Daily Development Workflow

```bash
# Start development
npm run dev

# Run tests before committing
npm run lint && npm run typecheck && npm run test:smoke

# Full test suite
npm run test
```

### Setting Up Fresh Environment

```bash
# Install dependencies
npm install

# Set up database
npm run db:setup

# Seed demo data
npm run seed:v2:demo

# Start development
npm run dev
```

### Testing Specific Features

```bash
# Test pet functionality
npm run test:feature:pets

# Test store end-to-end
npm run test:store

# Run integration tests only
npm run test:integration
```

### Preparing for Deployment

```bash
# Lint and type check
npm run lint:fix
npm run typecheck

# Run full test suite
npm run test

# Build
npm run build
```

### Debugging E2E Tests

```bash
# Run with visible browser
npm run test:e2e:headed

# Run with Playwright UI (best for debugging)
npm run test:e2e:ui
```

### Multi-Tenant Seeding

```bash
# Seed specific clinic
npm run seed:v2:terrapet

# Seed all clinics with verbose output
npm run seed:v2:all -- --verbose

# Preview what would be seeded
npm run seed:v2:dry-run
```

---

## Environment Variables for Scripts

Some scripts require specific environment variables:

| Script | Required Variables |
|--------|-------------------|
| `db:*` | `DATABASE_URL`, `SUPABASE_*` |
| `seed:*` | `DATABASE_URL`, `SUPABASE_*` |
| `test:e2e:*` | `BASE_URL` (optional, default: localhost:3000) |
| `inventory:gsheet:*` | `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY` |
| `screenshots:*` | `ROLE` (optional), `PAGE` (optional) |

---

## Script Configuration Files

| File | Purpose |
|------|---------|
| `vitest.config.ts` | Unit test configuration |
| `vitest.integration.config.ts` | Integration test configuration |
| `playwright.config.ts` | E2E test configuration |
| `eslint.config.mjs` | Linting configuration |
| `.prettierrc` | Formatting configuration |
| `drizzle.config.ts` | ORM configuration |

---

*Last updated: January 2026*
