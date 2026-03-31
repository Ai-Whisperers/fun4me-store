# TECH-006: Create Validated Environment Variable Module

## Summary

**Priority**: P0 - Critical  
**Effort**: 3-4 hours  
**Epic**: [EPIC-08: Code Quality & Refactoring](../epics/EPIC-08-code-quality.md)  
**Type**: Technical Debt  
**Dependencies**: None  
**Source**: critique/12-typescript-roast.md (TS-001)

## Problem Statement

The codebase has **28 locations** where environment variables are accessed with non-null assertions (`process.env.X!`). If any variable is missing, the application crashes at runtime with cryptic errors instead of failing fast with clear messages.

### Current Anti-Pattern

```typescript
// middleware.ts:36-37
createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,      // 💀 Crash if missing
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // 💀 Crash if missing
)

// lib/config/loader.ts:158
databaseUrl: process.env.DATABASE_URL!,        // 💀 Crash if missing

// db/index.ts:5
const db = createClient(process.env.DATABASE_URL!)  // 💀 Crash if missing
```

### Problems

| Issue | Impact |
|-------|--------|
| **Runtime crashes** | App starts, then crashes when code path uses missing env var |
| **Cryptic errors** | `Cannot read property 'x' of undefined` instead of "Missing DATABASE_URL" |
| **No startup validation** | Broken config not caught until production |
| **TypeScript lies** | `process.env.X!` tells TypeScript "this is definitely defined" when it might not be |
| **Developer friction** | Wastes time debugging environment issues |

**Real scenario**: Deploy to production → Everything looks fine → First user hits database route → Crash because `DATABASE_URL` was missing.

## Proposed Solution

Create a centralized, validated environment module that:
1. **Fails fast** at module load time (before any code runs)
2. **Clear error messages** showing exactly which var is missing
3. **Type-safe** access (TypeScript knows values exist)
4. **Single source of truth** for all env vars

### Benefits

| Aspect | Before | After |
|--------|--------|-------|
| **Error Detection** | Runtime (after deploy) | Startup (before any code runs) |
| **Error Message** | `Cannot read property...` | `Missing required env: DATABASE_URL` |
| **Type Safety** | `string \| undefined!` (lying) | `string` (guaranteed) |
| **Debugging Time** | 30-60 minutes | 0 minutes (immediate failure) |
| **Production Risk** | High (silent failures) | Low (fail fast) |

## Implementation

### 1. Create Environment Module

