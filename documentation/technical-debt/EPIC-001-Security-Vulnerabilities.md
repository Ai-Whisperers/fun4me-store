# EPIC-001: Security Vulnerabilities & Authentication

**Status**: Not Started  
**Priority**: CRITICAL  
**Estimated Effort**: 3-5 days  
**Risk Level**: HIGH  
**Dependencies**: None (must be done first)

## Overview

This epic addresses critical security vulnerabilities discovered in the authentication system and tenant isolation mechanisms. These issues pose immediate risks to data security and multi-tenant isolation.

## Business Impact

- **Risk**: Cross-tenant data leakage
- **Impact**: GDPR violations, loss of trust, potential legal liability
- **Urgency**: Must be fixed before any production deployment

## Technical Context

The Vete platform uses:
- Supabase Auth for authentication
- Row-Level Security (RLS) for database isolation
- Application-level tenant filtering as additional protection

Current issues bypass these protections through:
1. Hardcoded mock user IDs
2. Missing tenant filters in queries
3. Inconsistent authentication patterns

---

## Tickets

### TICKET-SEC-001: Replace Mock Authentication in User Preferences API

**Priority**: CRITICAL  
**Effort**: 1 hour  
**Type**: Bug Fix  
**Component**: API Routes

#### Problem Statement

The `/api/user/preferences` route uses a hardcoded mock user ID instead of real authentication, allowing any user to access/modify preferences.

#### Current Code
```typescript
// web/app/api/user/preferences/route.ts
function getAuthenticatedUserId(): string {
  return 'mock-user-123'  // ❌ HARDCODED
}

export async function GET(request: Request) {
  const userId = getAuthenticatedUserId()
  const userPref = await getReminderPreference(userId)
  return NextResponse.json(userPref, { status: 200 })
}
```

#### Root Cause
- Left over from development/testing
- No proper Supabase auth integration
- No tenant validation

#### Solution

Replace mock function with proper Supabase authentication:

```typescript
// web/app/api/user/preferences/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'

export async function GET(request: Request) {
  const supabase = await createClient()
  
  // 1. Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return apiError('UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED)
  }
  
  // 2. Get user's tenant context
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()
    
  if (!profile) {
    return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
  }
  
  // 3. Get preferences with tenant isolation
  const userPref = await getReminderPreference(user.id, profile.tenant_id)
  return NextResponse.json(userPref, { status: 200 })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return apiError('UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED)
  }
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()
    
  if (!profile) {
    return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
  }
  
  const body = await request.json()
  await setUserReminderPreference(user.id, profile.tenant_id, body)
  
  return NextResponse.json({ success: true, preferences: body })
}
```

#### Acceptance Criteria

- [ ] `getAuthenticatedUserId()` function removed
- [ ] GET handler uses `supabase.auth.getUser()`
- [ ] POST handler uses `supabase.auth.getUser()`
- [ ] Profile tenant_id is retrieved and validated
- [ ] Returns 401 if not authenticated
- [ ] Returns 403 if no profile exists
- [ ] Preferences are scoped to authenticated user + tenant
- [ ] Unit tests added for auth failure scenarios
- [ ] Integration tests verify tenant isolation

#### Testing Plan

```typescript
// web/tests/api/user/preferences.test.ts
describe('GET /api/user/preferences', () => {
  it('returns 401 when not authenticated', async () => {
    const response = await fetch('/api/user/preferences')
    expect(response.status).toBe(401)
  })
  
  it('returns preferences for authenticated user', async () => {
    const { token } = await createTestUser()
    const response = await fetch('/api/user/preferences', {
      headers: { Authorization: `Bearer ${token}` }
    })
    expect(response.status).toBe(200)
  })
  
  it('isolates preferences by tenant', async () => {
    const user1 = await createTestUser({ tenant: 'adris' })
    const user2 = await createTestUser({ tenant: 'petlife' })
    
    await setPreferences(user1.id, { theme: 'dark' })
    
    const response = await fetch('/api/user/preferences', {
      headers: { Authorization: `Bearer ${user2.token}` }
    })
    const data = await response.json()
    expect(data.theme).toBeUndefined() // Should not see user1's prefs
  })
})
```

#### Files to Modify
- `web/app/api/user/preferences/route.ts`
- `web/lib/user-preferences.ts` (update signatures to include tenant_id)
- `web/tests/api/user/preferences.test.ts` (create new)

