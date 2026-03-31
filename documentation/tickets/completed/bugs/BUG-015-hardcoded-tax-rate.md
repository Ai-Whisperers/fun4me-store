# BUG-015 Hardcoded 10% Tax Rate in Checkout

## Priority: P2

## Category: Bug

## Status: Completed

## Resolution
1. Created migration `070_tenant_tax_rate.sql` adding `tax_rate`, `tax_name`, `is_tax_inclusive` columns to tenants
2. Added `tax_rate`, `tax_name`, `is_tax_inclusive` fields to `ClinicSettings` interface in `lib/types/clinic-config/config.ts`
3. Updated checkout client to use configurable `taxRate` with default of 0.1 (10% IVA Paraguay)
4. Tax label now displays the rate percentage (e.g., "IVA (10%)")

## Epic: [EPIC-08: Code Quality](../epics/EPIC-08-code-quality.md)

## Description

The checkout page has a hardcoded 10% tax rate. Different tenants may have different tax configurations, and the server-side checkout uses `process_checkout` which may calculate tax differently, causing discrepancy between displayed and actual totals.

### Current State

**File**: `web/app/[clinic]/cart/checkout/client.tsx` (lines 362-374)

```typescript
// Tax display (hardcoded 10%)
{new Intl.NumberFormat('es-PY', { style: 'currency', currency: currency }).format(
  total * 0.1  // ← Hardcoded 10% tax
)}

// Grand total (hardcoded 10%)
{new Intl.NumberFormat('es-PY', { style: 'currency', currency: currency }).format(
  Math.max(0, total - discount) * 1.1  // ← Hardcoded 10% tax
)}
```

### Problems

1. **Paraguay VAT is 10%** - Currently correct for Paraguay, but hardcoded
2. **No tenant configuration** - Different clinics might have different tax situations
3. **Client/Server mismatch** - If server uses different rate, invoice total will differ
4. **No tax exemption support** - Some products/services may be tax-exempt

## Impact

**Severity: MEDIUM**
- Financial discrepancy between displayed and actual totals
- Customer confusion if totals don't match invoice
- Inflexibility for different tax jurisdictions

## Proposed Fix

### Option A: Fetch tax rate from tenant config

```typescript
// In checkout page or context
const { data: tenantConfig } = useQuery({
  queryKey: ['tenant-config', clinic],
  queryFn: () => fetch(`/api/clinic/${clinic}/config`).then(r => r.json())
})

const taxRate = tenantConfig?.tax_rate ?? 0.1  // Default 10%

// In JSX
{formatCurrency(total * taxRate)}  // Tax amount
{formatCurrency(total * (1 + taxRate))}  // Grand total
```

### Option B: Calculate tax server-side and return in cart

```typescript
// API returns tax calculation
const { data: cartSummary } = useQuery({
  queryKey: ['cart-summary', items],
  queryFn: () => fetch('/api/store/cart/summary', {
    method: 'POST',
    body: JSON.stringify({ items })
  }).then(r => r.json())
})

// Response includes:
// { subtotal: 100000, tax: 10000, total: 110000, taxRate: 0.1 }
```

### Option C: Add tax_rate to tenants table

```sql
-- Migration
ALTER TABLE tenants ADD COLUMN tax_rate NUMERIC(4,2) DEFAULT 0.10;

-- Query in checkout
const { data: tenant } = await supabase
  .from('tenants')
  .select('tax_rate')
  .eq('id', clinic)
  .single()
```

### Database Schema Addition

```sql
CREATE TABLE IF NOT EXISTS tenant_tax_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  tax_rate NUMERIC(5,4) NOT NULL DEFAULT 0.1000,
  tax_name TEXT DEFAULT 'IVA',
  is_tax_inclusive BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id)
);
```

## Acceptance Criteria

- [ ] Tax rate comes from tenant configuration, not hardcoded
- [ ] Displayed tax matches server-calculated tax
- [ ] Default to 10% if not configured
- [ ] Tax rate visible in display (e.g., "IVA (10%)")
- [ ] Test: Set clinic tax rate to 5% → Checkout shows 5%
- [ ] Add comment `// BUG-015: Tax rate from config`

## Related Files

- `web/app/[clinic]/cart/checkout/client.tsx`
- `web/db/60_store/03_checkout_rpc.sql`
- `web/db/` - Migration for tenant_tax_config

## Estimated Effort

3-4 hours

## Testing Notes

1. Set up two test clinics with different tax rates
2. Add same items to cart in each clinic
3. Verify checkout shows correct tax for each
4. Complete checkout and verify invoice matches displayed total
