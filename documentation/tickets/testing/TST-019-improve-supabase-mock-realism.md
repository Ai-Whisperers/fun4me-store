# TST-019: Replace Generic Supabase Mock with Realistic Factory

## Summary

**Priority**: P0 - Critical  
**Effort**: 6-8 hours  
**Epic**: [EPIC-17: Comprehensive Test Coverage](../epics/EPIC-17-comprehensive-test-coverage.md)  
**Type**: Testing Infrastructure  
**Dependencies**: None  
**Source**: critique/05-testing-roast.md (TEST-003)

## Problem Statement

The current global Supabase mock in `vitest.setup.ts` returns empty arrays for all queries, making tests pass even when code is broken. Tests are lying about actual code behavior.

### Current Mock (Lines 5-23)

```typescript
// vitest.setup.ts
vi.mock('@supabase/supabase-js', async (importOriginal) => {
  return {
    createClient: () => ({
      from: () => ({
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
        insert: vi.fn().mockResolvedValue({ data: [], error: null }),
        update: vi.fn().mockResolvedValue({ data: [], error: null }),
        delete: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }),
  };
});
```

### Problems

| Issue | Impact |
|-------|--------|
| **Always returns []** | Tests pass when queries fail in production |
| **No data validation** | Invalid queries succeed silently |
| **No relationship enforcement** | FK violations not caught |
| **No RLS simulation** | Tenant isolation bugs slip through |
| **No edge cases** | Null handling, empty results never tested |

**Example of a lying test:**

```typescript
// This test PASSES but code is BROKEN
it('should get pet by ID', async () => {
  const pet = await getPetById('invalid-id')  // Query fails in production
  expect(pet).toBeDefined()  // Mock returns [], test passes!
})
```

## Proposed Solution

### Factory-Based Mock Database

Create a realistic in-memory database that:
- Stores data inserted during tests
- Returns data matching query filters
- Enforces relationships (FK checks)
- Simulates RLS tenant isolation
- Provides realistic error scenarios

### Architecture

```
tests/__mocks__/
├── supabase/
│   ├── mock-database.ts       # In-memory database
│   ├── mock-client.ts         # Supabase client wrapper
│   ├── query-builder.ts       # Fluent query API
│   └── index.ts               # Factory exports
└── fixtures/
    └── seed-data.ts           # Default test data
```

## Implementation

### 1. Mock Database Engine

```typescript
// tests/__mocks__/supabase/mock-database.ts

export class MockDatabase {
  private tables: Map<string, Map<string, any>> = new Map()
  private relationships: Map<string, ForeignKey[]> = new Map()

  constructor(initialData?: Record<string, any[]>) {
    if (initialData) {
      this.seed(initialData)
    }
  }

  seed(data: Record<string, any[]>) {
    for (const [table, rows] of Object.entries(data)) {
      if (!this.tables.has(table)) {
        this.tables.set(table, new Map())
      }
      const tableData = this.tables.get(table)!
      rows.forEach(row => tableData.set(row.id, { ...row }))
    }
  }

  select<T>(table: string, columns: string = '*'): QueryBuilder<T> {
    return new QueryBuilder<T>(this, table, columns)
  }

  insert(table: string, data: any | any[]): InsertResult {
    const tableData = this.tables.get(table) || new Map()
    const rows = Array.isArray(data) ? data : [data]

    // Validate foreign keys
    for (const row of rows) {
      this.validateForeignKeys(table, row)
    }

    const inserted = rows.map(row => {
      const id = row.id || crypto.randomUUID()
      const record = { ...row, id, created_at: new Date().toISOString() }
      tableData.set(id, record)
      return record
    })

    this.tables.set(table, tableData)
    return { data: inserted, error: null }
  }

  update(table: string, id: string, data: Partial<any>): UpdateResult {
    const tableData = this.tables.get(table)
    if (!tableData?.has(id)) {
      return { data: null, error: { message: 'Record not found' } }
    }

    const existing = tableData.get(id)!
    const updated = { ...existing, ...data, updated_at: new Date().toISOString() }
    tableData.set(id, updated)

    return { data: updated, error: null }
  }

  delete(table: string, id: string): DeleteResult {
    const tableData = this.tables.get(table)
    if (!tableData?.has(id)) {
      return { data: null, error: { message: 'Record not found' } }
    }

    tableData.delete(id)
    return { data: { id }, error: null }
  }

  private validateForeignKeys(table: string, row: any) {
    const fks = this.relationships.get(table) || []
    for (const fk of fks) {
      if (row[fk.column]) {
        const refTable = this.tables.get(fk.refTable)
        if (!refTable?.has(row[fk.column])) {
          throw new Error(`FK violation: ${table}.${fk.column} references non-existent ${fk.refTable}`)
        }
      }
    }
  }

  reset() {
    this.tables.clear()
  }
}
```

