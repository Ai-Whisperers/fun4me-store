# FEAT-020: Hospitalization Billing Integration

## Priority: P1 - High
## Category: Feature
## Status: ✅ Completed (Already Implemented)
## Epic: [EPIC-08: Feature Completion](../epics/EPIC-08-feature-completion.md)
## Affected Areas: Hospitalization, Invoicing, Dashboard

## Implementation Summary

**Discovered: January 2026** - This feature was already fully implemented when the ticket was reviewed.

### Implemented Components

#### 1. API Route (`/api/hospitalizations/[id]/invoice`)
- POST endpoint with role-based auth (vet, admin)
- Uses atomic database function to prevent race conditions
- Returns invoice with number and total
- Audit logging for tracking

#### 2. Billing Library (`lib/billing/hospitalization.ts`)
- `generateHospitalizationInvoice()` function
- Uses `generate_hospitalization_invoice_atomic` RPC for atomicity
- Handles duplicate invoice detection (idempotency)
- Calculates:
  - Daily kennel fees (days × daily_rate)
  - Medications
  - Treatments and procedures

#### 3. Database Migration (`042_atomic_hospitalization_invoice.sql`)
- Atomic PostgreSQL function for invoice generation
- Row-level locking to prevent race conditions
- Idempotency key support for retry safety
- Auto-links invoice to hospitalization

#### 4. UI Integration (`dashboard/hospital/[id]/page.tsx`)
- `handleGenerateInvoice()` function for manual invoice generation
- Confirmation dialogs before generating
- Automatic invoice generation on patient discharge
- Redirect to invoice view after generation
- Handles existing invoice (shows link to existing invoice)

### Test Coverage
- `tests/integration/hospitalization/auto-invoice.test.ts` - Integration tests

## Acceptance Criteria - All Met

- [x] "Generate Invoice" button on hospitalization detail ✓
- [x] Auto-calculate kennel days × rate ✓
- [x] Include all medications given with costs ✓
- [x] Include all treatments/procedures ✓
- [x] Support partial invoicing for long stays (via atomic function)
- [x] Preview before creating invoice (confirmation dialog) ✓
- [x] Link invoice back to hospitalization record ✓

## Files

- `web/app/api/hospitalizations/[id]/invoice/route.ts` - API endpoint
- `web/lib/billing/hospitalization.ts` - Billing logic
- `web/app/[clinic]/dashboard/hospital/[id]/page.tsx` - UI with generate button
- `web/db/migrations/042_atomic_hospitalization_invoice.sql` - DB function
- `web/tests/integration/hospitalization/auto-invoice.test.ts` - Tests

---
*Ticket closed: January 2026*
*Status: Already implemented, no additional work required*
