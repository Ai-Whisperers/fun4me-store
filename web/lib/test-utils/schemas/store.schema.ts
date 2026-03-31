import { z } from 'zod'

/**
 * Store Brand Schema
 */
export const StoreBrandSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().min(1).optional().nullable(),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional().nullable(),
  logo_url: z.string().url().optional().nullable(),
  website_url: z.string().url().optional().nullable(),
  country: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
  created_at: z.string().datetime().optional(),
})

export type StoreBrandInput = z.input<typeof StoreBrandSchema>
export type StoreBrand = z.output<typeof StoreBrandSchema>

/**
 * Store Category Schema
 */
export const StoreCategorySchema = z
  .object({
    id: z.string().uuid().optional(),
    tenant_id: z.string().min(1).optional().nullable(),
    name: z.string().min(1),
    slug: z.string().min(1),
    description: z.string().optional().nullable(),
    parent_id: z.string().uuid().optional().nullable(),
    parent_slug: z.string().optional().nullable(), // Used for seeding hierarchy
    level: z.number().int().min(1).optional().nullable(),
    display_order: z.number().int().min(0).default(0),
    image_url: z.string().optional().nullable(), // Allow relative paths
    icon: z.string().optional().nullable(),
    is_active: z.boolean().default(true),
    created_at: z.string().datetime().optional(),
  })
  .passthrough()

export type StoreCategoryInput = z.input<typeof StoreCategorySchema>
export type StoreCategory = z.output<typeof StoreCategorySchema>

/**
 * Supplier Schema
 */
export const SupplierSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().min(1).optional().nullable(),
  name: z.string().min(1),
  code: z.string().optional().nullable(),
  contact_name: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  payment_terms: z.string().optional().nullable(),
  lead_time_days: z.number().int().min(0).optional().nullable(),
  is_active: z.boolean().default(true),
  created_at: z.string().datetime().optional(),
})

export type SupplierInput = z.input<typeof SupplierSchema>
export type Supplier = z.output<typeof SupplierSchema>

/**
 * Store Product Schema
 */
export const StoreProductSchema = z
  .object({
    id: z.string().uuid().optional(),
    tenant_id: z.string().min(1).optional().nullable(),
    category_id: z.string().uuid().optional().nullable(),
    brand_id: z.string().uuid().optional().nullable(),
    default_supplier_id: z.string().uuid().optional().nullable(),

    sku: z.string().min(1),
    barcode: z.string().optional().nullable(),
    name: z.string().min(1),
    description: z.string().optional().nullable(),
    short_description: z.string().optional().nullable(),

    // Unit configuration
    purchase_unit: z.string().default('Unidad'),
    sale_unit: z.string().default('Unidad'),
    conversion_factor: z.number().positive().default(1),

    // Pricing
    purchase_price: z.number().min(0).optional().nullable(),
    base_price: z.number().min(0).default(0),
    sale_price: z.number().min(0).optional().nullable(),
    cost_price: z.number().min(0).optional().nullable(),

    // Attributes
    weight_grams: z.number().positive().optional().nullable(),
    dimensions: z.any().optional().nullable(), // JSONB
    attributes: z.any().optional().nullable(), // JSONB
    target_species: z.array(z.string()).optional().nullable(),

    // Images - allow relative paths
    image_url: z.string().optional().nullable(),
    images: z.array(z.string()).optional().nullable(),

    // Flags
    requires_prescription: z.boolean().default(false),
    is_active: z.boolean().default(true),
    is_featured: z.boolean().default(false),
    display_order: z.number().int().default(100),

    created_at: z.string().datetime().optional(),
    updated_at: z.string().datetime().optional(),
  })
  .passthrough()

export type StoreProductInput = z.input<typeof StoreProductSchema>
export type StoreProduct = z.output<typeof StoreProductSchema>

/**
 * Store Inventory Schema
 */
