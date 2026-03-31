# Code Patterns Analysis

> **Scope**: Patterns, Anti-Patterns, Code Quality, Conventions, Best Practices
> **Date**: December 2024

---

## Executive Summary

This document catalogs the code patterns found throughout the Vete codebase, identifying both exemplary patterns to follow and anti-patterns to avoid. Use this as a reference when contributing to the project.

### Code Quality Score: 7/10

| Category | Score | Notes |
|----------|-------|-------|
| Consistency | 7/10 | Good overall, some deviations |
| Type Safety | 6/10 | Strict mode on, `any` usage found |
| Error Handling | 6/10 | Inconsistent patterns |
| Testing | 5/10 | Limited coverage |
| Documentation | 7/10 | Good README, sparse inline |

---

## 1. TypeScript Patterns

### 1.1 Good Patterns ✅

#### Interface Definition
```typescript
// ✅ Good: Clear interface with optional properties
interface PetFormData {
  name: string;
  species: 'dog' | 'cat' | 'bird' | 'other';
  breed?: string;
  birthDate?: Date;
  weight?: number;
  microchipId?: string;
}
```

#### Discriminated Unions
```typescript
// ✅ Good: Type-safe action results
type ActionResult =
  | { success: true; data: Pet }
  | { success: false; error: string };

function handleResult(result: ActionResult) {
  if (result.success) {
    console.log(result.data);  // TypeScript knows data exists
  } else {
    console.error(result.error);  // TypeScript knows error exists
  }
}
```

#### Generic Components
```typescript
// ✅ Good: Reusable typed components
interface ListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string;
}

function List<T>({ items, renderItem, keyExtractor }: ListProps<T>) {
  return (
    <ul>
      {items.map((item, index) => (
        <li key={keyExtractor(item)}>{renderItem(item, index)}</li>
      ))}
    </ul>
  );
}
```

#### Database Types from Supabase
```typescript
// ✅ Good: Generated types ensure type safety
import { Database } from '@/lib/supabase/database.types';

type Pet = Database['public']['Tables']['pets']['Row'];
type PetInsert = Database['public']['Tables']['pets']['Insert'];
type PetUpdate = Database['public']['Tables']['pets']['Update'];
```

### 1.2 Anti-Patterns Found ❌

#### Excessive `any` Usage
```typescript
// ❌ Bad: Found in multiple places
export interface ClinicData {
  config: ClinicConfig;
  theme: ClinicTheme;
  home: any;        // ❌ Should be typed
  services: any;    // ❌ Should be typed
  about: any;       // ❌ Should be typed
}

// ✅ Better: Define proper types
interface HomeContent {
  hero: {
    title: string;
    subtitle: string;
    cta: string;
  };
  features: Feature[];
  stats: Stat[];
}
```

#### Type Assertions Instead of Guards
```typescript
// ❌ Bad: Unsafe type assertion
const user = data as User;

// ✅ Better: Type guard
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
```

#### Ignored Build Errors
```typescript
// ❌ Bad: Found in next.config.mjs
typescript: {
  ignoreBuildErrors: true,  // ❌ This hides real issues
},
eslint: {
  ignoreDuringBuilds: true,  // ❌ This hides real issues
},

// ✅ Should be:
typescript: {
  ignoreBuildErrors: false,
},
eslint: {
  ignoreDuringBuilds: false,
},
```

---

## 2. React Patterns

### 2.1 Good Patterns ✅

#### Server Components by Default
```typescript
// ✅ Good: No 'use client' directive = Server Component
// app/[clinic]/services/page.tsx

import { getClinicData } from '@/lib/clinics';

export default async function ServicesPage({ params }: Props) {
  const clinicData = await getClinicData((await params).clinic);

  return (
    <div>
      {clinicData?.services.map((service: Service) => (
        <ServiceCard key={service.id} service={service} />
      ))}
    </div>
  );
}
```

#### Client Components with Boundary
```typescript
// ✅ Good: Clear client boundary
'use client';

import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

#### forwardRef Pattern
```typescript
// ✅ Good: Proper ref forwarding
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(inputStyles, error && errorStyles, className)}
        aria-invalid={error ? 'true' : undefined}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';
```

#### Composition Pattern
```typescript
// ✅ Good: Compound components
<Card>
  <Card.Header>
    <Card.Title>Pet Profile</Card.Title>
    <Card.Description>View your pet's information</Card.Description>
  </Card.Header>
  <Card.Content>
    {/* Content */}
  </Card.Content>
  <Card.Footer>
    <Button>Edit</Button>
  </Card.Footer>
