-- Temporary store tables setup
CREATE TABLE IF NOT EXISTS public.store_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  short_description TEXT,
  base_price NUMERIC NOT NULL DEFAULT 0,
  image_url TEXT,
  images TEXT[],
  target_species TEXT[],
  requires_prescription BOOLEAN DEFAULT false,
  is_global_catalog BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.store_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.store_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  logo_url TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Add foreign key columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_products' AND column_name = 'store_categories_id') THEN
    ALTER TABLE public.store_products ADD COLUMN store_categories_id UUID REFERENCES public.store_categories(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_products' AND column_name = 'store_brands_id') THEN
    ALTER TABLE public.store_products ADD COLUMN store_brands_id UUID REFERENCES public.store_brands(id);
  END IF;
END $$;

-- Create additional tables needed for assignment
CREATE TABLE IF NOT EXISTS public.clinic_product_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  catalog_product_id UUID NOT NULL REFERENCES public.store_products(id),
  sale_price NUMERIC NOT NULL DEFAULT 0,
  min_stock_level NUMERIC DEFAULT 5,
  location TEXT,
  requires_prescription BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, catalog_product_id)
);

-- Disable RLS for testing
ALTER TABLE public.clinic_product_assignments DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.store_inventory (
  product_id UUID PRIMARY KEY REFERENCES public.store_products(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  stock_quantity NUMERIC NOT NULL DEFAULT 0,
  min_stock_level NUMERIC DEFAULT 5,
  weighted_average_cost NUMERIC DEFAULT 0,
  location TEXT,
  batch_number TEXT,
  expiry_date DATE,
  supplier_name TEXT,
  last_restocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for testing
ALTER TABLE public.store_inventory DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.store_inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'sale', 'adjustment', 'return')),
  quantity NUMERIC NOT NULL,
  unit_cost NUMERIC DEFAULT 0,
  performed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for testing
ALTER TABLE public.store_inventory_transactions DISABLE ROW LEVEL SECURITY;

-- Insert some test data
INSERT INTO public.store_products (id, tenant_id, sku, name, base_price, is_global_catalog, is_active)
VALUES
  ('a15d6852-c843-4f40-9c62-7e9aed35e835', NULL, 'TEST001', 'Producto de Prueba 1', 10000, true, true),
  ('b41f9a6f-3127-4640-a6d9-654a99bb3155', NULL, 'TEST002', 'Producto de Prueba 2', 25000, true, true)
ON CONFLICT (id) DO NOTHING;
