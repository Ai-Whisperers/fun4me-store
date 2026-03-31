# Veterinary Store UX Analysis & Recommendations

## Executive Summary

This document provides a comprehensive analysis of the current veterinary store implementation and outlines recommendations for creating an exceptional user experience tailored specifically for pet owners shopping for veterinary products.

---

## 1. Current Implementation Analysis

### What Works Well ✅

| Feature | Implementation | Notes |
|---------|---------------|-------|
| **Multi-tenant** | Dynamic `[clinic]` routing | Clean separation per clinic |
| **Search** | Real-time, debounced | Good performance |
| **Category Filter** | Sidebar with icons | Clear visual hierarchy |
| **Stock Display** | Real-time, badges | Prevents overselling |
| **Discount System** | Campaign-based | Flexible time-based promotions |
| **Cart Persistence** | localStorage | Survives page refresh |
| **Loyalty Points** | Integrated at checkout | Encourages repeat purchases |
| **Mobile Responsive** | Tailwind grid | Adapts to all screens |

### Critical Issues ❌

| Issue | Impact | Severity |
|-------|--------|----------|
| **No sorting options** | Users can't find cheapest/newest products | High |
| **No price filter** | Can't shop within budget | High |
| **No product details page** | Missing full descriptions, reviews | Critical |
| **Hardcoded categories** | Can't add new categories easily | Medium |
| **No pagination** | Performance degrades with many products | High |
| **No "back in stock" alerts** | Lost sales opportunity | Medium |
| **WhatsApp-only checkout** | Friction for some users | Medium |
| **No order history** | Poor customer experience | High |
| **No veterinary-specific filters** | Missing species, pet size filters | High |

---

## 2. Recommended Page Structure Reorganization

### Current Structure
```
/[clinic]/store           → All products (flat)
/[clinic]/cart            → Cart page
/[clinic]/cart/checkout   → WhatsApp checkout
```

### Proposed Structure
```
/[clinic]/store                           → Landing/Featured
/[clinic]/store/browse                    → All products with full filters
/[clinic]/store/category/[slug]           → Category pages with SEO
/[clinic]/store/product/[id]              → Product detail page (NEW)
/[clinic]/store/search                    → Search results page
/[clinic]/store/deals                     → Active promotions
/[clinic]/store/prescription              → Prescription products (NEW)
/[clinic]/cart                            → Shopping cart
/[clinic]/cart/checkout                   → Checkout flow
/[clinic]/account/orders                  → Order history (NEW)
/[clinic]/account/wishlist                → Saved products (NEW)
```

---

## 3. Store Homepage Redesign

