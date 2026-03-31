import { create } from 'zustand'
import { logger } from '@/lib/logger'
import {
  Syringe,
  Stethoscope,
  Scissors,
  UserCircle,
  Activity,
  Heart,
  Microscope,
  Sparkles,
  FileText,
  Building2,
  Leaf,
  PawPrint,
  type LucideIcon,
} from 'lucide-react'
import type {
  Step,
  BookingSelection,
  ServiceFromJSON,
  BookableService,
  Pet,
} from '@/components/booking/booking-wizard/types'
import type { ClinicData } from '@/lib/types/clinic-config'
import { MAX_SERVICES_PER_BOOKING } from '@/components/booking/booking-wizard/types'

// Icon mapping from string names to Lucide components
const ICON_MAP: Record<string, LucideIcon> = {
  Syringe,
  Stethoscope,
  Scissors,
  UserCircle,
  Activity,
  Heart,
  Microscope,
  Sparkles,
  FileText,
  Building2,
  Leaf,
  PawPrint,
}

// Color mapping by service category
const CATEGORY_COLORS: Record<string, string> = {
  clinical: 'bg-green-50 text-green-600',
  preventive: 'bg-blue-50 text-blue-600',
  specialty: 'bg-amber-50 text-amber-600',
  diagnostics: 'bg-purple-50 text-purple-600',
  surgery: 'bg-rose-50 text-rose-600',
  hospital: 'bg-red-50 text-red-600',
  holistic: 'bg-emerald-50 text-emerald-600',
  grooming: 'bg-pink-50 text-pink-600',
  luxury: 'bg-yellow-50 text-yellow-600',
  documents: 'bg-slate-50 text-slate-600',
}

function parsePrice(priceStr: string | undefined): number {
  if (!priceStr) return 0
  return parseInt(priceStr.replace(/\./g, ''), 10) || 0
}

// Type for services data which can be either a direct array or categorized structure
interface ServiceCategory {
  services?: ServiceFromJSON[]
}

interface CategorizedServices {
  categories: ServiceCategory[]
}

type ServicesData = ServiceFromJSON[] | CategorizedServices | null | undefined

function extractServices(servicesData: ServicesData): ServiceFromJSON[] {
  if (!servicesData) return []
  if (Array.isArray(servicesData)) return servicesData
  if ('categories' in servicesData && Array.isArray(servicesData.categories)) {
    return servicesData.categories.flatMap((cat) => cat.services || [])
  }
  return []
}

function transformServices(jsonServices: ServiceFromJSON[]): BookableService[] {
  return jsonServices
    .filter((s) => s.booking?.online_enabled === true)
    .map((s) => ({
      id: s.id,
      name: s.title,
      icon: ICON_MAP[s.icon || ''] || PawPrint,
      duration: s.booking?.duration_minutes || 30,
      price: parsePrice(s.booking?.price_from),
      color: CATEGORY_COLORS[s.category || ''] || 'bg-gray-50 text-gray-600',
    }))
}

interface BookingState {
  // State
  clinicId: string
  pets: Pet[]
  step: Step
  selection: BookingSelection
  isSubmitting: boolean
  submitError: string | null

  // Computed/Derived (cached in store for convenience)
  services: BookableService[]

  // Actions
  setStep: (step: Step) => void
  updateSelection: (updates: Partial<BookingSelection>) => void
  toggleService: (serviceId: string) => void
  clearServices: () => void
  initialize: (
    clinic: ClinicData,
    userPets: Pet[],
    initialServiceIds?: string[],
    initialPetId?: string
  ) => void
  submitBooking: () => Promise<boolean>
  reset: () => void

  // Computed selectors
  getSelectedServices: () => BookableService[]
  getTotalDuration: () => number
  getTotalPrice: () => number
}

const initialSelection: BookingSelection = {
  serviceId: null,
  serviceIds: [],
  petId: null,
  notes: '',
  // Optional preferences (customer can indicate, clinic will schedule)
  preferredDateStart: null,
  preferredDateEnd: null,
  preferredTimeOfDay: 'any',
}

