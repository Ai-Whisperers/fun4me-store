-- =============================================================================
-- 01_INVENTORY.SQL
-- =============================================================================
-- Store and inventory management: products, stock, campaigns, orders.
-- INCLUDES tenant_id on all child tables for optimized RLS.
-- B2B PROCUREMENT LAYER: Supports global catalog, dual-unit inventory,
-- supplier management, and market intelligence via procurement leads.
-- =============================================================================

-- =============================================================================
-- SUPPLIERS (B2B Layer)
-- =============================================================================
-- Suppliers can be GLOBAL (tenant_id NULL) or LOCAL (tenant_id set).
-- Global suppliers are platform-verified and available to all clinics.
-- Local suppliers are clinic-specific additions.

CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Tenancy: NULL = Global (platform-verified), SET = Local (clinic-specific)
    tenant_id TEXT REFERENCES public.tenants(id),

    -- Supplier info
    name TEXT NOT NULL,
    legal_name TEXT,                              -- Razón social
    tax_id TEXT,                                  -- RUC (Paraguay)

    -- Contact
    contact_info JSONB DEFAULT '{}'::JSONB,       -- {phone, email, address, contact_person}
    website TEXT,

    -- Classification
    supplier_type TEXT DEFAULT 'products'
        CHECK (supplier_type IN ('products', 'services', 'both')),

    -- B2B specific
    is_platform_provider BOOLEAN DEFAULT false,   -- TRUE = This is US (The Aggregator)
    minimum_order_amount NUMERIC(12,2),
    payment_terms TEXT,                           -- "30 días", "Contado"
    delivery_time_days INTEGER,

    -- Verification
    verification_status TEXT DEFAULT 'pending'
        CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES public.profiles(id),

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.suppliers IS 'Product suppliers. NULL tenant_id = global platform-verified, SET = local clinic-specific';
COMMENT ON COLUMN public.suppliers.tenant_id IS 'NULL for global (platform-verified) suppliers, SET for local (clinic-specific)';
COMMENT ON COLUMN public.suppliers.is_platform_provider IS 'TRUE if this is the platform aggregator (us)';
COMMENT ON COLUMN public.suppliers.verification_status IS 'Verification status: pending, verified, rejected';

-- =============================================================================
-- STORE CATEGORIES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.store_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Tenancy: NULL = Global (platform-wide), SET = Local (clinic-specific)
    tenant_id TEXT REFERENCES public.tenants(id),

    -- Category info
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES public.store_categories(id),

    -- Hierarchy level (1 = top, 2 = sub, 3 = detail, 4 = granular, 5 = micro)
    level INTEGER DEFAULT 1 CHECK (level BETWEEN 1 AND 5),

    -- Media
    image_url TEXT,

    -- Display
    display_order INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT true,

    -- Global catalog flags
    is_global_catalog BOOLEAN DEFAULT false,      -- TRUE = Platform-verified category
    created_by_tenant_id TEXT REFERENCES public.tenants(id), -- Who created it originally

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.store_categories IS 'Product categories. NULL tenant_id = global platform category, SET = local clinic-specific';
COMMENT ON COLUMN public.store_categories.level IS 'Hierarchy level: 1=top, 2=sub, 3=detail, 4=granular, 5=micro';
COMMENT ON COLUMN public.store_categories.is_global_catalog IS 'TRUE for platform-verified categories';

-- Unique constraint: global categories have unique slugs, local categories unique per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_categories_global_slug
    ON public.store_categories(slug) WHERE tenant_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_categories_tenant_slug
    ON public.store_categories(tenant_id, slug) WHERE tenant_id IS NOT NULL;

-- =============================================================================
-- STORE BRANDS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.store_brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Tenancy: NULL = Global (platform-wide), SET = Local (clinic-specific)
    tenant_id TEXT REFERENCES public.tenants(id),

    -- Brand info
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    website TEXT,
    country_origin TEXT,                          -- País de origen

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Global catalog flags
    is_global_catalog BOOLEAN DEFAULT false,      -- TRUE = Platform-verified brand
    created_by_tenant_id TEXT REFERENCES public.tenants(id),

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.store_brands IS 'Product brands. NULL tenant_id = global platform brand, SET = local clinic-specific';
COMMENT ON COLUMN public.store_brands.is_global_catalog IS 'TRUE for platform-verified brands';

-- Unique constraint: global brands have unique slugs, local brands unique per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_brands_global_slug
    ON public.store_brands(slug) WHERE tenant_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_brands_tenant_slug
    ON public.store_brands(tenant_id, slug) WHERE tenant_id IS NOT NULL;

-- =============================================================================
-- STORE PRODUCTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.store_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Tenancy: NULL = Global catalog product, SET = Local clinic product
    tenant_id TEXT REFERENCES public.tenants(id),

    -- Classification
    category_id UUID REFERENCES public.store_categories(id),
    brand_id UUID REFERENCES public.store_brands(id),

    -- Identification
    sku TEXT,
    barcode TEXT,

    -- Product info
    name TEXT NOT NULL,
    description TEXT,
    short_description TEXT,

    -- ==========================================================================
    -- DUAL-UNIT INVENTORY (B2B Layer)
    -- ==========================================================================
    -- Example: Buy "Caja" of 100 pills, sell by "Tableta"
    -- purchase_unit = 'Caja', sale_unit = 'Tableta', conversion_factor = 100
    -- unit_cost = price_per_box / 100 = cost per pill
    -- ==========================================================================

    -- Unit of PURCHASE (how you buy from supplier)
    purchase_unit TEXT DEFAULT 'Unidad'
        CHECK (purchase_unit IN (
            'Unidad', 'Caja', 'Pack', 'Bolsa', 'Frasco', 'Bulto',
            'Display', 'Blister', 'Paquete', 'Kg', 'L'
        )),

    -- Unit of SALE (how you sell to customers)
    sale_unit TEXT DEFAULT 'Unidad'
        CHECK (sale_unit IN (
            'Unidad', 'Tableta', 'Ampolla', 'Cápsula', 'Comprimido',
            'ml', 'g', 'Kg', 'Dosis', 'Aplicación',
            'Bolsa', 'Frasco', 'Caja', 'Sobre', 'Pipeta'
        )),

    -- Conversion: 1 purchase_unit = N sale_units
    conversion_factor NUMERIC(12,4) DEFAULT 1 CHECK (conversion_factor > 0),

    -- Pricing
    -- purchase_price: What you pay per purchase_unit (Box price)
    purchase_price NUMERIC(12,2) CHECK (purchase_price IS NULL OR purchase_price >= 0),

    -- unit_cost: Computed cost per sale_unit = purchase_price / conversion_factor
    -- This is STORED for performance (updated via trigger)
    unit_cost NUMERIC(12,4) GENERATED ALWAYS AS (
        CASE WHEN purchase_price IS NOT NULL AND conversion_factor > 0
             THEN purchase_price / conversion_factor
             ELSE NULL
        END
    ) STORED,

    -- base_price: Selling price per sale_unit (what customer pays)
    base_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (base_price >= 0),

    -- sale_price: Promotional price per sale_unit (optional)
    sale_price NUMERIC(12,2) CHECK (sale_price IS NULL OR sale_price >= 0),

    -- cost_price: Legacy field, prefer unit_cost
    cost_price NUMERIC(12,2) CHECK (cost_price IS NULL OR cost_price >= 0),

    -- Supplier relationship
    default_supplier_id UUID REFERENCES public.suppliers(id),

    -- Media
    image_url TEXT,
    images TEXT[] DEFAULT '{}',

    -- Attributes
    weight_grams NUMERIC(10,2),
    dimensions JSONB,  -- {length, width, height, unit}
    attributes JSONB DEFAULT '{}',  -- {color, size, concentration, etc.}

    -- Species/targeting
    target_species TEXT[],

    -- Status
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    requires_prescription BOOLEAN DEFAULT false,

    -- Display
    display_order INTEGER DEFAULT 100,

    -- ==========================================================================
    -- GLOBAL CATALOG FLAGS (B2B Layer)
    -- ==========================================================================
    is_global_catalog BOOLEAN DEFAULT false,      -- TRUE = Platform-verified product
    created_by_tenant_id TEXT REFERENCES public.tenants(id), -- Original creator
    verification_status TEXT DEFAULT 'pending'
        CHECK (verification_status IN ('pending', 'verified', 'rejected', 'needs_review')),
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES public.profiles(id),

    -- SEO
    meta_title TEXT,
    meta_description TEXT,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.store_products IS 'Product catalog. NULL tenant_id = global catalog, SET = local clinic product. Supports dual-unit inventory.';
