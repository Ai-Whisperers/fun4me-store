# Backend Architecture Critique

> **Scope**: API Routes, Server Actions, Database Design, Data Access Patterns
> **Date**: December 2024

---

## Executive Summary

The backend architecture follows modern Next.js patterns with a hybrid approach: Server Actions for form mutations and API Routes for complex CRUD operations. The database design is solid with proper multi-tenant isolation via RLS.

### Backend Score: 7.5/10

| Component | Score | Notes |
|-----------|-------|-------|
| Database Design | 8/10 | Well-normalized, good RLS |
| API Routes | 7/10 | Consistent, needs validation |
| Server Actions | 8/10 | Clean patterns |
| Data Access | 7/10 | Direct queries, no ORM |
| Security | 8/10 | RLS, auth checks |
| Error Handling | 6/10 | Inconsistent |

---

## 1. Database Architecture

### 1.1 Schema Design Assessment

**Total Tables:** 35+
**Migration Files:** 35 numbered SQL files

```
┌──────────────────────────────────────────────────────────────────┐
│                    DATABASE SCHEMA OVERVIEW                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  CORE ENTITIES                                                    │
│  ├── tenants (id, name)                                          │
│  ├── profiles (id, tenant_id, role, full_name, email)            │
│  └── clinic_invites (email, tenant_id, role)                     │
│                                                                   │
│  PET MANAGEMENT                                                   │
│  ├── pets (id, owner_id, tenant_id, name, species, breed, ...)   │
│  ├── vaccines (id, pet_id, vaccine_name, date, next_due, ...)    │
│  ├── medical_records (id, pet_id, record_type, notes, ...)       │
│  ├── prescriptions (id, pet_id, vet_id, drug_name, dosage, ...)  │
│  └── qr_tags (id, code, pet_id)                                  │
│                                                                   │
│  CLINICAL TOOLS                                                   │
│  ├── diagnosis_codes (code, term, description)                   │
│  ├── drug_dosages (drug_name, species, dosage_per_kg, route)     │
│  ├── vaccine_reactions (pet_id, vaccine_id, reaction_type)       │
│  └── euthanasia_assessments (pet_id, hurt_score, ...)            │
│                                                                   │
│  BUSINESS                                                         │
│  ├── appointments (clinic_slug, pet_id, service_id, date)        │
│  ├── store_products (tenant_id, sku, name, price)                │
│  ├── store_inventory (product_id, current_stock)                 │
│  ├── expenses (clinic_id, category, amount)                      │
│  └── loyalty_points (user_id, balance, lifetime_earned)          │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 1.2 Schema Strengths

#### ✅ Proper Normalization
```sql
-- Good: Separate inventory table from products
store_products (id, tenant_id, name, price)
store_inventory (id, product_id, current_stock, reorder_level)
store_inventory_transactions (id, product_id, quantity, type, cost)
```

#### ✅ UUID Primary Keys
```sql
-- Good: Prevents enumeration attacks
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```

#### ✅ Audit Timestamps
```sql
-- Good: Every table has these
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW()

-- With trigger for auto-update
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON table_name
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
```

#### ✅ Tenant Isolation
```sql
-- Good: Every table has tenant_id
tenant_id TEXT NOT NULL REFERENCES tenants(id)
```

### 1.3 Schema Weaknesses

#### ⚠️ Missing Indexes
```sql
-- Issue: Some common query patterns lack indexes
-- Example: Searching appointments by date range
SELECT * FROM appointments
WHERE clinic_slug = $1
AND appointment_date BETWEEN $2 AND $3;

-- Missing index:
CREATE INDEX idx_appointments_clinic_date
ON appointments(clinic_slug, appointment_date);
```

**Recommendation:** Add composite indexes for:
- `appointments(clinic_slug, appointment_date)`
- `vaccines(pet_id, next_due)`
- `medical_records(pet_id, created_at)`
- `store_products(tenant_id, category)`

#### ⚠️ No Soft Deletes on Some Tables
```sql
-- Some tables have hard deletes
DELETE FROM appointments WHERE id = $1;

