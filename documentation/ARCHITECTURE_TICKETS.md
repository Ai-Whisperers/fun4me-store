# Architecture Review Tickets

> **Generated**: December 2024
> **Total Tickets**: 89
> **Source**: Architecture critique documents

---

## Priority Legend

| Priority | Description | SLA |
|----------|-------------|-----|
| 🔴 CRITICAL | Security risk or broken functionality | Fix immediately |
| 🟠 HIGH | Significant impact on quality/performance | This sprint |
| 🟡 MEDIUM | Improvement needed | Next sprint |
| 🟢 LOW | Nice to have | Backlog |

## Effort Legend

| Effort | Description |
|--------|-------------|
| XS | < 1 hour |
| S | 1-4 hours |
| M | 4-8 hours (1 day) |
| L | 2-3 days |
| XL | 1 week+ |

---

# Category 1: TypeScript & Build Configuration

## ARCH-001: Enable TypeScript Strict Build Checks

**Priority**: 🔴 CRITICAL
**Effort**: M
**Category**: Build Configuration

### Description
TypeScript build errors are currently ignored in `next.config.mjs`, allowing type-unsafe code to reach production. This masks real bugs and defeats the purpose of using TypeScript.

### Current State
```javascript
// next.config.mjs
typescript: {
  ignoreBuildErrors: true,  // ❌ Hiding errors
},
eslint: {
  ignoreDuringBuilds: true,  // ❌ Hiding errors
},
```

### Expected State
```javascript
// next.config.mjs
typescript: {
  ignoreBuildErrors: false,
},
eslint: {
  ignoreDuringBuilds: false,
},
```

### Files Affected
- `web/next.config.mjs`
- Multiple files with type errors (to be fixed)

### Acceptance Criteria
- [ ] `ignoreBuildErrors` set to `false`
- [ ] `ignoreDuringBuilds` set to `false`
- [ ] All TypeScript errors fixed
- [ ] Build passes successfully
- [ ] CI/CD pipeline enforces type checking

### Notes
This will likely uncover 50+ type errors that need fixing. Consider tackling in phases.

---

## ARCH-002: Fix `any` Type Usage in ClinicData Interface

**Priority**: 🟠 HIGH
**Effort**: M
**Category**: Type Safety

### Description
The `ClinicData` interface uses `any` for several properties, losing type safety for clinic content data.

### Current State
```typescript
// lib/clinics.ts
export interface ClinicData {
  config: ClinicConfig;
  theme: ClinicTheme;
  images?: ClinicImages;
  home: any;          // ❌ Not typed
  services: any;      // ❌ Not typed
  about: any;         // ❌ Not typed
  testimonials?: any; // ❌ Not typed
  faq?: any;          // ❌ Not typed
  legal?: any;        // ❌ Not typed
}
```

### Expected State
```typescript
export interface HomeContent {
  hero: {
    title: string;
    subtitle: string;
    cta_text: string;
    cta_link: string;
  };
  features: Array<{
    icon: string;
    title: string;
    description: string;
  }>;
  stats: Array<{
    value: string;
    label: string;
  }>;
}

export interface ServiceContent {
  categories: Array<{
    id: string;
    name: string;
    description: string;
    services: Array<{
      id: string;
      name: string;
      description: string;
      price?: number;
      duration?: string;
    }>;
  }>;
}

// ... similar for about, testimonials, faq, legal

export interface ClinicData {
  config: ClinicConfig;
  theme: ClinicTheme;
  images?: ClinicImages;
  home: HomeContent;
  services: ServiceContent;
  about: AboutContent;
  testimonials?: TestimonialsContent;
  faq?: FAQContent;
  legal?: LegalContent;
}
```

### Files Affected
- `web/lib/clinics.ts`
- `web/lib/types/content.ts` (new file)
- All pages consuming clinic data

### Acceptance Criteria
- [ ] All content types properly defined
- [ ] JSON-CMS files validated against types
- [ ] No `any` remaining in ClinicData
- [ ] IDE autocomplete works for all content

---

## ARCH-003: Remove Unsafe Type Assertions

**Priority**: 🟡 MEDIUM
**Effort**: S
**Category**: Type Safety

### Description
Code uses `as Type` assertions instead of type guards, which can lead to runtime errors.

### Current State
```typescript
// Found in multiple files
const user = data as User;  // ❌ Unsafe
const pet = formData.get('name') as string;  // ❌ Could be null
```

### Expected State
```typescript
// Type guard approach
function isUser(data: unknown): data is User {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'email' in data
  );
}

if (isUser(data)) {
  console.log(data.email);  // Safe
}

// Form data validation
const name = formData.get('name');
if (typeof name !== 'string' || !name) {
  return { error: 'Name required' };
}
```

### Files Affected
- `web/app/actions/*.ts`
- `web/app/api/**/*.ts`
- Various component files

### Acceptance Criteria
- [ ] Type guards created for common shapes
- [ ] Form data properly validated before casting
- [ ] No unsafe `as` assertions in critical paths

---

## ARCH-004: Create Shared Type Definitions File

**Priority**: 🟡 MEDIUM
**Effort**: S
**Category**: Type Safety

### Description
Types are scattered or duplicated across files. Need centralized type definitions.

### Current State
Types defined inline or duplicated in multiple files.

### Expected State
```typescript
// lib/types/index.ts
export * from './content';
export * from './database';
export * from './api';
export * from './forms';

// lib/types/api.ts
export interface ActionState {
  success: boolean;
  message: string;
  data?: unknown;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}
```

### Files Affected
- `web/lib/types/` (new directory)
- All files importing types

### Acceptance Criteria
- [ ] Centralized types directory created
- [ ] Common types exported from index
- [ ] Duplicate type definitions removed
- [ ] All imports updated

---

# Category 2: Backend / API Issues

## ARCH-005: Add Zod Validation to All API Routes

**Priority**: 🔴 CRITICAL
**Effort**: L
**Category**: Input Validation

### Description
API routes accept user input without proper validation, creating security and data integrity risks.

### Current State
```typescript
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { petId, date } = body;  // ❌ No validation
  // Direct use of unvalidated data
}
```

### Expected State
```typescript
import { z } from 'zod';

const AppointmentSchema = z.object({
  petId: z.string().uuid('ID de mascota inválido'),
  serviceId: z.string().uuid('ID de servicio inválido'),
  date: z.string().datetime().refine(
    d => new Date(d) > new Date(),
    'La fecha debe ser futura'
  ),
  notes: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();

  const result = AppointmentSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({
      error: 'Datos inválidos',
      details: result.error.flatten().fieldErrors,
    }, { status: 400 });
  }

  const { petId, serviceId, date, notes } = result.data;
  // Safe to use validated data
}
```

### Files Affected
- `web/app/api/appointments/route.ts`
- `web/app/api/booking/route.ts`
- `web/app/api/pets/route.ts`
- `web/app/api/pets/[id]/route.ts`
- `web/app/api/medical-records/route.ts`
- `web/app/api/prescriptions/route.ts`
- `web/app/api/vaccines/route.ts`
- `web/app/api/products/route.ts`
- `web/app/api/inventory/route.ts`
- `web/app/api/loyalty/route.ts`
- `web/app/api/invoices/route.ts`
- `web/app/api/upload/route.ts`
- `web/app/api/qr/route.ts`
- `web/lib/schemas/` (new directory)

### Acceptance Criteria
- [ ] Zod installed and configured
- [ ] Schema defined for each API endpoint
- [ ] All request bodies validated
- [ ] Consistent error response format
- [ ] Spanish error messages

---

## ARCH-006: Create Auth Middleware Wrapper

**Priority**: 🟠 HIGH
**Effort**: M
**Category**: Code Quality

### Description
Auth boilerplate is repeated in every API route (15+ lines per route). Should be extracted to reusable middleware.

### Current State
```typescript
// Repeated in EVERY API route
export async function GET(request: NextRequest) {
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
  // ... actual logic
}
```

### Expected State
```typescript
// lib/api/with-auth.ts
export interface AuthContext {
  user: User;
  profile: Profile;
  supabase: SupabaseClient;
}

export function withAuth<T>(
  handler: (req: NextRequest, ctx: AuthContext) => Promise<NextResponse<T>>,
  options?: { roles?: string[] }
) {
  return async (req: NextRequest) => {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (options?.roles && !options.roles.includes(profile.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    return handler(req, { user, profile, supabase });
  };
}

// Usage in route:
export const GET = withAuth(async (req, { profile, supabase }) => {
  const { data } = await supabase
    .from('pets')
    .select('*')
    .eq('tenant_id', profile.tenant_id);
  return NextResponse.json(data);
});

export const DELETE = withAuth(async (req, { supabase }) => {
  // ...
}, { roles: ['admin'] });
```

