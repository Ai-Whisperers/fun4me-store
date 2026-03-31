# TerraPet Complete Testing & Deployment Plan

**Created**: January 22, 2026  
**Status**: COMPREHENSIVE ROADMAP  
**Current Coverage**: 25%  
**Target Coverage**: 70% (Minimum for Production)  
**Estimated Total Effort**: 35-50 hours over 2-3 weeks

---

## Executive Summary

### Current State (After Integration Tests)

✅ **Completed** (25% coverage):
- Configuration validation (100%)
- Integration tests (40% - data loading, multi-tenant isolation)
- 3 critical bugs found and fixed
- 109 total tests (39 config + 70 integration)

⏳ **Remaining** (45% coverage gap):
- Component rendering tests (0%)
- Database/RLS tests (0%)
- API endpoint tests (0%)
- E2E user flow tests (0%)
- Performance tests (0%)
- Security tests (0%)
- Accessibility tests (0%)

### Goal

**Achieve 70% test coverage** across all critical dimensions to confidently deploy TerraPet to production.

---

## Phase Overview: 7 Phases Over 3 Weeks

| Phase | Focus | Priority | Effort | Coverage Gain | Timeline |
|-------|-------|----------|--------|---------------|----------|
| **Phase 1** | Component Rendering | 🔴 CRITICAL | 8-10h | +15% | Week 1 (Mon-Tue) |
| **Phase 2** | Database RLS | 🔴 CRITICAL | 4-6h | +10% | Week 1 (Wed) |
| **Phase 3** | API Endpoints | 🔴 CRITICAL | 6-8h | +10% | Week 1 (Thu-Fri) |
| **Phase 4** | E2E Critical Flows | 🟡 HIGH | 8-12h | +15% | Week 2 (Mon-Wed) |
| **Phase 5** | Performance | 🟢 MEDIUM | 3-4h | +5% | Week 2 (Thu) |
| **Phase 6** | Security | 🔴 CRITICAL | 4-5h | +10% | Week 2 (Fri) |
| **Phase 7** | Final Validation | 🟡 HIGH | 2-3h | +5% | Week 3 (Mon) |
| **TOTAL** | All Testing | - | **35-50h** | **+45%** | **3 weeks** |

**Target**: 70% coverage by end of Week 3  
**Production Deployment**: Week 3 (Tuesday)

---

## PHASE 1: Component Rendering Tests (CRITICAL)

**Priority**: 🔴 CRITICAL  
**Estimated Effort**: 8-10 hours  
**Coverage Gain**: +15%  
**Timeline**: Week 1, Monday-Tuesday  
**Dependencies**: None (can start immediately)

### Objective

Verify that React components actually RENDER with TerraPet data and display correctly in the browser.

### What We're Testing

1. **Page Loading** - Pages load without errors
2. **Data Rendering** - Configuration data appears in UI
3. **Theme Application** - CSS variables are injected
4. **Image Display** - Google Drive images render
5. **Responsive Layout** - Mobile/desktop layouts work
6. **Spanish Content** - All text displays in Spanish

### Tasks Breakdown

#### Task 1.1: Set Up Component Test Infrastructure (1-2h)

**Goal**: Configure Vitest + React Testing Library for component tests

**Actions**:
```bash
cd web
npm install -D @testing-library/react @testing-library/jest-dom @vitejs/plugin-react
```

**Files to Create**:
- `web/vitest.config.components.ts` - Component test configuration
- `web/tests/setup.ts` - Test setup with React Testing Library

**Success Criteria**:
- [ ] Can import and render React components in tests
- [ ] React Testing Library queries work
- [ ] Mock Next.js router works

**Deliverable**: Component test infrastructure ready

---

#### Task 1.2: Homepage Component Tests (2-3h)

**Goal**: Test homepage renders with TerraPet data

**File**: `web/tests/components/terrapet-homepage.test.tsx`

**Test Cases** (25 tests):
```typescript
describe('TerraPet Homepage Rendering', () => {
  // Hero Section (5 tests)
  it('renders hero headline: "TerraPet - El mejor cuidado para tu peludo"')
  it('renders hero subheadline with "perros" mention')
  it('renders primary CTA button')
  it('renders secondary CTA button')
  it('applies primary color to CTA buttons')
  
  // Logo & Branding (3 tests)
  it('renders logo from Google Drive URL')
  it('logo has correct alt text')
  it('logo has correct dimensions (150x40)')
  
  // Features Section (6 tests)
  it('renders 3 feature highlights')
  it('renders feature: "El Mejor Trato"')
  it('renders feature: "Precios Accesibles"')
  it('renders feature: "Servicios Completos"')
  it('renders feature descriptions (not just titles)')
  it('renders feature icons')
  
  // Theme Application (5 tests)
  it('injects CSS variable --primary: #78866B')
  it('injects CSS variable --secondary: #C19A6B')
  it('injects CSS variable --accent: #E8A87C')
  it('applies Inter font family')
  it('applies correct border radius (12px)')
  
  // Contact Links (3 tests)
  it('renders WhatsApp link with correct number')
  it('renders email link')
  it('renders Google Maps link')
  
  // Spanish Content (3 tests)
  it('all text content is in Spanish')
  it('no English text present')
  it('Spanish characters (¿, ñ, á) display correctly')
})
```

**Success Criteria**:
- [ ] All 25 tests pass
- [ ] Homepage renders without errors
- [ ] Theme colors applied correctly
- [ ] All content in Spanish

**Deliverable**: `terrapet-homepage.test.tsx` with 25 passing tests

---

#### Task 1.3: Services Page Component Tests (3-4h)

**Goal**: Test services page renders all 9 services correctly

**File**: `web/tests/components/terrapet-services.test.tsx`

**Test Cases** (40 tests):
```typescript
describe('TerraPet Services Page Rendering', () => {
  // Services List (10 tests)
  it('renders all 9 services')
  it('renders service: Consultas Veterinarias')
  it('renders service: Vacunación')
  it('renders service: Desparasitación')
  it('renders service: Control de Peso')
  it('renders service: Peluquería / Grooming')
  it('renders service: Baño')
  it('renders service: Microchip / Identificación')
  it('renders service: Certificados')
  it('renders service: Eutanasia Humanitaria')
  
  // Service Details (10 tests)
  it('renders service titles correctly')
  it('renders service descriptions')
  it('renders service categories (medical, preventative, cosmetic)')
  it('renders service durations')
  it('renders "includes" list for each service')
  it('service cards have correct styling')
  it('services are displayed in grid layout')
  it('service icons render correctly')
  it('service images display (if configured)')
  it('services have correct spacing')
  
  // Service Variants (10 tests)
  it('renders service variants for consultation (2 variants)')
  it('renders "Consulta General" variant')
  it('renders "Consulta a Domicilio" variant (UNIQUE FEATURE)')
  it('renders vaccination variants (3 variants)')
  it('renders deworming variants (2 variants)')
  it('renders certificate variants (2 variants)')
  it('variant prices display correctly')
  it('variant descriptions display')
  it('variant selection UI works')
  it('home visit variant shows address requirement')
  
  // Booking Configuration (5 tests)
  it('shows "Reservable Online" badge for 8 services')
  it('hides online booking for euthanasia service')
  it('booking buttons link to correct routes')
  it('emergency availability displayed correctly')
  it('booking CTA has correct styling')
  
  // Layout & UX (5 tests)
  it('services page has correct header')
  it('service cards are clickable/expandable')
  it('responsive layout works (mobile/tablet/desktop)')
  it('scroll behavior works correctly')
  it('page loads without layout shift')
})
```