COMMENT ON COLUMN public.store_products.purchase_unit IS 'Unit for purchasing from supplier (e.g., Caja, Bulto)';
COMMENT ON COLUMN public.store_products.sale_unit IS 'Unit for selling to customer (e.g., Tableta, Unidad)';
COMMENT ON COLUMN public.store_products.conversion_factor IS '1 purchase_unit = N sale_units (e.g., 1 Caja = 100 Tabletas)';
COMMENT ON COLUMN public.store_products.purchase_price IS 'Price per purchase_unit (what you pay supplier)';
COMMENT ON COLUMN public.store_products.unit_cost IS 'Computed cost per sale_unit = purchase_price / conversion_factor';
COMMENT ON COLUMN public.store_products.base_price IS 'Selling price per sale_unit';
COMMENT ON COLUMN public.store_products.is_global_catalog IS 'TRUE for platform-verified global catalog products';

-- Unique constraint: global products have unique SKUs, local products unique per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_products_global_sku
    ON public.store_products(sku) WHERE tenant_id IS NULL AND sku IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_products_tenant_sku
    ON public.store_products(tenant_id, sku) WHERE tenant_id IS NOT NULL AND sku IS NOT NULL;

-- =============================================================================
-- STORE INVENTORY
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.store_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),

    -- Stock levels
    stock_quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
    reserved_quantity NUMERIC(12,2) DEFAULT 0 CHECK (reserved_quantity >= 0),
    available_quantity NUMERIC(12,2) GENERATED ALWAYS AS (stock_quantity - reserved_quantity) STORED,

    -- Reorder settings
    min_stock_level NUMERIC(12,2) DEFAULT 0,
    reorder_quantity NUMERIC(12,2),
    reorder_point NUMERIC(12,2),

    -- Cost tracking
    weighted_average_cost NUMERIC(12,2) DEFAULT 0,

    -- Location
    location TEXT,
    bin_number TEXT,

    -- Batch/Expiry
    batch_number TEXT,
    expiry_date DATE,
    supplier_name TEXT,

    -- Timestamps
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(product_id),
    
    -- CHECK constraints
    CONSTRAINT store_inventory_stock_non_negative CHECK (stock_quantity >= 0),
    CONSTRAINT store_inventory_reserved_valid CHECK (COALESCE(reserved_quantity, 0) <= stock_quantity)
);

COMMENT ON TABLE public.store_inventory IS 'Per-product per-clinic inventory levels with weighted average cost tracking';
COMMENT ON COLUMN public.store_inventory.available_quantity IS 'Computed: stock_quantity - reserved_quantity';
COMMENT ON COLUMN public.store_inventory.weighted_average_cost IS 'Running WAC updated on purchase transactions';
COMMENT ON COLUMN public.store_inventory.reorder_point IS 'Stock level at which to reorder';

-- =============================================================================
-- INVENTORY TRANSACTIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.store_inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),
    product_id UUID NOT NULL REFERENCES public.store_products(id),

    -- Transaction
    type TEXT NOT NULL
        CHECK (type IN ('purchase', 'sale', 'adjustment', 'return', 'damage', 'theft', 'expired', 'transfer')),
    quantity NUMERIC(12,2) NOT NULL,  -- Positive = add, Negative = remove
    unit_cost NUMERIC(12,2),

    -- Reference
    reference_type TEXT,  -- 'order', 'invoice', 'adjustment'
    reference_id UUID,
    notes TEXT,

    -- Performed by
    performed_by UUID REFERENCES public.profiles(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.store_inventory_transactions IS 'Inventory movement ledger: purchases, sales, adjustments, returns, damages';
COMMENT ON COLUMN public.store_inventory_transactions.type IS 'Transaction type: purchase, sale, adjustment, return, damage, theft, expired, transfer';
COMMENT ON COLUMN public.store_inventory_transactions.quantity IS 'Positive = add stock, Negative = remove stock';

-- =============================================================================
-- STORE CAMPAIGNS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.store_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),

    -- Campaign info
    name TEXT NOT NULL,
    description TEXT,
    campaign_type TEXT DEFAULT 'sale'
        CHECK (campaign_type IN ('sale', 'bogo', 'bundle', 'flash', 'seasonal')),

    -- Duration
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,

    -- Discount
    discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed_amount')),
    discount_value NUMERIC(12,2),

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT store_campaigns_dates CHECK (end_date > start_date)
);

COMMENT ON TABLE public.store_campaigns IS 'Promotional campaigns: sales, BOGO, bundles, flash sales, seasonal';
COMMENT ON COLUMN public.store_campaigns.campaign_type IS 'Campaign type: sale, bogo (buy one get one), bundle, flash, seasonal';

-- =============================================================================
-- CAMPAIGN ITEMS - WITH TENANT_ID
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.store_campaign_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.store_campaigns(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),
    product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,

    -- Override discount for this product
    discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed_amount')),
    discount_value NUMERIC(12,2),

    UNIQUE(campaign_id, product_id)
);

COMMENT ON TABLE public.store_campaign_items IS 'Products included in a campaign with optional item-specific discounts';

