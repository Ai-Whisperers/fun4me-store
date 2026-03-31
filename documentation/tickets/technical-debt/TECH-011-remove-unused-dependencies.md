# TECH-011: Remove Unused Dependencies

**Category**: Technical Debt  
**Priority**: P2 - Medium  
**Status**: Open  
**Effort**: 2-3 hours  
**Impact**: Medium - Bundle size reduction  
**Created**: 2025-01-19  
**Source**: critique/10-dependencies-roast.md (DEP-008)

## Summary

Several packages are installed but not actively used, increasing bundle size and attack surface.

## Problem

**Confirmed unused:**
- `@tanstack/react-query`: Installed but not used (using Zustand + raw fetch instead)

**Potentially unused (needs verification):**
- `@react-pdf/renderer`: Check if PDF generation is used
- `framer-motion`: Check if animations are actually used
- `lucide-react`: Verify icon usage (500KB package)

## Solution

### Step 1: Find Unused Dependencies
```bash
cd web
npx depcheck
```

### Step 2: Verify Usage
For each potentially unused package:
```bash
# Check import usage
grep -r "@tanstack/react-query" --include="*.ts" --include="*.tsx" | wc -l

# Check if imports actually do anything
grep -r "useQuery\|useMutation" --include="*.ts" --include="*.tsx"
```

### Step 3: Remove Confirmed Unused
```bash
npm uninstall @tanstack/react-query
# (or whichever packages are confirmed unused)
```

### Step 4: Test After Removal
```bash
npm run build
npm run test:unit
npm run test:e2e
```

## Acceptance Criteria
- [ ] `npx depcheck` shows minimal unused dependencies
- [ ] All confirmed unused packages removed
- [ ] Build succeeds after removal
- [ ] All tests pass
- [ ] Bundle size reduced (check with `npm run analyze`)

## Investigation Needed

**@tanstack/react-query:**
- If not using it, remove
- If planning to use it, implement it properly (see REF-003)

**framer-motion:**
- If only using for simple animations, consider CSS animations
- If heavily used, keep it

**lucide-react:**
- If only using a few icons, consider tree-shaking or switching to individual SVGs
- Bundle size impact: ~500KB

## Related
- TECH-012: Add bundle size analysis
- REF-003: Implement React Query for server state (if keeping package)
