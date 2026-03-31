/**
 * AppointmentService Tests
 *
 * Tests appointment management functionality:
 * - CRUD operations
 * - Status transitions (check-in, complete, cancel)
 * - Slot availability
 * - Tenant validation
 * - Analytics
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppointmentService } from '@/lib/services/appointment-service';
import { createMockSupabaseClient, type MockSupabaseClient } from './__mocks__/supabase-mock';

// Mock the logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// =============================================================================
// TEST DATA FACTORIES
// =============================================================================

const TEST_TENANT_ID = 'tenant-vet-clinic';
const TEST_USER_ID = 'user-admin-123';
const TEST_PET_ID = 'pet-dog-456';
const TEST_VET_ID = 'vet-doc-789';

function createMockAppointment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'apt-123',
    tenant_id: TEST_TENANT_ID,
    pet_id: TEST_PET_ID,
    vet_id: TEST_VET_ID,
    service_id: 'svc-consultation',
    created_by: TEST_USER_ID,
    start_time: '2024-03-15T10:00:00Z',
    end_time: '2024-03-15T10:30:00Z',
    status: 'pending',
    reason: 'Consulta general',
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    ...overrides,
  };
}

function createMockAppointmentWithDetails(overrides: Record<string, unknown> = {}) {
  return {
    ...createMockAppointment(overrides),
    pet: {
      id: TEST_PET_ID,
      name: 'Max',
      species: 'dog',
      breed: 'Labrador',
      photo_url: null,
      owner: {
        id: 'owner-123',
        full_name: 'Juan Pérez',
        email: 'juan@example.com',
        phone: '+595991234567',
      },
    },
    service: {
      id: 'svc-consultation',
      name: 'Consulta General',
      duration_minutes: 30,
      base_price: 150000,
    },
    vet: {
      id: TEST_VET_ID,
      full_name: 'Dr. García',
    },
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('AppointmentService', () => {
  let mockClient: MockSupabaseClient;
  let service: AppointmentService;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    service = new AppointmentService(mockClient as never);
    vi.clearAllMocks();
  });

  // ===========================================================================
  // LIST APPOINTMENTS
  // ===========================================================================

  describe('list', () => {
    it('should return appointments for tenant', async () => {
      const mockAppointments = [
        createMockAppointmentWithDetails({ id: 'apt-1' }),
        createMockAppointmentWithDetails({ id: 'apt-2' }),
      ];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              is: vi.fn().mockResolvedValue({ data: mockAppointments, error: null }),
            }),
          }),
        }),
      });

      const result = await service.list(TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBe(2);
      }
      expect(mockClient.from).toHaveBeenCalledWith('appointments');
    });

    it('should filter by status', async () => {
      const pendingAppointments = [createMockAppointmentWithDetails({ status: 'pending' })];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: pendingAppointments, error: null }),
              }),
            }),
          }),
        }),
      });

      const result = await service.list(TEST_TENANT_ID, { status: 'pending' });

      expect(result.success).toBe(true);
    });

    it('should filter by date range', async () => {
      const appointments = [createMockAppointmentWithDetails()];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  lte: vi.fn().mockResolvedValue({ data: appointments, error: null }),
                }),
              }),
            }),
          }),
        }),
      });

      const result = await service.list(TEST_TENANT_ID, {
        start_date: '2024-03-01',
        end_date: '2024-03-31',
      });

      expect(result.success).toBe(true);
    });

    it('should handle database errors', async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              is: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' },
              }),
            }),
          }),
        }),
      });

      const result = await service.list(TEST_TENANT_ID);

      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // GET BY ID
  // ===========================================================================

  describe('getById', () => {
    it('should return appointment by ID', async () => {
      const appointment = createMockAppointmentWithDetails();

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: appointment, error: null }),
              }),
            }),
          }),
        }),
      });

      const result = await service.getById('apt-123', TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('apt-123');
      }
    });

    it('should fail when appointment not found', async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116', message: 'Not found' },
                }),
              }),
            }),
          }),
        }),
      });

      const result = await service.getById('nonexistent', TEST_TENANT_ID);

      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // CREATE APPOINTMENT
  // ===========================================================================

  describe('create', () => {
    it('should create new appointment', async () => {
      const newAppointment = createMockAppointment();

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'appointments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  not: vi.fn().mockReturnValue({
                    or: vi.fn().mockReturnValue({
                      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                    }),
                  }),
                }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: newAppointment, error: null }),
              }),
            }),
          };
        }
        return mockClient._queryBuilder;
      });

      const result = await service.create({
        tenant_id: TEST_TENANT_ID,
        pet_id: TEST_PET_ID,
        start_time: '2024-03-15T10:00:00Z',
        end_time: '2024-03-15T10:30:00Z',
        reason: 'Consulta general',
        created_by: TEST_USER_ID,
      });

      expect(result.success).toBe(true);
    });

    it('should fail when required fields are missing', async () => {
      const result = await service.create({
        tenant_id: TEST_TENANT_ID,
        pet_id: TEST_PET_ID,
        start_time: '',
        end_time: '',
        reason: '',
        created_by: TEST_USER_ID,
      });

      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // UPDATE APPOINTMENT
  // ===========================================================================

  describe('update', () => {
    it('should update pending appointment', async () => {
      const existing = createMockAppointment({ status: 'pending' });
      const updated = createMockAppointment({ notes: 'Updated notes' });

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: existing, error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: updated, error: null }),
            }),
          }),
        }),
      });

      const result = await service.update('apt-123', TEST_TENANT_ID, {
        notes: 'Updated notes',
      });

      expect(result.success).toBe(true);
    });

    it('should fail to update completed appointment', async () => {
      const existing = createMockAppointment({ status: 'completed' });

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: existing, error: null }),
          }),
        }),
      });

      const result = await service.update('apt-123', TEST_TENANT_ID, {
        notes: 'Cannot update',
      });

      expect(result.success).toBe(false);
    });

    it('should fail when tenant mismatch', async () => {
      const existing = createMockAppointment({ tenant_id: 'other-tenant' });

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: existing, error: null }),
          }),
        }),
      });

      const result = await service.update('apt-123', TEST_TENANT_ID, {
        notes: 'Test',
      });

      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // CHECK IN
  // ===========================================================================

  describe('checkIn', () => {
    it('should check in pending appointment', async () => {
      const existing = createMockAppointment({ status: 'pending' });
      const checkedIn = createMockAppointment({
        status: 'checked_in',
        checked_in_at: new Date().toISOString(),
      });

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: existing, error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: checkedIn, error: null }),
            }),
          }),
        }),
      });

      const result = await service.checkIn('apt-123', TEST_TENANT_ID, TEST_USER_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('checked_in');
      }
    });

    it('should fail to check in cancelled appointment', async () => {
      const existing = createMockAppointment({ status: 'cancelled' });

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: existing, error: null }),
          }),
        }),
      });

      const result = await service.checkIn('apt-123', TEST_TENANT_ID, TEST_USER_ID);

      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // COMPLETE
  // ===========================================================================

  describe('complete', () => {
    it('should complete checked-in appointment', async () => {
      const existing = createMockAppointment({ status: 'checked_in' });
      const completed = createMockAppointment({
        status: 'completed',
        completed_at: new Date().toISOString(),
      });

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: existing, error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: completed, error: null }),
            }),
          }),
        }),
      });

      const result = await service.complete('apt-123', TEST_TENANT_ID, TEST_USER_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('completed');
      }
    });

    it('should fail to complete pending appointment', async () => {
      const existing = createMockAppointment({ status: 'pending' });

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: existing, error: null }),
          }),
        }),
      });

      const result = await service.complete('apt-123', TEST_TENANT_ID, TEST_USER_ID);

      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // CANCEL
  // ===========================================================================

  describe('cancel', () => {
    it('should cancel pending appointment', async () => {
      const existing = createMockAppointment({ status: 'pending' });
      const cancelled = createMockAppointment({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      });

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: existing, error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: cancelled, error: null }),
            }),
          }),
        }),
      });

      const result = await service.cancel(
        'apt-123',
        TEST_TENANT_ID,
        TEST_USER_ID,
        'Cliente no disponible'
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('cancelled');
      }
    });

    it('should fail to cancel completed appointment', async () => {
      const existing = createMockAppointment({ status: 'completed' });

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: existing, error: null }),
          }),
        }),
      });

      const result = await service.cancel(
        'apt-123',
        TEST_TENANT_ID,
        TEST_USER_ID,
        'Cannot cancel'
      );

      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // SOFT DELETE
  // ===========================================================================

  describe('softDelete', () => {
    it('should soft delete appointment', async () => {
      const existing = createMockAppointment();
      const deleted = createMockAppointment({
        deleted_at: new Date().toISOString(),
      });

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: existing, error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: deleted, error: null }),
            }),
          }),
        }),
      });

      const result = await service.softDelete('apt-123', TEST_TENANT_ID);

      expect(result.success).toBe(true);
    });
  });

  // ===========================================================================
  // GET AVAILABLE SLOTS
  // ===========================================================================

  describe('getAvailableSlots', () => {
    it('should return available slots', async () => {
      const slots = [
        { slot_time: '08:00', is_available: true },
        { slot_time: '08:30', is_available: false },
        { slot_time: '09:00', is_available: true },
      ];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { duration_minutes: 30 },
              error: null,
            }),
          }),
        }),
      });

      mockClient.rpc.mockResolvedValue({ data: slots, error: null });

      const result = await service.getAvailableSlots(TEST_TENANT_ID, {
        date: '2024-03-15',
        service_id: 'svc-123',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.slots.length).toBe(3);
        expect(result.data.date).toBe('2024-03-15');
      }
    });
  });

  // ===========================================================================
  // GET ANALYTICS
  // ===========================================================================

  describe('getAnalytics', () => {
    it('should return analytics from materialized view', async () => {
      const analytics = [
        {
          period_start: '2024-03-01',
          total_appointments: 50,
          completed: 40,
          cancelled: 5,
          no_shows: 5,
          completion_rate: '80.0',
        },
      ];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: analytics, error: null }),
            }),
          }),
        }),
      });

      const result = await service.getAnalytics(TEST_TENANT_ID, 'month');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBe(1);
        expect(result.data[0].total_appointments).toBe(50);
      }
    });
  });

  // ===========================================================================
  // STATUS TRANSITIONS
  // ===========================================================================

  describe('Status Transitions', () => {
    const statusTransitions = [
      { from: 'pending', validNext: ['checked_in', 'cancelled'] },
      { from: 'confirmed', validNext: ['checked_in', 'cancelled'] },
      { from: 'checked_in', validNext: ['in_progress', 'completed'] },
      { from: 'in_progress', validNext: ['completed'] },
      { from: 'completed', validNext: [] },
      { from: 'cancelled', validNext: [] },
    ];

    statusTransitions.forEach(({ from, validNext }) => {
      describe(`from ${from} status`, () => {
        if (validNext.includes('checked_in')) {
          it('should allow check-in', async () => {
            const existing = createMockAppointment({ status: from });

            mockClient.from.mockReturnValue({
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: existing, error: null }),
                }),
              }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { ...existing, status: 'checked_in' },
                      error: null,
                    }),
                  }),
                }),
              }),
            });

            const result = await service.checkIn('apt-123', TEST_TENANT_ID, TEST_USER_ID);
            expect(result.success).toBe(true);
          });
        }

        if (validNext.includes('cancelled')) {
          it('should allow cancellation', async () => {
            const existing = createMockAppointment({ status: from });

            mockClient.from.mockReturnValue({
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: existing, error: null }),
                }),
              }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { ...existing, status: 'cancelled' },
                      error: null,
                    }),
                  }),
                }),
              }),
            });

            const result = await service.cancel('apt-123', TEST_TENANT_ID, TEST_USER_ID);
            expect(result.success).toBe(true);
          });
        }

        if (validNext.includes('completed')) {
          it('should allow completion', async () => {
            const existing = createMockAppointment({ status: from });

            mockClient.from.mockReturnValue({
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: existing, error: null }),
                }),
              }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { ...existing, status: 'completed' },
                      error: null,
                    }),
                  }),
                }),
              }),
            });

            const result = await service.complete('apt-123', TEST_TENANT_ID, TEST_USER_ID);
            expect(result.success).toBe(true);
          });
        }

        // For terminal states (completed, cancelled), verify no transitions are allowed
        if (validNext.length === 0) {
          it('should be a terminal state with no allowed transitions', () => {
            // Terminal states like completed and cancelled cannot transition to any other state
            expect(validNext).toHaveLength(0);
          });
        }
      });
    });
  });
});