### Files Affected
- `web/lib/api/with-auth.ts` (new file)
- All 57 API route files

### Acceptance Criteria
- [ ] `withAuth` wrapper created
- [ ] Role-based access support
- [ ] All API routes refactored
- [ ] Reduced code duplication by ~800 lines

---

## ARCH-007: Standardize API Error Responses

**Priority**: 🟠 HIGH
**Effort**: S
**Category**: Consistency

### Description
Error responses use inconsistent formats and mixed languages.

### Current State
```typescript
// Found variations:
return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
return NextResponse.json({ message: 'Error' }, { status: 500 });
return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
return NextResponse.json({ success: false, error: 'Failed' });
```

### Expected State
```typescript
// lib/api/errors.ts
export const API_ERRORS = {
  UNAUTHORIZED: {
    error: 'No autorizado',
    code: 'AUTH_REQUIRED'
  },
  FORBIDDEN: {
    error: 'Sin permisos para esta acción',
    code: 'FORBIDDEN'
  },
  NOT_FOUND: {
    error: 'Recurso no encontrado',
    code: 'NOT_FOUND'
  },
  VALIDATION: {
    error: 'Datos inválidos',
    code: 'VALIDATION_ERROR'
  },
  CONFLICT: {
    error: 'Conflicto con datos existentes',
    code: 'CONFLICT'
  },
  SERVER_ERROR: {
    error: 'Error interno del servidor',
    code: 'SERVER_ERROR'
  },
} as const;

export function apiError(
  type: keyof typeof API_ERRORS,
  status: number,
  details?: Record<string, unknown>
) {
  return NextResponse.json(
    { ...API_ERRORS[type], ...details },
    { status }
  );
}

// Usage:
return apiError('VALIDATION', 400, { fields: errors });
return apiError('NOT_FOUND', 404);
```

### Files Affected
- `web/lib/api/errors.ts` (new file)
- All API route files

### Acceptance Criteria
- [ ] Error constants file created
- [ ] All error messages in Spanish
- [ ] Consistent error shape across APIs
- [ ] Error codes for client handling

---

## ARCH-008: Add Zod Validation to Server Actions

**Priority**: 🟠 HIGH
**Effort**: M
**Category**: Input Validation

### Description
Server Actions have minimal manual validation. Should use Zod for consistent validation.

### Current State
```typescript
export async function createPet(prevState: ActionState, formData: FormData) {
  const name = formData.get('name') as string;
  const species = formData.get('species') as string;

  if (!name || !species) {
    return { success: false, message: 'Campos requeridos' };
  }
  // ...
}
```

### Expected State
```typescript
import { z } from 'zod';

const CreatePetSchema = z.object({
  name: z.string().min(1, 'Nombre es requerido').max(50),
  species: z.enum(['dog', 'cat', 'bird', 'rabbit', 'other'], {
    errorMap: () => ({ message: 'Especie inválida' })
  }),
  breed: z.string().max(50).optional(),
  birthDate: z.string().optional().transform(v => v ? new Date(v) : undefined),
  weight: z.coerce.number().min(0).max(500).optional(),
  microchipId: z.string().max(20).optional(),
});

export async function createPet(prevState: ActionState, formData: FormData) {
  const rawData = Object.fromEntries(formData);
  const result = CreatePetSchema.safeParse(rawData);

  if (!result.success) {
    return {
      success: false,
      message: 'Datos inválidos',
      errors: result.error.flatten().fieldErrors,
    };
  }

  const { name, species, breed, birthDate, weight, microchipId } = result.data;
  // Safe to use
}
```

### Files Affected
- `web/app/actions/create-pet.ts`
- `web/app/actions/update-pet.ts`
- `web/app/actions/create-appointment.ts`
- `web/app/actions/add-vaccine.ts`
- `web/app/actions/create-prescription.ts`
- `web/app/actions/create-record.ts`
- All other Server Action files
- `web/lib/schemas/` (shared schemas)

### Acceptance Criteria
- [ ] Zod schema for each Server Action
- [ ] Field-level error messages in Spanish
- [ ] Errors returned in `errors` object for form display
- [ ] Shared schemas with API routes where applicable

---

## ARCH-009: Colocate Server Actions with Features

**Priority**: 🟡 MEDIUM
**Effort**: L
**Category**: Code Organization

### Description
All Server Actions are in a centralized `app/actions/` folder instead of being colocated with their features.

### Current State
```
app/actions/
├── create-pet.ts
├── update-pet.ts
├── delete-pet.ts
├── create-appointment.ts
├── add-vaccine.ts
└── ... (19 files)
```

### Expected State
```
app/[clinic]/portal/pets/
├── page.tsx
├── actions.ts          # Pet-related actions
├── new/
│   ├── page.tsx
│   └── actions.ts      # Or import from parent
└── [id]/
    ├── page.tsx
    └── edit/
        └── page.tsx

app/[clinic]/portal/appointments/
├── page.tsx
└── actions.ts          # Appointment actions

app/[clinic]/portal/vaccines/
├── page.tsx
└── actions.ts          # Vaccine actions
```

### Files Affected
- All files in `web/app/actions/`
- Feature directories in `web/app/[clinic]/portal/`
- Import statements in pages

### Acceptance Criteria
- [ ] Actions moved to feature directories
- [ ] Imports updated across codebase
- [ ] `app/actions/` directory removed
- [ ] Actions still work correctly

---

## ARCH-010: Create Service Layer for Data Access

**Priority**: 🟡 MEDIUM
**Effort**: L
**Category**: Architecture

### Description
Database queries are scattered throughout pages, components, and API routes. Need a service layer for reusability and testability.

### Current State
```typescript
// Scattered queries in multiple files
// In page.tsx:
const { data: pets } = await supabase.from('pets').select('*').eq('owner_id', userId);

// In another file, same query:
const { data: pets } = await supabase.from('pets').select('*').eq('owner_id', userId);
```

### Expected State
```typescript
// lib/services/pet-service.ts
export const PetService = {
  async getByOwner(ownerId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('pets')
      .select('*, vaccines(*), medical_records(*)')
      .eq('owner_id', ownerId)
      .order('name');

    if (error) throw new DatabaseError('Failed to fetch pets', error);
    return data;
  },

  async getByTenant(tenantId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('pets')
      .select('*, owner:profiles(full_name, email)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw new DatabaseError('Failed to fetch pets', error);
    return data;
  },

  async create(data: PetInsert) {
    const supabase = await createClient();
    const { data: pet, error } = await supabase
      .from('pets')
      .insert(data)
      .select()
      .single();

    if (error) throw new DatabaseError('Failed to create pet', error);
    return pet;
  },

  async update(id: string, data: PetUpdate) {
    // ...
  },

  async delete(id: string) {
    // ...
  },
};

// Usage:
const pets = await PetService.getByOwner(userId);
```

### Files Affected
- `web/lib/services/pet-service.ts` (new)
- `web/lib/services/appointment-service.ts` (new)
- `web/lib/services/vaccine-service.ts` (new)
- `web/lib/services/product-service.ts` (new)
- `web/lib/services/index.ts` (new)
- Pages and API routes using direct queries

### Acceptance Criteria
- [ ] Service files created for main entities
- [ ] Consistent error handling
- [ ] Type-safe inputs and outputs
- [ ] Pages refactored to use services
- [ ] Unit tests for services

---

## ARCH-011: Fix N+1 Query Patterns

**Priority**: 🟠 HIGH
**Effort**: M
**Category**: Performance

### Description
Some code fetches related data in loops, causing N+1 query problems.

### Current State
```typescript
// Found in dashboard and list pages
const pets = await getPets();
for (const pet of pets) {
  pet.vaccines = await getVaccines(pet.id);      // N queries!
  pet.lastVisit = await getLastVisit(pet.id);   // N more queries!
}
```

### Expected State
```typescript
// Single query with joins
const { data: pets } = await supabase
  .from('pets')
  .select(`
    *,
    vaccines (
      id,
      vaccine_name,
      date_administered,
      next_due
    ),
    medical_records (
      id,
      record_type,
      created_at
    )
  `)
  .eq('owner_id', userId)
  .order('name');

// Or use RPC for complex aggregations
const { data } = await supabase.rpc('get_pets_with_stats', {
  owner_id: userId
});
```

### Files Affected
- `web/app/[clinic]/portal/dashboard/page.tsx`
- `web/app/[clinic]/portal/pets/page.tsx`
- `web/app/[clinic]/dashboard/page.tsx`
- Any page with lists and related data

### Acceptance Criteria
- [ ] All N+1 patterns identified
- [ ] Queries consolidated with joins
- [ ] Complex aggregations moved to RPCs
- [ ] Query count reduced by 80%+