export const StoreInventorySchema = z
  .object({
    id: z.string().uuid().optional(),
    product_id: z.string().uuid(),
    tenant_id: z.string().min(1),

    stock_quantity: z.number().int().min(0).default(0),
    reserved_quantity: z.number().int().min(0).default(0),
    // available_quantity is GENERATED (stock_quantity - reserved_quantity)

    min_stock_level: z.number().int().min(0).default(0),
    reorder_point: z.number().int().min(0).optional().nullable(),
    reorder_quantity: z.number().int().min(0).optional().nullable(),

    location: z.string().optional().nullable(),
    batch_number: z.string().optional().nullable(),
    expiration_date: z.string().date().optional().nullable(),

    weighted_average_cost: z.number().min(0).optional().nullable(),
    last_purchase_price: z.number().min(0).optional().nullable(),
    last_purchase_date: z.string().datetime().optional().nullable(),

    created_at: z.string().datetime().optional(),
    updated_at: z.string().datetime().optional(),
  })
  .refine((data) => data.reserved_quantity <= data.stock_quantity, {
    message: 'Reserved quantity cannot exceed stock quantity',
  })

export type StoreInventoryInput = z.input<typeof StoreInventorySchema>
export type StoreInventory = z.output<typeof StoreInventorySchema>

/**
 * Store Order Schema
 */
export const StoreOrderSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().min(1),
  customer_id: z.string().uuid(),

  order_number: z.string().optional().nullable(),

  status: z
    .enum(['cart', 'pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'])
    .default('pending'),

  subtotal: z.number().min(0).default(0),
  discount_amount: z.number().min(0).default(0),
  tax_amount: z.number().min(0).default(0),
  shipping_amount: z.number().min(0).default(0),
  total: z.number().min(0).default(0),

  requires_prescription_review: z.boolean().default(false),
  prescription_file_url: z.string().url().optional().nullable(),
  prescription_status: z.enum(['pending', 'approved', 'rejected']).optional().nullable(),

  shipping_address: z.string().optional().nullable(),
  shipping_method: z.string().optional().nullable(),
  tracking_number: z.string().optional().nullable(),

  notes: z.string().optional().nullable(),
  payment_method: z.string().optional().nullable(),

  ordered_at: z.string().datetime().optional().nullable(),
  shipped_at: z.string().datetime().optional().nullable(),
  delivered_at: z.string().datetime().optional().nullable(),

  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
})

export type StoreOrderInput = z.input<typeof StoreOrderSchema>
export type StoreOrder = z.output<typeof StoreOrderSchema>

/**
 * Store Order Item Schema
 */
export const StoreOrderItemSchema = z.object({
  id: z.string().uuid().optional(),
  order_id: z.string().uuid(),
  tenant_id: z.string().min(1).optional(),
  product_id: z.string().uuid(),

  quantity: z.number().int().positive(),
  unit_price: z.number().min(0),
  discount_amount: z.number().min(0).default(0),
  total_price: z.number().min(0),

  requires_prescription: z.boolean().default(false),
  prescription_file_url: z.string().url().optional().nullable(),

  created_at: z.string().datetime().optional(),
})

export type StoreOrderItemInput = z.input<typeof StoreOrderItemSchema>
export type StoreOrderItem = z.output<typeof StoreOrderItemSchema>

/**
 * Store Cart Schema
 */
export const StoreCartSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().min(1),
  customer_id: z.string().uuid().optional().nullable(),
  session_id: z.string().optional().nullable(),

  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        quantity: z.number().int().positive(),
        price: z.number().min(0),
      })
    )
    .default([]),

  coupon_code: z.string().optional().nullable(),
  discount_amount: z.number().min(0).default(0),

  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
})

export type StoreCartInput = z.input<typeof StoreCartSchema>
export type StoreCart = z.output<typeof StoreCartSchema>

/**
 * Store Wishlist Schema
 */
export const StoreWishlistSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().min(1),
  user_id: z.string().uuid(),
  product_id: z.string().uuid(),
  created_at: z.string().datetime().optional(),
})

export type StoreWishlistInput = z.input<typeof StoreWishlistSchema>
export type StoreWishlist = z.output<typeof StoreWishlistSchema>

/**
 * Store Stock Alert Schema
 */
export const StoreStockAlertSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().min(1),
  product_id: z.string().uuid(),
  email: z.string().email(),
  notified: z.boolean().default(false),
  notified_at: z.string().datetime().optional().nullable(),
  created_at: z.string().datetime().optional(),
})

export type StoreStockAlertInput = z.input<typeof StoreStockAlertSchema>
export type StoreStockAlert = z.output<typeof StoreStockAlertSchema>
