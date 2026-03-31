/**
 * Order Edit Form Module
 *
 * Modal form for editing procurement purchase orders.
 *
 * @example
 * ```tsx
 * import { OrderEditForm } from './order-edit-form'
 *
 * <OrderEditForm
 *   orderId="order-123"
 *   isOpen={isOpen}
 *   onClose={handleClose}
 *   onSuccess={handleSuccess}
 * />
 * ```
 */

export { OrderEditForm } from './OrderEditForm'

export type {
  OrderEditFormProps,
  Supplier,
  Product,
  OrderItem,
  PurchaseOrder,
  UpdateOrderParams,
} from './types'

// Sub-components (for advanced usage)
export { SupplierSelect } from './SupplierSelect'
export { ProductSearch } from './ProductSearch'
export { OrderItemsTable } from './OrderItemsTable'
export { DeletedItemsWarning } from './DeletedItemsWarning'
export { OrderEditFields } from './OrderEditFields'

// Hook (for custom implementations)
export { useOrderEditData } from './use-order-edit-data'
