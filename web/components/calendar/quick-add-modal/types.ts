/**
 * Quick Add Modal Types
 *
 * Type definitions for quick appointment creation modal.
 */

export interface Pet {
  id: string
  name: string
  species: string
  owner_name?: string
}

export interface Service {
  id: string
  name: string
  duration_minutes: number
}

export interface Staff {
  id: string
  full_name: string
  color_code: string
}

export interface AppointmentFormData {
  petId: string
  serviceId?: string
  vetId?: string
  startTime: Date
  endTime: Date
  reason: string
  notes?: string
}

export interface QuickAddModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: AppointmentFormData) => Promise<void>
  slotInfo: { start: Date; end: Date } | null
  pets: Pet[]
  services: Service[]
  staff: Staff[]
  isLoading?: boolean
}

export interface ConflictInfo {
  id: string
  pet_name: string
  start_time: string
  end_time: string
}
