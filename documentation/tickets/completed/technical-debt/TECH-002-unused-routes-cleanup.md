# TECH-002: Clean Up Unused/Legacy Routes

## Priority: P3 - Low
## Category: Technical Debt
## Status: COMPLETED
## Affected Areas: web/app/

## Description

Several routes appear to be unused, legacy, or placeholder implementations that should be removed or documented.

## Current State

### Identified Unused/Legacy Routes:

1. **`/auth/signup`**
   - Returns `null`
   - Actual signup at `[clinic]/portal/signup`
   - Should be removed

2. **`/owner/pets`**
   - Purpose unclear
   - May be legacy route
   - Not linked from anywhere visible

3. **`/global/stats`**
   - Global stats page
   - No clear entry point
   - May be admin-only debug page

4. **`/[clinic]/euthanasia_assessments`**
   - Public route for clinical tool
   - Should be under portal/dashboard?

5. **`/[clinic]/reproductive_cycles`**
   - Public route for clinical tool
   - Should be under portal/dashboard?

6. **`/[clinic]/drug_dosages`**
   - Public route for clinical tool
   - Consider: Is public access intentional?

## Proposed Solution

### 1. Audit Each Route

| Route | Action | Reason |
|-------|--------|--------|
| `/auth/signup` | DELETE | Placeholder, real signup elsewhere |
| `/owner/pets` | DOCUMENT or DELETE | Clarify purpose |
| `/global/stats` | DOCUMENT | Add auth if sensitive |
| `/[clinic]/euthanasia_assessments` | MOVE to portal | Staff-only feature |
| `/[clinic]/reproductive_cycles` | MOVE to portal | Staff-only feature |
| `/[clinic]/drug_dosages` | KEEP | Public tool is intentional |

### 2. Clean Up

```bash
# Remove unused
rm -rf web/app/auth/signup/
rm -rf web/app/owner/  # If truly unused

# Move clinical tools if decided
mv web/app/[clinic]/euthanasia_assessments web/app/[clinic]/portal/clinical/
mv web/app/[clinic]/reproductive_cycles web/app/[clinic]/portal/clinical/
```

### 3. Document Intentional Routes

Add comments or documentation for routes that may seem unused but are intentional:

```typescript
// /global/stats/page.tsx
/**
 * Global platform statistics page.
 * Accessible at /global/stats
 * Used by: Platform administrators for overview metrics
 * Auth: None (public) - consider adding auth if sensitive
 */
```

## Implementation Steps

1. [ ] Review each suspicious route
2. [ ] Check for any links/references in codebase
3. [ ] Check analytics for traffic to routes
4. [ ] Make decision per route (delete/document/move)
5. [ ] Update sitemap if exists
6. [ ] Test remaining routes

## Acceptance Criteria

- [ ] No placeholder routes in production
- [ ] All routes documented or removed
- [ ] Clinical tools in appropriate location
- [ ] No broken links

## Related Files

- `web/app/auth/signup/page.tsx`
- `web/app/owner/pets/page.tsx`
- `web/app/global/stats/page.tsx`
- `web/app/[clinic]/euthanasia_assessments/page.tsx`
- `web/app/[clinic]/reproductive_cycles/page.tsx`

## Estimated Effort

- Audit: 1 hour
- Implementation: 1-2 hours
- Testing: 1 hour
- **Total: 3-4 hours**

---
## Implementation Summary (Completed)

**Routes Audited:**

| Route | Decision | Reason |
|-------|----------|--------|
| `/auth/signup` | Already deleted | Placeholder was already removed |
| `/owner/pets` | **DELETED** | Legacy route, duplicates portal functionality |
| `/global/stats` | Keep | Intentional public analytics for research/epidemiology |
| `/[clinic]/euthanasia_assessments` | Keep | Public clinical tool - intentional |
| `/[clinic]/reproductive_cycles` | Keep | Public clinical tool - intentional |
| `/[clinic]/drug_dosages` | Keep | Public clinical tool - intentional |

**Actions Taken:**
1. Deleted `/owner/pets/page.tsx` and parent directories
2. Kept `/global/stats` - intentional public analytics page
3. Kept clinical tools as public routes - these are intentionally public-facing tools

**Rationale for Clinical Tools:**
The clinical tools (euthanasia assessment, reproductive cycles, drug dosages) are intentionally public because they:
- Serve as educational resources
- Allow pet owners to use tools before booking appointments
- Generate leads for clinics
- Don't expose sensitive data

---
*Completed: January 2026*
