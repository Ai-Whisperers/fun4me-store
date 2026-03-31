/**
 * Quick Add Modal Module
 *
 * Modal for quick appointment creation from calendar slot selection.
 *
 * @example
 * ```tsx
 * import { QuickAddModal } from './quick-add-modal'
 *
 * <QuickAddModal
 *   isOpen={isOpen}
 *   onClose={handleClose}
 *   onSave={handleSave}
 *   slotInfo={selectedSlot}
 *   pets={pets}
 *   services={services}
 *   staff={staff}
 * />
 * ```
 */

export { QuickAddModal } from './QuickAddModal'

export type {
  QuickAddModalProps,
  AppointmentFormData,
  Pet,
  Service,
  Staff,
  ConflictInfo,
} from './types'

// Sub-components (for advanced usage)
export { PetSelector } from './PetSelector'
export { TimeInputs } from './TimeInputs'
export { AppointmentFields } from './AppointmentFields'
export { ConflictWarning } from './ConflictWarning'

// Hook (for custom implementations)
export { useQuickAddForm } from './use-quick-add-form'
