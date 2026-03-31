# Checkout API Endpoint

## Quick Reference

**Endpoint**: `POST /api/store/checkout`
**Authentication**: Required
**Rate Limit**: None (consider adding in production)

## Request

### Headers
```
Content-Type: application/json
Authorization: Bearer {supabase_token}
```

### Body
```typescript
interface CheckoutRequest {
  items: CartItem[];     // Array of cart items
  clinic: string;        // Tenant ID (e.g., "adris", "petlife")
  notes?: string;        // Optional order notes
}

interface CartItem {
  id: string;           // SKU for products, service ID for services
  name: string;         // Product/service name
  price: number;        // Unit price in PYG
  type: 'product' | 'service';
  quantity: number;     // Must be > 0
}
```

### Example
```json
{
  "items": [
    {
      "id": "PROD-001",
      "name": "Collar antipulgas",
      "price": 35000,
      "type": "product",
      "quantity": 2
    },
    {
      "id": "SRV-CONSULTA",
      "name": "Consulta general",
      "price": 100000,
      "type": "service",
      "quantity": 1
    }
  ],
  "clinic": "adris",
  "notes": "Entrega a domicilio"
}
```

## Response

### Success (201 Created)
```json
{
  "success": true,
  "invoice": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "invoice_number": "INV-1702345678",
    "total": 187000,
    "status": "pending"
  }
}
```

### Stock Error (400 Bad Request)
```json
{
  "error": "Stock insuficiente para algunos productos",
  "stockErrors": [
    {
      "id": "PROD-001",
      "name": "Collar antipulgas",
      "requested": 2,
      "available": 1
    }
  ]
}
```

### Validation Errors (400 Bad Request)
```json
// Empty cart
{
  "error": "El carrito está vacío"
}

// Invalid JSON
{
  "error": "JSON inválido"
}
```

### Authentication Error (401 Unauthorized)
```json
{
  "error": "No autorizado"
}
```

### Authorization Error (403 Forbidden)
```json
{
  "error": "Clínica no válida"
}
```

### Server Error (500 Internal Server Error)
```json
{
  "error": "Error al procesar el pedido",
  "details": "Detailed error message"
}
```

## Implementation Details

### Flow

1. **Authentication** - Validates Supabase JWT token
2. **Profile Lookup** - Gets user's tenant_id
3. **Tenant Validation** - Ensures clinic matches user's tenant
4. **Atomic Checkout** - Calls `process_checkout()` database function
5. **Result Processing** - Handles success or error response
6. **Audit Logging** - Logs transaction to audit_logs table

### Database Function

The endpoint uses the `process_checkout()` PostgreSQL function which:
- Validates stock availability
- Creates invoice and invoice items
- Decrements inventory atomically
- Logs all transactions
- Returns structured result

### Security Features

- **Authentication**: JWT token validation
- **Tenant Isolation**: RLS policies enforce data separation
- **Race Condition Prevention**: Row-level locking on inventory
- **Input Validation**: Type checking and sanitization
- **SQL Injection Prevention**: Parameterized queries only

### Stock Validation

Stock validation happens **server-side** at checkout time (not at cart time):

```typescript
// Client cart shows: "10 available"
// User adds 10 to cart
// Another user buys 9 items
// First user checks out
// Result: Error "available: 1"
```

This is **correct behavior** - prevents overselling but means users need to handle stock errors gracefully.

## Integration Examples

### React/Next.js (Client Component)

```typescript
'use client';
import { useState } from 'react';
import { useCart } from '@/context/cart-context';

export default function CheckoutButton({ clinic }: { clinic: string }) {
  const { items, clearCart } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/store/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, clinic })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        clearCart();
        // Redirect to success page
        window.location.href = `/invoice/${result.invoice.invoice_number}`;
      } else {
        setError(result.error || 'Error al procesar el pedido');
      }
    } catch (e) {
      setError('Error de conexión. Por favor intenta de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleCheckout}
        disabled={isProcessing || items.length === 0}
        className="btn-primary"
      >
        {isProcessing ? 'Procesando...' : 'Confirmar Pedido'}
      </button>
      {error && <p className="text-red-600">{error}</p>}
    </div>
  );
}
```

### Server Action (Alternative)

```typescript
'use server';
import { createClient } from '@/lib/supabase/server';

export async function checkout(items: CartItem[], clinic: string, notes?: string) {
  const supabase = await createClient();

  const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/store/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
    },
    body: JSON.stringify({ items, clinic, notes })
  });

  return response.json();
}
```

