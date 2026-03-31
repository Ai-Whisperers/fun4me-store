# Security & Performance Review

> **Scope**: Security Assessment, Performance Analysis, Optimization Recommendations
> **Date**: December 2024

---

## Executive Summary

This document provides a comprehensive security audit and performance analysis of the Vete veterinary platform. The platform implements solid security fundamentals through Supabase RLS and proper authentication, but has optimization opportunities for better performance at scale.

### Security Score: 8/10
### Performance Score: 6/10

---

# Part 1: Security Review

## 1. Authentication Security

### 1.1 Current Implementation

```
┌──────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. User submits credentials                                      │
│     └── POST /auth/login (Server Action)                         │
│                                                                   │
│  2. Supabase Auth validates                                       │
│     └── bcrypt password hashing                                  │
│     └── JWT token generation                                     │
│                                                                   │
│  3. Session established                                           │
│     └── HttpOnly cookie                                          │
│     └── Secure flag in production                                │
│     └── SameSite=Lax                                             │
│                                                                   │
│  4. Subsequent requests                                           │
│     └── supabase.auth.getUser() validates JWT                    │
│     └── Profile lookup for tenant_id                             │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 1.2 Security Strengths ✅

| Aspect | Status | Details |
|--------|--------|---------|
| Password Storage | ✅ Secure | bcrypt hashing via Supabase |
| Session Management | ✅ Secure | HttpOnly, Secure, SameSite cookies |
| JWT Validation | ✅ Good | Uses `getUser()` not `getSession()` |
| CSRF Protection | ✅ Built-in | Server Actions have CSRF tokens |
| SQL Injection | ✅ Safe | Parameterized queries via Supabase |

### 1.3 Security Gaps ❌

#### No Rate Limiting
```typescript
// ❌ Current: Unlimited login attempts
export async function login(formData: FormData) {
  const email = formData.get('email');
  const password = formData.get('password');
  // No rate limiting - brute force possible
  return supabase.auth.signInWithPassword({ email, password });
}

// ✅ Recommended: Add rate limiting
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '15 m'), // 5 attempts per 15 min
});

export async function login(formData: FormData) {
  const ip = headers().get('x-forwarded-for') || 'unknown';
  const { success, limit, remaining } = await ratelimit.limit(ip);

  if (!success) {
    return { error: 'Demasiados intentos. Intente más tarde.' };
  }
  // ... proceed with login
}
```

#### No Account Lockout
```typescript
// ❌ No tracking of failed attempts
// ✅ Should implement:
// - Lock after 5 failed attempts
// - Send email notification
// - Require CAPTCHA after 3 failures
```

#### Missing MFA Support
```typescript
// ❌ No multi-factor authentication
// ✅ Supabase supports MFA - should enable for staff accounts
```

---

## 2. Authorization Security

### 2.1 Row Level Security (RLS)

**Status: ✅ EXCELLENT**

Every table has RLS enabled with proper policies:

```sql
-- Example: pets table policies
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;

-- Staff can see all clinic pets
CREATE POLICY "staff_view_clinic_pets" ON pets FOR SELECT
  USING (is_staff_of(tenant_id));

-- Owners can see their own pets
CREATE POLICY "owner_view_own_pets" ON pets FOR SELECT
  USING (owner_id = auth.uid());

-- Staff can manage clinic pets
CREATE POLICY "staff_manage_clinic_pets" ON pets FOR ALL
  USING (is_staff_of(tenant_id));

-- Owners can only update their own pets
CREATE POLICY "owner_update_own_pets" ON pets FOR UPDATE
  USING (owner_id = auth.uid());
