/**
 * Migration Tooling Tests
 *
 * DATA-004: Tests for migration utilities
 */

import { describe, it, expect, vi } from 'vitest'
import {
  validateMigration,
  formatValidationResult,
  validateMigrationName,
  extractMigrationNumber,
  generateChecksum,
  estimateLockRisk,
} from '@/lib/db/migration-validator'
import {
  parseMigrationFile,
  runMigrations,
  rollbackMigrations,
  getMigrationStatus,
  formatMigrationStatus,
  formatMigrationResults,
} from '@/lib/db/migration-runner'
import type { Migration, MigrationRecord } from '@/lib/db/migration-types'
import { DANGEROUS_PATTERNS, LOCK_PATTERNS } from '@/lib/db/migration-types'

describe('Migration Validator', () => {
  describe('validateMigration', () => {
    it('should pass valid migration', () => {
      const migration: Migration = {
        id: 1,
        name: 'create_table',
        filename: '001_create_table.sql',
        upSql: 'CREATE TABLE test (id UUID PRIMARY KEY);',
        downSql: 'DROP TABLE IF EXISTS test;',
        checksum: 'abc123',
      }

      const result = validateMigration(migration)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect DROP TABLE without IF EXISTS', () => {
      const migration: Migration = {
        id: 1,
        name: 'drop_table',
        filename: '001_drop_table.sql',
        upSql: 'DROP TABLE test;',
        checksum: 'abc123',
      }

      const result = validateMigration(migration)
      expect(result.errors.some((e) => e.code === 'DROP_WITHOUT_IF_EXISTS')).toBe(
        true
      )
    })

    it('should detect DELETE without WHERE', () => {
      const migration: Migration = {
        id: 1,
        name: 'delete_all',
        filename: '001_delete_all.sql',
        upSql: 'DELETE FROM test;',
        checksum: 'abc123',
      }

      const result = validateMigration(migration)
      expect(result.errors.some((e) => e.code === 'DELETE_WITHOUT_WHERE')).toBe(
        true
      )
    })

    it('should warn about missing rollback', () => {
      const migration: Migration = {
        id: 1,
        name: 'no_rollback',
        filename: '001_no_rollback.sql',
        upSql: 'ALTER TABLE test ADD COLUMN new_col TEXT;',
        checksum: 'abc123',
      }

      const result = validateMigration(migration)
      expect(result.warnings.some((w) => w.code === 'NO_ROLLBACK')).toBe(true)
    })

    it('should fail on empty migration', () => {
      const migration: Migration = {
        id: 1,
        name: 'empty',
        filename: '001_empty.sql',
        upSql: '   ',
        checksum: 'abc123',
      }

      const result = validateMigration(migration)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.code === 'EMPTY_MIGRATION')).toBe(true)
    })

    it('should detect unbalanced parentheses', () => {
      const migration: Migration = {
        id: 1,
        name: 'unbalanced',
        filename: '001_unbalanced.sql',
        upSql: 'CREATE TABLE test (id UUID;',
        checksum: 'abc123',
      }

      const result = validateMigration(migration)
      expect(result.errors.some((e) => e.code === 'UNBALANCED_PARENS')).toBe(
        true
      )
    })

    it('should detect unclosed quotes', () => {
      const migration: Migration = {
        id: 1,
        name: 'unclosed_quote',
        filename: '001_unclosed_quote.sql',
        upSql: "SELECT * FROM test WHERE name = 'unclosed;",
        checksum: 'abc123',
      }

      const result = validateMigration(migration)
      expect(result.errors.some((e) => e.code === 'UNCLOSED_QUOTE')).toBe(true)
    })
  })

  describe('formatValidationResult', () => {
    it('should format passed validation', () => {
      const result = { valid: true, warnings: [], errors: [] }
      const formatted = formatValidationResult(result)
      expect(formatted).toContain('✅')
      expect(formatted).toContain('passed')
    })

    it('should format failed validation with errors', () => {
      const result = {
        valid: false,
        warnings: [],
        errors: [
          { code: 'TEST', message: 'Test error', fatal: true },
        ],
      }
      const formatted = formatValidationResult(result)
      expect(formatted).toContain('❌')
      expect(formatted).toContain('failed')
      expect(formatted).toContain('Test error')
      expect(formatted).toContain('FATAL')
    })

    it('should include warnings', () => {
      const result = {
        valid: true,
        warnings: [{ code: 'WARN', message: 'Test warning' }],
        errors: [],
      }
      const formatted = formatValidationResult(result)
      expect(formatted).toContain('⚠️')
      expect(formatted).toContain('Test warning')
    })
  })

  describe('validateMigrationName', () => {
    it('should accept valid migration names', () => {
      expect(validateMigrationName('001_create_table.sql')).toBe(true)
      expect(validateMigrationName('042_add_index.sql')).toBe(true)
      expect(validateMigrationName('100_multi_word_name.sql')).toBe(true)
    })

    it('should reject invalid migration names', () => {
      expect(validateMigrationName('create_table.sql')).toBe(false)
      expect(validateMigrationName('1_create_table.sql')).toBe(false)
      expect(validateMigrationName('001_CreateTable.sql')).toBe(false)
      expect(validateMigrationName('001_create-table.sql')).toBe(false)
    })
  })

  describe('extractMigrationNumber', () => {
    it('should extract migration number', () => {
      expect(extractMigrationNumber('001_create_table.sql')).toBe(1)
      expect(extractMigrationNumber('042_add_index.sql')).toBe(42)
      expect(extractMigrationNumber('100_multi_word.sql')).toBe(100)
    })

    it('should return null for invalid names', () => {
      expect(extractMigrationNumber('create_table.sql')).toBeNull()
      expect(extractMigrationNumber('abc_table.sql')).toBeNull()
    })
  })

  describe('generateChecksum', () => {
    it('should generate consistent checksums', () => {
      const sql = 'CREATE TABLE test (id UUID);'
      const checksum1 = generateChecksum(sql)
      const checksum2 = generateChecksum(sql)
      expect(checksum1).toBe(checksum2)
    })

    it('should generate different checksums for different SQL', () => {
      const checksum1 = generateChecksum('CREATE TABLE test1 (id UUID);')
      const checksum2 = generateChecksum('CREATE TABLE test2 (id UUID);')
      expect(checksum1).not.toBe(checksum2)
    })

    it('should normalize whitespace', () => {
      const sql1 = 'CREATE TABLE test (id UUID);'
      const sql2 = 'CREATE  TABLE   test  (id  UUID);'
      expect(generateChecksum(sql1)).toBe(generateChecksum(sql2))
    })
  })

  describe('estimateLockRisk', () => {
    it('should return low for simple queries', () => {
      expect(estimateLockRisk('CREATE TABLE test (id UUID);')).toBe('low')
    })

    it('should return medium for index creation', () => {
      expect(estimateLockRisk('CREATE INDEX idx ON test (column);')).toBe(
        'medium'
      )
    })

    it('should return high for NOT NULL without DEFAULT', () => {
      expect(
        estimateLockRisk('ALTER TABLE test ADD COLUMN col TEXT NOT NULL;')
      ).toBe('high')
    })

    it('should increase risk for operations on critical tables', () => {
      const risk = estimateLockRisk(
        'ALTER TABLE profiles ADD COLUMN col TEXT NOT NULL;'
      )
      expect(['high', 'critical']).toContain(risk)
    })
  })
})

