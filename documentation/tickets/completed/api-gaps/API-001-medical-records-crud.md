# API-001: Medical Records API CRUD

## Priority: P1 (High)
## Category: API Gaps
## Status: COMPLETED

## Description
No dedicated `/api/medical-records/` endpoints exist. Medical records can only be created via server action, with no way to READ, UPDATE, or DELETE via API.

## Implementation Summary

### Created `/api/medical-records/route.ts`
- **GET** - List medical records with pagination
  - Query params: `pet_id`, `type`, `from_date`, `to_date`, `page`, `limit`
  - Returns paginated response with pet and vet details
  - Roles: vet, admin, owner

- **POST** - Create new medical record
  - Zod validation for all fields
  - Rate limiting applied
  - Audit log entry created
  - Roles: vet, admin only

### Created `/api/medical-records/[id]/route.ts`
- **GET** - Get single record with full details
  - Includes pet, vet, diagnosis code relations
  - UUID validation
  - Roles: vet, admin, owner

- **PATCH** - Update medical record
  - Partial updates supported
  - Rate limiting applied
  - Audit log with previous/updated values
  - Roles: vet, admin only

- **DELETE** - Delete medical record
  - Optional reason in body
  - Audit log entry created
  - Roles: admin only

### Features Implemented
- **Zod Validation**: All inputs validated with descriptive Spanish error messages
- **Rate Limiting**: Write endpoints rate-limited (20 req/min)
- **Tenant Isolation**: All queries filter by `profile.tenant_id`
- **Audit Logging**: All create/update/delete operations logged to `audit_logs`
- **UUID Validation**: ID params validated before queries
- **Pagination**: Standard pagination with `page`, `limit`, `offset`

### Record Types Supported
- consultation, exam, surgery, hospitalization, wellness
- emergency, follow_up, vaccination, lab_result, imaging

### Vitals Schema
```typescript
{
  weight: number | null,
  temp: number | null,    // 30-45°C
  hr: number | null,      // heart rate, max 300
  rr: number | null       // respiratory rate, max 100
}
```

## Acceptance Criteria

- [x] GET /api/medical-records returns paginated list
- [x] GET /api/medical-records?pet_id=xxx filters by pet
- [x] POST /api/medical-records creates new record
- [x] GET /api/medical-records/[id] returns single record
- [x] PATCH /api/medical-records/[id] updates record (staff only)
- [x] DELETE /api/medical-records/[id] deletes (admin only)
- [x] All endpoints enforce tenant isolation
- [x] Audit log captures all changes
- [x] Rate limiting applied to write endpoints

## Related Files
- `web/app/api/medical-records/route.ts` - NEW
- `web/app/api/medical-records/[id]/route.ts` - NEW
- `web/app/actions/create-medical-record.ts` (existing, unchanged)
- `web/tests/integration/medical-records/crud.test.ts` (existing DB tests)

---
*Ticket created: January 2026*
*Completed: January 2026*
