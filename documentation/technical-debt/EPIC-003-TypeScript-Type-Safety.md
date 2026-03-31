# EPIC-003: TypeScript Type Safety

**Status**: Not Started  
**Priority**: MEDIUM  
**Estimated Effort**: 2 weeks  
**Risk Level**: LOW  
**Dependencies**: None

## Overview

Systematically eliminate `any` types and type assertions across the codebase, implementing a proper type system with centralized entities and repository pattern.

## Business Impact

- **Developer Velocity**: Improved autocomplete and type checking
- **Bug Prevention**: Catch type errors at compile time
- **Maintainability**: Easier refactoring with type safety
- **Code Quality**: Better IDE support and documentation

## Current State

- 52 files with `any` usage
- 26 instances of `as unknown as` casts
- 6 `@ts-ignore` comments
- 15+ files with duplicate type definitions

## Target State

- <5 `any` occurrences (only in edge cases with justification)
- Repository pattern for all Supabase queries
- Centralized type definitions in `lib/types/entities/`
- 95% type safety score

## Tickets

### TICKET-TS-001: Centralize Entity Type Definitions

**Priority**: HIGH  
**Effort**: 1 day

Move all inline type definitions to `lib/types/entities/`:
- Create canonical `Pet`, `Appointment`, `Client`, `Service` types
- Remove duplicate definitions across components
- Export from central `index.ts`

**Acceptance Criteria**:
- [ ] All entities in `lib/types/entities/`
- [ ] Components import from centralized types
- [ ] Zero duplicate definitions
- [ ] Documentation updated

---

### TICKET-TS-002: Implement Repository Pattern for Supabase

**Priority**: HIGH  
**Effort**: 3 days

Create typed repository layer to eliminate `as unknown as`:

```typescript
// web/lib/domain/pets/repository.ts
export class PetRepository {
  async findById(id: string): Promise<Pet | null> {
    const { data } = await this.supabase
      .from('pets')
      .select('*')
      .eq('id', id)
      .single()
    
    return data ? this.toPet(data) : null
  }
  
  private toPet(raw: any): Pet {
    return {
      id: raw.id,
      name: raw.name,
      // ... proper mapping
    }
  }
}
```

**Files to Update**:
- All pages using Supabase queries
- All API routes with database access
- Components fetching data

**Acceptance Criteria**:
- [ ] Repository classes created for all entities
- [ ] All Supabase queries use repositories
- [ ] Zero `as unknown as` in components/pages
- [ ] Unit tests for repositories

---

### TICKET-TS-003: Remove `any` from Infrastructure Code

**Priority**: MEDIUM  
**Effort**: 2 days

Target files:
- `lib/api/crud-handler.ts`
- `lib/auth/api-wrapper.ts`
- `lib/domain/*/repository.ts`

Replace `any` with proper generics:

```typescript
// Before
query = queryModifier(query as any, ctx) as any

// After
query = queryModifier<T>(query: PostgrestQueryBuilder<T>, ctx: Context)
  : PostgrestQueryBuilder<T>
```

---

### TICKET-TS-004: Fix Type Assertions in Components

**Priority**: MEDIUM  
**Effort**: 2 days

Replace type assertions with proper typing:

```typescript
// Before
Mascota: {(apt.pets as any)?.name || 'N/A'}

// After
interface AppointmentWithPet extends Appointment {
  pet: Pet
}
Mascota: {apt.pet?.name || 'N/A'}
```

---

### TICKET-TS-005: Add Strict Zod Validation at API Boundaries

**Priority**: MEDIUM  
**Effort**: 2 days

Replace casts with Zod parse:

```typescript
// Before
const body = await request.json()
const data = body as CreatePetRequest

// After
const body = await request.json()
const data = createPetSchema.parse(body)  // Throws if invalid
```

---

## Success Metrics

- [ ] `any` usage < 5 instances
- [ ] Zero `as unknown as` in application code
- [ ] All entities in central location
- [ ] TypeScript strict mode passing
- [ ] Repository pattern fully implemented

## Risks

| Risk | Mitigation |
|------|------------|
| Breaking changes | Comprehensive test suite |
| Large refactor scope | Incremental, file-by-file approach |
| Type complexity | Use utility types, keep simple |

