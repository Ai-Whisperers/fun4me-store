# BUG-013 Cancel Button Has No onClick Handler

## Priority: P1

## Category: Bug

## Status: Completed

## Resolution
1. Created new API endpoint: `/api/store/orders/[id]/cancel/route.ts`
   - Verifies user authentication
   - Verifies user owns the order
   - Verifies tenant isolation
   - Only allows cancelling orders in 'pending' status
   - Updates order status to 'cancelled' with timestamp and reason

2. Updated orders client (`web/app/[clinic]/store/orders/client.tsx`):
   - Added `cancellingOrderId` state for loading state
   - Added `handleCancelOrder` function with confirmation dialog
   - Wired up button with onClick handler
   - Added loading state UI ("Cancelando...") with spinner
   - Refreshes order list after successful cancellation
   - Shows success/error feedback via toast

## Epic: [EPIC-08: Code Quality](../epics/EPIC-08-code-quality.md)

## Description

The order history page has a "Cancelar" (Cancel) button for pending orders, but the button has no `onClick` handler. Clicking it does nothing.

### Current State

**File**: `web/app/[clinic]/store/orders/client.tsx` (lines 736-739)

```typescript
{order.status === 'pending' && (
  <button className="flex-1 py-2 px-4 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
    Cancelar
  </button>
)}
```

No `onClick` handler is attached to the button.

## Impact

**Severity: HIGH**
- Users cannot cancel their pending orders
- Broken functionality displayed to users
- Poor user experience

## Proposed Fix

Add cancel functionality:

```typescript
const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null)

const handleCancelOrder = async (orderId: string) => {
  if (!confirm('¿Estás seguro de que deseas cancelar este pedido?')) {
    return
  }

  setCancellingOrderId(orderId)
  try {
    const response = await fetch(`/api/store/orders/${orderId}/cancel`, {
      method: 'POST',
    })

    if (!response.ok) {
      throw new Error('Failed to cancel order')
    }

    toast.success('Pedido cancelado exitosamente')
    fetchOrders()  // Refresh the list
  } catch (error) {
    toast.error('Error al cancelar el pedido')
  } finally {
    setCancellingOrderId(null)
  }
}

// In JSX:
{order.status === 'pending' && (
  <button
    onClick={() => handleCancelOrder(order.id)}
    disabled={cancellingOrderId === order.id}
    className="flex-1 py-2 px-4 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
  >
    {cancellingOrderId === order.id ? 'Cancelando...' : 'Cancelar'}
  </button>
)}
```

### API Endpoint

May need to create `/api/store/orders/[id]/cancel` if not existing:

```typescript
// web/app/api/store/orders/[id]/cancel/route.ts
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Verify ownership and status
  const { data: order } = await supabase
    .from('store_orders')
    .select('id, status, customer_id')
    .eq('id', params.id)
    .single()

  if (!order || order.customer_id !== user.id) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  if (order.status !== 'pending') {
    return NextResponse.json({ error: 'Only pending orders can be cancelled' }, { status: 400 })
  }

  // Update status
  await supabase
    .from('store_orders')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', params.id)

  // TODO: Restore stock, send notification, etc.

  return NextResponse.json({ success: true })
}
```

## Acceptance Criteria

- [ ] Cancel button has onClick handler
- [ ] Clicking shows confirmation dialog
- [ ] Successful cancel updates order status
- [ ] UI shows loading state during cancellation
- [ ] Success toast displayed after cancel
- [ ] Order list refreshes after cancel
- [ ] Only pending orders show cancel button
- [ ] Test: Cancel pending order → Status changes to 'cancelled'

## Related Files

- `web/app/[clinic]/store/orders/client.tsx`
- `web/app/api/store/orders/[id]/cancel/route.ts` (create if missing)

## Estimated Effort

2-3 hours

## Testing Notes

1. Create a test order with 'pending' status
2. Navigate to order history
3. Click "Cancelar" button
4. Confirm cancellation
5. Verify order status changed to 'cancelled'
6. Verify stock was restored (if applicable)