#### Rollback Plan
If issues arise:
1. Temporarily disable endpoint (return 503)
2. Restore previous version from git
3. Add feature flag to gradually roll out

---

### TICKET-SEC-002: Add Tenant Isolation to Lost Pets API

**Priority**: CRITICAL  
**Effort**: 2 hours  
**Type**: Security Bug  
**Component**: API Routes

#### Problem Statement

The `/api/lost-pets` GET endpoint fetches ALL lost pet reports across ALL tenants without filtering by tenant_id, causing a data leakage vulnerability.

#### Current Code
```typescript
// web/app/api/lost-pets/route.ts
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  
  // ❌ NO TENANT FILTERING!
  const { data, error } = await supabase
    .from('lost_pet_reports')
    .select('*')
    .order('created_at', { ascending: false })
    
  return NextResponse.json({ data })
}
```

#### Root Cause Analysis

1. **Design Issue**: Route was designed without multi-tenancy in mind
2. **Missing RLS**: Table might not have proper RLS policy
3. **No Code Review**: Passed through without security audit

#### Impact Assessment

| Severity | Description |
|----------|-------------|
| Data Exposure | Lost pet reports from all clinics visible to any authenticated user |
| GDPR Violation | Personal data (owner contact info) exposed across tenants |
| Reputation Risk | If discovered, severe loss of trust |
| Legal Liability | Breach of data protection agreements |

#### Solution

**Step 1: Add Application-Level Filtering**

```typescript
// web/app/api/lost-pets/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { apiError, HTTP_STATUS } from '@/lib/api/errors'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  
  // 1. Authenticate
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return apiError('UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED)
  }
  
  // 2. Get tenant context
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()
    
  if (!profile) {
    return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
  }
  
  // 3. Get search params
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
  
  // 4. Query WITH tenant isolation
  let query = supabase
    .from('lost_pet_reports')
    .select('*')
    .eq('tenant_id', profile.tenant_id)  // ✅ TENANT FILTER
    .order('created_at', { ascending: false })
    .limit(limit)
    
  if (status) {
    query = query.eq('status', status)
  }
  
  const { data, error } = await query
  
  if (error) {
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
  
  return NextResponse.json({ data: data || [] })
}
```

**Step 2: Verify RLS Policy Exists**

```sql
-- web/db/migrations/069_fix_lost_pets_rls.sql

-- Enable RLS if not already enabled
ALTER TABLE lost_pet_reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Staff manage lost pet reports" ON lost_pet_reports;
DROP POLICY IF EXISTS "Public view active reports" ON lost_pet_reports;

-- Policy 1: Staff can manage all reports in their tenant
CREATE POLICY "Staff manage lost pet reports" 
ON lost_pet_reports
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tenant_id = lost_pet_reports.tenant_id
    AND profiles.role IN ('vet', 'admin')
  )
);

-- Policy 2: Pet owners can view reports in their tenant
CREATE POLICY "Owners view reports in tenant" 
ON lost_pet_reports
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tenant_id = lost_pet_reports.tenant_id
  )
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_lost_pet_reports_tenant_status 
ON lost_pet_reports(tenant_id, status, created_at DESC);
```

**Step 3: Fix PATCH and POST Handlers**

```typescript
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return apiError('UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED)
  }
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()
    
  if (!profile) {
    return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
  }
  
  const body = await request.json()
  
  // Validate with Zod
  const schema = z.object({
    pet_id: z.string().uuid(),
    status: z.enum(['lost', 'found', 'reunited']),
    last_seen_location: z.string().min(1),
    last_seen_date: z.string().datetime(),
    description: z.string().optional(),
    photo_url: z.string().url().optional(),
  })
  
  const validation = schema.safeParse(body)
  if (!validation.success) {
    return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
      field_errors: validation.error.flatten().fieldErrors
    })
  }
  
  // Verify pet belongs to this tenant
  const { data: pet } = await supabase
    .from('pets')
    .select('tenant_id')
    .eq('id', validation.data.pet_id)
    .single()
    
  if (!pet || pet.tenant_id !== profile.tenant_id) {
    return apiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN, {
      details: { message: 'Pet not found in your clinic' }
    })
  }
  
  // Create report with tenant_id
  const { data, error } = await supabase
    .from('lost_pet_reports')
    .insert({
      ...validation.data,
      tenant_id: profile.tenant_id,
      reported_by: user.id,
    })
    .select()
    .single()
    
  if (error) {
    return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
  
  return NextResponse.json({ data }, { status: 201 })
}
```

