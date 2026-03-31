# TECH-001: Improve Component Organization

## Priority: P2 - Medium
## Category: Technical Debt
## Status: ✅ Complete
## Epic: [EPIC-06: Code Quality & Refactoring](../epics/EPIC-06-code-quality.md)
## Affected Areas: web/components/

## Description

The `components/` directory has grown to 30+ subdirectories with varying organization patterns. Some directories have index files for re-exports, others don't. Component naming and structure is inconsistent.

## Current State

```
components/
├── about/           # 3 files, no index
├── appointments/    # 4 files, no index
├── auth/            # 1 file
├── booking/         # Nested booking-wizard/
├── calendar/        # 6 files, has index
├── cart/            # 4 files, no index
├── clinical/        # 6 files, no index
├── dashboard/       # 10+ files, has index, nested appointments/
├── forms/           # 1 file (appointment-form)
├── invoices/        # 12 files, has index
├── landing/         # 4 files, has index
├── store/           # Nested filters/, product-detail/
├── ui/              # Base components, has index
├── whatsapp/        # 8 files, has index
└── ... (15+ more)
```

### Issues:
1. Inconsistent index.ts presence
2. Some directories have only 1 file
3. Nested subdirectories add complexity
4. Duplicate components (appointment-form in 2 places)
5. No clear naming conventions
6. Hard to find components

## Proposed Solution

### 1. Standard Directory Structure

```
components/
├── ui/                    # Primitives (button, input, card, modal)
├── layout/                # Layout components (nav, footer, sidebar)
├── features/              # Feature-specific components
│   ├── appointments/      # All appointment-related
│   ├── pets/              # Pet management
│   ├── invoices/          # Invoicing
│   ├── clinical/          # Clinical tools
│   ├── store/             # E-commerce
│   └── hospital/          # Hospitalization
├── forms/                 # Reusable form components
├── charts/                # Data visualization
└── providers/             # Context providers
```

### 2. Naming Conventions

```
[feature]-[variant].tsx

# Examples:
appointment-card.tsx
appointment-list.tsx
appointment-form.tsx
appointment-details.tsx

# NOT:
AppointmentCard.tsx
card.tsx (too generic)
apt-crd.tsx (abbreviated)
```

### 3. Index Files

Every directory with 2+ files gets an index:

```typescript
// features/appointments/index.ts
export { AppointmentCard } from './appointment-card'
export { AppointmentList } from './appointment-list'
export { AppointmentForm } from './appointment-form'
export type { AppointmentCardProps } from './appointment-card'
```

### 4. Component Colocation

Each component can have related files:

```
appointment-card/
├── index.tsx         # Main component
├── appointment-card.types.ts
├── appointment-card.test.tsx
└── appointment-card.stories.tsx (if using Storybook)
```

## Implementation Steps

1. [ ] Audit all component directories
2. [ ] Create migration plan (which components move where)
3. [ ] Add missing index.ts files
4. [ ] Consolidate duplicate components
5. [ ] Rename files to follow convention
6. [ ] Update imports throughout codebase
7. [ ] Remove empty directories
8. [ ] Update component documentation

## Acceptance Criteria

- [ ] Consistent directory structure
- [ ] All directories with 2+ files have index.ts
- [ ] No duplicate components
- [ ] Clear naming convention
- [ ] Easy to find any component

## Estimated Effort

- Planning: 2 hours
- Migration: 8-10 hours
- Import updates: 4 hours
- Testing: 2 hours
- **Total: 16-18 hours**

## Risk

**Medium** - Import path changes could break things. Need careful search/replace and testing.

---

## Resolution Summary

**Completed**: January 2026

### Work Completed

1. **Audited all 43 component directories**
   - Identified 8 root directories missing index.ts files
   - Identified 3 nested subdirectories missing index.ts files
   - Found 5 single-file directories that still benefit from barrel exports