### Current Layout
```
┌─────────────────────────────────────────────────────────────┐
│ [Header: Back | Search | Cart]                              │
├─────────────────────────────────────────────────────────────┤
│ [Hero: Title + Subtitle + CTA + Delivery Badge]             │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────┐  ┌───────────────────────────────────────────┐  │
│ │Category │  │ Product Grid (all products)               │  │
│ │ Filter  │  │  [Card] [Card] [Card]                     │  │
│ │ Sidebar │  │  [Card] [Card] [Card]                     │  │
│ └─────────┘  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Recommended Layout
```
┌─────────────────────────────────────────────────────────────┐
│ [Sticky Header]                                             │
│ [Logo] [Search Bar (expanded)] [Wishlist] [Cart] [Account]  │
├─────────────────────────────────────────────────────────────┤
│ [Category Navigation Bar - Horizontal Scroll on Mobile]     │
│ 🐕 Perros | 🐱 Gatos | 💊 Medicamentos | 🍖 Alimentos | ... │
├─────────────────────────────────────────────────────────────┤
│ [Hero Carousel - Promotions & Featured]                     │
│ ←  [Promo 1] [Promo 2] [Promo 3]  →                        │
├─────────────────────────────────────────────────────────────┤
│ [Quick Categories Grid - Visual Icons]                      │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐           │
│ │Food │ │Meds │ │Toys │ │Groom│ │Beds │ │More │           │
│ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘           │
├─────────────────────────────────────────────────────────────┤
│ [Featured Products Section]                                 │
│ ⭐ "Productos Destacados"                    [Ver Todos →]  │
│ [Card] [Card] [Card] [Card] →                               │
├─────────────────────────────────────────────────────────────┤
│ [Deals Section - Time-Limited]                              │
│ 🔥 "Ofertas de la Semana"  ⏰ Termina en 2d 5h  [Ver →]    │
│ [Deal Card] [Deal Card] [Deal Card]                         │
├─────────────────────────────────────────────────────────────┤
│ [Shop by Pet Section]                                       │
│ "Comprá según tu mascota"                                   │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│ │   🐕     │ │   🐱     │ │   🐦     │ │   🐰     │        │
│ │  Perros  │ │  Gatos   │ │   Aves   │ │ Pequeños │        │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
├─────────────────────────────────────────────────────────────┤
│ [Best Sellers Section]                                      │
│ 🏆 "Los Más Vendidos"                        [Ver Todos →]  │
│ [Card] [Card] [Card] [Card]                                 │
├─────────────────────────────────────────────────────────────┤
│ [New Arrivals Section]                                      │
│ ✨ "Recién Llegados"                         [Ver Todos →]  │
│ [Card] [Card] [Card] [Card]                                 │
├─────────────────────────────────────────────────────────────┤
│ [Brand Showcase - Horizontal Scroll]                        │
│ "Marcas de Confianza"                                       │
│ [Royal Canin] [Hills] [Purina] [Bayer] [Zoetis]             │
├─────────────────────────────────────────────────────────────┤
│ [Trust Badges]                                              │
│ 🚚 Envío Gratis +150k | 💳 Cuotas sin interés | ✅ Garantía │
├─────────────────────────────────────────────────────────────┤
│ [Newsletter Signup]                                         │
│ "Suscribite y recibí 10% de descuento en tu primera compra" │
│ [Email Input] [Suscribirse]                                 │
├─────────────────────────────────────────────────────────────┤
│ [Footer]                                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Product Browse Page (Full Catalog)

### Layout with Filters
```
┌─────────────────────────────────────────────────────────────┐
│ [Breadcrumb: Tienda > Categoría > Subcategoría]             │
├─────────────────────────────────────────────────────────────┤
│ [Results Bar]                                               │
│ "248 productos" | [Sort: Relevancia ▼] | [Vista: Grid/List] │
├──────────────┬──────────────────────────────────────────────┤
│              │                                              │
│ [FILTERS     │  [Product Grid with Pagination]              │
│  SIDEBAR]    │                                              │
│              │  [Card] [Card] [Card] [Card]                 │
│ ▼ Categoría  │  [Card] [Card] [Card] [Card]                 │
│   □ Alimentos│  [Card] [Card] [Card] [Card]                 │
│   □ Medicinas│                                              │
│   □ Juguetes │  ────────────────────────────                │
│              │                                              │
│ ▼ Mascota    │  [1] [2] [3] ... [12] [→]                   │
│   □ Perro    │                                              │
│   □ Gato     │                                              │
│   □ Ave      │                                              │
│              │                                              │
│ ▼ Tamaño     │                                              │
│   □ Mini     │                                              │
│   □ Pequeño  │                                              │
│   □ Mediano  │                                              │
│   □ Grande   │                                              │
│              │                                              │
│ ▼ Edad       │                                              │
│   □ Cachorro │                                              │
│   □ Adulto   │                                              │
│   □ Senior   │                                              │
│              │                                              │
│ ▼ Precio     │                                              │
│ [---|----]   │                                              │
│ 0 - 500,000  │                                              │
│              │                                              │
│ ▼ Marca      │                                              │
│   □ Royal C. │                                              │
│   □ Hills    │                                              │
│              │                                              │
│ ▼ Condición  │                                              │
│   □ Urinario │                                              │
│   □ Digestivo│                                              │
│   □ Piel     │                                              │
│              │                                              │
│ [Limpiar]    │                                              │
│              │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

### Mobile Filter Experience
```
┌────────────────────────┐
│ [Header + Search]      │
├────────────────────────┤
│ [Filter] [Sort ▼]      │  ← Sticky buttons
│ [Active: Perro ✕]      │  ← Active filter chips
├────────────────────────┤
│ 248 productos          │
├────────────────────────┤
│ [Card]                 │
│ [Card]                 │
│ [Card]                 │
│ [Load More Button]     │
└────────────────────────┘

