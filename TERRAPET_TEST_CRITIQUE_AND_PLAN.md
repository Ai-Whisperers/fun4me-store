# TerraPet Test Critique & Comprehensive Testing Plan

**Generated**: January 22, 2026  
**Severity**: 🔴 CRITICAL  
**Status**: Current tests are inadequate for production deployment

---

## 🔥 THE BRUTAL TRUTH: Current Test Coverage

### What We're Actually Testing (Spoiler: Almost Nothing)

Current test file: `web/tests/terrapet/config-validation.test.ts`  
**39 tests** that sound impressive but are **NOT TESTING THE APPLICATION**.

### The Roast 🎯

#### 1. **JSON File Existence != Functional Testing**

```typescript
it('should have all required configuration files', async () => {
  // This just checks if files exist. Congratulations, you can use `ls`.
})
```

**What this DOESN'T test**:
- ❌ Can Next.js actually READ these files?
- ❌ Does the app CRASH when loading this data?
- ❌ Are the files in the correct format for the app's expectations?
- ❌ Do pages actually RENDER with this data?

**What it DOES test**:
- ✅ Your filesystem works
- ✅ You can use `fs.readFile`

#### 2. **Color Validation Without Rendering**

```typescript
it('should have sage green as primary color', () => {
  expect(theme.colors.primary.main).toBe('#78866B')
})
```

**What this DOESN'T test**:
- ❌ Does this color actually GET APPLIED to the page?
- ❌ Are CSS variables correctly injected?
- ❌ Does the theme system actually WORK?
- ❌ Can users SEE the earth tones?

**What it DOES test**:
- ✅ You can read a hex code from JSON
- ✅ String comparison works

#### 3. **Service "Validation" That Proves Nothing**

```typescript
it('should have dog-focused service descriptions', () => {
  // Checks if text contains "perro", "canino", or "peludo"
})
```

**What this DOESN'T test**:
- ❌ Do services actually DISPLAY on the page?
- ❌ Can users actually BOOK these services?
- ❌ Do service variants RENDER correctly?
- ❌ Does the booking flow WORK?
- ❌ Are services AVAILABLE for TerraPet tenant only?

**What it DOES test**:
- ✅ String includes() method works
- ✅ You can grep for Spanish words

#### 4. **The "Home Visit" Test (Most Useless Award)**

```typescript
it('should have home visit consultation variant', () => {
  const variants = consultation.variants.map((v: any) => v.name)
  expect(variants).toContain('Consulta a Domicilio')
})
```

**What this DOESN'T test**:
- ❌ Does the home visit option SHOW UP in the UI?
- ❌ Does it require an address (as it should)?
- ❌ Can users actually BOOK a home visit?
- ❌ Does it charge differently than clinic visits?

**What it DOES test**:
- ✅ You can use Array.map()
- ✅ Array.includes() returns true

#### 5. **Image "Accessibility" Without Network Requests**

```typescript
it('should have logo from Google Drive', () => {
  expect(images.images.branding.logo.src).toContain('drive.google.com')
})
```

**What this DOESN'T test**:
- ❌ Does the image actually LOAD in a browser?
- ❌ Is the Google Drive file PUBLIC?
- ❌ Does the image display with correct dimensions?
- ❌ What happens if Google Drive is slow?
- ❌ Are there CORS issues?

**What it DOES test**:
- ✅ URL string contains "drive.google.com"

---

## 🚨 CRITICAL GAPS: What We're NOT Testing

### Category 1: Application Integration (0% coverage)

**NOT TESTED**:
1. ❌ Next.js can load TerraPet configuration
2. ❌ `getClinicData('terrapet')` returns correct data
3. ❌ Multi-tenant routing works (`/terrapet` vs `/adris`)
4. ❌ Theme CSS variables are injected into pages
5. ❌ Configuration errors are handled gracefully

**Impact**: **CRITICAL** - We don't know if the app actually works.

### Category 2: Page Rendering (0% coverage)

**NOT TESTED**:
1. ❌ Homepage renders at `/terrapet`
2. ❌ Services page displays all 9 services
3. ❌ About page shows Dr. Gill's information
4. ❌ FAQ page displays 12 questions
5. ❌ Navigation works between pages
6. ❌ Mobile responsive layout