#### Acceptance Criteria

- [ ] GET handler authenticates user
- [ ] GET handler filters by tenant_id
- [ ] POST handler validates tenant ownership of pet
- [ ] PATCH handler validates tenant ownership of report
- [ ] RLS policies created for lost_pet_reports table
- [ ] Database index added for performance
- [ ] Zod validation schema added for POST/PATCH
- [ ] Unit tests for tenant isolation
- [ ] Integration tests verify cross-tenant protection
- [ ] Security audit passes

#### Testing Plan

```typescript
// web/tests/security/tenant-isolation.test.ts
describe('Lost Pets API - Tenant Isolation', () => {
  let adrisUser: TestUser
  let petlifeUser: TestUser
  let adrisPet: Pet
  let adrisReport: LostPetReport
  
  beforeEach(async () => {
    adrisUser = await createTestUser({ tenant: 'adris', role: 'owner' })
    petlifeUser = await createTestUser({ tenant: 'petlife', role: 'owner' })
    
    adrisPet = await createTestPet({ 
      owner: adrisUser,
      tenant: 'adris'
    })
    
    adrisReport = await createLostPetReport({
      pet: adrisPet,
      tenant: 'adris'
    })
  })
  
  it('prevents cross-tenant report access', async () => {
    // Petlife user tries to access Adris report
    const response = await fetch('/api/lost-pets', {
      headers: { Authorization: `Bearer ${petlifeUser.token}` }
    })
    
    const { data } = await response.json()
    
    // Should not see Adris report
    expect(data.find(r => r.id === adrisReport.id)).toBeUndefined()
  })
  
  it('prevents creating report for pet in different tenant', async () => {
    const response = await fetch('/api/lost-pets', {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${petlifeUser.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        pet_id: adrisPet.id,  // Adris pet
        status: 'lost',
        last_seen_location: 'Central Park',
        last_seen_date: new Date().toISOString(),
      })
    })
    
    expect(response.status).toBe(403)
  })
  
  it('RLS prevents direct database access', async () => {
    // Attempt direct Supabase query bypassing API
    const supabase = createTestClient(petlifeUser.token)
    
    const { data } = await supabase
      .from('lost_pet_reports')
      .select('*')
    
    // RLS should filter out Adris reports
    expect(data?.find(r => r.tenant_id === 'adris')).toBeUndefined()
  })
})
```

#### Files to Modify
- `web/app/api/lost-pets/route.ts`
- `web/db/migrations/069_fix_lost_pets_rls.sql` (create new)
- `web/tests/security/tenant-isolation.test.ts` (create new)

#### Migration Checklist
- [ ] Create migration file `069_fix_lost_pets_rls.sql`
- [ ] Test migration on local database
- [ ] Verify existing data not affected
- [ ] Run migration on staging
- [ ] Verify API still works with new RLS
- [ ] Deploy code changes
- [ ] Run migration on production
- [ ] Monitor for errors

---

### TICKET-SEC-003: Audit All API Routes for Tenant Isolation

**Priority**: HIGH  
**Effort**: 1 day  
**Type**: Security Audit  
**Component**: API Routes

#### Problem Statement

After discovering missing tenant isolation in lost-pets route, we need systematic audit of all 256 API routes to ensure consistent tenant filtering.

#### Scope

Audit all routes in:
- `web/app/api/` (256 route files)
- Check for `.eq('tenant_id', ...)` in queries
- Verify authentication checks
- Ensure RLS policies exist

#### Audit Methodology

**Step 1: Automated Detection Script**

