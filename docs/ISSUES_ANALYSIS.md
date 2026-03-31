# Vetic - Comprehensive Issues Analysis

> **Generated**: January 2026
> **Status**: Issues identified across code, database, API, and security

---

## Executive Summary

| Category             | Critical | High   | Medium | Low    | Total  |
| -------------------- | -------- | ------ | ------ | ------ | ------ |
| **Security**         | 4        | 4      | 5      | 3      | 16     |
| **Code Consistency** | 1        | 3      | 4      | 4      | 12     |
| **API Issues**       | 5        | 5      | 3      | 2      | 15     |
| **Database**         | 3        | 2      | 3      | 2      | 10     |
| **Total**            | **13**   | **14** | **15** | **11** | **53** |

---

## CRITICAL ISSUES (Fix Immediately)

### 1. Git Merge Conflicts in Security-Critical Files

**Files with unresolved merge conflicts:**

- `web/middleware.ts` - Auth logic conflicting versions
- `web/lib/api/with-auth.ts` - Contains `<<<<<<< HEAD` markers
- `web/app/actions/assign-tag.ts` - Entire file has conflicts

**Impact**: Application may crash or bypass authentication entirely
**Fix**: Resolve conflicts and test all auth flows

---

### 2. Path Traversal Vulnerability in Settings API

**Files:**

- `web/app/api/settings/branding/route.ts`
- `web/app/api/settings/services/route.ts`
- `web/app/api/settings/modules/route.ts`

**Issue**: User-controlled `clinic` parameter used in file paths without sanitization

```typescript
const configPath = path.join(CONTENT_DATA_PATH, clinic, "config.json");
// No validation that 'clinic' doesn't contain '../'
```

**Fix**: Validate clinic param contains only alphanumeric characters and hyphens

---

### 3. Unauthenticated API Endpoints

| Endpoint             | Issue                           |
| -------------------- | ------------------------------- |
| `/api/debug-network` | Exposes server environment info |
| `/api/availability`  | Returns data without auth       |
| `/api/growth_charts` | No auth on GET/POST/PUT/DELETE  |
| `/api/lost-pets`     | No auth on GET/PATCH            |
| `/api/pets`          | No auth, queries by user param  |

**Fix**: Add `withAuth` wrapper to all endpoints or remove if unused

---

### 4. Cron Endpoint Security Disabled

**File**: `web/app/api/cron/reminders/route.ts`

**Issue**: Auth header check is commented out

```typescript
// const authHeader = request.headers.get('authorization');
// if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
```

**Fix**: Uncomment and ensure `CRON_SECRET` is set

---

### 5. Missing Tenant Filtering (Data Leak Risk)

| Endpoint                    | Issue                                 |
| --------------------------- | ------------------------------------- |
| `/api/growth_charts`        | No tenant_id filter                   |
| `/api/lost-pets`            | Exposes all lost pets across tenants  |
| `/api/pets`                 | Filters by owner_id but not tenant_id |
| `/api/epidemiology/heatmap` | Optional tenant filter                |

**Fix**: Add `.eq('tenant_id', profile.tenant_id)` to all queries

---

## HIGH PRIORITY ISSUES

### 6. Inconsistent Auth Pattern (60+ files)

**Problem**: Mix of `withAuth` wrapper and manual auth checks

**Files using manual auth (should migrate):**

- `diagnosis_codes/route.ts`
- `drug_dosages/route.ts`
- `kennels/route.ts`
- `whatsapp/route.ts`
- `appointments/slots/route.ts`
- ~50+ more files

**Standard pattern:**

```typescript
// ✅ Use this
export const GET = withAuth(
  async ({ profile, supabase }) => {
    // ...
  },
  { roles: ["vet", "admin"] }
);

// ❌ Not this
const {
  data: { user },
} = await supabase.auth.getUser();
if (!user)
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
```

---

### 7. XSS Vulnerability in Product Description

**File**: `web/components/store/product-detail/product-tabs.tsx:92`

```typescript
dangerouslySetInnerHTML={{ __html: product.description }}
// Missing DOMPurify sanitization
```

**Fix**: Use DOMPurify like in consent-preview.tsx

---

### 8. SMS Webhook Without Signature Validation

**File**: `web/app/api/sms/webhook/route.ts`

**Issue**: Twilio webhooks should validate X-Twilio-Signature
**Fix**: Add Twilio signature validation middleware

---

### 9. Hardcoded Colors (20+ components)

**Per project guidelines**: Use CSS variables, not Tailwind colors

**Affected files:**

- `components/auth/signup-form.tsx` - `bg-green-100`, `text-green-600`
- `components/auth/login-form.tsx` - `border-gray-300`, `text-gray-700`
- `components/commerce/loyalty-redemption.tsx` - `bg-purple-500`
- `components/finance/expense-form.tsx` - `bg-gray-50`
- `components/appointments/reschedule-dialog.tsx`
- `components/appointments/cancel-button.tsx`
- `components/calendar/event-detail-modal.tsx`
- `components/clinical/qol-assessment.tsx`
- `components/clinical/growth-chart.tsx`
- `components/dashboard/appointment-form.tsx`
- `components/booking/booking-wizard/SuccessScreen.tsx`
- `components/cart/pet-service-group.tsx`

**Fix**: Replace with `bg-[var(--primary)]`, `text-[var(--text-primary)]`, etc.

---

### 10. Import Source Inconsistency

**`withActionAuth` imported from 3 locations:**

- `@/lib/actions` (barrel)
- `@/lib/actions/with-action-auth` (direct)
- `@/lib/auth` (different module)

**`actionSuccess/actionError` imported from 2 locations:**

