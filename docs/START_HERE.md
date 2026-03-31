# Start Here - Project Improvement Guide

> **Purpose**: Your roadmap for understanding and fixing the Vete platform
> **Created**: January 2026

---

## Quick Overview

You have a multi-tenant veterinary SaaS platform with:
- ✅ Solid foundation (Next.js 15, Supabase, TypeScript)
- ⚠️ 53 code quality/security issues to fix
- ⚠️ 8 frontend features with no backend connection
- ⚠️ 6 backend APIs with no frontend UI
- ⚠️ 43 unused database tables (35% of schema)
- ⚠️ TypeScript errors being suppressed

---

## Reading Order

### Phase 1: Understand the Project (30-45 min)

Read these in order to understand what you're working with:

| Order | File | What You'll Learn | Time |
|-------|------|-------------------|------|
| 1 | [`CLAUDE.md`](./CLAUDE.md) | Project overview, architecture, coding standards | 10 min |
| 2 | [`docs/PROJECT_DOCUMENTATION.md`](./docs/PROJECT_DOCUMENTATION.md) | Complete technical reference (skim sections as needed) | 15 min |
| 3 | [`web/.content_data/_TEMPLATE/`](./web/.content_data/_TEMPLATE/) | How the JSON-CMS content system works | 5 min |

**After Phase 1, you'll understand:**
- How multi-tenancy works (`/[clinic]/*` routing)
- Database schema (100+ tables, 13 domains)
- API patterns and authentication
- Component structure
- How to add new features

---

### Phase 2: Understand the Problems (20-30 min)

| Order | File | What You'll Learn | Time |
|-------|------|-------------------|------|
| 4 | [`docs/ISSUES_ANALYSIS.md`](./docs/ISSUES_ANALYSIS.md) | All 53 issues categorized by severity | 10 min |
| 5 | [`docs/INCOMPLETE_IMPLEMENTATIONS.md`](./docs/INCOMPLETE_IMPLEMENTATIONS.md) | Features that are half-built | 10 min |
| 6 | [`docs/TROUBLESHOOTING.md`](./docs/TROUBLESHOOTING.md) | Common problems and solutions | 5 min |

**After Phase 2, you'll understand:**
- Critical security issues to fix first
- Which features look complete but aren't
- Database health problems
- Code quality issues

---

### Phase 3: Plan the Work (10 min)

| Order | File | What You'll Learn | Time |
|-------|------|-------------------|------|
| 7 | [`docs/ISSUES_ACTION_PLAN.md`](./docs/ISSUES_ACTION_PLAN.md) | Week-by-week fix schedule with code examples | 10 min |

**After Phase 3, you'll have:**
- Prioritized task list
- Estimated effort per fix
- Before/after code examples
- Verification checklists

---

## How to Work With Claude

### Starting a Session

Just tell me what you want to work on:

```
"Let's fix the critical security issues"
"Help me connect the wishlist to the backend"
"Let's enable TypeScript checking and fix errors"
"Show me how the appointment booking works"
```

### Recommended Workflows

#### Workflow 1: Fix Issues by Priority

```
You: "Let's work through the critical issues in ISSUES_ACTION_PLAN.md"
Claude: [Reads the file, starts with first critical issue]
You: [Approve/modify each fix]
```

#### Workflow 2: Complete a Feature

```
You: "Let's finish the product reviews feature"
Claude: [Finds existing code, identifies gaps, implements missing pieces]
You: [Test and verify]
```

#### Workflow 3: Understand Then Fix

```
You: "Explain how the invoice system works"
Claude: [Traces code flow, shows key files]
You: "Now fix the email sending part"
Claude: [Implements the fix]
```

#### Workflow 4: Bulk Cleanup

```
You: "Remove all console.log statements from the codebase"
Claude: [Finds all instances, removes them systematically]
```

### Useful Commands

| Command | What It Does |
|---------|--------------|
| `/run-tests` | Execute the test suite |
| `/review-code` | Get a code review on recent changes |
| `/debug` | Systematic debugging help |
| `/git-status` | See current git state |
| `/lint` | Check for linting issues |

---

## Priority Task List

### 🔴 Critical (Do First)

1. **Fix TypeScript errors** - Remove `ignoreBuildErrors: true`
   - File: `web/next.config.mjs`
   - Risk: Hidden bugs in production

2. **Fix missing RPC functions** - `exec_sql()` and others
   - Risk: Runtime errors

3. **Add missing RLS policies** - Security vulnerability
   - Risk: Data leakage between tenants

### 🟠 High Priority (This Week)

