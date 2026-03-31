# SEC-023 Payment Method Missing Tenant Verification in Auto-charge

## Priority: P1

## Category: Security

## Status: ✅ Completed

## Epic: [EPIC-02: Security Hardening](../epics/EPIC-02-security-hardening.md)

## Completed: January 2026

## Description

The auto-charge cron job fetches payment methods by ID but doesn't verify the payment method belongs to the same tenant as the invoice being charged. If `default_payment_method_id` was manipulated, it could charge the wrong tenant's payment method.

### Vulnerable Code

**`web/app/api/cron/billing/auto-charge/route.ts`** (Lines 173-186):
```typescript
// Get tenant's default payment method
const { data: paymentMethod, error: pmError } = await supabase
  .from('tenant_payment_methods')
  .select('id, stripe_payment_method_id, display_name, method_type')
  .eq('id', tenant.default_payment_method_id)  // Only filters by ID
  .eq('is_active', true)
  .single()

// MISSING: .eq('tenant_id', invoice.tenant_id)
```

### Attack Scenario

1. Attacker gains access to tenant A's database record (e.g., through SQL injection elsewhere)
2. Attacker changes tenant A's `default_payment_method_id` to point to tenant B's payment method
3. Auto-charge cron runs and charges tenant B's card for tenant A's invoice
4. Tenant B is charged for services they didn't purchase
5. Financial and legal liability for the platform

## Impact

**Security Risk (Critical in Multi-tenant)**:
- Cross-tenant financial breach
- Unauthorized charges to wrong customers
- Massive legal liability
- Potential class-action lawsuit

Note: This requires another vulnerability to exploit (to modify the tenant record), but defense-in-depth demands we fix it.

## Proposed Fix

```typescript
// web/app/api/cron/billing/auto-charge/route.ts
const { data: paymentMethod, error: pmError } = await supabase
  .from('tenant_payment_methods')
  .select('id, stripe_payment_method_id, display_name, method_type')
  .eq('id', tenant.default_payment_method_id)
  .eq('tenant_id', invoice.tenant_id)  // SEC-023: Verify payment method ownership
  .eq('is_active', true)
  .single()

if (!paymentMethod) {
  logger.error('Payment method not found or tenant mismatch', {
    invoiceId: invoice.id,
    tenantId: invoice.tenant_id,
    paymentMethodId: tenant.default_payment_method_id,
  })
  // Mark for manual review instead of failing silently
  await markInvoiceForReview(invoice.id, 'payment_method_mismatch')
  continue
}
```

## Acceptance Criteria

- [x] Add `tenant_id` filter to payment method queries in auto-charge
- [x] Add audit log when payment method tenant doesn't match
- [x] Add `// SEC-023: Verify payment method ownership` comment
- [x] Review all payment method queries for similar issues (pay-invoice already has tenant verification at lines 140-151)
- [ ] Add database constraint: payment_method.tenant_id must match tenant.id when setting default (deferred - DB layer)

## Related Files

- `web/app/api/cron/billing/auto-charge/route.ts`
- `web/app/api/billing/pay-invoice/route.ts` - Check for same issue
- Database: Consider adding foreign key constraint

## Estimated Effort

45 minutes

## Testing Notes

1. Create test invoices for tenant A and B
2. Manually set tenant A's default_payment_method_id to tenant B's method
3. Run auto-charge
4. Should fail with tenant mismatch error, not charge wrong tenant
5. Verify audit logs capture the mismatch

## Security Severity

**HIGH** - Cross-tenant financial vulnerability (requires another vuln to exploit).
