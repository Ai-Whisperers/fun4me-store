# 🔷 TypeScript Type Safety Roast

> *"TypeScript is like a seatbelt. It only works if you actually use it."*

**Score: 7/10** — *"Strict mode enabled, but the escape hatches are wide open"*

---

## Overview

Good news: You have `strict: true` in tsconfig.json. Bad news: You've found every way to bypass it. Non-null assertions, unsafe casts, and environment variables that assume they exist—your type safety has more holes than Swiss cheese.

---

## 🟢 What You Did Right

### Strict Mode Is Enabled

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true  // ✅ This is the foundation
  }
}
```

This catches most type errors. The problems below are active attempts to defeat it.

### Type Definitions Are Solid

```typescript
// lib/types/store.ts
export const SPECIES = ['perro', 'gato', 'ave', 'reptil', 'pez', 'roedor', 'conejo', 'otro'] as const
export type Species = (typeof SPECIES)[number]
```

Excellent pattern. Const assertions with derived types prevent drift.

### Interface vs Type Usage Is Correct

```typescript
// Correct: interface for object shapes
interface TemplateManagerProps {
  templates: WhatsAppTemplate[]
  clinic: string
}

// Correct: type for unions
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }
```

You follow the convention. Good.

---

## 🔴 Critical Issues

### TS-001: 28 Environment Variable Assertions

**The Crime:**

```typescript
// middleware.ts:36-37
createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,      // 💀
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // 💀
)

// lib/config/loader.ts:158
databaseUrl: process.env.DATABASE_URL!,        // 💀

// db/index.ts:5
const db = createClient(process.env.DATABASE_URL!)  // 💀
```

**The Problem:**

28 places where you assert `process.env.SOMETHING!` exists. If any are missing:
- Runtime crash (not compile-time)
- Cryptic error message
- Middleware breaks the entire app
- Database operations silently fail

**The Fix:**

Create a validated environment module:

```typescript
// lib/env.ts
function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export const env = {
  SUPABASE_URL: requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
  SUPABASE_ANON_KEY: requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  DATABASE_URL: requireEnv('DATABASE_URL'),
  // ... all other required env vars
} as const

// This runs at module load time, failing fast if env vars are missing
```

Then import from `lib/env.ts` instead of using `process.env` directly.

**Effort:** 🟡 Medium (2-3 hours to fix all 28 locations)

---

### TS-002: Map/Set Access Without Guards

**The Crime:**

```typescript
// components/store/filters/category-tree.tsx:36
const node = categoryMap.get(cat.slug)!  // 💀 Assumes slug is in map

// components/calendar/calendar.tsx:161
const data = details.get(dateKey)!  // 💀 Assumes date is in map

// lib/config/manager.ts:36
const override = featureOverrides.get(feature)!  // 💀 Assumes feature exists

// scripts/gsheets/migrate-to-text-codes.ts:125
const codes = usedCodes.get(parentKey)!  // 💀 Assumes parent exists
```

**The Problem:**

`Map.get()` returns `T | undefined`. The `!` assertion lies to the compiler. If the key doesn't exist, you get `undefined` where you promised `T`.

**The Fix:**

Create a helper function:

```typescript
// lib/utils/map.ts
export function getOrThrow<K, V>(
  map: Map<K, V>,
  key: K,
  errorMessage?: string
): V {
  const value = map.get(key)
  if (value === undefined) {
    throw new Error(errorMessage ?? `Key not found in map: ${String(key)}`)
  }
  return value
}

// Usage
const node = getOrThrow(categoryMap, cat.slug, `Category not found: ${cat.slug}`)
```

**Effort:** 🟢 Low (1 hour)

---

## 🟠 High Priority Issues

### TS-003: Unsafe Type Casts

**The Crime:**

```typescript
// app/api/store/orders/route.ts:182
const inventory = product.store_inventory as unknown as { stock_quantity: number } | null
// Double cast through `unknown` = "I have no idea what this type is"

// lib/config/loader.ts:175
provider: process.env.EMAIL_PROVIDER! as any
// `as any` defeats the entire type system

// components/whatsapp/template-manager.tsx:157
onChange={(e) => setForm({ ...form, category: e.target.value as TemplateCategory })}
// Assumes select value is valid enum member
```

**The Problem:**

- `as unknown as X` is a red flag for incomplete types
- `as any` is TypeScript's "turn off type checking here" button
- Unvalidated string-to-enum casts can produce invalid state

**The Fix:**

For enums, use validation:

```typescript
// lib/validators.ts
const TEMPLATE_CATEGORIES = ['general', 'reminder', 'vaccine', 'message', 'promotion', 'recall'] as const
type TemplateCategory = typeof TEMPLATE_CATEGORIES[number]

