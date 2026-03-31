# AUDIT-109 No State Machine Validation for Store Order Status

## Priority: P2

## Category: Technical Debt / Data Integrity

## Status: Not Started

## Epic: [EPIC-01: Data Integrity](../epics/EPIC-01-data-integrity.md)

## Description

The `store_orders` table has a CHECK constraint ensuring status is one of valid values, but there's no validation of status *transitions*. Any staff member can set any status without validating the previous state, potentially creating invalid state progressions.

### Current State

**Table constraint** (exists):
```sql
status TEXT CHECK (status IN (
  'pending', 'confirmed', 'processing', 'ready', 'shipped', 'delivered', 'cancelled', 'refunded'
))
```

**No transition validation**:
```typescript
// Staff can do this:
await supabase
  .from('store_orders')
  .update({ status: 'delivered' })
  .eq('id', orderId)
// Even if current status is 'pending'!
```

### Valid State Transitions

```
pending → confirmed | cancelled
confirmed → processing | cancelled
processing → ready | cancelled
ready → shipped (delivery) | picked_up (pickup) | cancelled
shipped → delivered
delivered → [terminal]
cancelled → refunded
refunded → [terminal]
```

### Invalid Transitions (should fail)

- `pending → delivered` (skips all intermediate states)
- `delivered → pending` (can't go backwards)
- `cancelled → confirmed` (can't un-cancel)

### Comparison: Appointments

The `appointments` table has `update_appointment_status_atomic()` function that validates transitions. Store orders should have similar protection.

## Proposed Fix

### Database Trigger Function

```sql
-- web/db/migrations/072_store_order_state_machine.sql

CREATE OR REPLACE FUNCTION validate_store_order_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  valid_transitions JSONB := '{
    "pending": ["confirmed", "cancelled"],
    "confirmed": ["processing", "cancelled"],
    "processing": ["ready", "cancelled"],
    "ready": ["shipped", "picked_up", "cancelled"],
    "shipped": ["delivered"],
    "delivered": [],
    "cancelled": ["refunded"],
    "refunded": [],
    "picked_up": []
  }'::JSONB;
  allowed_next TEXT[];
BEGIN
  -- Skip if status not changing
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get allowed transitions from current status
  allowed_next := ARRAY(
    SELECT jsonb_array_elements_text(valid_transitions -> OLD.status)
  );

  -- Check if new status is allowed
  IF NOT (NEW.status = ANY(allowed_next)) THEN
    RAISE EXCEPTION 'Invalid order status transition from % to %', OLD.status, NEW.status
      USING ERRCODE = 'check_violation';
  END IF;

  -- Set timestamp for specific transitions
  CASE NEW.status
    WHEN 'confirmed' THEN NEW.confirmed_at := NOW();
    WHEN 'shipped' THEN NEW.shipped_at := NOW();
    WHEN 'delivered' THEN NEW.delivered_at := NOW();
    WHEN 'cancelled' THEN NEW.cancelled_at := NOW();
    WHEN 'refunded' THEN NEW.refunded_at := NOW();
    ELSE NULL;
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER tr_validate_store_order_status
BEFORE UPDATE OF status ON store_orders
FOR EACH ROW
EXECUTE FUNCTION validate_store_order_status_transition();
```

### Add Missing Timestamp Columns

```sql
-- Add timestamp columns if not present
ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ;
ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;
ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ;
```

### API Error Handling

```typescript
// In order status update endpoints
const { error } = await supabase
  .from('store_orders')
  .update({ status: newStatus })
  .eq('id', orderId)

if (error?.code === 'P0001') {  // RAISE EXCEPTION
  return NextResponse.json({
    error: 'Transición de estado no válida',
    details: error.message
  }, { status: 400 })
}
```

## Acceptance Criteria

- [ ] Trigger function validates all status transitions
- [ ] Invalid transitions raise clear error
- [ ] Timestamps set automatically on transitions
- [ ] Test: Try `pending → delivered` → Fails
- [ ] Test: Try `pending → confirmed` → Succeeds
- [ ] Test: Try `delivered → pending` → Fails
- [ ] API returns user-friendly error on invalid transition

## Related Files

- `web/db/60_store/orders/01_orders.sql`
- `web/db/migrations/` - New migration
- `web/app/api/store/orders/[id]/` - Status update endpoints

## Estimated Effort

3-4 hours

## State Machine Diagram

```
                    ┌──────────────────────────────────────────┐
                    │                                          │
                    ▼                                          │
┌─────────┐    ┌───────────┐    ┌────────────┐    ┌─────────┐  │
│ pending │───▶│ confirmed │───▶│ processing │───▶│  ready  │──┤
└─────────┘    └───────────┘    └────────────┘    └─────────┘  │
     │              │                │                │         │
     │              │                │                │         │
     ▼              ▼                ▼                ▼         │
┌───────────────────────────────────────────────────────────┐  │
│                       cancelled                            │  │
└───────────────────────────────────────────────────────────┘  │
                    │                                          │
                    ▼                                          │
              ┌──────────┐         ┌──────────┐    ┌──────────┐│
              │ refunded │         │ shipped  │───▶│delivered ││
              └──────────┘         └──────────┘    └──────────┘│
                                         ▲                     │
                                         │                     │
                                         └─────────────────────┘
                                              (or picked_up)
```