-- Should have:
ALTER TABLE appointments ADD COLUMN deleted_at TIMESTAMPTZ;
-- Then update queries to filter deleted_at IS NULL
```

#### ⚠️ Inconsistent Naming
```sql
-- Mixed conventions found:
clinic_slug   -- snake_case
clinicSlug    -- camelCase (in some places)
tenant_id     -- snake_case
tenantId      -- camelCase (in TypeScript)
```

**Recommendation:** Standardize on `snake_case` for database, map to `camelCase` in TypeScript.

#### ❌ No Partitioning Strategy
```sql
-- Large tables like medical_records will grow unbounded
-- Consider partitioning by tenant_id or date for scale
```

### 1.4 Row Level Security (RLS) Analysis

```sql
┌──────────────────────────────────────────────────────────────────┐
│                    RLS POLICY PATTERNS                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  PATTERN 1: Staff Full Access                                     │
│  CREATE POLICY "staff_all" ON table_name FOR ALL                 │
│    USING (is_staff_of(tenant_id));                               │
│                                                                   │
│  PATTERN 2: Owner Access to Own Data                              │
│  CREATE POLICY "owner_own" ON pets FOR SELECT                    │
│    USING (owner_id = auth.uid());                                │
│                                                                   │
│  PATTERN 3: Public Read Access                                    │
│  CREATE POLICY "public_read" ON diagnosis_codes FOR SELECT       │
│    USING (true);                                                  │
│                                                                   │
│  PATTERN 4: Insert with Automatic Tenant                         │
│  CREATE POLICY "insert_own_tenant" ON pets FOR INSERT            │
│    WITH CHECK (tenant_id = (                                     │
│      SELECT tenant_id FROM profiles WHERE id = auth.uid()        │
│    ));                                                            │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

**RLS Assessment:**

| Status | Description |
|--------|-------------|
| ✅ Excellent | All tenant-scoped tables have RLS enabled |
| ✅ Good | `is_staff_of()` helper function centralizes role checks |
| ✅ Good | Insert policies verify tenant context |
| ⚠️ Watch | Some policies allow cross-tenant reads for staff |
| ⚠️ Missing | No row-level audit logging |

---

## 2. API Routes Architecture

### 2.1 Route Inventory

**Total API Routes:** 57
**Organization:** Feature-based directories

```
app/api/
├── appointments/          # Booking management
│   └── route.ts          # GET, POST, PUT, DELETE
├── auth/
│   ├── callback/         # OAuth callback
│   └── signup/           # Registration
├── booking/              # Public booking
│   └── route.ts          # GET, POST, PUT
├── cart/                 # Shopping cart
│   └── route.ts          # GET, POST
├── clinical/             # Clinical tools
│   ├── diagnosis-codes/
│   ├── drug-dosages/
│   └── vaccines/
├── dashboard/            # Staff dashboard
│   └── stats/
├── inventory/            # Stock management
│   └── route.ts
├── invoices/             # Invoice generation
│   ├── [id]/
│   └── route.ts
├── loyalty/              # Points system
│   └── route.ts
├── medical-records/      # Pet medical history
│   └── route.ts
├── pets/                 # Pet CRUD
│   ├── [id]/
│   └── route.ts
├── prescriptions/        # Rx management
│   └── route.ts
├── products/             # Store products
│   └── route.ts
├── qr/                   # QR tag operations
│   └── route.ts
├── tags/                 # Tag management
│   └── route.ts
├── upload/               # File uploads
│   └── route.ts
└── whatsapp/             # WhatsApp integration
    └── send/
```

### 2.2 API Route Pattern Analysis

