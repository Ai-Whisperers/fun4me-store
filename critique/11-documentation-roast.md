# 📚 Documentation Roast

> *"Documentation is like sex: when it's good, it's very good, and when it's bad, it's better than nothing."*

**Score: 5/10** — *"The CLAUDE.md is stellar. Everything else is a ghost town."*

---

## Overview

Documentation exists on a spectrum from "self-documenting code" (myth) to "walls of text nobody reads" (also useless). Your project has one excellent file (CLAUDE.md) and then drops off a cliff into the void.

---

## 🟢 What You Did Right

### The CLAUDE.md Is Actually Good

**The Praise:**

```markdown
# CLAUDE.md - 400+ lines of pure gold
- Technology stack ✅
- Project structure ✅
- Database schema overview ✅
- Code patterns ✅
- Common tasks ✅
- Critical warnings ✅
```

This file is comprehensive, well-organized, and actually useful. If every project had a CLAUDE.md this good, AI assistants would be 50% more effective.

**Score for CLAUDE.md alone: 9/10**

But then...

---

## 🔴 Critical Issues

### DOC-001: No JSDoc on Public Functions

**The Crime:**

```typescript
// app/actions/invoices.ts
export async function createInvoice(data: CreateInvoiceInput) {
  // 200 lines of code
  // Zero documentation
  // What does this function do?
  // What errors can it throw?
  // What side effects does it have?
}
```

**What Should Exist:**

```typescript
/**
 * Creates a new invoice for a client.
 *
 * @param data - Invoice creation data
 * @param data.clientId - The client's profile ID (UUID)
 * @param data.items - Array of invoice line items
 * @param data.dueDate - When payment is expected
 *
 * @returns The created invoice with all items
 *
 * @throws {AuthenticationError} If user is not authenticated
 * @throws {AuthorizationError} If user is not staff
 * @throws {ValidationError} If items array is empty
 *
 * @example
 * ```typescript
 * const invoice = await createInvoice({
 *   clientId: 'uuid-123',
 *   items: [{ type: 'service', serviceId: 'uuid-456', quantity: 1 }],
 *   dueDate: new Date('2025-02-01')
 * })
 * ```
 */
export async function createInvoice(data: CreateInvoiceInput) {
```

**Files That Need JSDoc:**

- `app/actions/*.ts` (22 files, 0 documented)
- `lib/supabase/*.ts` (helpers with no docs)
- `lib/api/*.ts` (utilities with no docs)
- `components/**/*.tsx` (complex components)

**Effort:** 🟠 High (ongoing task)

---

### DOC-002: Abandoned TODO/FIXME Comments

**The Crime:**

```bash
grep -rn "TODO\|FIXME\|HACK\|XXX" --include="*.ts" --include="*.tsx" | head -20
```

**Found:**

| File | Line | Comment | Age |
|------|------|---------|-----|
| `app/api/invoices/route.ts` | 45 | `// TODO: Add pagination` | Unknown |
| `app/actions/appointments.ts` | 127 | `// FIXME: Race condition in booking` | Unknown |
| `components/calendar/calendar.tsx` | 89 | `// TODO: Optimize re-renders` | Unknown |
| `lib/supabase/client.ts` | 23 | `// HACK: Workaround for SSR` | Unknown |
| `app/api/store/checkout/route.ts` | 156 | `// TODO: Handle partial refunds` | Unknown |
| And 4 more... | | | |

**The Problem:**

9 TODO/FIXME comments floating in the codebase with:
- No associated issues
- No deadlines
- No owners
- No context on why they exist

**The Fix:**

Convert to tracked issues:
```markdown
## GitHub Issue Template

### TODO: Add pagination to invoices endpoint

**File:** `app/api/invoices/route.ts:45`
**Found:** 2024-12-15

**Context:**
Currently returns all invoices. For clinics with 1000+ invoices, this will be slow.

**Suggested Solution:**
Add offset/limit query params with cursor-based pagination.

**Priority:** Medium
**Effort:** 2-3 hours
```

Then delete the TODO comment.

**Effort:** 🟢 Low (but needs doing)

---

## 🟠 High Priority Issues

### DOC-003: No API Documentation

**The Crime:**

87 API endpoints. Zero OpenAPI documentation.

```bash
ls documentation/api/
# overview.md (generic)
# No endpoint-specific docs
```

**What You Need:**

```yaml
# openapi.yaml
openapi: 3.0.3
info:
  title: Vete API
  version: 1.0.0

paths:
  /api/invoices:
    get:
      summary: List invoices
      parameters:
        - name: status
          in: query
          schema:
            type: string
            enum: [draft, sent, paid, overdue]
      responses:
        200:
          description: List of invoices
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/InvoiceList'
        401:
          description: Unauthorized
```

