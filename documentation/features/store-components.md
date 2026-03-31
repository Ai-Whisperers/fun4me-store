# Store / E-Commerce Components

React components for the veterinary e-commerce module.

> **Location**: `web/components/store/`
> **Last Updated**: January 2026

---

## Overview

The store module provides a complete e-commerce solution with:
- Product display components (cards, galleries, quick view)
- Filter and search components
- Cart and checkout integration
- Wishlist and stock notifications
- Prescription upload handling

---

## Component Architecture

```
components/store/
├── index.ts                    # Main exports
├── product-card.tsx            # Primary product display
├── quick-view-modal/           # Product quick view modal
│   ├── index.tsx
│   ├── image-gallery.tsx
│   ├── product-info.tsx
│   ├── action-buttons.tsx
│   ├── benefits-grid.tsx
│   └── quantity-selector.tsx
├── product-detail/             # Product detail page components
│   ├── product-gallery.tsx
│   ├── product-tabs.tsx
│   └── related-products.tsx
├── filters/                    # Product filtering
│   ├── filter-sidebar.tsx
│   ├── filter-drawer.tsx
│   ├── filter-chips.tsx
│   ├── sort-dropdown.tsx
│   ├── price-range-slider.tsx
│   └── category-tree.tsx
├── search-autocomplete.tsx     # Search with suggestions
├── notify-when-available.tsx   # Out-of-stock notifications
├── prescription-upload.tsx     # Prescription file upload
├── loyalty-widget.tsx          # Loyalty points display
├── buy-again-section.tsx       # Previously purchased items
├── subscribe-button.tsx        # Subscription products
└── order-invoice-pdf.tsx       # PDF invoice generation
```

---

## Core Components

### ProductCard

The primary product display component with two variants.

```typescript
import { ProductCard } from '@/components/store'

interface ProductCardProps {
  product: ProductListItem
  clinic: string
  variant?: 'minimal' | 'full'
  currencySymbol?: string
  showWishlist?: boolean
  showQuickView?: boolean
  showRatings?: boolean
  showBrand?: boolean
  showLoyaltyPoints?: boolean
  showQuantitySelector?: boolean
  onQuickView?: (product: ProductListItem) => void
}
```

#### Minimal Variant

Simple display for compact listings:

```tsx
<ProductCard
  product={product}
  clinic="adris"
  variant="minimal"
/>
```

Features:
- Category badge
- Quantity selector
- Low stock warning
- Add to cart button

#### Full Variant

Feature-rich display (default):

```tsx
<ProductCard
  product={product}
  clinic="adris"
  variant="full"
  onQuickView={(p) => setQuickViewProduct(p)}
/>
```

Features:
- Wishlist button
- Quick view on hover
- Ratings/reviews
- Brand name
- Loyalty points earning
- Discount/New/Bestseller badges
- Stock status

#### Custom Configuration

```tsx
<ProductCard
  product={product}
  clinic="adris"
  showWishlist={false}
  showQuickView={true}
  showRatings={true}
  showLoyaltyPoints={false}
  currencySymbol="$"
/>
```

---

### QuickViewModal

Modal for quick product preview without leaving the page.

```tsx
import { QuickViewModal } from '@/components/store'

<QuickViewModal
  product={selectedProduct}
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  clinic="adris"
/>
```

Sub-components:
- `ImageGallery` - Product images with thumbnails
- `ProductInfo` - Name, price, description
- `ActionButtons` - Add to cart, wishlist
- `BenefitsGrid` - Product benefits
- `QuantitySelector` - Quantity input

---

### SearchAutocomplete

Product search with autocomplete suggestions.

```tsx
import { SearchAutocomplete } from '@/components/store'

<SearchAutocomplete
  clinic="adris"
  placeholder="Buscar productos..."
  onSelect={(product) => router.push(`/${clinic}/store/product/${product.id}`)}
/>
```

Features:
- Debounced search
- Category suggestions
- Recent searches
- Keyboard navigation

---

## Filter Components

### FilterSidebar

Desktop filter panel with categories, price, brands.

```tsx
import { FilterSidebar } from '@/components/store'

<FilterSidebar
  categories={categories}
  brands={brands}
  priceRange={{ min: 0, max: 100000 }}
  selectedFilters={filters}
  onFilterChange={setFilters}
/>
```

### FilterDrawer

Mobile-friendly filter drawer.

```tsx
import { FilterDrawer } from '@/components/store'

<FilterDrawer
  isOpen={isFilterOpen}
  onClose={() => setIsFilterOpen(false)}
  filters={filters}
  onApply={setFilters}
/>
```

### FilterChips

Active filter display with remove buttons.

```tsx
import { FilterChips } from '@/components/store'

<FilterChips
  filters={activeFilters}
  onRemove={(key) => removeFilter(key)}
  onClearAll={() => clearAllFilters()}
/>
```

### SortDropdown

Product sorting options.