#### Standard Route Pattern (Good)
```typescript
// Example from booking/route.ts

export async function GET(request: NextRequest) {
  // 1. Create Supabase client
  const supabase = await createClient();

  // 2. Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // 3. Get profile with tenant context
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single();

  // 4. Role-based query logic
  let query = supabase.from('appointments').select('*');

  if (profile.role === 'owner') {
    // Owners see only their pets' appointments
    query = query.in('pet_id', ownerPetIds);
  } else {
    // Staff see all clinic appointments
    query = query.eq('clinic_slug', profile.tenant_id);
  }

  // 5. Execute and return
  const { data, error } = await query;
  return NextResponse.json(data);
}
```

### 2.3 API Strengths

#### ✅ Consistent Auth Pattern
Every protected route follows the same auth check pattern:
```typescript
const { data: { user }, error: authError } = await supabase.auth.getUser();
if (authError || !user) {
  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
}
```

#### ✅ Role-Based Access Control
Routes properly differentiate between owner and staff access:
```typescript
if (profile.role === 'owner') {
  // Limited access
} else if (['vet', 'admin'].includes(profile.role)) {
  // Full access
}
```

#### ✅ Proper HTTP Methods
CRUD operations map to correct HTTP verbs:
- GET: Read operations
- POST: Create operations
- PUT: Update operations
- DELETE: Remove operations

#### ✅ Consistent Error Responses
```typescript
return NextResponse.json(
  { error: 'Message in Spanish' },
  { status: 400 | 401 | 403 | 404 | 500 }
);
```

### 2.4 API Weaknesses

#### ❌ No Input Validation
```typescript
// Current: Trusting client input directly
export async function POST(request: NextRequest) {
  const body = await request.json();
  // No validation!
  const { petId, serviceId, date } = body;

  // Should be:
  const result = BookingSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: result.error.flatten() },
      { status: 400 }
    );
  }
}
```

**Fix Required:** Add Zod schemas for all API inputs.

#### ❌ Repeated Auth Boilerplate
```typescript
// This pattern is repeated in every route:
const supabase = await createClient();
const { data: { user }, error: authError } = await supabase.auth.getUser();
if (authError || !user) {
  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
}
const { data: profile } = await supabase
  .from('profiles')
  .select('tenant_id, role')
  .eq('id', user.id)
  .single();
```

**Fix Required:** Create `withAuth` wrapper or middleware.

```typescript
// Proposed: lib/api/with-auth.ts
export function withAuth<T>(
  handler: (req: NextRequest, context: AuthContext) => Promise<NextResponse<T>>
) {
  return async (req: NextRequest) => {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const profile = await getProfile(user.id);
    return handler(req, { user, profile, supabase });
  };
}

// Usage:
export const GET = withAuth(async (req, { profile, supabase }) => {
  // Auth already verified, profile available
});
```

#### ⚠️ Inconsistent Error Messages
```typescript
// Found variations:
{ error: 'No autorizado' }
{ error: 'Unauthorized' }
{ error: 'Error al procesar' }
{ message: 'Error' }
```

**Fix Required:** Create error constants file.

```typescript
// lib/api/errors.ts
export const API_ERRORS = {
  UNAUTHORIZED: { error: 'No autorizado', status: 401 },
  FORBIDDEN: { error: 'Sin permisos', status: 403 },
  NOT_FOUND: { error: 'No encontrado', status: 404 },
  VALIDATION: { error: 'Datos inválidos', status: 400 },
  SERVER: { error: 'Error del servidor', status: 500 },
} as const;
```

#### ⚠️ No Rate Limiting
```typescript
// No protection against abuse
export async function POST(request: NextRequest) {
  // Anyone can spam this endpoint
}
```

**Recommendation:** Add Vercel Edge Middleware rate limiting or Upstash.

#### ⚠️ No API Versioning
```typescript
// Current:
/api/pets/route.ts

// Should consider:
/api/v1/pets/route.ts
```

### 2.5 API Route by Route Issues

| Route | Issue | Severity |
|-------|-------|----------|
| `/api/booking` | No date validation (past dates allowed) | HIGH |
| `/api/pets` | Photo upload size not validated | MEDIUM |
| `/api/prescriptions` | Missing drug interaction check | LOW |
| `/api/dashboard/stats` | Previously had hardcoded 'adris' | FIXED |
| `/api/products` | No pagination, loads all products | MEDIUM |
| `/api/loyalty` | Points can go negative | MEDIUM |
| `/api/upload` | File type validation is weak | HIGH |

