# Week 3 - Store Module Migration Ticket

**Created**: January 19, 2026  
**Priority**: P1 - HIGH  
**Effort**: 10-12 hours  
**Status**: Ready for implementation  
**Blocking**: E-commerce revenue, product sales, checkout

---

## Executive Summary

Migrate Store/E-commerce module from legacy service pattern (`lib/services/store-service.ts`) to domain-driven pattern (`lib/domain/store/`). Third critical migration after User and Inventory modules.

### Why This Module?
- **Revenue Critical**: Powers entire e-commerce flow (products, cart, checkout, orders)
- **High Complexity**: 764 lines, most complex service in codebase
- **Integration Heavy**: Depends on Inventory, User, Payment modules
- **Customer-Facing**: Direct impact on user experience and sales conversion

---

## Current State Analysis

**File**: `web/lib/services/store-service.ts` (764 lines)  
**Pattern**: Monolithic service extending BaseService  
**Dependencies**: inventory-service, user-service, payment integrations

**Public Methods** (7+ primary):
1. `listProducts(tenantId, filters)` - List products with stock info
2. `getProduct(id, tenantId)` - Get single product with availability
3. `getCart(userId, tenantId)` - Get user's shopping cart
4. `updateCartItem(userId, tenantId, productId, quantity)` - Add/update/remove cart items
5. `checkout(userId, tenantId, data)` - Process checkout (order creation)
6. `getOrderHistory(userId, tenantId)` - Get user's order history
7. Private helpers for cart management, stock validation, pricing

**Key Features**:
- Product catalog management
- Shopping cart (session + persistent)
- Stock availability checking
- Cart reservations (hold stock during checkout)
- Order creation (atomic)
- Coupon/discount application
- Prescription product handling
- Multi-item checkout
- Order history tracking

---

## Target Architecture

```
web/lib/domain/store/
├── types.ts              # Types (Product, Cart, Order, CheckoutData, etc.)
├── repository.ts         # Database queries (products, carts, orders)
├── service.ts            # Business logic (checkout, cart, order management)
├── queries.ts            # Specialized queries (catalog, order summaries)
└── index.ts              # Public API exports
```

### Key Components

#### `types.ts` - Type Definitions
```typescript
export interface Product {
  id: string;
  tenant_id: string;
  name: string;
  sku: string;
  price: number;
  cost?: number | null;
  category: ProductCategory;
  description?: string | null;
  image_url?: string | null;
  is_prescription_required: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductWithStock extends Product {
  stock_quantity: number;
  available_quantity: number;
  is_in_stock: boolean;
}

export interface Cart {
  id: string;
  user_id: string;
  tenant_id: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  product: Product;
}

export interface Order {
  id: string;
  tenant_id: string;
  user_id: string;
  order_number: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  payment_method?: string | null;
  payment_status: PaymentStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export type OrderStatus = 
  | 'pending' | 'confirmed' | 'processing' 
  | 'ready' | 'delivered' | 'cancelled';

export type PaymentStatus = 
  | 'pending' | 'paid' | 'failed' | 'refunded';

export interface CheckoutData {
  items: CartItem[];
  payment_method: string;
  coupon_code?: string;
  notes?: string;
  pet_id?: string; // For prescription products
}
```

#### `repository.ts` - Data Access Layer
```typescript
export class StoreRepository {
  constructor(private supabase: SupabaseClient) {}

  // Product queries
  async findProducts(tenantId: string, filters?: ProductFilters): Promise<ProductWithStock[]>
  async findProductById(id: string, tenantId: string): Promise<ProductWithStock | null>
  
  // Cart queries
  async findCart(userId: string, tenantId: string): Promise<Cart | null>
  async findCartItems(cartId: string): Promise<CartItem[]>
  
  // Order queries
  async findOrders(userId: string, tenantId: string): Promise<Order[]>
  async findOrderById(id: string, tenantId: string): Promise<Order | null>
}
```

#### `service.ts` - Business Logic Layer
```typescript
export class StoreService {
  constructor(
    private repository: StoreRepository,
    private inventoryService: InventoryService, // Dependency
    private supabase: SupabaseClient
  ) {}

  // Cart management
  async getCart(userId: string, tenantId: string): Promise<ServiceResult<Cart>>
  async addToCart(userId: string, tenantId: string, productId: string, quantity: number): Promise<ServiceResult<Cart>>
  async updateCartItem(userId: string, tenantId: string, itemId: string, quantity: number): Promise<ServiceResult<Cart>>
  async removeFromCart(userId: string, tenantId: string, itemId: string): Promise<ServiceResult<Cart>>
  async clearCart(userId: string, tenantId: string): Promise<ServiceResult<void>>
  
  // Checkout (CRITICAL OPERATION)
  async checkout(userId: string, tenantId: string, data: CheckoutData): Promise<ServiceResult<Order>>
  
  // Order management
  async getOrderHistory(userId: string, tenantId: string): Promise<ServiceResult<Order[]>>
  async getOrder(orderId: string, tenantId: string): Promise<ServiceResult<Order>>
  async cancelOrder(orderId: string, userId: string, tenantId: string): Promise<ServiceResult<void>>
  
  // Private helpers
  private async validateStock(items: CartItem[]): Promise<boolean>
  private async calculatePricing(items: CartItem[], couponCode?: string): Promise<OrderPricing>
  private async reserveStock(items: CartItem[], tenantId: string): Promise<void>
  private async releaseReservations(items: CartItem[], tenantId: string): Promise<void>
}
```