---

## ARCH-012: Add API Request Logging

**Priority**: 🟡 MEDIUM
**Effort**: M
**Category**: Observability

### Description
No structured logging for API requests, making debugging and monitoring difficult.

### Current State
```typescript
// Scattered console.log statements
console.log('Creating pet:', data);
console.error('Error:', error);
```

### Expected State
```typescript
// lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
});

// lib/api/with-logging.ts
export function withLogging<T>(
  handler: (req: NextRequest) => Promise<NextResponse<T>>
) {
  return async (req: NextRequest) => {
    const requestId = crypto.randomUUID();
    const start = Date.now();

    logger.info({
      requestId,
      method: req.method,
      url: req.url,
      userAgent: req.headers.get('user-agent'),
    }, 'API request started');

    try {
      const response = await handler(req);

      logger.info({
        requestId,
        status: response.status,
        duration: Date.now() - start,
      }, 'API request completed');

      return response;
    } catch (error) {
      logger.error({
        requestId,
        error: error.message,
        stack: error.stack,
        duration: Date.now() - start,
      }, 'API request failed');

      throw error;
    }
  };
}
```

### Files Affected
- `web/lib/logger.ts` (new)
- `web/lib/api/with-logging.ts` (new)
- All API routes

### Acceptance Criteria
- [ ] Structured logging library installed
- [ ] Request/response logging middleware
- [ ] Correlation IDs for tracing
- [ ] No console.log in production code
- [ ] Log levels configurable

---

# Category 3: Frontend / Component Issues

## ARCH-013: Split Oversized Components

**Priority**: 🟠 HIGH
**Effort**: L
**Category**: Maintainability

### Description
Several components exceed 300+ lines, making them hard to maintain and test.

### Current State
```
Components exceeding size limits:
- app/[clinic]/portal/dashboard/page.tsx (400+ lines)
- app/[clinic]/store/client.tsx (350+ lines)
- components/booking/booking-wizard.tsx (450+ lines)
- app/[clinic]/drug_dosages/page.tsx (300+ lines)
```

### Expected State
```
app/[clinic]/portal/dashboard/
├── page.tsx                    # ~50 lines (orchestration)
├── components/
│   ├── stats-section.tsx       # ~80 lines
│   ├── pets-section.tsx        # ~100 lines
│   ├── appointments-section.tsx # ~80 lines
│   └── quick-actions.tsx       # ~60 lines
└── loading.tsx

components/booking/
├── booking-wizard.tsx          # ~100 lines (orchestration)
├── steps/
│   ├── service-step.tsx        # ~80 lines
│   ├── datetime-step.tsx       # ~100 lines
│   ├── pet-step.tsx            # ~80 lines
│   └── confirm-step.tsx        # ~80 lines
├── components/
│   ├── time-slot-picker.tsx
│   └── service-card.tsx
└── hooks/
    └── use-booking-state.ts
```

### Files Affected
- `web/app/[clinic]/portal/dashboard/page.tsx`
- `web/app/[clinic]/store/client.tsx`
- `web/components/booking/booking-wizard.tsx`
- `web/app/[clinic]/drug_dosages/page.tsx`

### Acceptance Criteria
- [ ] No component exceeds 200 lines
- [ ] Clear separation of concerns
- [ ] Each component has single responsibility
- [ ] Props interfaces documented
- [ ] Unit tests for extracted components

---

## ARCH-014: Standardize Props Interface Pattern

**Priority**: 🟡 MEDIUM
**Effort**: S
**Category**: Consistency

### Description
Props are defined inconsistently across components (interface vs type, named vs inline).

### Current State
```typescript
// Mixed patterns found:
interface Props { clinic: string }
type Props = { clinic: string }
function Component({ clinic }: { clinic: string }) {}
```

### Expected State
```typescript
// Standard pattern for all components:
interface ServiceCardProps {
  /** The service to display */
  service: Service;
  /** Optional click handler for booking */
  onBook?: (serviceId: string) => void;
  /** Show compact version */
  compact?: boolean;
}

export function ServiceCard({
  service,
  onBook,
  compact = false
}: ServiceCardProps) {
  // ...
}
```

### Files Affected
- All component files in `web/components/`
- All page components in `web/app/`

### Acceptance Criteria
- [ ] All components use `interface ComponentNameProps`
- [ ] Props documented with JSDoc comments
- [ ] Default values defined in destructuring
- [ ] No inline prop type definitions

---

## ARCH-015: Fix Props Drilling

**Priority**: 🟡 MEDIUM
**Effort**: M
**Category**: Architecture

### Description
Some component trees pass the same props through multiple levels unnecessarily.

### Current State
```typescript
<Layout clinic={clinic} user={user}>
  <Dashboard clinic={clinic} user={user}>
    <StatsSection clinic={clinic} user={user}>
      <StatCard clinic={clinic} />
    </StatsSection>
  </Dashboard>
</Layout>
```

### Expected State
```typescript
// Option 1: Context
const ClinicContext = createContext<ClinicContextType | null>(null);

export function useClinic() {
  const ctx = useContext(ClinicContext);
  if (!ctx) throw new Error('useClinic must be within ClinicProvider');
  return ctx;
}

// In layout:
<ClinicContext.Provider value={{ clinic, user }}>
  <Dashboard />
</ClinicContext.Provider>

// In any nested component:
function StatCard() {
  const { clinic } = useClinic();
  // ...
}

// Option 2: Composition
<Dashboard>
  {({ clinic, user }) => (
    <StatsSection clinic={clinic} user={user} />
  )}
</Dashboard>
```

### Files Affected
- `web/context/clinic-context.tsx` (new or enhance existing)
- Components with 3+ levels of prop drilling

### Acceptance Criteria
- [ ] ClinicContext provides common data
- [ ] No props passed through 3+ levels
- [ ] Hooks for accessing context data
- [ ] Components simplified

---

## ARCH-016: Add Component Error Boundaries

**Priority**: 🟠 HIGH
**Effort**: M
**Category**: Reliability

### Description
Only global error boundaries exist. Individual component failures can crash entire pages.

### Current State
```typescript
// Only these exist:
app/error.tsx           // Global error
app/[clinic]/error.tsx  // Clinic error
```

### Expected State
```typescript
// components/error-boundary.tsx
'use client';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Component error:', error, info);
    // Send to error tracking service
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Usage in pages:
<ErrorBoundary fallback={<StatsFallback />}>
  <StatsSection />
</ErrorBoundary>

<ErrorBoundary fallback={<ChartFallback />}>
  <GrowthChart data={data} />
</ErrorBoundary>
```

### Files Affected
- `web/components/error-boundary.tsx` (new)
- Dashboard pages
- Pages with charts/complex visualizations
- Clinical tool pages

### Acceptance Criteria
- [ ] Reusable ErrorBoundary component
- [ ] Fallback UI for failed sections
- [ ] Error logging to service
- [ ] Critical sections wrapped
- [ ] Page remains usable when section fails

---

## ARCH-017: Add Loading States to All Routes

**Priority**: 🟠 HIGH
**Effort**: M
**Category**: UX

### Description
Many routes missing `loading.tsx`, causing blank screens during navigation.

### Current State
```
Routes missing loading.tsx:
- app/[clinic]/portal/pets/
- app/[clinic]/portal/appointments/
- app/[clinic]/store/
- app/[clinic]/services/
- app/[clinic]/dashboard/
- ... many more
```

### Expected State
```typescript
// app/[clinic]/portal/pets/loading.tsx
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Skeleton className="h-10 w-48 mb-6" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-xl border p-4">
            <Skeleton className="h-32 w-full mb-4" />
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Files Affected
All route directories under `web/app/[clinic]/`

### Acceptance Criteria
- [ ] Every route has loading.tsx
- [ ] Skeletons match page layout
- [ ] Consistent loading patterns
- [ ] No blank screens during navigation

---

## ARCH-018: Replace img with next/image

**Priority**: 🔴 CRITICAL
**Effort**: M
**Category**: Performance

### Description
HTML `<img>` tags are used instead of Next.js Image component, missing optimization.

### Current State
```typescript
// Found in multiple components
<img
  src={pet.photo_url}
  alt={pet.name}
  className="w-full h-48 object-cover"
/>
```

### Expected State
```typescript
import Image from 'next/image';

<Image
  src={pet.photo_url || '/placeholder-pet.jpg'}
  alt={pet.name}
  width={400}
  height={300}
  className="w-full h-48 object-cover"
  placeholder="blur"
  blurDataURL={BLUR_PLACEHOLDER}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
