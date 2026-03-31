# P0-001: Enable Build Quality Gates (BLOCKING)

**Priority**: P0 (CRITICAL - BLOCKING ALL ELSE)  
**Category**: Build Infrastructure  
**Effort**: 4-5 days  
**Epic**: Quality Gates & Type Safety  
**Created**: 2026-01-19

---

## Problem

Build quality gates are **DISABLED** in production configuration, allowing type errors and lint failures to reach production deployments.

### Current Behavior

```javascript
// web/next.config.js
module.exports = {
  typescript: {
    ignoreBuildErrors: true  // ❌ Type errors deploy to production!
  },
  eslint: {
    ignoreDuringBuilds: true  // ❌ Lint failures ignored!
  }
}
```

**Impact**: 
- TypeScript errors silently deploy to production
- ESLint violations go undetected until runtime
- "Strict mode" is security theater - provides zero guarantee
- Accumulation of type debt without visibility

---

## Root Cause Analysis

From `critique/17-remaining-deep-dives.md` (Type Safety section):

**Why it was disabled:**
1. Initial rapid development prioritized shipping features
2. Accumulated type errors made re-enabling painful
3. Team feared build breakage during critical periods
4. No systematic plan to fix underlying issues

**Cost of disabling:**
- ~20 `any` types scattered across codebase
- 1,984 type assertions (`as`) masking real issues
- Unknown number of build-breaking errors hidden
- Zero confidence in type safety

---

## Proposed Solution

### Phase 1: Discovery (1 day)
1. **Enable checks locally** in a test branch
2. **Catalog all failures** (TypeScript + ESLint)
3. **Categorize by severity**:
   - Blocking errors (syntax, missing types)
   - Type assertions that could fail
   - Lint style violations
4. **Estimate fix effort** per category

### Phase 2: Fix Critical Issues (3 days)
1. **TypeScript errors** (priority order):
   - Missing type definitions
   - Incorrect return types
   - Type mismatches in API calls
   - Unsafe `any` usage
2. **ESLint errors**:
   - Unused variables
   - Missing dependencies in hooks
   - Console statements (replace with logger)

### Phase 3: Enable Checks (0.5 days)
1. **Update `next.config.js`**:
   ```javascript
   module.exports = {
     typescript: {
       ignoreBuildErrors: false  // ✅ Block builds on type errors
     },
     eslint: {
       ignoreDuringBuilds: false  // ✅ Block builds on lint errors
     }
   }
   ```
2. **Verify builds pass**
3. **Update CI/CD** to enforce checks
4. **Document process** for future contributors

### Phase 4: Prevent Regression (0.5 days)
1. **Pre-commit hooks** (husky + lint-staged):
   ```json
   {
     "*.{ts,tsx}": ["eslint --fix", "tsc --noEmit"]
   }
   ```
2. **CI pipeline** checks on PR
3. **Documentation** in `CLAUDE.md` and `CONTRIBUTING.md`

---

## Implementation Steps

### Step 1: Enable Checks in Test Branch
```bash
cd web

# Create test branch
git checkout -b test/enable-quality-gates

# Enable checks
# Edit web/next.config.js:
#   typescript: { ignoreBuildErrors: false }
#   eslint: { ignoreDuringBuilds: false }

# Attempt build
npm run build > build-errors.log 2>&1
```

### Step 2: Catalog Failures
```bash
# TypeScript errors
npm run type-check 2>&1 | tee typescript-errors.txt

# ESLint errors
npm run lint 2>&1 | tee eslint-errors.txt

# Count errors
echo "TypeScript errors: $(grep 'error TS' typescript-errors.txt | wc -l)"
echo "ESLint errors: $(grep 'error' eslint-errors.txt | wc -l)"
```

### Step 3: Categorize and Prioritize
Create `critique/quality-gates-issues.md`:
```markdown
## TypeScript Errors (Est. count: 50-100)

### Category A: Missing Types (Est. 20-30, 1 day)
- file.ts:45 - Parameter 'x' implicitly has 'any' type
- ...

### Category B: Type Assertions (Est. 30-40, 1.5 days)
- file.ts:89 - Type 'X' is not assignable to type 'Y'
- ...

### Category C: Return Types (Est. 10-15, 0.5 days)
- file.ts:123 - Function lacks return type annotation
- ...

## ESLint Errors (Est. count: 20-30)

### Category A: Unused Variables (Est. 10-15, 0.5 days)
### Category B: Hook Dependencies (Est. 5-8, 0.5 days)
### Category C: Console Statements (Est. 5-7, 0.5 days)
```

### Step 4: Systematic Fixes
Fix one category at a time, verify after each:

```bash
# Fix Category A
# ... apply fixes ...
npm run type-check

# Fix Category B
# ... apply fixes ...
npm run type-check

# Continue until clean
npm run build  # Must succeed
```

### Step 5: Enable in Production Config
```javascript
// web/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // ✅ ENABLED: Block builds on type errors
    ignoreBuildErrors: false
  },
  eslint: {
    // ✅ ENABLED: Block builds on lint errors  
    ignoreDuringBuilds: false
  },
  // ... rest of config
}

module.exports = nextConfig
```

### Step 6: Add Pre-commit Hooks
```bash
# Install husky
npm install --save-dev husky lint-staged

# Configure
npx husky-init
```

```json
// web/package.json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "tsc-files --noEmit"
    ]
  }
}
```

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