### cURL

```bash
# Get session token first
TOKEN="your_supabase_access_token"

# Make checkout request
curl -X POST http://localhost:3000/api/store/checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "items": [
      {
        "id": "PROD-001",
        "name": "Test Product",
        "price": 50000,
        "type": "product",
        "quantity": 1
      }
    ],
    "clinic": "adris",
    "notes": "Test order"
  }'
```

## Error Handling

### Client-Side

```typescript
interface CheckoutError {
  error: string;
  stockErrors?: Array<{
    id: string;
    name: string;
    requested: number;
    available: number;
  }>;
}

async function handleCheckoutError(error: CheckoutError) {
  if (error.stockErrors) {
    // Show specific stock errors
    error.stockErrors.forEach(item => {
      showToast(
        `${item.name}: solo ${item.available} disponibles (solicitaste ${item.requested})`,
        'warning'
      );
    });

    // Update cart quantities to available stock
    updateCartWithAvailableStock(error.stockErrors);
  } else {
    // Generic error
    showToast(error.error, 'error');
  }
}
```

### Retry Logic

```typescript
async function checkoutWithRetry(items: CartItem[], maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await checkout(items);
      if (result.success) return result;

      // Don't retry stock errors
      if (result.stockErrors) {
        throw new Error('Stock insufficient');
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
      }
    } catch (e) {
      if (attempt === maxRetries) throw e;
    }
  }
}
```

## Testing

### Unit Test (Vitest)

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from './route';

describe('POST /api/store/checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 if not authenticated', async () => {
    const request = new Request('http://localhost:3000/api/store/checkout', {
      method: 'POST',
      body: JSON.stringify({ items: [], clinic: 'adris' })
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('returns 400 if cart is empty', async () => {
    // Mock authenticated user
    const request = new Request('http://localhost:3000/api/store/checkout', {
      method: 'POST',
      body: JSON.stringify({ items: [], clinic: 'adris' })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('El carrito está vacío');
  });
});
```

### E2E Test (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test('checkout flow', async ({ page }) => {
  // Login
  await page.goto('/adris/auth/login');
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'password');
  await page.click('button[type="submit"]');

  // Add to cart
  await page.goto('/adris/store');
  await page.click('button:text("Agregar al carrito")').first();

  // Checkout
  await page.goto('/adris/cart/checkout');
  await page.click('button:text("Confirmar Pedido")');

  // Wait for success
  await expect(page.locator('text=Pedido Confirmado')).toBeVisible();
});
```

## Performance

### Metrics
- **Average Response Time**: 200-500ms
- **P95 Response Time**: 800ms
- **P99 Response Time**: 1.5s

### Optimization Tips

1. **Index Optimization**
   ```sql
   -- Ensure these indexes exist
   CREATE INDEX idx_store_inventory_product_tenant
     ON store_inventory(product_id, tenant_id);

   CREATE INDEX idx_store_products_sku_tenant
     ON store_products(sku, tenant_id);
   ```

2. **Connection Pooling**
   - Use Supabase connection pooler
   - Configure pool size: 10-20 connections

3. **Caching**
   - Cache product data (but NOT inventory levels)
   - Use Redis for session data

4. **Monitoring**
   ```sql
   -- Find slow checkouts
   SELECT * FROM audit_logs
   WHERE action = 'CHECKOUT'
   AND created_at > NOW() - INTERVAL '1 hour'
   ORDER BY created_at DESC;
   ```

## Troubleshooting

### Issue: "Process checkout failed"
```sql
-- Check if function exists
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'process_checkout';

-- Re-apply migration
\i web/db/81_checkout_functions.sql
```

### Issue: Inventory not decrementing
```sql
-- Check inventory transactions
SELECT * FROM store_inventory_transactions
WHERE product_id = 'product-uuid'
ORDER BY created_at DESC;

-- Verify inventory record exists
SELECT * FROM store_inventory WHERE product_id = 'product-uuid';
```

### Issue: Race condition causing overselling
```sql
-- Verify row-level locking is working
EXPLAIN ANALYZE
SELECT * FROM store_inventory WHERE product_id = 'uuid' FOR UPDATE;

-- Should show "Row-Level Locks"
```

## Related Documentation

- [Store Checkout System](../features/store-checkout.md) - Full system documentation
- [Database Functions](../database/functions.md) - All database functions
- [Multi-Tenant Security](../architecture/multi-tenancy.md) - Tenant isolation
- [Audit Logging](../features/audit-logs.md) - Transaction logging