Filter opens as bottom sheet:
┌────────────────────────┐
│ ─── Filtros ───    ✕   │
├────────────────────────┤
│ Categoría           >  │
│ Mascota             >  │
│ Tamaño              >  │
│ Precio              >  │
│ Marca               >  │
│ Condición Especial  >  │
├────────────────────────┤
│ [Limpiar]  [Aplicar]   │
└────────────────────────┘
```

---

## 5. Product Detail Page (NEW - Critical Feature)

### Desktop Layout
```
┌─────────────────────────────────────────────────────────────┐
│ [Breadcrumb: Tienda > Alimentos > Perros > Royal Canin]     │
├────────────────────────────┬────────────────────────────────┤
│                            │                                │
│ ┌────────────────────────┐ │ [Brand Logo]                   │
│ │                        │ │                                │
│ │   MAIN PRODUCT IMAGE   │ │ Royal Canin Medium Adult       │
│ │                        │ │ ⭐⭐⭐⭐☆ (4.2) · 128 reseñas   │
│ │                        │ │                                │
│ └────────────────────────┘ │ SKU: RC-MED-ADU-15             │
│                            │                                │
│ [Thumb] [Thumb] [Thumb]    │ ─────────────────────────────  │
│                            │                                │
│                            │ Gs. 450.000  (Gs. 520.000)     │
│                            │ ───────────  ~~~~~~~~~~~~      │
│                            │    actual     tachado          │
│                            │                                │
│                            │ 🏷️ Ahorrás Gs. 70.000 (13%)    │
│                            │                                │
│                            │ ─────────────────────────────  │
│                            │                                │
│                            │ Tamaño:                        │
│                            │ [3kg] [7.5kg] [●15kg] [20kg]   │
│                            │                                │
│                            │ ─────────────────────────────  │
│                            │                                │
│                            │ ✅ En Stock · 12 disponibles   │
│                            │ 🚚 Envío: Mañana (Asunción)    │
│                            │                                │
│                            │ Cantidad: [- 1 +]              │
│                            │                                │
│                            │ [🛒 AGREGAR AL CARRITO    ]    │
│                            │ [♡ Agregar a Lista de Deseos]  │
│                            │                                │
│                            │ ─────────────────────────────  │
│                            │                                │
│                            │ 🏆 10 puntos de lealtad        │
│                            │ 💳 Hasta 6 cuotas sin interés  │
│                            │ ✅ Devolución gratis 15 días   │
│                            │                                │
├────────────────────────────┴────────────────────────────────┤
│                                                             │
│ [Descripción] [Especificaciones] [Reseñas (128)]           │
│ ─────────────────────────────────────────────────          │
│                                                             │
│ DESCRIPCIÓN:                                                │
│ Royal Canin Medium Adult es un alimento seco completo      │
│ formulado específicamente para perros adultos de razas     │
│ medianas (11-25 kg) desde los 12 meses hasta los 7 años.   │
│                                                             │
│ Beneficios:                                                │
│ • Mantiene el peso ideal con L-carnitina                   │
│ • Favorece la digestión con proteínas de alta calidad      │
│ • Fortalece las defensas naturales con antioxidantes       │
│                                                             │
│ Modo de uso:                                                │
│ Ver tabla de alimentación según peso del perro...          │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ [📋 ESPECIFICACIONES]                                       │
│                                                             │
│ Especie:          Perro                                    │
│ Etapa de Vida:    Adulto (1-7 años)                        │
│ Tamaño de Raza:   Mediana (11-25 kg)                       │
│ Tipo:             Alimento Seco (Croquetas)                │
│ Peso Neto:        15 kg                                    │
│ Origen:           Francia                                  │
│ Ingredientes:     Maíz, proteína deshidratada...           │
│ Análisis Garantizado:                                      │
│   - Proteína: 25%                                          │
│   - Grasa: 14%                                             │
│   - Fibra: 2.5%                                            │
│   - Humedad: 8%                                            │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ [⭐ RESEÑAS DE CLIENTES]                                    │
│                                                             │
│ Calificación General: 4.2/5                                │
│ ██████████░░ 5⭐ (78)                                       │
│ ██████░░░░░░ 4⭐ (32)                                       │
│ ███░░░░░░░░░ 3⭐ (12)                                       │
│ █░░░░░░░░░░░ 2⭐ (4)                                        │
│ ░░░░░░░░░░░░ 1⭐ (2)                                        │
│                                                             │
│ [Escribir Reseña]                                          │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ ⭐⭐⭐⭐⭐  "Excelente calidad"                       │    │
│ │ María G. · Verificado · hace 3 días                 │    │
│ │                                                     │    │
│ │ Mi perro Luna adora este alimento. Desde que lo    │    │
│ │ cambié, su pelo está más brillante y tiene más     │    │
│ │ energía. El envío fue rápido. Muy recomendado!     │    │
│ │                                                     │    │
│ │ 👍 Útil (12)  · Reportar                           │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│ [Ver más reseñas...]                                        │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ [PRODUCTOS RELACIONADOS]                                    │
│ "Clientes que compraron este producto también vieron"       │
│                                                             │
│ [Card] [Card] [Card] [Card] →                               │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ [COMPLEMENTOS RECOMENDADOS]                                 │
│ "Completá la compra para tu mascota"                        │
│                                                             │
│ [Card: Snacks] [Card: Bowl] [Card: Vitaminas]               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Enhanced Product Card Design

