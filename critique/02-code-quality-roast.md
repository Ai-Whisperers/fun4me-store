# 🧹 Code Quality Roast

> *"Technical debt is like a credit card. The interest compounds."*

**Score: 6/10** — *"It compiles, but your IDE is crying"*

---

## Overview

The code works. The types are (mostly) there. But dig beneath the surface and you'll find growing pains: file bloat, abandoned dependencies, inconsistent patterns, and the ghosts of features past.

---

## 🔴 Critical Issues

### QUAL-001: File Size Creep

**The Crime:**

| File | Size | Lines | Status |
|------|------|-------|--------|
| `app/actions/invoices.ts` | 27KB | ~800 | 🔴 Critical |
| `app/actions/appointments.ts` | 22KB | ~650 | 🔴 Critical |
| `app/actions/store.ts` | 15KB | ~450 | 🟠 Warning |
| `components/calendar/calendar.tsx` | 12KB | ~350 | 🟠 Warning |

**The Rule You're Breaking:**

Files over 300 lines become:
- Hard to navigate
- Impossible to test in isolation
- Merge conflict magnets
- A sign of violated Single Responsibility Principle

**Evidence of the Problem:**
```typescript
// app/actions/invoices.ts contains:
// - createInvoice()
// - updateInvoice()
// - deleteInvoice()
// - payInvoice()
// - refundInvoice()
// - sendInvoiceEmail()
// - generateInvoicePDF()
// - applyDiscount()
// - addLineItem()
// - removeLineItem()
// ... and more

// This is not a module. This is a junk drawer.
```

**The Fix:**

Split by operation:
```
actions/invoices/
├── create.ts
├── update.ts
├── delete.ts
├── payment.ts
├── email.ts
├── pdf.ts
├── line-items.ts
└── index.ts
```

**Effort:** 🟡 Medium per file

---

### QUAL-002: Dead Dependencies

**The Crime:**

```json
// package.json includes:
{
  "@tanstack/react-query": "^5.x",  // NEVER USED
  "zustand": "^4.x",                 // Usage unclear
  "framer-motion": "^11.x",          // Partially used
}
```

You installed React Query. You never used it. Your server state is managed with raw `fetch()` calls and manual loading states.

**Why It Hurts:**
- Bundle size includes unused code
- Developers are confused about which tools to use
- You're solving problems that these libraries already solve

**The Audit:**
```bash
# Find unused dependencies
npx depcheck

# Check for vulnerable packages
npm audit

# Check for outdated packages
npm outdated
```

**Effort:** 🟢 Low (1 day audit + cleanup)

---

### QUAL-003: Three Error Patterns

**The Crime:**

You have THREE different ways to handle errors:

**Pattern 1: API Error Helper**
```typescript
// lib/api/errors.ts
return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR, {
  details: { message: 'Error al cargar' }
});
```

**Pattern 2: Direct NextResponse**
```typescript
// Some API routes
return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
```

**Pattern 3: Server Action Result**
```typescript
// Server actions
return { success: false, error: 'El nombre es obligatorio' };
```

**The Chaos:**
- Frontend doesn't know what error shape to expect
- Some errors have codes, some don't
- Some are Spanish, some are English (yes, really)
- Try/catch blocks are inconsistent

**The Fix:**

One error type to rule them all:
```typescript
// lib/errors.ts
export interface AppError {
  code: ErrorCode
  message: string
  status: number
  details?: Record<string, unknown>
}

export const Errors = {
  unauthorized: (): AppError => ({
    code: 'UNAUTHORIZED',
    message: 'No autorizado',
    status: 401,
  }),
  validation: (field: string, message: string): AppError => ({
    code: 'VALIDATION_ERROR',
    message,
    status: 400,
    details: { field },
  }),
  // ... etc
}

// Use everywhere
return apiError(Errors.unauthorized())
return actionError(Errors.validation('email', 'Email inválido'))
```

**Effort:** 🟡 Medium (3-4 days)

---

## 🟠 High Priority Issues

### QUAL-004: Floating Point Currency Math

**The Crime:**
```typescript
// app/actions/invoices.ts (lines 56-75)
const lineTotal = roundCurrency(
  item.quantity * item.unit_price * (1 - (item.discount_percent || 0) / 100)
)
subtotal += lineTotal
subtotal = roundCurrency(subtotal)  // Rounding AGAIN
```

You're doing currency math in JavaScript. JavaScript uses IEEE 754 floating point. This means:

```javascript
0.1 + 0.2 === 0.30000000000000004  // true
```

**Why It Hurts:**
- Rounding errors accumulate
- Pennies disappear on every transaction
- Auditors will have questions

**The Fix:**

Option 1: Use integers (cents/centavos)
```typescript
// Store as integers, display as decimals
const priceInCentavos = 1500000  // 15,000.00 PYG
const displayPrice = (priceInCentavos / 100).toLocaleString('es-PY', {
  style: 'currency',
  currency: 'PYG'
})
```

Option 2: Let PostgreSQL handle it
```sql
SELECT
  quantity * unit_price * (1 - discount_percent/100)::NUMERIC(10,2)
  AS line_total
FROM invoice_items
```