```tsx
import { SortDropdown } from '@/components/store'

<SortDropdown
  value={sortBy}
  onChange={setSortBy}
  options={[
    { value: 'price_asc', label: 'Precio: Menor a Mayor' },
    { value: 'price_desc', label: 'Precio: Mayor a Menor' },
    { value: 'name', label: 'Nombre A-Z' },
    { value: 'newest', label: 'Más Recientes' },
  ]}
/>
```

### PriceRangeSlider

Dual-handle price filter.

```tsx
import { PriceRangeSlider } from '@/components/store'

<PriceRangeSlider
  min={0}
  max={1000000}
  value={priceRange}
  onChange={setPriceRange}
  currencySymbol="Gs"
/>
```

---

## Product Detail Components

### ProductGallery

Main product image gallery with zoom.

```tsx
import { ProductGallery } from '@/components/store/product-detail'

<ProductGallery
  images={product.images}
  productName={product.name}
/>
```

### ProductTabs

Information tabs (description, specs, reviews).

```tsx
import { ProductTabs } from '@/components/store/product-detail'

<ProductTabs
  description={product.description}
  specifications={product.specifications}
  reviews={product.reviews}
/>
```

### RelatedProducts

Carousel of related products.

```tsx
import { RelatedProducts } from '@/components/store/product-detail'

<RelatedProducts
  categoryId={product.category_id}
  currentProductId={product.id}
  clinic="adris"
/>
```

---

## Utility Components

### NotifyWhenAvailable

Stock notification signup for out-of-stock products.

```tsx
import { NotifyWhenAvailable } from '@/components/store'

<NotifyWhenAvailable
  productId={product.id}
  clinic="adris"
  variant="inline" | "button"
/>
```

### PrescriptionUpload

Upload prescription for regulated products.

```tsx
import { PrescriptionUpload } from '@/components/store'

<PrescriptionUpload
  orderId={order.id}
  onUploadComplete={(url) => setPresriptionUrl(url)}
/>
```

### LoyaltyWidget

Display loyalty points and earning potential.

```tsx
import { LoyaltyWidget } from '@/components/store'

<LoyaltyWidget
  currentPoints={user.loyaltyPoints}
  potentialPoints={Math.floor(cartTotal / 10000)}
/>
```

### BuyAgainSection

Previously purchased products carousel.

```tsx
import { BuyAgainSection } from '@/components/store'

<BuyAgainSection
  userId={user.id}
  clinic="adris"
  limit={10}
/>
```

### SubscribeButton

Subscription product purchase button.

```tsx
import { SubscribeButton } from '@/components/store'

<SubscribeButton
  productId={product.id}
  frequency="monthly"
  price={product.subscription_price}
/>
```

---

## Context Integration

### Cart Context

```typescript
import { useCart } from '@/context/cart-context'

const { items, addItem, removeItem, updateQuantity, total } = useCart()

// Add to cart
addItem({
  id: product.id,
  name: product.name,
  price: product.current_price,
  type: 'product',
  image_url: product.image_url,
  stock: product.stock_quantity,
}, quantity)
```

### Wishlist Context

```typescript
import { useWishlist } from '@/context/wishlist-context'

const { isWishlisted, toggleWishlist, wishlistItems } = useWishlist()

// Check if wishlisted
if (isWishlisted(product.id)) {
  // ...
}

// Toggle wishlist
await toggleWishlist(product.id)
```

---

## Type Definitions

### ProductListItem

```typescript
interface ProductListItem {
  id: string
  name: string
  sku: string | null
  short_description: string | null
  image_url: string | null
  current_price: number
  original_price: number | null
  has_discount: boolean
  discount_percentage: number | null
  is_new_arrival: boolean
  is_best_seller: boolean
  stock_quantity?: number
  inventory?: { stock_quantity: number }
  avg_rating?: number
  review_count?: number
  brand?: { name: string }
  category?: { name: string }
}
```

---

## Styling

All components use:
- Tailwind CSS utility classes
- CSS variables for theming: `var(--primary)`, `var(--text-primary)`
- Responsive design (mobile-first)
- Dark mode support via CSS variables

Example:
```tsx
<button className="bg-[var(--primary)] text-white hover:scale-[1.02]">
  Agregar al carrito
</button>
```

---

## Deprecated Components

| Component | Replacement | Notes |
|-----------|-------------|-------|
| `EnhancedProductCard` | `ProductCard` with `variant="full"` | Use unified ProductCard |

Migration:
```tsx
// OLD
import { EnhancedProductCard } from '@/components/store'
<EnhancedProductCard product={p} clinic="adris" />

// NEW
import { ProductCard } from '@/components/store'
<ProductCard product={p} clinic="adris" variant="full" />
```

---

## Related Documentation

- [E-Commerce Feature Overview](overview.md#e-commerce--store)
- [Store API Endpoints](../api/overview.md#e-commerce--store-18-endpoints)
- [Cart Context](../architecture/context-providers.md)
- [Stock Reservation System](../development/stock-reservations.md)
