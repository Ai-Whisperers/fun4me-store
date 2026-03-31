import { z } from 'zod'

/**
 * Payment Method Schema
 */
// Schema matching actual database columns
export const PaymentMethodSchema = z
  .object({
    id: z.string().uuid().optional(),
    tenant_id: z.string().min(1),
    name: z.string().min(1),
    type: z.enum(['cash', 'card', 'transfer', 'check', 'credit', 'qr', 'other']),
    description: z.string().optional().nullable(),
    is_default: z.boolean().default(false),
    is_active: z.boolean().default(true),
    requires_reference: z.boolean().default(false),
    fee_percentage: z.number().min(0).max(100).optional().nullable(),
    min_amount: z.number().min(0).optional().nullable(),
    max_amount: z.number().min(0).optional().nullable(),
    instructions: z.string().optional().nullable(),
    display_order: z.number().int().min(0).default(100),
    icon: z.string().optional().nullable(),
    created_at: z.string().datetime().optional(),
  })
  .passthrough() // Allow extra fields from JSON

export type PaymentMethodInput = z.input<typeof PaymentMethodSchema>
export type PaymentMethod = z.output<typeof PaymentMethodSchema>

/**
 * Invoice Schema
 */
export const InvoiceSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().min(1),
  client_id: z.string().uuid(),
  pet_id: z.string().uuid().optional().nullable(),
  appointment_id: z.string().uuid().optional().nullable(),

  // UNIQUE per tenant
  invoice_number: z.string().min(1),

  status: z
    .enum(['draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'void', 'refunded'])
    .default('draft'),

  subtotal: z.number().min(0).default(0),
  discount_amount: z.number().min(0).default(0),
  discount_percentage: z.number().min(0).max(100).optional().nullable(),
  tax_amount: z.number().min(0).default(0),
  tax_rate: z.number().min(0).max(100).optional().nullable(),
  total: z.number().min(0).default(0),
  amount_paid: z.number().min(0).default(0),
  // balance_due is GENERATED (total - amount_paid)

  currency: z.string().default('PYG'),

  due_date: z.string().date().optional().nullable(),
  paid_at: z.string().datetime().optional().nullable(),

  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),

  created_by: z.string().uuid().optional().nullable(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
})

export type InvoiceInput = z.input<typeof InvoiceSchema>
export type Invoice = z.output<typeof InvoiceSchema>

/**
 * Invoice Item Schema
 */
export const InvoiceItemSchema = z.object({
  id: z.string().uuid().optional(),
  invoice_id: z.string().uuid(),
  tenant_id: z.string().min(1).optional(),

  item_type: z.enum(['service', 'product', 'custom', 'discount', 'tax']),

  service_id: z.string().uuid().optional().nullable(),
  product_id: z.string().uuid().optional().nullable(),

  description: z.string().min(1),
  quantity: z.number().positive(),
  unit_price: z.number().min(0),
  discount_amount: z.number().min(0).default(0),
  tax_amount: z.number().min(0).default(0),
  total: z.number().min(0),

  created_at: z.string().datetime().optional(),
})

export type InvoiceItemInput = z.input<typeof InvoiceItemSchema>
export type InvoiceItem = z.output<typeof InvoiceItemSchema>

/**
 * Payment Schema
 */
export const PaymentSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().min(1),
  invoice_id: z.string().uuid(),
  payment_method_id: z.string().uuid().optional().nullable(),

  amount: z.number().positive(),
  status: z.enum(['pending', 'completed', 'failed', 'refunded']).default('completed'),

  payment_date: z.string().datetime().or(z.string().date()),
  reference_number: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),

  processed_by: z.string().uuid().optional().nullable(),
  created_at: z.string().datetime().optional(),
})

export type PaymentInput = z.input<typeof PaymentSchema>
export type Payment = z.output<typeof PaymentSchema>

/**
 * Refund Schema
 */
export const RefundSchema = z.object({
  id: z.string().uuid().optional(),
  payment_id: z.string().uuid(),
  tenant_id: z.string().min(1).optional(),

  amount: z.number().positive(),
  reason: z.string().optional().nullable(),
  status: z.enum(['pending', 'completed', 'failed']).default('pending'),

  refunded_at: z.string().datetime().optional().nullable(),
  processed_by: z.string().uuid().optional().nullable(),
  created_at: z.string().datetime().optional(),
})

export type RefundInput = z.input<typeof RefundSchema>
export type Refund = z.output<typeof RefundSchema>

/**
 * Expense Schema
 */
export const ExpenseSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().min(1),

  category: z.string().min(1),
  amount: z.number().positive(),
  description: z.string().optional().nullable(),
  date: z.string().date(),

  vendor: z.string().optional().nullable(),
  payment_method: z.string().optional().nullable(),
  receipt_url: z.string().url().optional().nullable(),

  is_recurring: z.boolean().default(false),
  recurrence_period: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']).optional().nullable(),

  created_by: z.string().uuid().optional().nullable(),
  created_at: z.string().datetime().optional(),
})

export type ExpenseInput = z.input<typeof ExpenseSchema>
export type Expense = z.output<typeof ExpenseSchema>

/**
 * Loyalty Points Schema
 */
export const LoyaltyPointsSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  tenant_id: z.string().min(1).optional(),
  balance: z.number().int().min(0).default(0),
  lifetime_earned: z.number().int().min(0).default(0),
  tier: z.enum(['bronze', 'silver', 'gold', 'platinum']).default('bronze'),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
})

export type LoyaltyPointsInput = z.input<typeof LoyaltyPointsSchema>
export type LoyaltyPoints = z.output<typeof LoyaltyPointsSchema>

/**
 * Loyalty Transaction Schema
 */
export const LoyaltyTransactionSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().min(1),
  user_id: z.string().uuid(),

  points: z.number().int(), // Can be negative (redemption)
  type: z.enum(['earn', 'redeem', 'expire', 'adjust', 'bonus']),
  description: z.string().optional().nullable(),

  reference_id: z.string().uuid().optional().nullable(),
  reference_type: z.string().optional().nullable(),

  created_at: z.string().datetime().optional(),
})

export type LoyaltyTransactionInput = z.input<typeof LoyaltyTransactionSchema>
export type LoyaltyTransaction = z.output<typeof LoyaltyTransactionSchema>

/**
 * Helper: Generate invoice number
 */
export function generateInvoiceNumber(index: number, date?: Date): string {
  const d = date || new Date()
  const year = d.getFullYear()
  return `INV-${year}-${String(index).padStart(6, '0')}`
}
