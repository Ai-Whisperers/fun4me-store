# P1-003: Fix Invoice Service Tests

## Metadata

| Field | Value |
|-------|-------|
| **ID** | P1-003 |
| **Epic** | [EPIC-P1-01](../EPIC-P1-01-service-mocks.md) |
| **Priority** | P0 - Critical |
| **Estimate** | 3 hours |
| **Status** | Not Started |
| **Depends On** | Phase 0 Complete |
| **Blocks** | P1-010 (payment-service) |

---

## Description

Fix all failing tests in `invoice-service.test.ts`. This service handles billing, invoicing, payments, and refunds - critical financial operations.

---

## Current State

- **Failing Tests:** ~25
- **Test File:** `tests/services/invoice-service.test.ts`
- **Known Issues from test output:**
  - Database error handling
  - Tenant access validation messages
  - Payment validation (zero/negative amounts)
  - Refund validation

---

## Error Messages Observed

```
Error: Database error
Error: No tiene permisos para ver esta factura
Error: Factura no encontrada
Error: Campos requeridos faltantes: pet_id
Error: La factura debe tener al menos un item
Error: Mascota no encontrada o no pertenece a esta clínica
Error: Las facturas enviadas solo pueden cambiar estado o notas
Error: No puede acceder a datos de otra clínica.
Error: El monto del pago debe ser mayor a cero
Error: El monto del pago excede el saldo pendiente
Error: El monto del reembolso debe ser mayor a cero
Error: El monto del reembolso excede el monto del pago
Error: Factura no encontrada o ya fue enviada
```

---

## Acceptance Criteria

- [ ] All tests in `invoice-service.test.ts` pass
- [ ] Error messages match expected Spanish strings
- [ ] Mock patterns use standardized helpers
- [ ] No tests skipped

---

## Implementation Steps

1. **Run test file in isolation**
   ```bash
   npm test -- invoice-service.test.ts --reporter=verbose
   ```

2. **Fix mock setup**
   - Update to use `createChainableQueryMock()`
   - Mock RPC functions for payment recording

3. **Verify error message expectations**
   - All errors should be in Spanish
   - Match exact strings from service implementation

4. **Test the following scenarios:**
   - List invoices (success, error, empty)
   - Get by ID (found, not found, wrong tenant)
   - Create (valid, missing fields, invalid pet)
   - Update (draft, sent invoice restrictions)
   - Payment (valid, zero, exceeds balance)
   - Refund (valid, zero, exceeds payment)
   - Send (valid, already sent)

---

## Related Files

- `web/tests/services/invoice-service.test.ts`
- `web/lib/services/invoice-service.ts`
- `web/tests/services/__mocks__/supabase-mock.ts`

---

*Created: 2026-02-03*
