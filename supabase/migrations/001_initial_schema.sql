-- =============================================================================
-- Fun4Me Store - Phase 1 Initial Schema
-- Paraguayan Adult Store / Sex Shop E-commerce Platform
-- All prices in Guaranies (PYG) as bigint (no decimals)
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. CATEGORIES
-- =============================================================================
CREATE TABLE categories (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  description TEXT,
  parent_id  UUID REFERENCES categories(id) ON DELETE SET NULL,
  image_url  TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_active ON categories(is_active) WHERE is_active = true;

-- =============================================================================
-- 2. PRODUCTS
-- =============================================================================
CREATE TABLE products (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,
  description       TEXT,
  price             BIGINT NOT NULL CHECK (price >= 0),
  compare_at_price  BIGINT CHECK (compare_at_price IS NULL OR compare_at_price >= 0),
  category_id       UUID REFERENCES categories(id) ON DELETE SET NULL,
  brand             TEXT,
  sku               TEXT UNIQUE,
  images            TEXT[] DEFAULT '{}',
  tags              TEXT[] DEFAULT '{}',
  experience_level  TEXT CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
  material          TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  is_featured       BOOLEAN NOT NULL DEFAULT false,
  stock_quantity    INTEGER NOT NULL DEFAULT 0,
  meta_title        TEXT,
  meta_description  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_active ON products(is_active) WHERE is_active = true;
CREATE INDEX idx_products_featured ON products(is_featured) WHERE is_featured = true;
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_tags ON products USING GIN(tags);
CREATE INDEX idx_products_price ON products(price);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 3. KINK CATEGORIES
-- =============================================================================
CREATE TABLE kink_categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url   TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_kink_categories_slug ON kink_categories(slug);

-- =============================================================================
-- 4. PRODUCT_KINKS (junction table)
-- =============================================================================
CREATE TABLE product_kinks (
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  kink_id    UUID NOT NULL REFERENCES kink_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, kink_id)
);

CREATE INDEX idx_product_kinks_kink ON product_kinks(kink_id);

-- =============================================================================
-- 5. CUSTOMERS
-- =============================================================================
CREATE TABLE customers (
  id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name        TEXT,
  phone            TEXT,
  age_verified     BOOLEAN NOT NULL DEFAULT false,
  addresses        JSONB NOT NULL DEFAULT '[]'::jsonb,
  newsletter_opt_in BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 6. ORDERS
-- =============================================================================

-- Sequence for human-readable order numbers
CREATE SEQUENCE order_number_seq START WITH 1001;

CREATE TABLE orders (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number     INTEGER NOT NULL DEFAULT nextval('order_number_seq') UNIQUE,
  customer_id      UUID REFERENCES customers(id) ON DELETE SET NULL,
  guest_email      TEXT,
  guest_phone      TEXT,
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN (
                     'pending', 'payment_pending', 'payment_confirmed',
                     'preparing', 'shipped', 'delivered', 'completed', 'cancelled'
                   )),
  subtotal         BIGINT NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  shipping_cost    BIGINT NOT NULL DEFAULT 0 CHECK (shipping_cost >= 0),
  discount_amount  BIGINT NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total            BIGINT NOT NULL DEFAULT 0 CHECK (total >= 0),
  payment_method   TEXT CHECK (payment_method IN ('bank_transfer', 'cod', 'bancard', 'gift_card')),
  payment_ref      TEXT,
  shipping_address JSONB,
  notes            TEXT,
  is_gift          BOOLEAN NOT NULL DEFAULT false,
  gift_message     TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_number ON orders(order_number);

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 7. ORDER ITEMS
-- =============================================================================
CREATE TABLE order_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id     UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id   UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,  -- snapshot of product name at time of order
  quantity     INTEGER NOT NULL CHECK (quantity > 0),
  unit_price   BIGINT NOT NULL CHECK (unit_price >= 0),
  line_total   BIGINT NOT NULL CHECK (line_total >= 0)
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

-- =============================================================================
-- 8. SHIPPING ZONES
-- =============================================================================
CREATE TABLE shipping_zones (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           TEXT NOT NULL,
  neighborhoods  TEXT[] DEFAULT '{}',
  price          BIGINT NOT NULL CHECK (price >= 0),
  free_above     BIGINT CHECK (free_above IS NULL OR free_above >= 0),
  est_days       TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  sort_order     INTEGER NOT NULL DEFAULT 0
);

-- =============================================================================
-- 9. PAYMENT TRANSACTIONS
-- =============================================================================
CREATE TABLE payment_transactions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  method        TEXT NOT NULL,
  provider      TEXT,
  provider_ref  TEXT,
  amount        BIGINT NOT NULL CHECK (amount >= 0),
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'confirmed', 'failed', 'refunded')),
  metadata      JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_transactions_order ON payment_transactions(order_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);

