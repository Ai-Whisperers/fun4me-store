# EPIC-005: Component Architecture Refactoring

**Status**: Not Started  
**Priority**: MEDIUM  
**Estimated Effort**: 2 weeks  
**Risk Level**: LOW  
**Dependencies**: None

## Overview

Break monolithic components, eliminate duplicates, fix theme system violations, and implement consistent state management patterns.

## Current State

- 1 component with 923 lines (should be <200)
- 2 duplicate appointment forms (80% shared logic)
- 45+ instances of hardcoded colors
- Mixed state management (useState vs Zustand vs react-hook-form)
- Missing error boundaries

## Target State

- All components <300 lines
- Unified appointment form
- 100% theme variable usage
- Consistent state management
- Error boundaries on all features

## Tickets

### TICKET-COMP-001: Split Vaccine Reactions Monolith

**Priority**: HIGH  
**Effort**: 2 days

Current: `web/app/[clinic]/vaccine_reactions/client.tsx` (923 lines)

Split into:
```
vaccine_reactions/
├── components/
│   ├── ReactionFilters.tsx
│   ├── ReactionStats.tsx
│   ├── ReactionTable.tsx
│   ├── AddReactionModal.tsx
│   ├── EditReactionModal.tsx
│   └── ReactionSearch.tsx
└── page.tsx (orchestrates)
```

---

### TICKET-COMP-002: Unify Appointment Forms

**Priority**: HIGH  
**Effort**: 1 day

Consolidate:
- `components/dashboard/appointment-form.tsx`
- `components/forms/appointment-form.tsx`

Create shared hook:
```typescript
// lib/hooks/use-appointment-form.ts
export function useAppointmentForm(config: FormConfig) {
  return useFormState({
    schema: appointmentSchema,
    onSubmit: config.onSubmit,
    // ... shared logic
  })
}
```

---

### TICKET-COMP-003: Replace Hardcoded Colors

**Priority**: MEDIUM  
**Effort**: 2 days

Global search and replace:
- `bg-red-500` → `bg-[var(--status-error)]`
- `text-blue-600` → `text-[var(--primary)]`
- `border-gray-200` → `border-[var(--border-color)]`

Script:
```bash
# web/scripts/fix-hardcoded-colors.sh
sed -i 's/bg-red-500/bg-[var(--status-error)]/g' **/*.tsx
sed -i 's/text-blue-600/text-[var(--primary)]/g' **/*.tsx
# ... more patterns
```

---

### TICKET-COMP-004: Add Error Boundaries

**Priority**: MEDIUM  
**Effort**: 1 day

Add `<ErrorBoundary>` to:
- Dashboard modules
- Portal features
- Booking flow
- Store pages

---

### TICKET-COMP-005: Implement Shared Form Hook

**Priority**: LOW  
**Effort**: 2 days

Replace massive `useState` blocks with `react-hook-form`:

```typescript
// Before
const [field1, setField1] = useState()
const [field2, setField2] = useState()
// ... 10 more

// After
const { register, handleSubmit } = useForm({
  schema: mySchema
})
```

---

## Success Metrics

- [ ] Average component size <150 lines
- [ ] Zero duplicate forms
- [ ] Zero hardcoded colors
- [ ] Error boundaries on all major features

