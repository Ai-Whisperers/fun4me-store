# API-002: Vaccines API CRUD Enhancement

## Priority: P1 (High)
## Category: API Gaps
## Status: COMPLETED

## Description
Vaccines have limited API support. Only read-only endpoints exist for alerts and recommendations. Vaccine creation is only via server action, and UPDATE/DELETE are missing entirely.

## Implementation Summary

### Created `/api/vaccines/route.ts`
- **GET** - List vaccines with pagination
  - Query params: `pet_id`, `status`, `upcoming`, `overdue`, `from_date`, `to_date`, `page`, `limit`
  - Returns vaccines with pet, vet, and reactions details
  - Roles: vet, admin, owner

- **POST** - Create new vaccine record
  - Zod validation for all fields
  - Duplicate detection (same pet + vaccine name + date)
  - Rate limiting applied
  - Status: 'verified' for staff, 'pending' for owners
  - Audit log entry created
  - Roles: vet, admin, owner

### Created `/api/vaccines/[id]/route.ts`
- **GET** - Get single vaccine with full details
  - Includes pet, owner, vet, and reactions
  - UUID validation
  - Roles: vet, admin, owner

- **PATCH** - Update vaccine record
  - Partial updates supported
  - Date validation (next_due > administered)
  - Auto-sets verified_by when status changes to 'verified'
  - Rate limiting applied
  - Audit log with previous/updated values
  - Roles: vet, admin only

- **DELETE** - Delete vaccine record
  - Optional reason in body
  - Cascades to vaccine_reactions
  - Audit log entry created
  - Roles: vet, admin only

### Features Implemented
- **Zod Validation**: All inputs validated with Spanish error messages
- **Rate Limiting**: Write endpoints rate-limited
- **Tenant Isolation**: All queries filter by `pet.tenant_id`
- **Audit Logging**: All create/update/delete operations logged
- **Duplicate Detection**: Prevents same vaccine on same date
- **Date Validation**: Ensures next_due_date > administered_date
- **Status Auto-Management**: Sets verified_by/verified_at automatically

### Supported Filters
- `pet_id` - Filter by pet
- `status` - Filter by status (pending, verified, expired)
- `upcoming=true` - Vaccines due in next 30 days
- `overdue=true` - Vaccines past due date
- `from_date`, `to_date` - Date range filter

## Acceptance Criteria

- [x] GET /api/vaccines returns paginated list
- [x] GET /api/vaccines?pet_id=xxx&status=overdue filters correctly
- [x] POST /api/vaccines creates new vaccine record
- [x] GET /api/vaccines/[id] returns vaccine detail with reactions
- [x] PATCH /api/vaccines/[id] updates vaccine (staff only)
- [x] DELETE /api/vaccines/[id] deletes (staff only)
- [x] Duplicate detection prevents same vaccine on same date
- [x] All endpoints enforce tenant isolation
- [x] Audit log captures all changes

## Related Files
- `web/app/api/vaccines/route.ts` - NEW
- `web/app/api/vaccines/[id]/route.ts` - NEW
- `web/app/api/vaccines/mandatory-alerts/route.ts` (existing, unchanged)
- `web/app/api/vaccines/recommendations/route.ts` (existing, unchanged)
- `web/app/api/vaccines/send-reminder/route.ts` (existing, unchanged)
- `web/app/actions/create-vaccine.ts` (existing, unchanged)

---
*Ticket created: January 2026*
*Completed: January 2026*