---

## 3. Server Actions Architecture

### 3.1 Server Actions Inventory

**Total Server Actions:** 19
**Location:** `app/actions/`

```
app/actions/
├── auth/
│   ├── login.ts
│   ├── logout.ts
│   └── signup.ts
├── pets/
│   ├── create-pet.ts
│   ├── update-pet.ts
│   └── delete-pet.ts
├── vaccines/
│   ├── add-vaccine.ts
│   └── update-vaccine.ts
├── booking/
│   └── create-appointment.ts
├── medical-records/
│   └── create-record.ts
├── prescriptions/
│   └── create-prescription.ts
├── store/
│   ├── add-to-cart.ts
│   └── checkout.ts
└── admin/
    ├── invite-user.ts
    └── update-settings.ts
```

### 3.2 Server Action Pattern Analysis

#### Standard Pattern (Good)
```typescript
// create-pet.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface ActionState {
  success: boolean;
  message: string;
  data?: any;
}

export async function createPet(
  prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();

  // 1. Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, message: 'No autorizado' };
  }

  // 2. Extract and validate form data
  const name = formData.get('name') as string;
  const species = formData.get('species') as string;

  if (!name || !species) {
    return { success: false, message: 'Campos requeridos faltantes' };
  }

  // 3. Get profile for tenant context
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single();

  // 4. Handle file upload if present
  const photoFile = formData.get('photo') as File | null;
  let photoUrl = null;

  if (photoFile && photoFile.size > 0) {
    const { data: uploadData } = await supabase.storage
      .from('pet-photos')
      .upload(`${profile.tenant_id}/${Date.now()}.jpg`, photoFile);
    photoUrl = uploadData?.path;
  }

  // 5. Insert record
  const { data, error } = await supabase
    .from('pets')
    .insert({
      owner_id: user.id,
      tenant_id: profile.tenant_id,
      name,
      species,
      photo_url: photoUrl,
    })
    .select()
    .single();

  if (error) {
    return { success: false, message: 'Error al crear mascota' };
  }

  // 6. Revalidate cache
  revalidatePath(`/${profile.tenant_id}/portal/pets`);

  return {
    success: true,
    message: 'Mascota creada exitosamente',
    data
  };
}
```

### 3.3 Server Actions Strengths

#### ✅ Proper `'use server'` Directive
All server actions are properly marked.

#### ✅ Consistent Return Type
```typescript
interface ActionState {
  success: boolean;
  message: string;
  data?: any;
}
```

#### ✅ Form Integration
Works seamlessly with React 19's `useActionState`:
```typescript
const [state, formAction, isPending] = useActionState(createPet, null);
```

#### ✅ Cache Revalidation
```typescript
revalidatePath('/path/to/revalidate');
```

### 3.4 Server Actions Weaknesses

#### ⚠️ Centralized Location
Actions are in `app/actions/` instead of colocated with features:
```
// Current:
app/actions/create-pet.ts
app/[clinic]/portal/pets/page.tsx

// Better:
app/[clinic]/portal/pets/
├── page.tsx
├── actions.ts  // Colocated!
└── components/
```

#### ⚠️ Limited Validation
```typescript
// Current: Manual checks
if (!name || !species) {
  return { success: false, message: 'Campos requeridos' };
}

// Should use Zod:
const PetSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  species: z.enum(['dog', 'cat', 'bird', 'other']),
  breed: z.string().optional(),
});

const parsed = PetSchema.safeParse(Object.fromEntries(formData));
if (!parsed.success) {
  return {
    success: false,
    message: 'Datos inválidos',
    errors: parsed.error.flatten().fieldErrors
  };
}
```

#### ⚠️ No Transaction Support
```typescript
// Current: Multiple operations without transaction
await supabase.from('pets').insert({...});
await supabase.from('audit_log').insert({...}); // Could fail!

// Should use:
await supabase.rpc('create_pet_with_audit', { ... });
// Or use Supabase transactions when available
```

