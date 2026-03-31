# 🔐 Security Roast

> *"Security is not a feature. It's a foundation that crumbles silently."*

**Score: 6/10** — *"The locks exist, but some doors are unlocked"*

---

## Overview

The Vete platform handles sensitive data: medical records, payment information, personal details, prescription medications. The security foundations are present—RLS, authentication, role-based access. But the enforcement has gaps, rate limiting is inconsistent, and some assumptions could be exploited.

**This is the roast that keeps you awake at night.**

---

## 🔴 Critical Issues

### SEC-001: Tenant Isolation Gaps

**The Crime:**

**Good Pattern (rare):**
```typescript
// app/api/store/cart/route.ts (lines 34-45)
const { data: cart } = await supabase
  .from('store_carts')
  .select('*')
  .eq('customer_id', user.id)
  .eq('tenant_id', profile.tenant_id)  // ✅ Always filter by tenant
```

**Bad Pattern (common):**
```typescript
// app/api/appointments/slots/route.ts (lines 70-76)
// Authorization check at route level
if (clinicSlug !== profile.tenant_id && !isStaff) {
  return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
}

// But subsequent queries trust this check
const { data } = await supabase
  .from('appointments')
  .select('*')
  .eq('clinic_id', clinicSlug)  // ⚠️ Uses URL param, not profile.tenant_id
```

**The Problem:**

If the authorization check is bypassed or has a bug, queries could return data from other tenants. The tenant filter should be in EVERY query, not just at the route level.

**The Exploit:**

```bash
# Attacker modifies request somehow to bypass route check
# Query uses clinicSlug from URL instead of profile.tenant_id
# Attacker sees other tenant's appointments
```

**The Fix:**

Tenant filter on EVERY query:
```typescript
// Create a tenant-scoped client
function scopedClient(supabase: SupabaseClient, tenantId: string) {
  return {
    from: (table: string) => supabase
      .from(table)
      .eq('tenant_id', tenantId)  // Always included
  }
}

// Usage
const scoped = scopedClient(supabase, profile.tenant_id)
const { data } = await scoped.from('appointments').select('*')
```

**Effort:** 🔴 High (audit all queries)

---

### SEC-002: RLS Policy Verification

**The Crime:**

You have 100+ tables with RLS "enabled." But have you tested them?

```sql
-- Tables that MUST have proper RLS
profiles          -- User data, tenant isolation
pets             -- Pet records
medical_records  -- Health information (HIPAA-adjacent)
prescriptions    -- Controlled substances
invoices         -- Financial data
payments         -- Payment information
appointments     -- Schedule information
consent_documents -- Legal documents
insurance_claims  -- Insurance data
messages         -- Private communications
```

**The Test That Needs to Exist:**

```typescript
// tests/security/rls-comprehensive.test.ts
describe('RLS Policies', () => {
  const tables = [
    'profiles', 'pets', 'medical_records', 'prescriptions',
    'invoices', 'payments', 'appointments', 'consent_documents',
    'insurance_claims', 'messages'
  ]

  for (const table of tables) {
    describe(table, () => {
      it('tenant A cannot read tenant B data', async () => {
        // Create data in tenant A
        const { data: created } = await tenantAClient
          .from(table)
          .insert(buildRecord({ tenant_id: 'tenant-a' }))

        // Try to read from tenant B
        const { data: leaked } = await tenantBClient
          .from(table)
          .select('*')
          .eq('id', created.id)

        expect(leaked).toHaveLength(0)
      })

      it('tenant A cannot update tenant B data', async () => {
        // Similar test for UPDATE
      })

      it('tenant A cannot delete tenant B data', async () => {
        // Similar test for DELETE
      })
    })
  }
})
```

**Run the Audit:**
```bash
supabase get advisors --type security
```

**Effort:** 🔴 High (but critical)

---

### SEC-003: Missing Rate Limiting

**The Crime:**

Rate limiting is implemented but not applied:

```typescript
// lib/api/rate-limit.ts exists ✅
// But only used on /api/services (public endpoint)

// UNPROTECTED ENDPOINTS:
// ❌ /api/invoices          — Financial data
// ❌ /api/appointments/*    — Schedule manipulation
// ❌ /api/store/checkout    — Payment processing
// ❌ /api/pets/[id]/qr      — Sensitive pet data
// ❌ /api/auth/login        — Brute force target!
```

**The Attack:**

```bash
# Brute force login
for password in $(cat wordlist.txt); do
  curl -X POST /api/auth/login -d "{\"email\":\"admin@clinic.com\",\"password\":\"$password\"}"
done
# No rate limit = easy account takeover
```

**The Fix:**

