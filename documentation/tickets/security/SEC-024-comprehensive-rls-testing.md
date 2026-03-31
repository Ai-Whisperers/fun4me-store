# SEC-024: Comprehensive RLS Policy Testing

## Summary

**Priority**: P0 - Critical  
**Effort**: 16-20 hours  
**Epic**: [EPIC-02: Security Hardening](../epics/EPIC-02-security-hardening.md)  
**Type**: Security Testing  
**Dependencies**: None  
**Source**: critique/09-security-roast.md (SEC-002)

## Problem Statement

100+ database tables have Row-Level Security (RLS) enabled, but policies are **untested**. Nobody has verified that RLS actually prevents cross-tenant data leaks.

### Current State

**Tables with RLS enabled**: 100+  
**Tables with tested RLS**: 0  
**Risk**: Unknown data leak vulnerabilities

### Critical Tables (Must Test)

| Table | Sensitivity | Current RLS | Tested? |
|-------|-------------|-------------|---------|
| `profiles` | User data, tenant isolation | Enabled | ❌ No |
| `pets` | Pet records | Enabled | ❌ No |
| `medical_records` | Health information (HIPAA-adjacent) | Enabled | ❌ No |
| `prescriptions` | Controlled substances | Enabled | ❌ No |
| `invoices` | Financial data | Enabled | ❌ No |
| `payments` | Payment information | Enabled | ❌ No |
| `appointments` | Schedule information | Enabled | ❌ No |
| `consent_documents` | Legal documents | Enabled | ❌ No |
| `insurance_claims` | Insurance data | Enabled | ❌ No |
| `messages` | Private communications | Enabled | ❌ No |

**This is security theater until tested.**

## Proposed Solution

Create comprehensive test suite that verifies:
1. **Tenant A cannot read Tenant B data**
2. **Tenant A cannot update Tenant B data**
3. **Tenant A cannot delete Tenant B data**
4. **Staff roles enforce proper access boundaries**
5. **Owner role cannot escalate to staff/admin**

### Test Architecture

```
tests/security/
├── rls/
│   ├── tenant-isolation.test.ts      # Cross-tenant leak tests
│   ├── role-boundaries.test.ts       # Role-based access
│   ├── owner-restrictions.test.ts    # Owner can't access staff data
│   └── audit-log-protection.test.ts  # Audit logs immutable
└── helpers/
    └── multi-tenant-client.ts         # Test utilities
```

## Implementation

### 1. Multi-Tenant Test Client

```typescript
// tests/security/helpers/multi-tenant-client.ts

export class MultiTenantTestClient {
  private clients: Map<string, SupabaseClient> = new Map()

  async createTenantClient(tenantId: string, role: 'owner' | 'vet' | 'admin') {
    const client = await createSupabaseClient()
    
    // Authenticate as user with specific role
    const user = await this.createTestUser(tenantId, role)
    await client.auth.signInWithPassword({
      email: user.email,
      password: 'test-password'
    })

    this.clients.set(`${tenantId}-${role}`, client)
    return client
  }

  getTenantClient(tenantId: string, role: string) {
    return this.clients.get(`${tenantId}-${role}`)
  }

  async cleanup() {
    for (const client of this.clients.values()) {
      await client.auth.signOut()
    }
    this.clients.clear()
  }
}
```

### 2. Tenant Isolation Tests