/>
```

### Files Affected
- `web/components/pets/pet-card.tsx`
- `web/components/pets/pet-profile.tsx`
- `web/components/store/product-card.tsx`
- `web/app/[clinic]/about/page.tsx`
- All components with images

### Acceptance Criteria
- [ ] All `<img>` replaced with `<Image>`
- [ ] Proper width/height specified
- [ ] Placeholder blur implemented
- [ ] Responsive sizes configured
- [ ] Remote patterns configured in next.config

---

## ARCH-019: Fix Hardcoded Colors

**Priority**: 🟠 HIGH
**Effort**: M
**Category**: Theming

### Description
Some components use hardcoded Tailwind colors instead of theme CSS variables.

### Current State
```typescript
// Found violations:
className="bg-blue-600"      // app/global/stats/page.tsx
className="text-gray-500"    // Multiple files
className="border-gray-200"  // Multiple files
className="bg-green-500"     // Success states
className="bg-red-500"       // Error states
```

### Expected State
```typescript
// Use CSS variables
className="bg-[var(--primary)]"
className="text-[var(--text-secondary)]"
className="border-[var(--border)]"
className="bg-[var(--status-success)]"
className="bg-[var(--status-error)]"

// Or add to theme.json if missing
{
  "colors": {
    "status": {
      "success": "#22c55e",
      "warning": "#f59e0b",
      "error": "#ef4444"
    },
    "border": {
      "default": "#e5e7eb",
      "strong": "#d1d5db"
    }
  }
}
```

### Files Affected
- `web/app/global/stats/page.tsx`
- Search for: `bg-blue`, `bg-gray`, `text-gray`, `border-gray`, `bg-green`, `bg-red`

### Acceptance Criteria
- [ ] All hardcoded colors found and replaced
- [ ] Theme variables added if missing
- [ ] No direct Tailwind color classes for themeable colors
- [ ] Theming works correctly for all clinics

---

## ARCH-020: Consolidate Duplicate Dashboard Routes

**Priority**: 🟠 HIGH
**Effort**: M
**Category**: Architecture

### Description
Two dashboard routes exist with overlapping functionality, causing confusion.

### Current State
```
app/[clinic]/dashboard/         # Staff dashboard
app/[clinic]/portal/dashboard/  # Owner dashboard (similar functionality)
```

### Expected State
```
app/[clinic]/portal/            # Pet owner authenticated area
├── dashboard/                  # Owner's pet dashboard
├── pets/
├── appointments/
└── ...

app/[clinic]/admin/             # Staff/admin authenticated area (renamed)
├── dashboard/                  # Staff clinic dashboard
├── patients/                   # All clinic pets
├── appointments/               # All clinic appointments
└── ...
```

### Files Affected
- `web/app/[clinic]/dashboard/` (rename to admin)
- `web/app/[clinic]/portal/dashboard/`
- Navigation links
- Auth redirects

### Acceptance Criteria
- [ ] Clear separation: `/portal` = owners, `/admin` = staff
- [ ] Old dashboard routes redirect
- [ ] Navigation updated
- [ ] Auth middleware enforces roles

---

# Category 4: Security Issues

## ARCH-021: Add Rate Limiting to Authentication

**Priority**: 🔴 CRITICAL
**Effort**: M
**Category**: Security

### Description
No rate limiting on authentication endpoints, allowing brute force attacks.

### Current State
```typescript
export async function login(formData: FormData) {
  const email = formData.get('email');
  const password = formData.get('password');
  // No rate limiting - unlimited attempts
  return supabase.auth.signInWithPassword({ email, password });
}
```

### Expected State
```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '15 m'), // 5 attempts per 15 min
  analytics: true,
});