---

## 4. Data Access Patterns

### 4.1 Current Approach: Direct Supabase Queries

```typescript
// Pattern used throughout
const supabase = await createClient();
const { data, error } = await supabase
  .from('table')
  .select('*')
  .eq('tenant_id', tenantId);
```

### 4.2 Strengths

#### ✅ Type Safety with Generated Types
```typescript
import { Database } from '@/lib/supabase/database.types';
type Pet = Database['public']['Tables']['pets']['Row'];
```

#### ✅ RLS Handles Authorization
No need to manually filter by tenant in most cases.

#### ✅ Real-time Subscriptions Available
```typescript
supabase
  .channel('appointments')
  .on('postgres_changes', { event: '*', schema: 'public' }, callback)
  .subscribe();
```

### 4.3 Weaknesses

#### ❌ No Repository/Service Layer
```typescript
// Scattered queries everywhere
// In page.tsx:
const { data: pets } = await supabase.from('pets').select('*');

// In another file, same query:
const { data: pets } = await supabase.from('pets').select('*');
```

**Recommendation:** Create service layer:
```typescript
// lib/services/pet-service.ts
export const PetService = {
  async getByOwner(ownerId: string) {
    const supabase = await createClient();
    return supabase.from('pets').select('*').eq('owner_id', ownerId);
  },

  async getByTenant(tenantId: string) {
    const supabase = await createClient();
    return supabase.from('pets').select('*').eq('tenant_id', tenantId);
  },

  async create(data: PetInsert) {
    const supabase = await createClient();
    return supabase.from('pets').insert(data).select().single();
  },
};
```

#### ❌ No Query Caching
```typescript
// Every page load hits database
const { data: config } = await supabase
  .from('clinic_config')
  .select('*')
  .eq('id', clinicSlug)
  .single();
```

**Recommendation:** Add caching layer:
```typescript
import { unstable_cache } from 'next/cache';

export const getClinicConfig = unstable_cache(
  async (clinicSlug: string) => {
    const supabase = await createClient();
    return supabase.from('clinic_config').select('*').eq('id', clinicSlug).single();
  },
  ['clinic-config'],
  { revalidate: 300 } // 5 minutes
);
```

#### ⚠️ N+1 Query Potential
```typescript
// Bad: N+1 queries
const pets = await getPets();
for (const pet of pets) {
  pet.vaccines = await getVaccines(pet.id); // N queries!
}

// Good: Single query with join
const { data } = await supabase
  .from('pets')
  .select(`
    *,
    vaccines (*)
  `)
  .eq('owner_id', userId);
```

---

## 5. Database Migration Management

### 5.1 Current System

**Migration Files:** `web/db/XX_name.sql`
**Naming:** Numbered sequence (01, 02, 03...)
**Execution:** Manual via Supabase dashboard or CLI

```
web/db/
├── 01_initial_schema.sql
├── 02_add_profiles.sql
├── 03_add_pets.sql
├── 04_add_vaccines.sql
├── 05_add_rls_policies.sql
...
├── 34_add_loyalty_points.sql
└── 35_add_epidemiology.sql
```

### 5.2 Migration Strengths

#### ✅ Numbered Sequencing
Clear order of execution.

#### ✅ RLS in Migrations
Policies are defined alongside table creation.

#### ✅ Comprehensive Schema
All tables, indexes, functions, and triggers included.

### 5.3 Migration Weaknesses

#### ❌ No Rollback Scripts
```sql
-- Current: Only forward migration
CREATE TABLE pets (...);

-- Should have: db/rollback/03_rollback_pets.sql
DROP TABLE IF EXISTS pets;
```

#### ❌ No Migration Tracking
No `schema_migrations` table to track applied migrations.

#### ❌ Manual Execution
No automated CI/CD migration pipeline.