-- =============================================================================
-- STORE COUPONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.store_coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),

    -- Coupon info
    code TEXT NOT NULL,
    name TEXT,
    description TEXT,

    -- Discount
    discount_type TEXT NOT NULL
        CHECK (discount_type IN ('percentage', 'fixed_amount', 'free_shipping')),
    discount_value NUMERIC(12,2) NOT NULL,
    min_purchase_amount NUMERIC(12,2) DEFAULT 0,
    max_discount_amount NUMERIC(12,2),

    -- Usage limits
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    usage_limit_per_user INTEGER DEFAULT 1,

    -- Validity
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMPTZ,

    -- Restrictions
    applicable_products UUID[],
    applicable_categories UUID[],

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(tenant_id, code),
    
    -- CHECK constraints
    CONSTRAINT store_coupons_discount_positive CHECK (discount_value > 0),
    CONSTRAINT store_coupons_percentage_valid CHECK (
        discount_type != 'percentage' OR
        (discount_value > 0 AND discount_value <= 100)
    ),
    CONSTRAINT store_coupons_valid_period CHECK (valid_until IS NULL OR valid_until > valid_from),
    CONSTRAINT store_coupons_usage_valid CHECK (
        usage_limit IS NULL OR
        COALESCE(usage_count, 0) <= usage_limit
    )
);

COMMENT ON TABLE public.store_coupons IS 'Discount coupons with usage limits and validity periods';
COMMENT ON COLUMN public.store_coupons.discount_type IS 'percentage, fixed_amount, or free_shipping';
COMMENT ON COLUMN public.store_coupons.applicable_products IS 'Array of product UUIDs this coupon applies to (NULL = all)';
COMMENT ON COLUMN public.store_coupons.applicable_categories IS 'Array of category UUIDs this coupon applies to (NULL = all)';

-- =============================================================================
-- STORE ORDERS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.store_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),

    -- Order number
    order_number TEXT NOT NULL,

    -- Customer
    customer_id UUID NOT NULL REFERENCES public.profiles(id),

    -- Status
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN (
            'pending',      -- Order placed
            'confirmed',    -- Payment confirmed
            'processing',   -- Being prepared
            'ready',        -- Ready for pickup/shipping
            'shipped',      -- In transit
            'delivered',    -- Completed
            'cancelled',    -- Cancelled
            'refunded'      -- Refunded
        )),

    -- Totals
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12,2) DEFAULT 0,
    shipping_cost NUMERIC(12,2) DEFAULT 0,
    tax_amount NUMERIC(12,2) DEFAULT 0,
    total NUMERIC(12,2) NOT NULL DEFAULT 0,

    -- Shipping
    shipping_address JSONB,
    shipping_method TEXT,
    tracking_number TEXT,

    -- Payment
    payment_status TEXT DEFAULT 'pending'
        CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    payment_method TEXT,
    payment_reference TEXT,

    -- Coupon
    coupon_id UUID REFERENCES public.store_coupons(id),
    coupon_code TEXT,

    -- Notes
    customer_notes TEXT,
    internal_notes TEXT,

    -- Timestamps
    confirmed_at TIMESTAMPTZ,
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES public.profiles(id),
    cancellation_reason TEXT,

    -- Soft delete
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(tenant_id, order_number)
);

COMMENT ON TABLE public.store_orders IS 'Customer orders with status tracking and payment handling';
COMMENT ON COLUMN public.store_orders.status IS 'Workflow: pending → confirmed → processing → ready → shipped → delivered. Also: cancelled, refunded';
COMMENT ON COLUMN public.store_orders.payment_status IS 'Payment status: pending, paid, failed, refunded';

-- =============================================================================
-- STORE ORDER ITEMS - WITH TENANT_ID
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.store_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.store_orders(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),
    product_id UUID NOT NULL REFERENCES public.store_products(id),

    -- Item details at time of purchase
    product_name TEXT NOT NULL,
    product_sku TEXT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL,
    discount_amount NUMERIC(12,2) DEFAULT 0,
    total NUMERIC(12,2) NOT NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.store_order_items IS 'Order line items with product snapshot at time of purchase';
COMMENT ON COLUMN public.store_order_items.product_name IS 'Snapshot of product name at purchase time';
COMMENT ON COLUMN public.store_order_items.unit_price IS 'Snapshot of price at purchase time';

-- =============================================================================
-- PRICE HISTORY
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.store_price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),
    product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,

    -- Price change
    old_price NUMERIC(12,2),
    new_price NUMERIC(12,2) NOT NULL,
    price_type TEXT DEFAULT 'base'
        CHECK (price_type IN ('base', 'sale', 'cost')),

    -- Changed by
    changed_by UUID REFERENCES public.profiles(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.store_price_history IS 'Price change audit log for products (auto-tracked via trigger)';
COMMENT ON COLUMN public.store_price_history.price_type IS 'Which price changed: base, sale, or cost';

-- =============================================================================
-- PRODUCT REVIEWS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.store_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),
    product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.profiles(id),
    order_id UUID REFERENCES public.store_orders(id),

    -- Review
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT,
    content TEXT,

    -- Moderation
    is_approved BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES public.profiles(id),
    approved_at TIMESTAMPTZ,

    -- Soft delete
    deleted_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One review per customer per product
    UNIQUE(product_id, customer_id)
);

COMMENT ON TABLE public.store_reviews IS 'Product reviews with moderation. One review per customer per product.';
COMMENT ON COLUMN public.store_reviews.is_approved IS 'Review must be approved before public display';

-- =============================================================================
-- WISHLIST
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.store_wishlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),
    customer_id UUID NOT NULL REFERENCES public.profiles(id),
    product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(customer_id, product_id)
);

COMMENT ON TABLE public.store_wishlist IS 'Customer wishlists for saved products';

-- =============================================================================
-- PROCUREMENT LEADS (B2B Market Intelligence)
-- =============================================================================
-- Captures competitor data when clinics import their purchase history.
-- Used for market analysis, price intelligence, and product discovery.
-- This is the "we learn from what you buy" layer.

CREATE TABLE IF NOT EXISTS public.procurement_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Source tenant (who uploaded this data)
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),

    -- Raw data (as imported, before matching)
    raw_product_name TEXT NOT NULL,
    raw_brand_name TEXT,
    raw_supplier_name TEXT,
    raw_price_paid NUMERIC(12,2),
    raw_quantity NUMERIC(12,2),
    raw_unit TEXT,
    raw_invoice_date DATE,
    raw_data JSONB,                               -- Original row data for reference

    -- Matched entities (after processing)
    matched_product_id UUID REFERENCES public.store_products(id),
    matched_brand_id UUID REFERENCES public.store_brands(id),
    matched_supplier_id UUID REFERENCES public.suppliers(id),
    matched_category_id UUID REFERENCES public.store_categories(id),

    -- Processing status
    status TEXT DEFAULT 'new'
        CHECK (status IN ('new', 'processing', 'matched', 'unmatched', 'ignored', 'converted')),

    -- Match confidence (0-100)
    match_confidence INTEGER CHECK (match_confidence IS NULL OR match_confidence BETWEEN 0 AND 100),

    -- Conversion tracking (when we create a catalog product from this lead)
    converted_product_id UUID REFERENCES public.store_products(id),
    converted_at TIMESTAMPTZ,
    converted_by UUID REFERENCES public.profiles(id),

    -- Intelligence flags
    is_new_product BOOLEAN DEFAULT false,         -- Product not in our catalog
    is_new_brand BOOLEAN DEFAULT false,           -- Brand not in our catalog
    is_new_supplier BOOLEAN DEFAULT false,        -- Supplier not in our catalog
    price_variance NUMERIC(5,2),                  -- % difference from catalog price

    -- Detection metadata
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES public.profiles(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.procurement_leads IS 'B2B market intelligence: captured competitor/supplier data from clinic imports';
COMMENT ON COLUMN public.procurement_leads.status IS 'Processing status: new, processing, matched, unmatched, ignored, converted';
COMMENT ON COLUMN public.procurement_leads.match_confidence IS 'Auto-matching confidence 0-100%';
COMMENT ON COLUMN public.procurement_leads.is_new_product IS 'TRUE if product not found in global catalog (market opportunity)';
COMMENT ON COLUMN public.procurement_leads.price_variance IS 'Percentage difference from catalog price (negative = cheaper elsewhere)';

-- =============================================================================
-- CLINIC PRODUCT ASSIGNMENTS (Link global products to clinics)
-- =============================================================================
-- When a clinic wants to use a global catalog product, they create an assignment
-- with their own pricing, stock levels, and location.

CREATE TABLE IF NOT EXISTS public.clinic_product_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id),

    -- Reference to global catalog product
    catalog_product_id UUID NOT NULL REFERENCES public.store_products(id),

    -- Clinic-specific settings
    sale_price NUMERIC(12,2) NOT NULL,            -- What THIS clinic charges
    min_stock_level NUMERIC(12,2) DEFAULT 0,
    location TEXT,                                -- Storage location in clinic
    requires_prescription BOOLEAN DEFAULT false,  -- Clinic can override

    -- Margin tracking
    margin_percentage NUMERIC(5,2),               -- Calculated margin %

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Each clinic can only assign a product once
    UNIQUE(tenant_id, catalog_product_id)
);