```typescript
// tests/security/rls/tenant-isolation.test.ts

import { MultiTenantTestClient } from '../helpers/multi-tenant-client'
import { buildPet, buildMedicalRecord, buildInvoice } from '../../__fixtures__'

const CRITICAL_TABLES = [
  'profiles', 'pets', 'medical_records', 'prescriptions',
  'invoices', 'payments', 'appointments', 'consent_documents',
  'insurance_claims', 'messages'
]

describe('RLS: Tenant Isolation', () => {
  let testClient: MultiTenantTestClient
  let tenantA: SupabaseClient
  let tenantB: SupabaseClient

  beforeAll(async () => {
    testClient = new MultiTenantTestClient()
    tenantA = await testClient.createTenantClient('adris', 'admin')
    tenantB = await testClient.createTenantClient('petlife', 'admin')
  })

  afterAll(async () => {
    await testClient.cleanup()
  })

  for (const table of CRITICAL_TABLES) {
    describe(`Table: ${table}`, () => {
      let tenantARecordId: string

      beforeEach(async () => {
        // Tenant A creates a record
        const { data } = await tenantA
          .from(table)
          .insert(buildRecordForTable(table, { tenant_id: 'adris' }))
          .select('id')
          .single()
        
        tenantARecordId = data.id
      })

      it('should prevent Tenant B from reading Tenant A data', async () => {
        const { data, error } = await tenantB
          .from(table)
          .select('*')
          .eq('id', tenantARecordId)
          .single()

        expect(data).toBeNull()
        expect(error?.message).toMatch(/no rows/i)
      })

      it('should prevent Tenant B from updating Tenant A data', async () => {
        const { data, error } = await tenantB
          .from(table)
          .update({ updated_field: 'malicious' })
          .eq('id', tenantARecordId)

        expect(data).toBeNull()
        expect(error).toBeDefined()
      })

      it('should prevent Tenant B from deleting Tenant A data', async () => {
        const { error } = await tenantB
          .from(table)
          .delete()
          .eq('id', tenantARecordId)

        expect(error).toBeDefined()

        // Verify record still exists for Tenant A
        const { data } = await tenantA
          .from(table)
          .select('id')
          .eq('id', tenantARecordId)
          .single()

        expect(data).toBeTruthy()
      })

      it('should allow Tenant A to access own data', async () => {
        const { data, error } = await tenantA
          .from(table)
          .select('*')
          .eq('id', tenantARecordId)
          .single()

        expect(error).toBeNull()
        expect(data).toBeTruthy()
        expect(data.tenant_id).toBe('adris')
      })
    })
  }
})
```

### 3. Role Boundary Tests

```typescript
// tests/security/rls/role-boundaries.test.ts

describe('RLS: Role Boundaries', () => {
  let ownerClient: SupabaseClient
  let vetClient: SupabaseClient
  let adminClient: SupabaseClient

  beforeAll(async () => {
    const testClient = new MultiTenantTestClient()
    ownerClient = await testClient.createTenantClient('adris', 'owner')
    vetClient = await testClient.createTenantClient('adris', 'vet')
    adminClient = await testClient.createTenantClient('adris', 'admin')
  })

  describe('Prescription Access', () => {
    let prescriptionId: string

    beforeEach(async () => {
      // Vet creates prescription
      const { data } = await vetClient
        .from('prescriptions')
        .insert(buildPrescription({ tenant_id: 'adris' }))
        .select('id')
        .single()
      
      prescriptionId = data.id
    })

    it('should allow vet to create prescriptions', async () => {
      const { error } = await vetClient
        .from('prescriptions')
        .insert(buildPrescription({ tenant_id: 'adris' }))

      expect(error).toBeNull()
    })

    it('should allow admin to view prescriptions', async () => {
      const { data, error } = await adminClient
        .from('prescriptions')
        .select('*')
        .eq('id', prescriptionId)
        .single()

      expect(error).toBeNull()
      expect(data).toBeTruthy()
    })

    it('should allow owner to view own pet prescriptions', async () => {
      // Owner's pet prescription
      const ownPet = await createPetOwnedBy(ownerClient)
      const { data: prescription } = await vetClient
        .from('prescriptions')
        .insert(buildPrescription({ pet_id: ownPet.id }))
        .select('id')
        .single()

      const { data, error } = await ownerClient
        .from('prescriptions')
        .select('*')
        .eq('id', prescription.id)
        .single()

      expect(error).toBeNull()
      expect(data).toBeTruthy()
    })

    it('should prevent owner from creating prescriptions', async () => {
      const { error } = await ownerClient
        .from('prescriptions')
        .insert(buildPrescription({ tenant_id: 'adris' }))

      expect(error).toBeDefined()
      expect(error?.message).toMatch(/permission denied|not allowed/i)
    })

    it('should prevent owner from viewing other owners prescriptions', async () => {
      // Different owner's prescription
      const otherOwnerPet = await createPetOwnedBy(await createOwner('other-owner'))
      const { data: prescription } = await vetClient
        .from('prescriptions')
        .insert(buildPrescription({ pet_id: otherOwnerPet.id }))
        .select('id')
        .single()

      const { data, error } = await ownerClient
        .from('prescriptions')
        .select('*')
        .eq('id', prescription.id)
        .single()

      expect(data).toBeNull()
    })
  })

  describe('Financial Data Access', () => {
    it('should prevent owners from viewing all invoices', async () => {
      const { data, error } = await ownerClient
        .from('invoices')
        .select('*')

      // Should only see own invoices, not all
      expect(data?.length).toBeLessThan(100)  // Not full table
    })

    it('should allow admin to view all tenant invoices', async () => {
      const { data, error } = await adminClient
        .from('invoices')
        .select('*')
        .eq('tenant_id', 'adris')

      expect(error).toBeNull()
      expect(data).toBeTruthy()
    })
  })
})
```

