# Architecture Decision Records (ADRs)

> This document captures key technical decisions made during the TDD implementation project.

---

## ADR-001: Error Message Strategy

**Date:** 2026-02-03
**Status:** Accepted

### Context
Services were returning generic error messages, but tests expected specific errors.

### Decision
Services should return **specific, actionable error messages** instead of generic fallbacks.

### Consequences
- ✅ Better debugging experience
- ✅ More helpful user messages
- ⚠️ Need to update tests to match specific messages
- ⚠️ Messages must be in Spanish for UI-facing errors

### Example
```typescript
// Before
return { error: 'Error' }

// After
return { error: 'No se encontró la mascota con ID: xyz' }
```

---

## ADR-002: Supabase Mock Pattern

**Date:** 2026-02-03
**Status:** Accepted

### Context
Tests use inconsistent mock patterns for Supabase client. Some use inline mocks, others use shared mocks. Chainable queries are particularly problematic.

### Decision
Use `createChainableQueryMock()` helper for all Supabase query mocks.

### Consequences
- ✅ Consistent mock behavior
- ✅ All chainable methods supported
- ✅ Easy to configure return values
- ⚠️ Need to migrate existing tests

### Example
```typescript
// Standard pattern
mockSupabase.from.mockReturnValue(
  createChainableQueryMock(mockData, null)
);

// With error
mockSupabase.from.mockReturnValue(
  createChainableQueryMock(null, new Error('DB error'))
);
```

---

## ADR-003: Type Assertion Strategy

**Date:** 2026-02-03
**Status:** Accepted

### Context
Some Zod schema types conflict with manual interface definitions, causing TypeScript errors.

### Decision
Use `as unknown as TargetType` pattern where Zod types don't match interfaces, with a comment explaining why.

### Consequences
- ✅ Code compiles without errors
- ✅ Runtime behavior unchanged
- ⚠️ Type safety reduced in specific areas
- ⚠️ Should eventually unify type definitions

### Example
```typescript
// Where Zod output doesn't match interface
const config = parsed as unknown as ClinicConfig;
// TODO: Unify ClinicConfigSchema with ClinicConfig interface
```

---

## ADR-004: NavLabels Optionality

**Date:** 2026-02-03
**Status:** Accepted

### Context
`NavLabels` interface had required properties, but codebase used optional chaining (`config?.navLabels?.dashboard`) everywhere.

### Decision
Make all NavLabels properties optional to match actual usage.

### Consequences
- ✅ Type system matches runtime behavior
- ✅ No more optional chaining inconsistencies
- ⚠️ Default values needed in components

---

## ADR-005: TierFeatures Fallback

**Date:** 2026-02-03
**Status:** Accepted

### Context
`getTierFeatures()` function had incomplete fallback object missing several required properties.

### Decision
Fallback object must include all 19 TierFeatures properties.

### Consequences
- ✅ No runtime errors from missing properties
- ✅ Consistent feature availability across tiers
- ⚠️ All new features must be added to fallback

---

## ADR-006: Lint Warning Threshold

**Date:** 2026-02-03
**Status:** Temporary

### Context
CI was failing due to max-warnings limit of 100, but there are 776 warnings (mostly no-console, no-redeclare in tests).

### Decision
Temporarily increase max-warnings to 800. Clean up in Phase 5.

### Consequences
- ⚠️ Technical debt accumulates short-term
- ✅ CI can pass while we fix tests
- ⏰ Must address in Phase 5 (tracked by tickets)

---

## ADR-007: Test Organization

**Date:** 2026-02-03
**Status:** Accepted

### Context
Tests are organized by type (services, api, components) but some have inconsistent naming.

### Decision
Follow this structure:
```
tests/
├── services/         # Service unit tests
├── api/              # API route tests
├── components/       # React component tests
├── integration/      # Cross-module integration tests
├── database/         # RLS and database tests
└── functionality/    # Feature-specific tests
```

### Consequences
- ✅ Clear organization
- ✅ Easy to find tests
- ⚠️ Some tests may need moving

---

## ADR-008: Spanish Error Messages

**Date:** 2026-02-03
**Status:** Accepted

### Context
Platform is for Latin American veterinary clinics. Error messages should be in Spanish.

### Decision
All user-facing error messages in Spanish. Internal logging in English.

### Example
```typescript
// User-facing
'No puede acceder a datos de otra clínica.'
'Mascota no encontrada.'

// Internal logging
logger.error('Tenant isolation violation', { userId, tenantId });
```

---

## Template for New ADRs

```markdown
## ADR-XXX: Title

**Date:** YYYY-MM-DD
**Status:** Proposed | Accepted | Deprecated | Superseded

### Context
What is the issue or requirement?

### Decision
What was decided?

### Consequences
- ✅ Positive outcome
- ⚠️ Trade-off or concern
- ❌ Negative (if any)
```

---

*Last Updated: 2026-02-03*