**Impact**: **CRITICAL** - We don't know if users can see anything.

### Category 3: Database Integration (0% coverage)

**NOT TESTED**:
1. ❌ Tenant isolation (TerraPet vs Adris data separation)
2. ❌ RLS policies actually work
3. ❌ Database queries filter by `tenant_id`
4. ❌ User can't access other tenants' data
5. ❌ Tenant record exists and is queryable

**Impact**: **CRITICAL** - Security vulnerability if RLS fails.

### Category 4: User Flows (0% coverage)

**NOT TESTED**:
1. ❌ User can book an appointment
2. ❌ User can book a home visit (with address requirement)
3. ❌ User can view services
4. ❌ User can contact clinic (WhatsApp, email, maps)
5. ❌ User can navigate the site
6. ❌ User can search for pets (if logged in)

**Impact**: **CRITICAL** - Users can't do anything.

### Category 5: Asset Loading (0% coverage)

**NOT TESTED**:
1. ❌ Google Drive images actually load
2. ❌ Images display with correct dimensions
3. ❌ Images don't break layout
4. ❌ Logo displays in header
5. ❌ Loading states work
6. ❌ Error handling for failed images

**Impact**: **HIGH** - Broken images = unprofessional site.

### Category 6: API Endpoints (0% coverage)

**NOT TESTED**:
1. ❌ `/api/clinics/terrapet` returns data
2. ❌ `/api/services` returns TerraPet services
3. ❌ `/api/appointments` creates bookings
4. ❌ Authentication works
5. ❌ Rate limiting works
6. ❌ Error responses are correct

**Impact**: **CRITICAL** - Backend might be completely broken.

### Category 7: Performance (0% coverage)

**NOT TESTED**:
1. ❌ Page load time
2. ❌ Google Drive image load time
3. ❌ Time to Interactive (TTI)
4. ❌ Lighthouse scores
5. ❌ Bundle size
6. ❌ Core Web Vitals

**Impact**: **MEDIUM** - Slow site = poor UX.

### Category 8: SEO & Metadata (0% coverage)

**NOT TESTED**:
1. ❌ Meta tags are correct
2. ❌ Open Graph images work
3. ❌ Title tags are correct
4. ❌ Canonical URLs are correct
5. ❌ Sitemap includes `/terrapet`
6. ❌ Robots.txt allows indexing

**Impact**: **MEDIUM** - Poor SEO = no organic traffic.

### Category 9: Error Handling (0% coverage)

**NOT TESTED**:
1. ❌ 404 page for invalid routes
2. ❌ Error boundaries catch crashes
3. ❌ API errors display user-friendly messages
4. ❌ Fallback UI for missing data
5. ❌ Network error handling
6. ❌ Database connection errors

**Impact**: **HIGH** - Crashes = bad UX.

### Category 10: Browser Compatibility (0% coverage)

**NOT TESTED**:
1. ❌ Chrome (latest)
2. ❌ Firefox (latest)
3. ❌ Safari (latest)
4. ❌ Edge (latest)
5. ❌ Mobile browsers (iOS Safari, Chrome Android)
6. ❌ Older browsers (if supporting IE11, etc.)

**Impact**: **HIGH** - Broken on Safari = lost customers.

---

## 📊 Test Coverage Reality Check

| Category | Current Coverage | Required Coverage | Gap |
|----------|------------------|-------------------|-----|
| **Configuration Validation** | 100% | 100% | ✅ COMPLETE |
| **Integration Tests** | 0% | 80% | ❌ **CRITICAL** |
| **Unit Tests (Components)** | 0% | 70% | ❌ **CRITICAL** |
| **API Tests** | 0% | 90% | ❌ **CRITICAL** |
| **E2E Tests** | 0% | 60% | ❌ **CRITICAL** |
| **Database Tests** | 0% | 80% | ❌ **CRITICAL** |
| **Performance Tests** | 0% | 40% | ❌ **HIGH** |
| **Security Tests** | 0% | 90% | ❌ **CRITICAL** |
| **Accessibility Tests** | 0% | 50% | ❌ **MEDIUM** |

**Overall Test Coverage**: **~5%** (only config files validated)  
**Production-Ready Coverage**: **Minimum 70%**  
**Current Status**: **NOT READY FOR PRODUCTION**