function validateTemplateCategory(value: unknown): TemplateCategory {
  if (typeof value !== 'string' || !TEMPLATE_CATEGORIES.includes(value as any)) {
    throw new Error(`Invalid category: ${value}`)
  }
  return value as TemplateCategory
}

// Usage
onChange={(e) => setForm({ ...form, category: validateTemplateCategory(e.target.value) })}
```

For the inventory cast, fix the query types:

```typescript
// Instead of casting, define the type in the query
const { data: product } = await supabase
  .from('store_products')
  .select(`
    *,
    store_inventory!inner (stock_quantity)
  `)
  .single()

// Now product.store_inventory is properly typed
```

**Effort:** 🟡 Medium

---

### TS-004: Filter + Map Pattern Assertions

**The Crime:**

```typescript
// app/actions/time-off.ts:171-172
const reviewerIds = [...new Set(
  requests.filter(r => r.reviewed_by).map(r => r.reviewed_by!)
)]
const coveringIds = [...new Set(
  requests.filter(r => r.covering_staff_id).map(r => r.covering_staff_id!)
)]
```

**The Problem:**

TypeScript doesn't understand that `filter(r => r.reviewed_by)` narrows the type. The `!` is technically safe here, but it's a pattern that breaks if the filter changes.

**The Fix:**

Use type predicates:

```typescript
// Type predicate
function hasReviewedBy<T extends { reviewed_by: string | null }>(
  item: T
): item is T & { reviewed_by: string } {
  return item.reviewed_by !== null
}

// Now TypeScript understands the narrowing
const reviewerIds = [...new Set(
  requests.filter(hasReviewedBy).map(r => r.reviewed_by)  // No assertion needed!
)]
```

**Effort:** 🟢 Low

---

### TS-005: Query Result Assumptions

**The Crime:**

```typescript
// app/api/store/orders/route.ts:212
const product = products.find(p => p.id === item.product_id)!
// Assumes product exists

// components/dashboard/appointments/appointment-queue.tsx:141
const waitTime = getMinutesDiff(a.checked_in_at!)
// Assumes appointment has checked_in_at
```

**The Problem:**

`find()` returns `T | undefined`. Asserting `!` when the item might not exist is a runtime crash waiting to happen.

**The Fix:**

Handle the missing case:

```typescript
// Option 1: Early return
const product = products.find(p => p.id === item.product_id)
if (!product) {
  return apiError(`Product not found: ${item.product_id}`, 400)
}

// Option 2: Filter first
const validItems = items.filter(item => {
  const product = products.find(p => p.id === item.product_id)
  if (!product) {
    logger.warn(`Skipping item with missing product: ${item.product_id}`)
    return false
  }
  return true
})
```

**Effort:** 🟡 Medium

---

## 🟡 Medium Priority Issues

### TS-006: Missing tsconfig Strictness Options

**The Crime:**

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true
    // Missing additional strictness options
  }
}
```

**What's Missing:**

```json
{
  "compilerOptions": {
    "strict": true,
    // Add these for maximum safety:
    "noUncheckedIndexedAccess": true,  // Array access returns T | undefined
    "noImplicitReturns": true,         // All paths must return
    "exactOptionalPropertyTypes": true, // Stricter optional handling
    "noPropertyAccessFromIndexSignature": true,  // Force bracket notation for index signatures
    "forceConsistentCasingInFileNames": true     // Case-sensitive imports
  }
}
```

**Why It Matters:**

With `noUncheckedIndexedAccess`:
```typescript
const items = ['a', 'b', 'c']
const first = items[0]  // Type: string | undefined (not string!)
```

This catches array index-out-of-bounds bugs at compile time.

**Effort:** 🟡 Medium (will reveal many new errors)

---

### TS-007: Object.keys Cast Pattern

**The Crime:**

```typescript
// db/seeds/scripts/variants/index.ts:42-43
export function getVariantNames(): VariantName[] {
  return Object.keys(VARIANTS) as VariantName[]
}
```

**The Problem:**

`Object.keys()` returns `string[]`, not `keyof T[]`. The cast assumes all keys match the type, but TypeScript can't verify this.

**The Fix:**

Use a const assertion pattern:

```typescript
const VARIANT_NAMES = ['basic', 'integration', 'e2e', 'demo', 'reset'] as const
type VariantName = typeof VARIANT_NAMES[number]

const VARIANTS: Record<VariantName, VariantConfig> = {
  basic: { /* ... */ },
  integration: { /* ... */ },
  // ...
}

export function getVariantNames(): readonly VariantName[] {
  return VARIANT_NAMES  // No cast needed!
}
```

**Effort:** 🟢 Low

---

### TS-008: Optional Chaining Misuse

**The Crime:**

```typescript
// app/[clinic]/store/wishlist/page.tsx:40
const clinic = params?.clinic as string
```

**The Problem:**

`params?.clinic` could be `undefined`, then you cast it to `string`. If it's undefined, you now have `undefined as string`, which TypeScript thinks is a `string`.