cd web
npx lint-staged
```

---

## Acceptance Criteria

- [ ] TypeScript errors block builds (`ignoreBuildErrors: false`)
- [ ] ESLint errors block builds (`ignoreDuringBuilds: false`)
- [ ] All exposed TypeScript errors fixed (0 errors in `npm run type-check`)
- [ ] All exposed ESLint errors fixed (0 errors in `npm run lint`)
- [ ] Production build succeeds: `npm run build` exits 0
- [ ] Pre-commit hooks configured and tested
- [ ] CI pipeline validates build + lint + type-check
- [ ] Documentation updated in `CLAUDE.md` and `CONTRIBUTING.md`
- [ ] No `@ts-ignore` added to "fix" errors (proper fixes only)

---

## Expected Issues (Based on Analysis)

### TypeScript Errors (Est. 50-100 total)

**Category 1: Implicit `any` types** (~20-30 errors)
```typescript
// ❌ Before
function processData(data) {
  return data.map(x => x.value)
}

// ✅ After
function processData(data: Array<{value: number}>): number[] {
  return data.map(x => x.value)
}
```

**Category 2: Type assertions** (~30-40 errors)
```typescript
// ❌ Before
const user = data as User  // Type mismatch hidden!

// ✅ After
const user = UserSchema.parse(data)  // Validated at runtime
```

**Category 3: Missing return types** (~10-15 errors)
```typescript
// ❌ Before
async function fetchData() {
  const res = await fetch('/api/data')
  return res.json()
}

// ✅ After
async function fetchData(): Promise<ApiResponse> {
  const res = await fetch('/api/data')
  return res.json() as ApiResponse
}
```

### ESLint Errors (Est. 20-30 total)

**Category 1: Unused variables** (~10-15 errors)
```typescript
// ❌ Before
const tempResult = calculateTotal()  // Never used
const finalResult = calculateTotalAgain()

// ✅ After (remove if truly unused)
const finalResult = calculateTotal()
```

**Category 2: Missing hook dependencies** (~5-8 errors)
```typescript
// ❌ Before
useEffect(() => {
  fetchData(userId)
}, [])  // Missing 'userId' dependency

// ✅ After
useEffect(() => {
  fetchData(userId)
}, [userId, fetchData])
```

**Category 3: Console statements** (~5-7 errors)
```typescript
// ❌ Before
console.log('User logged in:', user)

// ✅ After
logger.info('User logged in', { userId: user.id })
```

---

## Files to Modify

### Configuration Files
- `web/next.config.js` - Enable quality gates
- `web/package.json` - Add lint-staged config
- `web/.husky/pre-commit` - Add pre-commit hook

### Documentation
- `CLAUDE.md` - Update "Build Quality" section
- `documentation/development/CONTRIBUTING.md` - Add quality standards

### Likely Code Changes (TBD after discovery)
- `web/lib/**/*.ts` - Type definitions
- `web/app/api/**/*.ts` - API route types
- `web/components/**/*.tsx` - Component prop types
- `web/lib/services/**/*.ts` - Service method types

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Build breaks in production** | Low | CRITICAL | Test thoroughly in staging, deploy during low-traffic window |
| **More errors than estimated** | High | Medium | Budget 2 extra days, prioritize by severity |
| **Breaking changes required** | Medium | High | Document all breaking changes, coordinate with team |
| **CI/CD pipeline failures** | Medium | Medium | Update CI config before enabling, test on feature branch |

---

## Success Metrics

**Immediate (Post-Implementation):**
- ✅ Build passes with checks enabled
- ✅ 0 TypeScript errors
- ✅ 0 ESLint errors
- ✅ Pre-commit hooks prevent bad commits

**Long-term (1 month):**
- ✅ Zero type-related bugs in production
- ✅ No commits bypass quality gates
- ✅ Faster code reviews (types are guaranteed)
- ✅ New contributors follow standards

---

## Dependencies

**Blocks:**
- All other P0 tickets (this is the foundation)
- Refactoring work (can't safely refactor with broken types)
- New feature development (must follow type standards)

**Depends On:**
- None (this is the first step)

---

## Related Issues

- **P0-002**: SEC-025 Credentials Leak (separate security issue)
- **Critique**: `critique/17-remaining-deep-dives.md` (Type Safety section)
- **Master Report**: `critique/00-MASTER-DEEP-DIVE-REPORT.md` (lines 49-58, 375-400)

---

## Communication Plan

### Before Starting
- [ ] Notify team: "Enabling build quality gates over next 4 days"
- [ ] Request: "Hold non-critical PRs until checks are enabled"
- [ ] Share: Discovery findings after Phase 1

### During Implementation
- [ ] Daily updates on progress (errors fixed vs remaining)
- [ ] Flag any breaking changes immediately
- [ ] Request reviews for non-obvious fixes

### After Completion
- [ ] Announce: "Quality gates now enabled - all future code must pass checks"
- [ ] Document: Common issues and how to fix them
- [ ] Training: Short session on new pre-commit workflow

---

## Rollback Plan

If enabling breaks critical functionality:

1. **Immediate**: Revert `next.config.js` changes
2. **Deploy**: Emergency deploy with checks disabled
3. **Post-mortem**: Document what broke and why
4. **Re-plan**: Create new ticket with adjusted approach

---

## Notes

- This ticket is **BLOCKING** all other work
- Estimate assumes ~75 total errors (mid-range)
- If errors >150, escalate and re-plan
- Do NOT use `@ts-ignore` or `// eslint-disable` to "fix" - these defeat the purpose
- Celebrate when done! This is a major quality milestone.

---

**Status**: Ready for implementation  
**Owner**: TBD  
**Sprint**: IMMEDIATE (P0 blocker)  
**Last Updated**: 2026-01-19
