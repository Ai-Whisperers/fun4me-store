# Type Safety Cleanup Guide

Systematic guide for fixing the 149 type safety violations identified when upgrading ESLint rules to errors.

## Overview

**Total Violations**: 149  
**Breakdown**:

- `@typescript-eslint/no-explicit-any`: 34 violations
- `@typescript-eslint/no-non-null-assertion`: 115 violations

**Strategy**: Progressive cleanup over multiple sprints (10-15 hours estimated)

---

## Table of Contents

- [Violation Categories](#violation-categories)
- [Fix Patterns](#fix-patterns)
- [Progressive Cleanup Plan](#progressive-cleanup-plan)
- [Testing Requirements](#testing-requirements)
- [Common Pitfalls](#common-pitfalls)

---

## Violation Categories

### Category 1: `any` Type (34 violations)

#### Subcategories

1. **Function Parameters** (~15 violations)
   - Event handlers: `(e: any) => void`
   - Callback functions: `callback: any`
   - Generic handlers: `data: any`

2. **API Response Types** (~10 violations)
   - Untyped fetch responses
   - Supabase query results
   - External API data

3. **Third-Party Library Types** (~5 violations)
   - PDF generation libraries
   - Chart libraries
   - Form libraries with incomplete types

4. **Utility Functions** (~4 violations)
   - Generic transformers
   - Dynamic property access
   - Type guards

---

### Category 2: Non-Null Assertions (115 violations)

#### Subcategories

1. **DOM References** (~30 violations)
   - `element.querySelector()!`
   - `ref.current!`
   - `document.getElementById()!`

2. **Array Access** (~25 violations)
   - `array[0]!`
   - `array.find()!`
   - `array.at(-1)!`

3. **Object Property Access** (~20 violations)
   - `params.id!`
   - `searchParams.get()!`
   - `process.env.VAR!`

4. **Supabase Results** (~15 violations)
   - `data.data!`
   - `result.user!`
   - `profile.tenant_id!`

5. **Await Params** (~15 violations)
   - `(await params).id!`
   - Next.js 15 dynamic params

6. **Type Narrowing** (~10 violations)
   - After null checks but still asserted
   - Optional chaining followed by assertion

---

## Fix Patterns

### Pattern 1: Replace `any` with Proper Types

#### Event Handlers

```typescript
// ❌ BAD: Using any
const handleClick = (e: any) => {
  console.log(e.target.value)
}

// ✅ GOOD: Use proper event type
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
  console.log(e.currentTarget.value)
}

// ✅ BETTER: Extract event type if reused
type ButtonClickEvent = React.MouseEvent<HTMLButtonElement>
const handleClick = (e: ButtonClickEvent) => {
  console.log(e.currentTarget.value)
}
```

#### API Responses

```typescript
// ❌ BAD: Untyped response
const fetchUser = async (id: string): Promise<any> => {
  const response = await fetch(`/api/users/${id}`)
  return response.json()
}

// ✅ GOOD: Define response type
interface User {
  id: string
  name: string
  email: string
}

const fetchUser = async (id: string): Promise<User> => {
  const response = await fetch(`/api/users/${id}`)
  return response.json()
}

// ✅ BETTER: Use Zod for runtime validation
import { z } from 'zod'

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
})

type User = z.infer<typeof UserSchema>

const fetchUser = async (id: string): Promise<User> => {
  const response = await fetch(`/api/users/${id}`)
  const data = await response.json()
  return UserSchema.parse(data) // Runtime validation
}
```

#### Generic Utility Functions

```typescript
// ❌ BAD: Generic any
function deepClone(obj: any): any {
  return JSON.parse(JSON.stringify(obj))
}

// ✅ GOOD: Use generic type parameter
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

// ✅ BETTER: Add constraints
function deepClone<T extends Record<string, unknown>>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}
```

---

### Pattern 2: Replace Non-Null Assertions

#### DOM References

```typescript
// ❌ BAD: Non-null assertion
const element = document.getElementById('my-id')!
element.style.color = 'red'

// ✅ GOOD: Null check
const element = document.getElementById('my-id')
if (element) {
  element.style.color = 'red'
}

// ✅ BETTER: Optional chaining
const element = document.getElementById('my-id')
if (element) {
  element.style.color = 'red'
} else {
  console.warn('Element not found: my-id')
}

// ✅ BEST: Early return pattern
const element = document.getElementById('my-id')
if (!element) {
  console.error('Element not found: my-id')
  return
}
element.style.color = 'red'
```

#### Array Access

```typescript
// ❌ BAD: Non-null assertion
const firstItem = items[0]!
const lastName = items.at(-1)!
const foundItem = items.find((x) => x.id === id)!

// ✅ GOOD: Optional chaining with fallback
const firstItem = items[0] ?? DEFAULT_ITEM
const lastName = items.at(-1) ?? ''
const foundItem = items.find((x) => x.id === id) ?? null

// ✅ BETTER: Explicit null check
const firstItem = items[0]
if (!firstItem) {
  throw new Error('Items array is empty')
}
processItem(firstItem)

// ✅ BEST: Type guard function
function isNonEmpty<T>(array: T[]): array is [T, ...T[]] {
  return array.length > 0
}

if (isNonEmpty(items)) {
  const firstItem = items[0] // Type is T, not T | undefined
  processItem(firstItem)
}
```

#### Object Property Access

```typescript
// ❌ BAD: Non-null assertion on dynamic params
const { id } = (await params)!

// ✅ GOOD: Destructure with default
const paramsData = await params
const { id } = paramsData ?? {}
if (!id) {
  return notFound()
}

// ✅ BETTER: Type guard
async function getRequiredParam(
  params: Promise<Record<string, string>>,
  key: string
): Promise<string> {
  const resolved = await params
  const value = resolved[key]
  if (!value) {
    throw new Error(`Missing required parameter: ${key}`)
  }
  return value
}

const id = await getRequiredParam(params, 'id')
```

#### Supabase Results

```typescript
// ❌ BAD: Non-null assertion on Supabase result
const { data } = await supabase.from('pets').select('*').eq('id', id).single()
const pet = data!

// ✅ GOOD: Explicit error handling
const { data, error } = await supabase.from('pets').select('*').eq('id', id).single()

if (error || !data) {
  console.error('Failed to fetch pet:', error)
  return null
}

const pet = data // Now guaranteed to be non-null

// ✅ BETTER: Helper function
async function fetchPetOrThrow(id: string): Promise<Pet> {
  const { data, error } = await supabase.from('pets').select('*').eq('id', id).single()

  if (error) {
    throw new Error(`Database error: ${error.message}`)
  }

  if (!data) {
    throw new Error(`Pet not found: ${id}`)
  }

  return data
}

const pet = await fetchPetOrThrow(id) // Type is Pet, not Pet | null
```

---

### Pattern 3: Type Narrowing

```typescript
// ❌ BAD: Unnecessary assertion after check
if (user) {
  console.log(user.name!) // Assertion not needed
}

// ✅ GOOD: Remove assertion (TypeScript already knows)
if (user) {
  console.log(user.name) // TypeScript knows user is defined
}

// ❌ BAD: Complex condition with assertion
const value = optionalValue ?? defaultValue!

// ✅ GOOD: Proper fallback
const value = optionalValue ?? defaultValue

// ❌ BAD: Multiple assertions
const result = data?.items?.[0]!.property!

// ✅ GOOD: Proper null handling
const firstItem = data?.items?.[0]
if (!firstItem?.property) {
  return handleMissingData()
}
const result = firstItem.property
```

---

## Progressive Cleanup Plan

### Sprint 1: Quick Wins (2-3 hours, ~30 violations)

**Target**: Low-risk, high-impact fixes

1. **Test Files** (10 violations)
   - Non-null assertions in test setup
   - Mock data with `any` types
   - Lower risk since tests are isolated

2. **Simple Array Access** (10 violations)
   - `array[0]!` → `array[0] ?? defaultValue`
   - `array.find()!` → proper null check

3. **Obvious Type Narrowing** (10 violations)
   - Assertions after if checks
   - Unnecessary assertions in safe code

**Commands**:

```bash
# Find test files with violations
npm run lint | grep "\.test\.ts" | grep "no-non-null-assertion"

# Fix and test
npm run test:unit
```

---

### Sprint 2: Component Files (3-4 hours, ~40 violations)

**Target**: React components and pages

1. **Event Handlers** (15 violations)
   - Replace `(e: any)` with proper React event types
   - Extract common event types

2. **DOM References** (15 violations)
   - `ref.current!` → null checks
   - `querySelector()!` → proper guards

3. **Props Destructuring** (10 violations)
   - Params assertions in Next.js pages
   - SearchParams assertions

**Commands**:

```bash
# Find component files with violations
npm run lint | grep -E "\.(tsx|jsx)" | grep -E "no-explicit-any|no-non-null-assertion"

# Test affected pages
npm run dev  # Manual smoke test
```

---

### Sprint 3: API Routes & Services (3-4 hours, ~40 violations)

**Target**: Backend logic

1. **API Response Types** (15 violations)
   - Define response interfaces
   - Add Zod schemas for validation

2. **Supabase Results** (15 violations)
   - Add proper error handling
   - Create helper functions for common queries

3. **Service Layer** (10 violations)
   - Type service method parameters
   - Define return types

**Commands**:

```bash
# Find API files with violations
npm run lint | grep "app/api" | grep -E "no-explicit-any|no-non-null-assertion"

# Test APIs
npm run test:api
```

---

### Sprint 4: Utility Functions (2-3 hours, ~30 violations)

**Target**: Library code

1. **Generic Functions** (10 violations)
   - Replace `any` with generic type parameters
   - Add type constraints

2. **Type Guards** (10 violations)
   - Improve type guard functions
   - Add runtime validation

3. **Third-Party Integrations** (10 violations)
   - Create type wrappers for untyped libraries
   - Use `unknown` instead of `any` where appropriate

**Commands**:

```bash
# Find lib files with violations
npm run lint | grep "lib/" | grep -E "no-explicit-any|no-non-null-assertion"

# Test utilities
npm run test:unit lib/
```

---

### Sprint 5: Remaining Edge Cases (1-2 hours, ~9 violations)

**Target**: Complex or risky fixes

1. **Review Remaining** (9 violations)
   - Assess if legitimate `any` use (e.g., truly dynamic data)
   - Document why if suppression needed

2. **Add Suppressions** (if needed)

   ```typescript
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   const dynamicData: any = JSON.parse(userInput)
   ```

3. **Update Documentation**
   - Document any remaining intentional `any` usage
   - Update this guide with lessons learned

---

## Testing Requirements

### After Each Fix

1. **Run Type Checker**

   ```bash
   npm run typecheck
   ```

2. **Run Affected Tests**

   ```bash
   # Unit tests
   npm run test:unit [path-to-file]

   # Integration tests
   npm run test:integration
   ```

3. **Manual Smoke Test**
   - Navigate to affected pages
   - Test affected functionality
   - Check browser console for errors

4. **Run Full Test Suite** (before commit)
   ```bash
   npm run test
   npm run lint
   npm run build
   ```

---

## Common Pitfalls

### Pitfall 1: Over-Typing

```typescript
// ❌ TOO SPECIFIC: Breaks on valid inputs
function processUser(user: { id: string; name: string }): void {
  console.log(user.name)
}

// ✅ JUST RIGHT: Accept what you need
function processUser(user: { name: string }): void {
  console.log(user.name)
}
```

### Pitfall 2: Losing Type Information

```typescript
// ❌ LOSES TYPE INFO: Result is unknown
const result = JSON.parse(jsonString)

// ✅ PRESERVES TYPE: Runtime validation
const result = UserSchema.parse(JSON.parse(jsonString))
```

### Pitfall 3: Trading Safety for Convenience

```typescript
// ❌ UNSAFE: Removes safety for convenience
const item = items[0] as ItemType

// ✅ SAFE: Explicit error handling
if (items.length === 0) {
  throw new Error('Items array is empty')
}
const item: ItemType = items[0]
```

### Pitfall 4: Not Testing Edge Cases

```typescript
// ❌ UNTESTED: What if id is undefined?
function getUser(id: string) {
  return users.find((u) => u.id === id)
}

// ✅ TESTED: Handle edge cases
function getUser(id: string | undefined): User | null {
  if (!id) return null
  return users.find((u) => u.id === id) ?? null
}

// Write tests for:
// - id is undefined
// - id not found
// - id found
```

---

## Helper Functions Library

Create reusable helpers to reduce repetition:

```typescript
// lib/utils/type-helpers.ts

/**
 * Asserts value is non-null, throws otherwise
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message: string = 'Value is required'
): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message)
  }
}

/**
 * Type guard for non-empty arrays
 */
export function isNonEmpty<T>(array: T[]): array is [T, ...T[]] {
  return array.length > 0
}

/**
 * Safe array access with default
 */
export function getArrayItem<T>(array: T[], index: number, defaultValue: T): T {
  return array[index] ?? defaultValue
}

/**
 * Safe property access
 */
export function getProperty<T, K extends keyof T>(
  obj: T | null | undefined,
  key: K,
  defaultValue: T[K]
): T[K] {
  return obj?.[key] ?? defaultValue
}

/**
 * Validate Supabase result
 */
export function validateSupabaseResult<T>(data: T | null, error: Error | null, context: string): T {
  if (error) {
    throw new Error(`${context}: ${error.message}`)
  }
  if (!data) {
    throw new Error(`${context}: No data returned`)
  }
  return data
}

// Usage examples:
const firstItem = getArrayItem(items, 0, DEFAULT_ITEM)
assertDefined(user, 'User must be logged in')
const pet = validateSupabaseResult(data, error, 'Fetching pet')
```

---

## Migration Script

For bulk fixes of simple patterns:

```typescript
// scripts/fix-type-safety.ts
import * as fs from 'fs'
import * as path from 'path'

// Find and replace simple patterns
function fixNonNullAssertions(filePath: string): void {
  let content = fs.readFileSync(filePath, 'utf-8')
  let modified = false

  // Fix: array[0]! → array[0] ?? defaultValue
  const arrayAccessPattern = /(\w+)\[0\]!/g
  if (arrayAccessPattern.test(content)) {
    console.log(`Fixing array access in ${filePath}`)
    content = content.replace(arrayAccessPattern, '$1[0] /* TODO: Add default value */')
    modified = true
  }

  // Fix: params.id! → params.id (after await params null check)
  // Add more patterns...

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8')
    console.log(`✓ Fixed ${filePath}`)
  }
}

// Run on all TypeScript files
// node scripts/fix-type-safety.ts
```

---

## Progress Tracking

### Current Status

- **Total Violations**: 149
- **Fixed**: 0
- **Remaining**: 149

### By Category

| Category                | Total | Fixed | Remaining |
| ----------------------- | ----- | ----- | --------- |
| Test Files              | 10    | 0     | 10        |
| Component Files         | 40    | 0     | 40        |
| API Routes              | 40    | 0     | 40        |
| Utilities               | 30    | 0     | 30        |
| Edge Cases              | 9     | 0     | 9         |
| `no-explicit-any`       | 34    | 0     | 34        |
| `no-non-null-assertion` | 115   | 0     | 115       |

### Sprint Completion

- [ ] Sprint 1: Quick Wins (30 violations)
- [ ] Sprint 2: Components (40 violations)
- [ ] Sprint 3: API & Services (40 violations)
- [ ] Sprint 4: Utilities (30 violations)
- [ ] Sprint 5: Edge Cases (9 violations)

---

## Success Criteria

### Per Sprint

- [ ] All targeted violations fixed
- [ ] Type checker passes (`npm run typecheck`)
- [ ] All tests pass (`npm run test`)
- [ ] Build succeeds (`npm run build`)
- [ ] Manual smoke test passed
- [ ] No new type safety violations introduced

### Overall Project

- [ ] 0 `@typescript-eslint/no-explicit-any` violations
- [ ] 0 `@typescript-eslint/no-non-null-assertion` violations
- [ ] All tests passing
- [ ] No runtime errors introduced
- [ ] Type coverage maintained or improved
- [ ] Documentation updated

---

## References

- **TypeScript Handbook**: https://www.typescriptlang.org/docs/handbook/
- **React TypeScript Cheatsheet**: https://react-typescript-cheatsheet.netlify.app/
- **ESLint TypeScript Rules**: https://typescript-eslint.io/rules/
- **Zod Documentation**: https://zod.dev/
- **Type Guards Guide**: `web/lib/utils/type-guards.ts`

---

_Last updated: January 2026_  
_Progress: 0/149 violations fixed (0%)_  
_Estimated remaining time: 10-15 hours across 5 sprints_