---

## 🎯 Comprehensive Testing Plan

### Phase 1: Integration Tests (CRITICAL - Do First)

**Priority**: 🔴 CRITICAL  
**Estimated Time**: 4-6 hours  
**Files to Create**: `web/tests/integration/terrapet-integration.test.ts`

#### Tests to Implement:

1. **Data Loading Tests** (30 tests)
   ```typescript
   describe('TerraPet Data Loading', () => {
     it('should load clinic configuration for terrapet slug')
     it('should return null for invalid clinic slug')
     it('should load theme colors correctly')
     it('should load all 9 services')
     it('should load service variants correctly')
     it('should load team member data')
     it('should load FAQ data')
     it('should load home page content')
     // ... 22 more tests
   })
   ```

2. **Multi-Tenant Isolation Tests** (20 tests)
   ```typescript
   describe('Multi-Tenant Data Isolation', () => {
     it('should return different data for terrapet vs adris')
     it('should not leak terrapet data to adris')
     it('should not leak adris data to terrapet')
     it('should filter database queries by tenant_id')
     it('should enforce RLS policies')
     // ... 15 more tests
   })
   ```

3. **Theme Injection Tests** (15 tests)
   ```typescript
   describe('Theme CSS Variable Injection', () => {
     it('should inject --primary color variable')
     it('should inject --secondary color variable')
     it('should inject --accent color variable')
     it('should inject font family variables')
     it('should inject spacing variables')
     // ... 10 more tests
   })
   ```

### Phase 2: Component Rendering Tests (CRITICAL - Do Second)

**Priority**: 🔴 CRITICAL  
**Estimated Time**: 6-8 hours  
**Files to Create**: `web/tests/components/terrapet-*.test.tsx`

#### Tests to Implement:

1. **Homepage Component Tests** (25 tests)
   ```typescript
   describe('TerraPet Homepage', () => {
     it('should render hero section with correct headline')
     it('should display logo from Google Drive')
     it('should render 3 feature highlights')
     it('should apply primary color to CTA buttons')
     it('should render in Spanish')
     it('should display contact links (WhatsApp, email, maps)')
     // ... 19 more tests
   })
   ```

2. **Services Page Tests** (40 tests)
   ```typescript
   describe('TerraPet Services Page', () => {
     it('should render all 9 services')
     it('should display service titles correctly')
     it('should render service descriptions')
     it('should display service variants')
     it('should show "Consulta a Domicilio" variant')
     it('should show online booking badge for 8 services')
     it('should hide booking for euthanasia service')
     // ... 33 more tests
   })
   ```

3. **About Page Tests** (20 tests)
   ```typescript
   describe('TerraPet About Page', () => {
     it('should render Dr. Gill name')
     it('should display vet photo from Google Drive')
     it('should show veterinarian title')
     it('should display specialization')
     it('should render mission statement')
     // ... 15 more tests
   })
   ```

4. **FAQ Page Tests** (15 tests)
   ```typescript
   describe('TerraPet FAQ Page', () => {
     it('should render 12 FAQ items')
     it('should display questions in Spanish')
     it('should be expandable/collapsible')
     it('should highlight dog-only specialization')
     it('should mention home visits')
     // ... 10 more tests
   })
   ```

### Phase 3: API Route Tests (CRITICAL - Do Third)

**Priority**: 🔴 CRITICAL  
**Estimated Time**: 4-6 hours  
**Files to Create**: `web/tests/api/terrapet-api.test.ts`

#### Tests to Implement:

1. **Clinic API Tests** (15 tests)
   ```typescript
   describe('GET /api/clinics/terrapet', () => {
     it('should return 200 with clinic data')
     it('should return correct tenant_id')
     it('should include contact information')
     it('should include operating hours')
     it('should return 404 for invalid clinic')
     // ... 10 more tests
   })
   ```

2. **Services API Tests** (20 tests)
   ```typescript
   describe('GET /api/terrapet/services', () => {
     it('should return 200 with 9 services')
     it('should filter by tenant_id=terrapet')
     it('should not return adris services')
     it('should include service variants')
     it('should mark online booking availability')
     // ... 15 more tests
   })
   ```

