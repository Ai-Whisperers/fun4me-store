/**
 * ClinicalToolsService Tests
 *
 * Tests for clinical reference data and assessments service.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  ClinicalToolsService,
  DiagnosisCode,
  DrugDosage,
  GrowthStandard,
  VaccineProtocol,
  ReproductiveCycle,
  EuthanasiaAssessment,
} from '@/lib/services/clinical-tools-service';

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

const mockDiagnosisCode: DiagnosisCode = {
  id: 'diag-1',
  code: 'D001',
  term: 'Canine Parvovirus',
  standard: 'venom',
  category: 'infectious',
  description: 'Highly contagious viral illness',
  species: ['dog'],
  severity: 'severe',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockDrugDosage: DrugDosage = {
  id: 'drug-1',
  name: 'Amoxicillin',
  generic_name: 'Amoxicillin trihydrate',
  species: 'dog',
  category: 'antibiotic',
  min_dose_mg_kg: 10,
  max_dose_mg_kg: 20,
  concentration_mg_ml: 50,
  route: 'oral',
  frequency: 'q12h',
  max_daily_dose_mg_kg: 40,
  contraindications: ['penicillin allergy'],
  side_effects: ['diarrhea', 'vomiting'],
  notes: 'Give with food',
  requires_prescription: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockGrowthStandard: GrowthStandard = {
  id: 'growth-1',
  species: 'dog',
  breed: 'Labrador',
  breed_category: 'large',
  gender: 'male',
  age_weeks: 12,
  weight_kg: 10.5,
  percentile: 'P50',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockVaccineProtocol: VaccineProtocol = {
  id: 'vax-1',
  vaccine_name: 'DHPP',
  vaccine_code: 'DHPP-001',
  species: 'dog',
  protocol_type: 'core',
  diseases_prevented: ['Distemper', 'Hepatitis', 'Parvovirus', 'Parainfluenza'],
  first_dose_weeks: 6,
  booster_weeks: [10, 14],
  booster_intervals_months: [12],
  revaccination_months: 36,
  duration_years: 3,
  manufacturer: 'Zoetis',
  notes: 'Core vaccine for all dogs',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockReproductiveCycle: ReproductiveCycle = {
  id: 'cycle-1',
  pet_id: 'pet-1',
  tenant_id: 'tenant-1',
  cycle_type: 'heat',
  cycle_start: '2024-01-15T00:00:00Z',
  cycle_end: null,
  mating_date: null,
  expected_due_date: null,
  actual_birth_date: null,
  litter_size: null,
  notes: 'First heat cycle',
  recorded_by: 'user-1',
  created_at: '2024-01-15T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
};

const mockAssessment: EuthanasiaAssessment = {
  id: 'assess-1',
  pet_id: 'pet-1',
  tenant_id: 'tenant-1',
  hurt_score: 7,
  hunger_score: 6,
  hydration_score: 8,
  hygiene_score: 7,
  happiness_score: 5,
  mobility_score: 4,
  more_good_days_score: 5,
  total_score: 42,
  notes: 'Mobility declining',
  recommendations: 'Consider pain management',
  assessed_by: 'vet-1',
  assessed_at: '2024-01-20T10:00:00Z',
  created_at: '2024-01-20T10:00:00Z',
  updated_at: '2024-01-20T10:00:00Z',
};

// ============================================================================
// Tests
// ============================================================================

describe('ClinicalToolsService', () => {
  let service: ClinicalToolsService;
  let mockSupabase: Partial<SupabaseClient>;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(),
      rpc: vi.fn(),
    };
    service = new ClinicalToolsService(mockSupabase as SupabaseClient);
  });

  // ==========================================================================
  // Diagnosis Codes
  // ==========================================================================

  describe('searchDiagnosisCodes', () => {
    it('returns diagnosis codes matching search term', async () => {
      const mockQuery = createChainableMock({ data: [mockDiagnosisCode], error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.searchDiagnosisCodes({ search: 'parvo' });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].term).toBe('Canine Parvovirus');
      expect(mockSupabase.from).toHaveBeenCalledWith('diagnosis_codes');
      expect(mockQuery.or).toHaveBeenCalledWith('code.ilike.%parvo%,term.ilike.%parvo%');
    });

    it('filters by standard', async () => {
      const mockQuery = createChainableMock({ data: [mockDiagnosisCode], error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.searchDiagnosisCodes({ standard: 'venom' });

      expect(result.success).toBe(true);
      expect(mockQuery.eq).toHaveBeenCalledWith('standard', 'venom');
    });

    it('filters by category', async () => {
      const mockQuery = createChainableMock({ data: [mockDiagnosisCode], error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.searchDiagnosisCodes({ category: 'infectious' });

      expect(result.success).toBe(true);
      expect(mockQuery.eq).toHaveBeenCalledWith('category', 'infectious');
    });

    it('filters by species', async () => {
      const mockQuery = createChainableMock({ data: [mockDiagnosisCode], error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.searchDiagnosisCodes({ species: 'dog' });

      expect(result.success).toBe(true);
      expect(mockQuery.contains).toHaveBeenCalledWith('species', ['dog']);
    });

    it('handles database errors', async () => {
      const mockQuery = createChainableMock({
        data: null,
        error: { message: 'Database error' },
      });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.searchDiagnosisCodes();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('getDiagnosisCodeByCode', () => {
    it('returns diagnosis code by code', async () => {
      const mockQuery = createChainableMock({ data: mockDiagnosisCode, error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.getDiagnosisCodeByCode('D001');

      expect(result.success).toBe(true);
      expect(result.data?.code).toBe('D001');
      expect(mockQuery.eq).toHaveBeenCalledWith('code', 'D001');
    });

    it('returns null for non-existent code', async () => {
      const mockQuery = createChainableMock({ data: null, error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.getDiagnosisCodeByCode('NONEXISTENT');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  // ==========================================================================
  // Drug Dosages
  // ==========================================================================

  describe('searchDrugs', () => {
    it('returns drugs matching search term', async () => {
      const mockQuery = createChainableMock({ data: [mockDrugDosage], error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.searchDrugs({ search: 'amox' });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].name).toBe('Amoxicillin');
      expect(mockQuery.or).toHaveBeenCalledWith(
        'name.ilike.%amox%,generic_name.ilike.%amox%'
      );
    });

    it('filters by species', async () => {
      const mockQuery = createChainableMock({ data: [mockDrugDosage], error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.searchDrugs({ species: 'dog' });

      expect(result.success).toBe(true);
      expect(mockQuery.or).toHaveBeenCalledWith('species.eq.dog,species.eq.all');
    });

    it('filters by category', async () => {
      const mockQuery = createChainableMock({ data: [mockDrugDosage], error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.searchDrugs({ category: 'antibiotic' });

      expect(result.success).toBe(true);
      expect(mockQuery.eq).toHaveBeenCalledWith('category', 'antibiotic');
    });

    it('filters by prescription requirement', async () => {
      const mockQuery = createChainableMock({ data: [mockDrugDosage], error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.searchDrugs({ requiresPrescription: true });

      expect(result.success).toBe(true);
      expect(mockQuery.eq).toHaveBeenCalledWith('requires_prescription', true);
    });
  });

  describe('getDrugByName', () => {
    it('returns drug by name', async () => {
      const mockQuery = createChainableMock({ data: [mockDrugDosage], error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.getDrugByName('Amoxicillin');

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Amoxicillin');
      expect(mockQuery.ilike).toHaveBeenCalledWith('name', 'Amoxicillin');
    });

    it('filters by species when provided', async () => {
      const mockQuery = createChainableMock({ data: [mockDrugDosage], error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.getDrugByName('Amoxicillin', 'dog');

      expect(result.success).toBe(true);
      expect(mockQuery.or).toHaveBeenCalledWith('species.eq.dog,species.eq.all');
    });
  });

  describe('calculateDose', () => {
    it('calculates dose in mg based on weight', () => {
      const result = service.calculateDose(mockDrugDosage, 10); // 10kg dog

      expect(result.drug_name).toBe('Amoxicillin');
      expect(result.min_dose_mg).toBe(100); // 10 mg/kg * 10 kg
      expect(result.max_dose_mg).toBe(200); // 20 mg/kg * 10 kg
    });

    it('calculates dose in mL when concentration is available', () => {
      const result = service.calculateDose(mockDrugDosage, 10);

      // 100mg / 50mg/mL = 2mL
      expect(result.min_ml).toBe(2);
      // 200mg / 50mg/mL = 4mL
      expect(result.max_ml).toBe(4);
    });

    it('returns null for mL when no concentration', () => {
      const drugWithoutConcentration = { ...mockDrugDosage, concentration_mg_ml: null };
      const result = service.calculateDose(drugWithoutConcentration, 10);

      expect(result.min_ml).toBeNull();
      expect(result.max_ml).toBeNull();
    });

    it('handles null dose values', () => {
      const drugWithoutDose = {
        ...mockDrugDosage,
        min_dose_mg_kg: null,
        max_dose_mg_kg: null,
      };
      const result = service.calculateDose(drugWithoutDose, 10);

      expect(result.min_dose_mg).toBeNull();
      expect(result.max_dose_mg).toBeNull();
    });

    it('includes route and frequency in result', () => {
      const result = service.calculateDose(mockDrugDosage, 10);

      expect(result.route).toBe('oral');
      expect(result.frequency).toBe('q12h');
      expect(result.notes).toBe('Give with food');
    });
  });

  describe('calculateDoseFromDb', () => {
    it('calls database function for dose calculation', async () => {
      const mockResult = {
        drug_name: 'Amoxicillin',
        min_dose_mg: 100,
        max_dose_mg: 200,
        min_ml: 2,
        max_ml: 4,
        route: 'oral',
        frequency: 'q12h',
        notes: 'Give with food',
      };
      (mockSupabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [mockResult],
        error: null,
      });

      const result = await service.calculateDoseFromDb('Amoxicillin', 'dog', 10);

      expect(result.success).toBe(true);
      expect(result.data?.min_dose_mg).toBe(100);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('calculate_drug_dose', {
        p_drug_name: 'Amoxicillin',
        p_species: 'dog',
        p_weight_kg: 10,
      });
    });
  });

  // ==========================================================================
  // Growth Standards
  // ==========================================================================

  describe('getGrowthStandards', () => {
    it('returns growth standards for species', async () => {
      const mockQuery = createChainableMock({ data: [mockGrowthStandard], error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.getGrowthStandards({ species: 'dog' });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(mockSupabase.from).toHaveBeenCalledWith('growth_standards');
      expect(mockQuery.eq).toHaveBeenCalledWith('species', 'dog');
    });

    it('filters by breed', async () => {
      const mockQuery = createChainableMock({ data: [mockGrowthStandard], error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.getGrowthStandards({ species: 'dog', breed: 'Labrador' });

      expect(result.success).toBe(true);
      expect(mockQuery.ilike).toHaveBeenCalledWith('breed', 'Labrador');
    });

    it('filters by gender', async () => {
      const mockQuery = createChainableMock({ data: [mockGrowthStandard], error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.getGrowthStandards({ species: 'dog', gender: 'male' });

      expect(result.success).toBe(true);
      expect(mockQuery.eq).toHaveBeenCalledWith('gender', 'male');
    });

    it('filters by age', async () => {
      const mockQuery = createChainableMock({ data: [mockGrowthStandard], error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.getGrowthStandards({ species: 'dog', ageWeeks: 12 });

      expect(result.success).toBe(true);
      expect(mockQuery.eq).toHaveBeenCalledWith('age_weeks', 12);
    });
  });

  describe('calculateGrowthPercentile', () => {
    it('returns percentile comparison for weight', async () => {
      const mockStandards = [
        { percentile: 'P25', weight_kg: 8 },
        { percentile: 'P50', weight_kg: 10.5 },
        { percentile: 'P75', weight_kg: 13 },
      ];
      const mockQuery = createChainableMock({ data: mockStandards, error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.calculateGrowthPercentile(
        'dog',
        'Labrador',
        'male',
        12,
        9.5
      );

      expect(result.success).toBe(true);
      expect(result.data?.percentile).toBe('25th-50th');
      expect(result.data?.status).toBe('normal');
      expect(result.data?.expectedP50).toBe(10.5);
    });

    it('identifies underweight pets', async () => {
      const mockStandards = [
        { percentile: 'P25', weight_kg: 8 },
        { percentile: 'P50', weight_kg: 10.5 },
        { percentile: 'P75', weight_kg: 13 },
      ];
      const mockQuery = createChainableMock({ data: mockStandards, error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.calculateGrowthPercentile(
        'dog',
        'Labrador',
        'male',
        12,
        6 // Below P25
      );

      expect(result.success).toBe(true);
      expect(result.data?.percentile).toBe('Below 25th');
      expect(result.data?.status).toBe('underweight');
    });

    it('identifies overweight pets', async () => {
      const mockStandards = [
        { percentile: 'P25', weight_kg: 8 },
        { percentile: 'P50', weight_kg: 10.5 },
        { percentile: 'P75', weight_kg: 13 },
      ];
      const mockQuery = createChainableMock({ data: mockStandards, error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.calculateGrowthPercentile(
        'dog',
        'Labrador',
        'male',
        12,
        15 // Above P75
      );

      expect(result.success).toBe(true);
      expect(result.data?.percentile).toBe('Above 75th');
      expect(result.data?.status).toBe('overweight');
    });

    it('returns no_data when standards not available', async () => {
      const mockQuery = createChainableMock({ data: [], error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.calculateGrowthPercentile(
        'dog',
        'Unknown Breed',
        'male',
        12,
        10
      );

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('no_data');
      expect(result.data?.percentile).toBe('No data');
    });
  });

  // ==========================================================================
  // Vaccine Protocols
  // ==========================================================================

  describe('getVaccineProtocols', () => {
    it('returns vaccine protocols', async () => {
      const mockQuery = createChainableMock({ data: [mockVaccineProtocol], error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.getVaccineProtocols();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].vaccine_name).toBe('DHPP');
    });

    it('filters by species', async () => {
      const mockQuery = createChainableMock({ data: [mockVaccineProtocol], error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.getVaccineProtocols({ species: 'dog' });

      expect(result.success).toBe(true);
      expect(mockQuery.or).toHaveBeenCalledWith('species.eq.dog,species.eq.all');
    });

    it('filters by protocol type', async () => {
      const mockQuery = createChainableMock({ data: [mockVaccineProtocol], error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.getVaccineProtocols({ protocolType: 'core' });

      expect(result.success).toBe(true);
      expect(mockQuery.eq).toHaveBeenCalledWith('protocol_type', 'core');
    });

    it('filters by search term', async () => {
      const mockQuery = createChainableMock({ data: [mockVaccineProtocol], error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.getVaccineProtocols({ search: 'DHPP' });

      expect(result.success).toBe(true);
      expect(mockQuery.or).toHaveBeenCalledWith(
        'vaccine_name.ilike.%DHPP%,vaccine_code.ilike.%DHPP%'
      );
    });
  });

  describe('getVaccineProtocolByCode', () => {
    it('returns protocol by code', async () => {
      const mockQuery = createChainableMock({ data: mockVaccineProtocol, error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.getVaccineProtocolByCode('DHPP-001');

      expect(result.success).toBe(true);
      expect(result.data?.vaccine_code).toBe('DHPP-001');
    });
  });

  // ==========================================================================
  // Reproductive Cycles
  // ==========================================================================

  describe('listReproductiveCycles', () => {
    it('returns cycles for tenant', async () => {
      const mockQuery = createChainableMock({ data: [mockReproductiveCycle], error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.listReproductiveCycles('tenant-1');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(mockSupabase.from).toHaveBeenCalledWith('reproductive_cycles');
      expect(mockQuery.eq).toHaveBeenCalledWith('tenant_id', 'tenant-1');
    });

    it('filters by pet when provided', async () => {
      const mockQuery = createChainableMock({ data: [mockReproductiveCycle], error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.listReproductiveCycles('tenant-1', 'pet-1');

      expect(result.success).toBe(true);
      expect(mockQuery.eq).toHaveBeenCalledWith('pet_id', 'pet-1');
    });
  });

  describe('createReproductiveCycle', () => {
    it('creates a new cycle', async () => {
      const mockQuery = createChainableMock({ data: mockReproductiveCycle, error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.createReproductiveCycle('tenant-1', {
        pet_id: 'pet-1',
        cycle_type: 'heat',
        cycle_start: '2024-01-15T00:00:00Z',
        notes: 'First heat cycle',
      });

      expect(result.success).toBe(true);
      expect(result.data?.cycle_type).toBe('heat');
      expect(mockQuery.insert).toHaveBeenCalled();
    });
  });

  describe('updateReproductiveCycle', () => {
    it('updates cycle end date', async () => {
      const updatedCycle = { ...mockReproductiveCycle, cycle_end: '2024-02-01T00:00:00Z' };
      const mockQuery = createChainableMock({ data: updatedCycle, error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.updateReproductiveCycle('cycle-1', 'tenant-1', {
        cycle_end: '2024-02-01T00:00:00Z',
      });

      expect(result.success).toBe(true);
      expect(mockQuery.update).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'cycle-1');
      expect(mockQuery.eq).toHaveBeenCalledWith('tenant_id', 'tenant-1');
    });
  });

  describe('getCurrentCycle', () => {
    it('returns current active cycle', async () => {
      const mockQuery = createChainableMock({ data: mockReproductiveCycle, error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.getCurrentCycle('pet-1', 'tenant-1');

      expect(result.success).toBe(true);
      expect(result.data?.cycle_end).toBeNull();
      expect(mockQuery.is).toHaveBeenCalledWith('cycle_end', null);
    });

    it('returns null when no active cycle', async () => {
      const mockQuery = createChainableMock({ data: null, error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.getCurrentCycle('pet-1', 'tenant-1');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  // ==========================================================================
  // Euthanasia Assessments
  // ==========================================================================

  describe('listAssessments', () => {
    it('returns assessments for tenant', async () => {
      const mockQuery = createChainableMock({ data: [mockAssessment], error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.listAssessments('tenant-1');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(mockSupabase.from).toHaveBeenCalledWith('euthanasia_assessments');
    });

    it('filters by pet when provided', async () => {
      const mockQuery = createChainableMock({ data: [mockAssessment], error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.listAssessments('tenant-1', 'pet-1');

      expect(result.success).toBe(true);
      expect(mockQuery.eq).toHaveBeenCalledWith('pet_id', 'pet-1');
    });
  });

  describe('createAssessment', () => {
    it('creates assessment with calculated total', async () => {
      const mockQuery = createChainableMock({ data: mockAssessment, error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.createAssessment('tenant-1', {
        pet_id: 'pet-1',
        hurt_score: 7,
        hunger_score: 6,
        hydration_score: 8,
        hygiene_score: 7,
        happiness_score: 5,
        mobility_score: 4,
        more_good_days_score: 5,
        notes: 'Mobility declining',
      });

      expect(result.success).toBe(true);
      expect(mockQuery.insert).toHaveBeenCalled();

      // Verify total score calculation (7+6+8+7+5+4+5 = 42)
      const insertCall = mockQuery.insert as ReturnType<typeof vi.fn>;
      const insertedData = insertCall.mock.calls[0][0];
      expect(insertedData.total_score).toBe(42);
    });
  });

  describe('getLatestAssessment', () => {
    it('returns most recent assessment', async () => {
      const mockQuery = createChainableMock({ data: mockAssessment, error: null });
      (mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery);

      const result = await service.getLatestAssessment('pet-1', 'tenant-1');

      expect(result.success).toBe(true);
      expect(result.data?.total_score).toBe(42);
      expect(mockQuery.order).toHaveBeenCalledWith('assessed_at', { ascending: false });
      expect(mockQuery.limit).toHaveBeenCalledWith(1);
    });
  });

  describe('interpretQoLScore', () => {
    it('interprets poor quality of life (0-20)', () => {
      const result = service.interpretQoLScore(15);

      expect(result.category).toBe('poor');
      expect(result.recommendation).toContain('very poor');
    });

    it('interprets fair quality of life (21-35)', () => {
      const result = service.interpretQoLScore(30);

      expect(result.category).toBe('fair');
      expect(result.recommendation).toContain('palliative care');
    });

    it('interprets acceptable quality of life (36-50)', () => {
      const result = service.interpretQoLScore(42);

      expect(result.category).toBe('acceptable');
      expect(result.recommendation).toContain('acceptable');
    });

    it('interprets good quality of life (51-70)', () => {
      const result = service.interpretQoLScore(55);

      expect(result.category).toBe('good');
      expect(result.recommendation).toContain('good');
    });

    it('handles edge cases', () => {
      expect(service.interpretQoLScore(0).category).toBe('poor');
      expect(service.interpretQoLScore(20).category).toBe('poor');
      expect(service.interpretQoLScore(21).category).toBe('fair');
      expect(service.interpretQoLScore(35).category).toBe('fair');
      expect(service.interpretQoLScore(36).category).toBe('acceptable');
      expect(service.interpretQoLScore(50).category).toBe('acceptable');
      expect(service.interpretQoLScore(51).category).toBe('good');
      expect(service.interpretQoLScore(70).category).toBe('good');
    });
  });
});