</Card>
```

#### Custom Hooks
```typescript
// ✅ Good: Encapsulated logic
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    const valueToStore = value instanceof Function ? value(storedValue) : value;
    setStoredValue(valueToStore);
    window.localStorage.setItem(key, JSON.stringify(valueToStore));
  };

  return [storedValue, setValue] as const;
}
```

### 2.2 Anti-Patterns Found ❌

#### Inline Object Styles
```typescript
// ❌ Bad: Creates new object on every render
<div style={{ display: 'flex', justifyContent: 'center' }}>

// ✅ Better: Use Tailwind
<div className="flex justify-center">

// ✅ Or extract styles
const centeredStyles: CSSProperties = { display: 'flex', justifyContent: 'center' };
<div style={centeredStyles}>
```

#### Props Drilling
```typescript
// ❌ Bad: Passing props through multiple levels
<App clinic={clinic} user={user} theme={theme}>
  <Layout clinic={clinic} user={user} theme={theme}>
    <Dashboard clinic={clinic} user={user} theme={theme}>
      <Widget clinic={clinic} user={user} />
    </Dashboard>
  </Layout>
</App>

// ✅ Better: Use context or composition
const ClinicContext = createContext<ClinicContextType | null>(null);

function useClinic() {
  const context = useContext(ClinicContext);
  if (!context) throw new Error('useClinic must be within ClinicProvider');
  return context;
}
```

#### Overly Large Components
```typescript
// ❌ Bad: Components with 400+ lines
// Found in:
// - app/[clinic]/portal/dashboard/page.tsx (400+ lines)
// - app/[clinic]/store/client.tsx (350+ lines)
// - components/booking/booking-wizard.tsx (450+ lines)

// ✅ Better: Extract sub-components
// dashboard/page.tsx (main orchestration)
// dashboard/components/stats-section.tsx
// dashboard/components/pets-section.tsx
// dashboard/components/appointments-section.tsx
```

#### Missing Keys in Lists
```typescript
// ❌ Bad: Index as key
{items.map((item, index) => (
  <Item key={index} {...item} />  // ❌ Anti-pattern
))}

// ✅ Good: Stable unique key
{items.map((item) => (
  <Item key={item.id} {...item} />  // ✅ Correct
))}
```

#### useEffect for Data Fetching
```typescript
// ❌ Bad: Client-side data fetching in useEffect
'use client';

function PetList() {
  const [pets, setPets] = useState([]);

  useEffect(() => {
    fetch('/api/pets').then(r => r.json()).then(setPets);
  }, []);  // ❌ Race conditions, no error handling
}

// ✅ Better: Server Component
async function PetList() {
  const pets = await getPets();  // Server-side
  return <ul>{pets.map(/* ... */)}</ul>;
}

// ✅ Or: React Query / SWR for client
'use client';
function PetList() {
  const { data: pets, isLoading, error } = useQuery({
    queryKey: ['pets'],
    queryFn: () => fetch('/api/pets').then(r => r.json()),
  });
}
```

---

## 3. Next.js Patterns

### 3.1 Good Patterns ✅

#### Static Generation with Params
```typescript
// ✅ Good: Pre-render all clinic pages
export async function generateStaticParams() {
  const clinics = await getAllClinics();
  return clinics.map((clinic) => ({ clinic }));
}
```

#### Metadata Generation
```typescript
// ✅ Good: Dynamic SEO metadata
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { clinic } = await params;
  const clinicData = await getClinicData(clinic);

  return {
    title: clinicData?.config.name,
    description: clinicData?.config.tagline,
    openGraph: {
      title: clinicData?.config.name,
      description: clinicData?.config.tagline,
      images: [clinicData?.config.branding?.og_image_url || '/og-default.jpg'],
    },
  };
}
```

#### Server Actions
```typescript
// ✅ Good: Form handling with Server Actions
'use server';

export async function createPet(
  prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();

  // Validation
  const name = formData.get('name') as string;
  if (!name) {
    return { success: false, message: 'Nombre requerido' };
  }

  // Database operation
  const { error } = await supabase.from('pets').insert({ name });

  if (error) {
    return { success: false, message: 'Error al crear mascota' };
  }

  // Revalidate cache
  revalidatePath('/pets');
  return { success: true, message: 'Mascota creada' };
}
```

#### Route Handlers
```typescript
// ✅ Good: RESTful API routes
// app/api/pets/route.ts

export async function GET(request: NextRequest) {
  // List pets
}

export async function POST(request: NextRequest) {
  // Create pet
}