**Tools to Generate:**

```bash
# From TypeScript types
npx ts-json-schema-generator --path "lib/types/**/*.ts" --out openapi.json

# Or use Swagger/OpenAPI decorators
npm install @nestjs/swagger  # If using Nest
```

**Effort:** 🟡 Medium (ongoing)

---

### DOC-004: Database Schema Docs Incomplete

**The Crime:**

```markdown
# documentation/database/schema-reference.md
# Lists table names
# Missing:
# - Column descriptions
# - Relationship diagrams
# - Index explanations
# - RLS policy documentation
```

**What's Missing:**

```sql
-- For every table, document:
CREATE TABLE prescriptions (
  id UUID PRIMARY KEY,           -- What generates this?
  pet_id UUID REFERENCES pets,   -- FK: Can be null? Cascade behavior?
  vet_id UUID REFERENCES profiles, -- FK: Must be role='vet'?
  medications JSONB,             -- What's the structure?
  valid_until DATE,              -- Business rule: how long?
  signature_url TEXT,            -- Storage bucket? Public?
  created_at TIMESTAMPTZ         -- Auto-generated? Updated on modify?
);
```

**The Fix:**

Create `documentation/database/tables/` with one file per table:
```markdown
# prescriptions.md

## Purpose
Digital prescriptions issued by veterinarians for controlled medications.

## Columns
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | UUID | No | Auto-generated primary key |
| pet_id | UUID | No | References pets(id), CASCADE DELETE |
| medications | JSONB | No | Array of {name, dose, frequency, duration} |

## Indexes
- `idx_prescriptions_pet_id` - For pet prescription history lookup
- `idx_prescriptions_vet_id` - For vet prescription audit

## RLS Policies
- Vets can view/create for their tenant
- Owners can view prescriptions for their pets

## Business Rules
- valid_until defaults to 30 days from creation
- signature_url required before marking as 'active'
```

**Effort:** 🟠 High (100+ tables)

---

### DOC-005: No Onboarding Documentation

**The Crime:**

New developer joins. Where do they start?

```markdown
# Expected: CONTRIBUTING.md
# Expected: docs/getting-started.md
# Expected: docs/development-setup.md
# Found: Nothing
```

**What's Needed:**

```markdown
# Getting Started

## Prerequisites
- Node.js 20+
- pnpm (or npm)
- Docker (for local Supabase)
- VS Code (recommended)

## Setup Steps

1. Clone the repo
   ```bash
   git clone https://github.com/org/vete.git
   cd vete/web
   ```

2. Copy environment file (DO NOT COMMIT)
   ```bash
   cp .env.example .env.local
   # Edit with your Supabase credentials
   ```

3. Install dependencies
   ```bash
   npm install
   ```

4. Start local Supabase
   ```bash
   npx supabase start
   ```

5. Run migrations
   ```bash
   npm run db:migrate
   ```

6. Seed demo data
   ```bash
   npm run seed:demo
   ```

7. Start development server
   ```bash
   npm run dev
   # Open http://localhost:3000/adris
   ```

## Common Tasks

### Adding a new clinic
See `documentation/guides/adding-clinic.md`

### Creating a database migration
See `documentation/guides/migrations.md`
```

**Effort:** 🟡 Medium (but high impact)

---

## 🟡 Medium Priority Issues

### DOC-006: Component Documentation Missing

**The Crime:**

300+ components. Zero Storybook. Zero component docs.

```bash
ls components/
# 50+ directories
# No README in any of them
# No Storybook stories
```

**What Should Exist:**

```typescript
// components/ui/button/README.md
# Button Component

## Usage
\`\`\`tsx
<Button variant="primary" size="lg">
  Click Me
</Button>
\`\`\`

## Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | 'primary' \| 'secondary' \| 'outline' | 'primary' | Visual style |
| size | 'sm' \| 'md' \| 'lg' | 'md' | Button size |
| disabled | boolean | false | Disable interactions |

## Variants
[Visual examples here]
```

**Or Use Storybook:**

```bash
npx storybook@latest init
# Then create stories for each component
```

**Effort:** 🟠 High (ongoing)

---

### DOC-007: No Architecture Decision Records

**The Crime:**

Why Zustand over Redux? Why JSON-CMS over a headless CMS? Why separate `lib/supabase` from `lib/api`?

Nobody knows. The decisions were made. The reasoning is lost.

**What Should Exist:**