4. **Connect Product Reviews** - Button does nothing
   - Files: `web/components/store/product-detail/product-tabs.tsx`

5. **Connect Wishlist** - Only saves locally
   - File: `web/components/store/enhanced-product-card.tsx`

6. **Create Lost Pets UI** - Backend exists, no frontend
   - Create: `web/app/[clinic]/lost-pets/page.tsx`

### 🟡 Medium Priority (This Month)

7. **Remove debug console.logs** - 19+ instances
8. **SMS integration** - Settings exist, no sending
9. **Email campaigns** - Can create, can't send
10. **P&L reports** - API incomplete, no UI

### 🟢 Low Priority (Backlog)

11. Clean up orphan database tables
12. Remove unused RPC functions
13. Resolve TODO markers
14. Add missing tests

---

## Quick Reference Card

### Key Directories

```
web/
├── app/[clinic]/          # All tenant pages (routes)
├── app/api/               # REST API endpoints
├── app/actions/           # Server Actions (mutations)
├── components/            # React components
├── lib/supabase/          # Database client
├── .content_data/         # JSON content per clinic
└── db/                    # SQL migrations
```

### Key Patterns

```typescript
// Every API route needs:
1. Auth check (getUser)
2. Tenant context (profile.tenant_id)
3. Query with tenant filter (.eq('tenant_id', tenantId))

// Every page needs:
1. generateStaticParams() for SSG
2. getClinicData(clinic) for content
3. Theme variables for colors (var(--primary))
```

### Database Rules

```sql
-- Every table needs:
1. tenant_id column
2. RLS enabled
3. Policies for access control
4. updated_at trigger
```

---

## Session Starters

Copy-paste these to quickly start common tasks:

### Fix Critical Issues
```
Let's start fixing critical issues. Read ISSUES_ACTION_PLAN.md and begin with Week 1 Day 1 tasks.
```

### Complete Wishlist Feature
```
The wishlist only saves locally. Help me connect it to the /api/store/wishlist endpoint so it persists to the database.
```

### Enable TypeScript Checking
```
Remove ignoreBuildErrors from next.config.mjs and help me fix all the TypeScript errors that appear.
```

### Clean Up Console Logs
```
Find and remove all console.log statements from the web/app, web/components, and web/lib directories.
```

### Create Lost Pets Page
```
The /api/lost-pets endpoint exists but there's no UI. Create a lost pets page at /[clinic]/lost-pets with a form to report lost pets and a list of current lost pets.
```

### Understand a Feature
```
Explain how the appointment booking system works end-to-end, from the user clicking "Book" to the appointment being saved in the database.
```

---

## File Quick Links

### Documentation Files
- [CLAUDE.md](./CLAUDE.md) - Project context for AI
- [docs/PROJECT_DOCUMENTATION.md](./docs/PROJECT_DOCUMENTATION.md) - Complete reference
- [docs/ISSUES_ANALYSIS.md](./docs/ISSUES_ANALYSIS.md) - All 53 issues
- [docs/ISSUES_ACTION_PLAN.md](./docs/ISSUES_ACTION_PLAN.md) - Fix schedule
- [docs/INCOMPLETE_IMPLEMENTATIONS.md](./docs/INCOMPLETE_IMPLEMENTATIONS.md) - Half-built features
- [docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md) - Common problems
- [docs/ENV_REFERENCE.md](./docs/ENV_REFERENCE.md) - Environment variables
- [docs/ANALYSIS_REPORT.md](./docs/ANALYSIS_REPORT.md) - Latest code analysis

### Existing Documentation
- [documentation/](./documentation/) - 174 technical docs
- [documentation/testing/](./documentation/testing/) - Test plans and strategy
- [documentation/database/](./documentation/database/) - Schema reference
- [documentation/api/](./documentation/api/) - API documentation

---

## Progress Tracking

As you fix issues, update these files:

1. **docs/ISSUES_ANALYSIS.md** - Mark issues as ✅ FIXED
2. **docs/ISSUES_ACTION_PLAN.md** - Check off completed tasks
3. **docs/INCOMPLETE_IMPLEMENTATIONS.md** - Remove completed features

Or just tell me:
```
"Mark the TypeScript ignore flag issue as fixed"
```

And I'll update the documentation for you.

---

## Questions?

Just ask! Examples:
- "What does the `withAuth` wrapper do?"
- "How do I add a new database table?"
- "Where is the appointment status updated?"
- "Why is RLS important?"

I have full context of this project and can explain any part of it.

---

*Let's get started! What would you like to work on first?*