#### `queries.ts` - Specialized Queries
```typescript
export async function getProductCatalog(tenantId: string, category?: string, supabase: SupabaseClient): Promise<ProductWithStock[]>
export async function searchProducts(query: string, tenantId: string, supabase: SupabaseClient): Promise<ProductWithStock[]>
export async function getPopularProducts(tenantId: string, limit: number, supabase: SupabaseClient): Promise<ProductWithStock[]>
export async function getOrderSummary(orderId: string, tenantId: string, supabase: SupabaseClient): Promise<OrderSummary>
export async function getSalesSummary(tenantId: string, startDate: string, endDate: string, supabase: SupabaseClient): Promise<SalesSummary>
```

---

## Critical Business Logic

### Checkout Flow (ATOMIC OPERATION)

```typescript
async checkout(
  userId: string,
  tenantId: string,
  data: CheckoutData
): Promise<ServiceResult<Order>> {
  try {
    // 1. Validate cart not empty
    if (data.items.length === 0) {
      return { success: false, error: 'El carrito está vacío' };
    }
    
    // 2. Validate stock availability
    const stockValid = await this.validateStock(data.items);
    if (!stockValid) {
      return { success: false, error: 'Algunos productos no tienen stock suficiente' };
    }
    
    // 3. Calculate pricing (apply coupons, tax, etc.)
    const pricing = await this.calculatePricing(data.items, data.coupon_code);
    
    // 4. Reserve stock (prevents overselling)
    await this.reserveStock(data.items, tenantId);
    
    try {
      // 5. Create order (atomic database transaction)
      const { data: order, error: orderError } = await this.supabase.rpc(
        'create_order_atomic',
        {
          p_user_id: userId,
          p_tenant_id: tenantId,
          p_items: data.items,
          p_pricing: pricing,
          p_payment_method: data.payment_method,
          p_notes: data.notes,
          p_pet_id: data.pet_id
        }
      );
      
      if (orderError) throw orderError;
      
      // 6. Adjust inventory (deduct stock)
      for (const item of data.items) {
        await this.inventoryService.adjustStock(
          item.product_id,
          tenantId,
          -item.quantity, // Negative for sale
          'sale',
          {
            reference_type: 'order',
            reference_id: order.id,
            performed_by: userId
          }
        );
      }
      
      // 7. Clear cart
      await this.clearCart(userId, tenantId);
      
      return { success: true, data: order };
      
    } catch (error) {
      // Rollback: Release stock reservations
      await this.releaseReservations(data.items, tenantId);
      throw error;
    }
    
  } catch (error) {
    console.error('[StoreService/checkout] Failed:', { userId, tenantId, error });
    return { success: false, error: 'Error al procesar el pedido' };
  }
}
```

**Why atomic?**:
- Order creation + inventory adjustment must succeed together
- Stock reservations prevent overselling during checkout
- Rollback mechanism if any step fails
- Maintains data consistency

---

## Migration Steps

### Phase 1: Foundation (4-5 hours)

1. **Create directory structure**
2. **Extract types** (`types.ts`)
3. **Implement repository** (`repository.ts`)
4. **Implement service** (`service.ts`) - CRITICAL: Atomic checkout logic
5. **Implement queries** (`queries.ts`)
6. **Create public API** (`index.ts`)

**Validation**: Checkout flow works correctly with test orders

---

### Phase 2: Migration (4-5 hours)

1. **Find all imports** (expected: 15+ files)
   - Store pages (product listing, cart, checkout)
   - API routes (products, cart, checkout, orders)
   - Components (product cards, cart widget, order history)

2. **Update imports file-by-file**
   - **CRITICAL**: Test checkout flow after each change
   - **CRITICAL**: Verify inventory integration works

3. **Update tests**
   - Unit tests for service logic
   - Integration tests for checkout flow
   - E2E tests for user journey

---

### Phase 3: Cleanup (2 hours)

1. **Remove legacy code**
   ```bash
   rm web/lib/services/store-service.ts
   ```

2. **Full validation**
   - Test checkout flow end-to-end
   - Verify stock adjustments
   - Check order creation
   - Test cart persistence

---

## Acceptance Criteria

### Must Have (Blocking)
- [ ] Domain types defined
- [ ] Repository with all queries
- [ ] Service with atomic checkout logic
- [ ] All methods migrated
- [ ] All imports updated (0 legacy imports)
- [ ] Legacy file deleted
- [ ] Tests passing at 80%+
- [ ] **Checkout flow is atomic** (order + inventory)
- [ ] **Stock reservations work** (no overselling)
- [ ] **Cart persistence works**
- [ ] **Order history correct**

