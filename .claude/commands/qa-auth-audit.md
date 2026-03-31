# Auth Security Test Audit

Audit all API routes in `app/api/` for authorization testing.

## Scan All Routes

1. Find all route handlers: `grep -r "export async function" web/app/api/`
2. List every handler (GET, POST, PUT, DELETE, PATCH)
3. Map to corresponding test files in `tests/integration/`

## Check Auth Test Coverage

For each route, verify tests exist for:
- [ ] Unauthenticated rejection (401)
- [ ] Owner role rejection for staff-only routes (403)
- [ ] Vet role access where allowed
- [ ] Admin role access where allowed
- [ ] Missing profile rejection (403)
- [ ] Tenant isolation (can't access other tenant's data)

## Priority Routes

Focus on these critical routes first:
1. **Payments**: `/api/invoices/[id]/payments`, `/api/invoices/[id]/refund`
2. **Medical**: `/api/medical-records`, `/api/prescriptions`
3. **Admin**: `/api/admin/*`
4. **Hospitalization**: `/api/hospitalizations/[id]/discharge`

## Generate Missing Tests

For routes without auth tests, generate using:

```typescript
import { testStaffOnlyEndpoint, testAdminOnlyEndpoint } from '@/lib/test-utils'

// Staff only (vet + admin)
testStaffOnlyEndpoint(POST, createRequest, 'Resource Name', createContext)

// Admin only
testAdminOnlyEndpoint(DELETE, createRequest, 'Delete Resource', createContext)
```

## Output

Create a checklist: `docs/testing/AUTH-AUDIT.md` with ✅/❌ status per route.
