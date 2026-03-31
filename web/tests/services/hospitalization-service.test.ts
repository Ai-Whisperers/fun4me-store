/**
 * HospitalizationService Tests
 *
 * Tests for hospitalization management service.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  HospitalizationService,
  Kennel,
  Hospitalization,
  HospitalizationVitals,
  HospitalizationMedication,
  HospitalizationTreatment,
  HospitalizationFeeding,
  HospitalizationNote,
} from '@/lib/services/hospitalization-service';

// ============================================================================
// Mock Helper
// ============================================================================

function createChainableMock<T>(response: {
  data: T | null;
  error: { message: string; code?: string } | null;
}) {
  const mockObj: Record<string, unknown> = {};
  const chainMethods = [
    'select',
    'eq',
    'neq',
    'is',
    'in',
    'not',
    'or',
    'ilike',
    'contains',
    'order',
    'limit',
    'range',
    'gte',
    'lte',
    'gt',
    'lt',
    'update',
    'insert',
    'delete',
  ];

  chainMethods.forEach((method) => {
    mockObj[method] = vi.fn().mockImplementation(() => mockObj);
  });

  // Terminal methods
  mockObj.single = vi.fn().mockResolvedValue(response);
  mockObj.maybeSingle = vi.fn().mockResolvedValue(response);

  // Thenable for direct await
  mockObj.then = vi
    .fn()
    .mockImplementation((resolve: (value: typeof response) => void) => {
      return Promise.resolve(response).then(resolve);
    });

  return mockObj;
}

// ============================================================================
// Test Data
// ============================================================================

const mockKennel: Kennel = {
  id: 'kennel-1',
  tenant_id: 'tenant-1',
  name: 'Kennel A1',
  code: 'A1',
  location: 'Ward A',
  kennel_type: 'standard',
  max_occupancy: 1,
  current_occupancy: 0,
  max_weight_kg: 25,
  features: ['heated', 'camera'],
  daily_rate: 50,
  current_status: 'available',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockHospitalization: Hospitalization = {
  id: 'hosp-1',
  tenant_id: 'tenant-1',
  pet_id: 'pet-1',
  kennel_id: 'kennel-1',
  primary_vet_id: 'vet-1',
  admitted_by: 'staff-1',
  admission_number: 'ADM000001',
  admitted_at: '2024-01-15T10:00:00Z',
  expected_discharge: '2024-01-17T10:00:00Z',
  actual_discharge: null,
  reason: 'Post-surgical monitoring',
  diagnosis: 'Spay recovery',
  notes: 'Monitor incision site',
  discharge_instructions: null,
  acuity_level: 'normal',
  status: 'admitted',
  discharge_notes: null,
  discharged_by: null,
  follow_up_required: false,
  follow_up_date: null,
  estimated_cost: 500,
  actual_cost: null,
  invoice_id: null,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
};

const mockVitals: HospitalizationVitals = {
  id: 'vitals-1',
  hospitalization_id: 'hosp-1',
  tenant_id: 'tenant-1',
  temperature: 38.5,
  heart_rate: 100,
  respiratory_rate: 20,
  blood_pressure_systolic: 120,
  blood_pressure_diastolic: 80,
  spo2: 98,
  weight_kg: 15,
  pain_score: 2,
  mentation: 'bright',
  hydration_status: 'normal',
  notes: 'Alert and responsive',
  recorded_by: 'staff-1',
  recorded_at: '2024-01-15T12:00:00Z',
  created_at: '2024-01-15T12:00:00Z',
};

const mockMedication: HospitalizationMedication = {
  id: 'med-1',
  hospitalization_id: 'hosp-1',
  tenant_id: 'tenant-1',
  medication_name: 'Carprofen',
  dose: '2mg/kg',
  route: 'oral',
  frequency: 'q12h',
  scheduled_at: '2024-01-15T18:00:00Z',
  administered_at: null,
  skipped_reason: null,
  status: 'scheduled',
  administered_by: null,
  notes: 'With food',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
};

const mockTreatment: HospitalizationTreatment = {
  id: 'treat-1',
  hospitalization_id: 'hosp-1',
  tenant_id: 'tenant-1',
  treatment_type: 'wound_care',
  description: 'Clean and check incision site',
  scheduled_at: '2024-01-15T16:00:00Z',
  performed_at: null,
  status: 'scheduled',
  performed_by: null,
  notes: 'Check for swelling or discharge',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
};

const mockFeeding: HospitalizationFeeding = {
  id: 'feed-1',
  hospitalization_id: 'hosp-1',
  tenant_id: 'tenant-1',
  food_type: 'Recovery Diet',
  amount: '100g',
  method: 'oral',
  scheduled_at: '2024-01-15T12:00:00Z',
  fed_at: null,
  consumed_amount: null,
  appetite_score: null,
  vomited: false,
  status: 'scheduled',
  fed_by: null,
  notes: 'Small portions',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
};

const mockNote: HospitalizationNote = {
  id: 'note-1',
  hospitalization_id: 'hosp-1',
  tenant_id: 'tenant-1',
  note_type: 'progress',
  content: 'Patient resting comfortably. No signs of distress.',
  created_by: 'staff-1',
  created_at: '2024-01-15T14:00:00Z',
};

// ============================================================================
// Tests
// ============================================================================

describe('HospitalizationService', () => {
  let service: HospitalizationService;
  let mockSupabase: Partial<SupabaseClient>;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(),
      rpc: vi.fn(),
    };
    service = new HospitalizationService(mockSupabase as SupabaseClient);
  });

  // ==========================================================================
  // Kennels
  // ==========================================================================

  describe('listKennels', () => {
    it('returns kennels for tenant', async () => {
      const mockQuery = createChainableMock({ data: [mockKennel], error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.listKennels('tenant-1');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].name).toBe('Kennel A1');
      expect(mockSupabase.from).toHaveBeenCalledWith('kennels');
      expect(mockQuery.eq).toHaveBeenCalledWith('tenant_id', 'tenant-1');
    });

    it('filters by status', async () => {
      const mockQuery = createChainableMock({ data: [mockKennel], error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.listKennels('tenant-1', { status: 'available' });

      expect(result.success).toBe(true);
      expect(mockQuery.eq).toHaveBeenCalledWith('current_status', 'available');
    });

    it('filters by type', async () => {
      const mockQuery = createChainableMock({ data: [mockKennel], error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.listKennels('tenant-1', { type: 'icu' });

      expect(result.success).toBe(true);
      expect(mockQuery.eq).toHaveBeenCalledWith('kennel_type', 'icu');
    });

    it('filters by minimum weight capacity', async () => {
      const mockQuery = createChainableMock({ data: [mockKennel], error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.listKennels('tenant-1', { minWeight: 20 });

      expect(result.success).toBe(true);
      expect(mockQuery.gte).toHaveBeenCalledWith('max_weight_kg', 20);
    });
  });

  describe('getKennel', () => {
    it('returns kennel by id', async () => {
      const mockQuery = createChainableMock({ data: mockKennel, error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.getKennel('kennel-1', 'tenant-1');

      expect(result.success).toBe(true);
      expect(result.data?.code).toBe('A1');
    });
  });

  describe('createKennel', () => {
    it('creates a new kennel', async () => {
      const mockQuery = createChainableMock({ data: mockKennel, error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.createKennel('tenant-1', {
        name: 'Kennel A1',
        code: 'A1',
        location: 'Ward A',
      });

      expect(result.success).toBe(true);
      expect(mockQuery.insert).toHaveBeenCalled();
    });
  });

  describe('updateKennel', () => {
    it('updates kennel status', async () => {
      const updatedKennel = { ...mockKennel, current_status: 'maintenance' as const };
      const mockQuery = createChainableMock({ data: updatedKennel, error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.updateKennel('kennel-1', 'tenant-1', {
        current_status: 'maintenance',
      });

      expect(result.success).toBe(true);
      expect(mockQuery.update).toHaveBeenCalled();
    });
  });

  describe('getAvailableKennels', () => {
    it('returns available and active kennels', async () => {
      const mockQuery = createChainableMock({ data: [mockKennel], error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.getAvailableKennels('tenant-1');

      expect(result.success).toBe(true);
      expect(mockQuery.eq).toHaveBeenCalledWith('current_status', 'available');
      expect(mockQuery.eq).toHaveBeenCalledWith('is_active', true);
    });
  });

  // ==========================================================================
  // Hospitalizations
  // ==========================================================================

  describe('listHospitalizations', () => {
    it('returns hospitalizations for tenant', async () => {
      const mockQuery = createChainableMock({ data: [mockHospitalization], error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.listHospitalizations('tenant-1');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(mockSupabase.from).toHaveBeenCalledWith('hospitalizations');
    });

    it('filters by status', async () => {
      const mockQuery = createChainableMock({ data: [mockHospitalization], error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.listHospitalizations('tenant-1', { status: 'admitted' });

      expect(result.success).toBe(true);
      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'admitted');
    });

    it('filters by multiple statuses', async () => {
      const mockQuery = createChainableMock({ data: [mockHospitalization], error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.listHospitalizations('tenant-1', {
        status: ['admitted', 'in_treatment'],
      });

      expect(result.success).toBe(true);
      expect(mockQuery.in).toHaveBeenCalledWith('status', ['admitted', 'in_treatment']);
    });

    it('filters active only', async () => {
      const mockQuery = createChainableMock({ data: [mockHospitalization], error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.listHospitalizations('tenant-1', { activeOnly: true });

      expect(result.success).toBe(true);
      expect(mockQuery.not).toHaveBeenCalledWith(
        'status',
        'in',
        '(discharged,deceased,transferred)'
      );
    });

    it('filters by acuity level', async () => {
      const mockQuery = createChainableMock({ data: [mockHospitalization], error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.listHospitalizations('tenant-1', { acuityLevel: 'critical' });

      expect(result.success).toBe(true);
      expect(mockQuery.eq).toHaveBeenCalledWith('acuity_level', 'critical');
    });
  });

  describe('getHospitalization', () => {
    it('returns hospitalization by id', async () => {
      const mockQuery = createChainableMock({ data: mockHospitalization, error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.getHospitalization('hosp-1', 'tenant-1');

      expect(result.success).toBe(true);
      expect(result.data?.admission_number).toBe('ADM000001');
    });
  });

  describe('getActiveHospitalization', () => {
    it('returns active hospitalization for pet', async () => {
      const mockQuery = createChainableMock({ data: mockHospitalization, error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.getActiveHospitalization('pet-1', 'tenant-1');

      expect(result.success).toBe(true);
      expect(result.data?.pet_id).toBe('pet-1');
      expect(mockQuery.eq).toHaveBeenCalledWith('pet_id', 'pet-1');
      expect(mockQuery.not).toHaveBeenCalledWith(
        'status',
        'in',
        '(discharged,deceased,transferred)'
      );
    });
  });

  describe('admitPatient', () => {
    it('admits patient and generates admission number', async () => {
      (mockSupabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: 'ADM000002',
        error: null,
      });
      const mockQuery = createChainableMock({ data: mockHospitalization, error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.admitPatient('tenant-1', {
        pet_id: 'pet-1',
        kennel_id: 'kennel-1',
        reason: 'Post-surgical monitoring',
      });

      expect(result.success).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('generate_admission_number', {
        p_tenant_id: 'tenant-1',
      });
      expect(mockQuery.insert).toHaveBeenCalled();
    });
  });

  describe('updateHospitalization', () => {
    it('updates hospitalization details', async () => {
      const updated = { ...mockHospitalization, diagnosis: 'Updated diagnosis' };
      const mockQuery = createChainableMock({ data: updated, error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.updateHospitalization('hosp-1', 'tenant-1', {
        diagnosis: 'Updated diagnosis',
      });

      expect(result.success).toBe(true);
      expect(mockQuery.update).toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('updates hospitalization status', async () => {
      const updated = { ...mockHospitalization, status: 'in_treatment' as const };
      const mockQuery = createChainableMock({ data: updated, error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.updateStatus('hosp-1', 'tenant-1', 'in_treatment');

      expect(result.success).toBe(true);
      expect(mockQuery.update).toHaveBeenCalledWith({ status: 'in_treatment' });
    });
  });

  describe('dischargePatient', () => {
    it('discharges patient and sets discharge time', async () => {
      const discharged = {
        ...mockHospitalization,
        status: 'discharged' as const,
        actual_discharge: '2024-01-17T10:00:00Z',
      };
      const mockQuery = createChainableMock({ data: discharged, error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.dischargePatient('hosp-1', 'tenant-1', {
        discharge_notes: 'Recovered well',
        discharged_by: 'vet-1',
      });

      expect(result.success).toBe(true);
      expect(mockQuery.update).toHaveBeenCalled();

      // Verify that status is set to discharged
      const updateCall = mockQuery.update as ReturnType<typeof vi.fn>;
      const updateData = updateCall.mock.calls[0][0];
      expect(updateData.status).toBe('discharged');
    });
  });

  // ==========================================================================
  // Vitals
  // ==========================================================================

  describe('listVitals', () => {
    it('returns vitals for hospitalization', async () => {
      const mockQuery = createChainableMock({ data: [mockVitals], error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.listVitals('hosp-1', 'tenant-1');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(mockSupabase.from).toHaveBeenCalledWith('hospitalization_vitals');
    });
  });

  describe('recordVitals', () => {
    it('records new vitals', async () => {
      const mockQuery = createChainableMock({ data: mockVitals, error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.recordVitals('hosp-1', 'tenant-1', {
        temperature: 38.5,
        heart_rate: 100,
        recorded_by: 'staff-1',
      });

      expect(result.success).toBe(true);
      expect(mockQuery.insert).toHaveBeenCalled();
    });
  });

  describe('getLatestVitals', () => {
    it('returns most recent vitals', async () => {
      const mockQuery = createChainableMock({ data: mockVitals, error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.getLatestVitals('hosp-1', 'tenant-1');

      expect(result.success).toBe(true);
      expect(result.data?.temperature).toBe(38.5);
      expect(mockQuery.order).toHaveBeenCalledWith('recorded_at', { ascending: false });
      expect(mockQuery.limit).toHaveBeenCalledWith(1);
    });
  });

  // ==========================================================================
  // Medications
  // ==========================================================================

  describe('listMedications', () => {
    it('returns medications for hospitalization', async () => {
      const mockQuery = createChainableMock({ data: [mockMedication], error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.listMedications('hosp-1', 'tenant-1');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(mockSupabase.from).toHaveBeenCalledWith('hospitalization_medications');
    });

    it('filters by status', async () => {
      const mockQuery = createChainableMock({ data: [mockMedication], error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.listMedications('hosp-1', 'tenant-1', 'scheduled');

      expect(result.success).toBe(true);
      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'scheduled');
    });
  });

  describe('scheduleMedication', () => {
    it('schedules new medication', async () => {
      const mockQuery = createChainableMock({ data: mockMedication, error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.scheduleMedication('hosp-1', 'tenant-1', {
        medication_name: 'Carprofen',
        dose: '2mg/kg',
        route: 'oral',
      });

      expect(result.success).toBe(true);
      expect(mockQuery.insert).toHaveBeenCalled();
    });
  });

  describe('administerMedication', () => {
    it('marks medication as administered', async () => {
      const administered = { ...mockMedication, status: 'administered' as const };
      const mockQuery = createChainableMock({ data: administered, error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.administerMedication('med-1', 'tenant-1', {
        administered_by: 'staff-1',
      });

      expect(result.success).toBe(true);
      expect(mockQuery.update).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'scheduled');
    });
  });

  describe('skipMedication', () => {
    it('marks medication as skipped with reason', async () => {
      const skipped = { ...mockMedication, status: 'skipped' as const };
      const mockQuery = createChainableMock({ data: skipped, error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.skipMedication('med-1', 'tenant-1', {
        skipped_reason: 'NPO for surgery',
      });

      expect(result.success).toBe(true);
      expect(mockQuery.update).toHaveBeenCalledWith({
        status: 'skipped',
        skipped_reason: 'NPO for surgery',
      });
    });
  });

  // ==========================================================================
  // Treatments
  // ==========================================================================

  describe('listTreatments', () => {
    it('returns treatments for hospitalization', async () => {
      const mockQuery = createChainableMock({ data: [mockTreatment], error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.listTreatments('hosp-1', 'tenant-1');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(mockSupabase.from).toHaveBeenCalledWith('hospitalization_treatments');
    });
  });

  describe('scheduleTreatment', () => {
    it('schedules new treatment', async () => {
      const mockQuery = createChainableMock({ data: mockTreatment, error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.scheduleTreatment('hosp-1', 'tenant-1', {
        treatment_type: 'wound_care',
        description: 'Clean and check incision site',
      });

      expect(result.success).toBe(true);
      expect(mockQuery.insert).toHaveBeenCalled();
    });
  });

  describe('performTreatment', () => {
    it('marks treatment as performed', async () => {
      const performed = { ...mockTreatment, status: 'performed' as const };
      const mockQuery = createChainableMock({ data: performed, error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.performTreatment('treat-1', 'tenant-1', {
        performed_by: 'staff-1',
      });

      expect(result.success).toBe(true);
      expect(mockQuery.update).toHaveBeenCalled();
      expect(mockQuery.in).toHaveBeenCalledWith('status', ['scheduled', 'pending']);
    });
  });

  // ==========================================================================
  // Feedings
  // ==========================================================================

  describe('listFeedings', () => {
    it('returns feedings for hospitalization', async () => {
      const mockQuery = createChainableMock({ data: [mockFeeding], error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.listFeedings('hosp-1', 'tenant-1');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(mockSupabase.from).toHaveBeenCalledWith('hospitalization_feedings');
    });
  });

  describe('scheduleFeeding', () => {
    it('schedules new feeding', async () => {
      const mockQuery = createChainableMock({ data: mockFeeding, error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.scheduleFeeding('hosp-1', 'tenant-1', {
        food_type: 'Recovery Diet',
        amount: '100g',
      });

      expect(result.success).toBe(true);
      expect(mockQuery.insert).toHaveBeenCalled();
    });
  });

  describe('completeFeeding', () => {
    it('marks feeding as completed', async () => {
      const completed = { ...mockFeeding, status: 'completed' as const };
      const mockQuery = createChainableMock({ data: completed, error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.completeFeeding('feed-1', 'tenant-1', {
        fed_by: 'staff-1',
        consumed_amount: '80g',
        appetite_score: 4,
      });

      expect(result.success).toBe(true);
      expect(mockQuery.update).toHaveBeenCalled();
    });

    it('marks feeding as refused when appetite score is 0', async () => {
      const refused = { ...mockFeeding, status: 'refused' as const };
      const mockQuery = createChainableMock({ data: refused, error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.completeFeeding('feed-1', 'tenant-1', {
        fed_by: 'staff-1',
        consumed_amount: '0',
        appetite_score: 0,
      });

      expect(result.success).toBe(true);
      const updateCall = mockQuery.update as ReturnType<typeof vi.fn>;
      const updateData = updateCall.mock.calls[0][0];
      expect(updateData.status).toBe('refused');
    });
  });

  // ==========================================================================
  // Notes
  // ==========================================================================

  describe('listNotes', () => {
    it('returns notes for hospitalization', async () => {
      const mockQuery = createChainableMock({ data: [mockNote], error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.listNotes('hosp-1', 'tenant-1');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(mockSupabase.from).toHaveBeenCalledWith('hospitalization_notes');
    });

    it('filters by note type', async () => {
      const mockQuery = createChainableMock({ data: [mockNote], error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.listNotes('hosp-1', 'tenant-1', 'doctor');

      expect(result.success).toBe(true);
      expect(mockQuery.eq).toHaveBeenCalledWith('note_type', 'doctor');
    });
  });

  describe('addNote', () => {
    it('adds new note', async () => {
      const mockQuery = createChainableMock({ data: mockNote, error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.addNote('hosp-1', 'tenant-1', {
        content: 'Patient resting comfortably',
        created_by: 'staff-1',
      });

      expect(result.success).toBe(true);
      expect(mockQuery.insert).toHaveBeenCalled();
    });

    it('defaults to progress note type', async () => {
      const mockQuery = createChainableMock({ data: mockNote, error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      await service.addNote('hosp-1', 'tenant-1', {
        content: 'Patient resting comfortably',
      });

      const insertCall = mockQuery.insert as ReturnType<typeof vi.fn>;
      const insertData = insertCall.mock.calls[0][0];
      expect(insertData.note_type).toBe('progress');
    });
  });

  // ==========================================================================
  // Statistics
  // ==========================================================================

  describe('getStats', () => {
    it('returns hospitalization statistics', async () => {
      const mockKennelQuery = createChainableMock({
        data: [
          { current_status: 'available' },
          { current_status: 'available' },
          { current_status: 'occupied' },
        ],
        error: null,
      });
      const mockHospQuery = createChainableMock({
        data: [
          { status: 'admitted', acuity_level: 'normal', actual_discharge: null },
          { status: 'critical', acuity_level: 'critical', actual_discharge: null },
          {
            status: 'discharged',
            acuity_level: 'normal',
            actual_discharge: new Date().toISOString(),
          },
        ],
        error: null,
      });

      (mockSupabase.from as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(mockKennelQuery)
        .mockReturnValueOnce(mockHospQuery);

      const result = await service.getStats('tenant-1');

      expect(result.success).toBe(true);
      expect(result.data?.totalKennels).toBe(3);
      expect(result.data?.availableKennels).toBe(2);
      expect(result.data?.occupiedKennels).toBe(1);
      expect(result.data?.activeHospitalizations).toBe(2);
      expect(result.data?.criticalPatients).toBe(1);
      expect(result.data?.dischargedToday).toBe(1);
    });
  });
});