3. **Appointments API Tests** (30 tests)
   ```typescript
   describe('POST /api/terrapet/appointments', () => {
     it('should create appointment for authenticated user')
     it('should require authentication')
     it('should validate service_id')
     it('should validate date/time')
     it('should require address for home visits')
     it('should enforce tenant isolation')
     // ... 24 more tests
   })
   ```

### Phase 4: Database Integration Tests (CRITICAL - Do Fourth)

**Priority**: 🔴 CRITICAL  
**Estimated Time**: 3-4 hours  
**Files to Create**: `web/tests/database/terrapet-rls.test.ts`

#### Tests to Implement:

1. **RLS Policy Tests** (25 tests)
   ```typescript
   describe('TerraPet RLS Policies', () => {
     it('should prevent cross-tenant data access')
     it('should allow terrapet users to see terrapet data')
     it('should block terrapet users from adris data')
     it('should enforce tenant_id filter on pets table')
     it('should enforce tenant_id filter on appointments table')
     // ... 20 more tests
   })
   ```

2. **Tenant Isolation Tests** (20 tests)
   ```typescript
   describe('Database Tenant Isolation', () => {
     it('should query only terrapet records')
     it('should not leak data between tenants')
     it('should join tables correctly with tenant_id')
     it('should enforce isolation on all tables')
     // ... 16 more tests
   })
   ```

### Phase 5: E2E User Flow Tests (HIGH - Do Fifth)

**Priority**: 🟡 HIGH  
**Estimated Time**: 6-10 hours  
**Files to Create**: `web/e2e/terrapet-flows.spec.ts`

#### Tests to Implement:

1. **Visitor Flow** (30 tests)
   ```typescript
   test('visitor can browse TerraPet homepage', async ({ page }) => {
     // Navigate to /terrapet
     // Verify logo displays
     // Verify hero section renders
     // Verify features display
     // Verify contact links work
   })
   
   test('visitor can view all services', async ({ page }) => {
     // Navigate to /terrapet/services
     // Verify 9 services display
     // Verify service details expandable
     // Verify home visit option shows
   })
   ```

2. **Booking Flow** (40 tests)
   ```typescript
   test('user can book general consultation', async ({ page }) => {
     // Login as owner
     // Navigate to booking
     // Select consultation service
     // Choose date/time
     // Submit booking
     // Verify confirmation
   })
   
   test('user can book home visit (requires address)', async ({ page }) => {
     // Login as owner
     // Navigate to booking
     // Select home visit variant
     // Should require address field
     // Enter address
     // Submit booking
     // Verify confirmation
   })
   ```

3. **Multi-Tenant Isolation Flow** (15 tests)
   ```typescript
   test('terrapet user cannot access adris portal', async ({ page }) => {
     // Login as terrapet owner
     // Attempt to navigate to /adris/portal
     // Should redirect or show 403
   })
   ```

### Phase 6: Performance Tests (MEDIUM - Do Sixth)

**Priority**: 🟢 MEDIUM  
**Estimated Time**: 2-3 hours  
**Files to Create**: `web/tests/performance/terrapet-perf.test.ts`

#### Tests to Implement:

1. **Page Load Performance** (10 tests)
   ```typescript
   test('homepage loads in < 3 seconds', async ({ page }) => {
     const start = Date.now()
     await page.goto('/terrapet')
     const end = Date.now()
     expect(end - start).toBeLessThan(3000)
   })
   ```

2. **Lighthouse Audits** (5 tests)
   ```typescript
   test('homepage Lighthouse score > 90', async () => {
     // Run Lighthouse
     // Check performance score
     // Check accessibility score
     // Check SEO score
   })
   ```

### Phase 7: Accessibility Tests (MEDIUM - Do Seventh)

**Priority**: 🟢 MEDIUM  
**Estimated Time**: 2-3 hours  
**Files to Create**: `web/tests/accessibility/terrapet-a11y.test.ts`

#### Tests to Implement:

1. **WCAG Compliance** (20 tests)
   ```typescript
   test('homepage has no accessibility violations', async ({ page }) => {
     // Run axe-core
     // Check for WCAG AA violations
     // Verify color contrast
     // Verify alt text on images
   })
   ```

