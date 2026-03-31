# 🏗️ Architecture Roast

> *"The road to tech debt hell is paved with 'we'll refactor it later'"*

**Score: 6.5/10** — *"Good bones, questionable interior decorating"*

---

## Overview

The Vete platform has a solid Next.js 15 foundation with proper multi-tenancy routing. But somewhere along the way, files got fat, patterns got inconsistent, and state management became a free-for-all.

---

## 🔴 Critical Issues

### ARCH-001: Bloated Server Actions

**The Crime:**
```
web/app/actions/invoices.ts    — 27KB (≈800 lines)
web/app/actions/appointments.ts — 22KB (≈650 lines)
```

You've created monolithic action files that handle everything from creation to payment to refunds. This is the "God Object" anti-pattern, just in file form.

**Why It Hurts:**
- Impossible to test individual operations in isolation
- Bundle size bloat (entire file loads for any operation)
- Merge conflicts when multiple devs touch different operations
- Can't tree-shake unused exports

**The Fix:**
```
app/actions/invoices/
├── create.ts      (≈100 lines)
├── update.ts      (≈80 lines)
├── pay.ts         (≈120 lines)
├── refund.ts      (≈100 lines)
├── send.ts        (≈80 lines)
└── index.ts       (re-exports)
```

**Effort:** 🟡 Medium (2-3 days per module)

---

### ARCH-002: State Management Chaos

**The Crime:**

You have THREE different state management approaches, and none of them talk to each other:

1. **React Context** — Cart, Theme, Wishlist
2. **Zustand** — In `package.json` but usage unclear
3. **Server State** — Raw fetch calls without caching

**File Evidence:**
```typescript
// web/context/cart-context.tsx — 12+ properties in one context
interface CartContextType {
  items: CartItem[]
  addItem: (item) => void
  updateQuantity: (id, qty) => void
  removeItem: (id) => void
  clearCart: () => void
  total: number
  discount: number
  syncStatus: 'idle' | 'syncing' | 'error'
  syncToDatabase: () => Promise<void>
  loadFromDatabase: () => Promise<void>
  getStockStatus: (productId) => StockValidationResult
  validateQuantity: (productId, qty) => boolean
  // ... and more
}
```

**Why It Hurts:**
- Any state change triggers re-render of ALL consumers
- Business logic (stock validation) mixed with UI state
- No server state caching (same data fetched repeatedly)
- `@tanstack/react-query` is in your dependencies BUT NOT USED

**The Fix:**

Split into focused contexts:
```typescript
// CartUIContext — Just local state
{ items, addItem, removeItem, total }

// CartSyncContext — Persistence logic
{ syncStatus, syncToDatabase, loadFromDatabase }

// StockContext — Validation
{ validateStock, getStockStatus }
```

Better yet, use React Query for server state:
```typescript
// You literally have it installed. Use it.
import { useQuery, useMutation } from '@tanstack/react-query'

export function useCart() {
  return useQuery({
    queryKey: ['cart'],
    queryFn: fetchCart,
    staleTime: 5 * 60 * 1000,
  })
}
```

**Effort:** 🔴 High (1-2 weeks)

---

## 🟠 High Priority Issues

### ARCH-003: Theme Provider Misplacement

**The Crime:**
```typescript
// web/app/[clinic]/layout.tsx (lines 213-225)
<ToastProvider>
  <CartProvider>
    <div className="min-h-screen...">
      <ClinicThemeProvider theme={data.theme} />  {/* Inside the div?! */}
      {children}
    </div>
  </CartProvider>
</ToastProvider>
```

The `ClinicThemeProvider` is INSIDE the layout div, meaning CSS variables are only available to `{children}`, not to sibling providers or the wrapping div itself.

**The Fix:**
```typescript
<ClinicThemeProvider theme={data.theme}>
  <ToastProvider>
    <CartProvider>
      <div className="min-h-screen bg-[var(--bg-default)]">
        {children}
      </div>
    </CartProvider>
  </ToastProvider>
</ClinicThemeProvider>
```

**Effort:** 🟢 Low (30 minutes)