```typescript
// scripts/audit-tenant-isolation.ts
import { glob } from 'glob'
import { readFileSync } from 'fs'
import { parse } from '@typescript-eslint/parser'

interface AuditResult {
  file: string
  hasAuth: boolean
  hasTenantFilter: boolean
  queries: string[]
  risk: 'high' | 'medium' | 'low'
}

async function auditTenantIsolation() {
  const routeFiles = await glob('web/app/api/**/*.ts')
  const results: AuditResult[] = []
  
  for (const file of routeFiles) {
    const content = readFileSync(file, 'utf-8')
    
    const hasAuth = 
      content.includes('withApiAuth') ||
      content.includes('supabase.auth.getUser()')
    
    const hasTenantFilter = 
      content.includes('.eq(\'tenant_id\'') ||
      content.includes('.eq("tenant_id"')
    
    const queries = extractSupabaseQueries(content)
    
    let risk: 'high' | 'medium' | 'low' = 'low'
    
    if (!hasAuth && queries.length > 0) {
      risk = 'high'
    } else if (hasAuth && !hasTenantFilter && queries.length > 0) {
      risk = 'medium'
    }
    
    results.push({ file, hasAuth, hasTenantFilter, queries, risk })
  }
  
  return results
}

function extractSupabaseQueries(content: string): string[] {
  const queryPattern = /\.from\(['"](\w+)['"]\)/g
  const matches = content.matchAll(queryPattern)
  return Array.from(matches, m => m[1])
}

// Generate report
const results = await auditTenantIsolation()

const highRisk = results.filter(r => r.risk === 'high')
const mediumRisk = results.filter(r => r.risk === 'medium')

console.log(`\n🔴 HIGH RISK (${highRisk.length}):\n`)
highRisk.forEach(r => {
  console.log(`  ${r.file}`)
  console.log(`    - No auth, queries: ${r.queries.join(', ')}`)
})

console.log(`\n🟡 MEDIUM RISK (${mediumRisk.length}):\n`)
mediumRisk.forEach(r => {
  console.log(`  ${r.file}`)
  console.log(`    - Has auth, no tenant filter, queries: ${r.queries.join(', ')}`)
})

// Export to CSV
const csv = results.map(r => 
  `${r.file},${r.hasAuth},${r.hasTenantFilter},${r.risk},${r.queries.join(';')}`
).join('\n')

writeFileSync('audit-results.csv', csv)
```

**Step 2: Manual Review Checklist**

For each flagged route, verify:

- [ ] Is authentication required? (not all routes need auth)
- [ ] If authenticated, is tenant_id filtered?
- [ ] Does RLS policy exist for queried tables?
- [ ] Are foreign keys validated for tenant ownership?
- [ ] Is rate limiting applied?

**Step 3: Prioritization Matrix**

| Risk | Auth | Tenant Filter | Action |
|------|------|---------------|--------|
| 🔴 High | ❌ No | ❌ No | Fix immediately |
| 🟡 Medium | ✅ Yes | ❌ No | Add filter |
| 🟢 Low | ✅ Yes | ✅ Yes | Review only |
| ⚪ None | N/A | N/A | Intentionally public |

#### Deliverables

1. **Audit Report** (`documentation/security/tenant-isolation-audit.md`)
   - List of all routes
   - Risk classification
   - Recommended actions

2. **Fix Tickets** (create one ticket per high/medium risk route)
   - TICKET-SEC-004: Fix route X
   - TICKET-SEC-005: Fix route Y
   - etc.

3. **Prevention Guide** (`documentation/security/tenant-isolation-guide.md`)
   - Code patterns to follow
   - Anti-patterns to avoid
   - Review checklist

#### Acceptance Criteria

- [ ] Audit script runs successfully
- [ ] All 256 routes categorized by risk
- [ ] High risk routes have fix tickets created
- [ ] Medium risk routes have review tickets created
- [ ] Audit report published
- [ ] Prevention guide written
- [ ] Team trained on patterns

#### Timeline

- Day 1: Run automated audit, categorize results
- Day 2: Manual review of flagged routes
- Day 3: Create fix tickets and documentation

---

### TICKET-SEC-004: Standardize Authentication Pattern Across All Routes

**Priority**: MEDIUM  
**Effort**: 3 hours  
**Type**: Refactoring  
**Component**: API Routes

#### Problem Statement

Three routes use manual authentication instead of the standardized `withApiAuth` wrapper:
- `web/app/api/ambassador/route.ts`
- `web/app/api/gdpr/route.ts`
- `web/app/api/signup/route.ts`

This creates inconsistency and increases maintenance burden.

#### Current Inconsistency

```typescript
// ❌ Manual auth (ambassador/route.ts)
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  // ... rest of logic
}

// ✅ Standard pattern (most routes)
export const POST = withApiAuth(
  async ({ profile, supabase, request }: ApiHandlerContext) => {
    // Logic here - auth already handled
  },
  { roles: ['admin'] }
)
```

#### Solution

Migrate each route to use `withApiAuth`:

**Before:**
```typescript
// web/app/api/ambassador/route.ts
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  // Manual auth
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  
  // Manual body parsing
  const body = await request.json()
  const { email, full_name, phone, type } = body
  
  // Manual validation
  if (!email || !full_name) {
    return NextResponse.json({ error: 'Campos requeridos' }, { status: 400 })
  }
  
  // Business logic...
}
```

