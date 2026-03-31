# AUDIT-102: `any` Types in Seed Route

## Priority: P3 - Low
## Category: Technical Debt
## Status: Not Started
## Epic: [EPIC-08: Code Quality & Refactoring](../epics/EPIC-08-code-quality.md)

## Description

The `web/app/api/setup/seed/route.ts` file contains 15 `any` type usages in function signatures. While this is a development-only route (protected by NODE_ENV check), it sets a bad precedent and could mask type errors during seed data development.

## Current State

```typescript
async function createTenant(supabase: any, data: any) { ... }
async function createProfile(supabase: any, data: any) { ... }
async function createPet(supabase: any, data: any) { ... }
async function createService(supabase: any, data: any) { ... }
async function createPaymentMethod(supabase: any, data: any) { ... }
async function createKennel(supabase: any, data: any) { ... }
async function createQrTag(supabase: any, data: any) { ... }
async function createAppointment(supabase: any, data: any) { ... }
async function createHospitalization(supabase: any, data: any) { ... }
async function createMedicalRecord(supabase: any, data: any) { ... }
async function createVaccine(supabase: any, data: any) { ... }
async function bulkSeed(supabase: any, data: any) { ... }
async function clearTenantData(supabase: any, tenantId: string) { ... }
```

**Total `any` usages**: 15

## Issues

1. **Type safety** - No compile-time checks on data shapes
2. **Autocomplete** - No IDE support for valid fields
3. **Documentation** - Types serve as inline documentation
4. **Precedent** - Normalizes `any` usage in codebase

## Proposed Solution

Define proper types using existing database types or create seed-specific types:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

type ServiceClient = SupabaseClient<Database>

interface CreateTenantData {
  id: string
  name: string
  // ... other tenant fields
}

async function createTenant(
  supabase: ServiceClient,
  data: CreateTenantData
): Promise<NextResponse> { ... }
```

## Implementation Steps

1. [ ] Import `SupabaseClient` type from Supabase SDK
2. [ ] Create interface for each data payload type
3. [ ] Use `Database` type from generated types if available
4. [ ] Replace all `any` with proper types
5. [ ] Fix any type errors that surface
6. [ ] Update function return types to `Promise<NextResponse<T>>`

## Acceptance Criteria

- [ ] Zero `any` types in the file
- [ ] All functions have proper input types
- [ ] All functions have proper return types
- [ ] No TypeScript errors
- [ ] Seed functionality still works

## Related Files

- `web/app/api/setup/seed/route.ts`
- `web/lib/types/database.ts` (if exists)

## Estimated Effort

- 2-3 hours

## Risk Assessment

- **Low risk** - Development-only route
- Route is protected by NODE_ENV check
- Type changes only affect development workflow
- Lower priority than production code fixes
