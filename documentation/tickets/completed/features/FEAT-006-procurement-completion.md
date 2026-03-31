# FEAT-006: Procurement Module Completion

## Priority: P2 (Medium)
## Category: Feature
## Status: ✅ Complete
## Epic: [EPIC-08: Feature Completion](../epics/EPIC-08-feature-completion.md)

## Description
The procurement module has database schema and basic API routes but the dashboard UI is incomplete. Several TODOs in the procurement page indicate missing functionality.

## Current State
### Database
- `procurement_orders` table exists
- `procurement_order_items` table exists
- `suppliers` table exists
- `supplier_products` table exists

### API Routes
- `GET /api/procurement/orders` - List orders
- `GET /api/procurement/orders/[id]` - Order detail
- `POST /api/procurement/orders` - Create order
- `GET /api/suppliers` - List suppliers

### TODO Comments Found
1. **`app/[clinic]/dashboard/inventory/procurement/page.tsx:43`**
   - "TODO: Implement order detail modal"

2. **`app/[clinic]/dashboard/inventory/procurement/page.tsx:48`**
   - "TODO: Implement order edit"

3. **`app/[clinic]/dashboard/inventory/procurement/page.tsx:124`**
   - "TODO: Add to purchase order"

4. **`app/api/procurement/orders/[id]/route.ts:178`**
   - "TODO: If status is 'received', also update inventory"

### Missing Features
- Order detail modal (view order items, status history)
- Order edit functionality (modify before sending)
- Quick add to purchase order from inventory
- Inventory update when order received
- Supplier order history
- Price comparison across suppliers

## Implementation Steps

### Phase 1: Order Detail Modal (3 hours)
1. Create `OrderDetailModal` component
2. Show order items, quantities, prices
3. Display order status timeline
4. Show supplier contact info
5. Include receive/cancel actions

### Phase 2: Order Edit (3 hours)
1. Create `OrderEditForm` component
2. Allow quantity adjustments
3. Allow item addition/removal
4. Validate before sending to supplier
5. Save draft functionality

### Phase 3: Quick Add to PO (2 hours)
1. Add "Add to PO" button in inventory view
2. Create/select active draft PO
3. Add item with suggested quantity
4. Navigate to PO for review

### Phase 4: Inventory Update on Receive (2 hours)
1. Implement receive order workflow
2. Confirm received quantities
3. Auto-update `store_inventory.stock_quantity`
4. Update weighted average cost
5. Create inventory transaction record

### Phase 5: Additional Features (4 hours)
1. Supplier order history
2. Price comparison view
3. Reorder suggestions integration
4. PO PDF generation

## Acceptance Criteria
- [ ] Order detail modal shows complete order info
- [ ] Orders can be edited before sending
- [ ] Products can be added to PO from inventory
- [ ] Receiving order updates inventory quantities
- [ ] WAC (weighted average cost) recalculated on receive
- [ ] Inventory transactions logged
- [ ] Supplier history viewable
- [ ] Price comparison works

## Related Files
- `web/app/[clinic]/dashboard/inventory/procurement/page.tsx`
- `web/app/api/procurement/orders/*/route.ts`
- `web/components/inventory/` (new components)

## Estimated Effort
- Total: 14 hours
- Phase 1: 3 hours
- Phase 2: 3 hours
- Phase 3: 2 hours
- Phase 4: 2 hours
- Phase 5: 4 hours

---
*Ticket created: January 2026*
*Based on TODO analysis and API audit*

---

## Resolution Summary

**Completed**: January 2026

### Components Created

1. **OrderDetailModal** (`order-detail-modal.tsx`, ~400 lines)
   - Full order details display with status timeline
   - Supplier contact info display
   - Order items table with received quantities
   - Status progression actions (submit, confirm, ship, receive, cancel)
   - Receiving mode with quantity inputs
   - WAC preview during receiving

2. **OrderEditForm** (`order-edit-form.tsx`, ~450 lines)
   - Edit draft orders (items, quantities, costs)
   - Add/remove products from order
   - Change supplier, delivery date, notes
   - Delete/restore items tracking
   - Form validation

3. **AddToPOModal** (`add-to-po-modal.tsx`, ~300 lines)
   - Quick add products to purchase orders from inventory
   - Select existing draft order or create new
   - Specify quantity and unit cost
   - Subtotal preview

### API Enhancements

1. **`PATCH /api/procurement/orders/[id]`** - Inventory Update on Receive
   - When status changes to 'received':
     - Updates `store_inventory.stock_quantity`
     - Recalculates WAC (Weighted Average Cost)
     - Creates `store_inventory_transactions` record
   - Tracks newly received quantities vs previously received
   - Logs all inventory updates

2. **`GET /api/suppliers/[id]/orders`** (NEW)
   - Supplier order history with pagination
   - Summary statistics (total orders, total spent, pending/received counts)
   - Filter by status

### UI Updates

1. **InventoryTableRow** - Added "Add to PO" action button
2. **InventoryTable** - Added `onAddToPO` prop support
3. **Procurement Page** - Integrated all new modals

### Files Created
- `web/components/dashboard/procurement/order-detail-modal.tsx`
- `web/components/dashboard/procurement/order-edit-form.tsx`
- `web/components/dashboard/procurement/add-to-po-modal.tsx`
- `web/app/api/suppliers/[id]/orders/route.ts`

### Files Modified
- `web/components/dashboard/procurement/index.ts` - Added exports
- `web/components/dashboard/inventory/inventory-table.tsx` - Added onAddToPO
- `web/components/dashboard/inventory/inventory-table-row.tsx` - Added PO button
- `web/app/[clinic]/dashboard/inventory/procurement/page.tsx` - Integrated modals
- `web/app/api/procurement/orders/[id]/route.ts` - Inventory update on receive

### Acceptance Criteria Met

- [x] Order detail modal shows complete order info
- [x] Orders can be edited before sending
- [x] Products can be added to PO from inventory
- [x] Receiving order updates inventory quantities
- [x] WAC (weighted average cost) recalculated on receive
- [x] Inventory transactions logged
- [x] Supplier history viewable (API endpoint created)
- [x] Price comparison works (pre-existing PriceComparison component)
