# Type Safety Patterns Guide

**Last Updated**: January 2026  
**Status**: Active - Use these patterns for all new TypeScript code

This guide documents type-safe patterns discovered during our type safety refactoring initiative (900 → 822 violations, -8.7%).

---

## Table of Contents

1. [Translation Key Types](#translation-key-types)
2. [Supabase Query Types](#supabase-query-types)
3. [Form Handler Types](#form-handler-types)
4. [Type Narrowing](#type-narrowing)
5. [Component Prop Types](#component-prop-types)
6. [Generic JSON Data](#generic-json-data)
7. [Common Pitfalls](#common-pitfalls)

---

## Translation Key Types

### Problem
Translation keys with dynamic segments lose type safety:

```typescript
// ❌ BAD - loses type safety
t(`appointmentStatus.${status}` as any)
```

### Solution
Use template literal types:

```typescript
// ✅ GOOD - maintains type safety
type AppointmentStatusKey = `appointmentStatus.${string}`
type TimeOffStatusKey = `timeOffStatus.${string}`
type EventTypeKey = `eventTypes.${string}`

const key: AppointmentStatusKey = `appointmentStatus.${status}`
return t(key) || defaultValue
```

### When to Use
- i18n translation keys with dynamic segments
- Any string literal union that follows a pattern
- API endpoint paths with dynamic segments

### Examples in Codebase
- `web/components/calendar/event-detail-modal.tsx` (lines 16-21)

---

## Supabase Query Types

### Problem
Supabase joins return complex nested objects that TypeScript can't infer:

```typescript
// ❌ BAD - loses join structure
const { data } = await supabase
  .from('appointments')
  .select('*, pets(name), services(id, name)')

const petName = (data[0].pets as any).name // Type safety lost
```

### Solution
Define explicit types for join results:

```typescript
// ✅ GOOD - explicit join types
interface SupabasePet {
  name: string
}

interface SupabaseService {
  id: string
  name: string
}

interface SupabaseAppointment {
  id: string
  start_time: string
  status: string
  pets: SupabasePet | SupabasePet[] | null  // Handles array or single
  services: SupabaseService | SupabaseService[] | null
}

const { data } = await supabase
  .from('appointments')
  .select('*, pets(name), services(id, name)')

const appointments = (data || []) as SupabaseAppointment[]
const pet = Array.isArray(appointments[0].pets) 
  ? appointments[0].pets[0] 
  : appointments[0].pets
```

### Pattern: Handling Array/Single Joins

Supabase returns arrays for one-to-many and objects for many-to-one. Handle both:

```typescript
function getPet(data: SupabasePet | SupabasePet[] | null): SupabasePet | null {
  if (!data) return null
  return Array.isArray(data) ? data[0] : data
}

// Usage
const pet = getPet(appointment.pets)
```

### When to Use
- Any Supabase query with `.select()` joins
- Foreign key relationships
- Nested data structures from database

### Examples in Codebase
- `web/app/[clinic]/portal/pets/[id]/page.tsx` (lines 15-40)
- `web/app/[clinic]/dashboard/clients/[id]/page.tsx` (lines 30-55)

---

## Form Handler Types

### Problem
Form handlers often accept `any` for field values:

```typescript
// ❌ BAD - accepts any value
const handleFieldChange = (field: keyof FormData, value: any) => {
  setFormData(prev => ({ ...prev, [field]: value }))
}
```

### Solution
Use indexed access types:

```typescript
// ✅ GOOD - type-safe field values
const handleFieldChange = (
  field: keyof FormData, 
  value: FormData[keyof FormData]
) => {
  setFormData(prev => ({ ...prev, [field]: value }))
}
```

### Advanced: Type-Safe Field-Specific Handlers

For even better type safety:

```typescript
function createFieldHandler<T extends Record<string, unknown>>() {
  return <K extends keyof T>(field: K, value: T[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }
}

// Usage - compiler ensures value matches field type
const handleChange = createFieldHandler<SignupFormData>()
handleChange('email', 'user@example.com') // ✅
handleChange('email', 123) // ❌ Type error
```

### When to Use
- Form field change handlers
- Generic update functions
- State setters with dynamic keys

### Examples in Codebase
- `web/components/signup/signup-wizard.tsx` (line 77)

---

## Type Narrowing

### Problem: Enum Subsets

Sometimes you need to narrow a broader type to a subset:

```typescript
type PetSex = 'male' | 'female' | 'unknown'

interface GrowthChartProps {
  gender: 'male' | 'female'  // Doesn't accept 'unknown'
}

// ❌ BAD - loses type safety
<GrowthChart gender={pet.sex as any} />
```

### Solution: Type Guard with Fallback

```typescript
// ✅ GOOD - explicit type narrowing
const gender: 'male' | 'female' = 
  (pet.sex === 'male' || pet.sex === 'female') 
    ? pet.sex 
    : 'male'  // Sensible default

<GrowthChart gender={gender} />
```

### Pattern: IIFE Type Narrowing

For inline narrowing in JSX:

```typescript
// ✅ GOOD - inline type narrowing
<td>
  {(() => {
    const typedInvoice = invoice as InvoiceWithPet
    const pet = Array.isArray(typedInvoice.pets) 
      ? typedInvoice.pets[0] 
      : typedInvoice.pets
    return pet?.name || 'N/A'
  })()}
</td>
```

### When to Use
- Converting broader enums to narrower subsets
- Providing defaults for incomplete data
- Complex type transformations in JSX

### Examples in Codebase
- `web/components/pets/tabs/pet-summary-tab.tsx` (line 356)
- `web/app/[clinic]/dashboard/clients/[id]/page.tsx` (lines 463-469)

---

## Component Prop Types

### Problem: Icon Components

```typescript
// ❌ BAD - any icon type
interface StatusConfig {
  label: string
  icon: any
}
```

### Solution: Use Proper Icon Type

```typescript
// ✅ GOOD - explicit icon type
import { type LucideIcon } from 'lucide-react'

interface StatusConfig {
  label: string
  icon: LucideIcon
}

const config: StatusConfig = {
  label: 'Success',
  icon: CheckCircle  // Type-checked
}
```

### Pattern: Generic Component Props

```typescript
// For props that can be different types
interface CardProps<T> {
  data: T
  renderItem: (item: T) => React.ReactNode
}

// Usage
<Card<User> 
  data={userData} 
  renderItem={user => <div>{user.name}</div>} 
/>
```

### When to Use
- Icon component props (Lucide, Heroicons, etc.)
- Render props and function children
- Generic container components

### Examples in Codebase
- `web/app/[clinic]/dashboard/clients/[id]/page.tsx` (line 23, 178)

---

## Generic JSON Data

### Problem
Untyped JSON fields from database:

```typescript
// ❌ BAD - too permissive
interface AuditLog {
  details: any
}
```

### Solution: Use Record for Unknown Structure

```typescript
// ✅ GOOD - indicates unknown but typed structure
interface AuditLog {
  details: Record<string, unknown> | null
}

// Access with type guards
if (log.details && typeof log.details.action === 'string') {
  console.log(log.details.action)
}
```

### Pattern: Zod for Runtime Validation

For critical JSON fields, validate at runtime:

```typescript
import { z } from 'zod'

const detailsSchema = z.object({
  action: z.string(),
  userId: z.string().uuid(),
  timestamp: z.string()
})

// In handler
const details = detailsSchema.parse(rawDetails)  // Type-safe + validated
```

### When to Use
- JSONB columns from Supabase
- API response data
- Dynamic configuration objects
- Audit logs and metadata

### Examples in Codebase
- `web/app/[clinic]/dashboard/audit/audit-logs-list.tsx` (line 9)
- `web/app/api/setup/route.ts` (line 10)
- `web/app/api/setup/seed/route.ts` (all helper functions)

---

## Common Pitfalls

### ❌ Pitfall 1: Casting Null to Any

```typescript
// BAD
onClick={() => onSelect(null as any)}
```

**Fix**: Create a proper handler or make the function accept null:

```typescript
// Option 1: Make function nullable
interface Props {
  onSelect: (item: Item | null) => void
}

// Option 2: Create clear handler
const handleDeselect = () => {
  setPets([])
  setSearchQuery('')
}
onClick={handleDeselect}
```

### ❌ Pitfall 2: Overly Broad Types

```typescript
// BAD - too vague
const data: any[] = await fetchData()
```

**Fix**: Define the actual structure:

```typescript
// GOOD - explicit structure
interface DataItem {
  id: string
  name: string
}
const data: DataItem[] = await fetchData()
```

### ❌ Pitfall 3: Ignoring Supabase Type Inference

```typescript
// BAD - discards type info
const { data } = await supabase.from('users').select('*')
const users = data as any
```

**Fix**: Let TypeScript infer or provide explicit type:

```typescript
// GOOD
interface User {
  id: string
  email: string
}
const { data } = await supabase.from('users').select('*')
const users = (data || []) as User[]
```

### ❌ Pitfall 4: Nested Any in Interfaces

```typescript
// BAD
interface Config {
  theme: {
    colors: any
  }
}
```

**Fix**: Define nested structures:

```typescript
// GOOD
interface Config {
  theme: {
    colors: {
      primary?: string
      secondary?: string
      [key: string]: string | undefined
    }
  }
}
```

---

## Type Safety Checklist

Before committing TypeScript code, verify:

- [ ] No `any` types without explicit justification
- [ ] Supabase joins have defined types
- [ ] Form handlers use indexed access types
- [ ] Translation keys use template literal types
- [ ] JSON fields use `Record<string, unknown>` or better
- [ ] Type guards handle edge cases (null, arrays)
- [ ] Icon props use proper `LucideIcon` type
- [ ] No `as any` casts (use type guards instead)
- [ ] Run `npm run typecheck` with 0 new errors

---

## Acceptable Use of `any`

There are rare cases where `any` is acceptable:

### 1. Third-Party Library Limitations

```typescript
// Acceptable - Leaflet internals require prototype manipulation
(L.Icon.Default.prototype as any)._getIconUrl = ...
```

### 2. Complex Generic Constraints (Temporary)

```typescript
// Acceptable as intermediate step during migration
// TODO: Replace with proper generic constraint
function processData(data: any): ProcessedData {
  // ... 
}
```

**Mark these with comments**:
```typescript
// ACCEPTABLE-ANY: Leaflet prototype manipulation (library limitation)
// TODO-TYPE: Define proper QueryBuilder generic (tracked in TYPE-SAFETY-123)
```

---

## References

- **Supabase Types**: `web/lib/supabase/scoped.ts`
- **Form Types**: `web/lib/signup/types.ts`
- **Translation Keys**: `web/messages/es.json`
- **Component Types**: `web/components/consents/signing-form/types.ts`

---

## Contributing

When adding new type patterns:

1. Document the problem and solution
2. Add example from actual codebase
3. Update the checklist if needed
4. Keep examples concise and realistic

---

**Questions?** See `CLAUDE.md` for project-wide coding standards or ask in #engineering.
