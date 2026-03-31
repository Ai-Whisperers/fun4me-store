# Technical Debt & Improvement Epics

> **Generated**: January 2026
> **Analysis Scope**: Full repository audit covering database, theme, security, API, i18n, logging, testing, and technical debt markers.

---

## Executive Summary

| Category | Current State | Target State | Priority | Effort |
|----------|---------------|--------------|----------|--------|
| Type Safety | 3% typed (Drizzle) | 100% typed | 🔴 Critical | 40-60 hrs |
| Theme Compliance | 266 violations | 0 violations | 🟠 High | 16-24 hrs |
| i18n Coverage | 13.6% (297 files) | 100% | 🟠 High | 60-80 hrs |
| Test Coverage | ~20% overall | 80%+ | 🟠 High | 80-120 hrs |
| API Consistency | 74% standardized | 100% | 🟡 Medium | 20-30 hrs |
| Security Hardening | Good foundation | ABAC + audit | 🟡 Medium | 30-40 hrs |
| Logging/Monitoring | 93% structured | 100% + Sentry | 🟢 Low | 8-12 hrs |
| Tech Debt Markers | 59 items | 0 items | 🟢 Low | 15-20 hrs |

**Total Estimated Effort**: 270-380 hours (7-10 weeks for a single developer)

---

## Epic 1: Type Safety - Drizzle Schema Generation

### Problem Statement

The codebase claims to use Drizzle ORM but **97% of database access is untyped**. Only 3 tables are defined in `web/db/schema.ts` while 69+ tables exist in Supabase.

```
Current State:
- 69 tables accessed via raw supabase.from('table_name')
- 3 tables defined in Drizzle schema (profiles, tenants, pets)
- Zero type inference on queries
- Runtime errors for column mismatches
- No autocomplete for table columns
```

### Technical Analysis

**Files Affected:**
- `web/db/schema.ts` - Only 3 table definitions
- `web/app/api/**/*.ts` - 269 route files with untyped queries
- `web/app/actions/**/*.ts` - 42 server actions

**Root Cause:** Drizzle was added but never fully adopted. Developers defaulted to the simpler `supabase.from()` pattern.

### Solution Approach

1. **Generate Drizzle schema from existing Supabase**:
   ```bash
   npx drizzle-kit introspect:pg --config=drizzle.config.ts
   ```

2. **Create typed query helpers**:
   ```typescript
   // lib/db/queries/pets.ts
   import { db } from '@/db'
   import { pets, vaccines, medicalRecords } from '@/db/schema'
   import { eq, and } from 'drizzle-orm'

   export async function getPetWithRecords(petId: string, tenantId: string) {
     return db.query.pets.findFirst({
       where: and(eq(pets.id, petId), eq(pets.tenantId, tenantId)),
       with: {
         vaccines: true,
         medicalRecords: { limit: 10, orderBy: desc(medicalRecords.createdAt) }
       }
     })
   }
   ```

3. **Migration strategy**: Create a `useTypedQuery` hook that wraps Drizzle and falls back to Supabase during transition.

### Tasks

| Task | Effort | Priority |
|------|--------|----------|
| Run Drizzle introspect on production schema | 2 hrs | P0 |
| Review and clean generated schema | 4 hrs | P0 |
| Create typed query layer for core entities (pets, vaccines, appointments) | 16 hrs | P0 |
| Migrate top 20 API routes to typed queries | 20 hrs | P1 |
| Add pre-commit hook for type checking | 2 hrs | P1 |
| Document typed query patterns | 4 hrs | P2 |

**Total: 40-60 hours**

### Success Metrics

- [ ] 100% of tables have Drizzle schema definitions
- [ ] Top 50 API endpoints use typed queries
- [ ] Zero `as any` casts in database code
- [ ] TypeScript catches column name typos at compile time

---

## Epic 2: Theme System Compliance

### Problem Statement

**266 instances** of hardcoded colors found, primarily in ambassador portal components. This breaks the multi-tenant theming system.

```typescript
// ❌ Current (ambassador components)
<div className="bg-blue-600 text-white">
<span className="text-green-500">

// ✅ Required pattern
<div className="bg-[var(--primary)] text-[var(--text-on-primary)]">
<span className="text-[var(--success)]">
```

### Technical Analysis

**Violation Hotspots:**

