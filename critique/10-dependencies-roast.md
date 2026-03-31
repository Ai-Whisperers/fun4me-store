# 📦 Dependencies & DevOps Roast

> *"Your dependencies are like your closet. You never clean it until something falls out and breaks."*

**Score: 4/10** — *"The foundation is cracked and the locks are on GitHub"*

---

## Overview

Dependencies, configuration, and DevOps are the unsexy backbone of any project. When they're solid, nobody notices. When they're broken, everything burns. Yours is... smoldering.

---

## 🔴 CRITICAL ISSUE

### DEP-001: Environment Files Committed to Git

**The Crime:**

```bash
# Files that should NEVER exist in a git repository:
.env         # Committed ✅ (WHAT?!)
.env.local   # Committed ✅ (WHY?!)
```

**What's Exposed:**

```env
# .env contains:
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
DATABASE_URL=postgresql://postgres:ACTUAL_PASSWORD@db.xxx.supabase.co:5432/postgres
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
```

**Translation:** Your database credentials are publicly visible to anyone who clones this repo. Your Supabase service role key (which bypasses RLS) is exposed. This is a **category 1 security incident**.

**Immediate Actions:**

1. **NOW:** Rotate all Supabase keys
2. **NOW:** Change database password
3. **NOW:** Add to .gitignore and remove from history:
   ```bash
   git filter-branch --force --index-filter \
     'git rm --cached --ignore-unmatch .env .env.local' \
     --prune-empty -- --all
   ```
4. **NOW:** Use environment variables from hosting provider

**Why This Happens:**

The `.gitignore` probably has `.env*` but someone committed before the ignore was added. Git tracks what it's told to track, forever.

**Effort:** 🔴 Critical (do it now, literally now)

---

## 🔴 Critical Issues

### DEP-002: Outdated Dependencies

**The Crime:**

```bash
npm outdated
```

| Package | Current | Wanted | Latest | Risk |
|---------|---------|--------|--------|------|
| @supabase/supabase-js | 2.88.0 | 2.88.0 | 2.90.0 | Low |
| next | 15.3.x | 15.3.x | 16.0.x | Breaking |
| @tanstack/react-query | 5.66.0 | 5.66.0 | 5.70.0 | Low |
| date-fns | 4.1.0 | 4.1.0 | 4.2.0 | Low |
| recharts | 2.15.1 | 2.15.1 | 2.16.0 | Low |
| zustand | 5.0.4 | 5.0.4 | 5.1.0 | Low |
| framer-motion | 11.18.2 | 11.18.2 | 12.0.0 | Breaking |
| **Total outdated** | **16** | - | - | 🟠 |

**The Problem:**

- 16 packages behind latest
- 1 major version behind (Next.js 16 is out)
- Security patches possibly missing
- You installed `@tanstack/react-query` but don't use it

**The Fix:**

```bash
# Regular maintenance schedule
npm outdated                    # Check weekly
npm update                      # Update minor versions
npm audit                       # Check vulnerabilities
```

**Effort:** 🟢 Low (automated task)

---

### DEP-003: Security Vulnerability in xlsx

**The Crime:**

```bash
npm audit
# 1 moderate severity vulnerability
# xlsx  <0.20.3
# Severity: moderate
# Issue: Prototype Pollution
```

**The Risk:**

The `xlsx` package has a prototype pollution vulnerability. If you're parsing Excel files from user uploads, this could be exploited.

**The Fix:**

```bash
npm update xlsx
# or if pinned:
npm install xlsx@latest
```

**Effort:** 🟢 Low (5 minutes)

---

## 🟠 High Priority Issues

### DEP-004: ESLint Disabled in Production

**The Crime:**

```json
// next.config.ts
{
  "eslint": {
    "ignoreDuringBuilds": true
  }
}
```

**Translation:** "I have linting rules. I just choose not to enforce them when it matters."

**The Problem:**

- Lint errors silently ignored in production build
- Type errors might slip through
- Code quality degrades over time
- Nobody notices until it breaks

**The Fix:**

```json
// next.config.ts
{
  "eslint": {
    "ignoreDuringBuilds": false  // Actually enforce rules
  }
}
```

Then fix the lint errors that appear. Yes, all of them.

**Effort:** 🟡 Medium (depends on current error count)

---

### DEP-005: TypeScript Errors Ignored

**The Crime:**

```json
// next.config.ts
{
  "typescript": {
    "ignoreBuildErrors": true
  }
}
```

**Translation:** "Types are just suggestions anyway."

**The Problem:**

This is worse than the ESLint issue. TypeScript exists to catch bugs at compile time. Ignoring type errors means you're shipping code that TypeScript explicitly warned you about.

**The Current Reality:**

```bash
npx tsc --noEmit
# ERROR count: 47
# Errors in:
#   - db/seeds/scripts/orchestrator.ts
#   - db/seeds/scripts/seeders/*.ts
#   - db/seeds/scripts/utils/*.ts
```

**The Fix:**

1. Set `ignoreBuildErrors: false`
2. Fix all 47 type errors
3. Add pre-commit hook to prevent regressions

**Effort:** 🟡 Medium (1-2 days to fix all errors)

---

### DEP-006: No CI/CD Pipeline

**The Crime:**