### Current Card
```
┌────────────────────┐
│ [Badge: Category]  │
│ [Badge: Discount]  │
│ ┌────────────────┐ │
│ │    IMAGE       │ │
│ └────────────────┘ │
│ Product Name       │
│ Description...     │
│ Gs 120.000 (150k)  │
│ [Qty: -1+] [🛒]    │
└────────────────────┘
```

### Enhanced Card
```
┌────────────────────────────────────────┐
│ [♡]                    [⚡ OFERTA 20%] │  ← Wishlist + Promo badge
│ ┌────────────────────────────────────┐ │
│ │                                    │ │
│ │           PRODUCT IMAGE            │ │
│ │                                    │ │
│ │    [Quick View Eye Icon on Hover]  │ │
│ │                                    │ │
│ └────────────────────────────────────┘ │
│                                        │
│ Royal Canin                            │  ← Brand name (subtle)
│ Medium Adult 15kg                      │  ← Product name (bold)
│                                        │
│ ⭐⭐⭐⭐☆ (4.2) · 128                   │  ← Rating + review count
│                                        │
│ Gs. 450.000  ̶G̶s̶.̶ ̶5̶2̶0̶.̶0̶0̶0̶             │  ← Price with strikethrough
│                                        │
│ ✅ En Stock                            │  ← Stock status
│ 🚚 Envío mañana                        │  ← Delivery promise
│                                        │
│ [🛒 AGREGAR]                           │  ← Full-width CTA
│                                        │
│ 🏆 +10 puntos lealtad                  │  ← Loyalty points earned
└────────────────────────────────────────┘
```

### List View Option (Alternative)
```
┌─────────────────────────────────────────────────────────────┐
│ ┌─────────┐                                                 │
│ │         │  Royal Canin Medium Adult 15kg                  │
│ │  IMAGE  │  ⭐⭐⭐⭐☆ (4.2) · 128 reseñas                    │
│ │         │                                                 │
│ │         │  Alimento seco premium para perros adultos de   │
│ │         │  razas medianas. Fórmula con L-carnitina...     │
│ └─────────┘                                                 │
│            ✅ En Stock · 🚚 Envío mañana                     │
│                                                             │
│            Gs. 450.000  ̶G̶s̶.̶ ̶5̶2̶0̶.̶0̶0̶0̶   [- 1 +] [🛒 AGREGAR] │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Complete Filter System

### Filter Categories for Veterinary Store

```typescript
interface StoreFilters {
  // Basic Filters
  category: string[];           // Alimentos, Medicamentos, Accesorios, etc.
  subcategory: string[];        // Alimento Seco, Alimento Húmedo, Snacks

  // Pet-Specific Filters (CRITICAL for vet store)
  species: string[];            // Perro, Gato, Ave, Reptil, Pez, Roedor
  breed_size: string[];         // Mini (<4kg), Pequeño, Mediano, Grande, Gigante
  life_stage: string[];         // Cachorro, Junior, Adulto, Senior

