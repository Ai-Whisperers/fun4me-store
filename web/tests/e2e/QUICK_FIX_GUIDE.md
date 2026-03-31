# Quick Fix Guide - E2E Tests

This guide helps you get the E2E tests running quickly by fixing critical blockers.

## Issue #1: Dev Server Not Running ⚠️ CRITICAL

**Problem**: Tests can't connect to `http://localhost:3000`

**Fix**:

```bash
# Open a terminal and keep it running
cd web
npm run dev

# Wait for: "✓ Ready in Xms"
# Then run tests in another terminal
```

**Verify**:

```bash
curl http://localhost:3000/terrapet
# Should return HTML (not "Connection refused")
```

---

## Issue #2: Global Setup Login Route Wrong ⚠️ CRITICAL

**Problem**: Global setup tries `/terrapet/portal/login` but should be `/terrapet/login`

**Fix**:

### Option A: Edit `e2e/global-setup.ts`

```typescript
// Line 716 - Change this:
await page.goto(`${baseURL}/${E2E_TEST_TENANT}/portal/login`)

// To this:
await page.goto(`${baseURL}/${E2E_TEST_TENANT}/login`)
```

### Option B: Skip global setup temporarily

```bash
# Run tests without setup (may fail, but at least they run)
npx playwright test --grep-invert "setup" tests/e2e/auth/login.spec.ts
```

---

## Issue #3: Database Schema Mismatches ⚠️ HIGH

**Problem**: Test setup tries to create data with non-existent columns

**Fix**: Comment out failing sections in `e2e/global-setup.ts`

```typescript
// Around line 650-700, comment out these sections:

// COMMENT OUT: Loyalty points setup
/*
try {
  const { error: loyaltyError } = await supabase
    .from('loyalty_points')
    // ... rest of loyalty setup
} catch (error) {
  console.log('[E2E Setup] Failed to create loyalty points:', error)
}
*/

// COMMENT OUT: Coupon creation
/*
try {
  const { data: coupon, error: couponError } = await supabase
    .from('store_coupons')
    // ... rest of coupon setup
} catch (error) {
  console.log('[E2E Setup] Failed to create test coupon:', error)
}
*/

// COMMENT OUT: Booking request
/*
try {
  const { error: bookingError } = await supabase
    .from('appointments')
    // ... rest of booking setup
} catch (error) {
  console.log('[E2E Setup] Failed to create pending booking request:', error)
}
*/
```

**Faster Fix**: Set environment variable to skip setup

```bash
# Skip data creation, just login
E2E_SKIP_DATA_SETUP=true npx playwright test
```

---

## Issue #4: Missing Seed Data ⚠️ HIGH

**Problem**: Tests expect demo accounts and pets to exist

**Fix**:

```bash
# Run seed script
cd web
npm run seed:demo

# Verify accounts exist
# Should see: "Created 6 demo accounts" or similar
```

**Verify**:

```bash
# Check in Supabase dashboard or via psql
# Should have users:
# - owner@terrapet.demo
# - vet@terrapet.demo
# - admin@terrapet.demo
# (and same for petlife)
```

---

## Issue #5: Missing data-testid Attributes 🔧 MEDIUM

**Problem**: Tests look for `[data-testid="pet-card"]` but components don't have it

**Quick Fix**: Update tests to use flexible selectors

**Better Fix**: Add attributes to components

### Components to Update

#### 1. Pet Card Component

```typescript
// Find: components/**/*pet*card*.tsx
// Add:
<div data-testid="pet-card" className="...">
  <h3 data-testid="pet-name">{pet.name}</h3>
  <span data-testid="pet-species">{pet.species}</span>
</div>
```

#### 2. User Menu

```typescript
// Find: components/**/user-menu*.tsx or layout
// Add:
<div data-testid="user-menu">
  {/* menu content */}
</div>
```

#### 3. Navigation

```typescript
// Find: components/**/nav*.tsx
// Add data-testid to nav elements
```

**Temporary Workaround**: Tests already have fallback selectors, but they're less reliable.

---

## Quick Start Checklist

Before running tests, ensure:

- [ ] Dev server is running (`npm run dev`)
- [ ] Server responds at http://localhost:3000
- [ ] Seed data is loaded (`npm run seed:demo`)
- [ ] Global setup login route is fixed OR skipped
- [ ] Database schema errors are commented out OR ignored

---

## Run Your First Test

### 1. Run Single Test (Headed Mode)

```bash
cd web

# See what happens in browser
npx playwright test tests/e2e/auth/login.spec.ts --headed --grep "should login as owner" --max-failures=1
```

**Watch for**:

- Does login page load?
- Are form fields visible?
- What happens when you try to login?
- Where does it redirect?
- What error messages appear?

### 2. Run With Debug Mode

```bash
# Step through line by line
npx playwright test tests/e2e/auth/login.spec.ts --debug --grep "should login as owner"
```

### 3. Run All Auth Tests

```bash
# After fixing issues from test #1
npx playwright test tests/e2e/auth/ --reporter=list
```

---

## Common First-Run Failures

