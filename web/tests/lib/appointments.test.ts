import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient } from '@/lib/supabase/server'
import { getTodayAppointmentsForClinic } from '@/lib/domain/appointments/queries'

// Mock the server client
vi.mock('@/lib/supabase/server')

describe('getTodayAppointmentsForClinic', () => {
  const mockSupabase = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    order: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(createClient as any).mockResolvedValue(mockSupabase)
  })

  it('should fetch and transform appointments correctly', async () => {
    const mockData = [
      {
        id: 'apt1',
        start_time: '2023-10-27T10:00:00',
        end_time: '2023-10-27T10:30:00',
        status: 'confirmed',
        reason: 'Check-up',
        pets: [
          {
            id: 'pet1',
            name: 'Buddy',
            species: 'Dog',
            owner: [{ id: 'owner1', full_name: 'John Doe' }],
          },
        ],
      },
    ]

    mockSupabase.order.mockResolvedValueOnce({ data: mockData, error: null })

    const clinicId = 'test-clinic'
    const appointments = await getTodayAppointmentsForClinic(clinicId)

    // Verify the query was built correctly
    expect(mockSupabase.from).toHaveBeenCalledWith('appointments')
    expect(mockSupabase.eq).toHaveBeenCalledWith('tenant_id', clinicId)
    expect(mockSupabase.gte).toHaveBeenCalledWith('start_time', expect.any(String))
    expect(mockSupabase.lt).toHaveBeenCalledWith('start_time', expect.any(String))
    expect(mockSupabase.order).toHaveBeenCalledWith('start_time', { ascending: true })

    // Verify the data transformation
    expect(appointments).toHaveLength(1)
    expect(appointments[0].id).toBe('apt1')
    expect(appointments[0].pets).toBeDefined()
    expect(Array.isArray(appointments[0].pets)).toBe(false) // Should be an object, not array
    expect(appointments[0].pets?.name).toBe('Buddy')
    expect(appointments[0].pets?.owner).toBeDefined()
    expect(Array.isArray(appointments[0].pets?.owner)).toBe(false) // Should be an object
    expect(appointments[0].pets?.owner?.full_name).toBe('John Doe')
  })

  it('should return an empty array if there is a database error', async () => {
    mockSupabase.order.mockResolvedValueOnce({ data: null, error: new Error('DB Error') })

    const appointments = await getTodayAppointmentsForClinic('test-clinic')

    expect(appointments).toEqual([])
  })
})
