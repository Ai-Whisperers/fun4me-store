# Store & Inventory System - Comprehensive Analysis

## Executive Summary

This document provides a complete analysis of the store and inventory system, including the global catalog architecture, clinic-specific product management, and recommendations for implementing the required features.

---

## 1. Current Database Architecture

### 1.1 Global Catalog System

The system implements a **two-tier product catalog**:

#### Tier 1: Global Catalog (Market-wide)

- **Purpose**: Track all products, brands, and providers available in the market
- **Implementation**: Products with `tenant_id = NULL` and `is_global_catalog = TRUE`
- **Tables**:
  - `store_products` (global entries)
  - `store_brands` (global entries)
  - `store_categories` (global entries)
  - `suppliers` (global entries)

#### Tier 2: Clinic-Specific Products

- **Purpose**: Products unique to a clinic
- **Implementation**: Products with `tenant_id = SET` (clinic ID)
- **Tables**:
  - `store_products` (local entries)
  - `store_brands` (local entries)
  - `store_categories` (local entries)

### 1.2 Clinic Product Assignment System

**Table**: `clinic_product_assignments`

**Purpose**: Links global catalog products to clinics with custom pricing and settings.

```sql
CREATE TABLE clinic_product_assignments (
    id UUID PRIMARY KEY,
    tenant_id TEXT NOT NULL,              -- Which clinic
    catalog_product_id UUID NOT NULL,     -- Reference to global product
    sale_price NUMERIC(12,2) NOT NULL,     -- Clinic's custom price
    min_stock_level NUMERIC(12,2),
    location TEXT,                        -- Storage location
    requires_prescription BOOLEAN,
    margin_percentage NUMERIC(5,2),       -- Auto-calculated
    is_active BOOLEAN DEFAULT true,
    UNIQUE(tenant_id, catalog_product_id)
);
```

**How it works**:

1. Global catalog products exist with `tenant_id = NULL`
2. Clinic selects a product from global catalog
3. System creates entry in `clinic_product_assignments` with clinic's pricing
4. Clinic can now see/manage this product in their inventory
5. Inventory is tracked in `store_inventory` table (per clinic, per product)

### 1.3 Inventory Tracking

**Table**: `store_inventory`

```sql
CREATE TABLE store_inventory (
    id UUID PRIMARY KEY,
    product_id UUID NOT NULL,             -- Can be global or local product
    tenant_id TEXT NOT NULL,              -- Which clinic
    stock_quantity NUMERIC(12,2),
    reserved_quantity NUMERIC(12,2),
    available_quantity NUMERIC(12,2) GENERATED,
    min_stock_level NUMERIC(12,2),
    reorder_quantity NUMERIC(12,2),
    weighted_average_cost NUMERIC(12,2),
    location TEXT,
    bin_number TEXT,
    batch_number TEXT,
    expiry_date DATE,                     -- ✅ Supports expiration dates
    supplier_name TEXT,
    UNIQUE(product_id)                    -- One inventory record per product
);
```

**Key Features**:

- ✅ Supports expiration dates (`expiry_date`)
- ✅ Batch tracking (`batch_number`)
- ✅ Location tracking (`location`, `bin_number`)
- ✅ Weighted Average Cost (WAC) calculation
- ✅ Stock alerts via `min_stock_level`

### 1.4 Inventory Transactions

**Table**: `store_inventory_transactions`

Tracks all inventory movements:

- `purchase` - Stock in, updates WAC
- `sale` - Stock out
- `adjustment` - Manual correction
- `return` - Stock back in
- `damage` - Stock loss
- `theft` - Stock loss
- `expired` - Stock loss due to expiration
- `transfer` - Between locations

---

## 2. Current Implementation Status

### 2.1 Store Frontend (`/[clinic]/store`)

**Current State**:

- ✅ Shows only clinic's products (filtered by `tenant_id`)
- ✅ Displays products from:
  - Local products (`tenant_id = clinic`)
  - Global products assigned via `clinic_product_assignments`
- ✅ Product search and filtering
- ✅ Category navigation
- ✅ Stock status display
- ✅ Shopping cart functionality

**API**: `GET /api/store/products?clinic={clinic}`

**Query Logic**:

