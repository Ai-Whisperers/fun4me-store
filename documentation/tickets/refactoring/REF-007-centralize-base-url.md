# REF-007: Centralize BASE_URL Configuration

## Priority: P3 - Low
## Category: Refactoring
## Status: Not Started
## Epic: [EPIC-08: Code Quality & Refactoring](../epics/EPIC-08-code-quality.md)
## Affected Areas: web/app/, web/components/, web/lib/

## Description

15 files across the codebase hardcode `'https://Vetic.vercel.app'` as the BASE_URL instead of using the centralized `env.APP_URL` configuration. This makes environment-specific deployments difficult and violates DRY principles.

## Current State

### Hardcoded BASE_URL Files (15 files)

| File | Usage |
|------|-------|
| `web/app/sitemap.ts` | Sitemap generation |
| `web/app/layout.tsx` | Metadata base URL |
| `web/app/[clinic]/layout.tsx` | Clinic-specific metadata |
| `web/app/[clinic]/book/page.tsx` | Booking page metadata |
| `web/app/[clinic]/about/page.tsx` | About page metadata |
| `web/app/[clinic]/services/page.tsx` | Services page metadata |
| `web/app/[clinic]/services/[serviceId]/page.tsx` | Service detail metadata |
| `web/app/[clinic]/store/product/[id]/page.tsx` | Product page metadata |
| `web/app/[clinic]/terms/page.tsx` | Terms page metadata |
| `web/app/[clinic]/privacy/page.tsx` | Privacy page metadata |
| `web/app/[clinic]/tools/toxic-food/page.tsx` | Tool page metadata |
| `web/app/[clinic]/tools/age-calculator/page.tsx` | Tool page metadata |
| `web/components/seo/structured-data.tsx` | JSON-LD structured data |
| `web/lib/metadata.ts` | Metadata utilities |
| `web/lib/middleware/cors.ts` | CORS origin configuration |

### Current Pattern

```typescript
// Hardcoded in multiple files
const BASE_URL = 'https://Vetic.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  // ...
}
```

### Existing Solution (Not Used)

The `env.APP_URL` already exists in `lib/env.ts`:

```typescript
// lib/env.ts line 167
APP_URL: optionalEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
```

## Proposed Solution

### 1. Create a Centralized Metadata Config

```typescript
// lib/config/metadata.ts
import { env } from '@/lib/env'

export const SITE_CONFIG = {
  url: env.APP_URL,
  name: 'Vetic',
  defaultTitle: 'Vetic - Plataforma Veterinaria',
  description: 'Sistema de gestión veterinaria multi-tenant',
} as const

export function getSiteUrl(path = ''): string {
  return `${SITE_CONFIG.url}${path}`
}

export function getCanonicalUrl(clinic: string, path = ''): string {
  return `${SITE_CONFIG.url}/${clinic}${path}`
}
```

### 2. Update All Files

```typescript
// Before
const BASE_URL = 'https://Vetic.vercel.app'

// After
import { SITE_CONFIG } from '@/lib/config/metadata'
// or
import { env } from '@/lib/env'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_CONFIG.url),
  // ...
}
```

### 3. Environment Variables

Ensure `.env.local` and production environments have:

```env
# Development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Production
NEXT_PUBLIC_APP_URL=https://vetic.app
```

## Implementation Steps

1. [ ] Create `lib/config/metadata.ts` with centralized URL config
2. [ ] Update `web/app/sitemap.ts` to use centralized config
3. [ ] Update `web/app/layout.tsx`
4. [ ] Update `web/app/[clinic]/layout.tsx`
5. [ ] Update all page metadata files (10 files)
6. [ ] Update `web/components/seo/structured-data.tsx`
7. [ ] Update `web/lib/metadata.ts`
8. [ ] Update `web/lib/middleware/cors.ts`
9. [ ] Verify all environments work correctly
10. [ ] Add lint rule to prevent hardcoded URLs (optional)

## Acceptance Criteria

- [ ] No hardcoded BASE_URL strings in codebase
- [ ] All metadata uses `env.APP_URL` or centralized config
- [ ] CORS works correctly in all environments
- [ ] Sitemap generates correct URLs per environment
- [ ] Structured data has correct URLs
- [ ] All tests pass

## Benefits

- **Environment flexibility**: Easy to switch between localhost, staging, production
- **Single source of truth**: Change URL in one place
- **Reduced maintenance**: No hunt-and-replace when domain changes
- **Better testability**: Can mock URL for tests

## Related Files

- `web/lib/env.ts` (already has `APP_URL`)
- `web/lib/config/` (needs new `metadata.ts`)
- All 15 files listed above

## Estimated Effort

| Task | Time |
|------|------|
| Create config file | 15 min |
| Update 15 files | 1 hour |
| Testing | 30 min |
| **Total** | **~2 hours** |

## Risk Assessment

**Low Risk** - Simple string replacement with existing solution.

### Notes

- The production URL might change from `vetic.vercel.app` to a custom domain
- Having this centralized makes the migration trivial

---
*Created: January 2026*
*Source: Ralph refactoring analysis*