### Failure: "Timeout waiting for selector"

**Cause**: Element doesn't exist or has different selector  
**Fix**:

1. Run with `--headed` to see actual page
2. Inspect element in browser
3. Update selector in test

### Failure: "Expected URL to match /portal/ but got /login"

**Cause**: Login failed or redirected differently  
**Fix**:

1. Check credentials are correct
2. Verify seed data loaded
3. Check if login form structure matches

### Failure: "Element is not visible"

**Cause**: Element exists but hidden or loading  
**Fix**:

1. Add explicit wait: `await page.waitForSelector('...')`
2. Increase timeout
3. Wait for load state: `await page.waitForLoadState('networkidle')`

---

## Debugging Tips

### See What's Happening

```bash
# Run with browser visible
npx playwright test --headed

# Run with slow motion
npx playwright test --headed --slow-mo=1000

# Run in debug mode
npx playwright test --debug
```

### Capture Evidence

```bash
# Always take screenshots on failure (already configured)
npx playwright test

# Find screenshots in:
# test-results/*/screenshot.png
```

### View Test Trace

```bash
# After test failure
npx playwright show-trace test-results/*/trace.zip
```

---

## Expected First Run Results

### Realistic Expectations

- **Some tests pass**: 20-30%
- **Most tests fail**: 70-80%
- **This is NORMAL**: Tests were written without seeing actual UI

### What Should Pass

- ✅ Navigation to public pages
- ✅ Basic URL checks
- ✅ Some redirect logic

### What Will Likely Fail

- ❌ Login flows (form structure may differ)
- ❌ Element selection (missing data-testid)
- ❌ Specific text checks (labels may differ)
- ❌ Data-dependent tests (seed data issues)

---

## Iterative Improvement Process

### Round 1: Run & Observe

1. Run tests with `--headed`
2. Watch what happens
3. Note what fails and why
4. Take screenshots

### Round 2: Fix Obvious Issues

1. Update selectors that were clearly wrong
2. Add missing data-testid attributes
3. Fix credential issues
4. Adjust timeouts

### Round 3: Refine

1. Update expected texts
2. Adjust redirect expectations
3. Handle loading states better
4. Add retries where needed

### Round 4: Stabilize

1. Fix flaky tests
2. Add better wait strategies
3. Improve error messages
4. Document known issues

---

## Quick Wins (Easy Fixes)

### 1. Fix Login Route (2 minutes)

```typescript
// e2e/global-setup.ts:716
;-(await page.goto(`${baseURL}/${E2E_TEST_TENANT}/portal/login`)) +
  (await page.goto(`${baseURL}/${E2E_TEST_TENANT}/login`))
```

### 2. Add One data-testid (5 minutes)

```typescript
// Find pet card component
// Add one line:
<div data-testid="pet-card">
```

### 3. Verify Seed Data (2 minutes)

```bash
npm run seed:demo
# Check output for "Created 6 demo accounts"
```

### 4. Run One Test (1 minute)

```bash
npx playwright test --headed --grep "should login as owner" --max-failures=1
```

**Total Time**: 10 minutes to first test run!

---

## When Tests Are Fixed

### You'll Know Tests Are Working When:

- ✅ Login tests pass (can login as owner/vet/admin)
- ✅ Pet list tests pass (can see pets)
- ✅ Navigation tests pass (can click around)
- ✅ Logout tests pass (can logout)

### Target Pass Rate: 80%+

- Some tests will always be flaky (timing, network)
- Aim for 80-90% pass rate
- Document known failures
- Fix or skip truly flaky tests

---

## Success Metrics

### Phase 1: Basic Functionality (Target: This Week)

- [ ] Can run tests without crashes
- [ ] At least 1 test passes
- [ ] Can see browser interactions
- [ ] Login flow works

### Phase 2: Core Tests Pass (Target: Next Week)

- [ ] Auth tests: 70%+ pass rate
- [ ] Portal tests: 50%+ pass rate
- [ ] Can run full suite without manual intervention

### Phase 3: Stable Suite (Target: 2 Weeks)

- [ ] Overall: 80%+ pass rate
- [ ] Runs in CI/CD
- [ ] No manual setup required
- [ ] Tests catch real bugs

---

## Need Help?

### Check These First:

1. Is dev server running? (`npm run dev`)
2. Is seed data loaded? (`npm run seed:demo`)
3. Did you fix the login route? (Issue #2)
4. Are you running from `web/` directory?

### Common Commands:

```bash
# See all available tests
npx playwright test --list

# Run specific test
npx playwright test path/to/test.spec.ts

# Generate HTML report
npx playwright show-report

# Clear test results
rm -rf test-results/
```

### Documentation:

- Full test plan: `tests/e2e/E2E_TEST_PLAN.md`
- Implementation details: `tests/e2e/E2E_IMPLEMENTATION_SUMMARY.md`
- Execution report: `tests/e2e/TEST_EXECUTION_REPORT.md`

---

**Last Updated**: January 21, 2026  
**Status**: Ready for first test run  
**Estimated Time to First Passing Test**: 10-15 minutes