### Critical Test Cases
- [ ] Successful checkout reduces inventory
- [ ] Failed checkout releases reservations
- [ ] Out-of-stock products blocked from checkout
- [ ] Concurrent checkouts handle stock correctly
- [ ] Prescription products require pet_id

---

## Files to Create (5 files)

```
web/lib/domain/store/
├── types.ts              # 200-250 lines
├── repository.ts         # 250-300 lines
├── service.ts            # 350-400 lines (complex checkout logic)
├── queries.ts            # 150-200 lines
└── index.ts              # 30-40 lines
```

**Total new code**: ~980-1190 lines

---

## Files to Update (15+ files)

### Store Pages (5 files)
- `web/app/[clinic]/store/page.tsx` - Product catalog
- `web/app/[clinic]/store/[productId]/page.tsx` - Product detail
- `web/app/[clinic]/cart/page.tsx` - Shopping cart
- `web/app/[clinic]/checkout/page.tsx` - Checkout
- `web/app/[clinic]/portal/orders/page.tsx` - Order history

### API Routes (5 files)
- `web/app/api/products/route.ts`
- `web/app/api/cart/route.ts`
- `web/app/api/checkout/route.ts`
- `web/app/api/orders/route.ts`
- `web/app/api/orders/[id]/route.ts`

### Components (5+ files)
- `web/components/store/product-card.tsx`
- `web/components/store/cart-widget.tsx`
- `web/components/store/checkout-form.tsx`
- `web/components/store/order-summary.tsx`
- `web/components/store/order-history-list.tsx`

---

## Files to Delete (1 file)

```
web/lib/services/store-service.ts  # 764 lines
```

---

## Security Considerations

1. **Tenant Isolation**: ALWAYS filter by `tenant_id`
2. **Stock Validation**: Verify stock before order creation
3. **Prescription Products**: Require `pet_id` and prescription file
4. **Price Tampering**: Recalculate prices server-side (never trust client)
5. **Atomic Operations**: Use database transactions for checkout
6. **Reservation Timeouts**: Auto-release after 10 minutes
7. **Audit Trail**: Log all order creation attempts

---

## Testing Strategy

**Unit Tests**:
- Pricing calculations
- Stock validation
- Cart operations
- Coupon application

**Integration Tests**:
- Checkout flow (happy path)
- Checkout flow (stock validation failure)
- Checkout flow (payment failure)
- Inventory adjustment after order

**E2E Tests**:
- Complete purchase journey:
  1. Browse products
  2. Add to cart
  3. Proceed to checkout
  4. Complete order
  5. Verify order history
  6. Check inventory updated

**Critical Test**: Concurrent checkout race condition
```typescript
it('should handle concurrent checkouts for same product', async () => {
  // Two users checkout same product simultaneously
  // Only one should succeed (or both if enough stock)
  const [result1, result2] = await Promise.all([
    service.checkout(user1, 'adris', { items: [lastItem] }),
    service.checkout(user2, 'adris', { items: [lastItem] })
  ]);
  
  // At most one should succeed
  const successCount = [result1, result2].filter(r => r.success).length;
  expect(successCount).toBeLessThanOrEqual(1);
})
```

---

## Rollback Plan

If migration causes checkout failures or revenue loss:

1. **IMMEDIATE rollback** from git (highest priority)
2. **Verify no orphaned orders or stock issues**
3. **Manual reconciliation** if data corruption occurred
4. **Deploy hotfix**
5. **Post-mortem**: Why did it fail? What was missed?

**CRITICAL**: This module directly impacts revenue. Test exhaustively before deploying.

---

## Timeline

**Week 3 Day 4-5** (12 hours total)
- Day 4 Morning (4h): Phase 1 - Foundation
- Day 4 Afternoon (4h): Phase 2 - Migration (part 1)
- Day 5 Morning (4h): Phase 2 - Migration (part 2) + Phase 3 - Cleanup

---

## Dependencies

**Must complete BEFORE starting**:
- ✅ User module migration (for user queries)
- ✅ Inventory module migration (for stock management)

**Store module depends on**:
- UserService (customer data)
- InventoryService (stock validation, adjustments)

---

## Related Documentation

- [WEEK_3_USER_MODULE_MIGRATION.md](WEEK_3_USER_MODULE_MIGRATION.md)
- [WEEK_3_INVENTORY_MODULE_MIGRATION.md](WEEK_3_INVENTORY_MODULE_MIGRATION.md)
- [DOMAIN_MIGRATION_AUDIT.md](docs/archive/analysis/DOMAIN_MIGRATION_AUDIT.md)

---

**Status**: Ready for Implementation  
**Depends On**: User + Inventory migrations complete  
**Next Steps**: Begin Phase 1 after dependencies are done

---

**⚠️ CRITICAL REMINDER**: This module handles revenue. Test exhaustively. Verify checkout flow works correctly. Monitor error rates after deployment.