**The Fix:**

```typescript
// Option 1: Assert params exists
const { clinic } = params as { clinic: string }

// Option 2: Handle undefined
if (!params?.clinic) {
  notFound()
}
const clinic = params.clinic  // Now definitely string

// Option 3: Use the type that matches the route
interface Props {
  params: Promise<{ clinic: string }>  // Next.js 15 async params
}
```

**Effort:** 🟢 Low

---

### TS-009: Type Predicate Quality

**The Crime:**

You have good type predicates in `lib/types/action-result.ts`:

```typescript
export function isSuccess<T>(result: ActionResult<T>): result is { success: true; data: T } {
  return result.success === true
}
```

But they're not used consistently:

```typescript
// Somewhere in the codebase
const result = await createInvoice(data)
if (result.success) {  // Works, but...
  console.log(result.data)  // TypeScript still thinks data might be undefined
}
```

**The Fix:**

Use the predicates:

```typescript
const result = await createInvoice(data)
if (isSuccess(result)) {  // Now TypeScript knows data exists
  console.log(result.data)  // No error!
}
```

**Effort:** 🟢 Low (cultural change)

---

## 📊 Type Safety Metrics

| Category | Count | Severity |
|----------|-------|----------|
| Non-null assertions (risky) | 8 | 🔴 HIGH |
| Non-null assertions (safe) | 15 | 🟡 LOW |
| Environment variable assertions | 28 | 🔴 HIGH |
| Unsafe type casts (`as any`, `as unknown as`) | 3 | 🔴 HIGH |
| Map/Set access without guards | 4 | 🟠 HIGH |
| Unvalidated string-to-enum casts | 2 | 🟠 MEDIUM |
| Missing tsconfig strictness | 5 options | 🟡 MEDIUM |

---

## Type Safety Checklist

### Immediate (This Week)

- [ ] Create `lib/env.ts` with validated environment variables
- [ ] Replace all `process.env.X!` with `env.X`
- [ ] Create `getOrThrow` helper for Map/Set access
- [ ] Fix the 3 unsafe type casts

### This Sprint

- [ ] Add `noUncheckedIndexedAccess: true` to tsconfig
- [ ] Fix all new errors from strictness
- [ ] Create validation functions for all enums
- [ ] Replace filter+map assertions with type predicates

### Ongoing

- [ ] Use `isSuccess`/`isError` predicates consistently
- [ ] Avoid `as` casts - prefer type guards
- [ ] Never use `as any` - find the real type
- [ ] Document why any `!` assertion is safe

---

## Type Safety Patterns

### Good: Validated Environment

```typescript
// lib/env.ts
const env = {
  SUPABASE_URL: requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
  // ...
} as const

// Usage
import { env } from '@/lib/env'
createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY)
```

### Good: Safe Map Access

```typescript
function getOrThrow<K, V>(map: Map<K, V>, key: K): V {
  const value = map.get(key)
  if (value === undefined) {
    throw new Error(`Missing key: ${String(key)}`)
  }
  return value
}
```

### Good: Type Predicates

```typescript
function hasValue<T, K extends keyof T>(
  obj: T,
  key: K
): obj is T & Record<K, NonNullable<T[K]>> {
  return obj[key] !== null && obj[key] !== undefined
}

// Usage
if (hasValue(appointment, 'checked_in_at')) {
  // checked_in_at is now definitely defined
}
```

### Good: Validated Enums

```typescript
const STATUSES = ['draft', 'sent', 'paid'] as const
type Status = typeof STATUSES[number]

function validateStatus(value: unknown): Status {
  if (!STATUSES.includes(value as Status)) {
    throw new Error(`Invalid status: ${value}`)
  }
  return value as Status
}
```

---

## Summary

TypeScript strict mode is enabled—that's the foundation. But you've built escape hatches: 28 environment variable assertions, unsafe casts, and Map access that assumes keys exist. These aren't type errors (TypeScript trusts you), but they're runtime crashes waiting to happen.

**Priority Actions:**
1. Create validated environment module (today)
2. Fix Map/Set access patterns (this week)
3. Remove `as any` casts (this week)
4. Enable `noUncheckedIndexedAccess` (this sprint)

*"TypeScript tells you when you're wrong. Non-null assertions tell TypeScript to shut up."*

---

## The True Cost of Type Assertions

Every `!` assertion is a promise: "I guarantee this is never null/undefined."

When that promise breaks:
- Runtime error with cryptic stack trace
- No compile-time warning
- Bug reaches production
- User sees "Cannot read property X of undefined"

28 environment assertions × potential runtime crashes = **28 ways your app can break silently on deploy**.

8 risky non-null assertions × user actions that trigger them = **8 ways users can crash the app**.

Fix the assertions. Trust the type system. Sleep better.