**Success Criteria**:
- [ ] All 40 tests pass
- [ ] All 9 services render correctly
- [ ] Home visit variant clearly visible
- [ ] Booking badges display correctly

**Deliverable**: `terrapet-services.test.tsx` with 40 passing tests

---

#### Task 1.4: About & FAQ Page Component Tests (2h)

**Goal**: Test about and FAQ pages render correctly

**Files**:
- `web/tests/components/terrapet-about.test.tsx` (15 tests)
- `web/tests/components/terrapet-faq.test.tsx` (15 tests)

**About Page Test Cases** (15 tests):
```typescript
describe('TerraPet About Page Rendering', () => {
  // Team Section (7 tests)
  it('renders veterinarian name: Dr. Adrián Alexander Gill Sánchez')
  it('renders vet title: Doctor en Ciencias Veterinarias')
  it('renders vet specialization: Clínica diaria')
  it('renders vet bio')
  it('renders vet photo from Google Drive')
  it('vet photo has correct dimensions (400x533)')
  it('vet photo has alt text')
  
  // Mission Section (2 tests)
  it('renders mission statement')
  it('mission mentions "buen trato" and "precios accesibles"')
  
  // Values Section (6 tests)
  it('renders 3 company values')
  it('renders value: Mejor Trato')
  it('renders value: Precios Accesibles')
  it('renders value: Atención a Domicilio')
  it('value descriptions display correctly')
  it('value icons display correctly')
})
```

**FAQ Page Test Cases** (15 tests):
```typescript
describe('TerraPet FAQ Page Rendering', () => {
  // FAQ List (5 tests)
  it('renders all 12 FAQ entries')
  it('FAQs grouped by category')
  it('FAQ questions in Spanish (¿...? format)')
  it('FAQ answers in Spanish')
  it('FAQ layout is clean and readable')
  
  // Interactivity (5 tests)
  it('FAQ items are expandable/collapsible')
  it('clicking question expands answer')
  it('clicking again collapses answer')
  it('only one FAQ expanded at a time (accordion)')
  it('expand/collapse animation works')
  
  // Content Verification (5 tests)
  it('FAQ mentions dog-only specialization')
  it('FAQ mentions home visit service')
  it('FAQ includes contact phone number')
  it('FAQ includes operating hours')
  it('FAQ has correct categorization')
})
```

**Success Criteria**:
- [ ] All 30 tests pass (15 about + 15 FAQ)
- [ ] Dr. Gill profile displays correctly
- [ ] All 12 FAQs render
- [ ] FAQ accordion works

**Deliverable**: 2 test files with 30 passing tests total

---

#### Task 1.5: Theme CSS Variable Injection Tests (1h)

**Goal**: Verify theme CSS variables are actually injected into DOM

**File**: `web/tests/components/terrapet-theme.test.tsx`

**Test Cases** (10 tests):
```typescript
describe('TerraPet Theme CSS Variable Injection', () => {
  // Color Variables (5 tests)
  it('injects --primary color variable (#78866B)')
  it('injects --secondary color variable (#C19A6B)')
  it('injects --accent color variable (#E8A87C)')
  it('injects --bg-default color variable')
  it('injects --text-primary color variable')
  
  // Typography Variables (3 tests)
  it('injects --font-heading variable (Inter)')
  it('injects --font-body variable (Inter)')
  it('injects font size variables (h1, h2, body)')
  
  // UI Variables (2 tests)
  it('injects --border-radius variable (12px)')
  it('injects shadow variables (shadow-sm, shadow-md)')
})
```

**Success Criteria**:
- [ ] All 10 tests pass
- [ ] CSS variables accessible via getComputedStyle
- [ ] Theme colors match configuration

**Deliverable**: `terrapet-theme.test.tsx` with 10 passing tests

---

### Phase 1 Summary

**Total Tests**: 120 tests
- Homepage: 25 tests
- Services: 40 tests
- About: 15 tests
- FAQ: 15 tests
- Theme: 10 tests
- Infrastructure: 15 tests

**Success Criteria**:
- [ ] All 120 component tests pass
- [ ] Pages render without errors
- [ ] Theme CSS variables inject correctly
- [ ] All content displays in Spanish
- [ ] Google Drive images render
- [ ] Responsive layouts work

**Deliverables**:
1. Component test infrastructure
2. 5 test files with 120 passing tests
3. Documentation of any rendering issues found

