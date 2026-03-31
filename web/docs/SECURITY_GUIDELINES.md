# Security Guidelines - Vete Platform

**Version**: 1.0  
**Last Updated**: January 2026  
**Status**: Active

This document outlines mandatory security practices for the Vete platform to prevent common vulnerabilities.

---

## Table of Contents

1. [Input Validation & Sanitization](#input-validation--sanitization)
2. [SQL Injection Prevention](#sql-injection-prevention)
3. [XSS Prevention](#xss-prevention)
4. [Authentication & Authorization](#authentication--authorization)
5. [Type Safety & Runtime Validation](#type-safety--runtime-validation)
6. [Security Checklist](#security-checklist)

---

## Input Validation & Sanitization

### Rule 1: Always Validate User Input

**MANDATORY for all API routes that accept user data.**

```typescript
import { z } from 'zod'

// ✅ CORRECT - Define validation schema
const createPetSchema = z.object({
  name: z.string().min(1).max(100),
  species: z.enum(['dog', 'cat', 'other']),
  weight_kg: z.number().positive().max(500),
  notes: z.string().max(5000).optional(),
})

export const POST = withApiAuth(async ({ request, profile, supabase }: ApiHandlerContext) => {
  const body = await request.json()

  // Validate before processing
  const validation = createPetSchema.safeParse(body)
  if (!validation.success) {
    return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
      details: validation.error.flatten(),
    })
  }

  const data = validation.data // Now type-safe and validated
  // ... proceed with database operations
})

// ❌ WRONG - Direct use without validation
export const POST = withApiAuth(async ({ request, profile, supabase }: ApiHandlerContext) => {
  const body = await request.json() // Unvalidated data
  await supabase.from('pets').insert(body) // Dangerous!
})
```

### Rule 2: Sanitize HTML Content

**Use DOMPurify for any user-generated HTML content.**

```typescript
import { sanitizeHtml, SANITIZE_PRESETS } from '@/lib/utils/sanitize'

// ✅ CORRECT - Sanitize before storing
export const POST = withApiAuth(async ({ request, profile, supabase }: ApiHandlerContext) => {
  const body = await request.json()

  // Sanitize HTML fields
  const sanitizedDescription = sanitizeHtml(body.description, 'richText')
  const sanitizedNotes = sanitizeHtml(body.notes, 'basicText')

  await supabase.from('products').insert({
    ...body,
    description: sanitizedDescription,
    notes: sanitizedNotes,
    tenant_id: profile.tenant_id,
  })
})

// ❌ WRONG - Store raw HTML
await supabase.from('products').insert({
  description: body.description, // Could contain XSS payload
})
```

#### Available Sanitization Presets

| Preset      | Use Case                          | Allowed Tags                                        |
| ----------- | --------------------------------- | --------------------------------------------------- |
| `richText`  | Product descriptions, blog posts  | p, br, strong, em, h1-h6, ul, ol, li, a, blockquote |
| `consent`   | Legal documents, terms of service | p, br, strong, em, h1-h6, ul, ol, li, table         |
| `basicText` | User comments, notes, messages    | p, br, strong, em (no links, no images)             |

**When to Sanitize**:

- ✅ On input (before storing in database)
- ✅ On output (before rendering with `dangerouslySetInnerHTML`)
- ✅ Always use the most restrictive preset appropriate for the context

---

## SQL Injection Prevention

### Rule 3: Always Use Parameterized Queries

**Supabase client automatically parameterizes queries. NEVER use string interpolation.**

```typescript
// ✅ CORRECT - Parameterized queries
const { data } = await supabase
  .from('pets')
  .select('*')
  .eq('id', petId) // Safe - parameterized
  .eq('tenant_id', tenantId) // Safe - parameterized

// ✅ CORRECT - Safe filters
await supabase.from('pets').select('*').ilike('name', `%${searchTerm}%`) // Safe - Supabase escapes

// ❌ WRONG - Raw SQL with interpolation (if using .rpc())
await supabase.rpc('custom_query', {
  query_string: `SELECT * FROM pets WHERE name = '${userInput}'`, // DANGEROUS!
})

// ✅ CORRECT - Use parameters with RPC functions
await supabase.rpc('search_pets', {
  search_name: userInput, // Safe - passed as parameter
  tenant: tenantId,
})
```

### Rule 4: Use PostgreSQL Functions for Complex Operations

**For transactions and complex logic, use atomic PostgreSQL functions.**

```sql
-- ✅ CORRECT - Parameterized PostgreSQL function
CREATE OR REPLACE FUNCTION adjust_inventory_atomic(
  p_tenant_id TEXT,
  p_product_id UUID,
  p_new_quantity INTEGER,
  p_reason TEXT,
  p_notes TEXT,
  p_performed_by UUID
) RETURNS JSONB AS $$
DECLARE
  v_old_stock INTEGER;
  v_difference INTEGER;
BEGIN
  -- All parameters are safely bound
  SELECT stock_quantity INTO v_old_stock
  FROM inventory
  WHERE product_id = p_product_id
    AND tenant_id = p_tenant_id
  FOR UPDATE; -- Row-level locking

  -- ... transaction logic
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Call from API**:

```typescript
const { data, error } = await supabase.rpc('adjust_inventory_atomic', {
  p_tenant_id: profile.tenant_id,
  p_product_id: productId,
  p_new_quantity: newQuantity,
  p_reason: reason,
  p_notes: notes,
  p_performed_by: user.id,
})
```

---

## XSS Prevention

### Rule 5: Never Use `dangerouslySetInnerHTML` Without Sanitization

```typescript
import { createSanitizedHtml } from '@/lib/utils/sanitize';

// ✅ CORRECT - Sanitized HTML
<div dangerouslySetInnerHTML={createSanitizedHtml(product.description, 'richText')} />

// ❌ WRONG - Raw HTML
<div dangerouslySetInnerHTML={{ __html: product.description }} />

// ✅ BETTER - Avoid dangerouslySetInnerHTML if possible
<Markdown content={product.description} /> {/* Use a safe Markdown renderer */}
```

### Rule 6: Content Security Policy (CSP)

**Already configured in `next.config.js`**. Do not weaken these settings.

```javascript
// web/next.config.js
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://*.supabase.co;
`
```

**What This Prevents**:

- Inline script injection
- Unauthorized external resource loading
- Clickjacking attacks

---

## Authentication & Authorization

### Rule 7: Use `withApiAuth` Middleware for All Protected Routes

**See `docs/API_AUTH_MIDDLEWARE.md` for complete guide.**

```typescript
// ✅ CORRECT - Middleware handles auth
export const GET = withApiAuth(
  async ({ profile, supabase }: ApiHandlerContext) => {
    // Auth already validated, profile available
    const { data } = await supabase.from('pets').select('*').eq('tenant_id', profile.tenant_id) // Tenant isolation enforced

    return NextResponse.json(data)
  },
  { roles: ['vet', 'admin'] } // Role-based access control
)

// ❌ WRONG - Manual auth (prone to mistakes)
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  // ... 30 lines of boilerplate auth code
}
```

### Rule 8: Enforce Tenant Isolation

**EVERY database query MUST filter by `tenant_id`.**

```typescript
// ✅ CORRECT - Tenant filter applied
const { data } = await supabase.from('pets').select('*').eq('tenant_id', profile.tenant_id) // REQUIRED

// ❌ WRONG - Missing tenant filter (data leak!)
const { data } = await supabase.from('pets').select('*') // Returns data from ALL tenants!
```

### Rule 9: Row-Level Security (RLS)

**All tables MUST have RLS enabled.**

```sql
-- Enable RLS on table
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Staff can manage pets in their tenant" ON pets
  FOR ALL
  USING (is_staff_of(tenant_id));

CREATE POLICY "Owners can view own pets" ON pets
  FOR SELECT
  USING (
    tenant_id = current_setting('app.current_tenant')::TEXT
    AND owner_id = auth.uid()
  );
```

**Verify RLS is enabled**:

```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false;
-- Should return 0 rows!
```

---

## Type Safety & Runtime Validation

### Rule 10: Use Type Guards for Runtime Validation

**Import from `@/lib/utils/type-guards`**

```typescript
import {
  isDefined,
  isNonEmptyString,
  isValidNumber,
  isPlainObject,
  assertDefined,
} from '@/lib/utils/type-guards'

// ✅ CORRECT - Type-safe filtering
const validPets = pets.filter(isDefined) // Type: Pet[] (no undefined)

// ✅ CORRECT - Runtime type checking
if (isPlainObject(body) && isNonEmptyString(body.name)) {
  // TypeScript now knows body.name is a non-empty string
  await createPet(body.name)
}

// ✅ CORRECT - Assertions with clear error messages
assertDefined(user, 'User must be authenticated')
// TypeScript now knows user is not null/undefined

// ❌ WRONG - Unsafe type casting
const pet = data as Pet // Bypasses type checking
const name = (body as any).name // No validation!
```

### Rule 11: Validate External API Responses

```typescript
import { z } from 'zod'

const twilioResponseSchema = z.object({
  sid: z.string(),
  status: z.enum(['queued', 'sent', 'delivered', 'failed']),
  error_code: z.number().optional(),
})

// ✅ CORRECT - Validate external responses
const response = await fetch('https://api.twilio.com/...')
const json = await response.json()

const validation = twilioResponseSchema.safeParse(json)
if (!validation.success) {
  log.error('Invalid Twilio response', { error: validation.error })
  return apiError('EXTERNAL_SERVICE_ERROR', HTTP_STATUS.BAD_GATEWAY)
}

const twilioData = validation.data // Type-safe

// ❌ WRONG - Trust external APIs
const twilioData = await response.json() // Unvalidated
await processStatus(twilioData.status) // Could crash if malformed
```

---

## Security Checklist

### For Every New API Route

- [ ] Uses `withApiAuth` middleware (not manual auth)
- [ ] Has role-based access control if needed (`{ roles: [...] }`)
- [ ] Validates request body with Zod schema
- [ ] Sanitizes HTML/rich text fields with `sanitizeHtml()`
- [ ] Filters by `tenant_id` in ALL database queries
- [ ] Uses parameterized queries (never string interpolation)
- [ ] Returns Spanish error messages from `ERROR_MESSAGES`
- [ ] Logs errors with context using `log.error()`
- [ ] Has corresponding tests in `tests/api/`

### For Every New Database Table

- [ ] Has `tenant_id` column (TEXT NOT NULL)
- [ ] Has RLS enabled: `ALTER TABLE x ENABLE ROW LEVEL SECURITY`
- [ ] Has RLS policies created (staff, owner, admin)
- [ ] Uses `is_staff_of(tenant_id)` helper in policies
- [ ] Has foreign key to `tenants(id)` table
- [ ] Has created_at, updated_at timestamps
- [ ] Migration file includes both table AND policies

### For Every Component Using `dangerouslySetInnerHTML`

- [ ] Content is sanitized with `sanitizeHtml()` or `createSanitizedHtml()`
- [ ] Uses appropriate preset (`richText`, `consent`, or `basicText`)
- [ ] Documented why HTML is necessary (can't use Markdown?)
- [ ] Reviewed by security-conscious team member

---

## Common Vulnerabilities to Avoid

### 1. Mass Assignment

```typescript
// ❌ WRONG - Allows users to set any field
await supabase.from('users').insert(request.body)

// ✅ CORRECT - Explicit field mapping
const { name, email } = validateUserInput(request.body)
await supabase.from('users').insert({ name, email, tenant_id: profile.tenant_id })
```

### 2. Insecure Direct Object References (IDOR)

```typescript
// ❌ WRONG - No ownership check
const { id } = params
await supabase.from('pets').delete().eq('id', id)

// ✅ CORRECT - Verify ownership
const { id } = params
await supabase
  .from('pets')
  .delete()
  .eq('id', id)
  .eq('tenant_id', profile.tenant_id) // Ensure same tenant
  .eq('owner_id', user.id) // Ensure owner
```

### 3. Information Disclosure

```typescript
// ❌ WRONG - Expose internal errors
return apiError('DATABASE_ERROR', 500, {
  details: { rawError: error.message }, // Exposes DB structure!
})

// ✅ CORRECT - Generic error to user, detailed log internally
log.error('Database error', { error, query, userId })
return apiError('DATABASE_ERROR', 500, {
  details: { message: DATABASE_ERRORS.QUERY_FAILED },
})
```

---

## Testing Security

### Run Security Tests

```bash
npm run test:security  # When created
npm run test:api       # Includes auth tests
```

### Manual Security Audit

```bash
# Find routes without tenant_id filter
grep -r "\.from(" app/api --include="*.ts" | grep -v "tenant_id"

# Find raw SQL usage
grep -r "\.rpc(" app/api --include="*.ts"

# Find dangerouslySetInnerHTML without sanitization
grep -r "dangerouslySetInnerHTML" app components --include="*.tsx" -A1 | grep -v "sanitize"
```

---

## Reporting Security Issues

**DO NOT** create public GitHub issues for security vulnerabilities.

**Contact**: [Add security contact email]  
**PGP Key**: [Add if available]  
**Response Time**: Within 48 hours

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy)
- [DOMPurify Documentation](https://github.com/cure53/DOMPurify)

---

**Last Review**: January 2026  
**Next Review**: Quarterly
