/**
 * VaccineService Tests
 *
 * Tests vaccination management functionality:
 * - Recording vaccine administrations
 * - Scheduling upcoming vaccines
 * - Tracking reactions
 * - Due date reminders
 * - Statistics
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  VaccineService,
  type Vaccine,
  type VaccineWithRelations,
  type VaccineTemplate,
  type VaccineReaction,
} from '@/lib/services/vaccine-service';
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
const TEST_PET_ID = 'pet-max-123';
const TEST_USER_ID = 'user-vet-456';

function createMockVaccine(overrides: Partial<Vaccine> = {}): Vaccine {
  return {
    id: 'vac-123',
    pet_id: TEST_PET_ID,
    administered_by_clinic: TEST_TENANT_ID,
    template_id: null,
    administered_by: TEST_USER_ID,
    name: 'Rabies',
    batch_number: 'BATCH-2024-001',
    manufacturer: 'PetVax',
    route: 'SC',
    dosage: '1ml',
    lot_expiry: '2025-12-31',
    administered_date: '2024-01-15',
    next_due_date: '2025-01-15',
    status: 'completed',
    vet_signature: 'Dr. Smith',
    certificate_url: null,
    adverse_reactions: null,
    photos: [],
    notes: 'Annual vaccination',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function createMockVaccineWithRelations(
  overrides: Partial<VaccineWithRelations> = {}
): VaccineWithRelations {
  return {
    ...createMockVaccine(),
    pet: {
      id: TEST_PET_ID,
      name: 'Max',
      species: 'dog',
      owner: { full_name: 'John Doe' },
    },
    administered_by_profile: {
      id: TEST_USER_ID,
      full_name: 'Dr. Jane Smith',
    },
    ...overrides,
  };
}

function createMockPet(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_PET_ID,
    tenant_id: TEST_TENANT_ID,
    name: 'Max',
    species: 'dog',
    ...overrides,
  };
}

function createMockTemplate(overrides: Partial<VaccineTemplate> = {}): VaccineTemplate {
  return {
    id: 'tmpl-123',
    tenant_id: null,
    name: 'Rabies Vaccine',
    code: 'RAB',
    species: ['dog', 'cat'],
    description: 'Required annual rabies vaccination',
    min_age_weeks: 12,
    recommended_age_weeks: 16,
    booster_interval_days: 365,
    is_required: true,
    display_order: 1,
    is_active: true,
    ...overrides,
  };
}

function createMockReaction(overrides: Partial<VaccineReaction> = {}): VaccineReaction {
  return {
    id: 'rxn-123',
    tenant_id: TEST_TENANT_ID,
    pet_id: TEST_PET_ID,
    vaccine_id: 'vac-123',
    vaccine_name: 'Rabies',
    vaccine_brand: 'PetVax',
    reaction_date: '2024-01-15',
    onset_hours: 2,
    severity: 'low',
    reaction_type: 'local',
    symptoms: ['swelling', 'lethargy'],
    treatment: 'Cold compress',
    outcome: 'Resolved in 24 hours',
    hospitalization_required: false,
    recovery_days: 1,
    notes: 'Mild reaction, no follow-up needed',
    reported_by: TEST_USER_ID,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('VaccineService', () => {
  let mockClient: MockSupabaseClient;
  let service: VaccineService;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    service = new VaccineService(mockClient as never);
    vi.clearAllMocks();
  });

  // ===========================================================================
  // LIST VACCINES
  // ===========================================================================

  describe('list', () => {
    it('should return vaccines for tenant', async () => {
      const vaccines = [
        createMockVaccineWithRelations({ id: 'vac-1' }),
        createMockVaccineWithRelations({ id: 'vac-2' }),
      ];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: vaccines, error: null }),
            }),
          }),
        }),
      });

      const result = await service.list(TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBe(2);
      }
    });

    it('should filter by pet_id', async () => {
      const vaccines = [createMockVaccineWithRelations()];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: vaccines, error: null }),
              }),
            }),
          }),
        }),
      });

      const result = await service.list(TEST_TENANT_ID, { pet_id: TEST_PET_ID });

      expect(result.success).toBe(true);
    });

    it('should filter by status', async () => {
      const vaccines = [createMockVaccineWithRelations({ status: 'scheduled' })];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: vaccines, error: null }),
              }),
            }),
          }),
        }),
      });

      const result = await service.list(TEST_TENANT_ID, { status: 'scheduled' });

      expect(result.success).toBe(true);
    });

    it('should filter overdue vaccines client-side', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 30);
      const pastDateStr = pastDate.toISOString().split('T')[0];

      const vaccines = [
        createMockVaccineWithRelations({
          id: 'vac-overdue',
          next_due_date: pastDateStr,
          status: 'completed',
        }),
        createMockVaccineWithRelations({
          id: 'vac-not-overdue',
          next_due_date: '2030-01-01',
          status: 'completed',
        }),
      ];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: vaccines, error: null }),
            }),
          }),
        }),
      });

      const result = await service.list(TEST_TENANT_ID, { overdue_only: true });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBe(1);
        expect(result.data[0].id).toBe('vac-overdue');
      }
    });

    it('should handle database errors', async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
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
  // GET PET VACCINES
  // ===========================================================================

  describe('getPetVaccines', () => {
    it('should return vaccination history for pet', async () => {
      const pet = createMockPet();
      const vaccines = [
        createMockVaccineWithRelations({ id: 'vac-1' }),
        createMockVaccineWithRelations({ id: 'vac-2' }),
      ];

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'pets') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: pet, error: null }),
              }),
            }),
          };
        }
        if (table === 'vaccines') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({ data: vaccines, error: null }),
                }),
              }),
            }),
          };
        }
        return mockClient._queryBuilder;
      });

      const result = await service.getPetVaccines(TEST_PET_ID, TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBe(2);
      }
    });

    it('should fail when pet not found', async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' },
            }),
          }),
        }),
      });

      const result = await service.getPetVaccines('nonexistent', TEST_TENANT_ID);

      expect(result.success).toBe(false);
    });

    it('should fail when tenant mismatch', async () => {
      const pet = createMockPet({ tenant_id: 'other-tenant' });

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: pet, error: null }),
          }),
        }),
      });

      const result = await service.getPetVaccines(TEST_PET_ID, TEST_TENANT_ID);

      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // RECORD VACCINE
  // ===========================================================================

  describe('recordVaccine', () => {
    it('should record a vaccine administration', async () => {
      const pet = createMockPet();
      const vaccine = createMockVaccine();

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'pets') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: pet, error: null }),
              }),
            }),
          };
        }
        if (table === 'vaccines') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: vaccine, error: null }),
              }),
            }),
          };
        }
        return mockClient._queryBuilder;
      });

      const result = await service.recordVaccine(TEST_TENANT_ID, {
        pet_id: TEST_PET_ID,
        name: 'Rabies',
        administered_date: '2024-01-15',
        batch_number: 'BATCH-2024-001',
        next_due_date: '2025-01-15',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Rabies');
        expect(result.data.status).toBe('completed');
      }
    });

    it('should fail when required fields missing', async () => {
      const result = await service.recordVaccine(TEST_TENANT_ID, {
        pet_id: TEST_PET_ID,
        name: '',
        administered_date: '2024-01-15',
      });

      expect(result.success).toBe(false);
    });

    it('should fail when pet not found', async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' },
            }),
          }),
        }),
      });

      const result = await service.recordVaccine(TEST_TENANT_ID, {
        pet_id: 'nonexistent',
        name: 'Rabies',
        administered_date: '2024-01-15',
      });

      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // SCHEDULE VACCINE
  // ===========================================================================

  describe('scheduleVaccine', () => {
    it('should schedule an upcoming vaccine', async () => {
      const pet = createMockPet();
      const scheduledVaccine = createMockVaccine({ status: 'scheduled' });

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'pets') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: pet, error: null }),
              }),
            }),
          };
        }
        if (table === 'vaccines') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: scheduledVaccine, error: null }),
              }),
            }),
          };
        }
        return mockClient._queryBuilder;
      });

      const result = await service.scheduleVaccine(TEST_TENANT_ID, {
        pet_id: TEST_PET_ID,
        name: 'Booster Shot',
        scheduled_date: '2024-06-15',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('scheduled');
      }
    });
  });

  // ===========================================================================
  // MARK COMPLETED
  // ===========================================================================

  describe('markCompleted', () => {
    it('should mark scheduled vaccine as completed', async () => {
      const scheduledVaccine = createMockVaccineWithRelations({
        status: 'scheduled',
        pet: { id: TEST_PET_ID, name: 'Max', species: 'dog', tenant_id: TEST_TENANT_ID } as never,
      });
      const completedVaccine = createMockVaccine({ status: 'completed' });

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'vaccines') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: scheduledVaccine, error: null }),
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: completedVaccine, error: null }),
                }),
              }),
            }),
          };
        }
        return mockClient._queryBuilder;
      });

      const result = await service.markCompleted('vac-123', TEST_TENANT_ID, {
        administered_by: TEST_USER_ID,
        batch_number: 'BATCH-2024-002',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('completed');
      }
    });

    it('should fail when vaccine not scheduled', async () => {
      const completedVaccine = createMockVaccineWithRelations({
        status: 'completed',
        pet: { id: TEST_PET_ID, name: 'Max', species: 'dog', tenant_id: TEST_TENANT_ID } as never,
      });

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: completedVaccine, error: null }),
            }),
          }),
        }),
      });

      const result = await service.markCompleted('vac-123', TEST_TENANT_ID, {});

      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // TEMPLATES
  // ===========================================================================

  describe('getTemplates', () => {
    it('should return vaccine templates', async () => {
      const templates = [
        createMockTemplate({ id: 'tmpl-1', name: 'Rabies' }),
        createMockTemplate({ id: 'tmpl-2', name: 'DHPP' }),
      ];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: templates, error: null }),
              }),
            }),
          }),
        }),
      });

      const result = await service.getTemplates(TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBe(2);
      }
    });

    it('should filter by species', async () => {
      const templates = [createMockTemplate({ species: ['dog'] })];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  contains: vi.fn().mockResolvedValue({ data: templates, error: null }),
                }),
              }),
            }),
          }),
        }),
      });

      const result = await service.getTemplates(TEST_TENANT_ID, 'dog');

      expect(result.success).toBe(true);
    });
  });

  // ===========================================================================
  // REACTIONS
  // ===========================================================================

  describe('recordReaction', () => {
    it('should record a vaccine reaction', async () => {
      const pet = createMockPet();
      const reaction = createMockReaction();

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'pets') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: pet, error: null }),
              }),
            }),
          };
        }
        if (table === 'vaccine_reactions') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: reaction, error: null }),
              }),
            }),
          };
        }
        return mockClient._queryBuilder;
      });

      const result = await service.recordReaction(TEST_TENANT_ID, {
        pet_id: TEST_PET_ID,
        vaccine_name: 'Rabies',
        reaction_date: '2024-01-15',
        severity: 'low',
        symptoms: ['swelling'],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.severity).toBe('low');
      }
    });

    it('should fail when required fields missing', async () => {
      const result = await service.recordReaction(TEST_TENANT_ID, {
        pet_id: TEST_PET_ID,
        vaccine_name: '',
        reaction_date: '2024-01-15',
        severity: 'low',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('getPetReactions', () => {
    it('should return reactions for pet', async () => {
      const pet = createMockPet();
      const reactions = [
        createMockReaction({ id: 'rxn-1' }),
        createMockReaction({ id: 'rxn-2' }),
      ];

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'pets') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: pet, error: null }),
              }),
            }),
          };
        }
        if (table === 'vaccine_reactions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: reactions, error: null }),
              }),
            }),
          };
        }
        return mockClient._queryBuilder;
      });

      const result = await service.getPetReactions(TEST_PET_ID, TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBe(2);
      }
    });
  });

  // ===========================================================================
  // REMINDERS & ALERTS
  // ===========================================================================

  describe('getDueVaccines', () => {
    it('should return vaccines due within specified days', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15);

      const vaccines = [
        createMockVaccineWithRelations({
          id: 'vac-due',
          next_due_date: futureDate.toISOString().split('T')[0],
          status: 'completed',
        }),
      ];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: vaccines, error: null }),
            }),
          }),
        }),
      });

      const result = await service.getDueVaccines(TEST_TENANT_ID, 30);

      expect(result.success).toBe(true);
    });
  });

  describe('getOverdueVaccines', () => {
    it('should return overdue vaccines', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 30);

      const vaccines = [
        createMockVaccineWithRelations({
          id: 'vac-overdue',
          next_due_date: pastDate.toISOString().split('T')[0],
          status: 'completed',
        }),
      ];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: vaccines, error: null }),
            }),
          }),
        }),
      });

      const result = await service.getOverdueVaccines(TEST_TENANT_ID);

      expect(result.success).toBe(true);
    });
  });

  // ===========================================================================
  // STATISTICS
  // ===========================================================================

  describe('getStats', () => {
    it('should return vaccination statistics', async () => {
      const today = new Date().toISOString().split('T')[0];
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 30);

      const vaccines = [
        { id: 'vac-1', status: 'completed', administered_date: today, next_due_date: '2030-01-01' },
        { id: 'vac-2', status: 'scheduled', administered_date: '2024-06-01', next_due_date: null },
        {
          id: 'vac-3',
          status: 'completed',
          administered_date: '2023-01-01',
          next_due_date: pastDate.toISOString().split('T')[0],
        },
      ];

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'vaccines') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockResolvedValue({ data: vaccines, error: null }),
              }),
            }),
          };
        }
        if (table === 'vaccine_reactions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockResolvedValue({ data: [], error: null, count: 1 }),
              }),
            }),
          };
        }
        return mockClient._queryBuilder;
      });

      const result = await service.getStats(TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.total_vaccines).toBe(3);
        expect(result.data.scheduled_upcoming).toBe(1);
        expect(result.data.overdue_count).toBe(1);
      }
    });
  });

  // ===========================================================================
  // DELETE
  // ===========================================================================

  describe('delete', () => {
    it('should soft delete a vaccine', async () => {
      const vaccine = createMockVaccineWithRelations({
        pet: { id: TEST_PET_ID, name: 'Max', species: 'dog', tenant_id: TEST_TENANT_ID } as never,
      });

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'vaccines') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: vaccine, error: null }),
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        return mockClient._queryBuilder;
      });

      const result = await service.delete('vac-123', TEST_TENANT_ID, TEST_USER_ID);

      expect(result.success).toBe(true);
    });

    it('should fail when vaccine not found', async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' },
              }),
            }),
          }),
        }),
      });

      const result = await service.delete('nonexistent', TEST_TENANT_ID, TEST_USER_ID);

      expect(result.success).toBe(false);
    });
  });
});
