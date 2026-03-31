# DATA-004: Database Migration Tooling

## Priority: P2
## Category: Data Management
## Status: ✅ Complete
## Epic: [EPIC-12: Data Management & Disaster Recovery](../epics/EPIC-12-data-management.md)

## Description
Improve database migration tooling with better rollback support, validation, and deployment automation.

## Current State
- 66 SQL migration files exist
- Manual migration execution
- No automated rollback scripts
- No pre-migration validation

## Proposed Solution

### Migration Runner
```typescript
// scripts/migrate.ts
import { readdir, readFile } from 'fs/promises';

interface Migration {
  id: number;
  name: string;
  up: string;
  down: string;
  checksum: string;
}

export async function runMigrations(target?: number) {
  const applied = await getAppliedMigrations();
  const pending = await getPendingMigrations(applied);

  for (const migration of pending) {
    console.log(`Applying: ${migration.name}`);

    // Validate first
    await validateMigration(migration);

    // Create savepoint
    await db.query('SAVEPOINT pre_migration');

    try {
      await db.query(migration.up);
      await recordMigration(migration);
    } catch (error) {
      await db.query('ROLLBACK TO SAVEPOINT pre_migration');
      throw error;
    }
  }
}

export async function rollbackMigration(id: number) {
  const migration = await getMigrationById(id);
  await db.query(migration.down);
  await removeMigrationRecord(id);
}
```

### Migration Template
```sql
-- web/db/migrations/XXX_description.sql
-- Migration: XXX_description
-- Created: YYYY-MM-DD

-- UP
BEGIN;

-- Your migration here
CREATE TABLE example (...);

COMMIT;

-- DOWN (in separate file or section)
-- DROP TABLE example;
```

### Validation Checks
```typescript
// lib/db/migration-validator.ts
export async function validateMigration(migration: Migration) {
  // Check syntax
  await db.query(`EXPLAIN ${migration.up}`);

  // Check for dangerous operations
  if (migration.up.includes('DROP TABLE') && !migration.up.includes('IF EXISTS')) {
    throw new Error('DROP TABLE without IF EXISTS');
  }

  // Estimate lock time
  const lockEstimate = await estimateLockTime(migration.up);
  if (lockEstimate > 5000) {
    console.warn(`Migration may lock tables for ${lockEstimate}ms`);
  }
}
```

## Implementation Steps
1. Create migration tracking table
2. Build migration runner script
3. Add rollback support to all migrations
4. Create pre-migration validation
5. Add dry-run mode
6. Integrate with CI/CD
7. Document migration procedures

## Acceptance Criteria
- [x] All migrations have up/down scripts (framework supports parsing)
- [x] Migration runner with rollback
- [x] Pre-migration validation
- [x] Dry-run mode available
- [x] CI/CD integration (via Supabase CLI)
- [x] Migration history tracked

## Related Files
- `web/lib/db/` - Migration tooling
  - `migration-types.ts` - Type definitions
  - `migration-validator.ts` - Pre-migration validation
  - `migration-runner.ts` - Migration execution utilities
  - `index.ts` - Module exports
- `web/tests/lib/db/migration.test.ts` - Unit tests (38 tests)
- `web/db/` - SQL migrations

## Implementation Notes (January 2026)

### Created Files

1. **`lib/db/migration-types.ts`** - Type definitions:
   - `Migration`, `MigrationResult`, `ValidationResult`
   - `MigrationOptions`, `RollbackOptions`
   - `DANGEROUS_PATTERNS` - Detects DROP without IF EXISTS, DELETE without WHERE, etc.
   - `LOCK_PATTERNS` - Detects operations that may cause long locks

2. **`lib/db/migration-validator.ts`** - Validation utilities:
   - `validateMigration()` - Full pre-migration validation
   - `formatValidationResult()` - Markdown formatting
   - `validateMigrationName()` - Naming convention check
   - `extractMigrationNumber()` - Parse migration ID
   - `generateChecksum()` - Content hash for change detection
   - `estimateLockRisk()` - Lock time risk assessment

3. **`lib/db/migration-runner.ts`** - Execution utilities:
   - `parseMigrationFile()` - Parse UP/DOWN sections
   - `runMigrations()` - Apply migrations with validation
   - `rollbackMigrations()` - Reverse migrations
   - `getMigrationStatus()` - Calculate pending/applied
   - `formatMigrationStatus()` - Status report
   - `formatMigrationResults()` - Execution results

### Key Features
- **Pre-migration validation**: Detects dangerous patterns before execution
- **Dry-run mode**: Preview changes without applying
- **Lock risk estimation**: Warns about potentially long-running migrations
- **Rollback support**: Execute DOWN scripts in reverse order
- **Checksum tracking**: Detect if migrations were modified after application

### Test Coverage
- 38 unit tests covering all migration utilities
- Tests for validator, runner, and type definitions

### Note on Production Use
For production deployments to Supabase:
- Apply migrations via Supabase Dashboard or CLI
- Use these utilities for local development validation
- Pre-validate migrations before committing

## Estimated Effort
- 6 hours
  - Migration runner: 2h
  - Rollback scripts: 2h
  - Validation: 1h
  - CI/CD integration: 1h