-- =============================================================================
-- 10. BANK TRANSFER RECEIPTS
-- =============================================================================
CREATE TABLE bank_transfer_receipts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  image_url   TEXT NOT NULL,
  verified    BOOLEAN NOT NULL DEFAULT false,
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bank_transfer_receipts_order ON bank_transfer_receipts(order_id);
CREATE INDEX idx_bank_transfer_receipts_unverified ON bank_transfer_receipts(verified) WHERE verified = false;

-- =============================================================================
-- 11. COUPONS
-- =============================================================================
CREATE TABLE coupons (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code       TEXT NOT NULL UNIQUE,
  type       TEXT NOT NULL CHECK (type IN ('percentage', 'fixed', 'free_shipping')),
  value      BIGINT NOT NULL DEFAULT 0 CHECK (value >= 0),
  min_order  BIGINT DEFAULT 0 CHECK (min_order >= 0),
  max_uses   INTEGER,
  uses_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active  BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_active ON coupons(is_active) WHERE is_active = true;

-- =============================================================================
-- 12. SITE SETTINGS
-- =============================================================================
CREATE TABLE site_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_site_settings_updated_at
  BEFORE UPDATE ON site_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE kink_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_kinks ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transfer_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- PUBLIC READ policies (anon + authenticated can read active catalog data)
-- ---------------------------------------------------------------------------

-- Categories: public read active
CREATE POLICY "categories_public_read" ON categories
  FOR SELECT USING (is_active = true);

-- Products: public read active
CREATE POLICY "products_public_read" ON products
  FOR SELECT USING (is_active = true);

-- Kink categories: public read all
CREATE POLICY "kink_categories_public_read" ON kink_categories
  FOR SELECT USING (true);

-- Product kinks: public read all
CREATE POLICY "product_kinks_public_read" ON product_kinks
  FOR SELECT USING (true);

-- Shipping zones: public read active
CREATE POLICY "shipping_zones_public_read" ON shipping_zones
  FOR SELECT USING (is_active = true);

-- Coupons: public read active (needed for coupon validation on frontend)
CREATE POLICY "coupons_public_read" ON coupons
  FOR SELECT USING (is_active = true);

-- Site settings: public read
CREATE POLICY "site_settings_public_read" ON site_settings
  FOR SELECT USING (true);

-- ---------------------------------------------------------------------------
-- AUTHENTICATED CUSTOMER policies (own data only)
-- ---------------------------------------------------------------------------

-- Customers: read own profile
CREATE POLICY "customers_select_own" ON customers
  FOR SELECT USING (auth.uid() = id);

-- Customers: insert own profile
CREATE POLICY "customers_insert_own" ON customers
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Customers: update own profile
CREATE POLICY "customers_update_own" ON customers
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Orders: read own orders
CREATE POLICY "orders_select_own" ON orders
  FOR SELECT USING (auth.uid() = customer_id);

-- Orders: insert own orders
CREATE POLICY "orders_insert_own" ON orders
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

-- Orders: update own orders (limited - e.g., cancel)
CREATE POLICY "orders_update_own" ON orders
  FOR UPDATE USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

-- Order items: read own order items
CREATE POLICY "order_items_select_own" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
        AND orders.customer_id = auth.uid()
    )
  );

-- Order items: insert own order items
CREATE POLICY "order_items_insert_own" ON order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
        AND orders.customer_id = auth.uid()
    )
  );

-- Bank transfer receipts: authenticated users can insert for their orders
CREATE POLICY "receipts_insert_own" ON bank_transfer_receipts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = bank_transfer_receipts.order_id
        AND orders.customer_id = auth.uid()
    )
  );

-- Bank transfer receipts: read own
CREATE POLICY "receipts_select_own" ON bank_transfer_receipts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = bank_transfer_receipts.order_id
        AND orders.customer_id = auth.uid()
    )
  );

-- Payment transactions: read own
CREATE POLICY "payment_transactions_select_own" ON payment_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = payment_transactions.order_id
        AND orders.customer_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- SERVICE ROLE (admin) policies - full access
-- Service role bypasses RLS by default in Supabase, but we add explicit
-- policies for clarity and for any custom admin roles
-- ---------------------------------------------------------------------------

