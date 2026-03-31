# P1-005: Fix Medical Record Service Tests

## Metadata

| Field | Value |
|-------|-------|
| **ID** | P1-005 |
| **Epic** | [EPIC-P1-01](../EPIC-P1-01-service-mocks.md) |
| **Priority** | P0 - Critical |
| **Estimate** | 4 hours |
| **Status** | Not Started |
| **Depends On** | Phase 0 Complete |
| **Blocks** | P1-008 (lab-service), P1-012 (consent), P1-014, P1-015 |

---

## Description

Fix all failing tests in `medical-record-service.test.ts`. This service handles patient medical history - a critical clinical function.

---

## Current State

- **Failing Tests:** ~35
- **Test File:** `tests/services/medical-record-service.test.ts`
- **Coverage:** 0% (all tests failing)

---

## Expected Functionality

```typescript
interface MedicalRecordService {
  // Records
  getRecordsByPet(petId: string, tenantId: string): Promise<Result<MedicalRecord[]>>;
  getRecord(recordId: string, tenantId: string): Promise<Result<MedicalRecord>>;
  createRecord(tenantId: string, vetId: string, data: RecordInput): Promise<Result<MedicalRecord>>;
  updateRecord(recordId: string, tenantId: string, updates: Partial<MedicalRecord>): Promise<Result<MedicalRecord>>;
  
  // Attachments
  addAttachment(recordId: string, file: File): Promise<Result<Attachment>>;
  removeAttachment(attachmentId: string): Promise<Result<void>>;
  
  // History
  getVitalHistory(petId: string, tenantId: string): Promise<Result<VitalRecord[]>>;
}
```

---

## Acceptance Criteria

- [ ] All tests in `medical-record-service.test.ts` pass
- [ ] Record CRUD operations tested
- [ ] Pet ownership verified before access
- [ ] Vet authorization required for creation
- [ ] Attachment handling tested
- [ ] Vital history retrieval tested

---

## Implementation Steps

1. **Run isolated tests**
   ```bash
   npm test -- medical-record-service.test.ts --reporter=verbose
   ```

2. **Fix mock setup**
   - Medical records table
   - Pets table (for ownership check)
   - Attachments/storage mocks

3. **Test scenarios:**
   - Get records by pet (owner access, staff access)
   - Get single record (found, not found, wrong tenant)
   - Create record (vet required, validation)
   - Update record (restrictions on completed records?)
   - Attachment operations
   - Vital signs history

---

## Related Files

- `web/tests/services/medical-record-service.test.ts`
- `web/lib/services/medical-record-service.ts`

---

*Created: 2026-02-03*