// app/api/pets/[id]/route.ts
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  // Get single pet
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  // Update pet
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  // Delete pet
}
```

### 3.2 Anti-Patterns Found ❌

#### Not Using notFound()
```typescript
// ❌ Bad: Returning null
export default async function PetPage({ params }: Props) {
  const pet = await getPet(params.id);
  if (!pet) return null;  // ❌ Shows blank page
}

// ✅ Good: Use notFound()
import { notFound } from 'next/navigation';

export default async function PetPage({ params }: Props) {
  const pet = await getPet(params.id);
  if (!pet) notFound();  // ✅ Shows 404 page
  return <PetProfile pet={pet} />;
}
```

#### Missing Error Handling in Server Actions
```typescript
// ❌ Bad: Unhandled errors crash
'use server';
export async function createPet(formData: FormData) {
  const { data } = await supabase.from('pets').insert({...});  // ❌ No error check
  redirect('/pets');  // ❌ May redirect on failure
}

// ✅ Good: Handle errors
'use server';
export async function createPet(prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const { data, error } = await supabase.from('pets').insert({...});
    if (error) {
      return { success: false, message: 'Error al crear mascota' };
    }
    revalidatePath('/pets');
    return { success: true, message: 'Mascota creada' };
  } catch (e) {
    return { success: false, message: 'Error inesperado' };
  }
}
```

---

## 4. Supabase Patterns

### 4.1 Good Patterns ✅

#### Auth Check Pattern
```typescript
// ✅ Good: Verify session server-side
const supabase = await createClient();
const { data: { user }, error } = await supabase.auth.getUser();

if (!user) {
  redirect('/auth/login');
}
```

#### RLS-First Queries
```typescript
// ✅ Good: Let RLS handle filtering
// RLS policy ensures tenant isolation
const { data: pets } = await supabase
  .from('pets')
  .select('*');  // RLS filters by tenant automatically
```

#### Eager Loading with Select
```typescript
// ✅ Good: Single query with relations
const { data: pet } = await supabase
  .from('pets')
  .select(`
    *,
    owner:profiles(id, full_name, email),
    vaccines(*),
    medical_records(*)
  `)
  .eq('id', petId)
  .single();
```

#### Proper Insert/Update Pattern
```typescript
// ✅ Good: Return inserted data
const { data: pet, error } = await supabase
  .from('pets')
  .insert({
    name: 'Max',
    species: 'dog',
    owner_id: userId,
    tenant_id: tenantId,
  })
  .select()  // Return the inserted row
  .single();
```

### 4.2 Anti-Patterns Found ❌

#### Using getSession Instead of getUser
```typescript
// ❌ Bad: Session not validated against database
const { data: { session } } = await supabase.auth.getSession();

// ✅ Good: User validated against auth database
const { data: { user } } = await supabase.auth.getUser();
```

#### Hardcoded Tenant IDs
```typescript
// ❌ Bad: Hardcoded tenant
const { data } = await supabase.rpc('get_stats', { clinic_id: 'adris' });  // ❌

// ✅ Good: Dynamic tenant
const { data: profile } = await supabase
  .from('profiles')
  .select('tenant_id')
  .eq('id', user.id)
  .single();

const { data } = await supabase.rpc('get_stats', { clinic_id: profile.tenant_id });
```

#### No Error Handling
```typescript
// ❌ Bad: Ignoring potential errors
const { data } = await supabase.from('pets').select('*');
return data;  // Could be null or undefined

// ✅ Good: Handle errors
const { data, error } = await supabase.from('pets').select('*');
if (error) {
  console.error('Failed to fetch pets:', error);
  throw new Error('No se pudieron cargar las mascotas');
}
return data;
```

---

## 5. CSS/Styling Patterns

### 5.1 Good Patterns ✅

#### Theme Variables
```typescript
// ✅ Good: Using CSS variables
<button className="bg-[var(--primary)] text-[var(--primary-contrast)] hover:bg-[var(--primary-dark)]">
  Guardar
</button>
```

#### cn() Utility
```typescript
// ✅ Good: Merging classes safely
import { cn } from '@/lib/utils';

<div className={cn(
  'base-styles',
  isActive && 'active-styles',
  className
)}>
```

#### Responsive Design
```typescript
// ✅ Good: Mobile-first approach
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

### 5.2 Anti-Patterns Found ❌

#### Hardcoded Colors
```typescript
// ❌ Bad: Found in multiple files
className="bg-blue-600"      // Should be var(--primary)
className="text-gray-500"    // Should be var(--text-secondary)
className="border-gray-200"  // Should be var(--border)

// ✅ Good: Theme variables
className="bg-[var(--primary)]"
className="text-[var(--text-secondary)]"
className="border-[var(--border)]"
```