describe('Migration Runner', () => {
  describe('parseMigrationFile', () => {
    it('should parse migration with UP and DOWN sections', () => {
      const content = `
CREATE TABLE test (id UUID);

-- DOWN
DROP TABLE IF EXISTS test;
      `.trim()

      const migration = parseMigrationFile('001_create_test.sql', content)

      expect(migration.id).toBe(1)
      expect(migration.name).toBe('create_test')
      expect(migration.upSql).toContain('CREATE TABLE')
      expect(migration.downSql).toContain('DROP TABLE')
    })

    it('should parse migration without DOWN section', () => {
      const content = 'CREATE TABLE test (id UUID);'
      const migration = parseMigrationFile('001_create_test.sql', content)

      expect(migration.upSql).toContain('CREATE TABLE')
      expect(migration.downSql).toBeUndefined()
    })

    it('should support ROLLBACK marker', () => {
      const content = `
CREATE TABLE test (id UUID);

-- ROLLBACK
DROP TABLE IF EXISTS test;
      `.trim()

      const migration = parseMigrationFile('001_create_test.sql', content)
      expect(migration.downSql).toContain('DROP TABLE')
    })
  })

  describe('runMigrations', () => {
    it('should apply valid migrations', async () => {
      const migrations: Migration[] = [
        {
          id: 1,
          name: 'test',
          filename: '001_test.sql',
          upSql: 'SELECT 1;',
          downSql: 'SELECT 1;',
          checksum: 'abc',
        },
      ]

      const executor = vi.fn().mockResolvedValue(undefined)
      const results = await runMigrations(migrations, {}, executor)

      expect(results).toHaveLength(1)
      expect(results[0].status).toBe('applied')
      expect(executor).toHaveBeenCalledWith('SELECT 1;')
    })

    it('should skip migrations in dry run mode', async () => {
      const migrations: Migration[] = [
        {
          id: 1,
          name: 'test',
          filename: '001_test.sql',
          upSql: 'SELECT 1;',
          checksum: 'abc',
        },
      ]

      const executor = vi.fn()
      const results = await runMigrations(migrations, { dryRun: true }, executor)

      expect(results).toHaveLength(1)
      expect(results[0].status).toBe('skipped')
      expect(executor).not.toHaveBeenCalled()
    })

    it('should stop on first failure', async () => {
      const migrations: Migration[] = [
        {
          id: 1,
          name: 'test1',
          filename: '001_test1.sql',
          upSql: 'SELECT 1;',
          downSql: 'SELECT 1;',
          checksum: 'abc',
        },
        {
          id: 2,
          name: 'test2',
          filename: '002_test2.sql',
          upSql: 'SELECT 2;',
          downSql: 'SELECT 2;',
          checksum: 'def',
        },
      ]

      const executor = vi
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Database error'))

      const results = await runMigrations(migrations, { force: true }, executor)

      expect(results).toHaveLength(2)
      expect(results[0].status).toBe('applied')
      expect(results[1].status).toBe('failed')
    })

    it('should filter by target', async () => {
      const migrations: Migration[] = [
        { id: 1, name: 't1', filename: '001_t1.sql', upSql: 'S1;', downSql: 'S1;', checksum: 'a' },
        { id: 2, name: 't2', filename: '002_t2.sql', upSql: 'S2;', downSql: 'S2;', checksum: 'b' },
        { id: 3, name: 't3', filename: '003_t3.sql', upSql: 'S3;', downSql: 'S3;', checksum: 'c' },
      ]

      const executor = vi.fn().mockResolvedValue(undefined)
      const results = await runMigrations(
        migrations,
        { target: 2, force: true },
        executor
      )

      expect(results).toHaveLength(2)
      expect(executor).toHaveBeenCalledTimes(2)
    })
  })

  describe('rollbackMigrations', () => {
    it('should rollback migrations in reverse order', async () => {
      const migrations: Migration[] = [
        { id: 1, name: 't1', filename: '001_t1.sql', upSql: 'U1;', downSql: 'D1;', checksum: 'a' },
        { id: 2, name: 't2', filename: '002_t2.sql', upSql: 'U2;', downSql: 'D2;', checksum: 'b' },
      ]

      const executor = vi.fn().mockResolvedValue(undefined)
      const results = await rollbackMigrations(
        migrations,
        { steps: 2 },
        executor
      )

      expect(results).toHaveLength(2)
      expect(executor).toHaveBeenNthCalledWith(1, 'D2;')
      expect(executor).toHaveBeenNthCalledWith(2, 'D1;')
    })

    it('should skip migrations without down SQL', async () => {
      const migrations: Migration[] = [
        { id: 1, name: 't1', filename: '001_t1.sql', upSql: 'U1;', checksum: 'a' },
      ]

      const executor = vi.fn()
      const results = await rollbackMigrations(migrations, {}, executor)

      expect(results).toHaveLength(1)
      expect(results[0].status).toBe('skipped')
      expect(executor).not.toHaveBeenCalled()
    })

    it('should rollback to target', async () => {
      const migrations: Migration[] = [
        { id: 1, name: 't1', filename: '001_t1.sql', upSql: 'U1;', downSql: 'D1;', checksum: 'a' },
        { id: 2, name: 't2', filename: '002_t2.sql', upSql: 'U2;', downSql: 'D2;', checksum: 'b' },
        { id: 3, name: 't3', filename: '003_t3.sql', upSql: 'U3;', downSql: 'D3;', checksum: 'c' },
      ]

      const executor = vi.fn().mockResolvedValue(undefined)
      const results = await rollbackMigrations(
        migrations,
        { target: 1 },
        executor
      )

      expect(results).toHaveLength(2)
      expect(results.every((r) => r.status === 'rolled_back')).toBe(true)
    })
  })

  describe('getMigrationStatus', () => {
    it('should calculate pending migrations', () => {
      const allMigrations: Migration[] = [
        { id: 1, name: 't1', filename: '001_t1.sql', upSql: '', checksum: 'a' },
        { id: 2, name: 't2', filename: '002_t2.sql', upSql: '', checksum: 'b' },
        { id: 3, name: 't3', filename: '003_t3.sql', upSql: '', checksum: 'c' },
      ]

      const applied: MigrationRecord[] = [
        { id: 1, name: 't1', checksum: 'a', applied_at: new Date(), execution_time_ms: 100 },
      ]

      const status = getMigrationStatus(allMigrations, applied)

      expect(status.current).toBe(1)
      expect(status.pending).toHaveLength(2)
      expect(status.applied).toHaveLength(1)
      expect(status.total).toBe(3)
    })

    it('should handle no applied migrations', () => {
      const allMigrations: Migration[] = [
        { id: 1, name: 't1', filename: '001_t1.sql', upSql: '', checksum: 'a' },
      ]

      const status = getMigrationStatus(allMigrations, [])

      expect(status.current).toBeNull()
      expect(status.pending).toHaveLength(1)
    })
  })

  describe('formatMigrationStatus', () => {
    it('should format status as markdown', () => {
      const status = {
        current: 2,
        pending: [{ id: 3, name: 't3', filename: '003_t3.sql', upSql: '', checksum: 'c' }],
        applied: [
          { id: 1, name: 't1', checksum: 'a', applied_at: new Date(), execution_time_ms: 100 },
          { id: 2, name: 't2', checksum: 'b', applied_at: new Date(), execution_time_ms: 200 },
        ],
        total: 3,
      }

      const formatted = formatMigrationStatus(status)

      expect(formatted).toContain('# Migration Status')
      expect(formatted).toContain('Total migrations: 3')
      expect(formatted).toContain('Applied: 2')
      expect(formatted).toContain('Pending: 1')
      expect(formatted).toContain('Current version: 2')
      expect(formatted).toContain('## Pending Migrations')
      expect(formatted).toContain('## Applied Migrations')
    })
  })

  describe('formatMigrationResults', () => {
    it('should format results as markdown', () => {
      const results = [
        {
          migration: { id: 1, name: 't1', filename: '001_t1.sql', upSql: '', checksum: 'a' },
          status: 'applied' as const,
          duration: 100,
        },
        {
          migration: { id: 2, name: 't2', filename: '002_t2.sql', upSql: '', checksum: 'b' },
          status: 'failed' as const,
          duration: 50,
          error: 'Database error',
        },
      ]

      const formatted = formatMigrationResults(results)

      expect(formatted).toContain('# Migration Results')
      expect(formatted).toContain('Applied: 1')
      expect(formatted).toContain('Failed: 1')
      expect(formatted).toContain('✅')
      expect(formatted).toContain('❌')
      expect(formatted).toContain('Database error')
    })
  })
})

describe('Migration Types', () => {
  describe('DANGEROUS_PATTERNS', () => {
    it('should detect dangerous patterns', () => {
      expect(DANGEROUS_PATTERNS.length).toBeGreaterThan(0)

      const dropPattern = DANGEROUS_PATTERNS.find(
        (p) => p.code === 'DROP_WITHOUT_IF_EXISTS'
      )
      expect(dropPattern).toBeDefined()
      expect(dropPattern?.pattern.test('DROP TABLE users;')).toBe(true)
      expect(dropPattern?.pattern.test('DROP TABLE IF EXISTS users;')).toBe(
        false
      )
    })
  })

  describe('LOCK_PATTERNS', () => {
    it('should detect lock patterns', () => {
      expect(LOCK_PATTERNS.length).toBeGreaterThan(0)

      const indexPattern = LOCK_PATTERNS.find((p) =>
        p.message.includes('INDEX CONCURRENTLY')
      )
      expect(indexPattern).toBeDefined()
      expect(indexPattern?.pattern.test('CREATE INDEX idx ON t (c);')).toBe(
        true
      )
      expect(
        indexPattern?.pattern.test('CREATE INDEX CONCURRENTLY idx ON t (c);')
      ).toBe(false)
    })
  })
})