---

### ARCH-004: Inconsistent Module Organization

**The Crime:**

```
lib/supabase/
├── client.ts    (browser client)
└── server.ts    (server client)

lib/api/
├── with-auth.ts     (auth wrapper)
├── errors.ts        (error handling)
├── pagination.ts    (pagination utils)
└── ... scattered utilities
```

The `lib/supabase/` folder is anemic while `lib/api/` is a dumping ground. There's no clear organization principle.

**Better Structure:**
```
lib/
├── supabase/
│   ├── client.ts
│   ├── server.ts
│   ├── auth.ts         (auth-specific helpers)
│   ├── queries/        (reusable query patterns)
│   └── mutations/      (reusable mutation patterns)
├── api/
│   ├── middleware/     (withAuth, rateLimit)
│   ├── responses/      (error handling, pagination)
│   └── validation/     (Zod schemas)
└── utils/
    ├── dates.ts
    ├── currency.ts
    └── formatting.ts
```

**Effort:** 🟡 Medium (3-4 days)

---

### ARCH-005: Migration File Monsters

**The Crime:**
```
web/db/migrations/0000_parched_scalphunter.sql — 3,577 lines
web/db/60_store/01_inventory.sql              — 1,722 lines
```

A single migration file with 3,500+ lines is not a migration—it's a database dump wearing a trenchcoat.

**Why It Hurts:**
- Impossible to roll back specific changes
- Code review is meaningless at this scale
- Debugging schema issues becomes archaeology
- No clear audit trail of what changed when

**The Fix:**

Going forward:
- Max 200 lines per migration
- One concern per file
- Descriptive names: `20240115_add_invoice_refunds.sql`

For existing monsters:
- Don't touch them (they're deployed)
- Document what they contain
- Never repeat this mistake

**Effort:** 🟢 Low (process change only)

---

## 🟡 Medium Priority Issues

### ARCH-006: Component Directory Sprawl

**The Crime:**

40+ component directories with inconsistent organization:
```
components/
├── calendar/           (9 files)
├── clinical/           (12 files)
├── store/              (15 files)
├── booking/            (8 files)
├── dashboard/          (18 files)
├── ui/                 (20+ files)
└── ... 35 more directories
```

Some directories have index files, some don't. Some group by feature, some by type. It's chaos.

**The Fix:**

Pick a convention and enforce it:
```
components/
├── ui/                 # Primitives (Button, Input, Card)
│   └── index.ts        # Barrel exports
├── features/           # Feature-specific
│   ├── calendar/
│   ├── booking/
│   └── store/
├── layout/             # Layout components
└── shared/             # Cross-feature utilities
```

**Effort:** 🔴 High (1 week, but can be incremental)

---

### ARCH-007: Missing Barrel Exports

**The Crime:**

No consistent use of `index.ts` barrel exports:
```typescript
// Current: import from deep paths
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

// Better: barrel export
import { Button, Card, Input } from '@/components/ui'
```

**Effort:** 🟢 Low (1 day)

---

## 📊 Architecture Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Max action file size | 27KB | <5KB | 🔴 |
| State management patterns | 3 | 1-2 | 🟠 |
| Component directories | 40+ | <20 | 🟡 |
| Migration file max lines | 3,577 | <200 | 🔴 |
| Barrel exports coverage | ~20% | 100% | 🟡 |

---

## Recommended Reading

- [Bulletproof React](https://github.com/alan2207/bulletproof-react) — Project structure patterns
- [React Query Docs](https://tanstack.com/query/latest) — You already installed it, now use it
- [Feature-Sliced Design](https://feature-sliced.design/) — Scalable frontend architecture

---

## Summary

The architecture started well but lost discipline as the codebase grew. The multi-tenancy routing is excellent, the Next.js 15 patterns are correct, but the organization has drifted into chaos.

**Priority Actions:**
1. Split bloated action files (this week)
2. Implement React Query for server state (this month)
3. Standardize component organization (this quarter)

*"Architecture is about making decisions that are hard to change later. You've made some that you now need to change."*