```bash
ls .github/workflows/
# No such file or directory
```

No GitHub Actions. No automated testing. No deployment pipeline. Every merge is a leap of faith.

**What You're Missing:**

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint
      - run: npm run test:unit
      - run: npm run test:e2e

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm audit --audit-level=moderate

  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx tsc --noEmit
```

**The Reality:**

- Tests run locally (maybe)
- No automated security scanning
- Type errors discovered in production
- "Works on my machine" syndrome

**Effort:** 🟡 Medium (half day to set up)

---

### DEP-007: Missing Pre-commit Hooks

**The Crime:**

No `husky`, no `lint-staged`, no pre-commit hooks. Developers can commit anything.

```json
// package.json
{
  "devDependencies": {
    // No husky
    // No lint-staged
  }
}
```

**What Should Exist:**

```json
// package.json
{
  "scripts": {
    "prepare": "husky install"
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

```bash
# .husky/pre-commit
npm run lint-staged
npm run test:unit -- --run
```

**Effort:** 🟢 Low (1 hour)

---

## 🟡 Medium Priority Issues

### DEP-008: Unused Dependencies

**The Crime:**

```json
// package.json
{
  "dependencies": {
    "@tanstack/react-query": "^5.66.0"  // Installed but...
  }
}
```

```bash
# Usage check
grep -r "@tanstack/react-query" --include="*.tsx" --include="*.ts" | wc -l
# 0 (or maybe 1-2 imports that do nothing)
```

React Query is installed but not used. You have Zustand for state management and raw `fetch` for data. Pick a pattern.

**Other Potentially Unused:**

- Check `@react-pdf/renderer` usage
- Check `framer-motion` usage
- Check `lucide-react` icon usage (are you using all 500KB?)

**The Fix:**

```bash
# Find unused dependencies
npx depcheck
```

**Effort:** 🟢 Low

---

### DEP-009: Missing Lock File Integrity

**The Questions:**

- Is `package-lock.json` committed? ✅ (Good)
- Is it regenerated on every install? ❓
- Are there `npm ci` vs `npm install` inconsistencies? ❓

**Best Practices:**

```bash
# CI should always use:
npm ci  # Not npm install

# Local development:
npm install  # Okay to update lock file
```

**Effort:** 🟢 Low

---

### DEP-010: Bundle Size Unknown

**The Crime:**

No bundle analysis. No size limits. You could be shipping 10MB of JavaScript and not know it.

**The Fix:**

```bash
# Add to package.json
{
  "scripts": {
    "analyze": "ANALYZE=true next build"
  }
}

# next.config.ts
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})
module.exports = withBundleAnalyzer(config)
```

**Effort:** 🟢 Low

---

## 📊 DevOps Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Secrets in repo | Yes | No | 🔴 CRITICAL |
| CI/CD pipeline | None | Full | 🔴 |
| Pre-commit hooks | None | Yes | 🟠 |
| Dependency freshness | 16 outdated | <5 | 🟠 |
| Security audit | 1 vuln | 0 | 🟡 |
| ESLint in build | Disabled | Enabled | 🟠 |
| TypeScript in build | Disabled | Enabled | 🟠 |
| Bundle analysis | None | Yes | 🟡 |

---

## Dependency Audit Checklist

### Immediate (TODAY)

- [ ] 🔴 Rotate ALL Supabase keys
- [ ] 🔴 Change database password
- [ ] 🔴 Remove .env files from git history
- [ ] 🔴 Add proper .gitignore entries
- [ ] 🟡 Update xlsx to fix vulnerability

### This Week

- [ ] Enable ESLint in builds
- [ ] Enable TypeScript checking in builds
- [ ] Fix all type errors (47)
- [ ] Set up basic GitHub Actions CI

### This Sprint

- [ ] Add pre-commit hooks
- [ ] Run `npm audit fix`
- [ ] Remove unused dependencies
- [ ] Add bundle analysis

---

## Summary

The credentials-in-git issue is an emergency. Everything else is technical debt that's accumulating interest. The lack of CI/CD means you're operating on trust and hope. The disabled ESLint and TypeScript checks mean you're actively choosing to ship bugs.

**Priority Actions:**
1. Rotate credentials NOW (security incident)
2. Enable ESLint/TypeScript in builds (this week)
3. Add GitHub Actions CI (this week)
4. Add pre-commit hooks (this sprint)

*"DevOps is like brushing your teeth. Skip it once, nobody notices. Skip it for a month, everyone knows."*

---

## Emergency Response Template

If your .env has been exposed (it has):

```markdown
# Incident Response: Exposed Credentials

## Date: [TODAY]

## Affected Systems:
- Supabase (anon key, service role key)
- PostgreSQL database (connection string)

## Immediate Actions:
1. [ ] Revoke/rotate Supabase anon key
2. [ ] Revoke/rotate Supabase service role key
3. [ ] Change PostgreSQL password
4. [ ] Remove files from git history
5. [ ] Force push to all branches
6. [ ] Notify team members to re-pull

## Post-Incident:
1. [ ] Add .env to .gitignore
2. [ ] Add pre-commit hook to prevent .env commits
3. [ ] Audit who might have accessed the repo
4. [ ] Check Supabase logs for unauthorized access
```