| Directory | Violations | Severity |
|-----------|------------|----------|
| `app/ambassador/` | 180+ | Critical |
| `components/ambassador/` | 60+ | Critical |
| `components/store/` | 15 | Medium |
| `components/ui/` | 11 | Low |

**Missing CSS Variables:**
- `--text-on-primary` (for text on colored backgrounds)
- `--success`, `--warning`, `--error` semantic colors
- `--gradient-primary`, `--gradient-secondary`

### Solution Approach

1. **Extend theme.json schema**:
   ```json
   {
     "colors": {
       "primary": "#2563eb",
       "primaryHover": "#1d4ed8",
       "textOnPrimary": "#ffffff",
       "success": "#10b981",
       "warning": "#f59e0b",
       "error": "#ef4444"
     }
   }
   ```

2. **Create ESLint rule** to catch hardcoded colors:
   ```javascript
   // .eslintrc.js
   rules: {
     'no-restricted-syntax': [
       'error',
       {
         selector: 'Literal[value=/^(bg|text|border)-(blue|green|red|gray)-\\d+$/]',
         message: 'Use CSS variables: var(--primary), var(--success), etc.'
       }
     ]
   }
   ```

3. **Batch fix with codemod**:
   ```bash
   npx jscodeshift -t codemods/theme-colors.ts app/ambassador/**/*.tsx
   ```

### Tasks

| Task | Effort | Priority |
|------|--------|----------|
| Extend CSS variable system in ThemeProvider | 3 hrs | P0 |
| Fix ambassador portal components (180+ violations) | 8 hrs | P0 |
| Fix ambassador shared components (60+ violations) | 4 hrs | P0 |
| Fix store components (15 violations) | 2 hrs | P1 |
| Add ESLint rule to prevent regression | 2 hrs | P1 |
| Update theme.json template with all variables | 1 hr | P2 |

**Total: 16-24 hours**

### Success Metrics

- [ ] Zero hardcoded Tailwind color classes in components
- [ ] ESLint fails on new hardcoded colors
- [ ] Ambassador portal respects clinic themes
- [ ] All 3 demo clinics render correctly with different themes

---

## Epic 3: Internationalization (i18n) Coverage

### Problem Statement

Only **13.6% i18n coverage** - 297 files contain hardcoded Spanish strings. This blocks English expansion.

```typescript
// ❌ Current (majority of codebase)
<h1>Mis Mascotas</h1>
<Button>Guardar</Button>
<p>Error al cargar los datos</p>

// ✅ Required pattern
const t = useTranslations('pets')
<h1>{t('title')}</h1>
<Button>{t('save')}</Button>
<p>{t('errors.loadFailed')}</p>
```

### Technical Analysis

**Coverage by Area:**

| Area | Files | Hardcoded Strings | Status |
|------|-------|-------------------|--------|
| Pet portal | 45 | 320+ | Migrated ✅ |
| Dashboard | 62 | 450+ | Partial (40%) |
| Store | 38 | 280+ | Partial (30%) |
| Ambassador | 24 | 180+ | Not started |
| Booking | 18 | 120+ | Not started |
| Clinical tools | 15 | 200+ | Not started |
| Auth pages | 8 | 60+ | Not started |

**Existing Translation Files:**
- `messages/es.json` - 847 keys
- `messages/en.json` - 847 keys (machine translated, needs review)

### Solution Approach

1. **Automated string extraction**:
   ```bash
   npx i18n-extract --source="app/**/*.tsx" --output="strings-audit.json"
   ```

2. **Component-by-component migration** with this pattern:
   ```typescript
   // Before
   export function PetCard({ pet }) {
     return <p>Última vacuna: {pet.lastVaccine}</p>
   }

   // After
   import { useTranslations } from 'next-intl'
   export function PetCard({ pet }) {
     const t = useTranslations('petCard')
     return <p>{t('lastVaccine')}: {pet.lastVaccine}</p>
   }
   ```

3. **Translation workflow**: Use Crowdin or similar for professional translation review.

### Tasks

| Task | Effort | Priority |
|------|--------|----------|
| Extract all hardcoded strings to audit file | 4 hrs | P0 |
| Migrate dashboard components (62 files) | 16 hrs | P0 |
| Migrate store components (38 files) | 12 hrs | P0 |
| Migrate ambassador portal (24 files) | 8 hrs | P1 |
| Migrate booking flow (18 files) | 6 hrs | P1 |
| Migrate clinical tools (15 files) | 8 hrs | P1 |
| Migrate auth pages (8 files) | 4 hrs | P2 |
| Review English translations | 8 hrs | P2 |
| Add missing namespace separators | 4 hrs | P2 |