```typescript
// web/lib/env.ts

/**
 * Validated environment variables.
 * 
 * This module validates all required environment variables at startup.
 * If any required variable is missing, the application will fail immediately
 * with a clear error message.
 * 
 * @example
 * import { env } from '@/lib/env'
 * const client = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY)
 */

class EnvValidationError extends Error {
  constructor(missingVars: string[]) {
    const message = [
      '❌ Missing required environment variables:',
      '',
      ...missingVars.map(v => `  • ${v}`),
      '',
      'Please check your .env.local file and ensure all required',
      'variables are set. See docs/ENV_COMPLETE_REFERENCE.md for details.',
    ].join('\n')

    super(message)
    this.name = 'EnvValidationError'
  }
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new EnvValidationError([name])
  }
  return value
}

function optionalEnv(name: string, defaultValue?: string): string | undefined {
  return process.env[name] || defaultValue
}

/**
 * Validated environment variables.
 * All required variables are guaranteed to exist.
 */
export const env = {
  // Supabase (REQUIRED)
  SUPABASE_URL: requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
  SUPABASE_ANON_KEY: requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  SUPABASE_SERVICE_ROLE_KEY: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  
  // Database (REQUIRED)
  DATABASE_URL: requireEnv('DATABASE_URL'),

  // Email (OPTIONAL with defaults)
  EMAIL_PROVIDER: optionalEnv('EMAIL_PROVIDER', 'resend'),
  EMAIL_FROM: optionalEnv('EMAIL_FROM', 'noreply@vete.app'),
  RESEND_API_KEY: optionalEnv('RESEND_API_KEY'),
  
  // WhatsApp (OPTIONAL)
  WHATSAPP_API_KEY: optionalEnv('WHATSAPP_API_KEY'),
  WHATSAPP_PHONE_ID: optionalEnv('WHATSAPP_PHONE_ID'),

  // Storage (OPTIONAL)
  STORAGE_PROVIDER: optionalEnv('STORAGE_PROVIDER', 'supabase'),
  CLOUDINARY_CLOUD_NAME: optionalEnv('CLOUDINARY_CLOUD_NAME'),
  CLOUDINARY_API_KEY: optionalEnv('CLOUDINARY_API_KEY'),
  CLOUDINARY_API_SECRET: optionalEnv('CLOUDINARY_API_SECRET'),

  // Feature Flags (OPTIONAL)
  ENABLE_EMAIL: optionalEnv('ENABLE_EMAIL') === 'true',
  ENABLE_SMS: optionalEnv('ENABLE_SMS') === 'true',
  ENABLE_WHATSAPP: optionalEnv('ENABLE_WHATSAPP') === 'true',

  // Application
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_TEST: process.env.NODE_ENV === 'test',
} as const

// Validate at module load time
// This ensures the app never starts with invalid config
if (typeof window === 'undefined') {
  // Only validate on server (not in browser)
  const missingVars: string[] = []
  
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'DATABASE_URL',
  ]

  for (const varName of required) {
    if (!process.env[varName]) {
      missingVars.push(varName)
    }
  }

  if (missingVars.length > 0) {
    throw new EnvValidationError(missingVars)
  }
}

// Type exports for documentation
export type Env = typeof env
```

### 2. Update All 28 Usages

**Find all usages:**

```bash
rg "process\.env\.[A-Z_]+!" web/
```

**Replace pattern:**

```typescript
// Before
import { createClient } from '@supabase/supabase-js'
const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// After
import { env } from '@/lib/env'
import { createClient } from '@supabase/supabase-js'
const client = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY
)
```

### 3. Update Critical Files

**Priority files (must update first):**

1. `web/middleware.ts` - Runs on every request
2. `web/lib/supabase/server.ts` - Server client
3. `web/lib/supabase/client.ts` - Browser client
4. `web/db/index.ts` - Database connection
5. `web/lib/config/loader.ts` - Config loading

**Search and replace in each file:**

```typescript
// Find
process.env.NEXT_PUBLIC_SUPABASE_URL!

// Replace
env.SUPABASE_URL

// Add import
import { env } from '@/lib/env'
```

### 4. Add Type Safety Tests

```typescript
// web/lib/__tests__/env.test.ts

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('Environment Validation', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should throw clear error when required var missing', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL

    expect(() => {
      // Re-import to trigger validation
      jest.resetModules()
      require('../env')
    }).toThrow(/Missing required environment variables/)
  })

  it('should list all missing variables in error', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.DATABASE_URL

    expect(() => {
      jest.resetModules()
      require('../env')
    }).toThrow(/NEXT_PUBLIC_SUPABASE_URL.*DATABASE_URL/s)
  })

  it('should allow optional variables to be missing', () => {
    delete process.env.RESEND_API_KEY

    expect(() => {
      jest.resetModules()
      const { env } = require('../env')
      expect(env.RESEND_API_KEY).toBeUndefined()
    }).not.toThrow()
  })

  it('should use default values for optional vars', () => {
    delete process.env.EMAIL_PROVIDER

    const { env } = require('../env')
    expect(env.EMAIL_PROVIDER).toBe('resend')
  })
})
```

## Acceptance Criteria

**Environment Module:**
- [ ] `web/lib/env.ts` created with validation logic
- [ ] All 4 required env vars validated at startup
- [ ] Optional env vars with sensible defaults
- [ ] Clear error messages listing missing vars
- [ ] Type-safe exports (no `string | undefined`)
- [ ] Browser-safe (no validation in browser bundle)