export const useBookingStore = create<BookingState>((set, get) => ({
  clinicId: '',
  pets: [],
  step: 'service',
  selection: initialSelection,
  isSubmitting: false,
  submitError: null,
  services: [],

  setStep: (step) => set({ step }),

  updateSelection: (updates) =>
    set((state) => ({
      selection: { ...state.selection, ...updates },
    })),

  toggleService: (serviceId: string) => {
    const { selection } = get()
    const current = selection.serviceIds

    let updated: string[]
    if (current.includes(serviceId)) {
      // Remove service
      updated = current.filter((id) => id !== serviceId)
    } else {
      // Add service (check limit)
      if (current.length >= MAX_SERVICES_PER_BOOKING) {
        // Don't add, limit reached
        return
      }
      updated = [...current, serviceId]
    }

    set({
      selection: {
        ...selection,
        serviceIds: updated,
        // Keep serviceId in sync for backwards compat (first selected)
        serviceId: updated.length > 0 ? updated[0] : null,
      },
    })
  },

  clearServices: () => {
    const { selection } = get()
    set({
      selection: {
        ...selection,
        serviceIds: [],
        serviceId: null,
      },
    })
  },

  initialize: (clinic, userPets, initialServiceIds = [], initialPetId) => {
    const servicesList = extractServices(clinic.services as unknown as ServicesData)
    const transformed = transformServices(servicesList)

    // Filter valid service IDs (must exist in available services)
    const validServiceIds = initialServiceIds.filter((id) =>
      transformed.some((s) => s.id === id)
    )

    // Determine initial pet: explicit param > single pet auto-select > null
    const resolvedPetId =
      initialPetId && userPets.some((p) => p.id === initialPetId)
        ? initialPetId
        : userPets.length === 1
          ? userPets[0].id
          : null

    // Determine initial step based on what's pre-selected
    // Note: No datetime step anymore - goes directly to confirm after pet
    let initialStep: Step = 'service'
    if (validServiceIds.length > 0 && resolvedPetId) {
      initialStep = 'confirm' // Both service(s) and pet selected, go to confirm
    } else if (validServiceIds.length > 0) {
      initialStep = 'pet' // Service(s) selected, need pet
    }

    set({
      clinicId: clinic.config.id,
      pets: userPets,
      services: transformed,
      step: initialStep,
      selection: {
        ...initialSelection,
        serviceIds: validServiceIds,
        serviceId: validServiceIds.length > 0 ? validServiceIds[0] : null,
        petId: resolvedPetId,
      },
    })
  },

  submitBooking: async () => {
    const { isSubmitting, selection, clinicId } = get()
    if (isSubmitting) return false

    // Validate required fields
    if (selection.serviceIds.length === 0) {
      set({ submitError: 'Por favor selecciona al menos un servicio' })
      return false
    }
    if (!selection.petId) {
      set({ submitError: 'Por favor selecciona una mascota' })
      return false
    }

    // Note: No date/time validation - customers don't select times anymore
    // Clinic will contact them to schedule

    set({ isSubmitting: true, submitError: null })

    try {
      // Create booking request (clinic will schedule later)
      const input = {
        clinic: clinicId,
        pet_id: selection.petId,
        service_ids: selection.serviceIds,
        notes: selection.notes || null,
        preferred_date_start: selection.preferredDateStart || null,
        preferred_date_end: selection.preferredDateEnd || null,
        preferred_time_of_day: selection.preferredTimeOfDay,
      }

      const { createBookingRequest } = await import('@/app/actions/create-booking-request')
      const result = await createBookingRequest(input)

      if (result.success) {
        set({ step: 'success' })
        return true
      } else {
        set({ submitError: result.error || 'No se pudo procesar la solicitud' })
        return false
      }
    } catch (e: unknown) {
      logger.error('[Booking] Submit error', {
        error: e instanceof Error ? e.message : String(e),
      })
      set({ submitError: 'Error de conexión con el servidor. Por favor intenta de nuevo.' })
      return false
    } finally {
      set({ isSubmitting: false })
    }
  },

  reset: () =>
    set({
      clinicId: '',
      pets: [],
      step: 'service',
      selection: initialSelection,
      isSubmitting: false,
      submitError: null,
      services: [],
    }),

  // Computed selectors
  getSelectedServices: () => {
    const { services, selection } = get()
    return services.filter((s) => selection.serviceIds.includes(s.id))
  },

  getTotalDuration: () => {
    const selectedServices = get().getSelectedServices()
    return selectedServices.reduce((sum, s) => sum + s.duration, 0)
  },

  getTotalPrice: () => {
    const selectedServices = get().getSelectedServices()
    return selectedServices.reduce((sum, s) => sum + s.price, 0)
  },
}))

/**
 * Format price number for display (e.g., 50000 -> "50.000")
 */
export function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) return '0'
  return price.toLocaleString('es-PY')
}

/**
 * Format date for input value (YYYY-MM-DD) using local timezone
 */
export function getLocalDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
