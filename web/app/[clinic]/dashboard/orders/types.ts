/**
 * Orders Dashboard Types
 *
 * REF-006: Type definitions extracted from client component
 */

export interface Order {
  id: string
  order_number: string
  status: OrderStatus
  payment_status: PaymentStatus
  subtotal: number
  discount_amount: number
  shipping_cost: number
  tax_amount: number
  total: number
  shipping_method: string | null
  tracking_number: string | null
  customer_notes: string | null
  internal_notes: string | null
  created_at: string
  confirmed_at: string | null
  shipped_at: string | null
  delivered_at: string | null
  cancelled_at: string | null
  cancellation_reason: string | null
  item_count: number
  has_prescription_items: boolean
  customer: OrderCustomer | null
}

export interface OrderCustomer {
  id: string
  full_name: string
  email: string
  phone: string | null
}

export interface OrderItem {
  id: string
  quantity: number
  unit_price: number
  discount_amount: number
  total: number
  requires_prescription: boolean
  prescription_file_url: string | null
  product: {
    id: string
    name: string
    sku: string
    images: string[] | null
  } | null
}

export interface OrderSummary {
  pending: number
  confirmed: number
  processing: number
  ready: number
  shipped: number
  delivered: number
  cancelled: number
}

export interface OrdersPagination {
  page: number
  limit: number
  total: number
  pages: number
  hasNext: boolean
  hasPrev: boolean
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'ready'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded'

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'

export interface OrdersFilters {
  search: string
  status: string
  paymentStatus: string
}