export async function login(formData: FormData) {
  const ip = headers().get('x-forwarded-for') || 'unknown';
  const { success, limit, remaining, reset } = await ratelimit.limit(`login:${ip}`);

  if (!success) {
    return {
      success: false,
      message: 'Demasiados intentos. Intente en 15 minutos.',
      retryAfter: reset,
    };
  }

  // Proceed with login...
}
```

### Files Affected
- `web/app/actions/auth/login.ts`
- `web/app/actions/auth/signup.ts`
- `web/app/api/auth/*/route.ts`
- Environment variables for Upstash

### Acceptance Criteria
- [ ] Rate limiting on login (5 per 15 min per IP)
- [ ] Rate limiting on signup (3 per hour per IP)
- [ ] Rate limiting on password reset
- [ ] Clear error messages with retry time
- [ ] Logging of rate limit hits

---

## ARCH-022: Add File Upload Security

**Priority**: 🔴 CRITICAL
**Effort**: M
**Category**: Security

### Description
File uploads lack proper validation for type and content.

### Current State
```typescript
const photoFile = formData.get('photo') as File;
if (photoFile && photoFile.size > 0) {
  await supabase.storage.from('pet-photos').upload(path, photoFile);
}
```

### Expected State
```typescript
import { fileTypeFromBuffer } from 'file-type';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

async function validateFile(file: File): Promise<{ valid: boolean; error?: string }> {
  // Size check
  if (file.size > MAX_SIZE) {
    return { valid: false, error: 'Archivo muy grande (máx 5MB)' };
  }

  // MIME type check
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'Tipo de archivo no permitido' };
  }

  // Magic byte verification
  const buffer = await file.arrayBuffer();
  const type = await fileTypeFromBuffer(buffer);

  if (!type || !ALLOWED_TYPES.includes(type.mime)) {
    return { valid: false, error: 'Contenido de archivo inválido' };
  }

  return { valid: true };
}

// Usage:
const validation = await validateFile(photoFile);
if (!validation.valid) {
  return { success: false, message: validation.error };
}
```

### Files Affected
- `web/lib/validation/file-validation.ts` (new)
- `web/app/actions/create-pet.ts`
- `web/app/actions/update-pet.ts`
- `web/app/api/upload/route.ts`
- Any file handling action/route

### Acceptance Criteria
- [ ] File size validation (5MB max)
- [ ] MIME type validation
- [ ] Magic byte verification
- [ ] Consistent error messages
- [ ] Validation in all upload locations

---

## ARCH-023: Remove Sensitive Data from Logs

**Priority**: 🔴 CRITICAL
**Effort**: S
**Category**: Security

### Description
Console.log statements may expose sensitive data in production.

### Current State
```typescript
// Found in various files:
console.log('User data:', userData);
console.log('Profile:', profile);
console.log('Creating pet:', petData);
```

### Expected State
```typescript
// Remove all console.log with sensitive data
// Or use structured logger that redacts PII

import { logger } from '@/lib/logger';

// Good: No PII
logger.info({ petId: pet.id }, 'Pet created');

// Never log:
// - Passwords
// - Email addresses
// - Full names
// - Phone numbers
// - Medical data
```

### Files Affected
- Search entire codebase for `console.log`
- All files with logging statements

### Acceptance Criteria
- [ ] All console.log removed or replaced
- [ ] No PII in any log statements
- [ ] Structured logger used
- [ ] Log levels appropriate

---

## ARCH-024: Add Security Headers

**Priority**: 🟠 HIGH
**Effort**: S
**Category**: Security

### Description
Missing security headers that protect against common attacks.

### Current State
Default Next.js headers only.

### Expected State
```javascript
// next.config.mjs
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
];

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};
```

### Files Affected
- `web/next.config.mjs`

### Acceptance Criteria
- [ ] All security headers added
- [ ] Headers verified in browser dev tools
- [ ] Security scanner passes (Mozilla Observatory)

---

## ARCH-025: Implement Audit Logging

**Priority**: 🟠 HIGH
**Effort**: L
**Category**: Security/Compliance

### Description
No audit trail for sensitive operations like medical record access and prescription creation.

### Current State
No audit logging.

### Expected State
```sql
-- Database table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
```

```typescript
// lib/audit.ts
export async function logAudit(params: {
  action: 'create' | 'read' | 'update' | 'delete';
  entityType: string;
  entityId?: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  await supabase.from('audit_logs').insert({
    user_id: user?.id,
    tenant_id: profile.tenant_id,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId,
    old_data: params.oldData,
    new_data: params.newData,
    ip_address: headers().get('x-forwarded-for'),
    user_agent: headers().get('user-agent'),
  });
}

// Usage:
await logAudit({
  action: 'create',
  entityType: 'prescription',
  entityId: prescription.id,
  newData: prescriptionData,
});
```

### Files Affected
- `web/db/XX_add_audit_logs.sql` (new migration)
- `web/lib/audit.ts` (enhance existing)
- Server Actions for sensitive operations
- API routes for sensitive operations

### Acceptance Criteria
- [ ] Audit table created with RLS
- [ ] Logging function created
- [ ] Logged actions: prescriptions, medical records, role changes, pet transfers
- [ ] Audit log viewer for admins
- [ ] Retention policy defined

---

## ARCH-026: Enable MFA for Staff Accounts

**Priority**: 🟡 MEDIUM
**Effort**: M
**Category**: Security

### Description
Staff accounts (vets, admins) should have MFA for additional security.

### Current State
Single-factor authentication only.

### Expected State
```typescript
// Require MFA enrollment for staff during onboarding
// Use Supabase MFA support

// Check MFA status
const { data: factors } = await supabase.auth.mfa.listFactors();
const hasTotp = factors?.totp?.length > 0;

// Require MFA for staff
if (['vet', 'admin'].includes(profile.role) && !hasTotp) {
  redirect('/auth/setup-mfa');
}

// MFA setup page
export default function SetupMFA() {
  const enrollMFA = async () => {
    const { data } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Authenticator App',
    });
    // Show QR code for data.totp.qr_code
  };
}
```

### Files Affected
- `web/app/auth/setup-mfa/page.tsx` (new)
- `web/app/[clinic]/portal/layout.tsx`
- `web/app/[clinic]/admin/layout.tsx`
- Auth middleware

### Acceptance Criteria
- [ ] MFA enrollment flow created
- [ ] Staff required to enable MFA
- [ ] MFA challenge on login
- [ ] Recovery codes generated
- [ ] Admin can reset user MFA

---

# Category 5: Performance Issues

## ARCH-027: Fix Lucide Icon Imports

**Priority**: 🔴 CRITICAL
**Effort**: S
**Category**: Bundle Size

### Description
Some files import all Lucide icons, adding ~200KB to the bundle.

### Current State
```typescript
import * as Icons from 'lucide-react';
// Or
import { icons } from 'lucide-react';
```

### Expected State
```typescript
// Named imports only
import { Dog, Cat, Calendar, Syringe, Home, User } from 'lucide-react';
```

### Files Affected
Find with: `grep -r "import \* as.*lucide" --include="*.tsx"`
Find with: `grep -r "from 'lucide-react'" --include="*.tsx"`

### Acceptance Criteria
- [ ] All wildcard imports removed
- [ ] Only used icons imported
- [ ] Bundle size reduced by ~180KB
- [ ] ESLint rule to prevent future violations

---

## ARCH-028: Dynamic Import Heavy Libraries

**Priority**: 🔴 CRITICAL
**Effort**: M
**Category**: Bundle Size

### Description
Heavy libraries loaded on all pages instead of dynamically imported.

### Current State
```typescript
import { PDFDownloadLink } from '@react-pdf/renderer';  // ~800KB
import { LineChart, BarChart } from 'recharts';         // ~500KB
```

### Expected State
```typescript
import dynamic from 'next/dynamic';

const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then(m => m.PDFDownloadLink),
  {
    ssr: false,
    loading: () => <Skeleton className="h-10 w-32" />
  }
);

const LineChart = dynamic(
  () => import('recharts').then(m => m.LineChart),
  {
    ssr: false,
    loading: () => <Skeleton className="h-64 w-full" />
  }
);
```

### Files Affected
- `web/components/prescriptions/prescription-pdf.tsx`
- `web/app/[clinic]/portal/pets/[id]/page.tsx`
- `web/components/clinical/growth-chart.tsx`
- `web/app/[clinic]/dashboard/page.tsx`
- Any file importing recharts or @react-pdf

### Acceptance Criteria
- [ ] @react-pdf/renderer dynamically imported
- [ ] recharts dynamically imported
- [ ] Loading states for dynamic components
- [ ] Initial JS bundle under 500KB
- [ ] Lighthouse performance score improved

---

## ARCH-029: Add Clinic Data Caching

**Priority**: 🟠 HIGH
**Effort**: M
**Category**: Performance

### Description
Clinic JSON data read from filesystem on every request without caching.

### Current State
```typescript
export async function getClinicData(slug: string) {
  const clinicDir = path.join(CONTENT_DIR, slug);
  // Reads files on every request
  const config = JSON.parse(fs.readFileSync(path.join(clinicDir, 'config.json')));
  // ... more file reads
}
```

### Expected State
```typescript
import { unstable_cache } from 'next/cache';

export const getClinicData = unstable_cache(
  async (slug: string): Promise<ClinicData | null> => {
    const clinicDir = path.join(CONTENT_DIR, slug);

    if (!fs.existsSync(clinicDir)) {
      return null;
    }

    // ... read files
    return data;
  },
  ['clinic-data'],
  {
    revalidate: 300, // 5 minutes
    tags: ['clinic-config'],
  }
);

// To invalidate when content changes:
import { revalidateTag } from 'next/cache';
revalidateTag('clinic-config');
```

### Files Affected
- `web/lib/clinics.ts`
- Build/deploy scripts (to trigger revalidation)

### Acceptance Criteria
- [ ] Clinic data cached for 5 minutes
- [ ] Cache tag for invalidation
- [ ] Response time reduced by 10x for cached data
- [ ] Revalidation on content change

---

## ARCH-030: Add Database Query Indexes

**Priority**: 🟠 HIGH
**Effort**: S
**Category**: Performance

### Description
Common query patterns missing database indexes.

### Current State
No indexes on frequently queried columns.

### Expected State
```sql
-- web/db/XX_add_performance_indexes.sql

-- Appointments by clinic and date (calendar view)
CREATE INDEX idx_appointments_clinic_date
ON appointments(clinic_slug, appointment_date);

-- Vaccines due soon (reminder queries)
CREATE INDEX idx_vaccines_next_due
ON vaccines(next_due)
WHERE next_due IS NOT NULL;

-- Medical records timeline
CREATE INDEX idx_medical_records_pet_date
ON medical_records(pet_id, created_at DESC);

-- Products by category (store filtering)
CREATE INDEX idx_products_tenant_category
ON store_products(tenant_id, category);

-- Pet search by owner
CREATE INDEX idx_pets_owner
ON pets(owner_id);

-- Inventory low stock alerts
CREATE INDEX idx_inventory_low_stock
ON store_inventory(product_id)
WHERE current_stock <= reorder_level;

-- Prescriptions by pet
CREATE INDEX idx_prescriptions_pet
ON prescriptions(pet_id, created_at DESC);

-- Loyalty points by user
CREATE INDEX idx_loyalty_user
ON loyalty_points(user_id);
```

### Files Affected
- `web/db/XX_add_performance_indexes.sql` (new migration)

### Acceptance Criteria
- [ ] Indexes created for common queries
- [ ] Query performance improved 5x+
- [ ] EXPLAIN ANALYZE confirms index usage
- [ ] No significant write performance impact

---

## ARCH-031: Implement Pagination

**Priority**: 🟠 HIGH
**Effort**: M
**Category**: Performance

### Description
Large lists load all data without pagination, causing memory and performance issues.

### Current State
```typescript
// Loads ALL products
const { data: products } = await supabase
  .from('store_products')
  .select('*')
  .eq('tenant_id', tenantId);
```

### Expected State
```typescript
const PAGE_SIZE = 20;

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
}

async function getProducts(
  tenantId: string,
  page: number = 0
): Promise<PaginatedResponse<Product>> {
  const { data, count, error } = await supabase
    .from('store_products')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    .order('created_at', { ascending: false });

  return {
    data: data || [],
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      totalCount: count || 0,
      totalPages: Math.ceil((count || 0) / PAGE_SIZE),
      hasMore: (page + 1) * PAGE_SIZE < (count || 0),
    },
  };
}
```

### Files Affected
- `web/app/[clinic]/store/page.tsx`
- `web/app/[clinic]/portal/pets/page.tsx`
- `web/app/[clinic]/admin/patients/page.tsx`
- `web/app/api/products/route.ts`
- All list pages and APIs

### Acceptance Criteria
- [ ] All lists paginated (20 items default)
- [ ] Pagination UI component created
- [ ] Infinite scroll option for mobile
- [ ] Total count displayed
- [ ] Memory usage stable for large datasets

---

## ARCH-032: Add Request Deduplication

**Priority**: 🟡 MEDIUM
**Effort**: M
**Category**: Performance

### Description
Same data may be fetched multiple times in component tree without deduplication.

### Current State
```typescript
// In layout.tsx
const clinicData = await getClinicData(clinic);

// In page.tsx (child)
const clinicData = await getClinicData(clinic);  // Duplicate!

// In component
const clinicData = await getClinicData(clinic);  // Triplicate!
```

### Expected State
```typescript
// Next.js 15 automatically dedupes fetch() calls
// For non-fetch functions, use React cache:

import { cache } from 'react';

export const getClinicData = cache(async (slug: string) => {
  // This will only run once per request
  const clinicDir = path.join(CONTENT_DIR, slug);
  // ...
});

// Or pass data via props/context instead of refetching
```

### Files Affected
- `web/lib/clinics.ts`
- Data fetching functions
- Consider using React Context for shared data

### Acceptance Criteria
- [ ] React cache wrapping data functions
- [ ] No duplicate fetches in request waterfall
- [ ] Network tab shows single requests
- [ ] Server logs confirm deduplication

---

## ARCH-033: Optimize Store Product Images

**Priority**: 🟡 MEDIUM
**Effort**: M
**Category**: Performance

### Description
Product images not optimized, causing slow page loads.

### Current State
Original images served without optimization.

### Expected State
```typescript
// next.config.mjs
module.exports = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },
};

// Component usage
<Image
  src={product.image_url}
  alt={product.name}
  width={300}
  height={300}
  placeholder="blur"
  blurDataURL={PRODUCT_BLUR}
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
  loading="lazy"
/>
```

### Files Affected
- `web/next.config.mjs`
- `web/components/store/product-card.tsx`
- `web/components/store/product-grid.tsx`
- All product image displays

### Acceptance Criteria
- [ ] Images served in WebP/AVIF
- [ ] Responsive sizes configured
- [ ] Lazy loading implemented
- [ ] Blur placeholder for all images
- [ ] LCP improved significantly

---

# Category 6: Accessibility Issues

## ARCH-034: Add ARIA Labels to Icon Buttons

**Priority**: 🔴 CRITICAL
**Effort**: S
**Category**: Accessibility

### Description
Icon-only buttons lack accessible names, making them unusable for screen reader users.

### Current State
```typescript
<button onClick={handleLogout}>
  <LogOut className="w-5 h-5" />
</button>

<button onClick={handleEdit}>
  <Pencil className="w-4 h-4" />
</button>
```

### Expected State
```typescript
<button onClick={handleLogout} aria-label="Cerrar sesión">
  <LogOut className="w-5 h-5" aria-hidden="true" />
</button>

<button onClick={handleEdit} aria-label="Editar mascota">
  <Pencil className="w-4 h-4" aria-hidden="true" />
</button>

// Or use visually hidden text:
<button onClick={handleLogout}>
  <LogOut className="w-5 h-5" aria-hidden="true" />
  <span className="sr-only">Cerrar sesión</span>
</button>
```

### Files Affected
- All components with icon-only buttons
- Navigation components
- Card action buttons
- Table row actions

### Acceptance Criteria
- [ ] All icon buttons have aria-label or sr-only text
- [ ] Labels in Spanish
- [ ] Icons have aria-hidden="true"
- [ ] Passes aXe accessibility audit

---

## ARCH-035: Add Skip Link to Layout

**Priority**: 🟠 HIGH
**Effort**: XS
**Category**: Accessibility

### Description
No skip link for keyboard users to bypass navigation.

### Current State
No skip link present.

### Expected State
```typescript
// app/[clinic]/layout.tsx
export default function ClinicLayout({ children }) {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:p-4 focus:rounded-lg focus:shadow-lg focus:text-[var(--primary)]"
      >
        Saltar al contenido principal
      </a>
      <MainNav />
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <Footer />
    </>
  );
}
```

### Files Affected
- `web/app/[clinic]/layout.tsx`
- `web/app/layout.tsx`

### Acceptance Criteria
- [ ] Skip link visible on focus
- [ ] Links to #main-content
- [ ] Main content has tabIndex={-1}
- [ ] Focus moves to main on activation

---

## ARCH-036: Add Form Error Announcements

**Priority**: 🟠 HIGH
**Effort**: S
**Category**: Accessibility

### Description
Form errors not announced to screen readers.

### Current State
```typescript
{error && (
  <span className="text-red-500 text-sm">{error}</span>
)}
```

### Expected State
```typescript
{error && (
  <span
    role="alert"
    aria-live="polite"
    className="text-[var(--status-error)] text-sm"
  >
    {error}
  </span>
)}

// Or for form-level errors:
<div role="alert" aria-live="assertive">
  {formError && (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
      <p className="text-[var(--status-error)]">{formError}</p>
    </div>
  )}
</div>

// Associate errors with inputs:
<input
  id="email"
  aria-describedby={error ? 'email-error' : undefined}
  aria-invalid={error ? 'true' : undefined}
/>
{error && (
  <span id="email-error" role="alert">
    {error}
  </span>
)}
```

### Files Affected
- All form components
- `web/components/forms/form-field.tsx`
- `web/components/ui/input.tsx`
- Server Action form pages

### Acceptance Criteria
- [ ] Errors have role="alert"
- [ ] Errors announced immediately
- [ ] Inputs linked via aria-describedby
- [ ] Invalid inputs have aria-invalid
- [ ] Screen reader testing passed

---

## ARCH-037: Add Focus Indicators

**Priority**: 🟠 HIGH
**Effort**: S
**Category**: Accessibility

### Description
Focus indicators missing or inconsistent, making keyboard navigation difficult.

### Current State
Some elements have no visible focus state.

### Expected State
```css
/* globals.css */
@layer utilities {
  .focus-ring {
    @apply focus-visible:outline-none
           focus-visible:ring-2
           focus-visible:ring-[var(--primary)]
           focus-visible:ring-offset-2;
  }
}