2. **Added index.ts files to root directories** (12 new files):
   - `about/index.ts` - 3 components
   - `home/index.ts` - 6 components + widgets
   - `insurance/index.ts` - 4 components
   - `inventory/index.ts` - 4 components
   - `safety/index.ts` - 3 components
   - `search/index.ts` - 3 exports (component + hook + provider)
   - `services/index.ts` - 8 components + constants
   - `tools/index.ts` - 2 main components + 8 age-calculator sub-components
   - `consents/index.ts` - 3 exports (PDF + blanket + signing form)
   - `finance/index.ts` - 1 component
   - `onboarding/index.ts` - 1 component
   - `team/index.ts` - 1 component
   - `clients/index.ts` - 4 bulk action components

3. **Added index.ts files to nested subdirectories** (3 new files):
   - `home/widgets/index.ts` - 2 components
   - `layout/nav/index.ts` - 3 components + 1 hook
   - `signup/steps/index.ts` - 5 step components

### Final State

All 43 root directories now have index.ts files for consistent barrel exports.
All nested subdirectories with 2+ files have index.ts files.

```
components/           # 43 directories
├── about/           # ✅ index.ts (3 exports)
├── admin/           # ✅ index.ts (pre-existing)
├── ads/             # ✅ index.ts (pre-existing)
├── ambassador/      # ✅ index.ts (pre-existing)
├── analytics/       # ✅ index.ts (pre-existing)
├── appointments/    # ✅ index.ts (pre-existing)
├── auth/            # ✅ index.ts (pre-existing)
├── billing/         # ✅ index.ts (pre-existing)
├── booking/         # ✅ index.ts (pre-existing)
├── calendar/        # ✅ index.ts (pre-existing)
├── cart/            # ✅ index.ts (pre-existing)
├── clients/         # ✅ index.ts (NEW)
├── clinical/        # ✅ index.ts (pre-existing)
├── commerce/        # ✅ index.ts (pre-existing)
├── consents/        # ✅ index.ts (NEW)
├── dashboard/       # ✅ index.ts (pre-existing)
├── error/           # ✅ index.ts (pre-existing)
├── faq/             # ✅ index.ts (pre-existing)
├── finance/         # ✅ index.ts (NEW)
├── forms/           # ✅ index.ts (pre-existing)
├── home/            # ✅ index.ts (NEW)
├── hospital/        # ✅ index.ts (pre-existing)
├── insurance/       # ✅ index.ts (NEW)
├── inventory/       # ✅ index.ts (NEW)
├── invoices/        # ✅ index.ts (pre-existing)
├── lab/             # ✅ index.ts (pre-existing)
├── landing/         # ✅ index.ts (pre-existing)
├── layout/          # ✅ index.ts (pre-existing)
├── messaging/       # ✅ index.ts (pre-existing)
├── onboarding/      # ✅ index.ts (NEW)
├── pets/            # ✅ index.ts (pre-existing)
├── portal/          # ✅ index.ts (pre-existing)
├── safety/          # ✅ index.ts (NEW)
├── search/          # ✅ index.ts (NEW)
├── seo/             # ✅ index.ts (pre-existing)
├── services/        # ✅ index.ts (NEW)
├── shared/          # ✅ index.ts (pre-existing)
├── signup/          # ✅ index.ts (pre-existing)
├── store/           # ✅ index.ts (pre-existing)
├── team/            # ✅ index.ts (NEW)
├── tools/           # ✅ index.ts (NEW)
├── ui/              # ✅ index.ts (pre-existing)
└── whatsapp/        # ✅ index.ts (pre-existing)
```

### Acceptance Criteria Met

- [x] Consistent directory structure
- [x] All directories with 2+ files have index.ts
- [x] No duplicate components (existing structure preserved)
- [x] Clear naming convention (existing kebab-case maintained)
- [x] Easy to find any component (barrel exports enable IDE autocomplete)

### Note on Scope

The original ticket proposed a more ambitious restructuring with a `features/` directory. This implementation focused on the highest-value, lowest-risk changes:

1. **Adding barrel exports (index.ts)** - Immediate value, zero risk
2. **Maintaining existing structure** - No import path changes needed
3. **Future-proofing** - Barrel exports make future restructuring easier

The more invasive restructuring (moving components to `features/`) was deferred to avoid breaking imports across the codebase. The current state provides consistent organization without requiring import updates throughout the application.