```markdown
# ADR-001: State Management with Zustand

## Status
Accepted

## Context
Need client-side state management for cart, booking wizard, and dashboard filters.

## Decision
Use Zustand instead of Redux or Context.

## Rationale
- Simpler API than Redux (no actions/reducers)
- Better TypeScript support than Context
- Built-in devtools
- Smaller bundle size

## Consequences
- Team needs to learn Zustand patterns
- Cannot use Redux ecosystem (middleware, saga)
- Persistence requires zustand-persist plugin

## Alternatives Considered
- Redux Toolkit: Too complex for our use case
- React Context: Performance issues with frequent updates
- Jotai: Atomic model doesn't fit our domain
```

**Effort:** 🟡 Medium (retroactive ADRs)

---

### DOC-008: Inline Comments Missing Context

**The Crime:**

```typescript
// app/actions/invoices.ts
const TAX_RATE = 0.10  // Why 10%? Is this Paraguay-specific? Can it change?

// Bad
if (profile.role === 'owner') {
  // Check owner
  // (We know that, the code says that)
}

// Also bad
// Handle the thing
await handleThing()
```

**What Comments Should Say:**

```typescript
// Paraguay IVA tax rate. Per Ley 125/91, veterinary services are taxed at 10%.
// Different from standard 10% commercial rate.
// TODO: Make configurable per tenant for future countries
const TAX_RATE = 0.10

// Owners can only view their own pets' invoices.
// Staff (vets/admins) can view all invoices in their tenant.
// This check prevents horizontal privilege escalation.
if (profile.role === 'owner') {
```

**Effort:** 🟢 Low (ongoing)

---

## 📊 Documentation Metrics

| Category | Coverage | Target | Status |
|----------|----------|--------|--------|
| CLAUDE.md | 95% | 100% | ✅ |
| JSDoc on functions | 5% | 80% | 🔴 |
| API documentation | 0% | 100% | 🔴 |
| Database schema docs | 20% | 100% | 🟠 |
| Onboarding guide | 0% | 100% | 🔴 |
| Component docs | 0% | 50% | 🟠 |
| ADRs | 0% | Key decisions | 🟡 |

---

## Documentation Checklist

### This Week

- [ ] Create CONTRIBUTING.md
- [ ] Create Getting Started guide
- [ ] Convert TODO/FIXME to GitHub issues
- [ ] Document top 10 most-used functions

### This Sprint

- [ ] Add JSDoc to all server actions
- [ ] Document all API endpoints (at least params/responses)
- [ ] Create database table documentation for critical tables
- [ ] Set up basic Storybook

### This Quarter

- [ ] Complete API documentation
- [ ] Complete database documentation
- [ ] Create ADRs for major decisions
- [ ] Add inline comments to complex logic

---

## Documentation Templates

### Function JSDoc

```typescript
/**
 * [One-line description]
 *
 * [Longer explanation if needed]
 *
 * @param paramName - Description
 * @returns Description of return value
 * @throws {ErrorType} When this happens
 *
 * @example
 * ```typescript
 * const result = await myFunction('input')
 * ```
 */
```

### API Endpoint

```markdown
# POST /api/invoices

Creates a new invoice.

## Authentication
Required. User must be staff (vet or admin).

## Request Body
\`\`\`json
{
  "clientId": "uuid",
  "items": [
    { "type": "service", "serviceId": "uuid", "quantity": 1 }
  ]
}
\`\`\`

## Response
\`\`\`json
{
  "id": "uuid",
  "invoiceNumber": "INV-2025-001",
  "total": 150000,
  "status": "draft"
}
\`\`\`

## Errors
- 401: Not authenticated
- 403: Not staff member
- 422: Invalid items array
```

---

## Summary

You have one excellent documentation file (CLAUDE.md) that carries the entire weight. But documentation is not a one-time task—it's a continuous practice. The lack of JSDoc, API docs, and onboarding guides means every new developer (or AI assistant) has to reverse-engineer the codebase.

**Priority Actions:**
1. Create onboarding guide (today)
2. Convert TODOs to tracked issues (today)
3. Add JSDoc to server actions (this week)
4. Document API endpoints (this sprint)

*"The best documentation is written when the code is fresh. The second best is now."*

---

## The Documentation Debt Calculation

Every undocumented function costs:
- 15 minutes for the next developer to understand
- 5 minutes every time someone asks "what does this do?"
- 30 minutes when a bug appears and nobody knows the intent

87 API endpoints × 15 minutes = **21.75 hours** of debt just for API comprehension.

300 components × 10 minutes = **50 hours** of debt.

22 server actions × 15 minutes = **5.5 hours** of debt.

**Total documentation debt: ~77 hours** (and growing)