```sql
-- Returns products where:
-- 1. tenant_id = clinic (local products)
-- OR
-- 2. id IN (SELECT catalog_product_id FROM clinic_product_assignments WHERE tenant_id = clinic)
```

### 2.2 Inventory Management (`/[clinic]/portal/inventory`)

**Current State**:

- ✅ Displays clinic's inventory items
- ✅ Search and filter by category
- ✅ Stock level filtering (in stock, low stock, out of stock)
- ✅ Quick edit for price and stock
- ✅ Bulk import/export via Excel
- ✅ Stats dashboard (total products, low stock count, inventory value)
- ✅ Low stock and expiring product alerts
- ✅ Pagination support

**Missing Features**:

- ❌ **Screen to browse and add products from global catalog** (CRITICAL)
- ❌ **Full inventory editing** (expiration dates, batch numbers, location)
- ❌ **Batch/expiry date management UI**
- ❌ **Location/bin management UI**

### 2.3 Product Creation

**Current State**:

- ✅ Clinics can create local products via inventory import
- ✅ Products created with `tenant_id = clinic`
- ✅ Supports all product fields (name, SKU, price, stock, etc.)

**API**: `POST /api/inventory/import`

---

## 3. Requirements Analysis

### 3.1 Global Catalog Tracking ✅

**Requirement**: "We want to keep track of all products, brands, providers in the market"

**Status**: ✅ **IMPLEMENTED**

- Global catalog exists with `tenant_id = NULL`
- Brands, categories, suppliers all support global entries
- Seed data populates global catalog from JSON files
- Function `get_catalog_products()` available for querying

### 3.2 Clinic Product Tracking ✅

**Requirement**: "Each clinic will want to track what products from the complete data we have they have in their clinic"

**Status**: ✅ **IMPLEMENTED**

- `clinic_product_assignments` table links global products to clinics
- `store_inventory` tracks stock per clinic
- Clinics can see their assigned products in inventory screen

### 3.3 Clinic Custom Products ✅

**Requirement**: "They should be able to add their own products"

**Status**: ✅ **IMPLEMENTED**

- Clinics can create products with `tenant_id = clinic`
- Products created via inventory import API
- Local products appear in clinic's store and inventory

### 3.4 Store Shows Only Clinic Products ✅

**Requirement**: "In each clinic's store we only want to show them their products"

**Status**: ✅ **IMPLEMENTED**

- Store API filters by clinic
- Returns only:
  - Local products (`tenant_id = clinic`)
  - Global products assigned to clinic (`clinic_product_assignments`)

### 3.5 Inventory Screen - View Items ✅

**Requirement**: "In the inventory of the clinic they should have 1 screen to see their inventory items"

**Status**: ✅ **IMPLEMENTED**

- Route: `/[clinic]/portal/inventory`
- Shows all clinic's inventory items
- Search, filter, pagination
- Stats and alerts

### 3.6 Inventory Screen - Add from Catalog ❌

**Requirement**: "Another screen to be able to select items from the complete list to decide if they want to add to their store"

**Status**: ❌ **MISSING - CRITICAL FEATURE**

**What's Needed**:

1. New route: `/[clinic]/portal/inventory/catalog` or modal/page
2. Browse global catalog products
3. Search/filter global catalog
4. "Add to Clinic" button for each product
5. On click: Create `clinic_product_assignments` entry
6. Prompt for clinic-specific settings:
   - Sale price
   - Min stock level
   - Location
   - Initial stock (optional)

**Implementation Approach**:

```typescript
// New API endpoint
GET /api/inventory/catalog?clinic={clinic}&search={query}&category={slug}

// Returns:
// - Global catalog products NOT yet assigned to clinic
// - With option to show all (including already assigned)

// New API endpoint
POST /api/inventory/catalog/assign
{
  catalog_product_id: UUID,
  sale_price: number,
  min_stock_level?: number,
  location?: string,
  initial_stock?: number
}

// Creates clinic_product_assignments entry
// Optionally creates initial inventory record
```

### 3.7 Inventory Editing - Expiration & Fields ❌

**Requirement**: "In the inventory screen they should be able to update the inventory and if a product has an expiration date or any other field that needs to be filled it should be filled"

**Status**: ⚠️ **PARTIALLY IMPLEMENTED**

**Current State**:

- ✅ Can update stock quantity
- ✅ Can update price
- ❌ Cannot update expiration date via UI
- ❌ Cannot update batch number via UI
- ❌ Cannot update location/bin via UI
- ❌ Cannot update supplier info via UI

**What's Needed**:

1. Enhanced edit modal/form with all inventory fields:
   - Stock quantity
   - Expiration date (date picker)
   - Batch number
   - Location
   - Bin number
   - Supplier name
   - Min stock level
   - Reorder quantity
2. Validation for expiration dates
3. Alerts for expiring products (already exists in alerts API)
4. Batch tracking UI

---

## 4. Database Schema Review

### 4.1 Current Schema Strengths

✅ **Global Catalog Support**

- Products, brands, categories, suppliers all support `tenant_id = NULL`
- Unique constraints handle global vs local properly
- `is_global_catalog` flag for verification

✅ **Clinic Assignment System**

- `clinic_product_assignments` properly links global to clinic
- Supports custom pricing per clinic
- Margin calculation automated

✅ **Inventory Tracking**

- Comprehensive inventory fields
- Expiration date support
- Batch tracking
- Location tracking
- WAC calculation

✅ **Transaction History**

- Complete audit trail
- Multiple transaction types
- Reference tracking

### 4.2 Schema Gaps

⚠️ **Missing Fields** (if needed):

- Product images array (exists but not fully utilized)
- Product variants (sizes, flavors) - currently handled via separate SKUs
- Product reviews (exists in schema but not in inventory context)
- Product tags for filtering (species, life stage, etc.)

✅ **All Required Fields Exist**:

- Expiration dates: `store_inventory.expiry_date` ✅
- Batch numbers: `store_inventory.batch_number` ✅
- Location: `store_inventory.location` ✅
- Bin number: `store_inventory.bin_number` ✅
- Supplier: `store_inventory.supplier_name` ✅

---

## 5. Implementation Recommendations

### 5.1 Priority 1: Catalog Browser Screen (CRITICAL)

**Route**: `/[clinic]/portal/inventory/catalog`

**Features**:

1. Browse global catalog products
2. Search and filter (category, brand, species)
3. Show which products are already assigned to clinic
4. "Add to Clinic" button for unassigned products
5. Modal/form to configure clinic-specific settings:
   - Sale price (pre-filled with catalog `base_price`)
   - Min stock level
   - Location
   - Initial stock (optional)
   - Requires prescription override

**API Endpoints Needed**:

```typescript
// Get global catalog (excluding already assigned)
GET /api/inventory/catalog?clinic={clinic}&search={query}&category={slug}&brand={slug}&page={page}&limit={limit}

// Response includes:
// - Products from global catalog
// - Flag indicating if already assigned to clinic
// - Current assignment details if assigned

// Assign product to clinic
POST /api/inventory/catalog/assign
{
  catalog_product_id: UUID,
  sale_price: number,
  min_stock_level?: number,
  location?: string,
  initial_stock?: number,
  requires_prescription?: boolean
}

// Response:
// - Creates clinic_product_assignments entry
// - Optionally creates store_inventory entry if initial_stock > 0
// - Returns success with product details
```

**UI Components**:

```typescript
// New components
components/inventory/
├── catalog-browser.tsx          // Main catalog browser page
├── catalog-product-card.tsx     // Product card with "Add" button
├── assign-product-modal.tsx     // Modal for configuring assignment
└── catalog-filters.tsx          // Filter sidebar for catalog
```

### 5.2 Priority 2: Enhanced Inventory Editing

**Enhancement**: Expand current edit modal to include all inventory fields

**Current Edit Modal Fields**:

- Price ✅
- Stock ✅

**Add These Fields**:

- Expiration date (date picker)
- Batch number (text input)
- Location (text input or dropdown if locations exist)
- Bin number (text input)
- Supplier name (text input or dropdown)
- Min stock level (number)
- Reorder quantity (number)

**API Enhancement**:

```typescript
// Update existing endpoint or create new one
PATCH /api/inventory/products/{product_id}
{
  stock_quantity?: number,
  expiry_date?: string,        // ISO date
  batch_number?: string,
  location?: string,
  bin_number?: string,
  supplier_name?: string,
  min_stock_level?: number,
  reorder_quantity?: number
}

// Creates inventory transaction if stock changed
// Updates inventory record
```

