# Context Providers

React Context providers for global state management in the Vete platform.

> **Location**: `web/context/`
> **Last Updated**: January 2026

---

## Overview

The platform uses React Context for client-side state that needs to be shared across components:

| Context | Purpose | Persistence |
|---------|---------|-------------|
| `CartContext` | Shopping cart state | localStorage + Database |
| `NotificationContext` | Toast notifications | In-memory |
| `WishlistContext` | Product wishlist | localStorage + Database |

---

## Cart Context

Full-featured shopping cart with stock validation and database sync.

### Location

`web/context/cart-context.tsx`

### Provider Setup

```tsx
// In your layout
import { CartProvider } from '@/context/cart-context'

export default function Layout({ children }) {
  return (
    <CartProvider>
      {children}
    </CartProvider>
  )
}
```

### Hook Usage

```tsx
import { useCart } from '@/context/cart-context'

function ProductCard({ product }) {
  const { addItem, items, total, itemCount } = useCart()

  const handleAdd = () => {
    const result = addItem({
      id: product.id,
      name: product.name,
      price: product.current_price,
      type: 'product',
      image_url: product.image_url,
      stock: product.stock_quantity,
    })

    if (result.limitedByStock) {
      console.log(result.message) // "Solo hay X unidades disponibles"
    }
  }

  return (
    <button onClick={handleAdd}>
      Agregar al carrito ({itemCount})
    </button>
  )
}
```

### API Reference

```typescript
interface CartContextType {
  // State
  items: CartItem[]
  total: number
  itemCount: number
  discount: number

  // Actions
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => StockValidationResult
  updateQuantity: (id: string, delta: number) => StockValidationResult
  removeItem: (id: string) => void
  clearCart: () => void
  setDiscount: (value: number) => void

  // Database sync
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error'
  syncError: string | null
  isLoggedIn: boolean
  syncToDatabase: () => Promise<void>
  loadFromDatabase: () => Promise<void>

  // Stock helpers
  getStockStatus: (itemId: string) => StockStatus | null
}
```

### Cart Item Structure

```typescript
interface CartItem {
  id: string
  name: string
  price: number
  type: 'service' | 'product'
  quantity: number
  image_url?: string
  description?: string
  stock?: number  // Available stock for validation

  // Product-specific
  sku?: string
  variant_id?: string
  requires_prescription?: boolean
  prescription_file?: string

  // Service-specific
  pet_id?: string
  pet_name?: string
  pet_size?: PetSizeCategory
  service_id?: string
  service_icon?: string
  variant_name?: string
  base_price?: number
}
```

### Stock Validation

```typescript
interface StockValidationResult {
  success: boolean           // Whether any items were added
  limitedByStock: boolean    // If stock limited the quantity
  requestedQuantity: number  // What was requested
  actualQuantity: number     // What was actually added
  availableStock?: number    // Total available stock
  message?: string           // Spanish message for UI
}
```

### Persistence Strategy

1. **Initial Load**:
   - Load from localStorage
   - Check auth cookie for logged-in status
   - If logged in, fetch from `/api/store/cart`
   - Merge local + server (prefer higher quantities)

2. **On Changes**:
   - Save to localStorage immediately
   - Debounce database sync (500ms) for logged-in users

3. **Cart Item IDs**:
   - Products: `{product_id}`
   - Services: `{service_id}-{pet_id}-{variant_name}`

---

## Notification Context

Toast notification system with auto-dismiss and actions.

### Location

`web/context/notification-context.tsx`

### Provider Setup

```tsx
import { NotificationProvider } from '@/context/notification-context'

export default function Layout({ children }) {
  return (
    <NotificationProvider>
      {children}
    </NotificationProvider>
  )
}
```

### Hook Usage

```tsx
import { useNotifications } from '@/context/notification-context'

function SaveButton() {
  const { success, error } = useNotifications()

  const handleSave = async () => {
    try {
      await saveData()
      success('Datos guardados exitosamente')
    } catch (e) {
      error('Error al guardar los datos')
    }
  }

  return <button onClick={handleSave}>Guardar</button>
}
```

### API Reference

