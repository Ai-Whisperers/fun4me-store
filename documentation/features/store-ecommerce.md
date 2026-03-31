# E-Commerce / Store Module

> **Last Updated**: January 2025
> **Status**: Production Ready

## Overview

The store module provides a complete e-commerce solution for veterinary clinics, including product management, shopping cart, checkout with prescription handling, wishlists, and stock alerts.

---

## Features

### Product Catalog

- **Product Listing**: Paginated product grid with filters
- **Categories & Brands**: Hierarchical categorization
- **Product Details**: Full product pages with images, variants, reviews
- **Search**: Full-text search across products
- **Quick View**: Modal preview without leaving the page

### Shopping Cart

- **Local Storage**: Works for guest users
- **Database Persistence**: Syncs to database for logged-in users
- **Stock Validation**: Prevents adding more than available stock
- **Prescription Items**: Flags items requiring prescriptions

### Checkout Flow

1. **Cart Review**: Display items with quantities and totals
2. **Prescription Upload**: For items requiring prescriptions
3. **Order Creation**: Creates order and reserves stock
4. **Confirmation**: Order number and WhatsApp coordination

### Prescription Workflow

For products marked as `is_prescription_required`:

1. **Customer**: Uploads prescription during checkout
2. **Order Status**: Set to `pending_prescription`
3. **Vet Dashboard**: Reviews prescriptions at `/dashboard/orders/prescriptions`
4. **Approval/Rejection**: Vet approves or rejects with reason
5. **Notification**: Customer notified of decision

### Wishlist

- **Add/Remove**: Toggle products on wishlist
- **Database Sync**: Persists for logged-in users
- **Dedicated Page**: `/[clinic]/portal/wishlist`
- **Quick Add to Cart**: One-click add from wishlist

### Stock Alerts

- **Notify When Available**: Subscribe to out-of-stock products
- **Email Collection**: Works for guests and logged-in users
- **Automatic Trigger**: Database trigger on stock restoration

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/store/products` | List products with filters |
| POST | `/api/store/products` | Create product (staff) |
| GET | `/api/store/products/[id]` | Product details |
| GET | `/api/store/search` | Product search |
| GET/PUT/DELETE | `/api/store/cart` | Cart persistence |
| POST | `/api/store/checkout` | Process checkout |
| GET/POST | `/api/store/orders` | Order management |
| GET | `/api/store/orders/pending-prescriptions` | Pending prescription orders |
| GET/PUT | `/api/store/orders/[id]/prescription` | Prescription review |
| POST | `/api/store/prescriptions/upload` | Upload prescription |
| GET/POST/DELETE | `/api/store/wishlist` | Wishlist CRUD |
| GET/POST | `/api/store/stock-alerts` | Stock alert subscriptions |
| POST | `/api/store/coupons/validate` | Validate coupon |
| GET/POST | `/api/store/reviews` | Product reviews |

---

## Database Tables

### Core Tables

| Table | Purpose |
|-------|---------|
| `store_products` | Product catalog |
| `store_categories` | Product categories |
| `store_brands` | Product brands |
| `store_product_variants` | Size/color variants |
| `store_product_images` | Product gallery |
| `store_inventory` | Stock levels |

### Order Tables

| Table | Purpose |
|-------|---------|
| `store_orders` | Customer orders |
| `store_order_items` | Order line items |
| `store_coupons` | Discount codes |
| `store_campaigns` | Promotional campaigns |

### User Engagement

| Table | Purpose |
|-------|---------|
| `store_carts` | Persistent carts |
| `store_wishlists` | User wishlists |
| `store_stock_alerts` | Back-in-stock subscriptions |
| `store_reviews` | Product reviews |

---

## Components

### Product Display

| Component | Location | Purpose |
|-----------|----------|---------|
| `EnhancedProductCard` | `components/store/` | Product grid card |
| `QuickViewModal` | `components/store/` | Quick product preview |
| `ProductGallery` | `components/store/` | Image carousel |

### Cart & Checkout

| Component | Location | Purpose |
|-----------|----------|---------|
| `CartProvider` | `context/cart-context.tsx` | Cart state management |
| `CartDrawer` | `components/store/` | Slide-out cart |
| `CheckoutClient` | `app/[clinic]/cart/checkout/` | Checkout flow |
| `PrescriptionUpload` | `components/store/` | Prescription file upload |

### Wishlist & Alerts

| Component | Location | Purpose |
|-----------|----------|---------|
| `WishlistProvider` | `context/wishlist-context.tsx` | Wishlist state |
| `WishlistClient` | `app/[clinic]/portal/wishlist/` | Wishlist page |
| `NotifyWhenAvailable` | `components/store/` | Stock alert subscription |

---

## Order Statuses

| Status | Description |
|--------|-------------|
| `pending` | Order created, awaiting processing |
| `pending_prescription` | Requires prescription review |
| `confirmed` | Order confirmed and processing |
| `shipped` | Order shipped |
| `delivered` | Order delivered |
| `cancelled` | Order cancelled |

---

## Prescription Order Flow

```
┌────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Customer      │     │  Vet Dashboard   │     │  Notification   │
│  Checkout      │────►│  Review Queue    │────►│  to Customer    │
└────────────────┘     └──────────────────┘     └─────────────────┘
        │                       │
        ▼                       ▼
   Upload Prescription    Approve/Reject
        │                       │
        ▼                       ▼
   status: pending_    status: confirmed
   prescription        OR cancelled
```

---

## Stock Validation

Stock is validated at multiple points:

1. **Cart Add**: Prevents adding more than available
2. **Quantity Update**: Caps at available stock
3. **Checkout**: Final validation before order creation

```typescript
// In cart-context.tsx
if (newItem.type === 'product' && newItem.stock !== undefined) {
  const existingQty = items.find(i => i.id === itemId)?.quantity ?? 0;
  if (existingQty + quantity > newItem.stock) {
    // Cap at available stock
    return prev.map(i => i.id === itemId ? { ...i, quantity: newItem.stock } : i);
  }
}
```

---

## Related Documentation

- [Store Checkout](store-checkout.md) - Detailed checkout flow
- [API Overview](../api/overview.md) - Complete API reference
- [Database Schema](../database/schema-reference.md) - Table definitions
