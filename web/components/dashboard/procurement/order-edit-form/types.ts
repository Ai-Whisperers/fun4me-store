/**
 * Order Edit Form Types
 *
 * Shared type definitions for order edit form components.
 */

export interface Supplier {
  id: string
  name: string
}

export interface Product {
  id: string
  sku: string
  name: string
}

export interface OrderItem {
  id?: string
  catalog_product_id: string
  product_name: string
  product_sku: string
  quantity: number
  unit_cost: number
  isNew?: boolean
  isDeleted?: boolean
}

export interface PurchaseOrder {
  id: string
  order_number: string
  status: string
  supplier_id: string
  expected_delivery_date: string | null
  shipping_address: string | null
  notes: string | null
  suppliers: {
    id: string
    name: string
  } | null
  purchase_order_items: {
    id: string
    catalog_product_id: string
    quantity: number
    unit_cost: number
    store_products: {
      id: string
      sku: string
      name: string
    } | null
  }[]
}

export interface OrderEditFormProps {
  orderId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export interface UpdateOrderParams {
  orderId: string
  supplier_id: string
  items: { catalog_product_id: string; quantity: number; unit_cost: number }[]
  expected_delivery_date?: string
  notes?: string
  shipping_address?: string
}
