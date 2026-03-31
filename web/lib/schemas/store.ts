/**
 * Store, products, cart, and inventory schemas
 */

import { z } from 'zod'
import { uuidSchema, optionalString, requiredString, currencySchema, enumSchema } from './common'

// ============================================
// Products
// ============================================

/**
 * Product categories
 */
export const PRODUCT_CATEGORIES = [
  'food',
  'treats',
  'toys',
  'health',
  'grooming',
  'accessories',
  'bedding',
  'carriers',
  'cleaning',
  'other',
] as const
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number]

/**
 * Product status
 */
export const PRODUCT_STATUSES = ['active', 'inactive', 'discontinued'] as const
export type ProductStatus = (typeof PRODUCT_STATUSES)[number]

/**
 * Schema for creating a product
 */
export const createProductSchema = z.object({
  sku: requiredString('SKU', 50),
  name: requiredString('Nombre', 200),
  description: optionalString(2000),
  category: enumSchema(PRODUCT_CATEGORIES, 'Categoría'),
  price: currencySchema,
  cost: currencySchema.optional(),
  brand: optionalString(100),
  species: z.array(z.enum(['dog', 'cat', 'bird', 'fish', 'small_animal', 'all'])).optional(),
  weight_kg: z.coerce.number().min(0).optional(),
  barcode: optionalString(50),
  image_url: z.string().url('URL de imagen inválida').optional().nullable(),
  is_prescription_required: z.coerce.boolean().default(false),
  is_refrigerated: z.coerce.boolean().default(false),
})

export type CreateProductInput = z.infer<typeof createProductSchema>

/**
 * Schema for updating a product
 */
export const updateProductSchema = createProductSchema.partial().extend({
  id: uuidSchema,
  status: enumSchema(PRODUCT_STATUSES, 'Estado').optional(),
})

export type UpdateProductInput = z.infer<typeof updateProductSchema>

/**
 * Schema for product query parameters
 */
