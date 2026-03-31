# Frontend Architecture Critique

> **Scope**: React Components, State Management, Routing, Styling, Accessibility
> **Date**: December 2024

---

## Executive Summary

The frontend architecture leverages modern React patterns with Next.js 15 App Router and Server Components. The component structure is well-organized, though some areas need attention for consistency and accessibility.

### Frontend Score: 7/10

| Component | Score | Notes |
|-----------|-------|-------|
| Component Architecture | 7/10 | Good structure, some oversized components |
| State Management | 8/10 | Minimal, server-first approach |
| Routing | 8/10 | Excellent multi-tenant setup |
| Styling | 7/10 | Theme system works, some violations |
| Accessibility | 5/10 | Missing ARIA, focus management |
| Performance | 6/10 | Heavy imports, no image optimization |

---

## 1. Component Architecture

### 1.1 Component Inventory

**Total Components:** 90+
**Organization:** Feature-based with shared UI library

```
components/
├── ui/                     # Design system base (18 components)
│   ├── button.tsx         # ✅ Good: Variants, forwardRef
│   ├── card.tsx           # ✅ Good: Compound components
│   ├── input.tsx          # ✅ Good: Form integration
│   ├── modal.tsx          # ✅ Good: Portal, accessibility
│   ├── skeleton.tsx       # ✅ Good: Loading states
│   ├── badge.tsx          # ✅ Good: Status variants
│   └── index.ts           # ⚠️ Barrel export
│
├── layout/                 # App shell (4 components)
│   ├── main-nav.tsx       # Navigation with mobile drawer
│   ├── notification-bell.tsx
│   └── ...
│
├── clinical/               # Medical domain (12 components)
│   ├── vaccine-schedule.tsx
│   ├── growth-chart.tsx
│   ├── drug-calculator.tsx
│   └── ...
│
├── booking/                # Appointment flow (6 components)
│   ├── booking-wizard.tsx
│   ├── time-slot-picker.tsx
│   └── ...
│
├── pets/                   # Pet management (8 components)
│   ├── pet-card.tsx
│   ├── pet-form.tsx
│   └── ...
│
├── store/                  # E-commerce (10 components)
│   ├── product-card.tsx
│   ├── cart-drawer.tsx
│   └── ...
│
├── dashboard/              # Staff views (15 components)
│   ├── stats-cards.tsx
│   ├── appointment-list.tsx
│   └── ...
│
└── forms/                  # Form components (8 components)
    ├── form-field.tsx
    ├── date-picker.tsx
    └── ...
```

### 1.2 Component Pattern Analysis

#### ✅ Good: Design System Foundation

```typescript
// components/ui/button.tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'rounded-lg font-medium transition-colors',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
```

**Strengths:**
- `forwardRef` for ref forwarding
- Variant-based styling
- `cn()` utility for class merging
- TypeScript interfaces
- `displayName` for debugging

#### ✅ Good: Server Components Default

```typescript
// app/[clinic]/services/page.tsx
// No 'use client' - Server Component by default

import { getClinicData } from '@/lib/clinics';
import { ServiceCard } from '@/components/services/service-card';

export default async function ServicesPage({ params }: Props) {
  const { clinic } = await params;
  const clinicData = await getClinicData(clinic);

  return (
    <div>
      {clinicData.services.map((service) => (
        <ServiceCard key={service.id} service={service} />
      ))}
    </div>
  );
}
```

**Benefit:** Zero JavaScript sent to client for static pages.

#### ✅ Good: Theme Context Provider

```typescript
// context/theme-provider.tsx
'use client';

export function ClinicThemeProvider({
  theme,
  children,
}: {
  theme: ClinicTheme;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        '--primary': theme.colors.primary.main,
        '--primary-light': theme.colors.primary.light,
        '--primary-dark': theme.colors.primary.dark,
        '--bg-default': theme.colors.background.default,
        '--text-primary': theme.colors.text.primary,
        // ... more variables
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
```

### 1.3 Component Weaknesses

#### ❌ Oversized Components