#### Inline Styles
```typescript
// ❌ Bad: Inline styles
<div style={{ marginTop: 20, padding: '1rem' }}>

// ✅ Good: Tailwind classes
<div className="mt-5 p-4">
```

#### Magic Numbers
```typescript
// ❌ Bad: Magic numbers
<div className="p-[23px] mt-[17px]">

// ✅ Good: Standard spacing scale
<div className="p-6 mt-4">
```

---

## 6. Error Handling Patterns

### 6.1 Good Patterns ✅

#### Server Action Error Pattern
```typescript
// ✅ Good: Consistent error return
interface ActionState {
  success: boolean;
  message: string;
  data?: any;
  errors?: Record<string, string[]>;
}

export async function createPet(prevState: ActionState | null, formData: FormData): Promise<ActionState> {
  try {
    // Validation
    if (!name) {
      return {
        success: false,
        message: 'Validación fallida',
        errors: { name: ['El nombre es requerido'] }
      };
    }

    // Operation
    const { error } = await supabase.from('pets').insert({...});
    if (error) {
      return { success: false, message: 'Error al guardar' };
    }

    return { success: true, message: 'Guardado exitosamente' };
  } catch (e) {
    return { success: false, message: 'Error inesperado' };
  }
}
```

#### API Route Error Pattern
```typescript
// ✅ Good: Consistent HTTP responses
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Validation
    const body = await request.json();
    if (!body.name) {
      return NextResponse.json(
        { error: 'Nombre requerido' },
        { status: 400 }
      );
    }

    // Success
    return NextResponse.json({ success: true, data });

  } catch (e) {
    console.error('API Error:', e);
    return NextResponse.json(
      { error: 'Error del servidor' },
      { status: 500 }
    );
  }
}
```

### 6.2 Anti-Patterns Found ❌

#### Silent Error Swallowing
```typescript
// ❌ Bad: Error swallowed
try {
  await doSomething();
} catch (e) {
  // Nothing - user has no idea what happened
}

// ✅ Good: Handle and communicate
try {
  await doSomething();
} catch (e) {
  console.error('Operation failed:', e);
  toast.error('No se pudo completar la operación');
}
```

#### Inconsistent Error Messages
```typescript
// ❌ Bad: Mixed languages, inconsistent format
return { error: 'Unauthorized' };
return { message: 'Error' };
return { error: 'No autorizado' };

// ✅ Good: Standardize
const ERRORS = {
  UNAUTHORIZED: { error: 'No autorizado', status: 401 },
  NOT_FOUND: { error: 'No encontrado', status: 404 },
  VALIDATION: { error: 'Datos inválidos', status: 400 },
} as const;

return NextResponse.json(ERRORS.UNAUTHORIZED, { status: 401 });
```

---

## 7. Testing Patterns

### 7.1 Current Testing State

```
tests/
├── unit/                   # Vitest unit tests
│   ├── utils.test.ts      # Utility function tests
│   └── ...
└── e2e/                    # Playwright E2E tests
    ├── auth.spec.ts       # Auth flow tests
    └── ...

Coverage: ~15% (estimated)
```

### 7.2 Good Testing Patterns ✅

#### Unit Test Structure
```typescript
// ✅ Good: Clear test structure
import { describe, it, expect } from 'vitest';
import { formatCurrency } from '@/lib/utils';

describe('formatCurrency', () => {
  it('formats numbers as Paraguayan Guarani', () => {
    expect(formatCurrency(50000)).toBe('50.000 ₲');
  });

  it('handles zero', () => {
    expect(formatCurrency(0)).toBe('0 ₲');
  });

  it('handles negative numbers', () => {
    expect(formatCurrency(-5000)).toBe('-5.000 ₲');
  });
});
```

#### E2E Test Pattern
```typescript
// ✅ Good: User-centric E2E tests
import { test, expect } from '@playwright/test';

test.describe('Pet Owner Portal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/adris/auth/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/adris/portal/dashboard');
  });

  test('can add a new pet', async ({ page }) => {
    await page.click('text=Agregar Mascota');
    await page.fill('[name="name"]', 'Luna');
    await page.selectOption('[name="species"]', 'cat');
    await page.click('button:has-text("Guardar")');
    await expect(page.locator('text=Luna')).toBeVisible();
  });
});
```

### 7.3 Missing Test Coverage ❌

```
❌ Server Actions - No tests
❌ API Routes - No tests
❌ Component unit tests - Sparse
❌ Integration tests - None
❌ Visual regression - None
```

---

## 8. File Organization Patterns