/* Apply to all interactive elements */
button, a, input, select, textarea, [tabindex]:not([tabindex="-1"]) {
  @apply focus-ring;
}
```

```typescript
// Or in components:
<button className="... focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2">
  Click me
</button>
```

### Files Affected
- `web/app/globals.css`
- `web/components/ui/button.tsx`
- `web/components/ui/input.tsx`
- All interactive components

### Acceptance Criteria
- [ ] All interactive elements have focus indicator
- [ ] Focus visible on keyboard navigation
- [ ] Focus uses theme color
- [ ] No focus on mouse click (focus-visible only)

---

## ARCH-038: Add ARIA Landmarks

**Priority**: 🟡 MEDIUM
**Effort**: S
**Category**: Accessibility

### Description
Page regions not identified with ARIA landmarks.

### Current State
Generic divs without roles.

### Expected State
```typescript
// layout.tsx
<nav aria-label="Navegación principal">
  {/* Nav content */}
</nav>

<main id="main-content">
  {children}
</main>

<aside aria-label="Filtros">
  {/* Sidebar filters */}
</aside>

<footer role="contentinfo">
  {/* Footer content */}
</footer>

// For multiple navs:
<nav aria-label="Navegación principal">...</nav>
<nav aria-label="Navegación de paginación">...</nav>
```

### Files Affected
- `web/app/[clinic]/layout.tsx`
- `web/components/layout/main-nav.tsx`
- Pages with sidebars/filters

### Acceptance Criteria
- [ ] All main regions have landmarks
- [ ] Multiple navs have unique labels
- [ ] Screen reader can navigate by landmarks
- [ ] Landmark audit passes

---

## ARCH-039: Improve Modal Accessibility

**Priority**: 🟡 MEDIUM
**Effort**: M
**Category**: Accessibility

### Description
Modals lack proper focus trapping and announcements.

### Current State
```typescript
// Basic modal without full a11y
function Modal({ isOpen, onClose, children }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50">
      <div className="modal-content">
        {children}
      </div>
    </div>
  );
}
```

### Expected State
```typescript
'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      modalRef.current?.focus();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      previousActiveElement.current?.focus();
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50"
    >
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={modalRef}
        tabIndex={-1}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl p-6 max-w-md w-full"
      >
        <h2 id="modal-title" className="text-xl font-semibold mb-4">
          {title}
        </h2>
        {children}
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-4 right-4"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>
    </div>,
    document.body
  );
}
```

### Files Affected
- `web/components/ui/modal.tsx`
- All modal usages

### Acceptance Criteria
- [ ] Focus trapped within modal
- [ ] Focus returns on close
- [ ] Escape key closes modal
- [ ] Background scroll prevented
- [ ] Proper ARIA attributes
- [ ] Announced to screen readers

---

## ARCH-040: Add Keyboard Navigation to Booking Wizard

**Priority**: 🟡 MEDIUM
**Effort**: M
**Category**: Accessibility

### Description
Booking wizard steps not navigable via keyboard.

### Current State
Steps only navigable by click.

### Expected State
```typescript
// Proper tablist pattern
<div role="tablist" aria-label="Pasos de reserva">
  {steps.map((step, index) => (
    <button
      key={step.id}
      role="tab"
      id={`step-tab-${index}`}
      aria-selected={currentStep === index}
      aria-controls={`step-panel-${index}`}
      tabIndex={currentStep === index ? 0 : -1}
      onClick={() => goToStep(index)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') goToStep(Math.min(index + 1, steps.length - 1));
        if (e.key === 'ArrowLeft') goToStep(Math.max(index - 1, 0));
      }}
      className={cn(
        'px-4 py-2',
        currentStep === index && 'font-bold border-b-2 border-[var(--primary)]'
      )}
    >
      {step.label}
    </button>
  ))}
