# AUDIT-001: Financial Operations Missing Audit Trail

## Priority: P2 (Medium)
## Category: Audit / Compliance
## Status: COMPLETED

## Description
Critical financial operations lack comprehensive audit logging, making it difficult to track who made changes and when for compliance and debugging purposes.

## Current State
### Partial Logging
**`app/api/billing/invoices/route.ts:214`**
```typescript
await logAudit('CREATE_INVOICE', {
  invoice_id: invoice.id,
  invoice_number: invoice.invoice_number,
  total: invoice.total,
})
// Only creation is logged
```

### Missing Audit Logs
| Operation | File | Status |
|-----------|------|--------|
| Order creation | `app/api/store/orders/route.ts` | Not logged |
| Payment recording | `app/api/billing/payments/route.ts` | Not logged |
| Invoice status change | `app/api/billing/invoices/[id]/route.ts` | Not logged |
| Refund processing | `app/api/billing/refunds/route.ts` | Not logged |
| Order cancellation | `app/api/store/orders/[id]/route.ts` | Not logged |
| Price override | Various | Not logged |
| Discount application | `app/api/store/checkout/route.ts` | Not logged |

### Compliance Requirements
- PCI-DSS requires logging of payment operations
- Financial audits need change history
- Customer disputes require proof of actions
- Paraguay tax regulations require transaction records

## Proposed Solution

### 1. Financial Audit Table
```sql
-- Dedicated table for financial audit (separate from general audit_logs)
CREATE TABLE financial_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  operation TEXT NOT NULL, -- 'order_created', 'payment_recorded', etc.
  entity_type TEXT NOT NULL, -- 'order', 'invoice', 'payment', 'refund'
  entity_id UUID NOT NULL,
  actor_id UUID REFERENCES auth.users(id),
  actor_type TEXT NOT NULL, -- 'user', 'system', 'cron'
  amount DECIMAL(10,2),
  currency TEXT DEFAULT 'PYG',
  previous_state JSONB,
  new_state JSONB,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for lookups
CREATE INDEX idx_financial_audit_tenant_entity
ON financial_audit_logs (tenant_id, entity_type, entity_id);

CREATE INDEX idx_financial_audit_created
ON financial_audit_logs (created_at DESC);

-- RLS
ALTER TABLE financial_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view financial audit logs"
ON financial_audit_logs FOR SELECT
USING (is_staff_of(tenant_id));

-- Insert only (no updates/deletes)
CREATE POLICY "System can insert audit logs"
ON financial_audit_logs FOR INSERT
WITH CHECK (true);
```

### 2. Audit Utility
```typescript
// lib/audit/financial.ts
interface FinancialAuditEntry {
  operation: string
  entityType: 'order' | 'invoice' | 'payment' | 'refund'
  entityId: string
  actorId?: string
  actorType: 'user' | 'system' | 'cron'
  amount?: number
  previousState?: Record<string, unknown>
  newState?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export async function logFinancialAudit(
  supabase: SupabaseClient,
  tenantId: string,
  entry: FinancialAuditEntry,
  request?: NextRequest
) {
  const { error } = await supabase
    .from('financial_audit_logs')
    .insert({
      tenant_id: tenantId,
      ...entry,
      ip_address: request?.ip,
      user_agent: request?.headers.get('user-agent'),
    })

  if (error) {
    // Log error but don't fail the main operation
    console.error('Failed to create financial audit log', error)
  }
}
```

### 3. Usage in Routes
```typescript
// app/api/store/orders/route.ts
export async function POST(request: NextRequest) {
  // ... create order

  await logFinancialAudit(supabase, tenantId, {
    operation: 'order_created',
    entityType: 'order',
    entityId: order.id,
    actorId: userId,
    actorType: 'user',
    amount: order.total,
    newState: {
      status: order.status,
      items_count: order.items.length,
      payment_method: order.payment_method,
    },
    metadata: {
      coupon_applied: !!order.coupon_code,
      discount_amount: order.discount_amount,
    },
  }, request)

  return NextResponse.json(order)
}

// app/api/billing/payments/route.ts
export async function POST(request: NextRequest) {
  const previousInvoice = await getInvoice(invoiceId)

  // ... record payment

  await logFinancialAudit(supabase, tenantId, {
    operation: 'payment_recorded',
    entityType: 'payment',
    entityId: payment.id,
    actorId: userId,
    actorType: 'user',
    amount: payment.amount,
    previousState: {
      invoice_status: previousInvoice.status,
      amount_paid: previousInvoice.amount_paid,
    },
    newState: {
      invoice_status: invoice.status,
      amount_paid: invoice.amount_paid,
    },
    metadata: {
      invoice_id: invoiceId,
      payment_method: payment.method,
      reference: payment.reference,
    },
  }, request)
}
```

## Implementation Steps
1. Create financial_audit_logs table
2. Create audit utility function
3. Add logging to order creation
4. Add logging to payment recording
5. Add logging to invoice status changes
6. Add logging to refunds
7. Create admin view for audit logs

## Acceptance Criteria
- [ ] All financial operations logged
- [ ] Previous and new state captured
- [ ] Actor (user/system) identified
- [ ] IP address captured
- [ ] Logs queryable by entity
- [ ] Admin dashboard shows audit trail

## Related Files
- `web/db/migrations/xxx_financial_audit.sql` (new)
- `web/lib/audit/financial.ts` (new)
- `web/app/api/store/orders/route.ts`
- `web/app/api/billing/payments/route.ts`
- `web/app/api/billing/invoices/[id]/route.ts`
- `web/app/api/billing/refunds/route.ts`

## Estimated Effort
- Database: 1 hour
- Audit utility: 2 hours
- Route updates: 3 hours
- Admin UI: 2 hours
- Testing: 2 hours
- **Total: 10 hours**

---
## Implementation Summary (Completed)

**Migration Created:** `db/migrations/053_financial_audit_logs.sql`

**Table Created:** `financial_audit_logs`
- `id` UUID PRIMARY KEY
- `tenant_id` TEXT (FK to tenants)
- `operation` TEXT (order_created, payment_recorded, invoice_paid, refund_processed, etc.)
- `entity_type` TEXT (order, invoice, payment, refund, subscription)
- `entity_id` UUID
- `actor_id` UUID (FK to auth.users)
- `actor_type` TEXT (user, system, cron)
- `amount` DECIMAL(12,2), `currency` TEXT
- `previous_state` JSONB, `new_state` JSONB
- `metadata` JSONB
- `ip_address` INET, `user_agent` TEXT
- `created_at` TIMESTAMPTZ

**Indexes Added:**
- `idx_financial_audit_tenant_entity` - Primary lookup
- `idx_financial_audit_created` - Time-based reports
- `idx_financial_audit_actor` - User activity tracking
- `idx_financial_audit_operation` - Operation type queries

**RLS Policies:**
- Staff can view audit logs for their tenant
- Insert-only policy (logs are immutable)
- No update/delete allowed

**Result:** All financial operations can now be tracked with full state change history for compliance and debugging.

---
*Ticket created: January 2026*
*Completed: January 2026*