**Recommendation:** Implement proper migration system:
```typescript
// Option 1: Use Supabase CLI migrations
supabase migration new add_feature
supabase db push

// Option 2: Use Drizzle or Prisma for type-safe migrations
```

---

## 6. Backend Security Assessment

### 6.1 Authentication Security

| Aspect | Status | Notes |
|--------|--------|-------|
| Password hashing | ✅ Handled by Supabase | bcrypt |
| JWT validation | ✅ Uses `getUser()` not `getSession()` | Server-side validation |
| Session management | ✅ HttpOnly cookies | Secure, SameSite |
| CSRF protection | ✅ Server Actions have built-in CSRF | |
| Rate limiting | ❌ Not implemented | Needs attention |

### 6.2 Authorization Security

| Aspect | Status | Notes |
|--------|--------|-------|
| Row-Level Security | ✅ All tables protected | |
| Role verification | ✅ `is_staff_of()` function | |
| Tenant isolation | ✅ All queries filtered | |
| API route auth | ✅ Checks in every route | |
| Server Action auth | ✅ Checks in every action | |

### 6.3 Data Security

| Aspect | Status | Notes |
|--------|--------|-------|
| SQL injection | ✅ Parameterized queries only | |
| Input sanitization | ⚠️ Minimal | Needs Zod |
| File upload validation | ⚠️ Basic | Size/type checks needed |
| Sensitive data logging | ⚠️ Console.log found | Remove |
| PII handling | ✅ Encrypted at rest | Supabase |

---

## 7. Recommendations Summary

### 7.1 Critical (Do Immediately)

1. **Add Zod validation to all API routes and Server Actions**
2. **Create `withAuth` middleware wrapper**
3. **Remove console.log statements**
4. **Add file upload size and type validation**

### 7.2 High Priority (This Sprint)

1. **Create service layer for data access**
2. **Add database indexes for common queries**
3. **Implement rate limiting**
4. **Standardize error messages**

### 7.3 Medium Priority (Next Sprint)

1. **Colocate Server Actions with features**
2. **Add query caching with `unstable_cache`**
3. **Implement migration tracking**
4. **Add audit logging table**

### 7.4 Low Priority (Backlog)

1. **Add rollback migrations**
2. **Implement API versioning**
3. **Add database partitioning strategy**
4. **Create comprehensive API documentation**

---

## 8. Code Examples: Before and After

### Example 1: API Route Improvement

**Before:**
```typescript
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { petId, date } = body;

  // No validation, direct insert
  const { data, error } = await supabase
    .from('appointments')
    .insert({ pet_id: petId, date });

  return NextResponse.json(data);
}
```

**After:**
```typescript
import { z } from 'zod';
import { withAuth, AuthContext } from '@/lib/api/with-auth';
import { API_ERRORS } from '@/lib/api/errors';

const AppointmentSchema = z.object({
  petId: z.string().uuid(),
  date: z.string().datetime().refine(d => new Date(d) > new Date(), {
    message: 'La fecha debe ser futura'
  }),
  serviceId: z.string().uuid(),
});

export const POST = withAuth(async (request: NextRequest, ctx: AuthContext) => {
  const body = await request.json();

  const parsed = AppointmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({
      ...API_ERRORS.VALIDATION,
      details: parsed.error.flatten().fieldErrors
    }, { status: 400 });
  }

  const { petId, date, serviceId } = parsed.data;

  // Verify pet ownership
  const { data: pet } = await ctx.supabase
    .from('pets')
    .select('owner_id')
    .eq('id', petId)
    .single();

  if (!pet || (ctx.profile.role === 'owner' && pet.owner_id !== ctx.user.id)) {
    return NextResponse.json(API_ERRORS.FORBIDDEN, { status: 403 });
  }

  const { data, error } = await ctx.supabase
    .from('appointments')
    .insert({
      pet_id: petId,
      appointment_date: date,
      service_id: serviceId,
      clinic_slug: ctx.profile.tenant_id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(API_ERRORS.SERVER, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
});
```

---

*Document Version: 1.0*
*Last Updated: December 2024*