</div>

{steps.map((step, index) => (
  <div
    key={step.id}
    role="tabpanel"
    id={`step-panel-${index}`}
    aria-labelledby={`step-tab-${index}`}
    hidden={currentStep !== index}
  >
    {step.content}
  </div>
))}
```

### Files Affected
- `web/components/booking/booking-wizard.tsx`
- `web/components/booking/steps/`

### Acceptance Criteria
- [ ] Steps navigable with arrow keys
- [ ] Proper tablist/tab/tabpanel roles
- [ ] Active step announced
- [ ] Tab focus management correct

---

# Category 7: Database Issues

## ARCH-041: Add Migration Rollback Scripts

**Priority**: 🟡 MEDIUM
**Effort**: M
**Category**: Database

### Description
No rollback scripts for database migrations.

### Current State
```
db/
├── 01_initial_schema.sql
├── 02_add_profiles.sql
└── ... (forward migrations only)
```

### Expected State
```
db/
├── migrations/
│   ├── 01_initial_schema.sql
│   └── 02_add_profiles.sql
├── rollbacks/
│   ├── 01_rollback_initial_schema.sql
│   └── 02_rollback_add_profiles.sql
└── README.md
```

```sql
-- db/rollbacks/02_rollback_add_profiles.sql
-- Rollback: Remove profiles table and related objects

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();
DROP POLICY IF EXISTS "Users view own profile" ON profiles;
DROP POLICY IF EXISTS "Users update own profile" ON profiles;
DROP TABLE IF EXISTS profiles;
```

### Files Affected
- `web/db/` structure
- Create rollback for each migration

### Acceptance Criteria
- [ ] Rollback script for each migration
- [ ] Rollbacks tested
- [ ] Documentation for rollback process
- [ ] CI validates rollback scripts exist

---

## ARCH-042: Add Migration Tracking Table

**Priority**: 🟡 MEDIUM
**Effort**: S
**Category**: Database

### Description
No tracking of which migrations have been applied.

### Current State
Manual tracking (if any).

### Expected State
```sql
-- First migration adds tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  checksum TEXT,
  execution_time_ms INTEGER
);

-- Each migration records itself
INSERT INTO schema_migrations (version, name, checksum)
VALUES ('001', 'initial_schema', 'abc123');
```

```typescript
// lib/db/migrate.ts
export async function runMigrations() {
  const applied = await getAppliedMigrations();
  const pending = migrations.filter(m => !applied.includes(m.version));

  for (const migration of pending) {
    const start = Date.now();
    await executeMigration(migration);
    await recordMigration(migration, Date.now() - start);
  }
}
```

### Files Affected
- `web/db/00_migration_tracking.sql` (new)
- `web/lib/db/migrate.ts` (new)
- Existing migration files (add version header)

### Acceptance Criteria
- [ ] Migration tracking table created
- [ ] All migrations recorded
- [ ] Duplicate migrations prevented
- [ ] Migration status queryable

---

## ARCH-043: Add Soft Deletes to More Tables

**Priority**: 🟡 MEDIUM
**Effort**: M
**Category**: Database

### Description
Some tables use hard deletes, losing data audit trail.

### Current State
```sql
DELETE FROM appointments WHERE id = $1;
```

### Expected State
```sql
-- Add deleted_at column
ALTER TABLE appointments ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE pets ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE medical_records ADD COLUMN deleted_at TIMESTAMPTZ;

-- Create index for soft delete queries
CREATE INDEX idx_appointments_not_deleted
ON appointments(id) WHERE deleted_at IS NULL;

-- Update RLS to exclude deleted
CREATE POLICY "staff_view_active" ON appointments FOR SELECT
  USING (is_staff_of(clinic_slug) AND deleted_at IS NULL);

-- Create soft delete function
CREATE OR REPLACE FUNCTION soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  NEW.deleted_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

```typescript
// In service layer
async function deleteAppointment(id: string) {
  const { error } = await supabase
    .from('appointments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
}

// Hard delete only for admins with explicit flag
async function permanentlyDelete(id: string, confirm: boolean) {
  if (!confirm) throw new Error('Must confirm permanent deletion');
  await supabase.from('appointments').delete().eq('id', id);
}
```

### Files Affected
- `web/db/XX_add_soft_deletes.sql` (new migration)
- Service layer delete functions
- API routes with DELETE methods

### Acceptance Criteria
- [ ] Soft delete on: appointments, pets, medical_records, prescriptions
- [ ] RLS updated to filter deleted
- [ ] Queries exclude deleted by default
- [ ] Admin can view/restore deleted
- [ ] Hard delete requires confirmation

---

## ARCH-044: Add Database Connection Pooling Config

**Priority**: 🟡 MEDIUM
**Effort**: S
**Category**: Performance

### Description
Database connections may not be optimally pooled for serverless.

### Current State
Default Supabase client configuration.

### Expected State
```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'x-client-info': 'vete-web',
        },
      },
    }
  );
}

// For connection pooling in production, use:
// Supabase Dashboard > Settings > Database > Connection Pooling
// Mode: Transaction (for serverless)
// Pool size: Based on expected concurrent users
```

### Files Affected
- `web/lib/supabase/server.ts`
- `web/lib/supabase/client.ts`
- Supabase dashboard configuration

### Acceptance Criteria
- [ ] Connection pooling enabled
- [ ] Transaction mode for serverless
- [ ] Client info header set
- [ ] Connection limits appropriate

---

# Category 8: Testing Issues

## ARCH-045: Add Unit Tests for Services

**Priority**: 🟠 HIGH
**Effort**: L
**Category**: Testing

### Description
Service layer (when created) needs unit tests.

### Current State
Minimal test coverage.

### Expected State
```typescript
// lib/services/__tests__/pet-service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PetService } from '../pet-service';
import { createClient } from '@/lib/supabase/server';

vi.mock('@/lib/supabase/server');

describe('PetService', () => {
  const mockSupabase = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    single: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
  });

  describe('getByOwner', () => {
    it('returns pets for owner', async () => {
      const mockPets = [{ id: '1', name: 'Max' }];
      mockSupabase.single.mockResolvedValue({ data: mockPets, error: null });

      const pets = await PetService.getByOwner('owner-123');

      expect(pets).toEqual(mockPets);
      expect(mockSupabase.from).toHaveBeenCalledWith('pets');
      expect(mockSupabase.eq).toHaveBeenCalledWith('owner_id', 'owner-123');
    });

    it('throws on database error', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'DB Error' }
      });

      await expect(PetService.getByOwner('owner-123'))
        .rejects.toThrow('Failed to fetch pets');
    });
  });

  describe('create', () => {
    it('creates pet with all fields', async () => {
      const petData = { name: 'Luna', species: 'cat', owner_id: '123' };
      mockSupabase.single.mockResolvedValue({ data: { id: '1', ...petData }, error: null });

      const pet = await PetService.create(petData);

      expect(pet.name).toBe('Luna');
      expect(mockSupabase.insert).toHaveBeenCalledWith(petData);
    });
  });
});
```

### Files Affected
- `web/lib/services/__tests__/` (new directory)
- Test files for each service

### Acceptance Criteria
- [ ] 80%+ coverage for service layer
- [ ] Error cases tested
- [ ] Mocking patterns established
- [ ] CI runs tests on PR

---

## ARCH-046: Add API Route Integration Tests

**Priority**: 🟠 HIGH
**Effort**: L
**Category**: Testing

### Description
API routes lack integration tests.

### Current State
No API tests.

### Expected State
```typescript
// tests/integration/api/pets.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('Pets API', () => {
  let supabase: SupabaseClient;
  let testUserId: string;
  let authToken: string;

  beforeAll(async () => {
    // Setup test user and get token
    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const { data: auth } = await supabase.auth.signUp({
      email: `test-${Date.now()}@example.com`,
      password: 'testpassword123',
    });
    testUserId = auth.user!.id;
    authToken = auth.session!.access_token;
  });

  afterAll(async () => {
    // Cleanup test data
    await supabase.from('pets').delete().eq('owner_id', testUserId);
    await supabase.auth.admin.deleteUser(testUserId);
  });

  describe('POST /api/pets', () => {
    it('creates a pet when authenticated', async () => {
      const response = await fetch('http://localhost:3000/api/pets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: 'Test Pet',
          species: 'dog',
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.name).toBe('Test Pet');
    });

    it('returns 401 without auth', async () => {
      const response = await fetch('http://localhost:3000/api/pets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test' }),
      });

      expect(response.status).toBe(401);
    });

    it('returns 400 for invalid data', async () => {
      const response = await fetch('http://localhost:3000/api/pets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({}), // Missing required fields
      });

      expect(response.status).toBe(400);
    });
  });
});
```

