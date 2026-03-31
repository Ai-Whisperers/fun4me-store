# Unified Clinic Inventory View

A database view that combines own products and catalog assigned products into a single queryable interface.

> **Location**: `web/db/60_store/views/01_unified_inventory.sql`
> **Last Updated**: January 2026

---

## Overview

The `unified_clinic_inventory` view solves a key architectural challenge: clinics can have products from two sources:

1. **Own Products**: Products created directly by the clinic (`store_products` where `tenant_id` matches)
2. **Catalog Products**: Global products assigned via `clinic_product_assignments`

Without this view, every inventory query would need complex source-switching logic. The view consolidates both sources into a single queryable interface.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                 unified_clinic_inventory (VIEW)               │
├──────────────────────────────────────────────────────────────┤
│  source: 'own'                    │  source: 'catalog'        │
│  ┌────────────────┐              │  ┌────────────────────┐   │
│  │ store_products │              │  │clinic_product_     │   │
│  │ (tenant_id=X)  │              │  │assignments         │   │
│  └───────┬────────┘              │  └─────────┬──────────┘   │
│          │                        │            │              │
│          ▼                        │            ▼              │
│  ┌────────────────┐              │  ┌────────────────────┐   │
│  │store_inventory │              │  │store_products      │   │
│  │(tenant_id=X)   │              │  │(is_global_catalog) │   │
│  └────────────────┘              │  └─────────┬──────────┘   │
│                                   │            ▼              │
│                                   │  ┌────────────────────┐   │
│                                   │  │store_inventory     │   │
│                                   │  │(tenant_id=X)       │   │
│                                   │  └────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

---

## Column Reference

| Column | Type | Description |
|--------|------|-------------|
| `source` | TEXT | `'own'` or `'catalog'` - identifies product origin |
| `product_id` | UUID | Product identifier |
| `sku` | TEXT | Stock keeping unit |
| `barcode` | TEXT | EAN/UPC barcode |
| `name` | TEXT | Product name |
| `description` | TEXT | Full description |
| `short_description` | TEXT | Brief description |
| `category_id` | UUID | Category FK |
| `category_name` | TEXT | Category name (joined) |
| `brand_id` | UUID | Brand FK |
| `brand_name` | TEXT | Brand name (joined) |
| `image_url` | TEXT | Product image |
| `purchase_unit` | TEXT | Unit when purchasing (e.g., "box") |
| `sale_unit` | TEXT | Unit when selling (e.g., "unit") |
| `conversion_factor` | NUMERIC | purchase_unit → sale_unit conversion |
| `purchase_price` | NUMERIC | Cost when purchasing |
| `unit_cost` | NUMERIC | Per-unit cost |
| `base_price` | NUMERIC | Base selling price (catalog overrideable) |
| `sale_price` | NUMERIC | Current sale price |
| `target_species` | TEXT[] | Applicable species |
| `requires_prescription` | BOOLEAN | Prescription required |
| `product_active` | BOOLEAN | Whether product is active |
| `is_featured` | BOOLEAN | Featured product flag |
| `default_supplier_id` | UUID | Default supplier FK |
| `tenant_id` | TEXT | Clinic tenant ID |
| `stock_quantity` | INTEGER | Current stock level |
| `reserved_quantity` | INTEGER | Stock reserved in carts |
| `available_quantity` | INTEGER | Stock available for sale |
| `min_stock_level` | INTEGER | Minimum stock threshold |
| `reorder_point` | INTEGER | Stock level to trigger reorder |
| `reorder_quantity` | INTEGER | Quantity to order |
| `weighted_average_cost` | NUMERIC | WAC for inventory valuation |
| `location` | TEXT | Storage location |
| `batch_number` | TEXT | Current batch |
| `expiry_date` | DATE | Expiry date |
| `stock_status` | TEXT | `'in_stock'`, `'low_stock'`, `'out_of_stock'` |
| `is_available` | BOOLEAN | Active and has stock |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |
| `inventory_updated_at` | TIMESTAMPTZ | Inventory last updated |

---

## Computed Fields

### stock_status

Computed based on stock levels:

```sql
CASE
    WHEN stock_quantity = 0 THEN 'out_of_stock'
    WHEN stock_quantity <= min_stock_level THEN 'low_stock'
    ELSE 'in_stock'
END
```

### is_available

Product is both active and has stock:

```sql
product_active AND stock_quantity >= 0
```

---