### 4. Audit Log Immutability

```typescript
// tests/security/rls/audit-log-protection.test.ts

describe('RLS: Audit Log Protection', () => {
  const AUDIT_TABLES = [
    'financial_audit_logs',
    'appointment_audit_logs',  // If exists
    'prescription_access_log'  // If exists
  ]

  let adminClient: SupabaseClient

  beforeAll(async () => {
    const testClient = new MultiTenantTestClient()
    adminClient = await testClient.createTenantClient('adris', 'admin')
  })

  for (const table of AUDIT_TABLES) {
    describe(`Audit Table: ${table}`, () => {
      it('should allow SELECT on audit logs', async () => {
        const { data, error } = await adminClient
          .from(table)
          .select('*')
          .limit(10)

        expect(error).toBeNull()
      })

      it('should prevent UPDATE on audit logs', async () => {
        // Try to modify an audit log entry
        const { data: logs } = await adminClient
          .from(table)
          .select('id')
          .limit(1)
          .single()

        if (logs) {
          const { error } = await adminClient
            .from(table)
            .update({ action: 'tampered' })
            .eq('id', logs.id)

          expect(error).toBeDefined()
          expect(error?.message).toMatch(/permission denied|not allowed/i)
        }
      })

      it('should prevent DELETE on audit logs', async () => {
        const { data: logs } = await adminClient
          .from(table)
          .select('id')
          .limit(1)
          .single()

        if (logs) {
          const { error } = await adminClient
            .from(table)
            .delete()
            .eq('id', logs.id)

          expect(error).toBeDefined()
          expect(error?.message).toMatch(/permission denied|not allowed/i)
        }
      })
    })
  }
})
```

## Acceptance Criteria

**Test Coverage:**
- [ ] All 10 critical tables tested for tenant isolation
- [ ] Read/Update/Delete operations tested per table
- [ ] Role boundaries tested for prescriptions
- [ ] Role boundaries tested for financial data
- [ ] Audit log immutability verified
- [ ] Total tests: 100+ (10 tables × 4 ops + role tests)

**Test Infrastructure:**
- [ ] `MultiTenantTestClient` helper created
- [ ] Test database isolation configured
- [ ] Fixtures for all critical tables
- [ ] Automated cleanup after tests

**Quality Gates:**
- [ ] All tests pass (RLS working correctly)
- [ ] If tests fail → RLS policies fixed before merging
- [ ] Tests run in CI/CD pipeline
- [ ] Test execution time < 2 minutes

**Documentation:**
- [ ] RLS testing guide created
- [ ] How to add new table to RLS test suite
- [ ] Common RLS patterns documented

## Files to Create

- `tests/security/rls/tenant-isolation.test.ts` (~300 lines)
- `tests/security/rls/role-boundaries.test.ts` (~200 lines)
- `tests/security/rls/owner-restrictions.test.ts` (~150 lines)
- `tests/security/rls/audit-log-protection.test.ts` (~100 lines)
- `tests/security/helpers/multi-tenant-client.ts` (~150 lines)
- `tests/__fixtures__/security-test-data.ts` (~100 lines)
- `documentation/security/rls-testing-guide.md` (~50 lines)

## Verification

### Run Supabase Security Advisor

```bash
supabase get advisors --type security
```

Expected output: Security advisor report with RLS analysis.

### Run Test Suite

```bash
# Run all RLS tests
npm run test:security:rls

# Run specific table
npm run test:security:rls -- --grep "Table: pets"

# Run with coverage
npm run test:security:rls -- --coverage
```

### Manual Verification (One Table)

```sql
-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'pets';
-- Should show rowsecurity = true

-- View policies
SELECT * FROM pg_policies WHERE tablename = 'pets';
-- Should show tenant isolation policies
```

## Security Impact

| Risk | Before | After | Mitigation |
|------|--------|-------|------------|
| **Cross-tenant data leak** | High (untested) | Low (verified) | 100+ tests |
| **Role escalation** | Medium (assumed working) | Low (verified) | Role boundary tests |
| **Audit tampering** | High (no protection verified) | Low (immutability verified) | Audit log tests |
| **Compliance** | Risky (no evidence) | Confident (test evidence) | Test reports for auditors |

## Related Issues

- Source: critique/09-security-roast.md (SEC-002)
- Related: SEC-001 (Tenant Validation)
- Related: AUDIT-110 (Appointment Audit Trail)

---

**Created**: 2026-01-19  
**Status**: Not Started  
**Priority**: P0 - Critical (Security untested = security theater)
