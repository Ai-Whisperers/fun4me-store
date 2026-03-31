/**
 * MedicalRecordService Tests
 *
 * Tests medical data management:
 * - Medical records CRUD
 * - Vaccines CRUD and verification
 * - Prescriptions CRUD
 * - Tenant isolation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MedicalRecordService } from '@/lib/services/medical-record-service';
import { createMockSupabaseClient, type MockSupabaseClient } from './__mocks__/supabase-mock';

// Mock the logger
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

// =============================================================================
// TEST DATA FACTORIES
// =============================================================================

const TEST_TENANT_ID = 'tenant-vet-clinic';
const TEST_VET_ID = 'vet-doc-123';
const TEST_PET_ID = 'pet-dog-456';

function createMockMedicalRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rec-123',
    pet_id: TEST_PET_ID,
    tenant_id: TEST_TENANT_ID,
    vet_id: TEST_VET_ID,
    record_type: 'consultation',
    visit_date: new Date().toISOString(),
    chief_complaint: 'Vomiting and lethargy',
    history: 'No previous issues',
    physical_exam: 'Normal vital signs',
    weight_kg: 25.5,
    temperature_celsius: 38.5,
    heart_rate_bpm: 80,
    respiratory_rate_rpm: 20,
    diagnosis_code: 'GI-001',
    diagnosis_text: 'Gastroenteritis',
    assessment: 'Mild gastroenteritis',
    treatment_plan: 'Supportive care, bland diet',
    is_emergency: false,
    requires_followup: true,
    deleted_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function createMockMedicalRecordWithRelations(overrides: Record<string, unknown> = {}) {
  return {
    ...createMockMedicalRecord(overrides),
    pet: {
      id: TEST_PET_ID,
      name: 'Max',
      species: 'dog',
      breed: 'Labrador',
    },
    vet: {
      id: TEST_VET_ID,
      full_name: 'Dr. García',
    },
  };
}

function createMockVaccine(overrides: Record<string, unknown> = {}) {
  return {
    id: 'vac-123',
    pet_id: TEST_PET_ID,
    name: 'Rabies',
    administered_date: '2024-01-15',
    next_due_date: '2025-01-15',
    batch_number: 'BATCH-2024-001',
    administered_by: TEST_VET_ID,
    verified_by: null,
    status: 'pending',
    notes: null,
    certificate_url: null,
    photos: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function createMockVaccineWithRelations(overrides: Record<string, unknown> = {}) {
  return {
    ...createMockVaccine(overrides),
    pet: {
      id: TEST_PET_ID,
      name: 'Max',
      species: 'dog',
      breed: 'Labrador',
      tenant_id: TEST_TENANT_ID,
    },
    administered_by_profile: {
      id: TEST_VET_ID,
      full_name: 'Dr. García',
    },
    verified_by_profile: null,
    reactions: [],
  };
}

function createMockPrescription(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rx-123',
    pet_id: TEST_PET_ID,
    tenant_id: TEST_TENANT_ID,
    vet_id: TEST_VET_ID,
    medications: [
      {
        name: 'Amoxicillin',
        dose: '250mg',
        frequency: 'Twice daily',
        duration: '7 days',
        instructions: 'With food',
      },
    ],
    diagnosis: 'Bacterial infection',
    notes: null,
    valid_until: '2024-04-15',
    signature_url: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function createMockPrescriptionWithRelations(overrides: Record<string, unknown> = {}) {
  return {
    ...createMockPrescription(overrides),
    pet: {
      id: TEST_PET_ID,
      name: 'Max',
      species: 'dog',
      breed: 'Labrador',
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

describe('MedicalRecordService', () => {
  let mockClient: MockSupabaseClient;
  let service: MedicalRecordService;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    service = new MedicalRecordService(mockClient as never);
    vi.clearAllMocks();
  });

  // ===========================================================================
  // MEDICAL RECORDS - LIST
  // ===========================================================================

  describe('listMedicalRecords', () => {
    it('should return medical records for tenant', async () => {
      const records = [
        createMockMedicalRecordWithRelations({ id: 'rec-1' }),
        createMockMedicalRecordWithRelations({ id: 'rec-2' }),
      ];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: records, error: null }),
            }),
          }),
        }),
      });

      const result = await service.listMedicalRecords(TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBe(2);
      }
    });

    it('should filter by pet_id', async () => {
      const records = [createMockMedicalRecordWithRelations()];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: records, error: null }),
              }),
            }),
          }),
        }),
      });

      const result = await service.listMedicalRecords(TEST_TENANT_ID, { pet_id: TEST_PET_ID });

      expect(result.success).toBe(true);
    });

    it('should filter by record_type', async () => {
      const records = [createMockMedicalRecordWithRelations({ record_type: 'surgery' })];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: records, error: null }),
              }),
            }),
          }),
        }),
      });

      const result = await service.listMedicalRecords(TEST_TENANT_ID, { record_type: 'surgery' });

      expect(result.success).toBe(true);
    });

    it('should filter by is_emergency', async () => {
      const records = [createMockMedicalRecordWithRelations({ is_emergency: true })];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: records, error: null }),
              }),
            }),
          }),
        }),
      });

      const result = await service.listMedicalRecords(TEST_TENANT_ID, { is_emergency: true });

      expect(result.success).toBe(true);
    });

    it('should filter by date range', async () => {
      const records = [createMockMedicalRecordWithRelations()];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  lte: vi.fn().mockResolvedValue({ data: records, error: null }),
                }),
              }),
            }),
          }),
        }),
      });

      const result = await service.listMedicalRecords(TEST_TENANT_ID, {
        from_date: '2024-01-01',
        to_date: '2024-12-31',
      });

      expect(result.success).toBe(true);
    });
  });

  // ===========================================================================
  // MEDICAL RECORDS - GET BY ID
  // ===========================================================================

  describe('getMedicalRecordById', () => {
    it('should return medical record by ID', async () => {
      const record = createMockMedicalRecordWithRelations();

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: record, error: null }),
              }),
            }),
          }),
        }),
      });

      const result = await service.getMedicalRecordById('rec-123', TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('rec-123');
      }
    });

    it('should fail when record not found', async () => {
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

      const result = await service.getMedicalRecordById('nonexistent', TEST_TENANT_ID);

      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // MEDICAL RECORDS - CREATE
  // ===========================================================================

  describe('createMedicalRecord', () => {
    it('should create medical record', async () => {
      const pet = { id: TEST_PET_ID, tenant_id: TEST_TENANT_ID };
      const newRecord = createMockMedicalRecordWithRelations();

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
        if (table === 'diagnosis_codes') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { code: 'GI-001' }, error: null }),
              }),
            }),
          };
        }
        if (table === 'medical_records') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: newRecord, error: null }),
              }),
            }),
          };
        }
        return mockClient._queryBuilder;
      });

      const result = await service.createMedicalRecord(TEST_TENANT_ID, TEST_VET_ID, {
        pet_id: TEST_PET_ID,
        record_type: 'consultation',
        chief_complaint: 'Vomiting',
        diagnosis_code: 'GI-001',
      });

      expect(result.success).toBe(true);
    });

    it('should fail when pet not in tenant', async () => {
      const pet = { id: TEST_PET_ID, tenant_id: 'other-tenant' };

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: pet, error: null }),
          }),
        }),
      });

      const result = await service.createMedicalRecord(TEST_TENANT_ID, TEST_VET_ID, {
        pet_id: TEST_PET_ID,
        record_type: 'consultation',
      });

      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // MEDICAL RECORDS - UPDATE
  // ===========================================================================

  describe('updateMedicalRecord', () => {
    it('should update medical record', async () => {
      const updated = createMockMedicalRecordWithRelations({ notes: 'Updated' });

      mockClient.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: updated, error: null }),
                }),
              }),
            }),
          }),
        }),
      });

      const result = await service.updateMedicalRecord('rec-123', TEST_TENANT_ID, {
        notes: 'Updated',
      });

      expect(result.success).toBe(true);
    });
  });

  // ===========================================================================
  // MEDICAL RECORDS - DELETE
  // ===========================================================================

  describe('deleteMedicalRecord', () => {
    it('should soft delete medical record', async () => {
      mockClient.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        }),
      });

      const result = await service.deleteMedicalRecord('rec-123', TEST_TENANT_ID, TEST_VET_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(true);
      }
    });
  });

  // ===========================================================================
  // VACCINES - LIST
  // ===========================================================================

  describe('listVaccines', () => {
    it('should return vaccines for tenant', async () => {
      const vaccines = [
        createMockVaccineWithRelations({ id: 'vac-1' }),
        createMockVaccineWithRelations({ id: 'vac-2' }),
      ];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: vaccines, error: null }),
          }),
        }),
      });

      const result = await service.listVaccines(TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBe(2);
      }
    });

    it('should filter by status', async () => {
      const vaccines = [createMockVaccineWithRelations({ status: 'verified' })];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: vaccines, error: null }),
            }),
          }),
        }),
      });

      const result = await service.listVaccines(TEST_TENANT_ID, { status: 'verified' });

      expect(result.success).toBe(true);
    });

    it('should filter upcoming vaccines', async () => {
      const vaccines = [createMockVaccineWithRelations()];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockResolvedValue({ data: vaccines, error: null }),
              }),
            }),
          }),
        }),
      });

      const result = await service.listVaccines(TEST_TENANT_ID, { upcoming: true });

      expect(result.success).toBe(true);
    });

    it('should filter overdue vaccines', async () => {
      const vaccines = [createMockVaccineWithRelations({ next_due_date: '2024-01-01' })];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              lt: vi.fn().mockResolvedValue({ data: vaccines, error: null }),
            }),
          }),
        }),
      });

      const result = await service.listVaccines(TEST_TENANT_ID, { overdue: true });

      expect(result.success).toBe(true);
    });
  });

  // ===========================================================================
  // VACCINES - CREATE
  // ===========================================================================

  describe('createVaccine', () => {
    it('should create vaccine record', async () => {
      const pet = { id: TEST_PET_ID, tenant_id: TEST_TENANT_ID };
      const newVaccine = createMockVaccineWithRelations();

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
                single: vi.fn().mockResolvedValue({ data: newVaccine, error: null }),
              }),
            }),
          };
        }
        return mockClient._queryBuilder;
      });

      const result = await service.createVaccine(TEST_TENANT_ID, TEST_VET_ID, {
        pet_id: TEST_PET_ID,
        name: 'Rabies',
        administered_date: '2024-01-15',
        next_due_date: '2025-01-15',
      });

      expect(result.success).toBe(true);
    });

    it('should fail when pet not in tenant', async () => {
      const pet = { id: TEST_PET_ID, tenant_id: 'other-tenant' };

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: pet, error: null }),
          }),
        }),
      });

      const result = await service.createVaccine(TEST_TENANT_ID, TEST_VET_ID, {
        pet_id: TEST_PET_ID,
        name: 'Rabies',
        administered_date: '2024-01-15',
      });

      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // VACCINES - VERIFY
  // ===========================================================================

  describe('verifyVaccine', () => {
    it('should verify vaccine', async () => {
      const vaccine = { id: 'vac-123', pet: { tenant_id: TEST_TENANT_ID } };
      const verifiedVaccine = createMockVaccineWithRelations({
        status: 'verified',
        verified_by: TEST_VET_ID,
      });

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'vaccines') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: vaccine, error: null }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: verifiedVaccine, error: null }),
                }),
              }),
            }),
          };
        }
        return mockClient._queryBuilder;
      });

      const result = await service.verifyVaccine('vac-123', TEST_TENANT_ID, TEST_VET_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('verified');
      }
    });

    it('should fail when vaccine not in tenant', async () => {
      const vaccine = { id: 'vac-123', pet: { tenant_id: 'other-tenant' } };

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: vaccine, error: null }),
          }),
        }),
      });

      const result = await service.verifyVaccine('vac-123', TEST_TENANT_ID, TEST_VET_ID);

      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // VACCINES - DELETE
  // ===========================================================================

  describe('deleteVaccine', () => {
    it('should delete vaccine', async () => {
      const vaccine = { id: 'vac-123', pet: { tenant_id: TEST_TENANT_ID } };

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: vaccine, error: null }),
          }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      const result = await service.deleteVaccine('vac-123', TEST_TENANT_ID);

      expect(result.success).toBe(true);
    });
  });

  // ===========================================================================
  // PRESCRIPTIONS - LIST
  // ===========================================================================

  describe('listPrescriptions', () => {
    it('should return prescriptions for tenant', async () => {
      const prescriptions = [
        createMockPrescriptionWithRelations({ id: 'rx-1' }),
        createMockPrescriptionWithRelations({ id: 'rx-2' }),
      ];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: prescriptions, error: null }),
          }),
        }),
      });

      const result = await service.listPrescriptions(TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBe(2);
      }
    });

    it('should filter by pet_id', async () => {
      const prescriptions = [createMockPrescriptionWithRelations()];

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: prescriptions, error: null }),
            }),
          }),
        }),
      });

      const result = await service.listPrescriptions(TEST_TENANT_ID, TEST_PET_ID);

      expect(result.success).toBe(true);
    });
  });

  // ===========================================================================
  // PRESCRIPTIONS - GET BY ID
  // ===========================================================================

  describe('getPrescriptionById', () => {
    it('should return prescription by ID', async () => {
      const prescription = createMockPrescriptionWithRelations();

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: prescription, error: null }),
            }),
          }),
        }),
      });

      const result = await service.getPrescriptionById('rx-123', TEST_TENANT_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('rx-123');
        expect(result.data.medications.length).toBe(1);
      }
    });
  });

  // ===========================================================================
  // PRESCRIPTIONS - CREATE
  // ===========================================================================

  describe('createPrescription', () => {
    it('should create prescription', async () => {
      const pet = { id: TEST_PET_ID, tenant_id: TEST_TENANT_ID };
      const newPrescription = createMockPrescriptionWithRelations();

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
        if (table === 'prescriptions') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: newPrescription, error: null }),
              }),
            }),
          };
        }
        return mockClient._queryBuilder;
      });

      const result = await service.createPrescription(TEST_TENANT_ID, TEST_VET_ID, {
        pet_id: TEST_PET_ID,
        medications: [
          {
            name: 'Amoxicillin',
            dose: '250mg',
            frequency: 'Twice daily',
            duration: '7 days',
          },
        ],
        valid_until: '2024-04-15',
      });

      expect(result.success).toBe(true);
    });

    it('should fail when pet not in tenant', async () => {
      const pet = { id: TEST_PET_ID, tenant_id: 'other-tenant' };

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: pet, error: null }),
          }),
        }),
      });

      const result = await service.createPrescription(TEST_TENANT_ID, TEST_VET_ID, {
        pet_id: TEST_PET_ID,
        medications: [],
        valid_until: '2024-04-15',
      });

      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // PRESCRIPTIONS - DELETE
  // ===========================================================================

  describe('deletePrescription', () => {
    it('should delete prescription', async () => {
      mockClient.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      });

      const result = await service.deletePrescription('rx-123', TEST_TENANT_ID);

      expect(result.success).toBe(true);
    });
  });

  // ===========================================================================
  // RECORD TYPES
  // ===========================================================================

  describe('Record Types', () => {
    const recordTypes = [
      'consultation',
      'exam',
      'surgery',
      'hospitalization',
      'wellness',
      'emergency',
      'follow_up',
      'vaccination',
      'lab_result',
      'imaging',
    ] as const;

    recordTypes.forEach((recordType) => {
      it(`should handle ${recordType} record type`, async () => {
        const pet = { id: TEST_PET_ID, tenant_id: TEST_TENANT_ID };
        const record = createMockMedicalRecordWithRelations({ record_type: recordType });

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
          if (table === 'medical_records') {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: record, error: null }),
                }),
              }),
            };
          }
          return mockClient._queryBuilder;
        });

        const result = await service.createMedicalRecord(TEST_TENANT_ID, TEST_VET_ID, {
          pet_id: TEST_PET_ID,
          record_type: recordType,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.record_type).toBe(recordType);
        }
      });
    });
  });
});
