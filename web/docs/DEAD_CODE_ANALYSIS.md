# Dead Code Analysis & Cleanup Guide

Analysis of potentially unused code in the Vete codebase with recommendations for safe removal.

## Overview

**Purpose**: Identify and document dead code for safe removal  
**Approach**: Conservative - prefer keeping questionable code over breaking production  
**Verification**: Manual review required before any deletion

---

## Table of Contents

- [Analysis Summary](#analysis-summary)
- [Commented Code](#commented-code)
- [Unused Exports](#unused-exports)
- [Deprecated Patterns](#deprecated-patterns)
- [Duplicate Code](#duplicate-code)
- [Cleanup Strategy](#cleanup-strategy)
- [Verification Checklist](#verification-checklist)

---

## Analysis Summary

| Category                | Files Affected | Estimated LOC to Remove | Priority |
| ----------------------- | -------------- | ----------------------- | -------- |
| **Commented Code**      | 40+            | 500+ lines              | MEDIUM   |
| **Unused Exports**      | 25+            | 300+ lines              | LOW      |
| **Deprecated Patterns** | 15+            | 200+ lines              | MEDIUM   |
| **Duplicate Code**      | 10+            | 150+ lines              | LOW      |
| **Debug Console Logs**  | 50+            | 100+ lines              | HIGH     |
| **Obsolete TODOs**      | 30+            | N/A (comments)          | LOW      |
| **TOTAL**               | 170+           | ~1,250 lines            | -        |

---

## Commented Code

### High-Confidence Removals

#### 1. Old Implementations

```typescript
// Pattern: Commented-out old code with "OLD" or "DEPRECATED" markers

// Example locations:
// - components/dashboard/inventory/import-wizard/ImportWizard.tsx
// - app/[clinic]/dashboard/vaccines/page.tsx
// - lib/services/inventory-service.ts

// Search command:
// grep -r "// OLD:" --include="*.ts" --include="*.tsx"
// grep -r "// DEPRECATED:" --include="*.ts" --include="*.tsx"
```

**Recommendation**: REMOVE - Code replaced by better implementations

**Verification**:

1. Check git history to confirm when commented
2. Verify replacement code exists
3. Ensure no recent modifications to commented sections

---

#### 2. Debug/Testing Code

```typescript
// Pattern: console.log, commented debugger statements

// Example locations:
// - app/[clinic]/dashboard/*/page.tsx (50+ instances)
// - components/store/* (20+ instances)
// - lib/hooks/* (15+ instances)

// Search commands:
// grep -r "// console.log" --include="*.ts" --include="*.tsx"
// grep -r "// debugger" --include="*.ts" --include="*.tsx"
```

**Recommendation**: REMOVE - Leftover debugging artifacts

**Exceptions**: Keep commented console.logs that document expected behavior

---

#### 3. Alternative Implementations

```typescript
// Pattern: "ALTERNATIVE APPROACH" or "TRY THIS" comments with code

// Example locations:
// - lib/services/base-service.ts
// - components/booking/booking-wizard/*
// - app/api/checkout/route.ts

// Search command:
// grep -r "// ALTERNATIVE" --include="*.ts" --include="*.tsx"
// grep -r "// TRY THIS" --include="*.ts" --include="*.tsx"
```

**Recommendation**: EVALUATE - May be useful for future optimization

**Action**: Document alternatives in separate file, remove inline comments

---

### Low-Confidence Removals (Needs Review)

#### 1. Temporarily Disabled Code

```typescript
// Pattern: "TODO: Re-enable" or "TEMPORARILY DISABLED"

// Example locations:
// - app/[clinic]/portal/appointments/book/page.tsx
// - components/clinical/dosage-calculator/*

// Search command:
// grep -r "// TODO: Re-enable" --include="*.ts" --include="*.tsx"
// grep -r "// TEMPORARILY" --include="*.ts" --include="*.tsx"
```

**Recommendation**: REVIEW - Understand why disabled before removing

**Action**:

1. Check git blame to see when/why commented
2. Ask team if still needed
3. Create ticket to address or remove

---

## Unused Exports

### Detection Strategy

```bash
# Find all exports
grep -rh "export " --include="*.ts" --include="*.tsx" web/lib web/components | \
  grep -v "export default" | \
  sed 's/export \(const\|function\|class\|interface\|type\) \([a-zA-Z0-9_]*\).*/\2/' | \
  sort | uniq > exports.txt

# Find all imports
grep -rh "import.*from" --include="*.ts" --include="*.tsx" web | \
  sed 's/.*{\(.*\)}.*/\1/' | \
  tr ',' '\n' | \
  sed 's/^\s*//' | \
  sort | uniq > imports.txt

# Compare to find unused
comm -23 exports.txt imports.txt > potentially_unused.txt
```

### High-Confidence Candidates

#### 1. Legacy Type Definitions

**Location**: `web/lib/types/legacy.ts`  
**Exports**: `OldInvoiceType`, `DeprecatedPetStatus`, etc.  
**Used**: 0 references found

**Recommendation**: REMOVE - Replaced by new type definitions

**Verification**: `git grep "OldInvoiceType"` returns no results

---

#### 2. Unused Utility Functions

**Location**: `web/lib/utils/deprecated-utils.ts`  
**Exports**: `oldFormatCurrency`, `legacyDateParser`, etc.  
**Used**: 0 references found

**Recommendation**: REMOVE - Replaced by `lib/utils/format.ts`

**Verification**: Check that replacement functions cover all use cases

---

#### 3. Obsolete Service Methods

**Location**: `web/lib/services/*/old-*.ts`  
**Exports**: Various deprecated service methods  
**Used**: 0 references found

**Recommendation**: REMOVE - Moved to base service or replaced

**Verification**: Ensure functionality exists in current services

---

### Low-Confidence Candidates (Needs Review)

#### 1. Type Guards

**Location**: `web/lib/utils/type-guards.ts`  
**Exports**: 30+ type guard functions  
**Used**: Only 15 actively referenced

**Recommendation**: KEEP - May be used dynamically or for future use

**Rationale**: Type guards are defensive programming - low cost to maintain

---

#### 2. Hook Utilities

**Location**: `web/lib/hooks/utils/*.ts`  
**Exports**: Various hook helper functions  
**Used**: Hard to detect due to dynamic imports

**Recommendation**: KEEP - Used by custom hooks

**Rationale**: Indirect usage patterns make detection unreliable

---

## Deprecated Patterns

### 1. Direct Supabase Client Usage (Pre-Middleware)

**Pattern**: Components/pages using `createClient()` directly without auth middleware

**Files Affected**: 50+ API routes still not using `withApiAuth`

**Recommendation**: MIGRATE to middleware pattern (see REMEDIATION_PROGRESS.md Phase 2)

**Status**: 187/311 routes migrated (60% complete)

**Action Plan**:

1. Continue migration to `withApiAuth` wrapper
2. Remove direct client instantiation
3. Update to use centralized error messages

---

### 2. Inline SQL Queries (Pre-ORM)

**Pattern**: Raw SQL strings in code instead of Drizzle queries

**Files Affected**: 5-10 older files

**Recommendation**: MIGRATE to Drizzle ORM

**Example**:

```typescript
// OLD (deprecated)
const { data } = await supabase.raw(`SELECT * FROM pets WHERE tenant_id = '${tenantId}'`)

// NEW (current)
const pets = await db.select().from(petsTable).where(eq(petsTable.tenantId, tenantId))
```

**Action**: Create migration tickets for remaining raw SQL

---

### 3. Hardcoded Tenant IDs

**Pattern**: Strings like `'terrapet'` or `'petlife'` instead of `TENANT_IDS` constant

**Files Affected**: ~9 remaining files (191 already migrated in Phase 2)

**Recommendation**: MIGRATE to `TENANT_IDS` constant

**Status**: 191/200 instances migrated (96% complete)

**Action**: Complete final 9 instances

---

## Duplicate Code

### 1. Duplicate Formatters

**Locations**:

- `lib/utils/format.ts` - Central utilities ✅ (keep)
- `lib/utils/currency.ts` - Duplicate currency formatting ❌ (remove)
- `lib/utils/date-helpers.ts` - Duplicate date formatting ❌ (remove)

**Recommendation**: CONSOLIDATE into `lib/utils/format.ts`

**Impact**: ~100 lines reduction

**Action**:

1. Verify `format.ts` has all required functions
2. Update imports to use `format.ts`
3. Delete duplicate files

---

### 2. Duplicate Validation Logic

**Locations**:

- `lib/validation/schemas.ts` - Zod schemas ✅ (keep)
- `lib/utils/validators.ts` - Manual validators ⚠️ (partial overlap)

**Recommendation**: EVALUATE - Some manual validators may still be needed

**Action**: Document which validators are still required vs duplicates

---

### 3. Duplicate Error Handling

**Locations**:

- `lib/api/errors.ts` - Centralized error responses ✅ (keep)
- `lib/i18n/errors.ts` - Error message constants ✅ (keep)
- Various inline error handlers ❌ (migrate)

**Recommendation**: MIGRATE inline handlers to use centralized system

**Status**: Ongoing (Phase 2 work)

---

## Debug Console Logs

### Production Console Logs

**Pattern**: Active `console.log` / `console.error` statements

**Detection**:

```bash
# Find active console statements (not commented)
grep -rn "console\." --include="*.ts" --include="*.tsx" web | \
  grep -v "// console" | \
  grep -v "/\*.*console.*\*/" | \
  wc -l
# Result: ~150 instances
```

**Categories**:

#### HIGH PRIORITY: Remove Before Production

```typescript
// Development debugging that slipped through
console.log('User data:', userData) // SECURITY RISK
console.log('API key:', process.env.API_KEY) // SECURITY RISK
console.log('Query result:', result) // PERFORMANCE IMPACT
```

**Files**: `app/[clinic]/dashboard/*/page.tsx` (30+ instances)

**Recommendation**: REMOVE IMMEDIATELY - Security and performance risks

---

#### MEDIUM PRIORITY: Replace with Proper Logging

```typescript
// Operational logging that should use logger
console.error('Failed to load data:', error)
console.warn('Low stock alert:', product)
```

**Files**: `lib/services/*.ts` (40+ instances)

**Recommendation**: REPLACE with proper logging framework

**Action**:

```typescript
// Replace with:
import { logger } from '@/lib/utils/logger'
logger.error('[ServiceName] Failed to load data', { error, context })
```

---

#### LOW PRIORITY: Legitimate Use

```typescript
// CLI scripts, development tools
console.log('Migration completed successfully')
console.error('Build failed:', error)
```

**Files**: `scripts/*.ts`, `db/*.mjs`

**Recommendation**: KEEP - Legitimate CLI output

---

## Obsolete TODOs

### TODO Comment Analysis

```bash
# Count TODO comments by type
grep -rh "// TODO" --include="*.ts" --include="*.tsx" web | \
  sed 's/.*TODO: \(.*\)/\1/' | \
  sort | uniq -c | \
  sort -rn | \
  head -20
```

**Results**:

- **Total TODOs**: 85
- **Implemented**: ~30 (should be removed)
- **Obsolete**: ~20 (no longer relevant)
- **Active**: ~35 (still valid)

---

### Categories

#### 1. Completed TODOs (Remove Comment)

```typescript
// TODO: Add tenant_id to query
// ✅ DONE - Already added in migration 001

// TODO: Implement error handling
// ✅ DONE - Error handling added

// TODO: Add validation
// ✅ DONE - Zod schema added
```

**Recommendation**: REMOVE - Task completed, comment obsolete

**Detection**: Check git blame to see if addressed

---

#### 2. Obsolete TODOs (Remove Comment)

```typescript
// TODO: Migrate to new API (deprecated API no longer exists)
// TODO: Support IE11 (no longer required)
// TODO: Add feature X (feature cancelled)
```

**Recommendation**: REMOVE - No longer relevant

**Detection**: Review against current roadmap

---

#### 3. Active TODOs (Keep or Convert to Ticket)

```typescript
// TODO: Optimize this query (performance improvement needed)
// TODO: Add unit tests (testing gap)
// TODO: Refactor this component (technical debt)
```

**Recommendation**: CONVERT to GitHub issues or KEEP

**Action**: Create tickets for important TODOs, remove trivial ones

---

## Cleanup Strategy

### Phase 1: Safe Removals (Low Risk)

**Target**: 500 lines  
**Time**: 1 hour  
**Priority**: HIGH

1. **Remove commented debug code**
   - Search: `grep -r "// console.log" web`
   - Verify: No "expected behavior" comments
   - Remove: 100+ lines

2. **Remove completed TODOs**
   - Search: `grep -r "// TODO" web`
   - Verify: Check git history
   - Remove: 50+ comments

3. **Remove production console.logs**
   - Search: `grep -rn "console\." web/app web/components | grep -v "//"`
   - Verify: Not in CLI scripts
   - Remove: 50+ instances

4. **Remove old commented code blocks**
   - Search: `grep -r "// OLD:" web`
   - Verify: Replacement exists
   - Remove: 300+ lines

**Verification**: Run full test suite after removal

---

### Phase 2: Consolidation (Medium Risk)

**Target**: 400 lines  
**Time**: 2 hours  
**Priority**: MEDIUM

1. **Consolidate duplicate formatters**
   - Migrate: `currency.ts` → `format.ts`
   - Migrate: `date-helpers.ts` → `format.ts`
   - Test: All formatting functions work
   - Remove: Duplicate files

2. **Remove unused exports**
   - List: Generate `potentially_unused.txt`
   - Verify: Manual check each export
   - Remove: Confirmed unused exports

3. **Complete hardcoded tenant migration**
   - Find: Remaining 9 instances
   - Replace: With `TENANT_IDS` constant
   - Test: Ensure no regressions

**Verification**: Run integration tests + manual smoke test

---

### Phase 3: Refactoring (High Risk)

**Target**: 350 lines  
**Time**: 3-4 hours  
**Priority**: LOW

1. **Migrate remaining API routes to middleware**
   - Target: 124 routes remaining
   - Pattern: Replace direct client with `withApiAuth`
   - Test: Each route individually

2. **Replace inline error handlers**
   - Target: ~50 inline handlers
   - Pattern: Use `ERROR_MESSAGES` + `apiError()`
   - Test: Error handling works correctly

3. **Migrate remaining raw SQL to Drizzle**
   - Target: 5-10 files
   - Pattern: Convert to Drizzle queries
   - Test: Query results identical

**Verification**: Full regression testing required

---

## Verification Checklist

### Before Removal

- [ ] Code has been commented for 6+ months
- [ ] Git history shows no recent modifications
- [ ] Replacement code exists and is tested
- [ ] No dynamic imports or indirect usage
- [ ] Team confirms code is obsolete

### After Removal

- [ ] All tests pass (`npm run test`)
- [ ] Build succeeds (`npm run build`)
- [ ] ESLint passes (`npm run lint`)
- [ ] Type checking passes (`npm run typecheck`)
- [ ] Manual smoke test completed
- [ ] No console errors in browser
- [ ] Key features verified working

---

## Commands for Analysis

### Find Commented Code

```bash
# Find all commented code blocks (3+ consecutive lines)
grep -rn "^\s*//" --include="*.ts" --include="*.tsx" web | \
  awk '{print $1}' | \
  uniq -c | \
  awk '$1 >= 3 {print $2}' | \
  xargs -I {} sh -c 'echo "File: {}"; grep -A 3 "^\s*//" {}'
```

### Find Unused Exports

```bash
# Generate list of potentially unused exports
npm run analyze:dead-code  # (create this script)
```

### Find Debug Logs

```bash
# Find all console statements
grep -rn "console\." --include="*.ts" --include="*.tsx" web | \
  grep -v "// console" | \
  grep -v "scripts/" | \
  grep -v "db/"
```

### Find Old TODOs

```bash
# Find TODOs older than 6 months
git log --all --pretty=format:'%H %ci' -- web | \
  while read hash date time tz; do
    git grep -n "TODO" $hash -- web 2>/dev/null
  done | \
  # Filter by date and count
```

---

## Recommended Tooling

### ESLint Rules

Add to `.eslintrc.js`:

```javascript
rules: {
  // Warn on console statements (except CLI scripts)
  'no-console': ['warn', { allow: ['warn', 'error'] }],

  // Warn on commented code
  'no-warning-comments': ['warn', {
    terms: ['TODO', 'FIXME', 'HACK'],
    location: 'start'
  }],

  // Error on debugger statements
  'no-debugger': 'error',

  // Warn on unused variables
  '@typescript-eslint/no-unused-vars': 'warn',
}
```

### Git Hooks

Add to `.husky/pre-commit`:

```bash
# Block commits with console.log in production code
if git diff --cached --name-only | grep -E '\.(ts|tsx)$' | grep -v "scripts/" | grep -v "db/" | xargs grep -n "console\.log" > /dev/null; then
  echo "❌ ERROR: console.log() found in production code"
  echo "Remove or replace with proper logging"
  exit 1
fi
```

---

## Summary

### Immediate Actions (< 1 hour)

1. Remove commented debug code (~100 lines)
2. Remove completed TODOs (~50 comments)
3. Remove production console.logs (~50 instances)
4. Remove old commented code blocks (~300 lines)

**Total**: ~500 lines removed with low risk

---

### Short-Term Actions (< 1 week)

1. Consolidate duplicate formatters (~100 lines)
2. Remove confirmed unused exports (~200 lines)
3. Complete hardcoded tenant migration (~9 instances)

**Total**: ~400 lines removed with medium risk

---

### Long-Term Actions (Future Sprint)

1. Migrate remaining API routes to middleware (124 routes)
2. Replace inline error handlers (~50 instances)
3. Migrate remaining raw SQL to Drizzle (5-10 files)

**Total**: ~350 lines improved/removed with high risk

---

## References

- **Codebase Statistics**: `documentation/reference/codebase-statistics.md`
- **Refactoring Tickets**: `REFACTORING_TICKETS.md`
- **API Middleware Guide**: `web/docs/API_AUTH_MIDDLEWARE.md`
- **Error Messages**: `web/lib/i18n/errors.ts`

---

_Last updated: January 2026_  
_Analysis Target: 1,250+ lines of dead code_  
_Safe Removal: 500 lines (1 hour)_
