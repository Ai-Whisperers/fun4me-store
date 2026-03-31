/**
 * Order Detail Modal Module
 *
 * Modal for viewing and managing procurement purchase order details.
 *
 * @example
 * ```tsx
 * import { OrderDetailModal } from './order-detail-modal'
 *
 * <OrderDetailModal
 *   orderId="order-123"
 *   isOpen={isOpen}
 *   onClose={handleClose}
 *   onOrderUpdated={refetch}
 * />
 * ```
 */

export { OrderDetailModal } from './OrderDetailModal'

export type {
  OrderDetailModalProps,
  PurchaseOrder,
  PurchaseOrderItem,
  OrderStatus,
  TimelineStatus,
} from './types'

// Sub-components (for advanced usage)
export { OrderStatusTimeline } from './OrderStatusTimeline'
export { OrderInfoGrid } from './OrderInfoGrid'
export { OrderItemsTable } from './OrderItemsTable'
export { OrderActions } from './OrderActions'

// Hook (for custom implementations)
export { useOrderDetailData } from './use-order-detail-data'

// Constants
export { STATUS_CONFIG, STATUS_TIMELINE, formatDate } from './types'