### 2. Query Builder

```typescript
// tests/__mocks__/supabase/query-builder.ts

export class QueryBuilder<T> {
  private filters: Filter[] = []
  private limitValue?: number
  private offsetValue?: number
  private orderBy?: { column: string; ascending: boolean }

  constructor(
    private db: MockDatabase,
    private table: string,
    private columns: string
  ) {}

  eq(column: string, value: any): this {
    this.filters.push({ column, op: '=', value })
    return this
  }

  neq(column: string, value: any): this {
    this.filters.push({ column, op: '!=', value })
    return this
  }

  in(column: string, values: any[]): this {
    this.filters.push({ column, op: 'IN', value: values })
    return this
  }

  limit(count: number): this {
    this.limitValue = count
    return this
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.orderBy = { column, ascending: options?.ascending ?? true }
    return this
  }

  async single(): Promise<{ data: T | null; error: any }> {
    const result = await this.execute()
    if (result.error) return result
    if (result.data.length === 0) return { data: null, error: null }
    if (result.data.length > 1) {
      return { data: null, error: { message: 'Multiple rows returned' } }
    }
    return { data: result.data[0], error: null }
  }

  async execute(): Promise<{ data: T[]; error: any }> {
    const tableData = this.db.getTable(this.table)
    let rows = Array.from(tableData.values())

    // Apply filters
    for (const filter of this.filters) {
      rows = rows.filter(row => this.matchesFilter(row, filter))
    }

    // Apply ordering
    if (this.orderBy) {
      rows.sort((a, b) => {
        const aVal = a[this.orderBy!.column]
        const bVal = b[this.orderBy!.column]
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
        return this.orderBy!.ascending ? cmp : -cmp
      })
    }

    // Apply pagination
    if (this.offsetValue !== undefined) {
      rows = rows.slice(this.offsetValue)
    }
    if (this.limitValue !== undefined) {
      rows = rows.slice(0, this.limitValue)
    }

    return { data: rows as T[], error: null }
  }

  private matchesFilter(row: any, filter: Filter): boolean {
    const value = row[filter.column]
    switch (filter.op) {
      case '=': return value === filter.value
      case '!=': return value !== filter.value
      case 'IN': return filter.value.includes(value)
      default: return true
    }
  }
}
```

### 3. Mock Client Factory

```typescript
// tests/__mocks__/supabase/mock-client.ts

export function createMockSupabase(initialData?: Record<string, any[]>) {
  const database = new MockDatabase(initialData)

  return {
    from: (table: string) => ({
      select: (columns: string = '*') => database.select(table, columns),
      insert: (data: any) => database.insert(table, data),
      update: (data: any) => ({
        eq: (column: string, value: any) => {
          // Find matching records and update
          const results = database.select(table).eq(column, value).execute()
          return results.then(({ data }) => {
            if (data.length === 0) return { data: null, error: null }
            const updated = data.map(row => database.update(table, row.id, data))
            return { data: updated, error: null }
          })
        }
      }),
      delete: () => ({
        eq: (column: string, value: any) => {
          const results = database.select(table).eq(column, value).execute()
          return results.then(({ data }) => {
            data.forEach(row => database.delete(table, row.id))
            return { data, error: null }
          })
        }
      })
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ 
        data: { user: mockUser }, 
        error: null 
      })
    },
    // Add database reset helper for tests
    __reset: () => database.reset(),
    __seed: (data: Record<string, any[]>) => database.seed(data)
  }
}
```

### 4. Updated vitest.setup.ts

```typescript
// vitest.setup.ts
import { createMockSupabase } from './tests/__mocks__/supabase'
import { DEFAULT_TEST_DATA } from './tests/__fixtures__/seed-data'

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => createMockSupabase(DEFAULT_TEST_DATA)
}))
```