- `@/lib/actions`
- `@/lib/errors`

**Fix**: Consolidate to single barrel export

---

## MEDIUM PRIORITY ISSUES

### 11. API Response Format Inconsistencies

| Current                       | Files             | Should Be           |
| ----------------------------- | ----------------- | ------------------- |
| `{ success: true, message }`  | complete/route.ts | Use `apiSuccess()`  |
| `{ clients, ...pagination }`  | clients/route.ts  | Standard pagination |
| Raw array                     | consents/route.ts | Wrap in `{ data }`  |
| `{ data, pagination: {...} }` | whatsapp/route.ts | Standard format     |

---

### 12. Error Message Language Mix

**English errors (should be Spanish):**

- `medical-records.ts:81` - `'Failed to create record'`
- `growth_standards/route.ts` - `'Missing breed or gender'`
- `pets/route.ts` - `'User not provided'`
- `pets/[id]/qr/route.ts` - `'Unauthorized'`
- `store/products/route.ts` - `'Failed to fetch store products'`

**Correct Spanish errors:**

- `'No autorizado'`
- `'Error al guardar'`
- `'Recurso no encontrado'`

---

### 13. Pagination Inconsistencies

| Approach                              | Files                                 |
| ------------------------------------- | ------------------------------------- |
| `paginatedResponse()` helper          | clients, invoices, lab-orders         |
| Manual `{ data, total, page, limit }` | conversations                         |
| `{ data, pagination: {...} }`         | whatsapp, notifications               |
| No pagination                         | growth_charts, kennels, prescriptions |

---

### 14. File Naming Inconsistencies

**PascalCase (should be kebab-case):**

- `Toast.tsx` → `toast.tsx`
- `FAQSection.tsx` → `faq-section.tsx`
- `SuccessScreen.tsx` → `success-screen.tsx`
- `DateTimeSelection.tsx` → `date-time-selection.tsx`
- `CalendarEvent.tsx` → `calendar-event.tsx`

**snake_case API routes (should be kebab-case):**

- `/diagnosis_codes` → `/diagnosis-codes`
- `/drug_dosages` → `/drug-dosages`
- `/growth_charts` → `/growth-charts`
- `/loyalty_points` → `/loyalty-points`
- `/vaccine_reactions` → `/vaccine-reactions`

---

### 15. Missing Rate Limiting

**Endpoints without rate limiting:**

- All `/dashboard/*` routes
- All `/epidemiology/*` routes
- `/growth_charts`
- `/hospitalizations`
- `/consents/*`
- `/conversations/*`
- `/finance/*`
- `/invoices/[id]/send` (email)
- `/whatsapp`
- `/notifications`
- `/reminders`
- `/settings/*`

---

### 16. Database Schema Issues

| Issue                 | Tables                                               |
| --------------------- | ---------------------------------------------------- |
| Duplicate definitions | `profiles`, `qr_tags`, `lost_pets`                   |
| Duplicate column      | `batch_id` in qr_tags                                |
| RLS disabled          | `invoice_sequences`, `materialized_view_refresh_log` |
| Commented-out RLS     | `20_pets/02_vaccines.sql`                            |

---

## LOW PRIORITY ISSUES

### 17. "use client" Directive Inconsistencies

**Double quotes:** `Toast.tsx`, `qol-assessment.tsx`, `growth-chart.tsx`
**Single quotes:** `template-selector.tsx`, `calendar.tsx`, `appointment-card.tsx`
**Wrong line:** Some files have it on line 2 instead of line 1

---

### 18. Dead Code / Leftovers

- `web/app/api/kennels/route.refactored.ts` - Refactored file not deleted
- Console.log statements in production:
  - `user/preferences/route.ts`
  - `setup/seed/route.ts`
  - `inventory/catalog/assign/route.ts`

---

### 19. HTTP Status Code Misuse

| Issue                            | Correct                     |
| -------------------------------- | --------------------------- |
| DELETE returns 200 with message  | Should be 204 No Content    |
| POST returns `{ success: true }` | Should be 201 with resource |
| All errors return 400            | Distinguish 400 vs 500      |

---

### 20. TypeScript Errors

```
app/[clinic]/store/product/[id]/client.tsx(654,1): error TS1128
```

---

## Recommended Fix Order

### Week 1 - Critical Security

1. ✅ Resolve git merge conflicts
2. ✅ Fix path traversal in settings routes
3. ✅ Add auth to exposed endpoints
4. ✅ Enable cron endpoint security
5. ✅ Add tenant filtering to leaky endpoints

### Week 2 - High Priority

6. Migrate 60+ routes to `withAuth` wrapper
7. Add DOMPurify to product description
8. Add Twilio signature validation
9. Fix hardcoded colors (20 files)
10. Consolidate import sources

### Week 3 - Medium Priority

11. Standardize API response formats
12. Translate error messages to Spanish
13. Standardize pagination
14. Add rate limiting to endpoints
15. Fix database duplicates

### Week 4 - Low Priority

16. Rename files to kebab-case
17. Standardize "use client" directive
18. Remove dead code
19. Fix HTTP status codes
20. Fix TypeScript errors

---

## Metrics

| Metric                            | Count      |
| --------------------------------- | ---------- |
| Files with merge conflicts        | 3          |
| Unauthenticated endpoints         | 5          |
| Missing tenant filtering          | 4          |
| Routes needing withAuth migration | 60+        |
| Components with hardcoded colors  | 20+        |
| Endpoints without rate limiting   | 25+        |
| Import inconsistencies            | 3 patterns |
| File naming violations            | 18 files   |
| API route naming violations       | 8 routes   |

---

_Generated by comprehensive codebase analysis_