2. **Keyboard Navigation** (15 tests)
   ```typescript
   test('can navigate services with keyboard only', async ({ page }) => {
     // Tab through navigation
     // Verify focus states
     // Test Enter to activate
     // Test Esc to close modals
   })
   ```

### Phase 8: Security Tests (CRITICAL - Do Eighth)

**Priority**: 🔴 CRITICAL  
**Estimated Time**: 3-4 hours  
**Files to Create**: `web/tests/security/terrapet-security.test.ts`

#### Tests to Implement:

1. **Authentication Tests** (20 tests)
   ```typescript
   test('unauthenticated user cannot book appointment', async ({ page }) => {
     // Attempt booking without login
     // Should redirect to login
   })
   
   test('user cannot access other tenant data', async ({ page }) => {
     // Login as terrapet user
     // Attempt to query adris data
     // Should return 403 or empty
   })
   ```

2. **XSS Prevention Tests** (15 tests)
   ```typescript
   test('form inputs are sanitized', async ({ page }) => {
     // Submit form with <script> tag
     // Verify script is escaped
     // Check output is safe
   })
   ```

---

## 📋 Test Execution Plan

### Week 1: Critical Tests

**Monday-Tuesday**: Integration Tests (Phase 1)
- Data loading
- Multi-tenant isolation
- Theme injection

**Wednesday-Thursday**: Component Rendering Tests (Phase 2)
- Homepage, Services, About, FAQ

**Friday**: API Route Tests (Phase 3)
- Clinic, Services, Appointments APIs

### Week 2: Comprehensive Coverage

**Monday**: Database Integration Tests (Phase 4)
- RLS policies
- Tenant isolation

**Tuesday-Thursday**: E2E User Flow Tests (Phase 5)
- Visitor flows
- Booking flows
- Multi-tenant isolation flows

**Friday**: Performance, Accessibility, Security (Phases 6-8)

---

## 🎯 Success Criteria

### Minimum Acceptable Coverage (Production Ready)

| Test Type | Target Coverage | Current | Status |
|-----------|----------------|---------|--------|
| **Integration** | 80% | 0% | ❌ |
| **Component** | 70% | 0% | ❌ |
| **API** | 90% | 0% | ❌ |
| **E2E** | 60% | 0% | ❌ |
| **Database** | 80% | 0% | ❌ |
| **Performance** | 40% | 0% | ❌ |
| **Security** | 90% | 0% | ❌ |
| **Accessibility** | 50% | 0% | ❌ |

**Overall Target**: 70% minimum  
**Current**: ~5%  
**Gap**: **65 percentage points**

### Definition of "Production Ready"

TerraPet is production-ready when:

1. ✅ All integration tests pass (data loading works)
2. ✅ All component tests pass (pages render correctly)
3. ✅ All API tests pass (endpoints work)
4. ✅ All RLS tests pass (security enforced)
5. ✅ Critical E2E flows pass (users can book appointments)
6. ✅ Performance tests pass (page loads < 3s)
7. ✅ No WCAG AA accessibility violations
8. ✅ Security tests pass (no XSS, auth works)

**Current Status**: **0/8 criteria met**

---

## 🚨 Immediate Action Items

### This Week (HIGH PRIORITY)

1. **Create Integration Test Suite** (4-6 hours)
   - File: `web/tests/integration/terrapet-integration.test.ts`
   - Test data loading, multi-tenant isolation, theme injection
   - **Goal**: Verify app can actually load TerraPet data

2. **Create Component Rendering Tests** (6-8 hours)
   - Files: `web/tests/components/terrapet-*.test.tsx`
   - Test homepage, services, about, FAQ pages
   - **Goal**: Verify pages actually render

3. **Create API Tests** (4-6 hours)
   - File: `web/tests/api/terrapet-api.test.ts`
   - Test clinic, services, appointments APIs
   - **Goal**: Verify backend actually works

4. **Create RLS Tests** (3-4 hours)
   - File: `web/tests/database/terrapet-rls.test.ts`
   - Test tenant isolation, RLS policies
   - **Goal**: Verify security actually works

### Next Week (MEDIUM PRIORITY)

5. **Create E2E Tests** (6-10 hours)
   - File: `web/e2e/terrapet-flows.spec.ts`
   - Test booking flow, visitor flow, multi-tenant isolation
   - **Goal**: Verify users can actually use the app