## Helper Functions

### get_clinic_inventory()

Retrieves filtered inventory for a tenant with pagination.

```sql
SELECT * FROM get_clinic_inventory(
    p_tenant_id := 'adris',
    p_source := 'own',              -- NULL for both sources
    p_category_id := NULL,          -- Filter by category
    p_stock_status := 'low_stock',  -- Filter by stock status
    p_search := 'flea',             -- Search name/SKU
    p_limit := 50,
    p_offset := 0
);
```

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `p_tenant_id` | TEXT | Required | Clinic tenant ID |
| `p_source` | TEXT | NULL | `'own'`, `'catalog'`, or NULL for both |
| `p_category_id` | UUID | NULL | Filter by category |
| `p_stock_status` | TEXT | NULL | `'in_stock'`, `'low_stock'`, `'out_of_stock'` |
| `p_search` | TEXT | NULL | Search name or SKU (ILIKE) |
| `p_limit` | INTEGER | 50 | Max results |
| `p_offset` | INTEGER | 0 | Pagination offset |

### get_inventory_stats()

Returns summary statistics for a clinic's inventory.

```sql
SELECT * FROM get_inventory_stats('adris');
```

**Returns:**

| Column | Type | Description |
|--------|------|-------------|
| `total_products` | BIGINT | Total active products |
| `total_stock` | NUMERIC | Sum of all stock quantities |
| `low_stock_count` | BIGINT | Products with low stock |
| `out_of_stock_count` | BIGINT | Products out of stock |
| `expiring_soon_count` | BIGINT | Products expiring in 30 days |
| `total_value` | NUMERIC | Total inventory value (stock × WAC) |
| `own_products_count` | BIGINT | Own products count |
| `catalog_products_count` | BIGINT | Catalog products count |

---

## Usage Examples

### Dashboard Inventory List

```typescript
// API route: /api/inventory/route.ts
const { data } = await supabase.rpc('get_clinic_inventory', {
  p_tenant_id: tenantId,
  p_stock_status: filter.stockStatus,
  p_search: searchTerm,
  p_limit: pageSize,
  p_offset: (page - 1) * pageSize,
})
```

### Inventory Stats for Dashboard Header

```typescript
const { data: stats } = await supabase
  .rpc('get_inventory_stats', { p_tenant_id: tenantId })
  .single()

// stats.total_products, stats.low_stock_count, etc.
```

### Direct View Query (Simple Cases)

```typescript
const { data } = await supabase
  .from('unified_clinic_inventory')
  .select('product_id, name, stock_quantity, stock_status')
  .eq('tenant_id', tenantId)
  .eq('stock_status', 'low_stock')
  .order('name')
```

---

## Catalog Product Overrides

When using catalog products, clinics can override certain fields via `clinic_product_assignments`:

| Field | Override Source | Fallback |
|-------|-----------------|----------|
| `base_price` | `cpa.sale_price` | `store_products.base_price` |
| `requires_prescription` | `cpa.requires_prescription` | `store_products.requires_prescription` |
| `min_stock_level` | `cpa.min_stock_level` | `store_inventory.min_stock_level` |
| `location` | `cpa.location` | `store_inventory.location` |
| `product_active` | `cpa.is_active` AND `p.is_active` | Both must be true |

---

## Performance Considerations

1. **Use helper functions** - `get_clinic_inventory()` is optimized for set-returning function performance
2. **Always filter by tenant_id** - The view depends on underlying RLS, but explicit filtering helps the planner
3. **Index usage** - The underlying tables should have indexes on `tenant_id`, `category_id`, `stock_status`
4. **Avoid SELECT *** - Request only needed columns for large result sets

---

## Security

- The view inherits RLS from underlying tables
- `SECURITY DEFINER` on helper functions with `SET search_path = public`
- Granted to `authenticated` and `service_role` roles
- Never exposes data across tenants

---

## Dependencies

| Object | Type | Description |
|--------|------|-------------|
| `store_products` | Table | Product catalog |
| `store_categories` | Table | Product categories |
| `store_brands` | Table | Product brands |
| `store_inventory` | Table | Stock levels |
| `clinic_product_assignments` | Table | Catalog product mappings |

---

## Related Documentation

- [Database Schema Reference](./schema-reference.md)
- [Inventory API Endpoints](../api/overview.md#inventory-12-endpoints)
- [Store/E-Commerce Features](../features/overview.md#e-commerce--store)