**UI Enhancement**:

```typescript
// Enhance existing edit modal
components/inventory/
└── edit-inventory-modal.tsx    // Enhanced with all fields
    ├── Basic fields (price, stock)
    ├── Expiration section (date picker, batch)
    ├── Location section (location, bin)
    ├── Supplier section (supplier name)
    └── Reorder settings (min stock, reorder qty)
```

### 5.3 Priority 3: Batch/Expiry Management

**Feature**: Dedicated UI for managing batches and expiration dates

**Use Cases**:

- Multiple batches of same product with different expiry dates
- FIFO (First In, First Out) stock management
- Expiring product alerts

**Current Limitation**:

- `store_inventory` has single `batch_number` and `expiry_date`
- Cannot track multiple batches per product

**Options**:

1. **Simple**: Enhance current single-batch tracking
2. **Advanced**: Create `store_inventory_batches` table for multi-batch tracking

**Recommendation**: Start with Option 1, upgrade to Option 2 if needed

**Option 1 Implementation**:

- Add batch/expiry fields to edit modal
- Show expiry alerts in inventory screen
- Sort by expiry date in inventory list

**Option 2 Implementation** (if multi-batch needed):

```sql
CREATE TABLE store_inventory_batches (
    id UUID PRIMARY KEY,
    inventory_id UUID REFERENCES store_inventory(id),
    tenant_id TEXT NOT NULL,
    batch_number TEXT NOT NULL,
    expiry_date DATE NOT NULL,
    quantity NUMERIC(12,2) NOT NULL,
    purchase_date DATE,
    supplier_name TEXT,
    unit_cost NUMERIC(12,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(inventory_id, batch_number, expiry_date)
);
```

### 5.4 Priority 4: Location Management

**Feature**: Manage storage locations and bins

**Current State**:

- `store_inventory.location` and `bin_number` exist
- No UI for managing locations
- No validation or dropdowns

**Enhancement**:

1. Create locations table (optional, or use free text)
2. Add location dropdown in edit modal
3. Filter inventory by location
4. Location-based stock reports

**Simple Approach** (Free text):

- Keep current text fields
- Add autocomplete from existing values
- Add location filter in inventory screen

**Advanced Approach** (Structured):

```sql
CREATE TABLE storage_locations (
    id UUID PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(tenant_id, name)
);

CREATE TABLE storage_bins (
    id UUID PRIMARY KEY,
    location_id UUID REFERENCES storage_locations(id),
    bin_number TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(location_id, bin_number)
);
```

---

## 6. API Endpoints Summary

### 6.1 Existing Endpoints (Working)

| Endpoint                | Method | Purpose                         | Status |
| ----------------------- | ------ | ------------------------------- | ------ |
| `/api/store/products`   | GET    | Get clinic's products for store | ✅     |
| `/api/inventory/stats`  | GET    | Get inventory statistics        | ✅     |
| `/api/inventory/alerts` | GET    | Get low stock/expiring alerts   | ✅     |
| `/api/inventory/import` | POST   | Bulk import products/inventory  | ✅     |
| `/api/inventory/export` | GET    | Export inventory to Excel       | ✅     |

### 6.2 New Endpoints Needed

| Endpoint                        | Method | Purpose                  | Priority |
| ------------------------------- | ------ | ------------------------ | -------- |
| `/api/inventory/catalog`        | GET    | Browse global catalog    | P1       |
| `/api/inventory/catalog/assign` | POST   | Assign product to clinic | P1       |
| `/api/inventory/products/{id}`  | PATCH  | Update inventory fields  | P2       |
| `/api/inventory/batches`        | GET    | Get batch/expiry info    | P3       |
| `/api/inventory/locations`      | GET    | Get storage locations    | P4       |

---

## 7. UI/UX Recommendations

### 7.1 Catalog Browser Screen

**Layout**:

