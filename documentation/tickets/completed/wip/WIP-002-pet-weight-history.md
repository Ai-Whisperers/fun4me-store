# WIP-002: Pet Weight History Tracking

## Priority: P2 (Medium)
## Category: Work In Progress
## Status: ✅ Complete
## Epic: [EPIC-08: Feature Completion](../epics/EPIC-08-feature-completion.md)

## Description
Weight history tracking feature for pets enables veterinarians and owners to track pet weight over time and visualize growth trends.

## Implementation Summary

### Database
- `db/migrations/055_pet_weight_history.sql` - Full schema with RLS policies
- `db/20_pets/03_weight_records.sql` - Weight records module with helper functions

### API Endpoints
- `app/api/pets/[id]/weight/route.ts` - GET/POST for weight history
  - GET: Returns weight history with age_weeks calculation
  - POST: Records new weight with validation (0-500kg)
  - Auth: Owner OR Staff access
  - Fallback: Updates pet.weight_kg if table doesn't exist

### Components
- `components/pets/weight-recording-modal.tsx` - Modal for recording weights
- `components/clinical/growth-chart.tsx` - Recharts visualization
- `components/pets/tabs/pet-summary-tab.tsx` - Summary with weight button

### Pages Integration
- `app/[clinic]/portal/pets/[id]/page.tsx` - Owner portal view
- `app/[clinic]/dashboard/patients/[id]/page.tsx` - Staff dashboard view
- Both pages fetch from pet_weight_history and merge with legacy medical record weights

### Tests
- `tests/unit/api/pet-weight.test.ts` - 14 tests covering:
  - Authentication (401)
  - Pet not found (404)
  - Authorization (403)
  - Owner access
  - Staff access
  - Table fallback handling
  - Validation (negative weight, >500kg)

## Acceptance Criteria
- [x] Staff can record pet weight from patient detail page
- [x] Owners can view weight history in portal
- [x] Growth chart displays weight over time
- [x] Weight trend indicator (via growth chart comparison)
- [x] API supports CRUD for weight records
- [x] RLS policies protect weight data by tenant
- [x] Unit tests for API endpoints

## Related Files
- `web/app/api/pets/[id]/weight/route.ts`
- `web/components/pets/weight-recording-modal.tsx`
- `web/components/clinical/growth-chart.tsx`
- `web/components/pets/tabs/pet-summary-tab.tsx`
- `web/db/migrations/055_pet_weight_history.sql`
- `web/tests/unit/api/pet-weight.test.ts`

---
*Ticket created: January 2026*
*Completed: January 2026*