### Files Affected
- `web/tests/integration/api/` (new directory)
- Test files for each API endpoint

### Acceptance Criteria
- [ ] Tests for all critical API endpoints
- [ ] Auth scenarios covered
- [ ] Validation scenarios covered
- [ ] Test database used (not production)
- [ ] CI runs integration tests

---

## ARCH-047: Add E2E Tests for Critical Flows

**Priority**: 🟠 HIGH
**Effort**: L
**Category**: Testing

### Description
E2E tests needed for critical user flows.

### Current State
Minimal E2E coverage.

### Expected State
```typescript
// e2e/flows/booking.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Booking Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/adris/auth/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/adris/portal/dashboard');
  });

  test('complete booking flow', async ({ page }) => {
    // 1. Navigate to booking
    await page.goto('/adris/book');

    // 2. Select service
    await page.click('[data-testid="service-consultation"]');
    await page.click('button:has-text("Siguiente")');

    // 3. Select date/time
    await page.click('[data-testid="date-picker"]');
    await page.click('[data-testid="date-tomorrow"]');
    await page.click('[data-testid="time-slot-10:00"]');
    await page.click('button:has-text("Siguiente")');

    // 4. Select pet
    await page.click('[data-testid="pet-card-0"]');
    await page.click('button:has-text("Siguiente")');

    // 5. Confirm
    await expect(page.locator('[data-testid="booking-summary"]')).toBeVisible();
    await page.click('button:has-text("Confirmar Cita")');

    // 6. Verify success
    await expect(page.locator('text=Cita confirmada')).toBeVisible();
  });

  test('shows error for past date', async ({ page }) => {
    await page.goto('/adris/book');
    await page.click('[data-testid="service-consultation"]');
    await page.click('button:has-text("Siguiente")');

    // Try to select past date
    await page.click('[data-testid="date-yesterday"]');

    await expect(page.locator('text=fecha debe ser futura')).toBeVisible();
  });
});
```

### Files Affected
- `web/e2e/flows/` (new directory)
- Test files for: booking, pet management, auth, store

### Acceptance Criteria
- [ ] Booking flow tested
- [ ] Pet CRUD flow tested
- [ ] Auth flow tested
- [ ] Store checkout tested
- [ ] Tests run in CI
- [ ] Visual regression optional

---

# Category 9: Documentation Issues

## ARCH-048: Add JSDoc to Public Functions

**Priority**: 🟡 MEDIUM
**Effort**: M
**Category**: Documentation

### Description
Public functions lack JSDoc documentation.

### Current State
```typescript
export function calculateDosage(weight: number, dosagePerKg: number) {
  return weight * dosagePerKg;
}
```

### Expected State
```typescript
/**
 * Calculates medication dosage based on pet weight.
 *
 * @param weight - Pet weight in kilograms
 * @param dosagePerKg - Dosage per kilogram of body weight (mg/kg)
 * @returns Total dosage in milligrams
 * @example
 * ```typescript
 * const dose = calculateDosage(10, 5);
 * console.log(dose); // 50 (mg)
 * ```
 * @throws {Error} If weight is negative
 */
export function calculateDosage(weight: number, dosagePerKg: number): number {
  if (weight < 0) throw new Error('Weight cannot be negative');
  return weight * dosagePerKg;
}
```

### Files Affected
- All files in `web/lib/`
- Service layer functions
- Utility functions
- Exported component functions

### Acceptance Criteria
- [ ] All exported functions have JSDoc
- [ ] Parameters documented
- [ ] Return values documented
- [ ] Examples provided for complex functions
- [ ] TypeScript types complement (not duplicate) docs

---

## ARCH-049: Create API Documentation

**Priority**: 🟡 MEDIUM
**Effort**: M
**Category**: Documentation

### Description
API endpoints lack documentation.

### Current State
No API documentation.

### Expected State
```markdown
<!-- documentation/api/pets.md -->
# Pets API

## Endpoints

### GET /api/pets

Retrieve pets for the authenticated user.

**Authentication:** Required

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number (default: 0) |
| limit | number | No | Items per page (default: 20) |

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Max",
      "species": "dog",
      "breed": "Labrador",
      "birth_date": "2020-01-15",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 0,
    "pageSize": 20,
    "totalCount": 45,
    "totalPages": 3
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Not authenticated
- `500 Internal Server Error`: Database error

### POST /api/pets

Create a new pet.

**Authentication:** Required

**Request Body:**
```json
{
  "name": "Max",
  "species": "dog",
  "breed": "Labrador",
  "birth_date": "2020-01-15",
  "weight": 25.5,
  "microchip_id": "123456789"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "name": "Max",
  ...
}
```
```

### Files Affected
- `documentation/api/` (new directory)
- Docs for each API endpoint

### Acceptance Criteria
- [ ] All API endpoints documented
- [ ] Request/response examples
- [ ] Error codes listed
- [ ] Authentication requirements clear
- [ ] OpenAPI/Swagger spec optional

---

## ARCH-050: Add Component Documentation

**Priority**: 🟢 LOW
**Effort**: L
**Category**: Documentation

### Description
UI components lack usage documentation.

### Current State
No component documentation.

### Expected State
```markdown
<!-- documentation/components/button.md -->
# Button Component

A versatile button component with multiple variants and sizes.

## Import

```tsx
import { Button } from '@/components/ui/button';
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | 'primary' \| 'secondary' \| 'ghost' \| 'destructive' | 'primary' | Visual style |
| size | 'sm' \| 'md' \| 'lg' | 'md' | Button size |
| disabled | boolean | false | Disable button |
| loading | boolean | false | Show loading state |

## Examples

### Basic Usage
```tsx
<Button>Click me</Button>
```

### Variants
```tsx
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Delete</Button>
```

### With Loading State
```tsx
<Button loading>Processing...</Button>
```

## Accessibility

- Uses native `<button>` element
- Supports keyboard navigation
- Has focus-visible indicator
- Disabled state prevents interaction
```

### Files Affected
- `documentation/components/` (new directory)
- Or use Storybook

### Acceptance Criteria
- [ ] All UI components documented
- [ ] Props tables included
- [ ] Usage examples provided
- [ ] Accessibility notes included
- [ ] Consider Storybook for interactive docs

---

# Summary

## Ticket Count by Category

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| TypeScript/Build | 1 | 1 | 2 | 0 | 4 |
| Backend/API | 1 | 4 | 3 | 0 | 8 |
| Frontend/Components | 1 | 5 | 2 | 0 | 8 |
| Security | 3 | 3 | 0 | 0 | 6 |
| Performance | 2 | 4 | 1 | 0 | 7 |
| Accessibility | 1 | 4 | 2 | 0 | 7 |
| Database | 0 | 0 | 4 | 0 | 4 |
| Testing | 0 | 3 | 0 | 0 | 3 |
| Documentation | 0 | 0 | 2 | 1 | 3 |
| **Total** | **9** | **24** | **16** | **1** | **50** |

## Recommended Sprint Plan

### Sprint 1: Critical Issues (9 tickets)
- ARCH-001: Enable TypeScript Strict Build
- ARCH-005: Add Zod Validation to APIs
- ARCH-018: Replace img with next/image
- ARCH-021: Add Rate Limiting
- ARCH-022: Add File Upload Security
- ARCH-023: Remove Sensitive Logs
- ARCH-027: Fix Lucide Imports
- ARCH-028: Dynamic Import Heavy Libs
- ARCH-034: Add ARIA Labels

### Sprint 2: High Priority (12 tickets)
- ARCH-006: Auth Middleware Wrapper
- ARCH-007: Standardize API Errors
- ARCH-008: Zod for Server Actions
- ARCH-011: Fix N+1 Queries
- ARCH-013: Split Oversized Components
- ARCH-016: Component Error Boundaries
- ARCH-017: Add Loading States
- ARCH-019: Fix Hardcoded Colors
- ARCH-020: Consolidate Dashboards
- ARCH-024: Add Security Headers
- ARCH-025: Implement Audit Logging
- ARCH-030: Add Database Indexes

### Sprint 3: High Priority Continued (12 tickets)
- ARCH-029: Add Clinic Data Caching
- ARCH-031: Implement Pagination
- ARCH-035: Add Skip Link
- ARCH-036: Form Error Announcements
- ARCH-037: Focus Indicators
- ARCH-045: Unit Tests for Services
- ARCH-046: API Integration Tests
- ARCH-047: E2E Tests

### Sprint 4: Medium Priority (16 tickets)
- Remaining medium priority tickets

### Backlog
- Low priority tickets
- Documentation improvements

---

*Document generated: December 2024*
*Total tickets: 50*