```typescript
// Found: Some pages are 500+ lines
// app/[clinic]/portal/dashboard/page.tsx - 400+ lines
// app/[clinic]/store/client.tsx - 350+ lines
// components/booking/booking-wizard.tsx - 450+ lines
```

**Issue:** Hard to maintain, test, and reuse.

**Recommendation:** Extract into smaller components:
```typescript
// Before: Single 450-line booking wizard

// After: Composed components
<BookingWizard>
  <BookingStepService services={services} />
  <BookingStepDateTime availableSlots={slots} />
  <BookingStepPet pets={userPets} />
  <BookingStepConfirm />
</BookingWizard>
```

#### ⚠️ Inconsistent Props Patterns

```typescript
// Found: Mixed patterns
interface Props {
  clinic: string;  // Sometimes
}

type Props = {
  clinic: string;  // Sometimes
}

// No interface at all - inline typing
function Component({ clinic }: { clinic: string }) {}
```

**Recommendation:** Standardize on interface with Props suffix:
```typescript
interface ServiceCardProps {
  service: Service;
  onBook?: (id: string) => void;
  compact?: boolean;
}

export function ServiceCard({ service, onBook, compact = false }: ServiceCardProps) {
  // ...
}
```

#### ⚠️ Props Drilling

```typescript
// Found: Deep prop passing
<Layout clinic={clinic} theme={theme} user={user}>
  <Dashboard clinic={clinic} theme={theme} user={user}>
    <StatsSection clinic={clinic} user={user}>
      <StatCard clinic={clinic} />
    </StatsSection>
  </Dashboard>
</Layout>
```

**Recommendation:** Use context or composition:
```typescript
// Context approach
const { clinic, user } = useClinicContext();

// Composition approach
<Dashboard>
  {(context) => <StatsSection context={context} />}
</Dashboard>
```

#### ❌ Missing Error Boundaries Per Component

```typescript
// Only global error boundaries exist
// Individual components can crash the whole page
```

**Recommendation:** Wrap critical components:
```typescript
<ErrorBoundary fallback={<StatsFallback />}>
  <StatsSection />
</ErrorBoundary>
```

---

## 2. State Management

### 2.1 State Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    STATE MANAGEMENT                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  SERVER STATE (Primary)                                           │
│  ├── Database via Server Components                               │
│  ├── Server Actions for mutations                                 │
│  └── URL state for filters/pagination                            │
│                                                                   │
│  CLIENT STATE (Minimal)                                           │
│  ├── CartContext (localStorage + React state)                    │
│  ├── ClinicThemeContext (CSS variables)                          │
│  └── Component local state (forms, modals, UI)                   │
│                                                                   │
│  NO GLOBAL STATE LIBRARY ✅                                       │
│  (Redux, Zustand, Jotai not needed)                              │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 State Strengths

#### ✅ Server-First Data Fetching

```typescript
// Data fetched on server, no loading spinners needed
export default async function DashboardPage({ params }: Props) {
  const pets = await getPetsByOwner(userId);  // Server-side
  return <PetList pets={pets} />;
}
```

#### ✅ URL as State for Filters

```typescript
// Good: Shareable, bookmarkable URLs
// /adris/store?category=food&sort=price

const searchParams = useSearchParams();
const category = searchParams.get('category');
const sort = searchParams.get('sort');
```

#### ✅ Minimal Context Usage

```typescript
// Only 2 contexts in the entire app
// 1. CartContext - Shopping cart
// 2. ClinicThemeContext - Theming (actually via CSS variables)
```

### 2.3 State Weaknesses

#### ⚠️ Cart Not Server-Synced

```typescript
// Current: Cart only in localStorage
// Issue: Lost on device switch, no analytics

// Better: Sync to server for logged-in users
const { items, addItem, removeItem } = useCart();
// Should persist to database for authenticated users
```

#### ⚠️ No Optimistic Updates

```typescript
// Current: Wait for server response
const handleSubmit = async () => {
  const result = await createPet(formData);
  if (result.success) {
    // Only then update UI
  }
};

// Better: Optimistic update
const handleSubmit = async () => {
  // Immediately show success
  setOptimisticPets([...pets, newPet]);
  const result = await createPet(formData);
  if (!result.success) {
    // Rollback on failure
    setOptimisticPets(pets);
  }
};
```