```

### 2.2 Helper Function

```sql
-- Centralized role check function
CREATE OR REPLACE FUNCTION is_staff_of(check_tenant_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND tenant_id = check_tenant_id
    AND role IN ('vet', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2.3 Authorization Gaps

#### Hardcoded Tenant IDs (FIXED)
```typescript
// ❌ Was found in code (now fixed):
await supabase.rpc('get_clinic_stats', { clinic_id: 'adris' });

// ✅ Now dynamic:
await supabase.rpc('get_clinic_stats', { clinic_id: profile.tenant_id });
```

#### No Role Hierarchy
```typescript
// ❌ Current: Flat role check
if (profile.role === 'admin' || profile.role === 'vet') {
  // Allow
}

// ✅ Better: Role hierarchy
const ROLE_HIERARCHY = {
  admin: ['admin', 'vet', 'owner'],
  vet: ['vet', 'owner'],
  owner: ['owner'],
};

function hasRole(userRole: string, requiredRole: string): boolean {
  return ROLE_HIERARCHY[userRole]?.includes(requiredRole) ?? false;
}
```

---

## 3. Data Security

### 3.1 Sensitive Data Handling

| Data Type | Storage | Encryption | Access Control |
|-----------|---------|------------|----------------|
| Passwords | Supabase Auth | bcrypt hash | N/A |
| PII (names, emails) | PostgreSQL | At-rest (Supabase) | RLS |
| Medical Records | PostgreSQL | At-rest (Supabase) | RLS - owner/staff only |
| Pet Photos | Supabase Storage | At-rest | Signed URLs |
| Prescriptions | PostgreSQL | At-rest (Supabase) | RLS - vet/admin only |

### 3.2 Security Strengths ✅

#### Signed URLs for Storage
```typescript
// ✅ Good: Time-limited signed URLs
const { data } = await supabase.storage
  .from('pet-photos')
  .createSignedUrl(path, 3600); // 1 hour expiry
```

#### No Direct Database Access
```typescript
// ✅ Good: All queries through Supabase client
// No raw SQL strings with user input
```

### 3.3 Security Gaps

#### Console.log with Sensitive Data
```typescript
// ❌ Found in some files:
console.log('User data:', userData);
console.log('Profile:', profile);

// ✅ Remove all console.log before production
// Or use structured logging without PII
```

#### Missing Audit Trail
```typescript
// ❌ No audit log for sensitive operations
// ✅ Should track:
// - Medical record access
// - Prescription creation
// - User role changes
// - Pet ownership transfers
```

---

## 4. Input Validation

### 4.1 Current State

**Status: ⚠️ NEEDS IMPROVEMENT**

```typescript
// ❌ Current: Manual validation
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { petId, date } = body;

  // Minimal validation
  if (!petId || !date) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
}
```

### 4.2 Recommended: Zod Validation

```typescript
import { z } from 'zod';

// ✅ Define schemas
const AppointmentSchema = z.object({
  petId: z.string().uuid('ID de mascota inválido'),
  serviceId: z.string().uuid('ID de servicio inválido'),
  date: z.string().datetime().refine(
    d => new Date(d) > new Date(),
    'La fecha debe ser futura'
  ),
  notes: z.string().max(500, 'Notas muy largas').optional(),
});

// ✅ Validate in API route
export async function POST(request: NextRequest) {
  const body = await request.json();

  const result = AppointmentSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({
      error: 'Datos inválidos',
      details: result.error.flatten().fieldErrors,
    }, { status: 400 });
  }

  // Safe to use result.data
}
```

### 4.3 Validation Gaps

| Area | Current | Risk | Fix |
|------|---------|------|-----|
| API Request Bodies | Manual checks | Medium | Add Zod schemas |
| File Uploads | Size only | High | Validate type, scan for malware |
| Form Data | Partial | Medium | Add Zod + form libraries |
| URL Parameters | None | Low | Add validation |
| Query Strings | None | Low | Add Zod schemas |

---

## 5. File Upload Security

### 5.1 Current Implementation

```typescript
// Current: Basic upload handling
const photoFile = formData.get('photo') as File;
if (photoFile && photoFile.size > 0) {
  await supabase.storage.from('pet-photos').upload(path, photoFile);
}
```

### 5.2 Security Gaps

#### No File Type Validation
```typescript
// ❌ Current: Accepts any file type
// ✅ Should validate:
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

if (!ALLOWED_TYPES.includes(file.type)) {
  return { error: 'Tipo de archivo no permitido' };
}

if (file.size > MAX_SIZE) {
  return { error: 'Archivo muy grande (máx 5MB)' };
}
```

#### No Content Inspection
```typescript
// ❌ Missing: Magic byte verification
// A .jpg file could contain malicious code

// ✅ Recommended: Verify file headers
import { fileTypeFromBuffer } from 'file-type';

const buffer = await file.arrayBuffer();
const type = await fileTypeFromBuffer(buffer);

if (!type || !ALLOWED_TYPES.includes(type.mime)) {
  return { error: 'Tipo de archivo inválido' };
}
```

---

## 6. API Security

### 6.1 Current Headers

```typescript
// Next.js default security headers
// Should add more in next.config.mjs
```

### 6.2 Recommended Security Headers

```typescript
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
    value: 'origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
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

---

## 7. Security Recommendations Summary

### 7.1 Critical (Do Immediately)

| Issue | Risk | Effort | Fix |
|-------|------|--------|-----|
| Add rate limiting to auth | HIGH | Medium | Upstash/Vercel KV |
| Add file type validation | HIGH | Low | Magic byte check |
| Remove console.log with PII | MEDIUM | Low | Search and remove |

### 7.2 High Priority (This Sprint)

| Issue | Risk | Effort | Fix |
|-------|------|--------|-----|
| Add Zod validation | MEDIUM | Medium | Schema for all APIs |
| Add security headers | MEDIUM | Low | next.config.mjs |
| Implement audit logging | MEDIUM | Medium | Create audit_logs table |

### 7.3 Medium Priority (Next Sprint)

| Issue | Risk | Effort | Fix |
|-------|------|--------|-----|
| Enable MFA for staff | LOW | Low | Supabase MFA |
| Add account lockout | LOW | Medium | Custom logic |
| Implement CSP properly | LOW | Medium | Test and refine |

---

# Part 2: Performance Review

## 8. Performance Analysis

### 8.1 Current Performance Bottlenecks

```
┌──────────────────────────────────────────────────────────────────┐
│                    PERFORMANCE ISSUES                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  BUNDLE SIZE                                                      │
│  ├── ❌ Lucide icons: Full library imports (~200KB)              │
│  ├── ❌ recharts: Heavy charting library (~500KB)                │
│  ├── ❌ @react-pdf/renderer: Loaded everywhere (~800KB)          │
│  └── Total JS: ~2MB (should be <500KB)                           │
│                                                                   │
│  IMAGE LOADING                                                    │
│  ├── ❌ Using <img> instead of next/image                        │
│  ├── ❌ No lazy loading                                          │
│  ├── ❌ No responsive images                                      │
│  └── ❌ Images not optimized (no WebP)                           │
│                                                                   │
│  DATA FETCHING                                                    │
│  ├── ❌ No caching layer                                          │
│  ├── ❌ JSON-CMS reads filesystem every request                  │
│  ├── ❌ No pagination on large lists                             │
│  └── ❌ No request deduplication                                 │
│                                                                   │
│  DATABASE                                                         │
│  ├── ⚠️ Missing indexes on common queries                        │
│  └── ⚠️ Some N+1 query patterns                                 │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 8.2 Estimated Impact

| Issue | Current Impact | After Fix |
|-------|----------------|-----------|
| Icon imports | +200KB JS | -180KB |
| recharts | +500KB JS | -400KB (code split) |
| @react-pdf | +800KB JS | 0KB (dynamic import) |
| Image optimization | 3s LCP | <1s LCP |
| Caching | 200ms DB queries | 10ms cache hits |
| Pagination | OOM on large data | Constant memory |

---

## 9. Bundle Size Optimization

### 9.1 Fix Lucide Icon Imports

```typescript
// ❌ Bad: Imports entire library
import * as Icons from 'lucide-react';
// This bundles ~200KB of icons

// ✅ Good: Named imports only
import { Dog, Cat, Calendar, Syringe } from 'lucide-react';
// This bundles only ~2KB per icon
```

**Action:** Run this to find violations:
```bash
grep -r "import \* as.*from 'lucide-react'" --include="*.tsx"
```

### 9.2 Code Split Heavy Libraries

```typescript
// ❌ Bad: Imports everywhere
import { PDFDownloadLink } from '@react-pdf/renderer';
import { LineChart, BarChart } from 'recharts';

// ✅ Good: Dynamic imports
import dynamic from 'next/dynamic';

const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then(m => m.PDFDownloadLink),
  { ssr: false, loading: () => <Skeleton className="w-32 h-10" /> }
);

const LineChart = dynamic(
  () => import('recharts').then(m => m.LineChart),
  { ssr: false, loading: () => <Skeleton className="h-64" /> }
);
```

### 9.3 Tree-Shake Lodash

```typescript
// ❌ Bad: Full lodash import
import _ from 'lodash';
_.merge(a, b);

// ✅ Good: Individual imports
import merge from 'lodash.merge';
merge(a, b);

// ✅ Better: Native alternatives
const merged = { ...a, ...b };
// Or structuredClone for deep merge
```

---

## 10. Image Optimization

### 10.1 Use Next.js Image Component

```typescript
// ❌ Bad: HTML img tag
<img
  src={pet.photo_url}
  alt={pet.name}
  className="w-full h-48 object-cover"
/>

// ✅ Good: Next.js Image
import Image from 'next/image';

<Image
  src={pet.photo_url || '/placeholder-pet.jpg'}
  alt={pet.name}
  width={400}
  height={300}
  className="w-full h-48 object-cover"
  placeholder="blur"
  blurDataURL={BLUR_DATA_URL}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
/>
```

### 10.2 Configure Image Domains

```typescript
// next.config.mjs
module.exports = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
};
```

---

## 11. Caching Strategy

### 11.1 Add Clinic Config Caching

```typescript
// ❌ Current: Reads filesystem every request
export async function getClinicData(slug: string) {
  const clinicDir = path.join(CONTENT_DIR, slug);
  const config = JSON.parse(fs.readFileSync(...));
  // ...
}

// ✅ Better: Cache with unstable_cache
import { unstable_cache } from 'next/cache';

export const getClinicData = unstable_cache(
  async (slug: string) => {
    const clinicDir = path.join(CONTENT_DIR, slug);
    // ... read files
    return data;
  },
  ['clinic-data'],
  {
    revalidate: 300, // 5 minutes
    tags: ['clinic-config'],
  }
);

// Revalidate when content changes
import { revalidateTag } from 'next/cache';
revalidateTag('clinic-config');
```

### 11.2 Add Redis/Vercel KV for Frequent Data

```typescript
// For frequently accessed, rarely changing data
import { kv } from '@vercel/kv';

export async function getPopularProducts(tenantId: string) {
  const cacheKey = `products:popular:${tenantId}`;

  // Try cache first
  const cached = await kv.get(cacheKey);
  if (cached) return cached;

  // Fetch from database
  const products = await supabase
    .from('store_products')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('sales_count', { ascending: false })
    .limit(10);

  // Cache for 1 hour
  await kv.set(cacheKey, products.data, { ex: 3600 });

  return products.data;
}
```

---

## 12. Database Query Optimization

### 12.1 Add Missing Indexes

```sql
-- High-impact indexes to add

-- Appointments by date range (common query)
CREATE INDEX idx_appointments_clinic_date
ON appointments(clinic_slug, appointment_date);

-- Vaccines due soon (for reminders)
CREATE INDEX idx_vaccines_next_due
ON vaccines(next_due)
WHERE next_due IS NOT NULL;

-- Medical records by pet (timeline view)
CREATE INDEX idx_medical_records_pet_date
ON medical_records(pet_id, created_at DESC);

-- Products by category (store filtering)
CREATE INDEX idx_products_tenant_category
ON store_products(tenant_id, category);

-- Pet search by name
CREATE INDEX idx_pets_tenant_name_trgm
ON pets USING gin(name gin_trgm_ops)
WHERE tenant_id IS NOT NULL;
```

### 12.2 Fix N+1 Queries

```typescript
// ❌ Bad: N+1 query pattern
const pets = await getPets();
for (const pet of pets) {
  pet.vaccines = await getVaccinesByPet(pet.id); // N queries!
}

// ✅ Good: Single query with join
const { data: pets } = await supabase
  .from('pets')
  .select(`
    *,
    vaccines (*),
    medical_records (
      id,
      record_type,
      created_at
    )
  `)
  .eq('owner_id', userId)
  .order('name');
```

### 12.3 Add Pagination

```typescript
// ❌ Bad: Load everything
const { data: products } = await supabase
  .from('store_products')
  .select('*');

// ✅ Good: Paginated
const PAGE_SIZE = 20;

const { data: products, count } = await supabase
  .from('store_products')
  .select('*', { count: 'exact' })
  .eq('tenant_id', tenantId)
  .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
  .order('created_at', { ascending: false });

// Return with pagination metadata
return {
  products,
  pagination: {
    page,
    pageSize: PAGE_SIZE,
    totalCount: count,
    totalPages: Math.ceil(count / PAGE_SIZE),
  },
};
```

---

## 13. Server Component Optimization

### 13.1 Parallel Data Fetching

```typescript
// ❌ Bad: Sequential fetching
export default async function DashboardPage() {
  const pets = await getPets();       // 100ms
  const appointments = await getAppts(); // 100ms
  const vaccines = await getVaccines();  // 100ms
  // Total: 300ms
}

// ✅ Good: Parallel fetching
export default async function DashboardPage() {
  const [pets, appointments, vaccines] = await Promise.all([
    getPets(),
    getAppts(),
    getVaccines(),
  ]);
  // Total: ~100ms
}
```

### 13.2 Streaming with Suspense

```typescript
// ✅ Good: Stream heavy data
import { Suspense } from 'react';

export default async function DashboardPage() {
  // Fast data first
  const user = await getUser();

  return (
    <div>
      <Header user={user} />

      <Suspense fallback={<StatsSkeleton />}>
        <StatsSection />  {/* Slow - streams in */}
      </Suspense>

      <Suspense fallback={<PetsSkeleton />}>
        <PetsSection />   {/* Slow - streams in */}
      </Suspense>
    </div>
  );
}
```

---

## 14. Client-Side Performance

### 14.1 Reduce Re-renders

```typescript
// ❌ Bad: New object every render
<Component style={{ color: 'red' }} />
<Component config={{ theme: 'dark' }} />

// ✅ Good: Stable references
const style = useMemo(() => ({ color: 'red' }), []);
<Component style={style} />

// Or better: Use Tailwind
<Component className="text-red-500" />
```

### 14.2 Memoize Expensive Calculations

```typescript
// ❌ Bad: Recalculates every render
function PetStats({ pets }) {
  const totalWeight = pets.reduce((sum, p) => sum + p.weight, 0);
  const averageAge = calculateAverageAge(pets); // Expensive

  return <div>...</div>;
}

// ✅ Good: Memoized
function PetStats({ pets }) {
  const stats = useMemo(() => ({
    totalWeight: pets.reduce((sum, p) => sum + p.weight, 0),
    averageAge: calculateAverageAge(pets),
  }), [pets]);

  return <div>...</div>;
}
```

### 14.3 Virtualize Long Lists

```typescript
// ❌ Bad: Render 1000 items
{products.map(p => <ProductCard key={p.id} {...p} />)}

// ✅ Good: Virtualized list
import { useVirtualizer } from '@tanstack/react-virtual';

function ProductList({ products }) {
  const parentRef = useRef();

  const virtualizer = useVirtualizer({
    count: products.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200,
  });

  return (
    <div ref={parentRef} className="h-screen overflow-auto">
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map(virtualItem => (
          <ProductCard
            key={products[virtualItem.index].id}
            {...products[virtualItem.index]}
            style={{ transform: `translateY(${virtualItem.start}px)` }}
          />
        ))}
      </div>
    </div>
  );
}
```

---

## 15. Performance Monitoring

### 15.1 Add Core Web Vitals Tracking

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

### 15.2 Custom Performance Marks

```typescript
// For critical user journeys
export function BookingWizard() {
  useEffect(() => {
    performance.mark('booking-wizard-start');

    return () => {
      performance.mark('booking-wizard-end');
      performance.measure('booking-wizard-duration', 'booking-wizard-start', 'booking-wizard-end');
    };
  }, []);
}
```

---

## 16. Performance Recommendations Summary

### 16.1 Critical (Do Immediately)

| Issue | Impact | Effort | Fix |
|-------|--------|--------|-----|
| Fix Lucide imports | -180KB | Low | Named imports |
| Dynamic import PDF | -800KB | Low | next/dynamic |
| Add next/image | 50% LCP | Medium | Replace img tags |

### 16.2 High Priority (This Sprint)

| Issue | Impact | Effort | Fix |
|-------|--------|--------|-----|
| Add clinic caching | 10x faster | Medium | unstable_cache |
| Add database indexes | 5x queries | Low | SQL migration |
| Add pagination | Memory safe | Medium | Range queries |

### 16.3 Medium Priority (Next Sprint)

| Issue | Impact | Effort | Fix |
|-------|--------|--------|-----|
| Add Vercel KV cache | Further speedup | Medium | Redis layer |
| Virtualize lists | Smooth scroll | Medium | @tanstack/virtual |
| Parallel data fetch | 3x faster | Low | Promise.all |

---

## 17. Performance Budget

### 17.1 Recommended Targets

| Metric | Target | Current (Est.) |
|--------|--------|----------------|
| First Contentful Paint | <1.8s | ~2.5s |
| Largest Contentful Paint | <2.5s | ~4s |
| Time to Interactive | <3.8s | ~5s |
| Total Blocking Time | <300ms | ~500ms |
| Cumulative Layout Shift | <0.1 | ~0.15 |
| JavaScript Bundle | <500KB | ~2MB |

### 17.2 Monitoring Budget Violations

```typescript
// next.config.mjs
module.exports = {
  experimental: {
    webVitalsAttribution: ['CLS', 'LCP', 'FID', 'TTFB'],
  },
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 2,
  },
};
```

---

## 18. Combined Security & Performance Checklist

Before deploying any feature, verify:

### Security
```
[ ] Auth check on protected routes/APIs
[ ] Input validation with Zod
[ ] File upload validation (type, size)
[ ] No console.log with sensitive data
[ ] RLS policies cover new tables
[ ] No hardcoded tenant IDs
```

### Performance
```
[ ] Named imports for icons
[ ] Dynamic imports for heavy libs
[ ] next/image for all images
[ ] Pagination for lists >20 items
[ ] Parallel data fetching where possible
[ ] Loading states with Suspense
```

---

*Document Version: 1.0*
*Last Updated: December 2024*