### 8.1 Good Patterns ✅

#### Feature-Based Structure
```
components/
├── clinical/      # Clinical tools
├── booking/       # Booking flow
├── pets/          # Pet management
└── store/         # E-commerce
```

#### Colocation in App Router
```
app/[clinic]/services/
├── page.tsx           # Page component
├── loading.tsx        # Loading UI
├── error.tsx          # Error boundary
├── not-found.tsx      # 404 page
└── [serviceId]/
    └── page.tsx       # Dynamic route
```

### 8.2 Anti-Patterns Found ❌

#### Centralized Actions
```
// ❌ Current: All actions in one place
app/actions/
├── create-pet.ts
├── update-pet.ts
├── create-vaccine.ts
└── ... (19 files)

// ✅ Better: Colocated with features
app/[clinic]/portal/pets/
├── page.tsx
├── actions.ts       # Pet-related actions here
└── components/
```

#### Growing lib Folder
```
// ❌ Current: Flat structure
lib/
├── clinics.ts
├── utils.ts
├── audit.ts
├── image-validation.ts
├── supabase/
└── types/

// ✅ Better: Organized
lib/
├── data/
│   └── clinics.ts
├── utils/
│   ├── format.ts
│   └── validation.ts
├── security/
│   ├── audit.ts
│   └── image-validation.ts
└── supabase/
```

---

## 9. Documentation Patterns

### 9.1 Good Patterns ✅

#### Comprehensive CLAUDE.md
The project has an excellent main documentation file covering:
- Architecture overview
- Technology stack
- Common commands
- Coding standards
- Security guidelines

#### Inline Type Documentation
```typescript
// ✅ Good: Self-documenting types
interface ClinicConfig {
  /** Unique identifier for the clinic */
  id: string;
  /** Display name of the clinic */
  name: string;
  /** Optional tagline for marketing */
  tagline?: string;
  /** Contact information */
  contact: {
    /** WhatsApp number with country code */
    whatsapp_number: string;
    /** Formatted phone for display */
    phone_display: string;
  };
}
```

### 9.2 Anti-Patterns Found ❌

#### Missing JSDoc on Functions
```typescript
// ❌ Bad: No documentation
export function calculateDosage(weight: number, dosagePerKg: number): number {
  return weight * dosagePerKg;
}

// ✅ Good: With JSDoc
/**
 * Calculates medication dosage based on pet weight
 * @param weight - Pet weight in kilograms
 * @param dosagePerKg - Dosage per kilogram of body weight
 * @returns Total dosage in milligrams
 * @example
 * const dose = calculateDosage(10, 5); // 50mg for a 10kg pet
 */
export function calculateDosage(weight: number, dosagePerKg: number): number {
  return weight * dosagePerKg;
}
```

---

## 10. Pattern Checklist

Use this checklist when writing new code:

### Component Checklist
```
[ ] TypeScript interface defined for props
[ ] Uses forwardRef if accepting ref
[ ] displayName set
[ ] Uses theme CSS variables (no hardcoded colors)
[ ] Accessible (ARIA labels, keyboard navigation)
[ ] Loading and error states handled
[ ] Mobile responsive
```

### API Route Checklist
```
[ ] Auth check at start
[ ] Input validation with proper errors
[ ] Tenant context from profile
[ ] Error handling with try/catch
[ ] Consistent error response format
[ ] Proper HTTP status codes
```

### Server Action Checklist
```
[ ] 'use server' directive
[ ] Returns ActionState type
[ ] Validates input data
[ ] Checks authentication
[ ] Uses revalidatePath for cache
[ ] Handles errors gracefully
```

### Database Query Checklist
```
[ ] Checks for errors
[ ] Uses RLS-compatible filters
[ ] Uses generated types
[ ] Handles null/undefined
[ ] Avoids N+1 with proper joins
```

---

## 11. Summary of Key Anti-Patterns to Avoid

| Anti-Pattern | Where Found | Fix |
|--------------|-------------|-----|
| `any` type usage | ClinicData, various | Define proper types |
| TypeScript errors ignored | next.config.mjs | Enable strict checks |
| Hardcoded colors | Multiple components | Use CSS variables |
| Hardcoded tenant IDs | Some API routes | Get from profile |
| Silent error swallowing | Various | Log and handle |
| Index as key | Some lists | Use stable ID |
| Props drilling | Some pages | Use context |
| Oversized components | Dashboard, booking | Extract components |
| Missing ARIA labels | Icon buttons | Add aria-label |
| useEffect for fetching | Some client components | Use Server Components |

---

*Document Version: 1.0*
*Last Updated: December 2024*