---

## 3. Routing Architecture

### 3.1 Route Structure

```
app/
├── page.tsx                          # Landing page
├── layout.tsx                        # Root layout
├── not-found.tsx                     # Global 404
├── error.tsx                         # Global error
│
├── [clinic]/                         # Multi-tenant routes
│   ├── layout.tsx                    # Clinic theme, nav, footer
│   ├── page.tsx                      # Clinic homepage
│   ├── not-found.tsx                 # Clinic 404
│   ├── error.tsx                     # Clinic error
│   │
│   ├── services/                     # Public
│   │   ├── page.tsx
│   │   └── [serviceId]/
│   │       └── page.tsx
│   │
│   ├── about/                        # Public
│   │   └── page.tsx
│   │
│   ├── book/                         # Public (with auth prompt)
│   │   └── page.tsx
│   │
│   ├── store/                        # Public
│   │   ├── page.tsx
│   │   └── client.tsx               # Client component wrapper
│   │
│   ├── portal/                       # Owner authenticated
│   │   ├── layout.tsx               # Portal layout with sidebar
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── pets/
│   │   │   ├── page.tsx
│   │   │   ├── new/
│   │   │   │   └── page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── edit/
│   │   │           └── page.tsx
│   │   └── appointments/
│   │       └── page.tsx
│   │
│   ├── dashboard/                    # Staff authenticated (duplicate?)
│   │   └── page.tsx
│   │
│   └── tools/                        # Utilities
│       ├── age-calculator/
│       └── toxic-checker/
│
├── auth/                             # Auth routes
│   ├── login/
│   ├── signup/
│   └── callback/
│
├── api/                              # API routes
│   └── ... (57 endpoints)
│
├── actions/                          # Server actions
│   └── ... (19 actions)
│
└── global/                           # Shared pages
    └── stats/
```

### 3.2 Routing Strengths

#### ✅ Dynamic Multi-Tenant Routing

```typescript
// All routes under /[clinic]/ automatically scoped
// /adris/services → Adris services
// /petlife/services → PetLife services

export async function generateStaticParams() {
  const clinics = await getAllClinics();
  return clinics.map((clinic) => ({ clinic }));
}
```

#### ✅ Nested Layouts

```typescript
// Root layout → Clinic layout → Portal layout
// Each adds its own context and UI
app/layout.tsx          // Base HTML, fonts
app/[clinic]/layout.tsx // Theme, nav, footer
app/[clinic]/portal/layout.tsx // Sidebar, auth check
```

#### ✅ Parallel Routes Ready

The structure supports parallel routes for dashboards if needed.

### 3.3 Routing Weaknesses

#### ❌ Duplicate Dashboard Routes

```
app/[clinic]/dashboard/    # Staff dashboard
app/[clinic]/portal/dashboard/  # Owner dashboard (same purpose?)
```

**Issue:** Confusing navigation, duplicate code.

**Recommendation:** Consolidate:
- `/portal/` = Owner area (all pet owner features)
- `/admin/` = Staff area (all clinic management)

#### ⚠️ No Route Groups for Organization

```typescript
// Current: Flat structure
app/[clinic]/services/
app/[clinic]/about/
app/[clinic]/book/
app/[clinic]/store/
app/[clinic]/portal/
app/[clinic]/dashboard/

// Better: Route groups
app/[clinic]/(public)/services/      # Public pages
app/[clinic]/(public)/about/
app/[clinic]/(owner)/portal/         # Owner authenticated
app/[clinic]/(staff)/admin/          # Staff authenticated
```

#### ⚠️ Missing Loading States

```typescript
// Many routes missing loading.tsx
app/[clinic]/portal/pets/loading.tsx  // ❌ Missing
app/[clinic]/store/loading.tsx        // ❌ Missing
```

**Recommendation:** Add loading.tsx with skeletons:
```typescript
// app/[clinic]/portal/pets/loading.tsx
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <Skeleton key={i} className="h-48 rounded-xl" />
      ))}
    </div>
  );
}
```

---

