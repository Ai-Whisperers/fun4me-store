# FEAT-026 Order Tracking Dashboard

## Priority: P1

## Category: Feature

## Status: Not Started

## Epic: [EPIC-16: User Experience](../epics/EPIC-16-user-experience.md)

## Description

After checkout, customers have no visibility into their order status. The order history page exists but doesn't show real-time status updates, tracking information, or fulfillment progress. Customers are "blind" after placing an order.

### Current State

- Order created with `status: pending`
- No status progression visible to customer
- No tracking number field
- No estimated delivery date shown
- No status change notifications
- No order timeline/history

### Required Capabilities

1. **Status Timeline**: Visual progression of order stages
2. **Real-time Updates**: Status changes reflected immediately
3. **Tracking Integration**: Display courier tracking numbers
4. **Notifications**: Push/email on status changes
5. **Delivery Estimates**: Show expected delivery date

## Proposed Solution

### Order Status States

```typescript
type OrderStatus =
  | 'pending'           // Just created, awaiting confirmation
  | 'confirmed'         // Payment confirmed, ready to process
  | 'processing'        // Being prepared/packed
  | 'ready_for_pickup'  // Ready at clinic (pickup orders)
  | 'shipped'           // Handed to courier
  | 'out_for_delivery'  // On delivery vehicle
  | 'delivered'         // Completed
  | 'cancelled'         // Cancelled by user/clinic
  | 'refunded'          // Refund processed
```

### Order Timeline Component

```typescript
// web/components/store/order-timeline.tsx
interface TimelineEvent {
  status: OrderStatus
  timestamp: string
  description: string
  actor?: string  // "Sistema", "Juan (Staff)", etc.
}

export function OrderTimeline({ events }: { events: TimelineEvent[] }) {
  return (
    <ol className="relative border-l border-gray-200">
      {events.map((event, idx) => (
        <li key={idx} className="mb-6 ml-4">
          <div className="absolute w-3 h-3 bg-primary rounded-full -left-1.5" />
          <time className="text-sm text-gray-500">{formatDateTime(event.timestamp)}</time>
          <h3 className="font-semibold">{STATUS_LABELS[event.status]}</h3>
          <p className="text-sm text-gray-600">{event.description}</p>
        </li>
      ))}
    </ol>
  )
}
```

### Order Detail Page

```typescript
// web/app/[clinic]/store/orders/[id]/page.tsx
export default async function OrderDetailPage({ params }) {
  const order = await getOrder(params.id)

  return (
    <div className="max-w-2xl mx-auto py-8">
      <OrderHeader order={order} />

      <OrderTimeline events={order.timeline} />

      {order.trackingNumber && (
        <TrackingInfo
          carrier={order.carrier}
          trackingNumber={order.trackingNumber}
          trackingUrl={order.trackingUrl}
        />
      )}

      <OrderItems items={order.items} />

      <DeliveryInfo
        address={order.shippingAddress}
        estimatedDate={order.estimatedDeliveryDate}
      />

      <OrderActions order={order} />
    </div>
  )
}
```

### Database Changes

```sql
-- Order timeline/audit log
CREATE TABLE store_order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES store_orders(id),
  status TEXT NOT NULL,
  previous_status TEXT,
  description TEXT,
  actor_id UUID REFERENCES profiles(id),
  actor_type TEXT DEFAULT 'system',  -- 'system', 'staff', 'customer', 'courier'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tracking info on orders
ALTER TABLE store_orders ADD COLUMN carrier TEXT;
ALTER TABLE store_orders ADD COLUMN tracking_number TEXT;
ALTER TABLE store_orders ADD COLUMN tracking_url TEXT;
ALTER TABLE store_orders ADD COLUMN estimated_delivery_date DATE;

-- Index for fast timeline queries
CREATE INDEX idx_order_events_order_id ON store_order_events(order_id);
```

### Real-time Updates (Optional)

```typescript
// Using Supabase Realtime for live updates
useEffect(() => {
  const channel = supabase
    .channel(`order-${orderId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'store_order_events',
      filter: `order_id=eq.${orderId}`
    }, (payload) => {
      // Add new event to timeline
      setEvents(prev => [...prev, payload.new])
    })
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}, [orderId])
```

## Implementation Steps

1. [ ] Create `store_order_events` table
2. [ ] Add tracking columns to `store_orders`
3. [ ] Create order detail page route
4. [ ] Build OrderTimeline component
5. [ ] Build TrackingInfo component
6. [ ] Create API endpoint for order details with timeline
7. [ ] Add status change event recording (trigger or in-app)
8. [ ] Implement notification on status change
9. [ ] Add Supabase Realtime for live updates (optional)
10. [ ] Staff dashboard: Add tracking number input

## Acceptance Criteria

- [ ] Customer can view detailed order status
- [ ] Timeline shows all status changes with timestamps
- [ ] Tracking number displayed with courier link
- [ ] Estimated delivery date shown
- [ ] Email notification sent on status change
- [ ] Staff can update order status from dashboard
- [ ] Staff can add tracking number
- [ ] Real-time updates without page refresh (optional)

## Related Files

- `web/app/[clinic]/store/orders/[id]/page.tsx` (create)
- `web/components/store/order-timeline.tsx` (create)
- `web/components/store/tracking-info.tsx` (create)
- `web/app/api/store/orders/[id]/route.ts`

## Estimated Effort

16-24 hours

## UI/UX Considerations

- Mobile-first design for tracking page
- Clear visual distinction between status states
- One-tap access to courier tracking
- Prominent display of delivery estimate
- Action buttons: Contact support, Request refund, etc.