```typescript
interface NotificationContextType {
  notifications: Notification[]
  addNotification: (notification: NotificationInput) => string
  removeNotification: (id: string) => void
  clearAll: () => void

  // Convenience methods
  success: (message: string, options?: Partial<NotificationInput>) => string
  error: (message: string, options?: Partial<NotificationInput>) => string
  warning: (message: string, options?: Partial<NotificationInput>) => string
  info: (message: string, options?: Partial<NotificationInput>) => string
}
```

### Notification Types

| Type | Duration | Icon | Color |
|------|----------|------|-------|
| `success` | 3000ms | CheckCircle | Green |
| `error` | 5000ms | XCircle | Red |
| `warning` | 4000ms | AlertTriangle | Amber |
| `info` | 3000ms | Info | Blue |

### Advanced Usage

```tsx
// With title
success('Mascota creada', { title: 'Éxito' })

// With action button
info('Recordatorio: Actualiza tus datos', {
  action: {
    label: 'Actualizar',
    onClick: () => router.push('/settings')
  }
})

// Non-dismissible with custom duration
error('Error crítico', {
  dismissible: false,
  duration: 0  // Never auto-dismiss
})
```

### Notification Structure

```typescript
interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
  duration?: number
  dismissible?: boolean
  action?: {
    label: string
    onClick: () => void
  }
}
```

---

## Wishlist Context

Product wishlist with optimistic updates and database sync.

### Location

`web/context/wishlist-context.tsx`

### Provider Setup

```tsx
import { WishlistProvider } from '@/context/wishlist-context'

export default function Layout({ children }) {
  return (
    <WishlistProvider>
      {children}
    </WishlistProvider>
  )
}
```

### Hook Usage

```tsx
import { useWishlist } from '@/context/wishlist-context'

function ProductCard({ product }) {
  const { isWishlisted, toggleWishlist, isLoading } = useWishlist()

  const wishlisted = isWishlisted(product.id)

  return (
    <button
      onClick={() => toggleWishlist(product.id)}
      disabled={isLoading}
    >
      {wishlisted ? '❤️ Guardado' : '🤍 Guardar'}
    </button>
  )
}
```

### API Reference

```typescript
interface WishlistContextType {
  // State
  items: string[]  // Product IDs
  isLoading: boolean
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error'
  syncError: string | null
  itemCount: number
  isLoggedIn: boolean

  // Actions
  isWishlisted: (productId: string) => boolean
  toggleWishlist: (productId: string) => Promise<void>
  addToWishlist: (productId: string) => Promise<void>
  removeFromWishlist: (productId: string) => Promise<void>
  clearWishlist: () => void
}
```

### Persistence Strategy

1. **Storage Key**: `vete_wishlist`

2. **Initial Load**:
   - Load from localStorage
   - Check auth cookie
   - If logged in, fetch from `/api/store/wishlist`
   - Merge (union of local + server)
   - Sync any new local items to server

3. **On Changes**:
   - Optimistic update (immediate UI change)
   - Sync to server if logged in
   - Rollback on error

---

## Provider Composition

Recommended provider nesting order:

```tsx
// app/[clinic]/layout.tsx
import { CartProvider } from '@/context/cart-context'
import { WishlistProvider } from '@/context/wishlist-context'
import { NotificationProvider } from '@/context/notification-context'

export default function ClinicLayout({ children }) {
  return (
    <NotificationProvider>
      <CartProvider>
        <WishlistProvider>
          {children}
        </WishlistProvider>
      </CartProvider>
    </NotificationProvider>
  )
}
```

---

## Best Practices

### DO

- Use the convenience methods (`success`, `error`) for notifications
- Check `limitedByStock` when adding items to cart
- Handle sync errors gracefully
- Use optimistic updates for better UX

### DON'T

- Access context outside of provider tree
- Ignore stock validation results
- Block UI during sync operations
- Store sensitive data in context

### Error Handling

```tsx
const { addItem } = useCart()
const { error: showError } = useNotifications()

const handleAddToCart = () => {
  const result = addItem(product)

  if (!result.success) {
    showError(result.message || 'No se pudo agregar al carrito')
    return
  }

  if (result.limitedByStock) {
    // Show warning but item was partially added
    showWarning(result.message)
  }
}
```

---

## Related Documentation

- [Store Components](../features/store-components.md)
- [API Overview - Store Endpoints](../api/overview.md#e-commerce--store-18-endpoints)
- [Stock Reservation System](../development/stock-reservations.md)
