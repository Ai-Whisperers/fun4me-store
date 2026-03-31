# PERF-001: Re-enable Static Generation for Public Pages

## Priority: P3 - Deprioritized (Keep Dynamic)
## Category: Performance
## Affected Areas: Public pages, build process

**Decision**: Keep pages dynamic for now. The complexity of restructuring providers outweighs the benefits at current scale.

## Description

`generateStaticParams` was removed from `[clinic]/layout.tsx` due to client component serialization issues. This means all pages render dynamically on-demand instead of being pre-generated at build time.

## Current State

```typescript
// [clinic]/layout.tsx
// generateStaticParams REMOVED - causes issues with client components

// Some pages still have it:
// [clinic]/dashboard/page.tsx
export function generateStaticParams() {
  return [{ clinic: 'adris' }, { clinic: 'petlife' }]
}
```

### Impact:
1. Every page request hits the server
2. Higher latency for users
3. More server load
4. Worse SEO (slower page loads)

### Why it was removed:
- Client components in layout couldn't be serialized during build
- `ClinicThemeProvider` and other providers caused issues
- Error: "Can't serialize function"

## Proposed Solution

### Option A: Restructure Providers

Move client-only providers to a separate client component wrapper:

```typescript
// [clinic]/layout.tsx (Server Component)
export function generateStaticParams() {
  return [{ clinic: 'adris' }, { clinic: 'petlife' }]
}

export default async function ClinicLayout({ children, params }) {
  const { clinic } = await params
  const clinicData = await getClinicData(clinic)

  // Pass serializable data only
  return (
    <ClientProviders theme={clinicData.theme}>
      {children}
    </ClientProviders>
  )
}

// components/client-providers.tsx (Client Component)
'use client'
export function ClientProviders({ theme, children }) {
  return (
    <ClinicThemeProvider theme={theme}>
      <CartProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </CartProvider>
    </ClinicThemeProvider>
  )
}
```

### Option B: Incremental Static Regeneration (ISR)

Keep dynamic but enable caching:

```typescript
// [clinic]/page.tsx
export const revalidate = 3600 // Revalidate every hour
```

### Option C: Hybrid Approach

- Static for public pages (homepage, services, about)
- Dynamic for authenticated pages (portal, dashboard)

## Implementation Steps

1. [ ] Audit all client components in layouts
2. [ ] Extract to ClientProviders wrapper
3. [ ] Ensure all props are serializable
4. [ ] Re-add `generateStaticParams` to layout
5. [ ] Test build process
6. [ ] Verify pages are static in build output
7. [ ] Measure performance improvement

## Acceptance Criteria

- [ ] Public pages pre-generated at build time
- [ ] Build completes without serialization errors
- [ ] Page load time improved (measure TTFB)
- [ ] No regression in dynamic pages

## Metrics to Track

- Time to First Byte (TTFB)
- Largest Contentful Paint (LCP)
- Build time
- Bundle size

## Related Files

- `web/app/[clinic]/layout.tsx`
- `web/components/clinic-theme-provider.tsx`
- `web/components/cart/cart-drawer.tsx`

## Estimated Effort

- Investigation: 2 hours
- Implementation: 4-6 hours
- Testing: 2 hours
- **Total: 8-10 hours**