COMMENT ON TABLE public.clinic_product_assignments IS 'Links global catalog products to clinics with custom pricing and margins';
COMMENT ON COLUMN public.clinic_product_assignments.sale_price IS 'What THIS clinic charges (may differ from catalog suggestion)';
COMMENT ON COLUMN public.clinic_product_assignments.margin_percentage IS 'Computed margin: ((sale_price - unit_cost) / sale_price) * 100';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_campaign_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_product_assignments ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- SUPPLIERS POLICIES (Global + Local access)
-- =============================================================================

-- Public can read active global suppliers
DROP POLICY IF EXISTS "Public read global suppliers" ON public.suppliers;
CREATE POLICY "Public read global suppliers" ON public.suppliers
    FOR SELECT USING (
        tenant_id IS NULL  -- Global suppliers
        AND is_active = true
        AND deleted_at IS NULL
    );

-- Staff can read their local suppliers + global suppliers
DROP POLICY IF EXISTS "Staff read suppliers" ON public.suppliers;
CREATE POLICY "Staff read suppliers" ON public.suppliers
    FOR SELECT TO authenticated
    USING (
        (tenant_id IS NULL AND is_active = true AND deleted_at IS NULL)  -- Global
        OR public.is_staff_of(tenant_id)  -- Local
    );

-- Staff can manage their local suppliers only
DROP POLICY IF EXISTS "Staff manage local suppliers" ON public.suppliers;
CREATE POLICY "Staff manage local suppliers" ON public.suppliers
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id))
    WITH CHECK (tenant_id IS NOT NULL AND public.is_staff_of(tenant_id));

-- Service role full access
DROP POLICY IF EXISTS "Service role full access suppliers" ON public.suppliers;
CREATE POLICY "Service role full access suppliers" ON public.suppliers
    FOR ALL TO service_role USING (true);

-- =============================================================================
-- CATEGORIES POLICIES (Global + Local access)
-- =============================================================================

-- Categories: Public read active (both global and local)
DROP POLICY IF EXISTS "Public read categories" ON public.store_categories;
CREATE POLICY "Public read categories" ON public.store_categories
    FOR SELECT USING (is_active = true AND deleted_at IS NULL);

-- Staff can read global + their local categories
DROP POLICY IF EXISTS "Staff read categories" ON public.store_categories;
CREATE POLICY "Staff read categories" ON public.store_categories
    FOR SELECT TO authenticated
    USING (
        (tenant_id IS NULL AND is_active = true)  -- Global categories
        OR public.is_staff_of(tenant_id)          -- Local categories
    );

