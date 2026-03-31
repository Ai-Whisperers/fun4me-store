# TST-020: Add Pre-Commit Hooks for Quality Gates

## Summary

**Priority**: P1 - High  
**Effort**: 2-3 hours  
**Epic**: [EPIC-17: Comprehensive Test Coverage](../epics/EPIC-17-comprehensive-test-coverage.md)  
**Type**: Testing Infrastructure  
**Dependencies**: None  
**Source**: critique/05-testing-roast.md (TEST-004)

## Problem Statement

Developers can currently commit and push broken code without any automated checks. There are no quality gates preventing:
- Broken tests from entering the repository
- Linting errors from being committed
- Formatting inconsistencies
- Type errors in TypeScript files

### Current State

```json
// package.json - NO pre-commit configuration
{
  "scripts": {
    "test": "vitest run",
    "lint": "eslint .",
    "format": "prettier --write ."
    // No pre-commit, no pre-push hooks
  }
}
```

**Result**: Bad code ships freely, breaking builds for other developers.

## Proposed Solution

Implement automated pre-commit hooks using **Husky** and **lint-staged** to:
1. Run linters on staged files only (fast)
2. Run tests related to changed files (fast)
3. Format code automatically (fast)
4. Block commits if checks fail

### Benefits

| Without Hooks | With Hooks |
|---------------|------------|
| Broken tests reach main | Tests must pass to commit |
| Linting errors accumulate | Auto-fixed or blocked |
| Inconsistent formatting | Auto-formatted on commit |
| Type errors ship | TypeScript errors blocked |
| Manual discipline required | Automated enforcement |

## Implementation Steps

### 1. Install Dependencies

```bash
cd web
npm install --save-dev husky lint-staged
```

### 2. Initialize Husky

```bash
npx husky install
npm pkg set scripts.prepare="husky install"
```

This creates `.husky/` directory and adds `prepare` script to package.json.

### 3. Create Pre-Commit Hook

```bash
npx husky add .husky/pre-commit "npx lint-staged"
chmod +x .husky/pre-commit
```

**File created**: `web/.husky/pre-commit`

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

### 4. Configure lint-staged

Add to `package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write",
      "vitest related --run"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

**What this does**:
- TypeScript files: lint → format → run related tests
- JSON/Markdown: format only
- Only processes **staged files** (fast!)

### 5. Create Pre-Push Hook (Optional but Recommended)

```bash
npx husky add .husky/pre-push "npm run test:critical"
chmod +x .husky/pre-push
```

Add script to `package.json`:

```json
{
  "scripts": {
    "test:critical": "vitest run tests/integration tests/functionality --reporter=verbose"
  }
}
```

This runs critical tests before pushing (catches issues before CI).

### 6. Add .gitignore Entry

Ensure `.husky/_` is ignored (auto-generated):

```bash
# web/.gitignore
.husky/_
```

### 7. Document for Team

Create `web/CONTRIBUTING.md`:

```markdown
# Contributing

## Pre-Commit Checks

This project uses automated pre-commit hooks. When you commit:

1. **Linting**: ESLint fixes issues automatically
2. **Formatting**: Prettier formats your code
3. **Tests**: Vitest runs tests related to changed files

If checks fail, your commit is blocked. Fix issues and try again.

### Skip Hooks (Emergency Only)

```bash
git commit --no-verify -m "Emergency fix"
```

**⚠️ Use sparingly!** Skipping hooks can break the build.

### Troubleshooting

**Hook fails with "command not found":**
```bash
npm install
npm run prepare  # Reinstall hooks
```

**Hook takes too long:**
- Hooks only check staged files (should be fast)
- If slow, run `npm run test` separately before committing
```

## Acceptance Criteria

**Husky Setup:**
- [ ] Husky installed and initialized
- [ ] `.husky/` directory created
- [ ] `prepare` script added to package.json
- [ ] Pre-commit hook created and executable
- [ ] Pre-push hook created and executable

**lint-staged Configuration:**
- [ ] `lint-staged` configured in package.json
- [ ] TypeScript files: lint + format + test
- [ ] JSON/Markdown files: format only
- [ ] Only staged files processed (performance)

**Quality Gates:**
- [ ] Commit blocked if linting fails
- [ ] Commit blocked if tests fail
- [ ] Code auto-formatted on successful commit
- [ ] Push blocked if critical tests fail

**Documentation:**
- [ ] `CONTRIBUTING.md` created with hook explanation
- [ ] Team notified about new workflow
- [ ] Emergency skip procedure documented

**Verification:**
- [ ] Test hook with intentional lint error → blocked
- [ ] Test hook with passing code → commits successfully
- [ ] Test hook with broken test → blocked
- [ ] Verify hook runs in < 10 seconds for typical changes

## Files to Create

- `web/.husky/pre-commit` (Husky hook script)
- `web/.husky/pre-push` (Husky hook script)
- `web/CONTRIBUTING.md` (Developer guide)

## Files to Modify

- `web/package.json` - Add dependencies, scripts, lint-staged config
- `web/.gitignore` - Add `.husky/_`

## Verification

### Test 1: Lint Error Block

```bash
# Introduce lint error
echo "const unused = 'test'" >> web/lib/utils/test.ts
git add web/lib/utils/test.ts
git commit -m "Test commit"

# Expected: Commit blocked with lint error
# Actual result: ❌ ESLint found 1 error
```

### Test 2: Auto-Format

```bash
# Create unformatted file
echo "const x={a:1,b:2}" >> web/lib/utils/test.ts
git add web/lib/utils/test.ts
git commit -m "Test commit"

# Expected: File auto-formatted, commit succeeds
# Verify: git diff --cached shows formatted code
```

### Test 3: Test Failure Block

```bash
# Break a test
# Modify a function used by a test
git add <file>
git commit -m "Broken change"

# Expected: Related test fails, commit blocked
```

### Test 4: Performance Check

```bash
# Time a typical commit (2-3 files changed)
time git commit -m "Typical change"

# Expected: < 10 seconds
```

## Team Rollout Plan

### Phase 1: Soft Launch (Week 1)
- Install hooks
- Make hooks opt-in (not enforced)
- Educate team on benefits
- Collect feedback

### Phase 2: Enforcement (Week 2)
- Enable hooks for all team members
- Monitor for issues
- Adjust configuration based on feedback

### Phase 3: Optimization (Week 3+)
- Fine-tune which tests run on pre-commit
- Optimize for speed
- Add additional checks if needed

## Advanced Configuration (Future)

Can add more checks to hooks:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write",
      "vitest related --run",
      // Future additions:
      "tsc --noEmit",  // Type check
      "npm run check-bundle-size"  // Bundle size check
    ]
  }
}
```

## Escape Hatch

For emergencies (production hotfix, etc.):

```bash
# Skip all hooks
git commit --no-verify -m "HOTFIX: Critical security patch"

# Skip pre-push only
git push --no-verify
```

**Document in team guidelines**: Use `--no-verify` only for emergencies, with explicit justification in commit message.

## Expected Impact

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Broken commits** | 15-20% | < 2% | **90% reduction** |
| **Build failures** | 10-15/month | 2-3/month | **80% reduction** |
| **Time to fix broken builds** | 2-4 hours | 15-30 min | **75% faster** |
| **Code review time** | Focus on logic | Auto-formatted | **Faster reviews** |
| **Linting errors in codebase** | 50+ | Near 0 | **Continuous cleanup** |

---

**Created**: 2026-01-19  
**Status**: Not Started  
**Priority**: P1 - High (Prevents broken code from entering repository)
