/**
 * Order Detail Modal Types
 *
 * Type definitions and constants for order detail modal components.
 */

import { FileText, Clock, CheckCircle, Truck, Package, XCircle } from 'lucide-react'

export interface PurchaseOrderItem {
  id: string
  quantity: number
  unit_cost: number
  line_total: number
  received_quantity: number
  received_at: string | null
  notes: string | null
  store_products: {
    id: string
    sku: string
    name: string
    base_price: number
  } | null
}

export type OrderStatus = 'draft' | 'submitted' | 'confirmed' | 'shipped' | 'received' | 'cancelled'

export interface PurchaseOrder {
  id: string
  order_number: string
  status: OrderStatus
  subtotal: number
  tax_amount: number
  total: number
  expected_delivery_date: string | null
  shipping_address: string | null
  notes: string | null
  created_at: string
  submitted_at: string | null
  confirmed_at: string | null
  shipped_at: string | null
  received_at: string | null
  cancelled_at: string | null
  suppliers: {
    id: string
    name: string
    contact_name: string | null
    email: string | null
    phone: string | null
  } | null
  purchase_order_items: PurchaseOrderItem[]
  created_by_profile: {
    id: string
    full_name: string
    email: string
  } | null
  received_by_profile: {
    id: string
    full_name: string
  } | null
}

export interface OrderDetailModalProps {
  orderId: string
  isOpen: boolean
  onClose: () => void
  onOrderUpdated: () => void
}

// Status configuration for display
export const STATUS_CONFIG = {
  draft: { label: 'Borrador', icon: FileText, color: 'text-gray-500', bg: 'bg-gray-100' },
  submitted: {
    label: 'Enviado',
    icon: Clock,
    color: 'text-[var(--status-info)]',
    bg: 'bg-[var(--status-info-bg)]',
  },
  confirmed: {
    label: 'Confirmado',
    icon: CheckCircle,
    color: 'text-[var(--status-success)]',
    bg: 'bg-[var(--status-success-bg)]',
  },
  shipped: {
    label: 'En Camino',
    icon: Truck,
    color: 'text-[var(--primary)]',
    bg: 'bg-[var(--primary)]/10',
  },
  received: {
    label: 'Recibido',
    icon: Package,
    color: 'text-[var(--status-success)]',
    bg: 'bg-[var(--status-success-bg)]',
  },
  cancelled: {
    label: 'Cancelado',
    icon: XCircle,
    color: 'text-[var(--status-error)]',
    bg: 'bg-[var(--status-error-bg)]',
  },
} as const

export const STATUS_TIMELINE = ['draft', 'submitted', 'confirmed', 'shipped', 'received'] as const
export type TimelineStatus = (typeof STATUS_TIMELINE)[number]

// Helper to format dates consistently
export function formatDate(dateString: string | null): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('es-PY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