-- Staff can only manage their local categories
DROP POLICY IF EXISTS "Staff manage categories" ON public.store_categories;
CREATE POLICY "Staff manage categories" ON public.store_categories
    FOR ALL TO authenticated
    USING (tenant_id IS NOT NULL AND public.is_staff_of(tenant_id))
    WITH CHECK (tenant_id IS NOT NULL AND public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Service role full access categories" ON public.store_categories;
CREATE POLICY "Service role full access categories" ON public.store_categories
    FOR ALL TO service_role USING (true);

-- =============================================================================
-- BRANDS POLICIES (Global + Local access)
-- =============================================================================

-- Brands: Public read active (both global and local)
DROP POLICY IF EXISTS "Public read brands" ON public.store_brands;
CREATE POLICY "Public read brands" ON public.store_brands
    FOR SELECT USING (is_active = true AND deleted_at IS NULL);

-- Staff can read global + their local brands
DROP POLICY IF EXISTS "Staff read brands" ON public.store_brands;
CREATE POLICY "Staff read brands" ON public.store_brands
    FOR SELECT TO authenticated
    USING (
        (tenant_id IS NULL AND is_active = true)  -- Global brands
        OR public.is_staff_of(tenant_id)          -- Local brands
    );

-- Staff can only manage their local brands
DROP POLICY IF EXISTS "Staff manage brands" ON public.store_brands;
CREATE POLICY "Staff manage brands" ON public.store_brands
    FOR ALL TO authenticated
    USING (tenant_id IS NOT NULL AND public.is_staff_of(tenant_id))
    WITH CHECK (tenant_id IS NOT NULL AND public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Service role full access brands" ON public.store_brands;
CREATE POLICY "Service role full access brands" ON public.store_brands
    FOR ALL TO service_role USING (true);

-- =============================================================================
-- PRODUCTS POLICIES (Global + Local access)
-- =============================================================================

-- Products: Public read active (both global catalog and local products)
DROP POLICY IF EXISTS "Public read products" ON public.store_products;
CREATE POLICY "Public read products" ON public.store_products
    FOR SELECT USING (is_active = true AND deleted_at IS NULL);

-- Staff can read global catalog + their local products
DROP POLICY IF EXISTS "Staff read products" ON public.store_products;
CREATE POLICY "Staff read products" ON public.store_products
    FOR SELECT TO authenticated
    USING (
        (tenant_id IS NULL AND is_active = true)  -- Global catalog products
        OR public.is_staff_of(tenant_id)          -- Local products
    );

-- Staff can only manage their local products
DROP POLICY IF EXISTS "Staff manage products" ON public.store_products;
CREATE POLICY "Staff manage products" ON public.store_products
    FOR ALL TO authenticated
    USING (tenant_id IS NOT NULL AND public.is_staff_of(tenant_id))
    WITH CHECK (tenant_id IS NOT NULL AND public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Service role full access products" ON public.store_products;
CREATE POLICY "Service role full access products" ON public.store_products
    FOR ALL TO service_role USING (true);

-- Inventory: Staff only
DROP POLICY IF EXISTS "Staff manage inventory" ON public.store_inventory;
CREATE POLICY "Staff manage inventory" ON public.store_inventory
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Service role full access inventory" ON public.store_inventory;
CREATE POLICY "Service role full access inventory" ON public.store_inventory
    FOR ALL TO service_role USING (true);

-- Inventory transactions: Staff only
DROP POLICY IF EXISTS "Staff manage inventory transactions" ON public.store_inventory_transactions;
CREATE POLICY "Staff manage inventory transactions" ON public.store_inventory_transactions
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Service role full access inv txn" ON public.store_inventory_transactions;
CREATE POLICY "Service role full access inv txn" ON public.store_inventory_transactions
    FOR ALL TO service_role USING (true);

-- Campaigns: Public read active, staff manage
DROP POLICY IF EXISTS "Public read campaigns" ON public.store_campaigns;
CREATE POLICY "Public read campaigns" ON public.store_campaigns
    FOR SELECT USING (is_active = true AND start_date <= NOW() AND end_date >= NOW() AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Staff manage campaigns" ON public.store_campaigns;
CREATE POLICY "Staff manage campaigns" ON public.store_campaigns
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Service role full access campaigns" ON public.store_campaigns;
CREATE POLICY "Service role full access campaigns" ON public.store_campaigns
    FOR ALL TO service_role USING (true);

-- OPTIMIZED RLS: Campaign items uses direct tenant_id
DROP POLICY IF EXISTS "Public read campaign items" ON public.store_campaign_items;
CREATE POLICY "Public read campaign items" ON public.store_campaign_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.store_campaigns c
            WHERE c.id = store_campaign_items.campaign_id
            AND c.is_active = true AND c.start_date <= NOW() AND c.end_date >= NOW() AND c.deleted_at IS NULL
        )
    );

DROP POLICY IF EXISTS "Staff manage campaign items" ON public.store_campaign_items;
CREATE POLICY "Staff manage campaign items" ON public.store_campaign_items
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Service role full access campaign items" ON public.store_campaign_items;
CREATE POLICY "Service role full access campaign items" ON public.store_campaign_items
    FOR ALL TO service_role USING (true);

-- Coupons: Staff only (validation done via function)
DROP POLICY IF EXISTS "Staff manage coupons" ON public.store_coupons;
CREATE POLICY "Staff manage coupons" ON public.store_coupons
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Service role full access coupons" ON public.store_coupons;
CREATE POLICY "Service role full access coupons" ON public.store_coupons
    FOR ALL TO service_role USING (true);

-- Orders: Staff manage, customers view own
DROP POLICY IF EXISTS "Staff manage orders" ON public.store_orders;
CREATE POLICY "Staff manage orders" ON public.store_orders
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Customers view own orders" ON public.store_orders;
CREATE POLICY "Customers view own orders" ON public.store_orders
    FOR SELECT TO authenticated
    USING (customer_id = auth.uid() AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Customers create orders" ON public.store_orders;
CREATE POLICY "Customers create orders" ON public.store_orders
    FOR INSERT TO authenticated
    WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "Service role full access orders" ON public.store_orders;
CREATE POLICY "Service role full access orders" ON public.store_orders
    FOR ALL TO service_role USING (true);

-- OPTIMIZED RLS: Order items uses direct tenant_id
DROP POLICY IF EXISTS "Staff manage order items" ON public.store_order_items;
CREATE POLICY "Staff manage order items" ON public.store_order_items
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Customers view own order items" ON public.store_order_items;
CREATE POLICY "Customers view own order items" ON public.store_order_items
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.store_orders o
            WHERE o.id = store_order_items.order_id
            AND o.customer_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Service role full access order items" ON public.store_order_items;
CREATE POLICY "Service role full access order items" ON public.store_order_items
    FOR ALL TO service_role USING (true);

-- Price history: Staff only
DROP POLICY IF EXISTS "Staff view price history" ON public.store_price_history;
CREATE POLICY "Staff view price history" ON public.store_price_history
    FOR SELECT TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Service role full access price history" ON public.store_price_history;
CREATE POLICY "Service role full access price history" ON public.store_price_history
    FOR ALL TO service_role USING (true);

-- Reviews: Public read approved, customers manage own
DROP POLICY IF EXISTS "Public read approved reviews" ON public.store_reviews;
CREATE POLICY "Public read approved reviews" ON public.store_reviews
    FOR SELECT USING (is_approved = true AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Customers manage own reviews" ON public.store_reviews;
CREATE POLICY "Customers manage own reviews" ON public.store_reviews
    FOR ALL TO authenticated
    USING (customer_id = auth.uid() AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Staff manage reviews" ON public.store_reviews;
CREATE POLICY "Staff manage reviews" ON public.store_reviews
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Service role full access reviews" ON public.store_reviews;
CREATE POLICY "Service role full access reviews" ON public.store_reviews
    FOR ALL TO service_role USING (true);

-- Wishlist: Customers manage own
DROP POLICY IF EXISTS "Customers manage own wishlist" ON public.store_wishlist;
CREATE POLICY "Customers manage own wishlist" ON public.store_wishlist
    FOR ALL TO authenticated
    USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "Service role full access wishlist" ON public.store_wishlist;
CREATE POLICY "Service role full access wishlist" ON public.store_wishlist
    FOR ALL TO service_role USING (true);

-- =============================================================================
-- PROCUREMENT LEADS POLICIES
-- =============================================================================
-- Only staff can see and manage their clinic's procurement leads

DROP POLICY IF EXISTS "Staff manage procurement leads" ON public.procurement_leads;
CREATE POLICY "Staff manage procurement leads" ON public.procurement_leads
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Service role full access procurement leads" ON public.procurement_leads;
CREATE POLICY "Service role full access procurement leads" ON public.procurement_leads
    FOR ALL TO service_role USING (true);

-- =============================================================================
-- CLINIC PRODUCT ASSIGNMENTS POLICIES
-- =============================================================================
-- Public can read active assignments (for store browsing)
-- Staff manage their clinic's product assignments

-- Public read for store catalog display
DROP POLICY IF EXISTS "Public read active assignments" ON public.clinic_product_assignments;
CREATE POLICY "Public read active assignments" ON public.clinic_product_assignments
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Staff manage product assignments" ON public.clinic_product_assignments;
CREATE POLICY "Staff manage product assignments" ON public.clinic_product_assignments
    FOR ALL TO authenticated
    USING (public.is_staff_of(tenant_id));

DROP POLICY IF EXISTS "Service role full access product assignments" ON public.clinic_product_assignments;
CREATE POLICY "Service role full access product assignments" ON public.clinic_product_assignments
    FOR ALL TO service_role USING (true);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_store_categories_tenant ON public.store_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_categories_parent ON public.store_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_store_categories_slug ON public.store_categories(slug);

CREATE INDEX IF NOT EXISTS idx_store_brands_tenant ON public.store_brands(tenant_id);

CREATE INDEX IF NOT EXISTS idx_store_products_tenant ON public.store_products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_products_category ON public.store_products(category_id);
CREATE INDEX IF NOT EXISTS idx_store_products_brand ON public.store_products(brand_id);
CREATE INDEX IF NOT EXISTS idx_store_products_sku ON public.store_products(sku);
CREATE INDEX IF NOT EXISTS idx_store_products_active ON public.store_products(is_active)
    WHERE is_active = true AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_store_products_featured ON public.store_products(is_featured)
    WHERE is_featured = true AND is_active = true AND deleted_at IS NULL;

-- Product list covering index
CREATE INDEX IF NOT EXISTS idx_store_products_list ON public.store_products(tenant_id, category_id, display_order)
    INCLUDE (name, base_price, sale_price, image_url, is_featured)
    WHERE is_active = true AND deleted_at IS NULL;

-- Product search (requires pg_trgm extension)
CREATE INDEX IF NOT EXISTS idx_products_search ON public.store_products USING gin(name gin_trgm_ops);

-- Featured products
CREATE INDEX IF NOT EXISTS idx_products_featured_list ON public.store_products(tenant_id)
    INCLUDE (name, base_price, sale_price, image_url, category_id)
    WHERE is_featured = true AND is_active = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_store_inventory_product ON public.store_inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_store_inventory_tenant ON public.store_inventory(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_inventory_low_stock ON public.store_inventory(stock_quantity)
    WHERE stock_quantity <= min_stock_level;

CREATE INDEX IF NOT EXISTS idx_store_inventory_txn_tenant ON public.store_inventory_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_inventory_txn_product ON public.store_inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_store_inventory_txn_date_brin ON public.store_inventory_transactions
    USING BRIN(created_at) WITH (pages_per_range = 32);

CREATE INDEX IF NOT EXISTS idx_store_campaigns_tenant ON public.store_campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_campaigns_active ON public.store_campaigns(start_date, end_date)
    WHERE is_active = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_store_campaign_items_campaign ON public.store_campaign_items(campaign_id);
CREATE INDEX IF NOT EXISTS idx_store_campaign_items_tenant ON public.store_campaign_items(tenant_id);

CREATE INDEX IF NOT EXISTS idx_store_coupons_tenant ON public.store_coupons(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_coupons_code ON public.store_coupons(code);

CREATE INDEX IF NOT EXISTS idx_store_orders_tenant ON public.store_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_customer ON public.store_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_status ON public.store_orders(status)
    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_store_orders_date_brin ON public.store_orders
    USING BRIN(created_at) WITH (pages_per_range = 32);

CREATE INDEX IF NOT EXISTS idx_store_order_items_order ON public.store_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_store_order_items_tenant ON public.store_order_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_order_items_product ON public.store_order_items(product_id);

CREATE INDEX IF NOT EXISTS idx_store_price_history_product ON public.store_price_history(product_id);

-- BRIN index for price history
CREATE INDEX IF NOT EXISTS idx_store_price_history_date_brin ON public.store_price_history
    USING BRIN(created_at) WITH (pages_per_range = 32);

CREATE INDEX IF NOT EXISTS idx_store_reviews_product ON public.store_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_store_reviews_customer ON public.store_reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_store_reviews_tenant ON public.store_reviews(tenant_id);

CREATE INDEX IF NOT EXISTS idx_store_wishlist_customer ON public.store_wishlist(customer_id);
CREATE INDEX IF NOT EXISTS idx_store_wishlist_product ON public.store_wishlist(product_id);

-- Suppliers indexes
CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON public.suppliers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_global_active ON public.suppliers(is_active)
    WHERE tenant_id IS NULL AND is_active = true AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON public.suppliers(name);

-- Procurement leads indexes (BRIN for time-series)
CREATE INDEX IF NOT EXISTS idx_procurement_leads_tenant ON public.procurement_leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_procurement_leads_status ON public.procurement_leads(status)
    WHERE status IN ('new', 'processing');
CREATE INDEX IF NOT EXISTS idx_procurement_leads_date_brin ON public.procurement_leads
    USING BRIN(detected_at) WITH (pages_per_range = 32);
CREATE INDEX IF NOT EXISTS idx_procurement_leads_matched_product ON public.procurement_leads(matched_product_id)
    WHERE matched_product_id IS NOT NULL;

-- Clinic product assignments indexes
CREATE INDEX IF NOT EXISTS idx_clinic_product_assignments_tenant ON public.clinic_product_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clinic_product_assignments_product ON public.clinic_product_assignments(catalog_product_id);
CREATE INDEX IF NOT EXISTS idx_clinic_product_assignments_active ON public.clinic_product_assignments(tenant_id)
    WHERE is_active = true;

-- Store products B2B indexes
CREATE INDEX IF NOT EXISTS idx_store_products_global_catalog ON public.store_products(is_global_catalog)
    WHERE is_global_catalog = true AND is_active = true AND tenant_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_store_products_supplier ON public.store_products(default_supplier_id)
    WHERE default_supplier_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_store_products_verification ON public.store_products(verification_status)
    WHERE verification_status = 'pending';

-- GIN indexes for array columns (efficient array containment queries)
CREATE INDEX IF NOT EXISTS idx_store_products_species_gin ON public.store_products USING gin(target_species)
    WHERE target_species IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_store_coupons_products_gin ON public.store_coupons USING gin(applicable_products)
    WHERE applicable_products IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_store_coupons_categories_gin ON public.store_coupons USING gin(applicable_categories)
    WHERE applicable_categories IS NOT NULL;

-- GIN indexes for JSONB columns (efficient key/value queries)
CREATE INDEX IF NOT EXISTS idx_store_products_attributes_gin ON public.store_products USING gin(attributes jsonb_path_ops)
    WHERE attributes IS NOT NULL AND attributes != '{}';
CREATE INDEX IF NOT EXISTS idx_store_products_dimensions_gin ON public.store_products USING gin(dimensions jsonb_path_ops)
    WHERE dimensions IS NOT NULL;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS handle_updated_at ON public.store_categories;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.store_categories
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.store_products;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.store_products
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.store_inventory;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.store_inventory
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.store_campaigns;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.store_campaigns
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.store_coupons;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.store_coupons
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.store_orders;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.store_orders
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.store_reviews;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.store_reviews
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- B2B Tables triggers
DROP TRIGGER IF EXISTS handle_updated_at ON public.suppliers;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.suppliers
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.procurement_leads;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.procurement_leads
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.clinic_product_assignments;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.clinic_product_assignments
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-set tenant_id for child tables
CREATE OR REPLACE FUNCTION public.store_campaign_items_set_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        SELECT tenant_id INTO NEW.tenant_id
        FROM public.store_campaigns
        WHERE id = NEW.campaign_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS campaign_items_auto_tenant ON public.store_campaign_items;
CREATE TRIGGER campaign_items_auto_tenant
    BEFORE INSERT ON public.store_campaign_items
    FOR EACH ROW EXECUTE FUNCTION public.store_campaign_items_set_tenant_id();

CREATE OR REPLACE FUNCTION public.store_order_items_set_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        SELECT tenant_id INTO NEW.tenant_id
        FROM public.store_orders
        WHERE id = NEW.order_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS order_items_auto_tenant ON public.store_order_items;
CREATE TRIGGER order_items_auto_tenant
    BEFORE INSERT ON public.store_order_items
    FOR EACH ROW EXECUTE FUNCTION public.store_order_items_set_tenant_id();

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Update inventory on transaction
CREATE OR REPLACE FUNCTION public.update_inventory_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- Update or insert inventory
    INSERT INTO public.store_inventory (product_id, tenant_id, stock_quantity, weighted_average_cost)
    VALUES (
        NEW.product_id,
        NEW.tenant_id,
        NEW.quantity,
        COALESCE(NEW.unit_cost, 0)
    )
    ON CONFLICT (product_id) DO UPDATE SET
        stock_quantity = public.store_inventory.stock_quantity + NEW.quantity,
        weighted_average_cost = CASE
            WHEN NEW.type = 'purchase' AND NEW.quantity > 0 THEN
                (public.store_inventory.stock_quantity * public.store_inventory.weighted_average_cost +
                 NEW.quantity * COALESCE(NEW.unit_cost, 0)) /
                NULLIF(public.store_inventory.stock_quantity + NEW.quantity, 0)
            ELSE public.store_inventory.weighted_average_cost
        END,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS inventory_txn_update_stock ON public.store_inventory_transactions;
CREATE TRIGGER inventory_txn_update_stock
    AFTER INSERT ON public.store_inventory_transactions
    FOR EACH ROW EXECUTE FUNCTION public.update_inventory_on_transaction();

-- Track price changes
CREATE OR REPLACE FUNCTION public.track_price_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.base_price IS DISTINCT FROM NEW.base_price THEN
        INSERT INTO public.store_price_history (tenant_id, product_id, old_price, new_price, price_type, changed_by)
        VALUES (NEW.tenant_id, NEW.id, OLD.base_price, NEW.base_price, 'base', auth.uid());
    END IF;

    IF OLD.sale_price IS DISTINCT FROM NEW.sale_price THEN
        INSERT INTO public.store_price_history (tenant_id, product_id, old_price, new_price, price_type, changed_by)
        VALUES (NEW.tenant_id, NEW.id, OLD.sale_price, NEW.sale_price, 'sale', auth.uid());
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS product_price_change ON public.store_products;
CREATE TRIGGER product_price_change
    AFTER UPDATE ON public.store_products
    FOR EACH ROW EXECUTE FUNCTION public.track_price_change();

-- Validate coupon
CREATE OR REPLACE FUNCTION public.validate_coupon(
    p_tenant_id TEXT,
    p_code TEXT,
    p_user_id UUID DEFAULT NULL,
    p_cart_total NUMERIC DEFAULT 0
)
RETURNS TABLE (
    is_valid BOOLEAN,
    coupon_id UUID,
    discount_type TEXT,
    discount_value NUMERIC,
    message TEXT
) AS $$
DECLARE
    v_coupon public.store_coupons%ROWTYPE;
    v_user_usage INTEGER;
BEGIN
    SELECT * INTO v_coupon
    FROM public.store_coupons
    WHERE tenant_id = p_tenant_id AND UPPER(code) = UPPER(p_code) AND is_active = true AND deleted_at IS NULL;

    IF v_coupon IS NULL THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::NUMERIC, 'Cupón no encontrado'::TEXT;
        RETURN;
    END IF;

    IF v_coupon.valid_from > NOW() THEN
        RETURN QUERY SELECT false, v_coupon.id, NULL::TEXT, NULL::NUMERIC, 'Cupón aún no válido'::TEXT;
        RETURN;
    END IF;

    IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < NOW() THEN
        RETURN QUERY SELECT false, v_coupon.id, NULL::TEXT, NULL::NUMERIC, 'Cupón expirado'::TEXT;
        RETURN;
    END IF;

    IF v_coupon.usage_limit IS NOT NULL AND v_coupon.usage_count >= v_coupon.usage_limit THEN
        RETURN QUERY SELECT false, v_coupon.id, NULL::TEXT, NULL::NUMERIC, 'Cupón agotado'::TEXT;
        RETURN;
    END IF;

    IF p_cart_total < v_coupon.min_purchase_amount THEN
        RETURN QUERY SELECT false, v_coupon.id, NULL::TEXT, NULL::NUMERIC,
            ('Mínimo de compra: ' || v_coupon.min_purchase_amount::TEXT)::TEXT;
        RETURN;
    END IF;

    RETURN QUERY SELECT true, v_coupon.id, v_coupon.discount_type, v_coupon.discount_value, 'Cupón válido'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Generate order number
CREATE OR REPLACE FUNCTION public.generate_order_number(p_tenant_id TEXT)
RETURNS TEXT AS $$
DECLARE
    v_seq INTEGER;
    v_lock_key BIGINT;
BEGIN
    -- Orders don't reset yearly, so we use year = 0
    v_lock_key := hashtext(p_tenant_id || ':order:0');

    -- Acquire advisory lock
    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- Upsert with year = 0 to indicate non-yearly sequence
    INSERT INTO public.document_sequences (tenant_id, document_type, year, current_sequence, prefix)
    VALUES (p_tenant_id, 'order', 0, 1, 'ORD')
    ON CONFLICT (tenant_id, document_type, year)
    DO UPDATE SET
        current_sequence = public.document_sequences.current_sequence + 1,
        updated_at = NOW()
    RETURNING current_sequence INTO v_seq;

    RETURN 'ORD' || LPAD(v_seq::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =============================================================================
-- B2B FUNCTIONS
-- =============================================================================

-- Calculate margin percentage for clinic product assignment
CREATE OR REPLACE FUNCTION public.calculate_product_margin()
RETURNS TRIGGER AS $$
DECLARE
    v_unit_cost NUMERIC(12,4);
BEGIN
    -- Get the unit_cost from the catalog product
    SELECT unit_cost INTO v_unit_cost
    FROM public.store_products
    WHERE id = NEW.catalog_product_id;

    -- Calculate margin: ((sale_price - unit_cost) / sale_price) * 100
    IF v_unit_cost IS NOT NULL AND NEW.sale_price > 0 THEN
        NEW.margin_percentage := ((NEW.sale_price - v_unit_cost) / NEW.sale_price) * 100;
    ELSE
        NEW.margin_percentage := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS calc_margin_on_assignment ON public.clinic_product_assignments;
CREATE TRIGGER calc_margin_on_assignment
    BEFORE INSERT OR UPDATE OF sale_price ON public.clinic_product_assignments
    FOR EACH ROW EXECUTE FUNCTION public.calculate_product_margin();

-- Get global catalog products with supplier info
CREATE OR REPLACE FUNCTION public.get_catalog_products(
    p_category_id UUID DEFAULT NULL,
    p_brand_id UUID DEFAULT NULL,
    p_search TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    sku TEXT,
    name TEXT,
    category_name TEXT,
    brand_name TEXT,
    supplier_name TEXT,
    purchase_unit TEXT,
    sale_unit TEXT,
    conversion_factor NUMERIC,
    purchase_price NUMERIC,
    unit_cost NUMERIC,
    base_price NUMERIC,
    image_url TEXT,
    target_species TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.sku,
        p.name,
        c.name AS category_name,
        b.name AS brand_name,
        s.name AS supplier_name,
        p.purchase_unit,
        p.sale_unit,
        p.conversion_factor,
        p.purchase_price,
        p.unit_cost,
        p.base_price,
        p.image_url,
        p.target_species
    FROM public.store_products p
    LEFT JOIN public.store_categories c ON c.id = p.category_id
    LEFT JOIN public.store_brands b ON b.id = p.brand_id
    LEFT JOIN public.suppliers s ON s.id = p.default_supplier_id
    WHERE p.tenant_id IS NULL  -- Global catalog only
      AND p.is_global_catalog = true
      AND p.is_active = true
      AND p.deleted_at IS NULL
      AND (p_category_id IS NULL OR p.category_id = p_category_id)
      AND (p_brand_id IS NULL OR p.brand_id = p_brand_id)
      AND (p_search IS NULL OR p.name ILIKE '%' || p_search || '%' OR p.sku ILIKE '%' || p_search || '%')
    ORDER BY p.name
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Import procurement lead from external data
CREATE OR REPLACE FUNCTION public.import_procurement_lead(
    p_tenant_id TEXT,
    p_product_name TEXT,
    p_brand_name TEXT DEFAULT NULL,
    p_supplier_name TEXT DEFAULT NULL,
    p_price_paid NUMERIC DEFAULT NULL,
    p_quantity NUMERIC DEFAULT NULL,
    p_unit TEXT DEFAULT NULL,
    p_invoice_date DATE DEFAULT NULL,
    p_raw_data JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
    v_lead_id UUID;
    v_matched_product_id UUID;
    v_matched_brand_id UUID;
    v_matched_supplier_id UUID;
    v_match_confidence INTEGER := 0;
BEGIN
    -- Try to match product by name (fuzzy match)
    SELECT id INTO v_matched_product_id
    FROM public.store_products
    WHERE tenant_id IS NULL  -- Only global catalog
      AND is_global_catalog = true
      AND is_active = true
      AND (
          name ILIKE '%' || p_product_name || '%'
          OR p_product_name ILIKE '%' || name || '%'
      )
    ORDER BY similarity(name, p_product_name) DESC
    LIMIT 1;

    IF v_matched_product_id IS NOT NULL THEN
        v_match_confidence := v_match_confidence + 40;
    END IF;

    -- Try to match brand
    IF p_brand_name IS NOT NULL THEN
        SELECT id INTO v_matched_brand_id
        FROM public.store_brands
        WHERE tenant_id IS NULL  -- Only global brands
          AND is_active = true
          AND name ILIKE '%' || p_brand_name || '%'
        LIMIT 1;

        IF v_matched_brand_id IS NOT NULL THEN
            v_match_confidence := v_match_confidence + 30;
        END IF;
    END IF;

    -- Try to match supplier
    IF p_supplier_name IS NOT NULL THEN
        SELECT id INTO v_matched_supplier_id
        FROM public.suppliers
        WHERE tenant_id IS NULL  -- Only global suppliers
          AND is_active = true
          AND name ILIKE '%' || p_supplier_name || '%'
        LIMIT 1;

        IF v_matched_supplier_id IS NOT NULL THEN
            v_match_confidence := v_match_confidence + 30;
        END IF;
    END IF;

    -- Insert the lead
    INSERT INTO public.procurement_leads (
        tenant_id,
        raw_product_name,
        raw_brand_name,
        raw_supplier_name,
        raw_price_paid,
        raw_quantity,
        raw_unit,
        raw_invoice_date,
        raw_data,
        matched_product_id,
        matched_brand_id,
        matched_supplier_id,
        match_confidence,
        status,
        is_new_product,
        is_new_brand,
        is_new_supplier
    ) VALUES (
        p_tenant_id,
        p_product_name,
        p_brand_name,
        p_supplier_name,
        p_price_paid,
        p_quantity,
        p_unit,
        p_invoice_date,
        p_raw_data,
        v_matched_product_id,
        v_matched_brand_id,
        v_matched_supplier_id,
        v_match_confidence,
        CASE WHEN v_match_confidence >= 70 THEN 'matched' ELSE 'unmatched' END,
        v_matched_product_id IS NULL,
        p_brand_name IS NOT NULL AND v_matched_brand_id IS NULL,
        p_supplier_name IS NOT NULL AND v_matched_supplier_id IS NULL
    )
    RETURNING id INTO v_lead_id;

    RETURN v_lead_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Get clinic's product inventory with margin info
CREATE OR REPLACE FUNCTION public.get_clinic_inventory(
    p_tenant_id TEXT,
    p_include_global BOOLEAN DEFAULT true
)
RETURNS TABLE (
    product_id UUID,
    sku TEXT,
    name TEXT,
    category_name TEXT,
    brand_name TEXT,
    is_global BOOLEAN,
    purchase_unit TEXT,
    sale_unit TEXT,
    conversion_factor NUMERIC,
    purchase_price NUMERIC,
    unit_cost NUMERIC,
    sale_price NUMERIC,
    margin_percentage NUMERIC,
    stock_quantity NUMERIC,
    min_stock_level NUMERIC,
    location TEXT,
    requires_prescription BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    -- Local products
    SELECT
        p.id AS product_id,
        p.sku,
        p.name,
        c.name AS category_name,
        b.name AS brand_name,
        false AS is_global,
        p.purchase_unit,
        p.sale_unit,
        p.conversion_factor,
        p.purchase_price,
        p.unit_cost,
        p.base_price AS sale_price,
        CASE WHEN p.unit_cost > 0 AND p.base_price > 0
             THEN ((p.base_price - p.unit_cost) / p.base_price) * 100
             ELSE NULL
        END AS margin_percentage,
        COALESCE(i.stock_quantity, 0) AS stock_quantity,
        COALESCE(i.min_stock_level, 0) AS min_stock_level,
        i.location,
        p.requires_prescription
    FROM public.store_products p
    LEFT JOIN public.store_categories c ON c.id = p.category_id
    LEFT JOIN public.store_brands b ON b.id = p.brand_id
    LEFT JOIN public.store_inventory i ON i.product_id = p.id
    WHERE p.tenant_id = p_tenant_id
      AND p.is_active = true
      AND p.deleted_at IS NULL

    UNION ALL

    -- Global catalog products assigned to this clinic
    SELECT
        p.id AS product_id,
        p.sku,
        p.name,
        c.name AS category_name,
        b.name AS brand_name,
        true AS is_global,
        p.purchase_unit,
        p.sale_unit,
        p.conversion_factor,
        p.purchase_price,
        p.unit_cost,
        a.sale_price,
        a.margin_percentage,
        COALESCE(i.stock_quantity, 0) AS stock_quantity,
        COALESCE(a.min_stock_level, 0) AS min_stock_level,
        a.location,
        COALESCE(a.requires_prescription, p.requires_prescription)
    FROM public.clinic_product_assignments a
    JOIN public.store_products p ON p.id = a.catalog_product_id
    LEFT JOIN public.store_categories c ON c.id = p.category_id
    LEFT JOIN public.store_brands b ON b.id = p.brand_id
    LEFT JOIN public.store_inventory i ON i.product_id = p.id AND i.tenant_id = a.tenant_id
    WHERE a.tenant_id = p_tenant_id
      AND a.is_active = true
      AND p.is_active = true
      AND p_include_global = true

    ORDER BY name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