### 5. Test Usage Examples

```typescript
// tests/integration/pets.test.ts
import { createMockSupabase } from '../__mocks__/supabase'
import { buildPet, buildProfile } from '../__fixtures__'

describe('GET /api/pets', () => {
  let supabase: ReturnType<typeof createMockSupabase>

  beforeEach(() => {
    supabase = createMockSupabase({
      pets: [
        buildPet({ id: 'pet-1', name: 'Fido', tenant_id: 'adris' }),
        buildPet({ id: 'pet-2', name: 'Whiskers', tenant_id: 'adris' }),
        buildPet({ id: 'pet-3', name: 'Rover', tenant_id: 'petlife' }) // Different tenant
      ],
      profiles: [
        buildProfile({ id: 'owner-1', tenant_id: 'adris' })
      ]
    })
  })

  it('should return only pets for current tenant', async () => {
    const { data } = await supabase
      .from('pets')
      .select('*')
      .eq('tenant_id', 'adris')
      .execute()

    expect(data).toHaveLength(2)
    expect(data.map(p => p.name)).toEqual(['Fido', 'Whiskers'])
  })

  it('should return single pet by ID', async () => {
    const { data } = await supabase
      .from('pets')
      .select('*')
      .eq('id', 'pet-1')
      .single()

    expect(data).toEqual(expect.objectContaining({ name: 'Fido' }))
  })

  it('should return null when pet not found', async () => {
    const { data } = await supabase
      .from('pets')
      .select('*')
      .eq('id', 'nonexistent')
      .single()

    expect(data).toBeNull()
  })

  it('should enforce FK constraints', () => {
    expect(() => {
      supabase.from('pets').insert({
        name: 'Invalid',
        owner_id: 'nonexistent-owner'  // FK violation
      })
    }).toThrow(/FK violation/)
  })
})
```

## Acceptance Criteria

- [ ] `MockDatabase` class created with insert/select/update/delete
- [ ] `QueryBuilder` supports: eq, neq, in, limit, order, single
- [ ] Mock enforces foreign key constraints
- [ ] Mock supports tenant isolation filtering
- [ ] Factory function `createMockSupabase` returns realistic client
- [ ] Updated `vitest.setup.ts` uses new mock
- [ ] All existing tests still pass
- [ ] New tests demonstrate realistic behavior:
  - [ ] Empty result returns `[]`, not error
  - [ ] Single query with no match returns `null`
  - [ ] Single query with multiple matches returns error
  - [ ] FK violations throw errors
  - [ ] Tenant filtering works correctly
- [ ] Documentation added for test writers

## Files to Create

- `tests/__mocks__/supabase/mock-database.ts` (~200 lines)
- `tests/__mocks__/supabase/query-builder.ts` (~150 lines)
- `tests/__mocks__/supabase/mock-client.ts` (~100 lines)
- `tests/__mocks__/supabase/index.ts` (~20 lines)
- `tests/__fixtures__/seed-data.ts` (~50 lines - default test data)

## Files to Modify

- `vitest.setup.ts` - replace generic mock with factory
- `tests/integration/**/*.test.ts` - update to use realistic mock patterns

## Verification

```bash
# Run tests with new mock
npm run test:unit

# Verify tests now catch real issues
# Example: Remove tenant_id filter from query - test should FAIL
# With old mock: test passes (returns [])
# With new mock: test fails (returns wrong tenant's data)

# Performance check
npm run test:unit -- --reporter=verbose
# Mock should add < 50ms per test
```

## Migration Path

1. **Phase 1**: Create new mock infrastructure (no breaking changes)
2. **Phase 2**: Update one test file to use new patterns
3. **Phase 3**: Verify improvements (test catches real bug)
4. **Phase 4**: Gradually update remaining tests
5. **Phase 5**: Remove old generic mock

## Expected Improvements

| Metric | Before | After |
|--------|--------|-------|
| **False Positives** | High (tests pass when broken) | Low (realistic behavior) |
| **Edge Case Coverage** | None | Good (null, empty, errors) |
| **FK Violation Detection** | Never | Always |
| **Tenant Isolation Testing** | Manual | Automatic |
| **Test Reliability** | 60% | 95% |

---

**Created**: 2026-01-19  
**Status**: Not Started  
**Priority**: P0 - Critical (Tests currently lie about code health)
