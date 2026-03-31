/**
 * TST-001: Owner Appointment Booking Tests
 *
 * Comprehensive tests for owner appointment operations including:
 * - Booking requests
 * - Viewing appointments
 * - Cancellation
 * - Rescheduling
 * - Permission boundaries
 *
 * @priority P0 - Critical
 * @epic EPIC-17
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TENANT_IDS } from '@/lib/constants/tenants'

// Mock dependencies before imports - ORDER MATTERS!
// Must mock auth BEFORE anything that imports it to prevent database connection

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Mock the entire auth module to prevent database imports
vi.mock('@/lib/auth', () => ({
  withActionAuth: (handler: (...args: unknown[]) => unknown) => {
    return async (...args: unknown[]) => {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        return { success: false, error: 'No autorizado' }
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) {
        return { success: false, error: 'Perfil no encontrado' }
      }

      return handler({ user, profile, supabase, tenantId: profile.tenant_id }, ...args)
    }
  },
  isStaff: (profile: { role: string }) => ['vet', 'admin'].includes(profile.role),
  isAdmin: (profile: { role: string }) => profile.role === 'admin',
  belongsToTenant: (profile: { tenant_id: string }, tenantId: string) => profile.tenant_id === tenantId,
  requireOwnership: vi.fn(),
  requireTenantAccess: vi.fn(),
  createTenantQuery: vi.fn(),
}))

// Mock domain factory
vi.mock('@/lib/domain', () => ({
  getDomainFactory: () => ({
    createAppointmentService: () => ({
      cancelAppointment: vi.fn().mockResolvedValue({ id: 'apt-1', status: 'cancelled' }),
      rescheduleAppointment: vi.fn().mockResolvedValue({ id: 'apt-1', status: 'scheduled' }),
    }),
  }),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock error handling
vi.mock('@/lib/errors', () => ({
  actionSuccess: <T,>(data: T) => ({ success: true as const, data }),
  actionError: (error: string) => ({ success: false as const, error }),
  handleActionError: (error: unknown) => ({
    success: false as const,
    error: error instanceof Error ? error.message : 'Error desconocido',
  }),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn((key) => {
      if (key === 'x-forwarded-for') return '127.0.0.1'
      return null
    }),
  }),
  cookies: vi.fn().mockReturnValue({
    get: vi.fn(),
    set: vi.fn(),
  }),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

// Helper to create mock Supabase responses
function createMockSupabase(overrides: Record<string, unknown> = {}) {
  const defaultProfile = {
    id: 'owner-user-id',
    tenant_id: TENANT_IDS.ADRIS,
    role: 'owner',
    full_name: 'Test Owner',
    email: 'owner@test.com',
  }

  const defaultUser = {
    id: 'owner-user-id',
    email: 'owner@test.com',
  }

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: overrides.user ?? defaultUser },
        error: overrides.authError ?? null,
      }),
    },
    from: vi.fn((table: string) => {
      const tableData = (overrides as Record<string, unknown>)[table]
      return {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: table === 'profiles' ? (overrides.profile ?? defaultProfile) : tableData,
          error: (overrides as Record<string, unknown>)[`${table}Error`] ?? null,
        }),
        maybeSingle: vi.fn().mockResolvedValue({
          data: tableData,
          error: null,
        }),
      }
    }),
    rpc: vi.fn().mockResolvedValue({
      data: overrides.rpcResult ?? false,
      error: overrides.rpcError ?? null,
    }),
    ...overrides,
  }
}

import { createClient } from '@/lib/supabase/server'
import { TENANT_IDS } from '@/lib/constants/tenants';
import {
  cancelAppointment,
  rescheduleAppointment,
  getOwnerAppointments,
} from '@/app/actions/appointments'

// =============================================================================
// TEST FIXTURES
// =============================================================================

const TENANTS = {
  ADRIS: { id: 'terrapet', name: 'Veterinaria Adris' },
  PETLIFE: { id: 'petlife', name: 'PetLife Center' },
}

const USERS = {
  OWNER_A: {
    id: 'owner-a-id',
    email: 'owner-a@test.com',
    profile: { id: 'owner-a-id', tenant_id: TENANT_IDS.ADRIS, role: 'owner', full_name: 'Owner A' },
  },
  OWNER_B: {
    id: 'owner-b-id',
    email: 'owner-b@test.com',
    profile: { id: 'owner-b-id', tenant_id: TENANT_IDS.ADRIS, role: 'owner', full_name: 'Owner B' },
  },
  VET: {
    id: 'vet-id',
    email: 'vet@test.com',
    profile: { id: 'vet-id', tenant_id: TENANT_IDS.ADRIS, role: 'vet', full_name: 'Dr. Vet' },
  },
  ADMIN: {
    id: 'admin-id',
    email: 'admin@test.com',
    profile: { id: 'admin-id', tenant_id: TENANT_IDS.ADRIS, role: 'admin', full_name: 'Admin User' },
  },
}

const PETS = {
  OWNER_A_PET: { id: 'pet-a-id', name: 'Max', owner_id: USERS.OWNER_A.id },
  OWNER_B_PET: { id: 'pet-b-id', name: 'Luna', owner_id: USERS.OWNER_B.id },
}

const futureDate = (daysFromNow: number) => {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  return date.toISOString()
}

const pastDate = (daysAgo: number) => {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return date.toISOString()
}

// =============================================================================
// OWNER CANCELLATION TESTS
// =============================================================================

describe('TST-001: Owner Appointment Booking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('cancelAppointment - Owner Permissions', () => {
    it('should allow owner to cancel their own pet appointment', async () => {
      const appointment = {
        id: 'apt-1',
        tenant_id: TENANTS.ADRIS.id,
        start_time: futureDate(7),
        status: 'scheduled',
        pets: [PETS.OWNER_A_PET],
      }

      const mockSupabase = createMockSupabase({
        user: { id: USERS.OWNER_A.id, email: USERS.OWNER_A.email },
        profile: USERS.OWNER_A.profile,
        appointments: appointment,
      })

      // Add update success
      mockSupabase.from = vi.fn((table: string) => ({
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: table === 'profiles' ? USERS.OWNER_A.profile : appointment,
          error: null,
        }),
      }))

      ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase)

      const result = await cancelAppointment('apt-1', 'No puedo asistir')

      expect(result.success).toBe(true)
    })

    it('should reject owner cancelling another owner pet appointment', async () => {
      const appointment = {
        id: 'apt-1',
        tenant_id: TENANTS.ADRIS.id,
        start_time: futureDate(7),
        status: 'scheduled',
        pets: [PETS.OWNER_B_PET], // Different owner's pet
      }

      const mockSupabase = createMockSupabase({
        user: { id: USERS.OWNER_A.id, email: USERS.OWNER_A.email },
        profile: USERS.OWNER_A.profile,
        appointments: appointment,
      })

      ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase)

      const result = await cancelAppointment('apt-1')

      expect(result.success).toBe(false)
      expect(result.error).toContain('No tienes permiso')
    })

    it('should reject cancelling past appointments', async () => {
      const appointment = {
        id: 'apt-1',
        tenant_id: TENANTS.ADRIS.id,
        start_time: pastDate(1), // Yesterday
        status: 'scheduled',
        pets: [PETS.OWNER_A_PET],
      }

      const mockSupabase = createMockSupabase({
        user: { id: USERS.OWNER_A.id, email: USERS.OWNER_A.email },
        profile: USERS.OWNER_A.profile,
        appointments: appointment,
      })

      ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase)

      const result = await cancelAppointment('apt-1')

      expect(result.success).toBe(false)
      expect(result.error).toContain('pasada')
    })

    it('should reject cancelling already cancelled appointments', async () => {
      const appointment = {
        id: 'apt-1',
        tenant_id: TENANTS.ADRIS.id,
        start_time: futureDate(7),
        status: 'cancelled',
        pets: [PETS.OWNER_A_PET],
      }

      const mockSupabase = createMockSupabase({
        user: { id: USERS.OWNER_A.id, email: USERS.OWNER_A.email },
        profile: USERS.OWNER_A.profile,
        appointments: appointment,
      })

      ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase)

      const result = await cancelAppointment('apt-1')

      expect(result.success).toBe(false)
      expect(result.error).toContain('ya no puede ser cancelada')
    })

    it('should reject cancelling completed appointments', async () => {
      const appointment = {
        id: 'apt-1',
        tenant_id: TENANTS.ADRIS.id,
        start_time: futureDate(7),
        status: 'completed',
        pets: [PETS.OWNER_A_PET],
      }

      const mockSupabase = createMockSupabase({
        user: { id: USERS.OWNER_A.id, email: USERS.OWNER_A.email },
        profile: USERS.OWNER_A.profile,
        appointments: appointment,
      })

      ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase)

      const result = await cancelAppointment('apt-1')

      expect(result.success).toBe(false)
      expect(result.error).toContain('ya no puede ser cancelada')
    })

    it('should return error for non-existent appointment', async () => {
      const mockSupabase = createMockSupabase({
        user: { id: USERS.OWNER_A.id, email: USERS.OWNER_A.email },
        profile: USERS.OWNER_A.profile,
        appointments: null,
        appointmentsError: { message: 'Not found' },
      })

      ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase)

      const result = await cancelAppointment('non-existent-id')

      expect(result.success).toBe(false)
      expect(result.error).toContain('no encontrada')
    })
  })

  // =============================================================================
  // OWNER RESCHEDULING TESTS
  // =============================================================================

  describe('rescheduleAppointment - Owner Permissions', () => {
    it('should allow owner to reschedule their own pet appointment', async () => {
      const appointment = {
        id: 'apt-1',
        tenant_id: TENANTS.ADRIS.id,
        start_time: futureDate(7),
        end_time: futureDate(7), // Would be start + duration
        status: 'scheduled',
        pets: [PETS.OWNER_A_PET],
      }

      const mockSupabase = createMockSupabase({
        user: { id: USERS.OWNER_A.id, email: USERS.OWNER_A.email },
        profile: USERS.OWNER_A.profile,
        appointments: appointment,
        rpcResult: { success: true, new_start_time: futureDate(14), new_end_time: futureDate(14) }, // Successful reschedule
      })

      ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase)

      const newDate = new Date()
      newDate.setDate(newDate.getDate() + 14)
      const dateStr = newDate.toISOString().split('T')[0]

      const result = await rescheduleAppointment('apt-1', dateStr, '10:00')

      expect(result.success).toBe(true)
    })

    it('should reject owner rescheduling another owner pet appointment', async () => {
      const appointment = {
        id: 'apt-1',
        tenant_id: TENANTS.ADRIS.id,
        start_time: futureDate(7),
        end_time: futureDate(7),
        status: 'scheduled',
        pets: [PETS.OWNER_B_PET], // Different owner's pet
      }

      const mockSupabase = createMockSupabase({
        user: { id: USERS.OWNER_A.id, email: USERS.OWNER_A.email },
        profile: USERS.OWNER_A.profile,
        appointments: appointment,
        rpcResult: { success: false, message: 'No tienes permiso para reprogramar esta cita' },
      })

      ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase)

      const newDate = new Date()
      newDate.setDate(newDate.getDate() + 14)
      const dateStr = newDate.toISOString().split('T')[0]

      const result = await rescheduleAppointment('apt-1', dateStr, '10:00')

      expect(result.success).toBe(false)
      expect(result.error).toContain('No tienes permiso')
    })

    it('should reject rescheduling to past date', async () => {
      const appointment = {
        id: 'apt-1',
        tenant_id: TENANTS.ADRIS.id,
        start_time: futureDate(7),
        end_time: futureDate(7),
        status: 'scheduled',
        pets: [PETS.OWNER_A_PET],
      }

      const mockSupabase = createMockSupabase({
        user: { id: USERS.OWNER_A.id, email: USERS.OWNER_A.email },
        profile: USERS.OWNER_A.profile,
        appointments: appointment,
      })

      ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase)

      const pastDateStr = new Date()
      pastDateStr.setDate(pastDateStr.getDate() - 1)
      const dateStr = pastDateStr.toISOString().split('T')[0]

      const result = await rescheduleAppointment('apt-1', dateStr, '10:00')

      expect(result.success).toBe(false)
      expect(result.error).toContain('futuro')
    })

    it('should reject rescheduling cancelled appointments', async () => {
      const appointment = {
        id: 'apt-1',
        tenant_id: TENANTS.ADRIS.id,
        start_time: futureDate(7),
        end_time: futureDate(7),
        status: 'cancelled',
        pets: [PETS.OWNER_A_PET],
      }

      const mockSupabase = createMockSupabase({
        user: { id: USERS.OWNER_A.id, email: USERS.OWNER_A.email },
        profile: USERS.OWNER_A.profile,
        appointments: appointment,
        rpcResult: { success: false, message: 'Esta cita no puede ser reprogramada' },
      })

      ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase)

      const newDate = new Date()
      newDate.setDate(newDate.getDate() + 14)
      const dateStr = newDate.toISOString().split('T')[0]

      const result = await rescheduleAppointment('apt-1', dateStr, '10:00')

      expect(result.success).toBe(false)
      expect(result.error).toContain('no puede ser reprogramada')
    })

    it('should reject rescheduling to overlapping slot', async () => {
      const appointment = {
        id: 'apt-1',
        tenant_id: TENANTS.ADRIS.id,
        start_time: futureDate(7),
        end_time: futureDate(7),
        status: 'scheduled',
        pets: [PETS.OWNER_A_PET],
      }

      const mockSupabase = createMockSupabase({
        user: { id: USERS.OWNER_A.id, email: USERS.OWNER_A.email },
        profile: USERS.OWNER_A.profile,
        appointments: appointment,
        rpcResult: { success: false, message: 'El horario no está disponible' },
      })

      ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase)

      const newDate = new Date()
      newDate.setDate(newDate.getDate() + 14)
      const dateStr = newDate.toISOString().split('T')[0]

      const result = await rescheduleAppointment('apt-1', dateStr, '10:00')

      expect(result.success).toBe(false)
      expect(result.error).toContain('no está disponible')
    })

    it('should reject invalid date format', async () => {
      const appointment = {
        id: 'apt-1',
        tenant_id: TENANTS.ADRIS.id,
        start_time: futureDate(7),
        end_time: futureDate(7),
        status: 'scheduled',
        pets: [PETS.OWNER_A_PET],
      }

      const mockSupabase = createMockSupabase({
        user: { id: USERS.OWNER_A.id, email: USERS.OWNER_A.email },
        profile: USERS.OWNER_A.profile,
        appointments: appointment,
      })

      ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase)

      const result = await rescheduleAppointment('apt-1', 'invalid-date', '25:00')

      expect(result.success).toBe(false)
      expect(result.error).toContain('inválida')
    })
  })

  // =============================================================================
  // OWNER VIEW APPOINTMENTS TESTS
  // =============================================================================

  describe('getOwnerAppointments - View Own Appointments', () => {
    it('should return owner appointments grouped by upcoming and past', async () => {
      const appointments = [
        {
          id: 'apt-1',
          tenant_id: TENANTS.ADRIS.id,
          start_time: futureDate(7),
          end_time: futureDate(7),
          status: 'scheduled',
          reason: 'Checkup',
          pets: [PETS.OWNER_A_PET],
        },
        {
          id: 'apt-2',
          tenant_id: TENANTS.ADRIS.id,
          start_time: pastDate(7),
          end_time: pastDate(7),
          status: 'completed',
          reason: 'Vaccination',
          pets: [PETS.OWNER_A_PET],
        },
      ]

      const mockSupabase = createMockSupabase({
        user: { id: USERS.OWNER_A.id, email: USERS.OWNER_A.email },
        profile: USERS.OWNER_A.profile,
      })

      // Override from to return appointments array
      mockSupabase.from = vi.fn((table: string) => {
        const chain: Record<string, ReturnType<typeof vi.fn>> = {}
        chain.select = vi.fn().mockReturnValue(chain)
        chain.eq = vi.fn().mockReturnValue(chain)
        chain.order = vi.fn().mockResolvedValue({
          data: table === 'appointments' ? appointments : null,
          error: null,
        })
        chain.single = vi.fn().mockResolvedValue({
          data: table === 'profiles' ? USERS.OWNER_A.profile : null,
          error: null,
        })
        return chain
      })

      ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase)

      const result = await getOwnerAppointments('terrapet')

      expect(result.success).toBe(true)
      if (result.data) {
        expect(result.data.upcoming).toBeDefined()
        expect(result.data.past).toBeDefined()
      }
    })

    it('should only return appointments for owner pets', async () => {
      const mockSupabase = createMockSupabase({
        user: { id: USERS.OWNER_A.id, email: USERS.OWNER_A.email },
        profile: USERS.OWNER_A.profile,
      })

      // The query filters by pets.owner_id = user.id
      mockSupabase.from = vi.fn((table: string) => {
        const chain = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
          single: vi.fn().mockResolvedValue({
            data: table === 'profiles' ? USERS.OWNER_A.profile : null,
            error: null,
          }),
        }
        return chain
      })

      ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase)

      const result = await getOwnerAppointments('terrapet')

      expect(result.success).toBe(true)
    })

    it('should filter by tenant', async () => {
      const mockSupabase = createMockSupabase({
        user: { id: USERS.OWNER_A.id, email: USERS.OWNER_A.email },
        profile: USERS.OWNER_A.profile,
      })

      mockSupabase.from = vi.fn((table: string) => {
        const chain: Record<string, ReturnType<typeof vi.fn>> = {}
        chain.select = vi.fn().mockReturnValue(chain)
        chain.eq = vi.fn((field: string, value: unknown) => {
          // Verify tenant_id filter is applied
          if (field === 'tenant_id') {
            expect(value).toBe('terrapet')
          }
          return chain
        })
        chain.order = vi.fn().mockResolvedValue({
          data: [],
          error: null,
        })
        chain.single = vi.fn().mockResolvedValue({
          data: table === 'profiles' ? USERS.OWNER_A.profile : null,
          error: null,
        })
        return chain
      })

      ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase)

      await getOwnerAppointments('terrapet')
    })

    it('should return empty arrays when no appointments exist', async () => {
      const mockSupabase = createMockSupabase({
        user: { id: USERS.OWNER_A.id, email: USERS.OWNER_A.email },
        profile: USERS.OWNER_A.profile,
      })

      mockSupabase.from = vi.fn((table: string) => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
        single: vi.fn().mockResolvedValue({
          data: table === 'profiles' ? USERS.OWNER_A.profile : null,
          error: null,
        }),
      }))

      ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase)

      const result = await getOwnerAppointments('terrapet')

      expect(result.success).toBe(true)
      if (result.data) {
        expect(result.data.upcoming).toEqual([])
        expect(result.data.past).toEqual([])
      }
    })

    it('should handle database errors gracefully', async () => {
      const mockSupabase = createMockSupabase({
        user: { id: USERS.OWNER_A.id, email: USERS.OWNER_A.email },
        profile: USERS.OWNER_A.profile,
      })

      mockSupabase.from = vi.fn((table: string) => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
        single: vi.fn().mockResolvedValue({
          data: table === 'profiles' ? USERS.OWNER_A.profile : null,
          error: null,
        }),
      }))

      ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase)

      const result = await getOwnerAppointments('terrapet')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Error')
    })
  })

  // =============================================================================
  // AUTHENTICATION TESTS
  // =============================================================================

  describe('Authentication Requirements', () => {
    it('should reject unauthenticated cancel requests', async () => {
      const mockSupabase = createMockSupabase({
        user: null,
        authError: { message: 'Not authenticated' },
      })

      ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase)

      const result = await cancelAppointment('apt-1')

      expect(result.success).toBe(false)
    })

    it('should reject unauthenticated reschedule requests', async () => {
      const mockSupabase = createMockSupabase({
        user: null,
        authError: { message: 'Not authenticated' },
      })

      ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase)

      const result = await rescheduleAppointment('apt-1', '2026-02-01', '10:00')

      expect(result.success).toBe(false)
    })

    it('should reject unauthenticated view requests', async () => {
      const mockSupabase = createMockSupabase({
        user: null,
        authError: { message: 'Not authenticated' },
      })

      ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase)

      const result = await getOwnerAppointments('terrapet')

      expect(result.success).toBe(false)
    })
  })

  // =============================================================================
  // STAFF VS OWNER PERMISSION TESTS
  // =============================================================================

  describe('Staff Can Also Cancel Owner Appointments', () => {
    it('should allow vet to cancel any appointment in their tenant', async () => {
      const appointment = {
        id: 'apt-1',
        tenant_id: TENANTS.ADRIS.id,
        start_time: futureDate(7),
        status: 'scheduled',
        pets: [PETS.OWNER_A_PET],
      }

      const mockSupabase = createMockSupabase({
        user: { id: USERS.VET.id, email: USERS.VET.email },
        profile: USERS.VET.profile,
        appointments: appointment,
      })

      mockSupabase.from = vi.fn((table: string) => ({
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: table === 'profiles' ? USERS.VET.profile : appointment,
          error: null,
        }),
      }))

      ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase)

      const result = await cancelAppointment('apt-1', 'Vet cancelled')

      expect(result.success).toBe(true)
    })

    it('should allow admin to cancel any appointment in their tenant', async () => {
      const appointment = {
        id: 'apt-1',
        tenant_id: TENANTS.ADRIS.id,
        start_time: futureDate(7),
        status: 'scheduled',
        pets: [PETS.OWNER_A_PET],
      }

      const mockSupabase = createMockSupabase({
        user: { id: USERS.ADMIN.id, email: USERS.ADMIN.email },
        profile: USERS.ADMIN.profile,
        appointments: appointment,
      })

      mockSupabase.from = vi.fn((table: string) => ({
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: table === 'profiles' ? USERS.ADMIN.profile : appointment,
          error: null,
        }),
      }))

      ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase)

      const result = await cancelAppointment('apt-1', 'Admin cancelled')

      expect(result.success).toBe(true)
    })

    it('should reject staff cancelling appointment from different tenant', async () => {
      const appointment = {
        id: 'apt-1',
        tenant_id: TENANTS.PETLIFE.id, // Different tenant
        start_time: futureDate(7),
        status: 'scheduled',
        pets: [{ id: 'other-pet', owner_id: 'other-owner' }],
      }

      const mockSupabase = createMockSupabase({
        user: { id: USERS.VET.id, email: USERS.VET.email },
        profile: USERS.VET.profile, // tenant_id is TENANT_IDS.ADRIS
        appointments: appointment,
      })

      ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase)

      const result = await cancelAppointment('apt-1')

      expect(result.success).toBe(false)
      expect(result.error).toContain('No tienes permiso')
    })
  })

  // =============================================================================
  // EDGE CASES
  // =============================================================================

  describe('Edge Cases', () => {
    it('should handle appointments with no reason', async () => {
      const appointment = {
        id: 'apt-1',
        tenant_id: TENANTS.ADRIS.id,
        start_time: futureDate(7),
        status: 'scheduled',
        reason: null,
        pets: [PETS.OWNER_A_PET],
      }

      const mockSupabase = createMockSupabase({
        user: { id: USERS.OWNER_A.id, email: USERS.OWNER_A.email },
        profile: USERS.OWNER_A.profile,
        appointments: appointment,
      })

      mockSupabase.from = vi.fn((table: string) => ({
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: table === 'profiles' ? USERS.OWNER_A.profile : appointment,
          error: null,
        }),
      }))

      ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase)

      // Cancel without providing a reason
      const result = await cancelAppointment('apt-1')

      expect(result.success).toBe(true)
    })

    it('should handle multiple pets in appointment (edge case)', async () => {
      // In real world, appointments have one pet, but test array handling
      const appointment = {
        id: 'apt-1',
        tenant_id: TENANTS.ADRIS.id,
        start_time: futureDate(7),
        status: 'scheduled',
        pets: [PETS.OWNER_A_PET, { id: 'pet-2', owner_id: USERS.OWNER_A.id }],
      }

      const mockSupabase = createMockSupabase({
        user: { id: USERS.OWNER_A.id, email: USERS.OWNER_A.email },
        profile: USERS.OWNER_A.profile,
        appointments: appointment,
      })

      mockSupabase.from = vi.fn((table: string) => ({
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: table === 'profiles' ? USERS.OWNER_A.profile : appointment,
          error: null,
        }),
      }))

      ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase)

      const result = await cancelAppointment('apt-1')

      // Should use first pet for ownership check
      expect(result.success).toBe(true)
    })

    it('should handle same-day appointment cancellation', async () => {
      // Appointment later today
      const today = new Date()
      today.setHours(today.getHours() + 2)

      const appointment = {
        id: 'apt-1',
        tenant_id: TENANTS.ADRIS.id,
        start_time: today.toISOString(),
        status: 'scheduled',
        pets: [PETS.OWNER_A_PET],
      }

      const mockSupabase = createMockSupabase({
        user: { id: USERS.OWNER_A.id, email: USERS.OWNER_A.email },
        profile: USERS.OWNER_A.profile,
        appointments: appointment,
      })

      mockSupabase.from = vi.fn((table: string) => ({
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: table === 'profiles' ? USERS.OWNER_A.profile : appointment,
          error: null,
        }),
      }))

      ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase)

      const result = await cancelAppointment('apt-1')

      // Same-day future appointments can still be cancelled
      expect(result.success).toBe(true)
    })
  })

  // =============================================================================
  // STATUS TRANSITION TESTS
  // =============================================================================

  describe('Appointment Status Transitions', () => {
    const testCases = [
      { status: 'pending', canCancel: true },
      { status: 'scheduled', canCancel: true },
      { status: 'confirmed', canCancel: true },
      { status: 'checked_in', canCancel: true },
      { status: 'in_progress', canCancel: true },
      { status: 'completed', canCancel: false },
      { status: 'cancelled', canCancel: false },
      { status: 'no_show', canCancel: false },
    ]

    testCases.forEach(({ status, canCancel }) => {
      it(`should ${canCancel ? 'allow' : 'reject'} cancelling ${status} appointment`, async () => {
        const appointment = {
          id: 'apt-1',
          tenant_id: TENANTS.ADRIS.id,
          start_time: futureDate(7),
          status,
          pets: [PETS.OWNER_A_PET],
        }

        const mockSupabase = createMockSupabase({
          user: { id: USERS.OWNER_A.id, email: USERS.OWNER_A.email },
          profile: USERS.OWNER_A.profile,
          appointments: appointment,
        })

        mockSupabase.from = vi.fn((table: string) => ({
          select: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: table === 'profiles' ? USERS.OWNER_A.profile : appointment,
            error: null,
          }),
        }))

        ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase)

        const result = await cancelAppointment('apt-1')

        if (canCancel) {
          expect(result.success).toBe(true)
        } else {
          expect(result.success).toBe(false)
        }
      })
    })
  })
})