  // Health & Special Needs
  health_condition: string[];   // Urinario, Digestivo, Piel, Articulaciones, Peso
  special_diet: string[];       // Hipoalergénico, Sin Granos, Light, Alto Proteína
  prescription_required: boolean;

  // Product Attributes
  brand: string[];              // Royal Canin, Hills, Purina, Bayer, etc.
  price_range: {
    min: number;
    max: number;
  };

  // Availability
  in_stock_only: boolean;
  on_sale: boolean;
  new_arrivals: boolean;        // Added in last 30 days

  // Rating
  min_rating: number;           // 1-5 stars
}
```

### Sorting Options

```typescript
type SortOption =
  | 'relevance'       // Default - based on popularity + stock
  | 'price_low_high'  // Precio: menor a mayor
  | 'price_high_low'  // Precio: mayor a menor
  | 'newest'          // Más recientes
  | 'rating'          // Mejor calificados
  | 'best_selling'    // Más vendidos
  | 'name_asc'        // Nombre: A-Z
  | 'discount'        // Mayor descuento
```

---

## 8. Additional Features Checklist

### Product Discovery & Search

| Feature | Priority | Description |
|---------|----------|-------------|
| **Autocomplete Search** | High | Suggestions as user types with product images |
| **Search Filters in Results** | High | Apply filters directly from search results |
| **Recent Searches** | Medium | Remember user's search history |
| **Voice Search** | Low | Mobile voice input for search |
| **Barcode Scanner** | Medium | Scan product barcode to find in store |
| **Visual Search** | Low | Upload pet photo to get recommendations |

### Product Information

| Feature | Priority | Description |
|---------|----------|-------------|
| **Product Detail Page** | Critical | Full product info, specs, reviews |
| **Image Gallery** | High | Multiple product images with zoom |
| **360° View** | Low | Interactive product rotation |
| **Video Content** | Medium | Usage videos, unboxing |
| **Size Guide** | High | Pet size to product size mapping |
| **Ingredient List** | High | Full ingredient breakdown |
| **Nutritional Info** | High | Guaranteed analysis table |
| **Feeding Calculator** | High | Calculate daily portions by pet weight |
| **PDF Download** | Medium | Product datasheet download |

### Social & Trust

| Feature | Priority | Description |
|---------|----------|-------------|
| **Customer Reviews** | High | Star ratings with text reviews |
| **Photo Reviews** | Medium | Customers upload pet photos with product |
| **Review Filters** | Medium | Filter by rating, verified purchase |
| **Q&A Section** | Medium | Customer questions answered by staff/others |
| **Share Product** | Low | Social media sharing buttons |
| **Veterinarian Recommended** | High | Badge for vet-approved products |

### Personalization

| Feature | Priority | Description |
|---------|----------|-------------|
| **Wishlist** | High | Save products for later |
| **Pet Profiles** | High | Store pet info for personalized recommendations |
| **Recently Viewed** | High | Quick access to browsed products |
| **Recommended For You** | Medium | AI-based recommendations |
| **"Complete Your Purchase"** | Medium | Suggested complementary items |
| **Auto-Reorder** | Medium | Subscription for recurring purchases |
| **Compare Products** | Medium | Side-by-side comparison tool |

### Shopping Experience

| Feature | Priority | Description |
|---------|----------|-------------|
| **Quick View Modal** | High | Preview product without leaving page |
| **Bulk Add to Cart** | Medium | Select multiple products at once |
| **Buy Again** | High | Quick reorder from past purchases |
| **Gift Options** | Low | Gift wrapping, gift message |
| **Volume Discounts** | Medium | Tiered pricing for quantity |
| **Bundle Deals** | Medium | Pre-configured product bundles |
| **Price Alert** | Medium | Notify when price drops |
| **Stock Alert** | High | Notify when back in stock |

### Checkout & Payment

| Feature | Priority | Description |
|---------|----------|-------------|
| **Guest Checkout** | Medium | Purchase without account |
| **Saved Cards** | Medium | Remember payment methods |
| **Multiple Payment Options** | High | Cards, bank transfer, digital wallets |
| **Coupon Codes** | High | Manual discount code entry |
| **Order Notes** | Medium | Special instructions field |
| **Delivery Scheduling** | Medium | Choose delivery date/time |
| **Store Pickup** | Medium | Reserve and collect in clinic |
| **Split Payment** | Low | Pay part now, part later |
| **Installment Plans** | High | Interest-free monthly payments |

### Post-Purchase

| Feature | Priority | Description |
|---------|----------|-------------|
| **Order History** | High | View all past orders |
| **Order Tracking** | High | Real-time delivery updates |
| **Reorder** | High | Quick repurchase of past items |
| **Invoice Download** | High | PDF invoice for records |
| **Returns Request** | Medium | Online return initiation |
| **Review Prompt** | Medium | Email asking for product review |
| **Loyalty Dashboard** | High | View points, tier status, rewards |

### Veterinary-Specific Features

| Feature | Priority | Description |
|---------|----------|-------------|
| **Prescription Products** | Critical | Require vet approval for certain items |
| **Prescription Upload** | High | Upload vet prescription document |
| **Link to Medical Records** | High | Recommend products based on pet conditions |
| **Dosage Calculator** | High | Calculate medication dosage by pet weight |
| **Drug Interaction Check** | Medium | Warn about conflicting medications |
| **Vaccine Reminder Products** | Medium | Suggest products due for renewal |
| **Diet Transition Guide** | Medium | Instructions for switching foods |
| **Condition-Specific Bundles** | Medium | Curated products for health conditions |

---

## 9. Mobile-First Enhancements

### Bottom Navigation (Mobile)
```
┌─────────────────────────────────────┐
│  🏠      🔍      🛒      ❤️      👤 │
│ Inicio  Buscar  Carrito Lista  Cuenta│
└─────────────────────────────────────┘
```

### Sticky Add to Cart (Product Page Mobile)
```
┌─────────────────────────────────────┐
│ Gs. 450.000        [🛒 AGREGAR]     │
└─────────────────────────────────────┘
```

### Pull to Refresh
- Update product availability on pull down

### Swipe Actions
- Swipe product card to add to wishlist
- Swipe cart item to delete

### Skeleton Loading
```
┌────────────────────┐
│ ████████████████   │  ← Animated loading state
│ ████████████████   │
│ ██████████         │
│ ████               │
└────────────────────┘
```

---

## 10. Performance Optimizations

### Current Issues
1. All products loaded on initial page load
2. No image optimization/lazy loading
3. Client-side filtering (no server pagination)
4. Campaign calculations on every request

### Recommended Solutions

```typescript
// Pagination API
GET /api/store/products?
  page=1&
  limit=24&
  sort=relevance&
  category=alimentos&
  species=perro&
  price_min=0&
  price_max=500000