## 4. Styling Architecture

### 4.1 Styling Approach

```
┌──────────────────────────────────────────────────────────────────┐
│                    STYLING SYSTEM                                 │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  TAILWIND CSS v3.4.19                                            │
│  ├── Utility-first approach                                      │
│  ├── Custom CSS variables for theming                            │
│  └── @layer directives for organization                          │
│                                                                   │
│  THEME VARIABLES (from JSON-CMS)                                 │
│  ├── --primary, --primary-light, --primary-dark                  │
│  ├── --bg-default, --bg-paper, --bg-subtle                       │
│  ├── --text-primary, --text-secondary, --text-muted              │
│  └── --shadow-sm, --shadow-md, --shadow-lg                       │
│                                                                   │
│  USAGE PATTERN                                                    │
│  className="bg-[var(--bg-paper)] text-[var(--text-primary)]"     │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 4.2 Styling Strengths

#### ✅ Consistent Theme System

```typescript
// Theme injected via CSS variables
<div style={{
  '--primary': theme.colors.primary.main,
  '--primary-light': theme.colors.primary.light,
  // ...
}}>
  {children}
</div>

// Components use variables
<button className="bg-[var(--primary)] hover:bg-[var(--primary-dark)]">
  Submit
</button>
```

#### ✅ Tailwind Integration

```typescript
// Utility classes with theme variables work well
<div className="rounded-lg shadow-md p-4 bg-[var(--bg-paper)]">
  <h2 className="text-xl font-semibold text-[var(--text-primary)]">
    Title
  </h2>
</div>
```

#### ✅ Responsive Design

```typescript
// Mobile-first approach throughout
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Cards */}
</div>
```

### 4.3 Styling Weaknesses

#### ❌ Hardcoded Colors Found

```typescript
// Violations of theme system found:

// app/global/stats/page.tsx
className="bg-blue-600"  // ❌ Should be var(--primary)
className="text-gray-500"  // ❌ Should be var(--text-secondary)

// Some component files
className="border-gray-200"  // ❌ Should be var(--border)
className="bg-green-500"  // ❌ Should be var(--status-success)
```

**Recommendation:** Audit and replace all hardcoded colors:
```bash
# Find violations
grep -r "bg-blue\|bg-gray\|bg-green\|text-gray" --include="*.tsx"
```

#### ⚠️ Inconsistent Spacing

```typescript
// Found variations:
className="p-4"
className="p-6"
className="px-4 py-6"
className="p-[20px]"  // Arbitrary value
```

**Recommendation:** Define spacing scale in theme:
```css
:root {
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;
}
```

#### ⚠️ Long Class Strings

```typescript
// Some elements have very long class lists
<button className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)]">
  Submit
</button>
```

**Recommendation:** Use `cn()` utility and extract variants:
```typescript
const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2',
  {
    variants: {
      variant: {
        primary: 'bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)]',
        secondary: 'bg-[var(--bg-subtle)] text-[var(--text-primary)]',
      },
      size: {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2',
        lg: 'px-6 py-3 text-lg',
      },
    },
  }
);

<button className={cn(buttonVariants({ variant: 'primary', size: 'md' }))}>
  Submit
</button>
```

#### ❌ No Dark Mode Support

```typescript
// Theme system exists but no dark mode toggle
// Would need:
// 1. Dark theme in JSON-CMS
// 2. Theme switcher component
// 3. System preference detection
```

---

## 5. Accessibility Assessment

### 5.1 Current State: 5/10

```
┌──────────────────────────────────────────────────────────────────┐
│                    ACCESSIBILITY AUDIT                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ✅ GOOD                                                          │
│  ├── Semantic HTML (mostly)                                       │
│  ├── Form labels present                                         │
│  ├── Alt text on most images                                     │
│  └── Focus styles (some)                                         │
│                                                                   │
│  ⚠️ NEEDS IMPROVEMENT                                             │
│  ├── Skip link missing                                           │
│  ├── Focus management on route change                            │
│  ├── ARIA landmarks incomplete                                   │
│  └── Keyboard navigation gaps                                    │
│                                                                   │
│  ❌ CRITICAL ISSUES                                                │
│  ├── Icon-only buttons without labels                            │
│  ├── Color contrast in some areas                                │
│  ├── Form error announcements                                    │
│  └── Modal focus trap                                            │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 5.2 Accessibility Issues

