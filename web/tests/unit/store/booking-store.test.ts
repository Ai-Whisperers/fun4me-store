import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useBookingStore } from '@/lib/store/booking-store'
import { MAX_SERVICES_PER_BOOKING } from '@/components/booking/booking-wizard/types'

// Mock the Lucide icons
vi.mock('lucide-react', () => ({
  Syringe: () => null,
  Stethoscope: () => null,
  Scissors: () => null,
  UserCircle: () => null,
  Activity: () => null,
  Heart: () => null,
  Microscope: () => null,
  Sparkles: () => null,
  FileText: () => null,
  Building2: () => null,
  Leaf: () => null,
  PawPrint: () => null,
}))

// Mock the server actions
vi.mock('@/app/actions/create-appointment', () => ({
  createAppointmentJson: vi.fn(),
  createMultiServiceAppointmentJson: vi.fn(),
}))

vi.mock('@/app/actions/create-booking-request', () => ({
  createBookingRequest: vi.fn(),
}))

const mockClinic: any = {
  config: {
    id: 'terrapet',
    name: 'Adris Vet',
  },
  services: [
    {
      id: 'service-1',
      title: 'Consultation',
      booking: { online_enabled: true, duration_minutes: 30, price_from: '50000' },
    },
  ],
}

const mockClinicMultiService: any = {
  config: {
    id: 'terrapet',
    name: 'Adris Vet',
  },
  services: [
    {
      id: 'service-1',
      title: 'Consultation',
      category: 'clinical',
      booking: { online_enabled: true, duration_minutes: 30, price_from: '50000' },
    },
    {
      id: 'service-2',
      title: 'Vaccination',
      category: 'preventive',
      booking: { online_enabled: true, duration_minutes: 15, price_from: '30000' },
    },
    {
      id: 'service-3',
      title: 'Grooming',
      category: 'grooming',
      booking: { online_enabled: true, duration_minutes: 60, price_from: '80000' },
    },
    {
      id: 'service-4',
      title: 'Dental Cleaning',
      category: 'specialty',
      booking: { online_enabled: true, duration_minutes: 45, price_from: '120000' },
    },
    {
      id: 'service-5',
      title: 'X-Ray',
      category: 'diagnostics',
      booking: { online_enabled: true, duration_minutes: 20, price_from: '90000' },
    },
    {
      id: 'service-6',
      title: 'Surgery',
      category: 'surgery',
      booking: { online_enabled: true, duration_minutes: 90, price_from: '250000' },
    },
  ],
}

const mockPets: any[] = [{ id: 'pet-1', name: 'Rex', species: 'dog', breed: 'German Shepherd' }]
const mockMultiplePets: any[] = [
  { id: 'pet-1', name: 'Rex', species: 'dog', breed: 'German Shepherd' },
  { id: 'pet-2', name: 'Luna', species: 'cat', breed: 'Siamese' },
]

describe('useBookingStore', () => {
  beforeEach(() => {
    useBookingStore.getState().reset()
    vi.clearAllMocks()
  })

  it('should initialize with default values', () => {
    const state = useBookingStore.getState()
    expect(state.step).toBe('service')
    expect(state.selection.serviceId).toBeNull()
    expect(state.selection.serviceIds).toEqual([])
    expect(state.isSubmitting).toBe(false)
  })

  it('should initialize with provided data', () => {
    useBookingStore.getState().initialize(mockClinic, mockPets)

    const state = useBookingStore.getState()
    expect(state.clinicId).toBe('terrapet')
    expect(state.pets).toHaveLength(1)
    expect(state.services).toHaveLength(1)
    // Since there is only 1 pet, it should be auto-selected
    expect(state.selection.petId).toBe('pet-1')
  })

  it('should update step', () => {
    useBookingStore.getState().setStep('pet')

    expect(useBookingStore.getState().step).toBe('pet')
  })

  it('should update selection', () => {
    // Date/time removed - testing preference fields instead
    useBookingStore.getState().updateSelection({ preferredDateStart: '2024-12-25' })

    expect(useBookingStore.getState().selection.preferredDateStart).toBe('2024-12-25')
  })

  it('should reset state', () => {
    useBookingStore.getState().setStep('confirm')
    useBookingStore.getState().reset()

    expect(useBookingStore.getState().step).toBe('service')
  })
})

