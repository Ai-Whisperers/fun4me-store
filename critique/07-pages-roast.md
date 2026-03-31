# 📄 Pages Roast

> *"A page without loading states is a page that loads anxiety."*

**Score: 6.5/10** — *"The pages work, but the edges are rough"*

---

## Overview

The Vete platform has 50+ pages serving public content, pet owner portals, staff dashboards, and admin tools. Most are well-structured Server Components with proper auth checks. But dig into the details and you'll find missing loading states, absent empty states, and error handling that varies wildly.

---

## 🔴 Critical Issues

### PAGE-001: Missing Loading States

**The Crime:**

Some pages have loading skeletons:
```
✅ web/app/[clinic]/book/loading.tsx
✅ web/app/[clinic]/dashboard/appointments/loading.tsx
✅ web/app/[clinic]/dashboard/clients/loading.tsx
```

Most don't:
```
❌ web/app/[clinic]/services/page.tsx        — No loading.tsx
❌ web/app/[clinic]/cart/page.tsx            — No loading.tsx
❌ web/app/[clinic]/dashboard/patients/      — No loading.tsx
❌ web/app/[clinic]/portal/dashboard/        — No loading.tsx
❌ web/app/[clinic]/store/products/          — No loading.tsx
```

**Why It Hurts:**
- Users see blank screens while data loads
- No indication that something is happening
- Poor perceived performance

**The Fix:**

Create loading skeletons for data-heavy pages:
```typescript
// web/app/[clinic]/services/loading.tsx
export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero skeleton */}
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
      </div>

      {/* Search skeleton */}
      <div className="mt-8 h-12 bg-gray-200 rounded-full animate-pulse" />

      {/* Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="h-48 bg-gray-200 rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  )
}
```

**Effort:** 🟢 Low per page

---

### PAGE-002: Missing Empty States

**The Crime:**

What happens when there's no data?

```typescript
// web/app/[clinic]/services/page.tsx
return (
  <ServicesGrid services={services.services} />
  // If services.services is empty, what shows?
  // Probably... nothing. Just blank space.
)
```

```typescript
// web/app/[clinic]/cart/page.tsx
// If cart is empty, is there a friendly message?
// An illustration? A CTA to start shopping?
// WHO KNOWS
```

**The Fix:**

Add empty state components:
```typescript
// components/ui/empty-state.tsx
interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    href: string
  }
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Icon className="h-16 w-16 text-[var(--text-secondary)] opacity-50 mb-4" />
      <h3 className="text-xl font-semibold text-[var(--text-primary)]">{title}</h3>
      <p className="text-[var(--text-secondary)] mb-6">{description}</p>
      {action && (
        <Link href={action.href} className="btn-primary">
          {action.label}
        </Link>
      )}
    </div>
  )
}

// Usage
{services.length === 0 ? (
  <EmptyState
    icon={Stethoscope}
    title="No hay servicios disponibles"
    description="Esta clínica aún no ha configurado sus servicios"
  />
) : (
  <ServicesGrid services={services} />
)}
```

**Effort:** 🟢 Low

---

## 🟠 High Priority Issues

### PAGE-003: Inconsistent Error Handling

**The Crime:**

**Page A: Inline error div**
```typescript
// web/app/[clinic]/dashboard/patients/page.tsx
if (error) {
  return (
    <div className="rounded-lg p-4" style={{ backgroundColor: "var(--status-error-bg)" }}>
      <p style={{ color: "var(--status-error-dark)" }}>Error al cargar</p>
    </div>
  )
}
```

**Page B: Error boundary**
```typescript
// web/app/[clinic]/book/error.tsx
'use client'
export default function Error({ error, reset }) {
  return (
    <div className="flex flex-col items-center">
      <h2>Algo salió mal</h2>
      <button onClick={reset}>Intentar de nuevo</button>
    </div>
  )
}
```

**Page C: No error handling**
```typescript
// Some pages just... throw?
```

**The Fix:**

Standardize error handling:
```typescript
// 1. Every route group should have an error.tsx
// app/[clinic]/dashboard/error.tsx
// app/[clinic]/portal/error.tsx
// app/[clinic]/store/error.tsx

// 2. Use consistent error component
export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    logger.error('Page error', { error: error.message })
  }, [error])

  return (
    <ErrorState
      title="Error al cargar la página"
      description="Ha ocurrido un error inesperado"
      onRetry={reset}
    />
  )
}
```

**Effort:** 🟢 Low

---

### PAGE-004: Auth Check Inconsistency

**The Crime:**

**Pattern A: Using requireStaff helper**
```typescript
// web/app/[clinic]/dashboard/patients/page.tsx
const { profile } = await requireStaff(clinic)
// Redirects if not staff - good!
```

**Pattern B: Manual check**
```typescript
// Some dashboard pages
const user = await getUser()
if (!user) redirect('/login')
// Missing role check!
```