#### ❌ Icon-Only Buttons Without Labels

```typescript
// Found throughout:
<button onClick={handleLogout}>
  <LogOut className="w-5 h-5" />
</button>

// Should be:
<button onClick={handleLogout} aria-label="Cerrar sesión">
  <LogOut className="w-5 h-5" aria-hidden="true" />
</button>
```

#### ❌ Missing Skip Link

```typescript
// Not found in layout
// Should add:
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:p-4 focus:rounded"
>
  Saltar al contenido principal
</a>
```

#### ❌ Form Error Announcements

```typescript
// Current: Errors shown visually only
{error && <span className="text-red-500">{error}</span>}

// Should be:
{error && (
  <span role="alert" className="text-[var(--status-error)]">
    {error}
  </span>
)}
```

#### ⚠️ Incomplete ARIA Landmarks

```typescript
// Missing:
<nav aria-label="Navegación principal">
<main id="main-content">
<footer role="contentinfo">
<aside aria-label="Filtros">
```

### 5.3 Accessibility Fixes Needed

| Issue | Priority | Fix |
|-------|----------|-----|
| Icon buttons without labels | HIGH | Add `aria-label` |
| Skip link | HIGH | Add to layout |
| Form error announcements | HIGH | Add `role="alert"` |
| Focus indicators | MEDIUM | Add `:focus-visible` styles |
| Modal focus trap | MEDIUM | Use Radix/HeadlessUI |
| Color contrast | MEDIUM | Audit with aXe |
| Keyboard navigation | LOW | Test all flows |

---

## 6. Performance Analysis

### 6.1 Performance Concerns

```
┌──────────────────────────────────────────────────────────────────┐
│                    PERFORMANCE ISSUES                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  BUNDLE SIZE                                                      │
│  ├── ❌ Lucide icons: Full imports found                         │
│  │   import { Dog, Cat, Bird } from 'lucide-react'  // OK        │
│  │   import * as Icons from 'lucide-react'  // BAD (full bundle) │
│  │                                                                │
│  ├── ⚠️ recharts: Heavy (~500KB)                                 │
│  │   Consider: chart.js or lightweight alternative               │
│  │                                                                │
│  └── ⚠️ @react-pdf/renderer: Loaded on all pages                │
│       Should be dynamic import                                    │
│                                                                   │
│  IMAGES                                                           │
│  ├── ❌ Using <img> instead of next/image                        │
│  ├── ❌ No lazy loading                                          │
│  └── ❌ No responsive srcset                                     │
│                                                                   │
│  DATA FETCHING                                                    │
│  ├── ⚠️ No request deduplication                                 │
│  ├── ⚠️ No pagination on large lists                            │
│  └── ⚠️ JSON-CMS reads filesystem every request                 │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 6.2 Performance Fixes

#### Fix Lucide Imports

```typescript
// Before: Imports entire library
import * as Icons from 'lucide-react';
<Icons.Dog />

// After: Named imports only
import { Dog, Cat, Syringe, Calendar } from 'lucide-react';
<Dog />
```

#### Use Next.js Image

```typescript
// Before
<img src={pet.photo_url} alt={pet.name} className="w-full h-48 object-cover" />

// After
import Image from 'next/image';

<Image
  src={pet.photo_url}
  alt={pet.name}
  width={400}
  height={300}
  className="w-full h-48 object-cover"
  placeholder="blur"
  blurDataURL="/placeholder.jpg"
/>
```

#### Dynamic Import for Heavy Components

```typescript
// Before: Loaded on every page
import { PDFDownloadLink } from '@react-pdf/renderer';

// After: Dynamic import
import dynamic from 'next/dynamic';

const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then(mod => mod.PDFDownloadLink),
  { ssr: false, loading: () => <Skeleton className="w-32 h-10" /> }
);
```

#### Add Pagination

```typescript
// Before: Load all products
const products = await supabase.from('products').select('*');