Apply rate limits by sensitivity:
```typescript
// lib/api/rate-limits.ts
export const RateLimits = {
  auth: { window: '1m', limit: 5 },      // Login/signup
  sensitive: { window: '1m', limit: 10 }, // Financial, medical
  standard: { window: '1m', limit: 60 },  // Normal authenticated
  public: { window: '1m', limit: 100 },   // Public pages
}

// Apply to routes
export const POST = withAuth(
  rateLimit(RateLimits.sensitive),
  async (ctx) => { /* invoice logic */ }
)
```

**Effort:** 🟢 Low (1 day)

---

## 🟠 High Priority Issues

### SEC-004: Sensitive Data in Logs

**The Crime:**

```typescript
// app/api/store/cart/route.ts (lines 51-55)
logger.error('Cart error', {
  userId: user.id,
  cartId: cart.id,
  items: cart.items,  // ⚠️ Full cart contents in logs
})
```

What else is being logged?
- User IDs ✅ (okay)
- Email addresses ❓
- Phone numbers ❓
- Pet medical data ❓
- Payment information ❓

**The Fix:**

Scrub sensitive data from logs:
```typescript
// lib/logger.ts
const SENSITIVE_FIELDS = ['password', 'email', 'phone', 'credit_card', 'ssn']

function scrubSensitiveData(data: Record<string, unknown>): Record<string, unknown> {
  const scrubbed = { ...data }
  for (const key of Object.keys(scrubbed)) {
    if (SENSITIVE_FIELDS.some(f => key.toLowerCase().includes(f))) {
      scrubbed[key] = '[REDACTED]'
    }
  }
  return scrubbed
}

export const logger = {
  error: (message: string, data?: Record<string, unknown>) => {
    console.error(message, scrubSensitiveData(data || {}))
  }
}
```

**Effort:** 🟢 Low

---

### SEC-005: Input Validation Gaps

**The Crime:**

Some routes validate input:
```typescript
// ✅ Good
const schema = z.object({
  name: z.string().min(1).max(100),
  species: z.enum(['dog', 'cat', 'bird', 'other']),
})
const body = schema.parse(await request.json())
```

Some routes trust blindly:
```typescript
// ❌ Bad
const body = await request.json()
await supabase.from('appointments').insert(body)  // Whatever the client sends
```

**The Risk:**
- Invalid data in database
- Potential injection attacks
- Application crashes on malformed input

**The Fix:**

Validate everything:
```typescript
// Every POST/PUT route needs a schema
const createAppointmentSchema = z.object({
  pet_id: z.string().uuid(),
  service_id: z.string().uuid(),
  start_time: z.string().datetime(),
  notes: z.string().max(1000).optional(),
})

// Validation wrapper
export function withValidation<T extends z.ZodSchema>(schema: T) {
  return async (request: NextRequest) => {
    const body = await request.json()
    const result = schema.safeParse(body)
    if (!result.success) {
      return apiError('VALIDATION_ERROR', 400, result.error.flatten())
    }
    return result.data
  }
}
```

**Effort:** 🟡 Medium

---

### SEC-006: QR Code Security

**The Crime:**

QR codes link to pet profiles. But:
- Is the QR code predictable?
- Can someone enumerate QR codes?
- What information is exposed to anonymous scanners?

```typescript
// What happens when an anonymous user scans a QR code?
// /api/pets/[id]/qr or /public/pet/[qr_code]

// If it shows:
// - Pet name: ✅ Okay
// - Owner name: ⚠️ PII
// - Owner phone: ❌ Definitely not
// - Medical history: ❌ HIPAA-adjacent
// - Home address: ❌ Security risk
```

**The Fix:**

Public QR view should be minimal:
```typescript
// Public endpoint for QR scanning
export async function GET(request, { params }) {
  const { data: pet } = await supabase
    .from('pets')
    .select('name, species, photo_url')  // ONLY public info
    .eq('qr_code', params.code)
    .single()

  // Owner contact requires authenticated claim
  return NextResponse.json({
    pet: { name: pet.name, species: pet.species, photo: pet.photo_url },
    claim_url: `/claim/${params.code}`,  // Owner must verify identity
  })
}
```

**Effort:** 🟡 Medium

---

### SEC-007: Session Security

**The Questions:**

1. Are sessions properly invalidated on logout?
2. Is there session timeout?
3. Can sessions be hijacked?
4. Are cookies properly secured?