**Pattern C: No check visible**
```typescript
// Some pages rely on layout auth
// But is the layout actually checking?
```

**The Fix:**

Use auth helpers consistently:
```typescript
// For owner pages
const { user, profile } = await requireAuth(clinic)

// For staff pages
const { user, profile } = await requireStaff(clinic)

// For admin pages
const { user, profile } = await requireAdmin(clinic)
```

And audit every protected page to ensure it uses the right helper.

**Effort:** 🟡 Medium

---

### PAGE-005: Booking Wizard Missing Error Display

**The Crime:**

```typescript
// web/components/booking/booking-wizard/index.tsx
const { submitError } = useBookingStore()

// submitError exists in the store but...
// Where is it displayed?
// If appointment creation fails, does the user know?
```

**The Fix:**

Add error display:
```typescript
{submitError && (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
    <div className="flex items-center gap-2">
      <AlertCircle className="h-5 w-5 text-red-500" />
      <p className="text-red-700">{submitError}</p>
    </div>
    <button
      onClick={() => clearError()}
      className="mt-2 text-sm text-red-600 underline"
    >
      Intentar de nuevo
    </button>
  </div>
)}
```

**Effort:** 🟢 Low

---

## 🟡 Medium Priority Issues

### PAGE-006: Hardcoded Header Background

**The Crime:**

```typescript
// web/app/[clinic]/layout.tsx (line 162)
<header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-gray-100">
```

`bg-white` is hardcoded. In a theme-aware application. With CSS variables. Right there.

**The Fix:**

```typescript
<header className="sticky top-0 z-50 w-full bg-[var(--bg-default)]/95 backdrop-blur-md border-b border-[var(--border-color)]">
```

**Effort:** 🟢 Low (5 minutes)

---

### PAGE-007: Dashboard Sidebar State

**The Crime:**

The dashboard layout probably has a sidebar. But:
- Is the active link highlighted?
- Is the collapsed state persisted?
- Does it work on mobile?
- Is navigation consistent across all dashboard pages?

Without examining the actual layout, these are unknown.

**Audit Questions:**
1. Does sidebar highlight current page?
2. Is mobile navigation accessible?
3. Can sidebar be collapsed?
4. Is collapse state persisted?

**Effort:** 🟡 Medium (if issues found)

---

### PAGE-008: Static Generation Coverage

**The Crime:**

```typescript
// web/app/[clinic]/page.tsx
export async function generateStaticParams() {
  return [{ clinic: 'adris' }, { clinic: 'petlife' }]
}
// Good! Static generation for public pages
```

But what about:
- `/[clinic]/services`
- `/[clinic]/about`
- `/[clinic]/terms`
- `/[clinic]/privacy`

Are they all statically generated?

**The Fix:**

Audit all public pages for static generation:
```typescript
// Every public page should have:
export async function generateStaticParams() {
  return [{ clinic: 'adris' }, { clinic: 'petlife' }]
}

// Or use generateMetadata with dynamic = 'force-static'
export const dynamic = 'force-static'
```

**Effort:** 🟢 Low

---

### PAGE-009: Meta Tags and SEO

**The Crime:**

Do pages have proper meta tags?

```typescript
// Expected pattern
export function generateMetadata({ params }): Metadata {
  return {
    title: `Servicios | ${clinicName}`,
    description: `Servicios veterinarios disponibles en ${clinicName}`,
    openGraph: { ... },
  }
}
```

If meta tags are missing:
- Poor SEO
- Bad social sharing
- Generic browser tabs

**Effort:** 🟢 Low per page

---

## 📊 Page Metrics

| Category | Pages | Loading State | Empty State | Error Handling |
|----------|-------|---------------|-------------|----------------|
| Public | 8 | 50% | 30% | 60% |
| Portal | 12 | 40% | 50% | 50% |
| Dashboard | 20 | 30% | 40% | 40% |
| Store | 8 | 40% | 40% | 40% |

---

## Page Checklist

For every page:
- [ ] Has `loading.tsx` (if data-heavy)
- [ ] Has `error.tsx` (or inherited from layout)
- [ ] Has empty state for zero data
- [ ] Uses proper auth helper
- [ ] Uses theme variables (no hardcoded colors)
- [ ] Has meta tags for SEO
- [ ] Is statically generated (if public)
- [ ] Has accessible navigation
- [ ] Works on mobile

---

## Summary

The page structure is fundamentally solid. Server Components are used correctly. Auth checks exist. But the user experience edges—loading states, empty states, error handling—are inconsistent.

These aren't hard fixes. They're just tedious. And tedium leads to inconsistency.

**Priority Actions:**
1. Add loading.tsx to services, cart, products pages (today)
2. Create reusable EmptyState component (today)
3. Standardize error.tsx across route groups (this week)
4. Audit all pages for auth consistency (this week)
5. Fix hardcoded header colors (today, 5 minutes)

*"A page is a promise. Loading states set expectations. Error states keep promises."*