// After: Paginated
const PAGE_SIZE = 20;
const products = await supabase
  .from('products')
  .select('*')
  .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
```

---

## 7. Component-Specific Issues

### 7.1 Main Navigation (`main-nav.tsx`)

**Strengths:**
- Mobile drawer implementation
- Responsive breakpoints
- Theme variable usage

**Issues:**
- Missing ARIA attributes
- No keyboard navigation for drawer
- WhatsApp CTA not in mobile drawer

**Fixes:**
```typescript
<nav aria-label="Navegación principal">
  <button
    aria-expanded={isOpen}
    aria-controls="mobile-menu"
    aria-label="Abrir menú"
    onClick={() => setIsOpen(true)}
  >
    <Menu />
  </button>
  <div id="mobile-menu" role="dialog" aria-modal="true">
    {/* Drawer content */}
  </div>
</nav>
```

### 7.2 Booking Wizard (`booking-wizard.tsx`)

**Strengths:**
- Step-by-step flow
- Form validation present

**Issues:**
- 450+ lines (too large)
- Hardcoded services in some places
- No step indicator accessibility

**Fixes:**
```typescript
// Split into step components
// Add role="tablist" for steps
// Make steps navigable
<ol role="tablist" aria-label="Pasos de la reserva">
  <li role="tab" aria-selected={step === 1} aria-controls="step-1-panel">
    Servicio
  </li>
  {/* ... */}
</ol>
```

### 7.3 Service Card (`service-card.tsx`)

**Current Issues Found:**
- Image doesn't use next/image
- No loading state
- Click target too small on mobile

**Fixes:**
```typescript
// Use next/image
// Add min-h for consistent cards
// Increase tap target size
<Link
  href={`/${clinic}/services/${service.id}`}
  className="block min-h-[200px] p-4"
>
  <Image
    src={service.image || '/placeholder.jpg'}
    alt={service.name}
    width={300}
    height={200}
  />
</Link>
```

### 7.4 Pet Card (`pet-card.tsx`)

**Issues:**
- QR code generation client-side
- No skeleton loading
- Actions not accessible via keyboard

**Recommendation:**
- Move QR generation to server
- Add loading states
- Ensure all actions have keyboard handlers

---

## 8. Recommendations Summary

### 8.1 Critical (Do Immediately)

1. **Add ARIA labels to all icon-only buttons**
2. **Add skip link to main layout**
3. **Add `role="alert"` to form errors**
4. **Fix hardcoded colors**

### 8.2 High Priority (This Sprint)

1. **Split oversized components**
2. **Add loading.tsx to all routes**
3. **Replace `<img>` with `next/image`**
4. **Fix Lucide import pattern**

### 8.3 Medium Priority (Next Sprint)

1. **Consolidate duplicate routes**
2. **Implement route groups**
3. **Add focus indicators globally**
4. **Implement optimistic updates**

### 8.4 Low Priority (Backlog)

1. **Add dark mode support**
2. **Create component Storybook**
3. **Add animation library**
4. **Implement infinite scroll**

---

## 9. Component Checklist

Use this checklist for new components:

```typescript
/**
 * Component Checklist:
 * [ ] TypeScript interface defined
 * [ ] Props have JSDoc comments
 * [ ] Uses forwardRef if needed
 * [ ] Theme variables for colors
 * [ ] Accessible (ARIA, keyboard)
 * [ ] Loading state handled
 * [ ] Error state handled
 * [ ] Mobile responsive
 * [ ] displayName set
 * [ ] Unit tests written
 */

interface MyComponentProps {
  /** The title to display */
  title: string;
  /** Optional click handler */
  onClick?: () => void;
}

export const MyComponent = React.forwardRef<HTMLDivElement, MyComponentProps>(
  ({ title, onClick }, ref) => {
    return (
      <div
        ref={ref}
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
        className="p-4 bg-[var(--bg-paper)] text-[var(--text-primary)]"
      >
        {title}
      </div>
    );
  }
);
MyComponent.displayName = 'MyComponent';
```

---

*Document Version: 1.0*
*Last Updated: December 2024*