describe('useBookingStore - Multi-Service Selection', () => {
  beforeEach(() => {
    useBookingStore.getState().reset()
    useBookingStore.getState().initialize(mockClinicMultiService, mockPets)
    vi.clearAllMocks()
  })

  it('should toggle a service on and off', () => {
    const store = useBookingStore.getState()

    // Add first service
    store.toggleService('service-1')
    expect(useBookingStore.getState().selection.serviceIds).toContain('service-1')
    expect(useBookingStore.getState().selection.serviceId).toBe('service-1')

    // Toggle off
    useBookingStore.getState().toggleService('service-1')
    expect(useBookingStore.getState().selection.serviceIds).not.toContain('service-1')
    expect(useBookingStore.getState().selection.serviceId).toBeNull()
  })

  it('should allow selecting multiple services', () => {
    const store = useBookingStore.getState()

    store.toggleService('service-1')
    useBookingStore.getState().toggleService('service-2')
    useBookingStore.getState().toggleService('service-3')

    const state = useBookingStore.getState()
    expect(state.selection.serviceIds).toHaveLength(3)
    expect(state.selection.serviceIds).toContain('service-1')
    expect(state.selection.serviceIds).toContain('service-2')
    expect(state.selection.serviceIds).toContain('service-3')
  })

  it('should enforce maximum service limit', () => {
    const store = useBookingStore.getState()

    // Add services up to the limit
    for (let i = 1; i <= MAX_SERVICES_PER_BOOKING; i++) {
      useBookingStore.getState().toggleService(`service-${i}`)
    }

    expect(useBookingStore.getState().selection.serviceIds).toHaveLength(MAX_SERVICES_PER_BOOKING)

    // Try to add one more (should be ignored)
    useBookingStore.getState().toggleService('service-6')
    expect(useBookingStore.getState().selection.serviceIds).toHaveLength(MAX_SERVICES_PER_BOOKING)
    expect(useBookingStore.getState().selection.serviceIds).not.toContain('service-6')
  })

  it('should clear all services', () => {
    const store = useBookingStore.getState()

    store.toggleService('service-1')
    useBookingStore.getState().toggleService('service-2')

    expect(useBookingStore.getState().selection.serviceIds).toHaveLength(2)

    useBookingStore.getState().clearServices()

    expect(useBookingStore.getState().selection.serviceIds).toHaveLength(0)
    expect(useBookingStore.getState().selection.serviceId).toBeNull()
  })

  it('should calculate total duration correctly', () => {
    const store = useBookingStore.getState()

    // service-1: 30min, service-2: 15min, service-3: 60min
    store.toggleService('service-1')
    useBookingStore.getState().toggleService('service-2')
    useBookingStore.getState().toggleService('service-3')

    const totalDuration = useBookingStore.getState().getTotalDuration()
    expect(totalDuration).toBe(30 + 15 + 60) // 105 minutes
  })

  it('should calculate total price correctly', () => {
    const store = useBookingStore.getState()

    // service-1: 50000, service-2: 30000, service-3: 80000
    store.toggleService('service-1')
    useBookingStore.getState().toggleService('service-2')
    useBookingStore.getState().toggleService('service-3')

    const totalPrice = useBookingStore.getState().getTotalPrice()
    expect(totalPrice).toBe(50000 + 30000 + 80000) // 160000
  })

  it('should return selected services via getSelectedServices', () => {
    const store = useBookingStore.getState()

    store.toggleService('service-1')
    useBookingStore.getState().toggleService('service-3')

    const selectedServices = useBookingStore.getState().getSelectedServices()
    expect(selectedServices).toHaveLength(2)
    expect(selectedServices[0].name).toBe('Consultation')
    expect(selectedServices[1].name).toBe('Grooming')
  })

  // End time tests removed - customer no longer selects time
  // Clinic will contact customer to schedule

  it('should update preferred time of day', () => {
    const store = useBookingStore.getState()
    store.updateSelection({ preferredTimeOfDay: 'morning' })

    expect(useBookingStore.getState().selection.preferredTimeOfDay).toBe('morning')
  })

  it('should update preferred date range', () => {
    const store = useBookingStore.getState()
    store.updateSelection({
      preferredDateStart: '2024-12-25',
      preferredDateEnd: '2024-12-31',
    })

    const selection = useBookingStore.getState().selection
    expect(selection.preferredDateStart).toBe('2024-12-25')
    expect(selection.preferredDateEnd).toBe('2024-12-31')
  })

  it('should initialize with pre-selected services', () => {
    useBookingStore.getState().reset()
    useBookingStore.getState().initialize(
      mockClinicMultiService,
      mockPets,
      ['service-1', 'service-2'], // Pre-select these
      'pet-1'
    )

    const state = useBookingStore.getState()
    expect(state.selection.serviceIds).toEqual(['service-1', 'service-2'])
    expect(state.selection.serviceId).toBe('service-1')
    expect(state.selection.petId).toBe('pet-1')
    expect(state.step).toBe('confirm') // Should skip to confirm since both selected (no datetime step)
  })

  it('should skip to pet selection when services pre-selected but no pet', () => {
    useBookingStore.getState().reset()
    useBookingStore.getState().initialize(
      mockClinicMultiService,
      mockMultiplePets, // Multiple pets, won't auto-select
      ['service-1']
    )

    const state = useBookingStore.getState()
    expect(state.selection.serviceIds).toEqual(['service-1'])
    expect(state.selection.petId).toBeNull()
    expect(state.step).toBe('pet') // Should go to pet since service selected but no pet
  })

  it('should filter out invalid pre-selected service IDs', () => {
    useBookingStore.getState().reset()
    useBookingStore.getState().initialize(
      mockClinicMultiService,
      mockPets,
      ['service-1', 'invalid-service-id', 'service-2']
    )

    const state = useBookingStore.getState()
    expect(state.selection.serviceIds).toEqual(['service-1', 'service-2'])
    expect(state.selection.serviceIds).not.toContain('invalid-service-id')
  })
})