**After:**
```typescript
// web/app/api/ambassador/route.ts
import { withApiAuth, type ApiHandlerContext } from '@/lib/auth/api-wrapper'
import { apiError, apiSuccess, HTTP_STATUS } from '@/lib/api/errors'
import { z } from 'zod'

const createAmbassadorSchema = z.object({
  email: z.string().email('Email inválido'),
  full_name: z.string().min(2, 'Nombre requerido'),
  phone: z.string().optional(),
  type: z.enum(['student', 'teacher', 'assistant']),
  university: z.string().optional(),
  institution: z.string().optional(),
})

export const POST = withApiAuth(
  async ({ profile, supabase, request }: ApiHandlerContext) => {
    // Parse and validate body
    const body = await request.json()
    const validation = createAmbassadorSchema.safeParse(body)
    
    if (!validation.success) {
      return apiError('VALIDATION_ERROR', HTTP_STATUS.BAD_REQUEST, {
        field_errors: validation.error.flatten().fieldErrors
      })
    }
    
    const data = validation.data
    
    // Check for duplicates
    const { data: existing } = await supabase
      .from('ambassadors')
      .select('id')
      .eq('email', data.email)
      .single()
      
    if (existing) {
      return apiError('CONFLICT', HTTP_STATUS.CONFLICT, {
        details: { message: 'Email ya registrado' }
      })
    }
    
    // Generate referral code
    const referralCode = `AMB-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
    
    // Create ambassador
    const { data: ambassador, error } = await supabase
      .from('ambassadors')
      .insert({
        email: data.email,
        full_name: data.full_name,
        phone: data.phone,
        type: data.type,
        university: data.university,
        institution: data.institution,
        referral_code: referralCode,
        status: 'pending',
        tier: 'embajador',
      })
      .select()
      .single()
      
    if (error) {
      return apiError('DATABASE_ERROR', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }
    
    return apiSuccess(ambassador, 'Registro exitoso', HTTP_STATUS.CREATED)
  },
  { 
    roles: [], // Public endpoint
    rateLimit: 'write' // Prevent spam
  }
)
```

#### Benefits

1. **Consistent Error Handling**: All routes return same error format
2. **Built-in Rate Limiting**: Automatic protection
3. **Standardized Logging**: Centralized audit trail
4. **Type Safety**: Context has proper types
5. **Maintainability**: Single place to update auth logic

#### Migration Checklist

For each route:

- [ ] Import `withApiAuth` and types
- [ ] Create Zod schema for request body
- [ ] Move handler logic into callback
- [ ] Replace manual error returns with `apiError`/`apiSuccess`
- [ ] Add role restrictions if needed
- [ ] Add rate limiting if needed
- [ ] Test authentication failure cases
- [ ] Test validation failure cases
- [ ] Update any integration tests

#### Acceptance Criteria

- [ ] `ambassador/route.ts` migrated
- [ ] `gdpr/route.ts` migrated
- [ ] `signup/route.ts` reviewed (might be intentionally different)
- [ ] All routes use standardized error format
- [ ] No manual `supabase.auth.getUser()` calls in these files
- [ ] Tests updated and passing
- [ ] Documentation updated

---

### TICKET-SEC-005: Implement Rate Limiting on All Mutation Endpoints

**Priority**: MEDIUM  
**Effort**: 4 hours  
**Type**: Enhancement  
**Component**: API Routes

#### Problem Statement

Only ~40% of mutation endpoints (POST, PUT, PATCH, DELETE) have rate limiting applied, leaving the platform vulnerable to:
- Brute force attacks
- API abuse
- Resource exhaustion
- DDoS attempts

#### Current Coverage

```
Routes WITH rate limiting: ~30 of 100+ mutations
Routes WITHOUT rate limiting: ~70 endpoints
```

#### Solution

**Phase 1: Audit and Categorize**

Create inventory of all mutation endpoints:

```typescript
// scripts/audit-rate-limits.ts
interface MutationEndpoint {
  path: string
  method: string
  hasRateLimit: boolean
  risk: 'critical' | 'high' | 'medium' | 'low'
}

const CRITICAL_ENDPOINTS = [
  '/api/auth/*',
  '/api/billing/*',
  '/api/ambassador/register',
]

const HIGH_RISK_ENDPOINTS = [
  '/api/pets',
  '/api/appointments',
  '/api/invoices',
]