**Check:**
```typescript
// Are cookies httpOnly?
// Are cookies secure in production?
// Is sameSite configured?

// Supabase client configuration
createServerClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    cookies: {
      get: (name) => cookieStore.get(name)?.value,
      set: (name, value, options) => {
        cookieStore.set(name, value, {
          ...options,
          httpOnly: true,      // ✅ Required
          secure: true,        // ✅ Required in production
          sameSite: 'lax',     // ✅ CSRF protection
        })
      }
    }
  }
)
```

**Effort:** 🟢 Low (verify existing config)

---

## 🟡 Medium Priority Issues

### SEC-008: Prescription Data Access

**The Concern:**

Prescriptions contain controlled substance information. Who can:
- Create prescriptions? (Only vets)
- View prescriptions? (Owner, vet, admin)
- Export/print prescriptions? (Authenticated users)
- Access prescription history? (Need audit trail)

**The Check:**

```sql
-- RLS policy should exist
CREATE POLICY "Prescriptions: vets create" ON prescriptions
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('vet', 'admin')
    AND tenant_id = prescriptions.tenant_id
  )
);

-- And audit logging should exist
CREATE TABLE prescription_access_log (
  id UUID PRIMARY KEY,
  prescription_id UUID REFERENCES prescriptions(id),
  accessed_by UUID REFERENCES profiles(id),
  action TEXT,  -- 'view', 'print', 'export'
  accessed_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Effort:** 🟡 Medium

---

### SEC-009: File Upload Security

**The Concern:**

Users can upload:
- Pet photos
- Prescription files
- Vaccine documents
- Consent signatures

**The Risks:**
- Malicious file uploads (executable code)
- File size DoS attacks
- Directory traversal
- Overwriting existing files

**The Checks:**

```typescript
// File upload validation
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
const MAX_SIZE = 10 * 1024 * 1024  // 10MB

function validateUpload(file: File): ValidationResult {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'Invalid file type' }
  }
  if (file.size > MAX_SIZE) {
    return { valid: false, error: 'File too large' }
  }
  // Scan for malicious content?
  return { valid: true }
}
```

**Effort:** 🟡 Medium

---

## 📊 Security Metrics

| Area | Status | Priority | Action |
|------|--------|----------|--------|
| Tenant isolation in queries | 🔴 Gaps | Critical | Audit all queries |
| RLS policy testing | 🔴 Untested | Critical | Add comprehensive tests |
| Rate limiting | 🔴 Incomplete | High | Add to sensitive endpoints |
| Input validation | 🟠 Partial | High | Validate all inputs |
| Log scrubbing | 🟠 Unknown | High | Audit and scrub |
| Session security | 🟡 Unknown | Medium | Verify config |
| File uploads | 🟡 Unknown | Medium | Audit validation |
| Prescription access | 🟡 Unknown | Medium | Verify RLS |

---

## Security Audit Checklist

### Immediate (This Week)

- [ ] Run `supabase get advisors --type security`
- [ ] Add rate limiting to `/api/auth/*` endpoints
- [ ] Add rate limiting to `/api/invoices/*` endpoints
- [ ] Audit logs for sensitive data exposure
- [ ] Verify all queries filter by `tenant_id`

### Short-term (This Sprint)

- [ ] Write RLS tests for all critical tables
- [ ] Validate all POST/PUT request bodies
- [ ] Review QR code public data exposure
- [ ] Audit file upload validation
- [ ] Add prescription access logging

### Ongoing

- [ ] Security review for every new feature
- [ ] Dependency vulnerability scanning (`npm audit`)
- [ ] Penetration testing (quarterly)
- [ ] Access log monitoring

---

## Security Resources

```bash
# Dependency vulnerabilities
npm audit
npm audit fix

# Supabase security
supabase get advisors --type security
supabase get advisors --type performance

# OWASP guidelines
# https://owasp.org/www-project-top-ten/
```

---

## Summary

The security foundations exist: RLS is enabled, authentication is implemented, role-based access is in place. But enforcement has gaps. Tenant isolation is checked at route level but not always at query level. Rate limiting protects the wrong endpoints. RLS policies may or may not work—nobody has tested them comprehensively.

This is a SaaS platform handling medical and payment data. Security isn't optional.

**Priority Actions:**
1. Run Supabase security audit (today)
2. Add rate limiting to auth endpoints (today)
3. Audit all queries for tenant_id filter (this week)
4. Write RLS tests for critical tables (this week)
5. Scrub sensitive data from logs (this week)

*"Security is a process, not a product. And your process has gaps."*

---

## Final Warning

The issues in this document are not theoretical. They are exploitable patterns that exist in your codebase right now. A determined attacker could:

1. Brute force admin login (no rate limit)
2. Access other tenants' data (if RLS has gaps)
3. Enumerate QR codes for pet data
4. Find sensitive data in logs

Fix the critical issues before they become incidents.