6. **Create Performance Tests** (2-3 hours)
   - File: `web/tests/performance/terrapet-perf.test.ts`
   - Test page load times, Lighthouse scores
   - **Goal**: Verify app is fast enough

7. **Create Accessibility Tests** (2-3 hours)
   - File: `web/tests/accessibility/terrapet-a11y.test.ts`
   - Test WCAG compliance, keyboard navigation
   - **Goal**: Verify app is accessible

8. **Create Security Tests** (3-4 hours)
   - File: `web/tests/security/terrapet-security.test.ts`
   - Test authentication, XSS prevention, tenant isolation
   - **Goal**: Verify app is secure

---

## 💰 Estimated Effort

| Phase | Est. Hours | Priority | When |
|-------|------------|----------|------|
| Phase 1: Integration | 4-6h | 🔴 CRITICAL | This week |
| Phase 2: Components | 6-8h | 🔴 CRITICAL | This week |
| Phase 3: API | 4-6h | 🔴 CRITICAL | This week |
| Phase 4: Database | 3-4h | 🔴 CRITICAL | This week |
| Phase 5: E2E | 6-10h | 🟡 HIGH | Next week |
| Phase 6: Performance | 2-3h | 🟢 MEDIUM | Next week |
| Phase 7: Accessibility | 2-3h | 🟢 MEDIUM | Next week |
| Phase 8: Security | 3-4h | 🔴 CRITICAL | Next week |
| **TOTAL** | **30-44 hours** | | 2 weeks |

**With current tests**: 5% coverage  
**After all phases**: 70%+ coverage  
**Recommendation**: **DO NOT DEPLOY TO PRODUCTION WITHOUT AT LEAST PHASES 1-4 COMPLETE**

---

## 🎬 Next Steps

### Immediate (Today)

1. **Run existing tests to confirm baseline**
   ```bash
   cd web
   npm test -- tests/terrapet/config-validation.test.ts
   ```

2. **Start with Integration Tests (Phase 1)**
   - Create `web/tests/integration/terrapet-integration.test.ts`
   - Implement data loading tests first
   - Goal: 30 tests in 4-6 hours

3. **Document test failures**
   - Create `TERRAPET_TEST_FAILURES.md` with issues found
   - Track what's broken vs. what works

### Short-Term (This Week)

4. **Complete Phases 1-4** (CRITICAL tests)
   - Integration, Components, API, Database
   - Minimum 150 tests implemented
   - Target: 50% coverage

5. **Fix all critical failures**
   - Before moving to Phase 5 (E2E)
   - No point testing flows if basics don't work

### Long-Term (Next Week)

6. **Complete Phases 5-8** (remaining tests)
   - E2E, Performance, Accessibility, Security
   - Target: 70% overall coverage

7. **Deploy to staging**
   - Only after Phases 1-4 pass
   - Run full test suite against staging

8. **Production deployment**
   - Only after ALL phases pass
   - Continuous monitoring for 48 hours

---

## 🔍 Conclusion

### The Harsh Reality

**Current State**: We have **JSON file validators pretending to be tests**.  
**What We Need**: **Actual functional, integration, and E2E tests**.  
**Gap**: **~65 percentage points of test coverage missing**.

### Can We Deploy to Production?

**Short Answer**: **NO**

**Long Answer**: We can deploy to staging to do manual testing, but production deployment without Phases 1-4 complete is **reckless and irresponsible**. We have ZERO confidence that:
- The app actually loads TerraPet data
- Pages actually render
- APIs actually work
- Security actually works

### Recommendation

**DO NOT DEPLOY TO PRODUCTION** until:
1. ✅ Integration tests pass (Phase 1)
2. ✅ Component tests pass (Phase 2)
3. ✅ API tests pass (Phase 3)
4. ✅ Database/RLS tests pass (Phase 4)

**Minimum**: Complete Phases 1-4 (15-20 hours)  
**Recommended**: Complete ALL phases (30-44 hours)

### Final Verdict

Current tests score: **2/10** (JSON files exist, congratulations)  
Production readiness: **NOT READY**  
Deployment recommendation: **STAGING ONLY** until real tests pass

---

**End of Critique** - Let's build REAL tests that actually validate the application works.
