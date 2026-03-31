# Vetic Issues - Detailed Action Plan

> **Created**: January 2026
> **Total Issues**: 53
> **Estimated Effort**: 4-6 weeks

---

## Table of Contents

1. [Week 1: Critical Security Fixes](#week-1-critical-security-fixes)
2. [Week 2: High Priority Fixes](#week-2-high-priority-fixes)
3. [Week 3: Medium Priority Fixes](#week-3-medium-priority-fixes)
4. [Week 4: Low Priority & Cleanup](#week-4-low-priority--cleanup)
5. [Verification Checklist](#verification-checklist)

---

# Week 1: Critical Security Fixes

## Day 1-2: Resolve Git Merge Conflicts

### Issue 1.1: middleware.ts Merge Conflict

**File**: `web/middleware.ts`

**Current State**: Contains `<<<<<<< HEAD`, `=======`, `>>>>>>>` markers

**Steps**:

1. Open file and identify both versions:
   - HEAD version: Full auth logic with role checks
   - Other version: Minimal without auth
2. Keep the HEAD version (full auth)
3. Remove all conflict markers
4. Ensure these functions are present:
   ```typescript
   - updateSession() call
   - Role-based redirects for /dashboard
   - Protected route checks for /portal
   ```
5. Test auth flow manually

**Verification**:

```bash
# Check no conflict markers remain
grep -r "<<<<<<" web/middleware.ts
grep -r "=======" web/middleware.ts
grep -r ">>>>>>" web/middleware.ts

# Test auth
npm run dev
# Try accessing /adris/dashboard without login - should redirect
# Try accessing /adris/portal without login - should redirect
```

---

### Issue 1.2: with-auth.ts Merge Conflict

**File**: `web/lib/api/with-auth.ts`

**Steps**:

1. Open file and find lines 121-177, 231-239
2. Identify the correct implementation (keep the one with proper error handling)
3. Remove conflict markers
4. Ensure `withAuth` wrapper exports correctly

**Verification**:

```bash
grep -r "<<<<<<" web/lib/api/with-auth.ts

# Run unit tests for auth
npm run test:unit -- --grep "withAuth"
```

---

### Issue 1.3: assign-tag.ts Merge Conflict

**File**: `web/app/actions/assign-tag.ts`

**Steps**:

1. Review entire file for conflict markers
2. Keep the version with proper validation and auth checks
3. Ensure `withActionAuth` wrapper is used
4. Test QR tag assignment flow

**Verification**:

```bash
grep -r "<<<<<<" web/app/actions/assign-tag.ts
npm run test:unit -- --grep "assignTag"
```

---

## Day 2-3: Fix Path Traversal Vulnerabilities

### Issue 1.4: Settings Routes Path Traversal

**Files**:

- `web/app/api/settings/branding/route.ts`
- `web/app/api/settings/services/route.ts`
- `web/app/api/settings/modules/route.ts`
- `web/app/api/settings/general/route.ts`

**Current Vulnerable Code**:

```typescript
const clinic = searchParams.get("clinic");
const configPath = path.join(CONTENT_DATA_PATH, clinic, "config.json");
```

**Fix - Add Validation Function**:

Create `web/lib/validation/clinic-slug.ts`:

```typescript
export function validateClinicSlug(slug: string | null): string {
  if (!slug) {
    throw new Error("Clinic parameter required");
  }

  // Only allow alphanumeric, hyphens, underscores
  const sanitized = slug.replace(/[^a-zA-Z0-9_-]/g, "");

  // Must match original (no traversal characters removed)
  if (sanitized !== slug) {
    throw new Error("Invalid clinic slug");
  }

  // Max length
  if (slug.length > 50) {
    throw new Error("Clinic slug too long");
  }

  return slug;
}
```

**Update Each Settings Route**:

```typescript
import { validateClinicSlug } from "@/lib/validation/clinic-slug";

// In handler:
const clinic = validateClinicSlug(searchParams.get("clinic"));
```

**Verification**:

```bash
# Test with path traversal attempt
curl "http://localhost:3000/api/settings/branding?clinic=../../../etc/passwd"
# Should return 400 error, not file contents
```

---

## Day 3-4: Add Authentication to Exposed Endpoints

### Issue 1.5: debug-network Endpoint

**File**: `web/app/api/debug-network/route.ts`

**Options**:

1. **Delete** (recommended for production)
2. Add admin-only auth
3. Add environment check

**Fix (Option 2 - Add Auth)**:

```typescript
import { withAuth } from "@/lib/api/with-auth";

export const GET = withAuth(
  async ({ profile }) => {
    // Existing logic
  },
  { roles: ["admin"] }
);
```

**Or (Option 3 - Dev Only)**:

```typescript
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  // ... rest
}
```

---

### Issue 1.6: growth_charts Endpoint

**File**: `web/app/api/growth_charts/route.ts`

**Steps**:

1. Import `withAuth` wrapper
2. Wrap all methods (GET, POST, PUT, DELETE)
3. Add tenant_id filter to queries
4. Add Zod validation for POST/PUT body

```typescript
import { withAuth } from "@/lib/api/with-auth";
import { z } from "zod";

const chartSchema = z.object({
  pet_id: z.string().uuid(),
  weight: z.number().positive(),
  date: z.string().datetime(),
});

export const GET = withAuth(async ({ profile, supabase }) => {
  const { data } = await supabase
    .from("growth_charts")
    .select("*")
    .eq("tenant_id", profile.tenant_id); // ADD THIS
  return NextResponse.json(data);
});

export const POST = withAuth(
  async ({ profile, supabase, request }) => {
    const body = await request.json();
    const validated = chartSchema.parse(body);
    // ... insert with tenant_id
  },
  { roles: ["vet", "admin"] }
);
```

---

### Issue 1.7: lost-pets Endpoint

**File**: `web/app/api/lost-pets/route.ts`

**Steps**:

1. Add auth wrapper
2. Add tenant_id filter
3. Validate PATCH status values

```typescript
export const GET = withAuth(async ({ profile, supabase }) => {
  const { data } = await supabase
    .from("lost_pets")
    .select("*, pets(*)")
    .eq("tenant_id", profile.tenant_id); // ADD
  return NextResponse.json(data);
});

export const PATCH = withAuth(
  async ({ profile, supabase, request }) => {
    const { id, status } = await request.json();

    // Validate status
    if (!["lost", "found", "reunited"].includes(status)) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }

    const { error } = await supabase
      .from("lost_pets")
      .update({ status })
      .eq("id", id)
      .eq("tenant_id", profile.tenant_id); // ADD
  },
  { roles: ["vet", "admin"] }
);
```

---

### Issue 1.8: availability Endpoint

**File**: `web/app/api/availability/route.ts`

**Decision**: This returns mock data. Either:

1. Delete if unused
2. Implement properly with auth

**Check if used**:

```bash
grep -r "availability" web/app --include="*.tsx" --include="*.ts" | grep -v route.ts
```

---

### Issue 1.9: pets Endpoint

**File**: `web/app/api/pets/route.ts`

**Current Issue**: Accepts userId param without verifying it matches authenticated user

**Fix**:

```typescript
export const GET = withAuth(async ({ user, profile, supabase }) => {
  // Don't accept userId from params - use authenticated user
  const { data } = await supabase
    .from("pets")
    .select("*")
    .eq("owner_id", user.id)
    .eq("tenant_id", profile.tenant_id);
  return NextResponse.json(data);
});
```

---

## Day 4-5: Enable Cron Security & Fix Tenant Filtering

### Issue 1.10: Cron Endpoint Auth

**File**: `web/app/api/cron/reminders/route.ts`

**Steps**:

1. Uncomment auth header check
2. Ensure CRON_SECRET is in environment

```typescript
export async function GET(request: NextRequest) {
  // 1. Security Check (Vercel Cron)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  // ... rest
}
```

**Add to .env.local**:

```env
CRON_SECRET=your-secure-random-string-here
```

---

### Issue 1.11: epidemiology/heatmap Tenant Filter

**File**: `web/app/api/epidemiology/heatmap/route.ts`

**Fix**: Make tenant filter required, not optional

```typescript
export const GET = withAuth(
  async ({ profile, supabase }) => {
    const { data } = await supabase
      .from("disease_reports")
      .select("*")
      .eq("tenant_id", profile.tenant_id); // Required, not optional
    return NextResponse.json(data);
  },
  { roles: ["vet", "admin"] }
);
```

---

## Day 5: Week 1 Verification

**Run full test suite**:

```bash
npm run test:unit
npm run test:integration
npm run build
```

**Manual security tests**:

```bash
# Test path traversal blocked
curl "http://localhost:3000/api/settings/branding?clinic=../etc"

# Test auth required
curl "http://localhost:3000/api/growth_charts"  # Should 401

# Test tenant isolation
# Login as clinic A, try to access clinic B data
```

---

# Week 2: High Priority Fixes

## Day 1-3: Migrate Routes to withAuth Wrapper

### Issue 2.1: Create Migration Script

Create tracking file `web/docs/AUTH_MIGRATION_TRACKER.md`:

```markdown
# Auth Migration Tracker

## To Migrate (60+ files)

### Batch 1 - Clinical (Day 1)

- [ ] diagnosis_codes/route.ts
- [ ] drug_dosages/route.ts
- [ ] euthanasia_assessments/route.ts
- [ ] growth_standards/route.ts
- [ ] prescriptions/route.ts
- [ ] reproductive_cycles/route.ts
- [ ] vaccine_reactions/route.ts
- [ ] vaccine_reactions/check/route.ts

### Batch 2 - Dashboard (Day 1)

- [ ] dashboard/appointments/route.ts
- [ ] dashboard/inventory-alerts/route.ts
- [ ] dashboard/revenue/route.ts
- [ ] dashboard/today-appointments/route.ts
- [ ] dashboard/vaccines/route.ts
- [ ] dashboard/waiting-room/route.ts
- [ ] dashboard/time-off/[id]/route.ts

### Batch 3 - Finance & Store (Day 2)

- [ ] finance/expenses/route.ts
- [ ] finance/pl/route.ts
- [ ] store/categories/route.ts
- [ ] store/checkout/route.ts
- [ ] store/orders/route.ts
- [ ] store/products/route.ts
- [ ] store/products/[id]/route.ts
- [ ] store/reviews/route.ts
- [ ] store/search/route.ts
- [ ] store/stock-alerts/route.ts
- [ ] store/wishlist/route.ts
- [ ] store/coupons/validate/route.ts

### Batch 4 - Hospital & Lab (Day 2)

- [ ] hospitalizations/[id]/route.ts
- [ ] hospitalizations/[id]/discharge/route.ts
- [ ] hospitalizations/[id]/feedings/route.ts
- [ ] hospitalizations/[id]/invoice/route.ts
- [ ] hospitalizations/[id]/treatments/route.ts
- [ ] hospitalizations/[id]/vitals/route.ts
- [ ] kennels/route.ts
- [ ] lab-catalog/route.ts
- [ ] lab-orders/[id]/route.ts
- [ ] lab-orders/[id]/comments/route.ts
- [ ] lab-orders/[id]/results/route.ts

### Batch 5 - Communications (Day 3)

- [ ] conversations/route.ts
- [ ] conversations/[id]/route.ts
- [ ] conversations/[id]/messages/route.ts
- [ ] messages/attachments/route.ts
- [ ] messages/quick-replies/route.ts
- [ ] messages/templates/route.ts
- [ ] notifications/route.ts
- [ ] notifications/mark-all-read/route.ts
- [ ] reminders/route.ts
- [ ] reminders/rules/route.ts
- [ ] reminders/stats/route.ts
- [ ] whatsapp/route.ts
- [ ] whatsapp/send/route.ts
- [ ] whatsapp/templates/route.ts
- [ ] whatsapp/templates/[id]/route.ts

### Batch 6 - Misc (Day 3)

- [ ] appointments/slots/route.ts
- [ ] appointments/[id]/complete/route.ts
- [ ] consents/blanket/route.ts
- [ ] consents/requests/route.ts
- [ ] consents/templates/route.ts
- [ ] consents/templates/[id]/route.ts
- [ ] consents/templates/[id]/versions/route.ts
- [ ] consents/[id]/audit/route.ts
- [ ] consents/[id]/email/route.ts
- [ ] epidemiology/reports/route.ts
- [ ] insurance/claims/route.ts
- [ ] insurance/claims/[id]/route.ts
- [ ] insurance/policies/route.ts
- [ ] insurance/pre-authorizations/route.ts
- [ ] insurance/providers/route.ts
- [ ] inventory/alerts/route.ts
- [ ] inventory/catalog/route.ts
- [ ] inventory/catalog/assign/route.ts
- [ ] inventory/export/route.ts
- [ ] inventory/import/route.ts
- [ ] inventory/stats/route.ts
- [ ] invoices/[id]/payments/route.ts
- [ ] invoices/[id]/pdf/route.tsx
- [ ] invoices/[id]/refund/route.ts
- [ ] invoices/[id]/send/route.ts
- [ ] sms/config/route.ts
- [ ] sms/route.ts
- [ ] sms/send/route.ts
- [ ] staff/schedule/route.ts
- [ ] staff/time-off/route.ts
- [ ] staff/time-off/types/route.ts
```

### Migration Pattern

**Before**:

```typescript
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile || !["vet", "admin"].includes(profile.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  // ... logic
}
```

**After**:

```typescript
import { withAuth } from "@/lib/auth/api-wrapper";

export const GET = withAuth(
  async ({ user, profile, supabase, request }) => {
    // ... logic directly, auth is handled
  },
  { roles: ["vet", "admin"] }
);
```

---

## Day 3-4: Fix XSS Vulnerability

### Issue 2.2: Product Description XSS

**File**: `web/components/store/product-detail/product-tabs.tsx`

**Line 92 - Current**:

```typescript
dangerouslySetInnerHTML={{ __html: product.description }}
```

**Fix**:

```typescript
import DOMPurify from "dompurify";

// In component:
const sanitizedDescription =
  typeof window !== "undefined"
    ? DOMPurify.sanitize(product.description || "")
    : product.description || "";

// In JSX:
<div
  className="prose prose-sm max-w-none text-[var(--text-primary)]"
  dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
/>;
```

**Check for other instances**:

```bash
grep -r "dangerouslySetInnerHTML" web/components --include="*.tsx" | grep -v "DOMPurify"
```

---

## Day 4: Add Twilio Signature Validation

### Issue 2.3: SMS Webhook Security

**File**: `web/app/api/sms/webhook/route.ts`

**Add Twilio Signature Validation**:

```typescript
import twilio from "twilio";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const twilioSignature = request.headers.get("X-Twilio-Signature");
  const url = request.url;

  // Get form data
  const formData = await request.formData();
  const params: Record<string, string> = {};
  formData.forEach((value, key) => {
    params[key] = value.toString();
  });

  // Validate signature
  const isValid = twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN!,
    twilioSignature || "",
    url,
    params
  );

  if (!isValid) {
    console.error("[SMS Webhook] Invalid Twilio signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  // ... rest of handler
}
```

---

## Day 4-5: Fix Hardcoded Colors

### Issue 2.4: Replace Hardcoded Colors with CSS Variables

**Color Mapping**:

```
bg-gray-50     → bg-[var(--bg-subtle)]
bg-gray-100    → bg-[var(--bg-muted)]
bg-gray-900    → bg-[var(--bg-inverse)]
text-gray-500  → text-[var(--text-muted)]
text-gray-600  → text-[var(--text-secondary)]
text-gray-700  → text-[var(--text-primary)]
border-gray-300 → border-[var(--border)]

bg-red-50      → bg-[var(--error-bg)]
bg-red-500     → bg-[var(--error)]
text-red-600   → text-[var(--error)]

bg-green-50    → bg-[var(--success-bg)]
bg-green-500   → bg-[var(--success)]
text-green-600 → text-[var(--success)]

bg-yellow-50   → bg-[var(--warning-bg)]
bg-yellow-500  → bg-[var(--warning)]

bg-blue-500    → bg-[var(--primary)]
bg-blue-600    → bg-[var(--primary-dark)]

bg-purple-500  → bg-[var(--accent)]
```

**Files to Update** (prioritized):

1. `components/auth/signup-form.tsx`
2. `components/auth/login-form.tsx`
3. `components/commerce/loyalty-redemption.tsx`
4. `components/finance/expense-form.tsx`
5. `components/appointments/reschedule-dialog.tsx`
6. `components/appointments/cancel-button.tsx`
7. `components/calendar/event-detail-modal.tsx`
8. `components/clinical/qol-assessment.tsx`
9. `components/clinical/growth-chart.tsx`
10. `components/dashboard/appointment-form.tsx`
11. `components/booking/booking-wizard/SuccessScreen.tsx`
12. `components/cart/pet-service-group.tsx`

**Search Command**:

```bash
grep -rn "bg-gray-\|bg-red-\|bg-green-\|bg-blue-\|bg-yellow-\|bg-purple-\|text-gray-\|text-red-\|text-green-\|border-gray-" web/components --include="*.tsx"
```

---

## Day 5: Consolidate Import Sources

### Issue 2.5: Fix Import Inconsistencies

**Step 1**: Decide canonical locations

- `withActionAuth` → `@/lib/auth/action-wrapper`
- `actionSuccess`, `actionError` → `@/lib/actions/result`

**Step 2**: Update barrel exports

`web/lib/auth/index.ts`:

```typescript
export { withActionAuth } from "./action-wrapper";
export { withAuth } from "./api-wrapper";
export * from "./core";
```

`web/lib/actions/index.ts`:

```typescript
export { actionSuccess, actionError } from "./result";
export type { ActionResult } from "./result";
```

**Step 3**: Find and replace imports

```bash
# Find all files importing from wrong location
grep -rn "from '@/lib/errors'" web/app/actions --include="*.ts"
grep -rn "from '@/lib/actions/with-action-auth'" web/app/actions --include="*.ts"
```

**Step 4**: Update each file to use canonical import

---

# Week 3: Medium Priority Fixes

## Day 1-2: Standardize API Response Formats

### Issue 3.1: Create Standard Response Helpers

**File**: `web/lib/api/responses.ts`

```typescript
import { NextResponse } from "next/server";

// Standard success response
export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ data, success: true }, { status });
}

// Standard error response
export function apiError(
  message: string,
  code: string,
  status: number,
  details?: Record<string, unknown>
) {
  return NextResponse.json(
    {
      error: { message, code, status, details },
      success: false,
    },
    { status }
  );
}

// Standard paginated response
export function apiPaginated<T>(
  items: T[],
  total: number,
  page: number,
  limit: number
) {
  return NextResponse.json({
    data: items,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
    success: true,
  });
}

// Standard delete response
export function apiDeleted() {
  return new NextResponse(null, { status: 204 });
}

// Standard created response
export function apiCreated<T>(data: T) {
  return NextResponse.json({ data, success: true }, { status: 201 });
}
```

**Update routes to use standard responses**

---

## Day 2-3: Translate Error Messages to Spanish

### Issue 3.2: Create Error Message Constants

**File**: `web/lib/errors/messages.ts`

```typescript
export const ERROR_MESSAGES = {
  // Auth
  UNAUTHORIZED: "No autorizado",
  FORBIDDEN: "Acceso denegado",
  SESSION_EXPIRED: "Sesión expirada",

  // Validation
  REQUIRED_FIELD: "Campo requerido",
  INVALID_FORMAT: "Formato inválido",
  INVALID_EMAIL: "Email inválido",

  // Resources
  NOT_FOUND: "Recurso no encontrado",
  PET_NOT_FOUND: "Mascota no encontrada",
  APPOINTMENT_NOT_FOUND: "Cita no encontrada",
  INVOICE_NOT_FOUND: "Factura no encontrada",

  // Operations
  SAVE_ERROR: "Error al guardar",
  DELETE_ERROR: "Error al eliminar",
  UPDATE_ERROR: "Error al actualizar",
  FETCH_ERROR: "Error al obtener datos",

  // Business
  SLOT_UNAVAILABLE: "Horario no disponible",
  INSUFFICIENT_STOCK: "Stock insuficiente",
  INVALID_STATUS: "Estado inválido",

  // Rate limiting
  RATE_LIMITED: "Demasiadas solicitudes. Intenta de nuevo más tarde.",
} as const;
```

**Search and replace English messages**:

```bash
grep -rn "'Failed to\|'Error:\|'Invalid\|'Missing\|'User not\|'Unauthorized'" web/app/api --include="*.ts"
```

---

## Day 3-4: Standardize Pagination

### Issue 3.3: Use Consistent Pagination

**Standard format**:

```typescript
{
  data: [...],
  pagination: {
    total: 100,
    page: 1,
    limit: 20,
    totalPages: 5,
    hasNext: true,
    hasPrev: false
  }
}
```

**Files to update**:

- `conversations/route.ts` - uses `{ data, total, page, limit }`
- `whatsapp/route.ts` - uses `{ data, pagination: {...} }` but different shape
- `notifications/route.ts` - uses different format
- `consents/templates/[id]/versions/route.ts`

**Add pagination to routes that need it**:

- `growth_charts` - returns all without pagination
- `kennels` - returns all
- `prescriptions` - returns all
- `reproductive_cycles` - returns all

---

## Day 4-5: Add Rate Limiting

### Issue 3.4: Add Rate Limiting to Sensitive Endpoints

**Priority endpoints**:

1. Email sending: `/invoices/[id]/send`, `/consents/[id]/email`
2. Payment: `/invoices/[id]/payments`
3. WhatsApp: `/whatsapp/send`
4. SMS: `/sms/send`
5. Settings: `/settings/*`

**Implementation Pattern**:

```typescript
import { rateLimit } from "@/lib/rate-limit";

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

export const POST = withAuth(async ({ user, ...ctx }) => {
  try {
    await limiter.check(10, user.id); // 10 requests per minute
  } catch {
    return apiError("Demasiadas solicitudes", "RATE_LIMITED", 429);
  }

  // ... rest of handler
});
```

---

# Week 4: Low Priority & Cleanup

## Day 1: Fix File Naming

### Issue 4.1: Rename PascalCase Files to kebab-case

```bash
# Components to rename
mv web/components/ui/Toast.tsx web/components/ui/toast.tsx
mv web/components/faq/FAQSection.tsx web/components/faq/faq-section.tsx
mv web/components/booking/booking-wizard/SuccessScreen.tsx web/components/booking/booking-wizard/success-screen.tsx
mv web/components/booking/booking-wizard/ServiceSelection.tsx web/components/booking/booking-wizard/service-selection.tsx
mv web/components/booking/booking-wizard/PetSelection.tsx web/components/booking/booking-wizard/pet-selection.tsx
mv web/components/booking/booking-wizard/DateTimeSelection.tsx web/components/booking/booking-wizard/date-time-selection.tsx
mv web/components/booking/booking-wizard/Confirmation.tsx web/components/booking/booking-wizard/confirmation.tsx
mv web/components/booking/booking-wizard/BookingSummary.tsx web/components/booking/booking-wizard/booking-summary.tsx
mv web/components/calendar/CalendarEvent.tsx web/components/calendar/calendar-event.tsx
mv web/components/calendar/CalendarStyles.tsx web/components/calendar/calendar-styles.tsx
```

**After renaming, update imports**:

```bash
grep -rn "from.*Toast" web --include="*.tsx" --include="*.ts"
# Update each import
```

---

### Issue 4.2: Rename snake_case API Routes

This requires creating new routes and redirects:

```bash
# Create new kebab-case routes
cp -r web/app/api/diagnosis_codes web/app/api/diagnosis-codes
cp -r web/app/api/drug_dosages web/app/api/drug-dosages
# ... etc

# Add redirects in next.config.mjs or delete old routes
```

**Note**: This is a breaking change - requires updating all frontend calls.

---

## Day 2: Standardize Directives

### Issue 4.3: Standardize "use client" Directive

**Standard**: Double quotes, semicolon, line 1

```typescript
"use client";
```

**Script to find violations**:

```bash
grep -rn "^'use client'" web/components --include="*.tsx"
grep -rn "^\"use client\"$" web/components --include="*.tsx"  # missing semicolon
```

**Fix each file to use standard format**

---

## Day 3: Remove Dead Code

### Issue 4.4: Delete Unused Files

```bash
# Delete refactored file
rm web/app/api/kennels/route.refactored.ts

# Delete availability if unused
rm web/app/api/availability/route.ts

# Delete user preferences if unused
rm web/app/api/user/preferences/route.ts
```

### Issue 4.5: Remove Console.log Statements

```bash
grep -rn "console.log" web/app/api --include="*.ts" | grep -v node_modules
```

**Remove or convert to proper logging**:

```typescript
// Replace console.log with:
if (process.env.NODE_ENV === "development") {
  console.log("[DEBUG]", data);
}
```

---

## Day 4: Fix HTTP Status Codes

### Issue 4.6: Use Correct Status Codes

**Pattern updates**:

```typescript
// DELETE should return 204
return new NextResponse(null, { status: 204 });

// POST creating resource should return 201
return NextResponse.json(created, { status: 201 });

// Validation errors: 400
// Server errors: 500
// Auth errors: 401 (not authenticated) or 403 (not authorized)
```

---

## Day 5: Fix Database Issues

### Issue 4.7: Remove Duplicate Table Definitions

**Check which file is authoritative**:

- `profiles` - keep in `10_core/01_tenants.sql` or `10_core/11_profiles.sql`
- `qr_tags` - keep in `85_system/02_audit.sql`
- `lost_pets` - keep in `20_pets/01_pets.sql`

**Remove duplicate definitions from other files**

### Issue 4.8: Fix Duplicate Column

**File**: `web/db/85_system/02_audit.sql`

Remove duplicate `batch_id` column from `qr_tags` table definition.

---

# Verification Checklist

## After Each Week

### Week 1 Verification

- [ ] No git conflict markers in codebase: `grep -r "<<<<<<" web/`
- [ ] All critical endpoints require auth
- [ ] Path traversal test fails gracefully
- [ ] Cron endpoint rejects unauthorized requests
- [ ] Build succeeds: `npm run build`
- [ ] Tests pass: `npm run test`

### Week 2 Verification

- [ ] No manual auth patterns in migrated routes
- [ ] No XSS vulnerabilities: `grep -r "dangerouslySetInnerHTML" web/ | grep -v DOMPurify`
- [ ] No hardcoded colors: `grep -r "bg-gray-\|bg-red-" web/components`
- [ ] Import consistency: Single source for each utility
- [ ] Twilio webhook validates signatures

### Week 3 Verification

- [ ] All API responses use standard format
- [ ] All error messages in Spanish
- [ ] Pagination consistent across endpoints
- [ ] Rate limiting on sensitive endpoints

### Week 4 Verification

- [ ] All files follow naming conventions
- [ ] No dead code or console.log
- [ ] HTTP status codes correct
- [ ] Database schema clean

## Final Verification

```bash
# Full test suite
npm run test

# Build check
npm run build

# Lint check
npm run lint

# Security scan
npm audit

# Type check
npx tsc --noEmit
```

---

## Estimated Timeline

| Week | Focus             | Hours  | Risk                               |
| ---- | ----------------- | ------ | ---------------------------------- |
| 1    | Critical Security | 20-25h | High - Security vulnerabilities    |
| 2    | High Priority     | 25-30h | Medium - Breaking changes possible |
| 3    | Medium Priority   | 15-20h | Low - Consistency improvements     |
| 4    | Low Priority      | 10-15h | Low - Cleanup                      |

**Total Estimated Effort**: 70-90 hours

---

_Plan created: January 2026_
_Review weekly and adjust priorities as needed_