**Risk**: Medium (React Testing Library setup might be tricky)  
**Blocker Impact**: HIGH (can't verify UI works without this)

---

## PHASE 2: Database RLS & Tenant Isolation Tests (CRITICAL)

**Priority**: 🔴 CRITICAL  
**Estimated Effort**: 4-6 hours  
**Coverage Gain**: +10%  
**Timeline**: Week 1, Wednesday  
**Dependencies**: Phase 1 can run in parallel

### Objective

Verify that Row-Level Security (RLS) policies ACTUALLY enforce tenant isolation at the database level, preventing cross-tenant data access.

### What We're Testing

1. **RLS Policy Enforcement** - Policies block unauthorized access
2. **Tenant Filtering** - Queries automatically filter by tenant_id
3. **Cross-Tenant Prevention** - TerraPet users can't see Adris data
4. **Service Role Bypass** - Service role can access all tenants
5. **Anonymous Access** - Unauthenticated users blocked correctly

### Tasks Breakdown

#### Task 2.1: Database Test Infrastructure Setup (1h)

**Goal**: Configure Supabase test client with different auth contexts

**File**: `web/tests/database/setup.ts`

**Actions**:
- Create test database connections
- Set up auth contexts (terrapet user, adris user, anonymous)
- Create test data cleanup utilities

**Success Criteria**:
- [ ] Can create authenticated Supabase clients
- [ ] Can switch between user contexts
- [ ] Can clean up test data

**Deliverable**: Database test infrastructure ready

---

#### Task 2.2: RLS Policy Enforcement Tests (2-3h)

**Goal**: Test RLS policies block cross-tenant access

**File**: `web/tests/database/terrapet-rls.test.ts`

**Test Cases** (30 tests):
```typescript
describe('TerraPet RLS Policy Enforcement', () => {
  // Pets Table RLS (6 tests)
  it('terrapet user can query terrapet pets')
  it('terrapet user CANNOT query adris pets')
  it('adris user CANNOT query terrapet pets')
  it('anonymous user CANNOT query any pets')
  it('service role CAN query all pets')
  it('queries automatically filter by tenant_id')
  
  // Appointments Table RLS (6 tests)
  it('terrapet user can query terrapet appointments')
  it('terrapet user CANNOT query adris appointments')
  it('terrapet user can CREATE appointment for own tenant')
  it('terrapet user CANNOT CREATE appointment for adris')
  it('appointment queries filter by tenant_id')
  it('service role bypasses RLS correctly')
  
  // Profiles Table RLS (6 tests)
  it('terrapet user can query own profile')
  it('terrapet user can query other terrapet profiles')
  it('terrapet user CANNOT query adris profiles')
  it('profile.tenant_id matches auth context')
  it('cannot update profile to different tenant')
  it('service role can query all profiles')
  
  // Services Table RLS (6 tests)
  it('public can view terrapet services')
  it('public CANNOT view services without tenant filter')
  it('terrapet staff can manage terrapet services')
  it('terrapet staff CANNOT manage adris services')
  it('service creation requires staff role')
  it('service queries filter by tenant_id')
  
  // Medical Records RLS (6 tests)
  it('owner can view own pet medical records')
  it('owner CANNOT view other owner records')
  it('vet can view all terrapet records')
  it('vet CANNOT view adris records')
  it('anonymous CANNOT view medical records')
  it('service role can query all records')
})
```

**Success Criteria**:
- [ ] All 30 tests pass
- [ ] Cross-tenant access blocked
- [ ] Tenant filtering works automatically
- [ ] Service role bypass works

**Deliverable**: `terrapet-rls.test.ts` with 30 passing tests

---

#### Task 2.3: Tenant Isolation Integration Tests (1-2h)

**Goal**: Test end-to-end tenant isolation across multiple tables

**File**: `web/tests/database/terrapet-isolation.test.ts`

**Test Cases** (20 tests):
```typescript
describe('TerraPet Multi-Tenant Isolation', () => {
  // Join Queries (5 tests)
  it('joined queries filter all tables by tenant_id')
  it('pet + appointment join returns only terrapet data')
  it('owner + pets join isolated correctly')
  it('cannot join across tenants')
  it('complex queries maintain isolation')
  
  // Insert Operations (5 tests)
  it('insert requires valid tenant_id')
  it('cannot insert with wrong tenant_id')
  it('tenant_id defaults to user context')
  it('service role can insert for any tenant')
  it('insert validates tenant exists')
  
  // Update Operations (5 tests)
  it('can update own tenant records')
  it('cannot update other tenant records')
  it('cannot change tenant_id on update')
  it('update respects RLS policies')
  it('service role can update any tenant')
  
  // Delete Operations (5 tests)
  it('can delete own tenant records')
  it('cannot delete other tenant records')
  it('delete respects RLS policies')
  it('cascading deletes respect tenant_id')
  it('service role can delete any tenant')
})
```

**Success Criteria**:
- [ ] All 20 tests pass
- [ ] No cross-tenant data leakage
- [ ] All CRUD operations respect RLS
- [ ] Joins maintain isolation

**Deliverable**: `terrapet-isolation.test.ts` with 20 passing tests

---

### Phase 2 Summary

**Total Tests**: 50 tests
- RLS Policies: 30 tests
- Tenant Isolation: 20 tests

**Success Criteria**:
- [ ] All 50 database tests pass
- [ ] RLS policies enforce tenant isolation
- [ ] No cross-tenant data access possible
- [ ] Service role bypass works correctly

**Deliverables**:
1. Database test infrastructure
2. 2 test files with 50 passing tests
3. RLS security audit report

**Risk**: HIGH (database RLS is critical security feature)  
**Blocker Impact**: CRITICAL (production cannot launch without this)

---

## PHASE 3: API Endpoint Tests (CRITICAL)

**Priority**: 🔴 CRITICAL  
**Estimated Effort**: 6-8 hours  
**Coverage Gain**: +10%  
**Timeline**: Week 1, Thursday-Friday  
**Dependencies**: None (can run in parallel with Phases 1-2)

### Objective

Verify that API endpoints work correctly, enforce authentication, maintain tenant isolation, and handle errors properly.

### What We're Testing

1. **Endpoint Functionality** - APIs return correct data
2. **Authentication** - Unauthenticated requests blocked
3. **Tenant Isolation** - APIs filter by tenant_id
4. **Error Handling** - Errors return appropriate responses
5. **Rate Limiting** - Rate limits enforced correctly
6. **Input Validation** - Invalid inputs rejected

### Tasks Breakdown

#### Task 3.1: API Test Infrastructure Setup (1h)

**Goal**: Configure API testing with authentication contexts

**File**: `web/tests/api/setup.ts`

**Actions**:
- Set up test API client with auth
- Create test users (terrapet owner, vet, admin)
- Create API request helpers

**Success Criteria**:
- [ ] Can make authenticated API requests
- [ ] Can test with different user roles
- [ ] Can clean up test data

**Deliverable**: API test infrastructure ready

---

#### Task 3.2: Clinic API Tests (1-2h)

**Goal**: Test clinic-related API endpoints

**File**: `web/tests/api/terrapet-clinic-api.test.ts`

**Test Cases** (20 tests):
```typescript
describe('TerraPet Clinic API', () => {
  // GET /api/clinics/terrapet (10 tests)
  it('returns 200 with clinic data')
  it('returns correct tenant_id: "terrapet"')
  it('returns clinic name: "TerraPet"')
  it('returns contact information')
  it('returns operating hours (9-6, 7 days)')
  it('returns module settings (online_store, qr_tags)')
  it('returns 404 for invalid clinic slug')
  it('returns 404 for empty slug')
  it('handles special characters gracefully')
  it('response time < 500ms')
  
  // GET /api/clinics (5 tests)
  it('returns list of all clinics')
  it('includes terrapet in list')
  it('includes adris in list')
  it('excludes template folders')
  it('response time < 1000ms')
  
  // Error Handling (5 tests)
  it('returns valid JSON error for 404')
  it('returns Spanish error messages')
  it('handles malformed requests')
  it('returns 500 for server errors')
  it('error responses have correct structure')
})
```

**Success Criteria**:
- [ ] All 20 tests pass
- [ ] Clinic API returns correct data
- [ ] Error handling works correctly

**Deliverable**: `terrapet-clinic-api.test.ts` with 20 passing tests

---

#### Task 3.3: Services API Tests (2-3h)

**Goal**: Test services-related API endpoints

**File**: `web/tests/api/terrapet-services-api.test.ts`

**Test Cases** (30 tests):
```typescript
describe('TerraPet Services API', () => {
  // GET /api/terrapet/services (15 tests)
  it('returns 200 with services list')
  it('returns all 9 terrapet services')
  it('filters by tenant_id=terrapet')
  it('does NOT return adris services')
  it('includes service variants (14 total)')
  it('includes "Consulta a Domicilio" variant')
  it('returns booking configuration')
  it('returns service categories')
  it('returns service durations')
  it('returns service prices')
  it('services ordered correctly')
  it('response includes meta information')
  it('response time < 1000ms')
  it('handles pagination if implemented')
  it('handles filtering by category')
  
  // GET /api/terrapet/services/:id (10 tests)
  it('returns 200 with single service')
  it('returns service details')
  it('returns service variants')
  it('returns 404 for invalid service ID')
  it('returns 404 for adris service ID')
  it('enforces tenant isolation')
  it('includes related data')
  it('response time < 300ms')
  it('handles special characters in ID')
  it('validates service ID format')
  
  // Error Handling (5 tests)
  it('returns 400 for invalid tenant')
  it('returns 404 for non-existent service')
  it('returns Spanish error messages')
  it('handles malformed requests')
  it('error responses structured correctly')
})
```

**Success Criteria**:
- [ ] All 30 tests pass
- [ ] Services API returns terrapet services only
- [ ] Tenant isolation enforced

**Deliverable**: `terrapet-services-api.test.ts` with 30 passing tests

---

#### Task 3.4: Appointments API Tests (2-3h)

**Goal**: Test appointment booking and management APIs

**File**: `web/tests/api/terrapet-appointments-api.test.ts`

**Test Cases** (40 tests):
```typescript
describe('TerraPet Appointments API', () => {
  // POST /api/terrapet/appointments (15 tests)
  it('requires authentication')
  it('returns 401 for unauthenticated request')
  it('creates appointment for authenticated user')
  it('returns 201 with appointment data')
  it('validates service_id exists')
  it('validates date/time format')
  it('validates date is in future')
  it('checks vet availability')
  it('enforces tenant isolation (terrapet only)')
  it('requires address for home visit bookings')
  it('validates phone number format')
  it('validates email format')
  it('prevents double booking')
  it('sends confirmation (if implemented)')
  it('response time < 2000ms')
  
  // GET /api/terrapet/appointments (10 tests)
  it('requires authentication')
  it('returns user appointments only')
  it('filters by tenant_id=terrapet')
  it('does NOT return adris appointments')
  it('includes service details')
  it('includes pet information')
  it('supports date range filtering')
  it('supports status filtering')
  it('pagination works correctly')
  it('response time < 1000ms')
  
  // GET /api/terrapet/appointments/:id (5 tests)
  it('requires authentication')
  it('returns appointment details')
  it('includes related data (service, pet)')
  it('returns 404 for other tenant appointment')
  it('response time < 500ms')
  
  // PATCH /api/terrapet/appointments/:id (5 tests)
  it('requires authentication')
  it('allows owner to cancel appointment')
  it('allows vet to update status')
  it('prevents cross-tenant updates')
  it('validates status transitions')
  
  // Error Handling (5 tests)
  it('returns 401 for unauthenticated')
  it('returns 400 for invalid data')
  it('returns 404 for non-existent appointment')
  it('returns Spanish error messages')
  it('error responses include validation details')
})
```

**Success Criteria**:
- [ ] All 40 tests pass
- [ ] Booking API requires auth
- [ ] Tenant isolation enforced
- [ ] Home visit requires address

**Deliverable**: `terrapet-appointments-api.test.ts` with 40 passing tests

---

### Phase 3 Summary

**Total Tests**: 90 tests
- Clinic API: 20 tests
- Services API: 30 tests
- Appointments API: 40 tests

**Success Criteria**:
- [ ] All 90 API tests pass
- [ ] Authentication enforced
- [ ] Tenant isolation works
- [ ] Error handling correct
- [ ] Response times acceptable

**Deliverables**:
1. API test infrastructure
2. 3 test files with 90 passing tests
3. API performance benchmarks

**Risk**: MEDIUM (API logic might have bugs)  
**Blocker Impact**: CRITICAL (users can't book without working APIs)

---

## PHASE 4: E2E Critical User Flows (HIGH PRIORITY)

**Priority**: 🟡 HIGH  
**Estimated Effort**: 8-12 hours  
**Coverage Gain**: +15%  
**Timeline**: Week 2, Monday-Wednesday  
**Dependencies**: Phases 1-3 should be mostly complete

### Objective

Test critical user journeys end-to-end in a real browser environment using Playwright.

### What We're Testing

1. **Visitor Flow** - Browse site, view services, navigate
2. **Booking Flow** - Book appointment end-to-end
3. **Home Visit Flow** - Book home visit with address
4. **Multi-Tenant Flow** - Verify isolation in browser
5. **Error Scenarios** - Test error handling in UI

### Tasks Breakdown

#### Task 4.1: E2E Test Infrastructure Setup (1-2h)

**Goal**: Configure Playwright for TerraPet E2E tests

**File**: `web/e2e/terrapet-setup.ts`

**Actions**:
- Configure Playwright with TerraPet base URL
- Set up test users and auth state
- Create page object models

**Success Criteria**:
- [ ] Playwright can navigate to /terrapet
- [ ] Can authenticate as different users
- [ ] Screenshots/videos on failure

**Deliverable**: E2E test infrastructure ready

---

#### Task 4.2: Visitor Flow Tests (2-3h)

**Goal**: Test visitor can browse TerraPet site

**File**: `web/e2e/terrapet-visitor-flow.spec.ts`

**Test Cases** (20 tests):
```typescript
test.describe('TerraPet Visitor Flow', () => {
  // Homepage (7 tests)
  test('visitor can load homepage at /terrapet', async ({ page }) => {
    await page.goto('/terrapet')
    await expect(page).toHaveTitle(/TerraPet/)
    await expect(page.locator('h1')).toContainText('TerraPet')
  })
  
  test('logo displays from Google Drive', async ({ page }) => {
    // Check logo image loads
    // Verify no broken images
  })
  
  test('hero section displays correctly', async ({ page }) => {
    // Verify headline, subheadline, CTAs
  })
  
  test('3 features display with descriptions', async ({ page }) => {
    // Verify all features visible
  })
  
  test('theme colors applied (earth tones)', async ({ page }) => {
    // Check computed styles for primary color
  })
  
  test('contact links clickable', async ({ page }) => {
    // Test WhatsApp, email, maps links
  })
  
  test('page loads in < 3 seconds', async ({ page }) => {
    // Measure page load time
  })
  
  // Services Page (5 tests)
  test('visitor can navigate to services page', async ({ page }) => {
    await page.goto('/terrapet')
    await page.click('text=Servicios')
    await expect(page).toHaveURL('/terrapet/services')
  })
  
  test('all 9 services display', async ({ page }) => {
    // Count service cards
  })
  
  test('home visit variant visible', async ({ page }) => {
    // Find "Consulta a Domicilio"
  })
  
  test('service details expandable', async ({ page }) => {
    // Click to expand service
  })
  
  test('booking CTAs visible', async ({ page }) => {
    // Verify booking buttons
  })
  
  // Navigation (5 tests)
  test('visitor can navigate to about page', async ({ page }) => {})
  test('visitor can navigate to FAQ page', async ({ page }) => {})
  test('navigation menu works on mobile', async ({ page }) => {})
  test('footer links work', async ({ page }) => {})
  test('back button navigation works', async ({ page }) => {})
  
  // Images (3 tests)
  test('no broken images on homepage', async ({ page }) => {})
  test('Google Drive images load successfully', async ({ page }) => {})
  test('images have correct dimensions', async ({ page }) => {})
})
```

**Success Criteria**:
- [ ] All 20 tests pass
- [ ] Visitor can browse entire site
- [ ] No broken images
- [ ] Navigation works

**Deliverable**: `terrapet-visitor-flow.spec.ts` with 20 passing tests

---

#### Task 4.3: Booking Flow Tests (3-4h)

**Goal**: Test complete appointment booking flow

**File**: `web/e2e/terrapet-booking-flow.spec.ts`

**Test Cases** (25 tests):
```typescript
test.describe('TerraPet Booking Flow', () => {
  // General Consultation Booking (10 tests)
  test('owner can book general consultation', async ({ page }) => {
    // 1. Login as owner
    // 2. Navigate to booking
    // 3. Select "Consulta General"
    // 4. Choose date/time
    // 5. Fill contact info
    // 6. Submit booking
    // 7. Verify confirmation
  })
  
  test('booking form requires authentication', async ({ page }) => {
    // Unauthenticated redirects to login
  })
  
  test('service selection works', async ({ page }) => {
    // Can select from 9 services
  })
  
  test('date picker shows available slots', async ({ page }) => {
    // 9 AM - 6 PM slots visible
  })
  
  test('form validates required fields', async ({ page }) => {
    // Submit without data shows errors
  })
  
  test('phone number validation works', async ({ page }) => {})
  test('email validation works', async ({ page }) => {})
  test('date must be in future', async ({ page }) => {})
  test('confirmation page displays', async ({ page }) => {})
  test('booking appears in user dashboard', async ({ page }) => {})
  
  // Home Visit Booking (10 tests)
  test('home visit requires address field', async ({ page }) => {
    // 1. Select "Consulta a Domicilio"
    // 2. Address field appears
    // 3. Address is required
  })
  
  test('address validation works', async ({ page }) => {})
  test('home visit price different from clinic', async ({ page }) => {})
  test('home visit includes special instructions', async ({ page }) => {})
  test('can book home visit successfully', async ({ page }) => {})
  test('home visit confirmation includes address', async ({ page }) => {})
  test('home visit shows in appointment list', async ({ page }) => {})
  test('can edit home visit address', async ({ page }) => {})
  test('can cancel home visit booking', async ({ page }) => {})
  test('home visit confirmation email sent', async ({ page }) => {})
  
  // Error Scenarios (5 tests)
  test('handles server error gracefully', async ({ page }) => {})
  test('handles double booking attempt', async ({ page }) => {})
  test('handles invalid date/time', async ({ page }) => {})
  test('shows friendly error messages in Spanish', async ({ page }) => {})
  test('allows retry after error', async ({ page }) => {})
})
```

**Success Criteria**:
- [ ] All 25 tests pass
- [ ] Can book general consultation
- [ ] Can book home visit
- [ ] Form validation works
- [ ] Error handling works

**Deliverable**: `terrapet-booking-flow.spec.ts` with 25 passing tests

---

#### Task 4.4: Multi-Tenant Isolation E2E Tests (2-3h)

**Goal**: Verify tenant isolation in browser

**File**: `web/e2e/terrapet-isolation.spec.ts`

**Test Cases** (15 tests):
```typescript
test.describe('TerraPet Multi-Tenant Isolation (E2E)', () => {
  // Visual Isolation (5 tests)
  test('terrapet shows earth tone colors', async ({ page }) => {})
  test('adris shows different colors', async ({ page }) => {})
  test('terrapet shows TerraPet branding', async ({ page }) => {})
  test('adris shows Adris branding', async ({ page }) => {})
  test('tenant-specific content displays', async ({ page }) => {})
  
  // Data Isolation (5 tests)
  test('terrapet user sees terrapet appointments only', async ({ page }) => {})
  test('terrapet user cannot access /adris/portal', async ({ page }) => {})
  test('API calls filtered by tenant', async ({ page }) => {})
  test('search returns tenant-specific results', async ({ page }) => {})
  test('cross-tenant navigation blocked', async ({ page }) => {})
  
  // Service Isolation (5 tests)
  test('terrapet shows 9 services', async ({ page }) => {})
  test('adris shows different service count', async ({ page }) => {})
  test('services unique to terrapet visible', async ({ page }) => {})
  test('home visit only in terrapet', async ({ page }) => {})
  test('booking creates for correct tenant', async ({ page }) => {})
})
```

**Success Criteria**:
- [ ] All 15 tests pass
- [ ] Visual isolation verified
- [ ] Data isolation verified
- [ ] Cannot access other tenant data

**Deliverable**: `terrapet-isolation.spec.ts` with 15 passing tests

---

### Phase 4 Summary

**Total Tests**: 60 E2E tests
- Visitor Flow: 20 tests
- Booking Flow: 25 tests
- Isolation: 15 tests

**Success Criteria**:
- [ ] All 60 E2E tests pass
- [ ] Complete user flows work
- [ ] Booking flow end-to-end
- [ ] Multi-tenant isolation verified in browser

**Deliverables**:
1. E2E test infrastructure
2. 3 test files with 60 passing tests
3. Screenshots/videos of flows

**Risk**: MEDIUM (Playwright can be flaky)  
**Blocker Impact**: HIGH (need to verify users can actually use app)

---

## PHASE 5: Performance Tests (MEDIUM PRIORITY)

**Priority**: 🟢 MEDIUM  
**Estimated Effort**: 3-4 hours  
**Coverage Gain**: +5%  
**Timeline**: Week 2, Thursday  
**Dependencies**: Phase 1 complete (need components working)

### Objective

Verify TerraPet site performs well, loads quickly, and provides good user experience.

### What We're Testing

1. **Page Load Times** - Pages load in < 3 seconds
2. **Google Drive Images** - Images load in < 2 seconds each
3. **Lighthouse Scores** - Performance > 90, Accessibility > 90, SEO > 90
4. **Core Web Vitals** - LCP, FID, CLS within thresholds
5. **Bundle Size** - JavaScript bundles optimized

### Tasks Breakdown

#### Task 5.1: Performance Test Setup (30min)

**Goal**: Configure performance testing tools

**Tools**:
- Lighthouse CI
- Playwright performance API
- Custom timing utilities

**Success Criteria**:
- [ ] Can run Lighthouse audits
- [ ] Can measure page load times
- [ ] Can measure image load times

**Deliverable**: Performance test infrastructure

---

#### Task 5.2: Page Load Performance Tests (1-2h)

**Goal**: Measure and verify page load times

**File**: `web/tests/performance/terrapet-page-load.test.ts`

**Test Cases** (15 tests):
```typescript
describe('TerraPet Page Load Performance', () => {
  // Homepage (5 tests)
  it('homepage loads in < 3 seconds')
  it('homepage First Contentful Paint < 1.5s')
  it('homepage Largest Contentful Paint < 2.5s')
  it('homepage Time to Interactive < 3s')
  it('homepage Cumulative Layout Shift < 0.1')
  
  // Services Page (5 tests)
  it('services page loads in < 3 seconds')
  it('services page FCP < 1.5s')
  it('services page LCP < 2.5s')
  it('services page TTI < 3.5s')
  it('services page CLS < 0.1')
  
  // Other Pages (5 tests)
  it('about page loads in < 2.5 seconds')
  it('FAQ page loads in < 2.5 seconds')
  it('booking page loads in < 3 seconds')
  it('all pages meet Core Web Vitals')
  it('no pages have layout shift issues')
})
```

**Success Criteria**:
- [ ] All pages load in < 3 seconds
- [ ] Core Web Vitals met
- [ ] No layout shift issues

**Deliverable**: Page load performance report

---

#### Task 5.3: Lighthouse Audits (1-2h)

**Goal**: Run Lighthouse audits and verify scores

**File**: `web/tests/performance/terrapet-lighthouse.test.ts`

**Test Cases** (10 tests):
```typescript
describe('TerraPet Lighthouse Audits', () => {
  // Homepage Lighthouse (5 tests)
  it('homepage Performance score > 90')
  it('homepage Accessibility score > 90')
  it('homepage Best Practices score > 90')
  it('homepage SEO score > 90')
  it('homepage PWA basics met')
  
  // Services Page Lighthouse (5 tests)
  it('services Performance score > 85')
  it('services Accessibility score > 90')
  it('services Best Practices score > 90')
  it('services SEO score > 90')
  it('services page optimized')
})
```

**Success Criteria**:
- [ ] Performance > 90
- [ ] Accessibility > 90
- [ ] SEO > 90

**Deliverable**: Lighthouse audit reports

---

#### Task 5.4: Image Load Performance Tests (1h)

**Goal**: Verify Google Drive images load acceptably

**File**: `web/tests/performance/terrapet-images.test.ts`

**Test Cases** (10 tests):
```typescript
describe('TerraPet Image Load Performance', () => {
  // Logo Loading (3 tests)
  it('logo loads in < 2 seconds')
  it('logo doesn\'t block page render')
  it('logo has correct cache headers')
  
  // Hero Images (3 tests)
  it('hero image loads in < 3 seconds')
  it('lazy loading works for below-fold images')
  it('images use correct formats (WebP, etc.)')
  
  // Google Drive Performance (4 tests)
  it('Google Drive redirects handled')
  it('total image payload < 2MB')
  it('images progressively enhanced')
  it('no images cause layout shift')
})
```

**Success Criteria**:
- [ ] Images load in < 3 seconds
- [ ] No layout shift from images
- [ ] Lazy loading works

**Deliverable**: Image performance report

---

### Phase 5 Summary

**Total Tests**: 35 performance tests
- Page Load: 15 tests
- Lighthouse: 10 tests
- Images: 10 tests

**Success Criteria**:
- [ ] All pages load < 3 seconds
- [ ] Lighthouse scores > 90
- [ ] Images load acceptably
- [ ] Core Web Vitals met

**Deliverables**:
1. Performance test suite
2. Lighthouse reports
3. Performance optimization recommendations

**Risk**: LOW (performance tests are informational)  
**Blocker Impact**: MEDIUM (slow site = poor UX, but not critical)

---

## PHASE 6: Security Tests (CRITICAL)

**Priority**: 🔴 CRITICAL  
**Estimated Effort**: 4-5 hours  
**Coverage Gain**: +10%  
**Timeline**: Week 2, Friday  
**Dependencies**: Phases 2-3 complete (need APIs working)

### Objective

Verify TerraPet application is secure against common vulnerabilities and attack vectors.

### What We're Testing

1. **Authentication** - Auth required where needed
2. **Authorization** - Users can only access their data
3. **Input Validation** - XSS and injection prevented
4. **CSRF Protection** - Cross-site request forgery blocked
5. **Rate Limiting** - Brute force attacks prevented
6. **Data Exposure** - No sensitive data leaked

### Tasks Breakdown

#### Task 6.1: Authentication Security Tests (1-2h)

**Goal**: Verify authentication enforced correctly

**File**: `web/tests/security/terrapet-auth.test.ts`

**Test Cases** (20 tests):
```typescript
describe('TerraPet Authentication Security', () => {
  // Unauthenticated Access (10 tests)
  it('unauthenticated cannot access portal')
  it('unauthenticated cannot access dashboard')
  it('unauthenticated cannot book appointment')
  it('unauthenticated cannot view medical records')
  it('unauthenticated can view public pages')
  it('unauthenticated redirected to login')
  it('login page accessible')
  it('signup page accessible')
  it('password reset works')
  it('magic link login works')
  
  // Session Security (10 tests)
  it('sessions expire after timeout')
  it('logout invalidates session')
  it('concurrent session handling')
  it('session fixation prevented')
  it('session hijacking prevented')
  it('HTTPS required in production')
  it('secure cookie flags set')
  it('httpOnly cookie flags set')
  it('sameSite cookie flags set')
  it('CSRF tokens validated')
})
```

**Success Criteria**:
- [ ] All 20 tests pass
- [ ] Auth enforced on protected routes
- [ ] Session security proper

**Deliverable**: Authentication security report

---

#### Task 6.2: Authorization & Access Control Tests (1-2h)

**Goal**: Verify users can only access authorized data

**File**: `web/tests/security/terrapet-authorization.test.ts`

**Test Cases** (25 tests):
```typescript
describe('TerraPet Authorization Security', () => {
  // Owner Role (10 tests)
  it('owner can view own pets')
  it('owner cannot view other owner pets')
  it('owner can book appointments')
  it('owner cannot access vet tools')
  it('owner cannot access admin panel')
  it('owner cannot modify other user data')
  it('owner cannot delete other appointments')
  it('owner cannot see other medical records')
  it('owner role enforced on API calls')
  it('owner role enforced on UI')
  
  // Vet Role (10 tests)
  it('vet can view all terrapet pets')
  it('vet cannot view adris pets')
  it('vet can create medical records')
  it('vet can prescribe medications')
  it('vet cannot access admin functions')
  it('vet cannot modify clinic settings')
  it('vet can manage appointments')
  it('vet role enforced on API calls')
  it('vet role enforced on UI')
  it('vet cannot access financial data')
  
  // Cross-Tenant (5 tests)
  it('terrapet user cannot access adris data')
  it('API calls enforce tenant isolation')
  it('database queries filter by tenant')
  it('file uploads isolated by tenant')
  it('no data leakage between tenants')
})
```

**Success Criteria**:
- [ ] All 25 tests pass
- [ ] Role-based access enforced
- [ ] No unauthorized data access

**Deliverable**: Authorization security report

---

#### Task 6.3: Input Validation & XSS Prevention Tests (1h)

**Goal**: Verify XSS and injection attacks prevented

**File**: `web/tests/security/terrapet-input-validation.test.ts`

**Test Cases** (20 tests):
```typescript
describe('TerraPet Input Validation Security', () => {
  // XSS Prevention (10 tests)
  it('form inputs sanitized (<script> tags removed)')
  it('HTML entities escaped in output')
  it('JavaScript injection prevented')
  it('onerror handlers stripped')
  it('event handlers stripped')
  it('iframe injection prevented')
  it('SVG XSS vectors prevented')
  it('style tag injection prevented')
  it('URL XSS prevented (javascript:)')
  it('data: URL XSS prevented')
  
  // SQL Injection Prevention (5 tests)
  it('SQL injection in search prevented')
  it('SQL injection in filters prevented')
  it('parameterized queries used')
  it('ORM escapes user input')
  it('no raw SQL with user input')
  
  // Other Injection (5 tests)
  it('command injection prevented')
  it('LDAP injection prevented')
  it('NoSQL injection prevented')
  it('path traversal prevented')
  it('file upload validation works')
})
```

**Success Criteria**:
- [ ] All 20 tests pass
- [ ] XSS attacks prevented
- [ ] Injection attacks blocked

**Deliverable**: Input validation security report

---

#### Task 6.4: Rate Limiting & Brute Force Prevention (1h)

**Goal**: Verify rate limiting prevents abuse

**File**: `web/tests/security/terrapet-rate-limiting.test.ts`

**Test Cases** (15 tests):
```typescript
describe('TerraPet Rate Limiting Security', () => {
  // Login Rate Limiting (5 tests)
  it('limits login attempts (5 per 15min)')
  it('blocks after failed attempts')
  it('returns 429 Too Many Requests')
  it('rate limit resets after timeout')
  it('captcha required after threshold')
  
  // API Rate Limiting (5 tests)
  it('limits API calls (100 per minute)')
  it('authenticated users higher limits')
  it('rate limit headers present')
  it('rate limit enforced per IP')
  it('rate limit enforced per user')
  
  // DDoS Protection (5 tests)
  it('handles burst traffic')
  it('connection limits enforced')
  it('slow requests timeout')
  it('large payload rejected')
  it('suspicious patterns detected')
})
```

**Success Criteria**:
- [ ] All 15 tests pass
- [ ] Rate limits enforced
- [ ] Brute force attacks prevented

**Deliverable**: Rate limiting security report

---

### Phase 6 Summary

**Total Tests**: 80 security tests
- Authentication: 20 tests
- Authorization: 25 tests
- Input Validation: 20 tests
- Rate Limiting: 15 tests

**Success Criteria**:
- [ ] All 80 security tests pass
- [ ] No critical vulnerabilities
- [ ] OWASP Top 10 mitigated
- [ ] Multi-tenant security verified

**Deliverables**:
1. Security test suite
2. Security audit report
3. Vulnerability remediation plan

**Risk**: CRITICAL (security vulnerabilities unacceptable)  
**Blocker Impact**: CRITICAL (cannot launch with security issues)

---

## PHASE 7: Final Validation & Production Readiness (HIGH)

**Priority**: 🟡 HIGH  
**Estimated Effort**: 2-3 hours  
**Coverage Gain**: +5%  
**Timeline**: Week 3, Monday  
**Dependencies**: All previous phases complete

### Objective

Final verification that TerraPet is ready for production deployment.

### Tasks Breakdown

#### Task 7.1: Complete Test Suite Run (1h)

**Goal**: Run all tests end-to-end

**Actions**:
```bash
# Run all test suites
npm test                    # Unit + integration
npm run test:components     # Component tests
npm run test:api           # API tests
npm run test:e2e           # E2E tests
npm run test:performance   # Performance tests
npm run test:security      # Security tests
```

**Success Criteria**:
- [ ] All test suites pass
- [ ] No flaky tests
- [ ] Total coverage ≥ 70%

**Deliverable**: Complete test run report

---

#### Task 7.2: Production Environment Verification (1h)

**Goal**: Verify production environment ready

**Checklist**:
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Supabase RLS policies deployed
- [ ] DNS configured correctly
- [ ] SSL certificates valid
- [ ] CDN configured (if needed)
- [ ] Monitoring configured
- [ ] Error tracking configured
- [ ] Backup strategy in place
- [ ] Rollback plan documented

**Deliverable**: Production readiness checklist

---

#### Task 7.3: Staging Deployment & Smoke Tests (1h)

**Goal**: Deploy to staging and verify

**Actions**:
1. Deploy to staging environment
2. Run smoke test suite
3. Manual testing of critical flows
4. Performance testing on staging
5. Get client approval

**Success Criteria**:
- [ ] Staging deployment successful
- [ ] Smoke tests pass
- [ ] Client approves staging
- [ ] No critical issues found

**Deliverable**: Staging deployment report

---

### Phase 7 Summary

**Total Effort**: 2-3 hours

**Success Criteria**:
- [ ] All test suites pass (70%+ coverage)
- [ ] Production environment ready
- [ ] Staging deployment successful
- [ ] Client approval received

**Deliverables**:
1. Complete test report
2. Production readiness checklist
3. Staging deployment report
4. Go/no-go recommendation

**Risk**: LOW (final checks)  
**Blocker Impact**: HIGH (cannot launch without validation)

---

## Test Coverage Summary

### Coverage Targets by Phase

| Phase | Tests | Coverage Area | Target % | Status |
|-------|-------|---------------|----------|--------|
| **Completed** | 109 | Config + Integration | 25% | ✅ DONE |
| **Phase 1** | 120 | Components | +15% → 40% | ⏳ TODO |
| **Phase 2** | 50 | Database RLS | +10% → 50% | ⏳ TODO |
| **Phase 3** | 90 | APIs | +10% → 60% | ⏳ TODO |
| **Phase 4** | 60 | E2E Flows | +15% → 75% | ⏳ TODO |
| **Phase 5** | 35 | Performance | +5% → 80% | ⏳ TODO |
| **Phase 6** | 80 | Security | +10% → 90% | ⏳ TODO |
| **Phase 7** | - | Validation | - | ⏳ TODO |
| **TOTAL** | **544** | **All** | **70%+** | **35-50h** |

### Coverage by Category (Target State)

| Category | Current | Target | Gap |
|----------|---------|--------|-----|
| **Configuration** | 100% | 100% | 0% |
| **Data Loading** | 100% | 100% | 0% |
| **Components** | 0% | 80% | +80% |
| **Database** | 0% | 90% | +90% |
| **APIs** | 0% | 90% | +90% |
| **E2E** | 0% | 60% | +60% |
| **Performance** | 0% | 50% | +50% |
| **Security** | 0% | 90% | +90% |
| **Accessibility** | 0% | 50% | +50% |

---

## Timeline & Resource Allocation

### 3-Week Schedule

#### Week 1: Critical Foundation (20-24h)
**Goal**: Establish component, database, and API test coverage

| Day | Phase | Tasks | Hours | Deliverable |
|-----|-------|-------|-------|-------------|
| **Mon** | Phase 1 | Component infrastructure + homepage | 4-5h | Homepage tests |
| **Tue** | Phase 1 | Services + about/FAQ pages | 4-5h | Services tests |
| **Wed** | Phase 2 | Database RLS + isolation | 4-6h | RLS tests |
| **Thu** | Phase 3 | Clinic + services APIs | 3-4h | API tests |
| **Fri** | Phase 3 | Appointments API | 3-4h | Booking API tests |

**Week 1 Deliverables**:
- 120 component tests
- 50 database tests
- 90 API tests
- **260 total new tests**
- **Coverage: 25% → 60%**

---

#### Week 2: User Flows & Quality (15-21h)
**Goal**: E2E flows, performance, security

| Day | Phase | Tasks | Hours | Deliverable |
|-----|-------|-------|-------|-------------|
| **Mon** | Phase 4 | E2E infrastructure + visitor flow | 3-4h | Visitor tests |
| **Tue** | Phase 4 | Booking flow E2E | 3-4h | Booking tests |
| **Wed** | Phase 4 | Multi-tenant isolation E2E | 2-3h | Isolation tests |
| **Thu** | Phase 5 | Performance + Lighthouse | 3-4h | Performance tests |
| **Fri** | Phase 6 | Security tests | 4-5h | Security tests |

**Week 2 Deliverables**:
- 60 E2E tests
- 35 performance tests
- 80 security tests
- **175 total new tests**
- **Coverage: 60% → 80%**

---

#### Week 3: Final Validation & Launch (3-5h)
**Goal**: Production readiness and deployment

| Day | Phase | Tasks | Hours | Deliverable |
|-----|-------|-------|-------|-------------|
| **Mon** | Phase 7 | Complete test run + staging deploy | 2-3h | Readiness report |
| **Tue** | Launch | Production deployment | 1-2h | Live site |
| **Wed** | Monitor | Post-launch monitoring | Ongoing | Stability report |

**Week 3 Deliverables**:
- Production deployment
- Monitoring dashboards
- **Coverage: 70%+ achieved**

---

### Resource Requirements

| Resource | Requirement | Notes |
|----------|-------------|-------|
| **Developer Time** | 35-50 hours | Over 3 weeks = 12-17h/week |
| **Test Infrastructure** | Vitest + Playwright | Already installed |
| **CI/CD Pipeline** | GitHub Actions | May need configuration |
| **Staging Environment** | Vercel preview | Already available |
| **Database Access** | Supabase test project | May need separate test DB |
| **Client Availability** | 2-3 hours | For staging approval |

---

## Risk Management

### High-Risk Areas

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Component tests fail to render** | MEDIUM | HIGH | Use React Testing Library correctly, mock Next.js |
| **Database RLS has gaps** | LOW | CRITICAL | Thorough policy testing, manual security audit |
| **API tests reveal bugs** | MEDIUM | MEDIUM | Fix bugs as found, adjust timeline if needed |
| **E2E tests are flaky** | HIGH | MEDIUM | Use explicit waits, retry logic, stable selectors |
| **Performance issues found** | MEDIUM | MEDIUM | Optimize Google Drive images, consider CDN |
| **Security vulnerabilities** | LOW | CRITICAL | Fix immediately, delay launch if needed |
| **Timeline overruns** | MEDIUM | MEDIUM | Prioritize critical tests, defer nice-to-haves |

### Contingency Plans

**If timeline slips**:
1. Prioritize Phases 1-3 (critical foundation)
2. Simplify Phase 4 (reduce E2E tests)
3. Make Phase 5 optional (performance can improve post-launch)
4. Phase 6 is non-negotiable (security critical)

**If major bugs found**:
1. Create bug tickets with severity
2. Fix critical bugs immediately
3. Defer non-critical bugs to post-launch
4. Update test suite to prevent regression

**If tests fail consistently**:
1. Review test methodology
2. Consult with senior developer
3. Adjust expectations if needed
4. Document known limitations

---

## Success Criteria

### Minimum Production Requirements (MUST HAVE)

- [ ] **Config tests**: 100% pass (39/39) ✅ DONE
- [ ] **Integration tests**: 100% pass (70/70) ✅ DONE
- [ ] **Component tests**: 90%+ pass (108/120)
- [ ] **Database RLS tests**: 100% pass (50/50)
- [ ] **API tests**: 90%+ pass (81/90)
- [ ] **E2E critical flows**: 100% pass (25/25 booking flow)
- [ ] **Security tests**: 100% pass (80/80)
- [ ] **Performance**: All pages < 3s load time
- [ ] **Lighthouse**: Performance > 85, Accessibility > 90
- [ ] **Overall coverage**: 70%+

### Nice-to-Have (Can defer post-launch)

- [ ] Full E2E test suite (60/60)
- [ ] Complete performance optimization
- [ ] Accessibility 100% compliant
- [ ] Mobile app testing
- [ ] Load testing
- [ ] Penetration testing

---

## Deployment Strategy

### Staging Deployment (Week 3, Monday)

**Actions**:
1. Deploy to Vercel preview environment
2. Run smoke test suite
3. Manual testing by developer
4. Share with client for approval
5. Fix any issues found
6. Get client sign-off

**Go/No-Go Criteria**:
- [ ] All critical tests pass
- [ ] No blocker bugs
- [ ] Client approves
- [ ] Performance acceptable
- [ ] Security validated

---

### Production Deployment (Week 3, Tuesday)

**Actions**:
1. Final test suite run
2. Production environment verification
3. Database migrations
4. Deploy to production
5. Smoke test production
6. Monitor for 24-48 hours

**Rollback Triggers**:
- Critical bug found
- Security vulnerability discovered
- Performance unacceptable
- Data integrity issues
- Client requests rollback

---

### Post-Launch Monitoring (Week 3+)

**Monitor for 48 hours**:
- [ ] Error rates (target: < 1%)
- [ ] Page load times (target: < 3s)
- [ ] API response times (target: < 500ms)
- [ ] Database queries (check for N+1)
- [ ] User feedback
- [ ] Google Analytics
- [ ] Crash reports

**Success Metrics**:
- Zero critical errors
- 95%+ uptime
- < 3s average page load
- Positive client feedback
- Successful bookings made

---

## Documentation Deliverables

### Required Documentation

1. **Test Plan** (this document) ✅ DONE
2. **Test Reports** (after each phase)
   - Component test report
   - Database test report
   - API test report
   - E2E test report
   - Performance report
   - Security audit report
3. **Bug Tracking**
   - Bug log with severity/status
   - Fixed bugs list
   - Known issues list
4. **Deployment Documentation**
   - Staging deployment guide
   - Production deployment guide
   - Rollback procedures
5. **Monitoring Documentation**
   - Dashboard setup
   - Alert configuration
   - Incident response plan

---

## Next Session Handoff

### If Starting Phase 1 Tomorrow

**Setup Required**:
```bash
cd web
npm install -D @testing-library/react @testing-library/jest-dom
```

**First Task**: Task 1.1 - Component Test Infrastructure (1-2h)

**File to Create**: `web/vitest.config.components.ts`

**Goal**: Configure Vitest for React component testing

**Prompt for Next Session**:
```
Start Phase 1: TerraPet Component Rendering Tests

GOAL: Set up component test infrastructure and create homepage tests

TASKS:
1. Configure Vitest + React Testing Library
2. Create test setup file
3. Write 25 homepage component tests

REFER TO:
- TERRAPET_COMPLETE_TESTING_PLAN.md (this file)
- Phase 1, Task 1.1 for infrastructure setup
- Phase 1, Task 1.2 for homepage tests

DELIVERABLE:
- Component test infrastructure working
- 25 homepage tests passing
- Can render React components in tests

ESTIMATED TIME: 4-5 hours

Let's start with Task 1.1: Component Test Infrastructure Setup
```

---

## Conclusion

This comprehensive plan provides a **clear roadmap from 25% to 70%+ test coverage** over 3 weeks.

### Key Points

1. **7 Phases** covering all critical areas
2. **35-50 hours** total effort (manageable over 3 weeks)
3. **544 new tests** to be created
4. **Clear success criteria** for each phase
5. **Risk mitigation** strategies included
6. **Production deployment** targeted for Week 3

### Current State vs. Target State

| Metric | Current | Target | How We Get There |
|--------|---------|--------|------------------|
| **Tests** | 109 | 544 | +435 new tests across 7 phases |
| **Coverage** | 25% | 70%+ | +45% through systematic testing |
| **Confidence** | 60% | 95%+ | Prove everything works |
| **Production Ready** | NO | YES | Complete all 7 phases |

**This plan is ACTIONABLE, COMPREHENSIVE, and ACHIEVABLE.**

Let's execute! 🚀

---

**End of Complete Testing Plan**