async function auditRateLimits() {
  const routes = await glob('web/app/api/**/*.ts')
  
  const mutations = routes
    .map(file => {
      const content = readFileSync(file, 'utf-8')
      return {
        path: file.replace('web/app/api', '/api').replace('/route.ts', ''),
        hasPOST: content.includes('export async function POST'),
        hasPUT: content.includes('export async function PUT'),
        hasPATCH: content.includes('export async function PATCH'),
        hasDELETE: content.includes('export async function DELETE'),
        hasRateLimit: 
          content.includes('rateLimit:') ||
          content.includes('rateLimit('),
      }
    })
    .filter(r => r.hasPOST || r.hasPUT || r.hasPATCH || r.hasDELETE)
    
  // Categorize by risk
  const categorized = mutations.map(m => ({
    ...m,
    risk: CRITICAL_ENDPOINTS.some(p => m.path.startsWith(p)) ? 'critical'
      : HIGH_RISK_ENDPOINTS.some(p => m.path.startsWith(p)) ? 'high'
      : 'medium'
  }))
  
  return categorized
}
```

**Phase 2: Apply Rate Limiting**

For routes using `withApiAuth`:
```typescript
export const POST = withApiAuth(
  async (ctx) => {
    // Handler logic
  },
  { 
    roles: ['admin'],
    rateLimit: 'write' // ✅ Add this
  }
)
```

For routes NOT using `withApiAuth`:
```typescript
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await rateLimit(request, 'write', 'route-name')
  if (!rateLimitResult.success) {
    return rateLimitResult.response
  }
  
  // Rest of handler...
}
```

**Phase 3: Configure Limits**

```typescript
// web/lib/rate-limit/config.ts
export const RATE_LIMITS = {
  // Authentication - strict
  auth: {
    requests: 5,
    window: '15m',
  },
  
  // Mutations - moderate
  write: {
    requests: 30,
    window: '1m',
  },
  
  // Reads - generous
  read: {
    requests: 100,
    window: '1m',
  },
  
  // Search - prevent scraping
  search: {
    requests: 30,
    window: '1m',
  },
  
  // Billing - very strict
  billing: {
    requests: 10,
    window: '5m',
  },
} as const
```

#### Prioritization

| Priority | Endpoints | Limit Type |
|----------|-----------|------------|
| P0 (Critical) | Auth, billing, ambassador | `auth` (5/15min) |
| P1 (High) | Appointments, pets, invoices | `write` (30/min) |
| P2 (Medium) | All other mutations | `write` (30/min) |

#### Acceptance Criteria

- [ ] Audit script identifies all mutations
- [ ] All critical endpoints have rate limiting
- [ ] All high-risk endpoints have rate limiting
- [ ] Medium-risk endpoints have rate limiting
- [ ] Rate limit configuration documented
- [ ] Tests verify rate limiting works
- [ ] Monitoring alerts on rate limit violations

#### Testing

```typescript
// web/tests/api/rate-limiting.test.ts
describe('Rate Limiting', () => {
  it('blocks excessive requests to write endpoints', async () => {
    const token = await createTestToken()
    
    // Make 31 requests (limit is 30/min)
    const requests = Array(31).fill(null).map(() =>
      fetch('/api/pets', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: 'Test' })
      })
    )
    
    const responses = await Promise.all(requests)
    const statuses = responses.map(r => r.status)
    
    // Last request should be rate limited
    expect(statuses[30]).toBe(429)
  })
  
  it('resets rate limit after window expires', async () => {
    // ... test time-based reset
  })
})
```

---

## Success Metrics

- [ ] All critical security vulnerabilities patched
- [ ] Zero cross-tenant data leaks in testing
- [ ] 100% of mutation endpoints rate limited
- [ ] Security audit passes
- [ ] Automated security tests in CI/CD

## Rollout Plan

1. **Week 1**: Fix TICKET-SEC-001 and TICKET-SEC-002
2. **Week 1-2**: Complete TICKET-SEC-003 audit
3. **Week 2**: Migrate routes in TICKET-SEC-004
4. **Week 3**: Apply rate limiting in TICKET-SEC-005
5. **Week 3**: Final security audit and penetration testing

## Dependencies

- None (this is the foundation for all other work)

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking existing functionality | Comprehensive test suite before deployment |
| Performance impact of rate limiting | Use Redis for fast lookups |
| Missing edge cases in audit | Manual review + automated tools |

