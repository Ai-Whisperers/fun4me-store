/**
 * AppointmentService Unit Tests
 *
 * Tests cover:
 * - CRUD operations
 * - Status transitions
 * - Slot availability
 * - Analytics
 * - Error handling
 * - Tenant isolation
 *
 * Target Coverage: 95%+
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppointmentService } from '@/lib/services';
import type { Appointment, CreateAppointmentInput } from '@/lib/types/entities/appointment';
import { createMockSupabase } from '../../__helpers__/mocks';
import { TENANT_IDS } from '@/lib/constants/tenants';

// =============================================================================
// MOCK SETUP
// =============================================================================

const mockAppointment: Appointment = {
  id: 'apt-1',
  tenant_id: TENANT_IDS.ADRIS,
  pet_id: 'pet-1',
  vet_id: 'vet-1',
  service_id: 'service-1',
  created_by: 'user-1',
  start_time: '2026-02-01T10:00:00Z',
  end_time: '2026-02-01T10:30:00Z',
  status: 'pending',
  reason: 'Consulta general',
  notes: null,
  created_at: '2026-01-15T12:00:00Z',
  updated_at: '2026-01-15T12:00:00Z',
};

const _mockAppointmentWithDetails = {
  ...mockAppointment,
  pet: {
    id: 'pet-1',
    name: 'Max',
    species: 'dog',
    breed: 'Labrador',
    photo_url: null,
    owner: {
      id: 'owner-1',
      full_name: 'Juan Pérez',
      email: 'juan@example.com',
      phone: '+595981234567',
    },
  },
  service: {
    id: 'service-1',
    name: 'Consulta General',
    duration_minutes: 30,
    base_price: 50000,
  },
  vet: {
    id: 'vet-1',
    full_name: 'Dra. María López',
  },
};

// Using centralized mock from tests/__helpers__/mocks.ts

// =============================================================================
// TESTS
// =============================================================================

describe('AppointmentService', () => {
  let service: AppointmentService;
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
    service = new AppointmentService(mockSupabase);
  });

  // ---------------------------------------------------------------------------
  // LIST OPERATIONS
  // ---------------------------------------------------------------------------

  describe('list', () => {
    it('returns appointments for a tenant', async () => {
      // Mock the appointments list response
      mockSupabase._mocks.setMockData({
        data: [_mockAppointmentWithDetails],
        error: null,
      });

      const result = await service.list('terrapet');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].id).toBe('apt-1');
        expect(result.data[0].pet.name).toBe('Max');
      }
    });

    it('filters appointments by status', async () => {
      mockSupabase._mocks.setMockData({
        data: [_mockAppointmentWithDetails],
        error: null,
      });

      const result = await service.list('terrapet', { status: 'pending' });

      expect(result.success).toBe(true);
      expect(mockSupabase._mocks.eq).toHaveBeenCalledWith('status', 'pending');
    });

    it('filters appointments by pet_id', async () => {
      mockSupabase._mocks.setMockData({
        data: [_mockAppointmentWithDetails],
        error: null,
      });

      const result = await service.list('terrapet', { pet_id: 'pet-1' });

      expect(result.success).toBe(true);
      expect(mockSupabase._mocks.eq).toHaveBeenCalledWith('pet_id', 'pet-1');
    });

    it('filters appointments by date range', async () => {
      mockSupabase._mocks.setMockData({
        data: [_mockAppointmentWithDetails],
        error: null,
      });

      const result = await service.list('terrapet', {
        start_date: '2026-01-01',
        end_date: '2026-12-31',
      });

      expect(result.success).toBe(true);
      // Note: gte and lte calls will be made for date filtering
    });

    it('excludes deleted appointments by default', async () => {
      mockSupabase._mocks.setMockData({
        data: [_mockAppointmentWithDetails],
        error: null,
      });

      const result = await service.list('terrapet');

      expect(result.success).toBe(true);
      expect(mockSupabase._mocks.is).toHaveBeenCalledWith('deleted_at', null);
    });

    it('includes deleted appointments when requested', async () => {
      mockSupabase._mocks.setMockData({
        data: [_mockAppointmentWithDetails],
        error: null,
      });

      const result = await service.list('terrapet', { include_deleted: true });

      expect(result.success).toBe(true);
      // Should not call .is('deleted_at', null)
    });

    it('handles database errors gracefully', async () => {
      // Clear queue and set error response
      mockSupabase._mocks.clearQueue();
      mockSupabase._mocks.setMockData({
        data: null,
        error: new Error('DB error'),
      });

      const result = await service.list('terrapet');

      expect(result.success).toBe(false);
      if (!result.success) {
        // Error contains error wrapper message or stringified error
        expect(typeof result.error).toBe('string');
        expect(result.error.length).toBeGreaterThan(0);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // GET BY ID
  // ---------------------------------------------------------------------------

  describe('getById', () => {
    it('returns appointment with details', async () => {
      mockSupabase._mocks.setMockData({
        data: _mockAppointmentWithDetails,
        error: null,
      });

      const result = await service.getById('apt-1', 'terrapet');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('apt-1');
        expect(result.data.pet.name).toBe('Max');
        expect(result.data.service?.name).toBe('Consulta General');
      }
    });

    it('handles appointment not found', async () => {
      mockSupabase._mocks.single.mockReturnValueOnce({
        then: vi.fn((cb) => cb({ data: null, error: new Error('Not found') })),
      });

      const result = await service.getById('apt-999', 'terrapet');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.details?.message).toBeDefined();
      }
    });
  });

  // ---------------------------------------------------------------------------
  // CREATE
  // ---------------------------------------------------------------------------

  describe('create', () => {
    const validInput: CreateAppointmentInput = {
      tenant_id: TENANT_IDS.ADRIS,
      pet_id: 'pet-1',
      vet_id: 'vet-1',
      service_id: 'service-1',
      created_by: 'user-1',
      start_time: '2026-02-01T10:00:00Z',
      end_time: '2026-02-01T10:30:00Z',
      reason: 'Consulta general',
      notes: 'Primera consulta',
    };

    it('creates a new appointment successfully', async () => {
      mockSupabase._mocks.limit.mockReturnValueOnce({
        then: vi.fn((cb) => cb({ data: [], error: null })), // No overlaps
      });

      mockSupabase._mocks.single.mockReturnValueOnce({
        then: vi.fn((cb) => cb({ data: mockAppointment, error: null })),
      });

      const result = await service.create(validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('apt-1');
        expect(result.data.status).toBe('pending');
      }
    });

    it('validates required fields', async () => {
      const invalidInput = {
        tenant_id: TENANT_IDS.ADRIS,
        // Missing required fields
      } as CreateAppointmentInput;

      const result = await service.create(invalidInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        // More specific error message is okay
        expect(result.error).toBeDefined();
        expect(result.error).toContain('requerido');
      }
    });

    it('detects overlapping appointments', async () => {
      // Mock overlap detection
      mockSupabase._mocks.limit.mockReturnValueOnce({
        then: vi.fn((cb) => cb({ data: [{ id: 'apt-existing' }], error: null })),
      });

      const result = await service.create(validInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.details?.message).toContain('Ya existe una cita en este horario');
      }
    });

    it('handles database errors with friendly messages', async () => {
      mockSupabase._mocks.limit.mockReturnValueOnce({
        then: vi.fn((cb) => cb({ data: [], error: null })),
      });

      mockSupabase._mocks.single.mockReturnValueOnce({
        then: vi.fn((cb) =>
          cb({ data: null, error: { code: '23505', message: 'Unique violation' } })
        ),
      });

      const result = await service.create(validInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.details?.message).toContain('ya existe');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // UPDATE
  // ---------------------------------------------------------------------------

  describe('update', () => {
    it('updates an appointment successfully', async () => {
      mockSupabase._mocks.single
        .mockReturnValueOnce({
          then: vi.fn((cb) =>
            cb({ data: { tenant_id: TENANT_IDS.ADRIS, status: 'pending' }, error: null })
          ),
        })
        .mockReturnValueOnce({
          then: vi.fn((cb) => cb({ data: { ...mockAppointment, notes: 'Updated' }, error: null })),
        });

      const result = await service.update('apt-1', 'terrapet', { notes: 'Updated' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.notes).toBe('Updated');
      }
    });

    it('validates tenant access', async () => {
      mockSupabase._mocks.single.mockReturnValueOnce({
        then: vi.fn((cb) =>
          cb({ data: { tenant_id: 'other-clinic', status: 'pending' }, error: null })
        ),
      });

      const result = await service.update('apt-1', 'terrapet', { notes: 'Updated' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.details?.message).toContain('No puede acceder a datos de otra clínica');
      }
    });

    it('prevents updating completed appointments', async () => {
      mockSupabase._mocks.single.mockReturnValueOnce({
        then: vi.fn((cb) =>
          cb({ data: { tenant_id: TENANT_IDS.ADRIS, status: 'completed' }, error: null })
        ),
      });

      const result = await service.update('apt-1', 'terrapet', { notes: 'Updated' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.details?.message).toContain('No se puede modificar');
      }
    });

    it('prevents updating cancelled appointments', async () => {
      mockSupabase._mocks.single.mockReturnValueOnce({
        then: vi.fn((cb) =>
          cb({ data: { tenant_id: TENANT_IDS.ADRIS, status: 'cancelled' }, error: null })
        ),
      });

      const result = await service.update('apt-1', 'terrapet', { notes: 'Updated' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.details?.message).toContain('No se puede modificar');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // CHECK-IN
  // ---------------------------------------------------------------------------

  describe('checkIn', () => {
    it('checks in a pending appointment', async () => {
      mockSupabase._mocks.single
        .mockReturnValueOnce({
          then: vi.fn((cb) =>
            cb({ data: { tenant_id: TENANT_IDS.ADRIS, status: 'pending' }, error: null })
          ),
        })
        .mockReturnValueOnce({
          then: vi.fn((cb) =>
            cb({ data: { ...mockAppointment, status: 'checked_in' }, error: null })
          ),
        });

      const result = await service.checkIn('apt-1', 'terrapet', 'vet-1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('checked_in');
      }
    });

    it('checks in a confirmed appointment', async () => {
      mockSupabase._mocks.single
        .mockReturnValueOnce({
          then: vi.fn((cb) =>
            cb({ data: { tenant_id: TENANT_IDS.ADRIS, status: 'confirmed' }, error: null })
          ),
        })
        .mockReturnValueOnce({
          then: vi.fn((cb) =>
            cb({ data: { ...mockAppointment, status: 'checked_in' }, error: null })
          ),
        });

      const result = await service.checkIn('apt-1', 'terrapet', 'vet-1');

      expect(result.success).toBe(true);
    });

    it('prevents checking in completed appointments', async () => {
      mockSupabase._mocks.single.mockReturnValueOnce({
        then: vi.fn((cb) =>
          cb({ data: { tenant_id: TENANT_IDS.ADRIS, status: 'completed' }, error: null })
        ),
      });

      const result = await service.checkIn('apt-1', 'terrapet', 'vet-1');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.details?.message).toContain('No se puede registrar');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // COMPLETE
  // ---------------------------------------------------------------------------

  describe('complete', () => {
    it('completes a checked-in appointment', async () => {
      mockSupabase._mocks.single
        .mockReturnValueOnce({
          then: vi.fn((cb) =>
            cb({ data: { tenant_id: TENANT_IDS.ADRIS, status: 'checked_in', notes: null }, error: null })
          ),
        })
        .mockReturnValueOnce({
          then: vi.fn((cb) =>
            cb({ data: { ...mockAppointment, status: 'completed' }, error: null })
          ),
        });

      const result = await service.complete('apt-1', 'terrapet', 'vet-1', 'Consulta realizada');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('completed');
      }
    });

    it('appends completion notes to existing notes', async () => {
      mockSupabase._mocks.single.mockReturnValueOnce({
        then: vi.fn((cb) =>
          cb({
            data: {
              tenant_id: TENANT_IDS.ADRIS,
              status: 'in_progress',
              notes: 'Notas previas',
            },
            error: null,
          })
        ),
      });

      await service.complete('apt-1', 'terrapet', 'vet-1', 'Consulta realizada');

      // Verify update was called with notes
      expect(mockSupabase._mocks.update).toHaveBeenCalled();
    });

    it('prevents completing pending appointments', async () => {
      mockSupabase._mocks.single.mockReturnValueOnce({
        then: vi.fn((cb) =>
          cb({ data: { tenant_id: TENANT_IDS.ADRIS, status: 'pending', notes: null }, error: null })
        ),
      });

      const result = await service.complete('apt-1', 'terrapet', 'vet-1');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.details?.message).toContain('No se puede completar');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // CANCEL
  // ---------------------------------------------------------------------------

  describe('cancel', () => {
    it('cancels a pending appointment', async () => {
      mockSupabase._mocks.single
        .mockReturnValueOnce({
          then: vi.fn((cb) =>
            cb({ data: { tenant_id: TENANT_IDS.ADRIS, status: 'pending' }, error: null })
          ),
        })
        .mockReturnValueOnce({
          then: vi.fn((cb) =>
            cb({ data: { ...mockAppointment, status: 'cancelled' }, error: null })
          ),
        });

      const result = await service.cancel('apt-1', 'terrapet', 'user-1', 'Cliente canceló');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('cancelled');
      }
    });

    it('prevents cancelling completed appointments', async () => {
      mockSupabase._mocks.single.mockReturnValueOnce({
        then: vi.fn((cb) =>
          cb({ data: { tenant_id: TENANT_IDS.ADRIS, status: 'completed' }, error: null })
        ),
      });

      const result = await service.cancel('apt-1', 'terrapet', 'user-1');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.details?.message).toContain('No se puede cancelar');
      }
    });

    it('prevents cancelling already cancelled appointments', async () => {
      mockSupabase._mocks.single.mockReturnValueOnce({
        then: vi.fn((cb) =>
          cb({ data: { tenant_id: TENANT_IDS.ADRIS, status: 'cancelled' }, error: null })
        ),
      });

      const result = await service.cancel('apt-1', 'terrapet', 'user-1');

      expect(result.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // AVAILABLE SLOTS
  // ---------------------------------------------------------------------------

  describe('getAvailableSlots', () => {
    it('returns available slots for a date', async () => {
      // Clear queue and set responses: 1) business hours, 2) appointments
      mockSupabase._mocks.clearQueue();
      mockSupabase._mocks.queueMockData(
        { data: [{ start_time: '09:00', end_time: '17:00', day_of_week: 0 }], error: null },
        {
          data: [
            { start_time: '2026-02-01T10:00:00Z', end_time: '2026-02-01T10:30:00Z' },
          ],
          error: null,
        }
      );

      const result = await service.getAvailableSlots('terrapet', {
        date: '2026-02-01',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.slots).toBeDefined();
      }
    });

    it('uses service duration when service_id provided', async () => {
      // Clear queue and set responses: 1) service lookup, 2) business hours, 3) appointments
      mockSupabase._mocks.clearQueue();
      mockSupabase._mocks.queueMockData(
        { data: { duration_minutes: 60 }, error: null },
        { data: [{ start_time: '09:00', end_time: '17:00', day_of_week: 0 }], error: null },
        { data: [], error: null }
      );

      const result = await service.getAvailableSlots('terrapet', {
        date: '2026-02-01',
        service_id: 'service-1',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.slotDuration).toBe(60);
      }
    });

    it('uses default duration when service not found', async () => {
      // Clear queue and set responses: 1) service lookup (not found), 2) business hours, 3) appointments
      mockSupabase._mocks.clearQueue();
      mockSupabase._mocks.queueMockData(
        { data: null, error: null },
        { data: [{ start_time: '09:00', end_time: '17:00', day_of_week: 0 }], error: null },
        { data: [], error: null }
      );

      const result = await service.getAvailableSlots('terrapet', {
        date: '2026-02-01',
        service_id: 'service-999',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.slotDuration).toBe(30);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // ANALYTICS
  // ---------------------------------------------------------------------------

  describe('getAnalytics', () => {
    it('returns analytics from materialized view if available', async () => {
      mockSupabase._mocks.limit.mockReturnValueOnce({
        then: vi.fn((cb) =>
          cb({
            data: [
              {
                period_start: '2026-01-15',
                total_appointments: 10,
                completed: 8,
                cancelled: 1,
                no_shows: 1,
                completion_rate: '80.0',
              },
            ],
            error: null,
          })
        ),
      });

      const result = await service.getAnalytics('terrapet', 'month');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].completion_rate).toBe('80.0');
      }
    });

    it('falls back to live query if materialized view fails', async () => {
      // Queue responses: 1) materialized view (fails), 2) live query
      mockSupabase._mocks.queueMockData(
        { data: null, error: new Error('View not found') },
        {
          data: [
            { id: '1', status: 'completed', start_time: '2026-01-15T10:00:00Z' },
            { id: '2', status: 'completed', start_time: '2026-01-15T11:00:00Z' },
            { id: '3', status: 'cancelled', start_time: '2026-01-15T14:00:00Z' },
          ],
          error: null,
        }
      );

      const result = await service.getAnalytics('terrapet', 'month');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBeGreaterThan(0);
      }
    });
  });
});