CREATE POLICY "categories_admin_all" ON categories
  FOR ALL USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "products_admin_all" ON products
  FOR ALL USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "kink_categories_admin_all" ON kink_categories
  FOR ALL USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "product_kinks_admin_all" ON product_kinks
  FOR ALL USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "customers_admin_all" ON customers
  FOR ALL USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "orders_admin_all" ON orders
  FOR ALL USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "order_items_admin_all" ON order_items
  FOR ALL USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "shipping_zones_admin_all" ON shipping_zones
  FOR ALL USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "payment_transactions_admin_all" ON payment_transactions
  FOR ALL USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "bank_transfer_receipts_admin_all" ON bank_transfer_receipts
  FOR ALL USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "coupons_admin_all" ON coupons
  FOR ALL USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "site_settings_admin_all" ON site_settings
  FOR ALL USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- =============================================================================
-- STORAGE BUCKETS
-- =============================================================================

-- Product images bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,  -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO NOTHING;

-- Receipts bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts',
  'receipts',
  false,
  10485760,  -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for product-images (public read)
CREATE POLICY "product_images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

-- Storage policies for product-images (admin upload)
CREATE POLICY "product_images_admin_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'product-images'
    AND auth.jwt()->>'role' = 'service_role'
  );

CREATE POLICY "product_images_admin_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'product-images'
    AND auth.jwt()->>'role' = 'service_role'
  );

CREATE POLICY "product_images_admin_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'product-images'
    AND auth.jwt()->>'role' = 'service_role'
  );

-- Storage policies for receipts (authenticated users can upload)
CREATE POLICY "receipts_auth_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'receipts'
    AND auth.role() = 'authenticated'
  );

-- Storage policies for receipts (users can read own, admin reads all)
CREATE POLICY "receipts_auth_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'receipts'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR auth.jwt()->>'role' = 'service_role'
    )
  );

-- Admin full access to receipts
CREATE POLICY "receipts_admin_all" ON storage.objects
  FOR ALL USING (
    bucket_id = 'receipts'
    AND auth.jwt()->>'role' = 'service_role'
  );

-- =============================================================================
-- HELPFUL VIEWS
-- =============================================================================

-- Product catalog view with category name
CREATE OR REPLACE VIEW product_catalog AS
SELECT
  p.*,
  c.name AS category_name,
  c.slug AS category_slug
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.is_active = true;

-- Order summary view
CREATE OR REPLACE VIEW order_summary AS
SELECT
  o.*,
  cu.full_name AS customer_name,
  cu.phone AS customer_phone,
  json_agg(
    json_build_object(
      'product_name', oi.product_name,
      'quantity', oi.quantity,
      'unit_price', oi.unit_price,
      'line_total', oi.line_total
    )
  ) AS items
FROM orders o
LEFT JOIN customers cu ON o.customer_id = cu.id
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, cu.full_name, cu.phone;

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to validate coupon
CREATE OR REPLACE FUNCTION validate_coupon(coupon_code TEXT, order_subtotal BIGINT)
RETURNS JSONB AS $$
DECLARE
  c coupons%ROWTYPE;
  discount BIGINT;
BEGIN
  SELECT * INTO c FROM coupons
  WHERE code = UPPER(coupon_code)
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR uses_count < max_uses);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Cupón inválido o expirado');
  END IF;

  IF order_subtotal < c.min_order THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', format('El pedido mínimo para este cupón es Gs %s', to_char(c.min_order, 'FM999,999,999'))
    );
  END IF;

  CASE c.type
    WHEN 'percentage' THEN
      discount := (order_subtotal * c.value) / 100;
    WHEN 'fixed' THEN
      discount := c.value;
    WHEN 'free_shipping' THEN
      discount := 0;  -- shipping discount handled separately
  END CASE;

  RETURN jsonb_build_object(
    'valid', true,
    'coupon_id', c.id,
    'type', c.type,
    'value', c.value,
    'discount', discount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement stock on order
CREATE OR REPLACE FUNCTION decrement_stock()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET stock_quantity = stock_quantity - NEW.quantity
  WHERE id = NEW.product_id
    AND stock_quantity >= NEW.quantity;

  IF NOT FOUND AND NEW.product_id IS NOT NULL THEN
    RAISE EXCEPTION 'Insufficient stock for product %', NEW.product_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_order_items_decrement_stock
  AFTER INSERT ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION decrement_stock();

-- =============================================================================
-- DONE - Phase 1 schema complete
-- =============================================================================