// Response with pagination metadata
{
  products: [...],
  pagination: {
    page: 1,
    limit: 24,
    total: 248,
    pages: 11,
    hasNext: true,
    hasPrev: false
  },
  filters: {
    applied: { category: "alimentos", species: "perro" },
    available: {
      categories: [{ slug: "alimentos", count: 85 }, ...],
      species: [{ id: "perro", count: 150 }, ...],
      brands: [{ name: "Royal Canin", count: 32 }, ...],
      price_range: { min: 15000, max: 850000 }
    }
  }
}
```

### Image Optimization
```typescript
// Use Next.js Image component with blur placeholder
<Image
  src={product.image_url}
  alt={product.name}
  width={256}
  height={256}
  placeholder="blur"
  blurDataURL={product.blur_hash}
  loading="lazy"
/>
```

### Cache Strategy
```typescript
// Cache products list for 5 minutes
// Revalidate on product update
export const revalidate = 300;

// Use SWR for client-side caching
const { data, error, isLoading } = useSWR(
  `/api/store/products?${searchParams}`,
  fetcher,
  { revalidateOnFocus: false }
);
```

---

## 11. Database Schema Enhancements

### New Tables Required

```sql
-- Product Variants (sizes, flavors, etc.)
CREATE TABLE store_product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES store_products(id) ON DELETE CASCADE,
  tenant_id TEXT REFERENCES tenants(id),
  sku TEXT NOT NULL,
  name TEXT NOT NULL,              -- "15kg", "Pollo", etc.
  variant_type TEXT NOT NULL,      -- "size", "flavor", "color"
  price_modifier NUMERIC(12,2) DEFAULT 0,
  stock_quantity INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(tenant_id, sku)
);

