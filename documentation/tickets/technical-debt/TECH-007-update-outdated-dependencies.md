# TECH-007: Update Outdated Dependencies

**Category**: Technical Debt  
**Priority**: P2 - Medium  
**Status**: Open  
**Effort**: 2-3 hours  
**Impact**: Medium - Security patches, performance improvements  
**Created**: 2025-01-19  
**Source**: critique/10-dependencies-roast.md (DEP-002)

## Summary

16 packages are behind their latest versions, including potential security patches and performance improvements.

## Problem

```bash
npm outdated
```

Major outdated packages:
- @supabase/supabase-js: 2.88.0 → 2.90.0
- @tanstack/react-query: 5.66.0 → 5.70.0
- date-fns: 4.1.0 → 4.2.0
- recharts: 2.15.1 → 2.16.0
- zustand: 5.0.4 → 5.1.0

Packages with breaking changes (evaluate separately):
- next: 15.3.x → 16.0.x (major version)
- framer-motion: 11.18.2 → 12.0.0 (major version)

## Solution

### Phase 1: Minor/Patch Updates (Safe)
```bash
npm update  # Updates within semver range
npm audit fix  # Apply security fixes
```

### Phase 2: Test After Updates
```bash
npm run lint
npm run type-check
npm run test:unit
npm run test:e2e
npm run build
```

### Phase 3: Major Version Evaluation
- Review changelogs for Next.js 16 and framer-motion 12
- Test in development environment
- Plan migration if beneficial

## Acceptance Criteria
- [ ] All minor/patch versions updated
- [ ] npm audit shows 0 vulnerabilities
- [ ] All tests pass after updates
- [ ] Build succeeds
- [ ] No runtime errors in development

## Related
- TECH-008: Remove unused dependencies
- SEC-026: Fix xlsx vulnerability