**Effort:** 🟠 High (requires migration)

---

### QUAL-005: TypeScript Escape Hatches

**The Crime:**

```typescript
// Scattered throughout the codebase
// eslint-disable-next-line @typescript-eslint/no-explicit-any
catch (error: any) {
  console.error(error)
}
```

Every `any` is a lie you tell the compiler. Every `eslint-disable` is a debt you're not paying.

**Better:**
```typescript
// Create a proper error handler
function isError(error: unknown): error is Error {
  return error instanceof Error
}

try {
  await riskyOperation()
} catch (error) {
  if (isError(error)) {
    console.error(error.message)
  } else {
    console.error('Unknown error:', error)
  }
}
```

**Effort:** 🟢 Low (fix as you go)

---

### QUAL-006: Console Pollution

**The Crime:**

```typescript
// Found throughout production code
console.log('DEBUG: user data', user)
console.log('appointment created:', data)
console.warn('TODO: implement this')
```

Production code should not have `console.log` statements. Ever.

**The Fix:**

Use your logger:
```typescript
// You have one! lib/logger.ts
import { logger } from '@/lib/logger'

logger.debug('User data', { userId: user.id })
logger.info('Appointment created', { appointmentId: data.id })
logger.warn('Feature not implemented', { feature: 'something' })
```

Then configure it to:
- Log to console in development
- Log to proper service in production
- Never include sensitive data

**ESLint Rule:**
```json
{
  "rules": {
    "no-console": ["error", { "allow": ["warn", "error"] }]
  }
}
```

**Effort:** 🟢 Low (1 day + ESLint rule)

---

## 🟡 Medium Priority Issues

### QUAL-007: Duplicate String Literals

**The Crime:**

```typescript
// Found in 15+ files
.eq('tenant_id', profile.tenant_id)

// Found in 10+ files
if (!user) {
  return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
}

// Found in 8+ files
style={{ backgroundColor: "var(--status-success-bg)" }}
```

**The Fix:**

Constants and helpers:
```typescript
// lib/constants/queries.ts
export const Filters = {
  byTenant: (tenantId: string) => ({ tenant_id: tenantId }),
  byOwner: (ownerId: string) => ({ owner_id: ownerId }),
}

// lib/constants/responses.ts
export const Responses = {
  unauthorized: () => NextResponse.json(
    { error: 'No autorizado' },
    { status: 401 }
  ),
}

// lib/constants/styles.ts
export const StatusStyles = {
  success: { backgroundColor: "var(--status-success-bg)" },
  error: { backgroundColor: "var(--status-error-bg)" },
}
```

**Effort:** 🟢 Low (incremental)

---

### QUAL-008: Magic Numbers

**The Crime:**

```typescript
// What does 90 mean?
return daysSinceVisit <= 90

// What does 48 mean?
className="min-h-[48px]"

// What does 5000 mean?
setTimeout(callback, 5000)
```

**The Fix:**

```typescript
// lib/constants/business.ts
export const BUSINESS_RULES = {
  ACTIVE_CLIENT_THRESHOLD_DAYS: 90,
  TOUCH_TARGET_MIN_HEIGHT: 48,
  TOAST_DURATION_MS: 5000,
}

// Usage
return daysSinceVisit <= BUSINESS_RULES.ACTIVE_CLIENT_THRESHOLD_DAYS
```

**Effort:** 🟢 Low

---

### QUAL-009: Commented-Out Code

**The Crime:**

```typescript
// TODO: implement this later
// const oldImplementation = () => {
//   // 50 lines of dead code
// }

// FIXME: this is broken but we'll fix it later
// (narrator: they did not fix it later)
```

**The Fix:**

Delete it. Git remembers everything. If you need it, it's in history.

```bash
# Find commented code
grep -r "// TODO\|// FIXME\|// HACK" --include="*.ts" --include="*.tsx"
```

**Effort:** 🟢 Low (cathartic, even)

---

## 📊 Code Quality Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Files > 300 lines | 12+ | 0 | 🔴 |
| `any` types | 30+ | 0 | 🟠 |
| `console.log` in prod | 20+ | 0 | 🟠 |
| Unused dependencies | 3+ | 0 | 🟡 |
| Duplicate strings | 50+ | <10 | 🟡 |

---

## Recommended Tools

```json
// .vscode/settings.json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "editor.formatOnSave": true
}
```

```json
// eslint.config.js additions
{
  "rules": {
    "no-console": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "max-lines": ["warn", { "max": 300 }],
    "max-lines-per-function": ["warn", { "max": 50 }]
  }
}
```

---

## Summary

The codebase has grown organically, and the weeds are showing. File bloat, pattern inconsistency, and shortcuts that seemed harmless have accumulated into real technical debt.

**Priority Actions:**
1. Split bloated action files (this week)
2. Standardize error handling (this sprint)
3. Audit and remove unused dependencies (this sprint)
4. Add ESLint rules to prevent regression (today)

*"The best time to refactor was when you wrote it. The second best time is now."*