**Total: 60-80 hours**

### Success Metrics

- [ ] 100% of user-facing strings use `useTranslations()`
- [ ] English locale fully functional
- [ ] No Spanish strings in TypeScript files (only in messages/*.json)
- [ ] Language switcher works on all pages

---

## Epic 4: Test Coverage Expansion

### Problem Statement

**~20% overall test coverage** with critical gaps:
- 3% API endpoint coverage (8/269 routes tested)
- 0% Server Actions coverage
- 0% Cron job coverage (now at 100% after recent work)
- E2E tests only cover happy paths

### Technical Analysis

**Current Test Distribution:**

| Category | Files | Coverage | Risk Level |
|----------|-------|----------|------------|
| Unit tests | 45 | 35% | Medium |
| Component tests | 28 | 25% | Medium |
| API route tests | 8 | 3% | 🔴 Critical |
| Server Action tests | 0 | 0% | 🔴 Critical |
| E2E tests | 12 | 15% | High |
| Cron tests | 14 | 100% | ✅ Good |

**Critical Untested Endpoints:**
- `/api/checkout` - Payment processing
- `/api/prescriptions` - Medical data
- `/api/appointments/book` - Booking mutations
- `/api/auth/*` - Authentication flows
- `/api/invoices/*` - Financial operations

### Solution Approach

1. **API testing infrastructure**:
   ```typescript
   // lib/test-utils/api-test-helpers.ts
   export async function testApiRoute(
     route: string,
     options: {
       method: 'GET' | 'POST' | 'PUT' | 'DELETE'
       body?: object
       user?: TestUser
       expectedStatus: number
     }
   ) {
     const response = await fetch(`http://localhost:3000${route}`, {
       method: options.method,
       headers: {
         'Content-Type': 'application/json',
         ...(options.user && { Authorization: `Bearer ${options.user.token}` })
       },
       body: options.body ? JSON.stringify(options.body) : undefined
     })
     expect(response.status).toBe(options.expectedStatus)
     return response.json()
   }
   ```

2. **Prioritize by risk**: Test financial and medical endpoints first.

3. **Property-based testing** for complex calculations (dosage, pricing).

### Tasks

| Task | Effort | Priority |
|------|--------|----------|
| Set up API testing infrastructure | 8 hrs | P0 |
| Test checkout/payment endpoints (5 routes) | 12 hrs | P0 |
| Test prescription endpoints (8 routes) | 10 hrs | P0 |
| Test appointment booking (6 routes) | 8 hrs | P0 |
| Test invoice/payment endpoints (12 routes) | 16 hrs | P1 |
| Test auth endpoints (6 routes) | 8 hrs | P1 |
| Test inventory/stock endpoints (15 routes) | 12 hrs | P1 |
| Server Action tests (42 actions) | 20 hrs | P1 |
| E2E: Error path coverage | 16 hrs | P2 |
| Property-based tests for calculations | 8 hrs | P2 |

**Total: 80-120 hours**

### Success Metrics

- [ ] 80%+ line coverage on API routes
- [ ] All financial endpoints have integration tests
- [ ] All medical data endpoints have tests
- [ ] CI blocks PRs that decrease coverage

---

## Epic 5: Security Hardening

### Problem Statement

Good security foundation but gaps remain:
- Permission system is role-based (RBAC), should be attribute-based (ABAC)
- 3 `// TODO: security` markers in codebase
- No rate limiting on some sensitive endpoints
- Audit logging incomplete

### Technical Analysis

**Current Security Posture:**

| Area | Status | Gap |
|------|--------|-----|
| RLS policies | ✅ 100% coverage | None |
| Auth middleware | ✅ 74% using withApiAuth | 26% manual |
| Rate limiting | ⚠️ Partial | Missing on 40+ endpoints |
| ABAC permissions | ❌ Not implemented | Needed for granular access |
| Audit logging | ⚠️ Partial | Missing on mutations |
| Input validation | ✅ Zod on most routes | 15 routes missing |

**Security TODOs Found:**
1. `app/api/admin/permissions/route.ts:45` - "TODO: validate permission scope"
2. `lib/auth/permissions.ts:23` - "TODO: implement ABAC"
3. `components/clinical/prescription-form.tsx:89` - "TODO: signature verification"

### Solution Approach

1. **Implement ABAC layer**:
   ```typescript
   // lib/auth/abac.ts
   interface Permission {
     action: 'read' | 'write' | 'delete' | 'admin'
     resource: 'pets' | 'appointments' | 'prescriptions' | ...
     conditions?: {
       ownPetsOnly?: boolean
       clinicScope?: string[]
       roleMinimum?: 'owner' | 'vet' | 'admin'
     }
   }

   export async function checkPermission(
     userId: string,
     permission: Permission
   ): Promise<boolean> {
     // Implementation
   }
   ```

2. **Rate limiting standardization**:
   ```typescript
   // Apply to all mutation endpoints
   import { rateLimit } from '@/lib/rate-limit'

   export const POST = rateLimit({
     requests: 10,
     window: '1m',
     identifier: 'user'
   })(handler)
   ```

3. **Comprehensive audit logging**:
   ```typescript
   await auditLog({
     action: 'prescription.create',
     userId,
     resourceId: prescription.id,
     metadata: { drugCount: medications.length }
   })
   ```

### Tasks

| Task | Effort | Priority |
|------|--------|----------|
| Design ABAC permission model | 4 hrs | P0 |
| Implement ABAC middleware | 12 hrs | P0 |
| Migrate top 20 routes to ABAC | 8 hrs | P0 |
| Add rate limiting to remaining endpoints | 6 hrs | P1 |
| Complete audit logging for mutations | 8 hrs | P1 |
| Fix 3 security TODOs | 4 hrs | P1 |
| Add input validation to 15 missing routes | 4 hrs | P2 |
| Security documentation | 4 hrs | P2 |

**Total: 30-40 hours**

### Success Metrics

- [ ] ABAC checks on all protected endpoints
- [ ] Rate limiting on all mutation endpoints
- [ ] Audit log entries for all data mutations
- [ ] Zero security-related TODOs

---

## Epic 6: API Standardization

### Problem Statement

**26% of API routes** don't follow the standard `withApiAuth` pattern, leading to inconsistent auth handling and error responses.

### Technical Analysis

**Inconsistencies Found:**

| Pattern | Routes | Issue |
|---------|--------|-------|
| `withApiAuth` wrapper | 199 | ✅ Standard |
| Manual auth check | 52 | ⚠️ Inconsistent |
| No auth check | 18 | 🔴 Missing |

**Error Response Variations:**
```typescript
// Variation 1
return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

// Variation 2
return new Response('Unauthorized', { status: 401 })

// Variation 3
return NextResponse.json({ message: 'Auth required' }, { status: 401 })
```

### Solution Approach

1. **Standardize on `withApiAuth`** for all protected routes
2. **Create error response helpers**:
   ```typescript
   // lib/api/responses.ts
   export const ApiErrors = {
     unauthorized: () => NextResponse.json(
       { error: 'No autorizado', code: 'UNAUTHORIZED' },
       { status: 401 }
     ),
     forbidden: () => NextResponse.json(
       { error: 'Acceso denegado', code: 'FORBIDDEN' },
       { status: 403 }
     ),
     notFound: (resource: string) => NextResponse.json(
       { error: `${resource} no encontrado`, code: 'NOT_FOUND' },
       { status: 404 }
     )
   }
   ```

### Tasks

| Task | Effort | Priority |
|------|--------|----------|
| Create API response helpers | 2 hrs | P0 |
| Migrate 52 manual auth routes to withApiAuth | 12 hrs | P0 |
| Add auth to 18 unprotected routes | 6 hrs | P0 |
| Standardize error response format | 4 hrs | P1 |
| Add OpenAPI/Swagger documentation | 8 hrs | P2 |

**Total: 20-30 hours**

---

## Epic 7: Logging & Monitoring

### Problem Statement

**93% structured logging** but Sentry integration incomplete and no real-time alerting.

### Technical Analysis

| Area | Status |
|------|--------|
| Structured logger usage | 93% (7% console.log) |
| Sentry SDK installed | ✅ Yes |
| Sentry error capture | ⚠️ Manual only |
| Performance monitoring | ❌ Not configured |
| Log aggregation | ❌ No service |
| Alerting rules | ❌ Not configured |

### Solution Approach

1. **Complete Sentry integration**:
   ```typescript
   // sentry.client.config.ts
   Sentry.init({
     dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
     tracesSampleRate: 0.1,
     integrations: [
       new Sentry.BrowserTracing(),
       new Sentry.Replay({ stickySession: true })
     ]
   })
   ```

2. **Add log aggregation** (Axiom, Logtail, or similar)

### Tasks

| Task | Effort | Priority |
|------|--------|----------|
| Complete Sentry error boundary setup | 2 hrs | P0 |
| Add Sentry performance monitoring | 2 hrs | P1 |
| Replace remaining console.log (7%) | 2 hrs | P1 |
| Configure alerting rules | 2 hrs | P2 |
| Set up log aggregation service | 4 hrs | P2 |

**Total: 8-12 hours**

---

## Epic 8: Technical Debt Cleanup

### Problem Statement

**59 technical debt markers** scattered across codebase:
- 14 TODOs
- 40 deprecated items
- 5 FIXMEs

### Technical Analysis

**TODO Categories:**

| Category | Count | Examples |
|----------|-------|----------|
| Security | 3 | ABAC implementation, signature verification |
| Performance | 4 | Query optimization, caching |
| Feature completion | 5 | Edge cases, mobile support |
| Refactoring | 2 | Code cleanup |

**Deprecated Items:**
- 28 legacy API endpoints (superseded by newer versions)
- 8 old component files (replaced but not deleted)
- 4 unused database columns

### Tasks

| Task | Effort | Priority |
|------|--------|----------|
| Resolve 3 security TODOs | 6 hrs | P0 |
| Resolve 4 performance TODOs | 4 hrs | P1 |
| Remove 28 deprecated API routes | 4 hrs | P1 |
| Remove 8 unused component files | 2 hrs | P2 |
| Clean up 4 unused DB columns | 2 hrs | P2 |
| Resolve remaining 7 TODOs | 4 hrs | P2 |

**Total: 15-20 hours**

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-3)
**Focus: Type Safety + Security**

| Week | Epic | Tasks |
|------|------|-------|
| 1 | Epic 1 | Drizzle introspect, schema review, core entity queries |
| 2 | Epic 1 | Migrate top 20 API routes to typed queries |
| 3 | Epic 5 | ABAC design and implementation |

**Deliverables:**
- Typed Drizzle schema for all 69 tables
- Core entities (pets, vaccines, appointments) fully typed
- ABAC permission layer operational

### Phase 2: User Experience (Weeks 4-6)
**Focus: Theme + i18n**

| Week | Epic | Tasks |
|------|------|-------|
| 4 | Epic 2 | Fix all theme violations, add ESLint rule |
| 5 | Epic 3 | Migrate dashboard and store i18n |
| 6 | Epic 3 | Migrate ambassador and booking i18n |

**Deliverables:**
- Zero hardcoded colors
- 80%+ i18n coverage
- English locale functional

### Phase 3: Quality (Weeks 7-10)
**Focus: Testing + Polish**

| Week | Epic | Tasks |
|------|------|-------|
| 7 | Epic 4 | API testing infrastructure, checkout tests |
| 8 | Epic 4 | Prescription, appointment, invoice tests |
| 9 | Epic 6 | API standardization |
| 10 | Epic 7 + 8 | Logging, monitoring, tech debt cleanup |

**Deliverables:**
- 80%+ test coverage on critical paths
- 100% API routes use withApiAuth
- Sentry fully operational
- Zero TODO/FIXME markers

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Drizzle migration breaks queries | Medium | High | Parallel running, extensive testing |
| Theme changes affect layout | Low | Medium | Visual regression tests |
| i18n keys missing | Medium | Low | Fallback to Spanish, CI check |
| Test flakiness | High | Low | Retry logic, isolated test DB |

---

## Appendix: Quick Wins

**Can be done immediately with minimal risk:**

1. **Add ESLint rule for hardcoded colors** (2 hrs)
2. **Complete Sentry error boundaries** (2 hrs)
3. **Remove 8 unused component files** (1 hr)
4. **Fix 3 security TODOs** (6 hrs)
5. **Add rate limiting to checkout endpoint** (1 hr)

**Total quick wins: 12 hours, immediate risk reduction**

---

*Document generated from comprehensive repository analysis. Review quarterly and update priorities based on business needs.*