export const productQuerySchema = z.object({
  category: enumSchema(PRODUCT_CATEGORIES, 'Categoría').optional(),
  status: enumSchema(PRODUCT_STATUSES, 'Estado').optional(),
  search: z.string().max(100).optional(),
  min_price: z.coerce.number().min(0).optional(),
  max_price: z.coerce.number().min(0).optional(),
  in_stock: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type ProductQueryParams = z.infer<typeof productQuerySchema>

// ============================================
// Cart
// ============================================

/**
 * Schema for basic cart item (product_id + quantity only)
 */
export const cartItemSchema = z.object({
  product_id: uuidSchema,
  quantity: z.coerce.number().int().min(1, 'Cantidad mínima es 1').max(99, 'Cantidad máxima es 99'),
})

export type CartItem = z.infer<typeof cartItemSchema>

/**
 * Cart item ID - can be UUID (products) or composite string (services: serviceId-petId-variant)
 * For products: must be valid UUID
 * For services: format is "uuid-uuid-string" (serviceId-petId-variant)
 */
const cartItemIdSchema = z
  .string()
  .min(1, 'ID requerido')
  .max(150, 'ID muy largo')
  .refine(
    (val) => {
      // Must be either a valid UUID or a composite ID with UUIDs
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      // Check if it's a pure UUID
      if (uuidPattern.test(val)) return true
      // Check if it's a composite ID (uuid-uuid-string pattern)
      const parts = val.split('-')
      if (parts.length >= 5) {
        // First UUID (serviceId): parts[0-4]
        const firstUuid = parts.slice(0, 5).join('-')
        if (!uuidPattern.test(firstUuid)) return false
        // Second UUID (petId): parts[5-9] if exists
        if (parts.length >= 10) {
          const secondUuid = parts.slice(5, 10).join('-')
          if (!uuidPattern.test(secondUuid)) return false
        }
        return true
      }
      return false
    },
    { message: 'ID debe ser UUID válido o ID compuesto válido' }
  )

/**
 * SEC-028: Schema for full cart item structure (used in cart sync/merge)
 * This validates the complete cart item as stored in localStorage/database
 */
export const fullCartItemSchema = z
  .object({
    id: cartItemIdSchema,
    name: z.string().min(1, 'Nombre requerido').max(255, 'Nombre muy largo'),
    price: z.coerce.number().nonnegative('Precio debe ser positivo').finite(),
    quantity: z.coerce.number().int().min(1, 'Cantidad mínima es 1').max(100, 'Cantidad máxima es 100'),
    type: z.enum(['service', 'product']),
    // Optional fields - allow empty strings by transforming to undefined
    image_url: z.string().optional().nullable().transform((v) => (v && v.length > 0 ? v : null)),
    stock: z.coerce.number().int().nonnegative().optional().nullable(),
    sku: z.string().max(100).optional().nullable(),
    requires_prescription: z.coerce.boolean().optional(),
    // IDs can be UUID or undefined - be lenient
    pet_id: z.string().optional().nullable(),
    pet_name: z.string().max(100).optional().nullable(),
    service_id: z.string().optional().nullable(),
    variant_name: z.string().max(100).optional().nullable(),
    // Accept both prescription_file and prescription_file_url from client
    prescription_file_url: z.string().optional().nullable(),
    prescription_file: z.string().optional().nullable(),
  })
  .passthrough()

export type FullCartItem = z.infer<typeof fullCartItemSchema>

/**
 * SEC-028: Schema for cart PUT request (sync cart items)
 */
export const cartSyncSchema = z.object({
  items: z.array(fullCartItemSchema).max(50, 'Máximo 50 items en el carrito'),
})

export type CartSyncInput = z.infer<typeof cartSyncSchema>

/**
 * SEC-028: Schema for cart POST request (merge carts)
 */
export const cartMergeSchema = z.object({
  items: z.array(fullCartItemSchema).max(50, 'Máximo 50 items en el carrito'),
})

export type CartMergeInput = z.infer<typeof cartMergeSchema>

/**
 * Schema for adding to cart
 */
export const addToCartSchema = cartItemSchema

export type AddToCartInput = z.infer<typeof addToCartSchema>

/**
 * Schema for updating cart item
 */
export const updateCartItemSchema = z.object({
  product_id: uuidSchema,
  quantity: z.coerce.number().int().min(0).max(99), // 0 = remove
})

export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>

/**
 * Schema for checkout
 */
export const checkoutSchema = z.object({
  items: z.array(cartItemSchema).min(1, 'El carrito está vacío'),
  payment_method: z.enum(['cash', 'card', 'transfer', 'qr'], {
    message: 'Método de pago inválido',
  }),
  notes: optionalString(500),
  delivery_address: optionalString(500),
  contact_phone: z
    .string()
    .regex(/^(\+595|0)?[9][0-9]{8}$/, 'Número inválido')
    .optional(),
})

export type CheckoutInput = z.infer<typeof checkoutSchema>

// ============================================
// Inventory
// ============================================

/**
 * Inventory transaction types
 */
export const INVENTORY_TRANSACTION_TYPES = [
  'purchase',
  'sale',
  'adjustment',
  'return',
  'damage',
  'expired',
  'transfer',
] as const
export type InventoryTransactionType = (typeof INVENTORY_TRANSACTION_TYPES)[number]

/**
 * Schema for inventory adjustment
 */
export const inventoryAdjustmentSchema = z.object({
  product_id: uuidSchema,
  quantity: z.coerce.number().int(), // Can be negative for removals
  type: enumSchema(INVENTORY_TRANSACTION_TYPES, 'Tipo de transacción'),
  cost_per_unit: currencySchema.optional(),
  reason: optionalString(500),
  reference_number: optionalString(50), // PO number, invoice, etc.
})

export type InventoryAdjustmentInput = z.infer<typeof inventoryAdjustmentSchema>

/**
 * Schema for stock take (inventory count)
 */
export const stockTakeSchema = z.object({
  items: z
    .array(
      z.object({
        product_id: uuidSchema,
        counted_quantity: z.coerce.number().int().min(0),
        notes: optionalString(200),
      })
    )
    .min(1, 'Ingrese al menos un producto'),
  performed_by: optionalString(100),
  notes: optionalString(500),
})

export type StockTakeInput = z.infer<typeof stockTakeSchema>

/**
 * Schema for low stock alert settings
 */
export const lowStockAlertSchema = z.object({
  product_id: uuidSchema,
  reorder_level: z.coerce.number().int().min(0),
  reorder_quantity: z.coerce.number().int().min(1),
  notify_email: z.string().email().optional(),
})

export type LowStockAlertInput = z.infer<typeof lowStockAlertSchema>

// ============================================
// Invoices / Orders
// ============================================

/**
 * Order status
 */
export const ORDER_STATUSES = [
  'pending',
  'pending_prescription',
  'confirmed',
  'processing',
  'ready',
  'shipped',
  'delivered',
  'cancelled',
  'prescription_rejected',
  'refunded',
] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

/**
 * Schema for order query
 */
export const orderQuerySchema = z.object({
  status: enumSchema(ORDER_STATUSES, 'Estado').optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type OrderQueryParams = z.infer<typeof orderQuerySchema>

/**
 * Schema for updating order status
 */
export const updateOrderStatusSchema = z.object({
  id: uuidSchema,
  status: enumSchema(ORDER_STATUSES, 'Estado'),
  notes: optionalString(500),
})

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>

// ============================================
// Loyalty Points
// ============================================

/**
 * Schema for loyalty point operations
 */
export const loyaltyPointsOperationSchema = z.object({
  user_id: uuidSchema,
  points: z.coerce.number().int(),
  operation: z.enum(['add', 'subtract', 'redeem'], {
    message: 'Operación inválida',
  }),
  reason: optionalString(200),
  reference_id: uuidSchema.optional(), // Order or transaction ID
})

export type LoyaltyPointsOperationInput = z.infer<typeof loyaltyPointsOperationSchema>

// ============================================
// Addresses (SEC-007, VALID-001)
// ============================================

/**
 * Schema for shipping address
 */
export const shippingAddressSchema = z.object({
  street: z.string().min(5, 'Dirección muy corta').max(255, 'Dirección muy larga'),
  city: z.string().min(2, 'Ciudad requerida').max(100),
  state: optionalString(50),
  postal_code: optionalString(20),
  country: z.string().max(50).default('Paraguay'),
  phone: optionalString(20),
  notes: optionalString(500),
})

export type ShippingAddress = z.infer<typeof shippingAddressSchema>

/**
 * Schema for billing address
 */
export const billingAddressSchema = z.object({
  name: z.string().min(2, 'Nombre requerido').max(200),
  ruc: optionalString(20),
  street: z.string().min(5, 'Dirección muy corta').max(255),
  city: z.string().min(2, 'Ciudad requerida').max(100),
  state: optionalString(50),
  postal_code: optionalString(20),
  country: z.string().max(50).default('Paraguay'),
})

export type BillingAddress = z.infer<typeof billingAddressSchema>

// ============================================
// Store Orders (SEC-007)
// ============================================

/**
 * Schema for order item in create order request
 */
export const orderItemSchema = z.object({
  product_id: uuidSchema,
  variant_id: uuidSchema.optional().nullable(),
  quantity: z.coerce.number().int().min(1, 'Cantidad mínima es 1').max(99, 'Cantidad máxima es 99'),
  unit_price: currencySchema,
  discount_amount: currencySchema.optional(),
})

export type OrderItem = z.infer<typeof orderItemSchema>

/**
 * Schema for creating a store order
 */
export const createStoreOrderSchema = z.object({
  clinic: z.string().min(1, 'Clínica requerida'),
  items: z.array(orderItemSchema).min(1, 'El carrito está vacío').max(50, 'Máximo 50 items'),
  coupon_code: z.string().max(50).optional().nullable(),
  shipping_address: shippingAddressSchema.optional().nullable(),
  billing_address: billingAddressSchema.optional().nullable(),
  shipping_method: z.string().max(50).optional().nullable(),
  payment_method: z.string().max(50).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  // Pet ID for prescription products - required when cart contains prescription items
  pet_id: uuidSchema.optional().nullable(),
})

export type CreateStoreOrderInput = z.infer<typeof createStoreOrderSchema>

/**
 * Schema for checkout request (client-side checkout)
 */
export const checkoutRequestSchema = z.object({
  items: z
    .array(
      z.object({
        id: cartItemIdSchema, // Can be UUID (products) or composite ID (services)
        name: z.string().min(1),
        price: z.coerce.number().min(0),
        type: z.enum(['service', 'product']),
        quantity: z.coerce.number().int().min(1).max(99),
        requires_prescription: z.boolean().optional(),
        prescription_file_url: z
          .string()
          .url('URL de prescripción inválida')
          .optional()
          .nullable()
          .or(z.literal(''))
          .transform((v) => (v && v.length > 0 ? v : null)),
      })
    )
    .min(1, 'El carrito está vacío'),
  clinic: z.string().min(1, 'Clínica requerida'),
  notes: z.string().max(1000, 'Notas muy largas').optional().nullable(),
  // Pet ID for prescription products - must be valid UUID if provided
  pet_id: z
    .string()
    .uuid('Pet ID debe ser UUID válido')
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((v) => (v && v.length > 0 ? v : null)),
  // Flag indicating prescription review needed
  requires_prescription_review: z.boolean().optional(),
})

export type CheckoutRequestInput = z.infer<typeof checkoutRequestSchema>