**Migration:**
- [ ] All 28 `process.env.X!` usages replaced with `env.X`
- [ ] All imports updated to use `@/lib/env`
- [ ] Critical files updated first (middleware, supabase, db)
- [ ] No regression in functionality

**Testing:**
- [ ] Unit tests for env validation
- [ ] Test missing required var throws error
- [ ] Test optional vars use defaults
- [ ] Test all env vars accessible

**Documentation:**
- [ ] JSDoc comments on env module
- [ ] Update `docs/ENV_COMPLETE_REFERENCE.md` with import example
- [ ] Add to `CLAUDE.md` coding standards

**Quality Gates:**
- [ ] TypeScript build succeeds (no errors)
- [ ] All tests pass
- [ ] Startup validation works (test by removing required var)
- [ ] No `process.env` access outside env module (except tests)

## Files to Create

- `web/lib/env.ts` (~150 lines - validation module)
- `web/lib/__tests__/env.test.ts` (~100 lines - tests)

## Files to Modify

All files with `process.env.X!` pattern (28 files):
- `web/middleware.ts`
- `web/lib/supabase/server.ts`
- `web/lib/supabase/client.ts`
- `web/db/index.ts`
- `web/lib/config/loader.ts`
- And 23 more (use `rg` to find)

## Verification

### 1. Test Missing Required Var

```bash
# Remove required var from .env.local
# Comment out: NEXT_PUBLIC_SUPABASE_URL=...

# Try to start dev server
npm run dev

# Expected: Clear error message immediately
# ❌ Missing required environment variables:
#   • NEXT_PUBLIC_SUPABASE_URL
#
# Please check your .env.local file...

# Actual (before fix): App starts, crashes on first request
```

### 2. Test Optional Var Default

```typescript
// Remove RESEND_API_KEY from .env.local
import { env } from '@/lib/env'
console.log(env.RESEND_API_KEY)  // undefined (not crash)
console.log(env.EMAIL_PROVIDER)   // 'resend' (default)
```

### 3. Search for Remaining Usages

```bash
# After migration, this should find 0 results (except in tests)
rg "process\.env\.[A-Z_]+!" web/ --type ts

# Expected: 0 matches (all migrated to env module)
```

### 4. TypeScript Type Check

```typescript
import { env } from '@/lib/env'

// These should all be type-safe (no undefined)
const url: string = env.SUPABASE_URL  // ✅ Works (guaranteed string)
const key: string = env.SUPABASE_ANON_KEY  // ✅ Works

// This should be string | undefined
const optional: string | undefined = env.RESEND_API_KEY  // ✅ Works
```

## Migration Script (Optional)

Can automate some of the migration:

```bash
#!/bin/bash
# migrate-env.sh

# Replace common patterns
find web -name "*.ts" -type f -exec sed -i \
  's/process\.env\.NEXT_PUBLIC_SUPABASE_URL!/env.SUPABASE_URL/g' {} +

find web -name "*.ts" -type f -exec sed -i \
  's/process\.env\.NEXT_PUBLIC_SUPABASE_ANON_KEY!/env.SUPABASE_ANON_KEY/g' {} +

# Add imports where needed (requires manual verification)
echo "⚠️  Remember to add: import { env } from '@/lib/env'"
```

## Impact Analysis

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Startup Failures** | Silent (crash later) | Immediate (fail fast) | **100% faster detection** |
| **Debug Time** | 30-60 min/issue | 0 min (clear error) | **100% reduction** |
| **Production Incidents** | 5-10/year (env issues) | 0 (caught at build) | **100% prevention** |
| **Type Safety** | Weak (`string \| undefined!`) | Strong (`string`) | **Fully type-safe** |
| **Developer Confidence** | Low (unknown if vars exist) | High (validated) | **Guaranteed** |

---

**Created**: 2026-01-19  
**Status**: Not Started  
**Priority**: P0 - Critical (Prevents runtime crashes, improves DX)