-- Product Reviews
CREATE TABLE store_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES store_products(id) ON DELETE CASCADE,
  tenant_id TEXT REFERENCES tenants(id),
  user_id UUID REFERENCES profiles(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  content TEXT,
  is_verified_purchase BOOLEAN DEFAULT FALSE,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Review Images
CREATE TABLE store_review_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID REFERENCES store_reviews(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

-- Wishlist
CREATE TABLE store_wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES store_products(id) ON DELETE CASCADE,
  tenant_id TEXT REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Stock Alerts (notify when back in stock)
CREATE TABLE store_stock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES store_products(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  notified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product Tags for filtering
CREATE TABLE store_product_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES store_products(id) ON DELETE CASCADE,
  tag_type TEXT NOT NULL,          -- "species", "life_stage", "health_condition"
  tag_value TEXT NOT NULL,         -- "perro", "adulto", "urinario"
  UNIQUE(product_id, tag_type, tag_value)
);

-- Brands
CREATE TABLE store_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT REFERENCES tenants(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  logo_url TEXT,
  description TEXT,
  is_featured BOOLEAN DEFAULT FALSE,
  UNIQUE(tenant_id, slug)
);

-- Add brand_id to products
ALTER TABLE store_products
ADD COLUMN brand_id UUID REFERENCES store_brands(id);

-- Product Q&A
CREATE TABLE store_product_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES store_products(id) ON DELETE CASCADE,
  tenant_id TEXT REFERENCES tenants(id),
  user_id UUID REFERENCES profiles(id),
  question TEXT NOT NULL,
  answer TEXT,
  answered_by UUID REFERENCES profiles(id),
  answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recently Viewed
CREATE TABLE store_recently_viewed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES store_products(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Coupon Codes
CREATE TABLE store_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT REFERENCES tenants(id),
  code TEXT NOT NULL,
  discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed_amount', 'free_shipping')),
  discount_value NUMERIC(12,2) NOT NULL,
  minimum_purchase NUMERIC(12,2) DEFAULT 0,
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(tenant_id, code)
);

-- Prescription Products
CREATE TABLE store_prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT REFERENCES tenants(id),
  user_id UUID REFERENCES profiles(id),
  pet_id UUID REFERENCES pets(id),
  product_id UUID REFERENCES store_products(id),
  vet_id UUID REFERENCES profiles(id),
  prescription_url TEXT,           -- Uploaded prescription document
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  valid_until DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Enhanced Product Table

```sql
-- Add new columns to store_products
ALTER TABLE store_products ADD COLUMN IF NOT EXISTS
  short_description TEXT,                    -- For card display
  specifications JSONB,                      -- Technical specs
  features TEXT[],                           -- Bullet points
  species TEXT[],                            -- ['perro', 'gato']
  life_stages TEXT[],                        -- ['adulto', 'senior']
  breed_sizes TEXT[],                        -- ['mediano', 'grande']
  health_conditions TEXT[],                  -- ['urinario', 'digestivo']
  is_prescription_required BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  is_new_arrival BOOLEAN DEFAULT FALSE,
  weight NUMERIC(10,2),                      -- Product weight in grams
  dimensions JSONB,                          -- {length, width, height}
  meta_title TEXT,                           -- SEO
  meta_description TEXT,                     -- SEO
  avg_rating NUMERIC(2,1) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  sales_count INTEGER DEFAULT 0,             -- For "best selling" sort
  sort_order INTEGER DEFAULT 0;
```

---

## 12. Implementation Priority

### Phase 1: Foundation (Week 1-2)
1. ✅ Product Detail Page
2. ✅ Pagination API
3. ✅ Server-side filtering
4. ✅ Basic sorting options
5. ✅ Image optimization

### Phase 2: Discovery (Week 3-4)
1. Enhanced search with autocomplete
2. Full filter sidebar (species, life stage, etc.)
3. Price range filter
4. Brand filter
5. Mobile filter bottom sheet

### Phase 3: Engagement (Week 5-6)
1. Wishlist functionality
2. Recently viewed products
3. Stock alerts (back in stock)
4. Customer reviews system
5. Related products

### Phase 4: Conversion (Week 7-8)
1. Quick view modal
2. Coupon code system
3. Order history page
4. Improved checkout flow
5. Multiple payment options

### Phase 5: Veterinary Features (Week 9-10)
1. Prescription product workflow
2. Pet profile recommendations
3. Dosage calculator integration
4. Condition-specific bundles
5. Link to medical records

---

## 13. Key UI Components to Build

```typescript
// New components needed
components/
├── store/
│   ├── product-detail/
│   │   ├── product-gallery.tsx       // Image gallery with zoom
│   │   ├── product-info.tsx          // Main product info section
│   │   ├── product-options.tsx       // Variant selector
│   │   ├── product-tabs.tsx          // Description/Specs/Reviews tabs
│   │   ├── related-products.tsx      // Carousel of related items
│   │   └── feeding-calculator.tsx    // Pet-specific dosage calc
│   ├── filters/
│   │   ├── filter-sidebar.tsx        // Desktop filter panel
│   │   ├── filter-drawer.tsx         // Mobile bottom sheet
│   │   ├── price-range-slider.tsx    // Min/max price input
│   │   ├── filter-chip.tsx           // Active filter badge
│   │   └── sort-dropdown.tsx         // Sort options menu
│   ├── search/
│   │   ├── search-bar.tsx            // With autocomplete
│   │   ├── search-suggestions.tsx    // Dropdown suggestions
│   │   └── search-results.tsx        // Results with filters
│   ├── product-grid.tsx              // Paginated grid
│   ├── product-list.tsx              // List view alternative
│   ├── quick-view-modal.tsx          // Product preview
│   ├── wishlist-button.tsx           // Add to wishlist
│   └── stock-alert-form.tsx          // Notify when in stock
├── reviews/
│   ├── review-list.tsx
│   ├── review-form.tsx
│   ├── review-summary.tsx            // Rating breakdown
│   └── review-card.tsx
├── account/
│   ├── order-history.tsx
│   ├── order-detail.tsx
│   └── wishlist-page.tsx
└── checkout/
    ├── coupon-input.tsx
    ├── payment-options.tsx
    └── delivery-options.tsx
```

---

## 14. Success Metrics

### Key Performance Indicators (KPIs)

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| **Page Load Time** | ~3s | <1.5s | Lighthouse |
| **Bounce Rate** | Unknown | <40% | Analytics |
| **Add to Cart Rate** | Unknown | >5% | Events |
| **Cart Abandonment** | Unknown | <70% | Funnel |
| **Conversion Rate** | Unknown | >2% | Orders/Visits |
| **Avg Order Value** | Unknown | +20% | Analytics |
| **Return Customer Rate** | Unknown | >30% | User tracking |
| **Search Success Rate** | Unknown | >80% | Search analytics |
| **Mobile Conversion** | Unknown | Match desktop | Device segment |

### User Experience Metrics

| Metric | Measurement Method |
|--------|-------------------|
| **Task Success Rate** | Can users find and purchase products? |
| **Time to First Purchase** | How long from landing to checkout? |
| **Search Refinement Rate** | Do users need multiple searches? |
| **Filter Usage Rate** | Are filters helping discovery? |
| **Wishlist Engagement** | Do saved items convert to sales? |
| **Review Engagement** | Are reviews influencing purchases? |

---

## 15. Conclusion

The current store implementation provides a solid foundation but lacks several critical features expected in a modern veterinary e-commerce experience. The most impactful improvements are:

1. **Product Detail Page** - Critical for conversion
2. **Advanced Filtering** - Pet-specific filters are essential
3. **Pagination** - Required for scalability
4. **Wishlist** - High engagement feature
5. **Reviews** - Trust building for pet products
6. **Prescription Workflow** - Unique to veterinary stores

By implementing these recommendations in phases, the store can evolve from a basic product catalog to a comprehensive veterinary e-commerce platform that provides an exceptional user experience for pet owners.

---

*Document Version: 1.0*
*Created: December 2024*
*Author: Claude AI Assistant*