```
┌─────────────────────────────────────────────────────────────┐
│ [Breadcrumb: Inventario > Catálogo Global]                  │
├─────────────────────────────────────────────────────────────┤
│ [Search Bar] [Filter: Category ▼] [Filter: Brand ▼]        │
├──────────────┬──────────────────────────────────────────────┤
│              │                                              │
│ [FILTERS]    │  [Product Grid]                             │
│              │                                              │
│ ▼ Categoría  │  [Card] [Card] [Card] [Card]                │
│   □ Alimentos│  [Card] [Card] [Card] [Card]                │
│   □ Medicinas│                                              │
│              │  [Pagination]                                │
│ ▼ Marca      │                                              │
│   □ Royal C. │                                              │
│   □ Hills    │                                              │
│              │                                              │
│ ▼ Especie    │                                              │
│   □ Perro    │                                              │
│   □ Gato     │                                              │
│              │                                              │
│ [Limpiar]    │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

**Product Card in Catalog**:

```
┌─────────────────────────────┐
│ [Image]                      │
│                              │
│ Product Name                 │
│ Brand Name                   │
│ SKU: XXX-XXX-XXX             │
│                              │
│ Precio Sugerido: Gs. 450,000 │
│                              │
│ [✅ Ya agregado]  or         │
│ [➕ Agregar a Clínica]       │
└─────────────────────────────┘
```

### 7.2 Enhanced Inventory Edit Modal

**Layout**:

```
┌─────────────────────────────────────────────┐
│ Editar Inventario: Product Name        [X] │
├─────────────────────────────────────────────┤
│                                              │
│ [TABS: Básico | Inventario | Ubicación]     │
│                                              │
│ ┌─────────────────────────────────────────┐ │
│ │ BÁSICO                                  │ │
│ │                                          │ │
│ │ Precio de Venta: [_________]            │ │
│ │ Stock Actual:    [_________]            │ │
│ │                                          │ │
│ └─────────────────────────────────────────┘ │
│                                              │
│ ┌─────────────────────────────────────────┐ │
│ │ INVENTARIO                               │ │
│ │                                          │ │
│ │ Fecha de Vencimiento: [📅 ________]     │ │
│ │ Número de Lote:       [_________]       │ │
│ │ Stock Mínimo:         [_________]       │ │
│ │ Cantidad de Reorden:  [_________]      │ │
│ │                                          │ │
│ └─────────────────────────────────────────┘ │
│                                              │
│ ┌─────────────────────────────────────────┐ │
│ │ UBICACIÓN                                │ │
│ │                                          │ │
│ │ Ubicación:        [Dropdown ▼]          │ │
│ │ Número de Bandeja: [_________]          │ │
│ │ Proveedor:        [_________]            │ │
│ │                                          │ │
│ └─────────────────────────────────────────┘ │
│                                              │
│ [Cancelar]              [Guardar Cambios]   │
└─────────────────────────────────────────────┘
```

---

## 8. Implementation Plan

### Phase 1: Catalog Browser (Week 1)

1. Create API endpoint `/api/inventory/catalog`
2. Create API endpoint `/api/inventory/catalog/assign`
3. Create route `/[clinic]/portal/inventory/catalog`
4. Build catalog browser UI
5. Build assign product modal
6. Test assignment flow

### Phase 2: Enhanced Editing (Week 2)

1. Enhance inventory edit modal with all fields
2. Update API to handle all inventory fields
3. Add validation for expiration dates
4. Add date picker component
5. Test editing flow

### Phase 3: Batch/Expiry Management (Week 3)

1. Add expiry date sorting/filtering
2. Enhance expiry alerts
3. Add batch number validation
4. Create batch history view (if needed)

### Phase 4: Location Management (Week 4)

1. Add location autocomplete/dropdown
2. Add location filter in inventory
3. Create location management page (if structured approach)

---

## 9. Database Queries Reference

### 9.1 Get Global Catalog (Excluding Assigned)

```sql
SELECT
    p.id,
    p.sku,
    p.name,
    p.base_price,
    p.image_url,
    c.name AS category_name,
    b.name AS brand_name,
    CASE
        WHEN a.id IS NOT NULL THEN true
        ELSE false
    END AS is_assigned,
    a.sale_price AS clinic_price
FROM store_products p
LEFT JOIN store_categories c ON c.id = p.category_id
LEFT JOIN store_brands b ON b.id = p.brand_id
LEFT JOIN clinic_product_assignments a
    ON a.catalog_product_id = p.id
    AND a.tenant_id = :clinic_id
WHERE p.tenant_id IS NULL
  AND p.is_global_catalog = true
  AND p.is_active = true
  AND p.deleted_at IS NULL
ORDER BY p.name;
```

### 9.2 Assign Product to Clinic

```sql
-- Insert assignment
INSERT INTO clinic_product_assignments (
    tenant_id,
    catalog_product_id,
    sale_price,
    min_stock_level,
    location,
    requires_prescription,
    is_active
) VALUES (
    :clinic_id,
    :product_id,
    :sale_price,
    :min_stock_level,
    :location,
    :requires_prescription,
    true
)
ON CONFLICT (tenant_id, catalog_product_id)
DO UPDATE SET
    sale_price = EXCLUDED.sale_price,
    min_stock_level = EXCLUDED.min_stock_level,
    location = EXCLUDED.location,
    updated_at = NOW();

-- Optionally create initial inventory
INSERT INTO store_inventory (
    product_id,
    tenant_id,
    stock_quantity,
    min_stock_level,
    location
) VALUES (
    :product_id,
    :clinic_id,
    :initial_stock,
    :min_stock_level,
    :location
)
ON CONFLICT (product_id)
DO UPDATE SET
    stock_quantity = EXCLUDED.stock_quantity,
    min_stock_level = EXCLUDED.min_stock_level,
    location = EXCLUDED.location;
```

### 9.3 Update Inventory with All Fields

```sql
UPDATE store_inventory
SET
    stock_quantity = :stock_quantity,
    expiry_date = :expiry_date,
    batch_number = :batch_number,
    location = :location,
    bin_number = :bin_number,
    supplier_name = :supplier_name,
    min_stock_level = :min_stock_level,
    reorder_quantity = :reorder_quantity,
    updated_at = NOW()
WHERE product_id = :product_id
  AND tenant_id = :clinic_id;

-- Create transaction record if stock changed
INSERT INTO store_inventory_transactions (
    tenant_id,
    product_id,
    type,
    quantity,
    notes
) VALUES (
    :clinic_id,
    :product_id,
    'adjustment',
    :stock_delta,
    'Manual inventory update'
);
```

---

## 10. Testing Checklist

### 10.1 Catalog Browser

- [ ] Can browse global catalog products
- [ ] Search works correctly
- [ ] Filters work (category, brand, species)
- [ ] Shows which products are already assigned
- [ ] "Add to Clinic" button works
- [ ] Assignment modal opens with correct data
- [ ] Can set custom price
- [ ] Can set min stock level
- [ ] Can set location
- [ ] Assignment creates `clinic_product_assignments` entry
- [ ] Product appears in inventory after assignment
- [ ] Product appears in store after assignment

### 10.2 Enhanced Inventory Editing

- [ ] Can edit all inventory fields
- [ ] Expiration date picker works
- [ ] Batch number saves correctly
- [ ] Location saves correctly
- [ ] Bin number saves correctly
- [ ] Supplier name saves correctly
- [ ] Min stock level saves correctly
- [ ] Reorder quantity saves correctly
- [ ] Validation works (dates, numbers)
- [ ] Changes persist after save
- [ ] Transaction record created for stock changes

### 10.3 Expiry Management

- [ ] Expiring products show in alerts
- [ ] Can filter by expiry date
- [ ] Can sort by expiry date
- [ ] Expiry warnings appear correctly
- [ ] Batch numbers display correctly

---

## 11. Conclusion

### Current State Summary

✅ **Fully Implemented**:

- Global catalog system
- Clinic product assignment mechanism
- Inventory tracking with all required fields
- Store showing only clinic products
- Basic inventory management screen

❌ **Missing (Critical)**:

- Catalog browser screen to add products from global catalog
- Full inventory editing UI (expiration, batch, location, etc.)

### Next Steps

1. **Immediate**: Implement catalog browser screen (Priority 1)
2. **Short-term**: Enhance inventory editing modal (Priority 2)
3. **Medium-term**: Add batch/expiry management features (Priority 3)
4. **Long-term**: Consider location management system (Priority 4)

### Estimated Effort

- **Catalog Browser**: 3-5 days
- **Enhanced Editing**: 2-3 days
- **Batch/Expiry Management**: 2-3 days
- **Location Management**: 2-3 days

**Total**: ~10-14 days for complete implementation

---

_Document Version: 1.0_  
_Created: December 2024_  
_Last Updated: December 2024_
