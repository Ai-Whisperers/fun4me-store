/**
 * Clinical Tools Service
 *
 * Handles clinical reference data and assessments:
 * - Diagnosis codes (VeNom, SNOMED, custom)
 * - Drug dosages and dose calculations
 * - Growth standards and percentile calculations
 * - Vaccine protocols
 * - Reproductive cycle tracking
 * - Euthanasia/quality of life assessments
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { BaseService, ServiceResult } from './base-service';

// ============================================================================
// Types
// ============================================================================

export type DiagnosisStandard = 'venom' | 'snomed' | 'custom';
export type Severity = 'mild' | 'moderate' | 'severe' | 'critical';
export type Species = 'dog' | 'cat' | 'bird' | 'rabbit' | 'all';
export type DrugCategory =
  | 'antibiotic'
  | 'analgesic'
  | 'nsaid'
  | 'corticosteroid'
  | 'antiemetic'
  | 'cardiac'
  | 'antifungal'
  | 'antiparasitic'
  | 'sedative'
  | 'steroid'
  | 'heartworm'
  | 'vaccine'
  | 'other';
export type DrugRoute =
  | 'oral'
  | 'PO'
  | 'IV'
  | 'IM'
  | 'SC'
  | 'SQ'
  | 'topical'
  | 'inhaled'
  | 'rectal'
  | 'ophthalmic'
  | 'otic';
export type VaccineProtocolType = 'core' | 'non-core' | 'lifestyle';
export type CycleType = 'heat' | 'pregnancy' | 'lactation' | 'anestrus';
export type GrowthPercentile = 'P3' | 'P10' | 'P25' | 'P50' | 'P75' | 'P90' | 'P97';

export interface DiagnosisCode {
  id: string;
  code: string;
  term: string;
  standard: DiagnosisStandard;
  category: string | null;
  description: string | null;
  species: string[];
  severity: Severity | null;
  created_at: string;
  updated_at: string;
}

export interface DrugDosage {
  id: string;
  name: string;
  generic_name: string | null;
  species: Species;
  category: DrugCategory | null;
  min_dose_mg_kg: number | null;
  max_dose_mg_kg: number | null;
  concentration_mg_ml: number | null;
  route: DrugRoute | null;
  frequency: string | null;
  max_daily_dose_mg_kg: number | null;
  contraindications: string[] | null;
  side_effects: string[] | null;
  notes: string | null;
  requires_prescription: boolean;
  created_at: string;
  updated_at: string;
}

export interface GrowthStandard {
  id: string;
  species: 'dog' | 'cat';
  breed: string | null;
  breed_category: string | null;
  gender: 'male' | 'female' | null;
  age_weeks: number;
  weight_kg: number;
  percentile: GrowthPercentile;
  created_at: string;
  updated_at: string;
}

export interface VaccineProtocol {
  id: string;
  vaccine_name: string;
  vaccine_code: string;
  species: 'dog' | 'cat' | 'all';
  protocol_type: VaccineProtocolType;
  diseases_prevented: string[];
  first_dose_weeks: number | null;
  booster_weeks: number[] | null;
  booster_intervals_months: number[] | null;
  revaccination_months: number | null;
  duration_years: number | null;
  manufacturer: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReproductiveCycle {
  id: string;
  pet_id: string;
  tenant_id: string;
  cycle_type: CycleType;
  cycle_start: string;
  cycle_end: string | null;
  mating_date: string | null;
  expected_due_date: string | null;
  actual_birth_date: string | null;
  litter_size: number | null;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EuthanasiaAssessment {
  id: string;
  pet_id: string;
  tenant_id: string;
  hurt_score: number;
  hunger_score: number;
  hydration_score: number;
  hygiene_score: number;
  happiness_score: number;
  mobility_score: number;
  more_good_days_score: number;
  total_score: number;
  notes: string | null;
  recommendations: string | null;
  assessed_by: string | null;
  assessed_at: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Data Types
// ============================================================================

export interface DiagnosisCodeFilters {
  search?: string;
  standard?: DiagnosisStandard;
  category?: string;
  species?: string;
  severity?: Severity;
}

export interface DrugFilters {
  search?: string;
  species?: Species;
  category?: DrugCategory;
  route?: DrugRoute;
  requiresPrescription?: boolean;
}

export interface GrowthStandardFilters {
  species: 'dog' | 'cat';
  breed?: string;
  breedCategory?: string;
  gender?: 'male' | 'female';
  ageWeeks?: number;
}

export interface VaccineProtocolFilters {
  species?: 'dog' | 'cat' | 'all';
  protocolType?: VaccineProtocolType;
  search?: string;
}

export interface CreateReproductiveCycleData {
  pet_id: string;
  cycle_type: CycleType;
  cycle_start: string;
  cycle_end?: string;
  mating_date?: string;
  expected_due_date?: string;
  actual_birth_date?: string;
  litter_size?: number;
  notes?: string;
  recorded_by?: string;
}

export interface UpdateReproductiveCycleData {
  cycle_end?: string;
  actual_birth_date?: string;
  litter_size?: number;
  notes?: string;
}

export interface CreateAssessmentData {
  pet_id: string;
  hurt_score: number;
  hunger_score: number;
  hydration_score: number;
  hygiene_score: number;
  happiness_score: number;
  mobility_score: number;
  more_good_days_score: number;
  notes?: string;
  recommendations?: string;
  assessed_by?: string;
}

export interface DoseCalculationResult {
  drug_name: string;
  min_dose_mg: number | null;
  max_dose_mg: number | null;
  min_ml: number | null;
  max_ml: number | null;
  route: string | null;
  frequency: string | null;
  notes: string | null;
}

export interface GrowthPercentileResult {
  percentile: string;
  weightKg: number;
  expectedP50: number | null;
  status: 'underweight' | 'normal' | 'overweight' | 'no_data';
}

// ============================================================================
// Service
// ============================================================================

export class ClinicalToolsService extends BaseService {
  constructor(supabase: SupabaseClient) {
    super(supabase);
  }

  // ==========================================================================
  // Diagnosis Codes
  // ==========================================================================

  async searchDiagnosisCodes(
    filters?: DiagnosisCodeFilters
  ): Promise<ServiceResult<DiagnosisCode[]>> {
    return this.handleError(async () => {
      let query = this.supabase
        .from('diagnosis_codes')
        .select('*')
        .is('deleted_at', null)
        .order('term', { ascending: true });

      if (filters?.search) {
        query = query.or(`code.ilike.%${filters.search}%,term.ilike.%${filters.search}%`);
      }

      if (filters?.standard) {
        query = query.eq('standard', filters.standard);
      }

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      if (filters?.species) {
        query = query.contains('species', [filters.species]);
      }

      if (filters?.severity) {
        query = query.eq('severity', filters.severity);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      return data || [];
    }, 'Failed to search diagnosis codes');
  }

  async getDiagnosisCodeByCode(code: string): Promise<ServiceResult<DiagnosisCode | null>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('diagnosis_codes')
        .select('*')
        .eq('code', code)
        .is('deleted_at', null)
        .maybeSingle();

      if (error) throw error;
      return data;
    }, 'Failed to get diagnosis code');
  }

  // ==========================================================================
  // Drug Dosages
  // ==========================================================================

  async searchDrugs(filters?: DrugFilters): Promise<ServiceResult<DrugDosage[]>> {
    return this.handleError(async () => {
      let query = this.supabase
        .from('drug_dosages')
        .select('*')
        .is('deleted_at', null)
        .order('name', { ascending: true });

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,generic_name.ilike.%${filters.search}%`);
      }

      if (filters?.species) {
        query = query.or(`species.eq.${filters.species},species.eq.all`);
      }

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      if (filters?.route) {
        query = query.eq('route', filters.route);
      }

      if (filters?.requiresPrescription !== undefined) {
        query = query.eq('requires_prescription', filters.requiresPrescription);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      return data || [];
    }, 'Failed to search drugs');
  }

  async getDrugByName(
    name: string,
    species?: Species
  ): Promise<ServiceResult<DrugDosage | null>> {
    return this.handleError(async () => {
      let query = this.supabase
        .from('drug_dosages')
        .select('*')
        .ilike('name', name)
        .is('deleted_at', null);

      if (species) {
        query = query.or(`species.eq.${species},species.eq.all`);
      }

      const { data, error } = await query.order('species', { ascending: true }).limit(1);

      if (error) throw error;
      return data?.[0] || null;
    }, 'Failed to get drug');
  }

  /**
   * Calculate drug dose for a given weight
   */
  calculateDose(drug: DrugDosage, weightKg: number): DoseCalculationResult {
    const minDoseMg = drug.min_dose_mg_kg ? drug.min_dose_mg_kg * weightKg : null;
    const maxDoseMg = drug.max_dose_mg_kg ? drug.max_dose_mg_kg * weightKg : null;

    let minMl: number | null = null;
    let maxMl: number | null = null;

    if (drug.concentration_mg_ml && drug.concentration_mg_ml > 0) {
      if (minDoseMg) {
        minMl = Math.round((minDoseMg / drug.concentration_mg_ml) * 100) / 100;
      }
      if (maxDoseMg) {
        maxMl = Math.round((maxDoseMg / drug.concentration_mg_ml) * 100) / 100;
      }
    }

    return {
      drug_name: drug.name,
      min_dose_mg: minDoseMg ? Math.round(minDoseMg * 100) / 100 : null,
      max_dose_mg: maxDoseMg ? Math.round(maxDoseMg * 100) / 100 : null,
      min_ml: minMl,
      max_ml: maxMl,
      route: drug.route,
      frequency: drug.frequency,
      notes: drug.notes,
    };
  }

  /**
   * Calculate dose using the database function
   */
  async calculateDoseFromDb(
    drugName: string,
    species: string,
    weightKg: number
  ): Promise<ServiceResult<DoseCalculationResult | null>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase.rpc('calculate_drug_dose', {
        p_drug_name: drugName,
        p_species: species,
        p_weight_kg: weightKg,
      });

      if (error) throw error;
      return data?.[0] || null;
    }, 'Failed to calculate dose');
  }

  // ==========================================================================
  // Growth Standards
  // ==========================================================================

  async getGrowthStandards(
    filters: GrowthStandardFilters
  ): Promise<ServiceResult<GrowthStandard[]>> {
    return this.handleError(async () => {
      let query = this.supabase
        .from('growth_standards')
        .select('*')
        .eq('species', filters.species)
        .is('deleted_at', null)
        .order('age_weeks', { ascending: true });

      if (filters.breed) {
        query = query.ilike('breed', filters.breed);
      }

      if (filters.breedCategory) {
        query = query.eq('breed_category', filters.breedCategory);
      }

      if (filters.gender) {
        query = query.eq('gender', filters.gender);
      }

      if (filters.ageWeeks !== undefined) {
        query = query.eq('age_weeks', filters.ageWeeks);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    }, 'Failed to get growth standards');
  }

  /**
   * Calculate growth percentile for a pet
   */
  async calculateGrowthPercentile(
    species: 'dog' | 'cat',
    breed: string,
    gender: 'male' | 'female',
    ageWeeks: number,
    weightKg: number
  ): Promise<ServiceResult<GrowthPercentileResult>> {
    return this.handleError(async () => {
      // Get reference weights for this age
      const { data: standards, error } = await this.supabase
        .from('growth_standards')
        .select('percentile, weight_kg')
        .eq('species', species)
        .ilike('breed', breed)
        .eq('gender', gender)
        .eq('age_weeks', ageWeeks)
        .is('deleted_at', null);

      if (error) throw error;

      if (!standards || standards.length === 0) {
        return {
          percentile: 'No data',
          weightKg,
          expectedP50: null,
          status: 'no_data' as const,
        };
      }

      // Find P50 (median)
      const p50 = standards.find((s) => s.percentile === 'P50');
      const p25 = standards.find((s) => s.percentile === 'P25');
      const p75 = standards.find((s) => s.percentile === 'P75');

      let percentile = '50th';
      let status: 'underweight' | 'normal' | 'overweight' = 'normal';

      if (p25 && weightKg < p25.weight_kg) {
        percentile = 'Below 25th';
        status = 'underweight';
      } else if (p50 && weightKg < p50.weight_kg) {
        percentile = '25th-50th';
        status = 'normal';
      } else if (p75 && weightKg < p75.weight_kg) {
        percentile = '50th-75th';
        status = 'normal';
      } else if (p75 && weightKg >= p75.weight_kg) {
        percentile = 'Above 75th';
        status = 'overweight';
      }

      return {
        percentile,
        weightKg,
        expectedP50: p50?.weight_kg || null,
        status,
      };
    }, 'Failed to calculate growth percentile');
  }

  // ==========================================================================
  // Vaccine Protocols
  // ==========================================================================

  async getVaccineProtocols(
    filters?: VaccineProtocolFilters
  ): Promise<ServiceResult<VaccineProtocol[]>> {
    return this.handleError(async () => {
      let query = this.supabase
        .from('vaccine_protocols')
        .select('*')
        .is('deleted_at', null)
        .order('vaccine_name', { ascending: true });

      if (filters?.species) {
        query = query.or(`species.eq.${filters.species},species.eq.all`);
      }

      if (filters?.protocolType) {
        query = query.eq('protocol_type', filters.protocolType);
      }

      if (filters?.search) {
        query = query.or(
          `vaccine_name.ilike.%${filters.search}%,vaccine_code.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    }, 'Failed to get vaccine protocols');
  }

  async getVaccineProtocolByCode(code: string): Promise<ServiceResult<VaccineProtocol | null>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('vaccine_protocols')
        .select('*')
        .eq('vaccine_code', code)
        .is('deleted_at', null)
        .maybeSingle();

      if (error) throw error;
      return data;
    }, 'Failed to get vaccine protocol');
  }

  // ==========================================================================
  // Reproductive Cycles
  // ==========================================================================

  async listReproductiveCycles(
    tenantId: string,
    petId?: string
  ): Promise<ServiceResult<ReproductiveCycle[]>> {
    return this.handleError(async () => {
      let query = this.supabase
        .from('reproductive_cycles')
        .select('*')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('cycle_start', { ascending: false });

      if (petId) {
        query = query.eq('pet_id', petId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    }, 'Failed to list reproductive cycles');
  }

  async createReproductiveCycle(
    tenantId: string,
    data: CreateReproductiveCycleData
  ): Promise<ServiceResult<ReproductiveCycle>> {
    return this.handleError(async () => {
      const { data: cycle, error } = await this.supabase
        .from('reproductive_cycles')
        .insert({
          ...data,
          tenant_id: tenantId,
        })
        .select()
        .single();

      if (error) throw error;
      return cycle;
    }, 'Failed to create reproductive cycle');
  }

  async updateReproductiveCycle(
    cycleId: string,
    tenantId: string,
    data: UpdateReproductiveCycleData
  ): Promise<ServiceResult<ReproductiveCycle>> {
    return this.handleError(async () => {
      const { data: cycle, error } = await this.supabase
        .from('reproductive_cycles')
        .update(data)
        .eq('id', cycleId)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) throw error;
      return cycle;
    }, 'Failed to update reproductive cycle');
  }

  async getCurrentCycle(
    petId: string,
    tenantId: string
  ): Promise<ServiceResult<ReproductiveCycle | null>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('reproductive_cycles')
        .select('*')
        .eq('pet_id', petId)
        .eq('tenant_id', tenantId)
        .is('cycle_end', null)
        .is('deleted_at', null)
        .order('cycle_start', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    }, 'Failed to get current cycle');
  }

  // ==========================================================================
  // Euthanasia Assessments (Quality of Life)
  // ==========================================================================

  async listAssessments(
    tenantId: string,
    petId?: string
  ): Promise<ServiceResult<EuthanasiaAssessment[]>> {
    return this.handleError(async () => {
      let query = this.supabase
        .from('euthanasia_assessments')
        .select('*')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('assessed_at', { ascending: false });

      if (petId) {
        query = query.eq('pet_id', petId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    }, 'Failed to list assessments');
  }

  async createAssessment(
    tenantId: string,
    data: CreateAssessmentData
  ): Promise<ServiceResult<EuthanasiaAssessment>> {
    return this.handleError(async () => {
      // Calculate total score (sum of all HHHHHMM scores)
      const totalScore =
        data.hurt_score +
        data.hunger_score +
        data.hydration_score +
        data.hygiene_score +
        data.happiness_score +
        data.mobility_score +
        data.more_good_days_score;

      const { data: assessment, error } = await this.supabase
        .from('euthanasia_assessments')
        .insert({
          ...data,
          tenant_id: tenantId,
          total_score: totalScore,
          assessed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return assessment;
    }, 'Failed to create assessment');
  }

  async getLatestAssessment(
    petId: string,
    tenantId: string
  ): Promise<ServiceResult<EuthanasiaAssessment | null>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('euthanasia_assessments')
        .select('*')
        .eq('pet_id', petId)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('assessed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    }, 'Failed to get latest assessment');
  }

  /**
   * Interpret quality of life score
   * Based on HHHHHMM scale: 0-70 total, >35 generally acceptable
   */
  interpretQoLScore(totalScore: number): {
    category: 'poor' | 'fair' | 'acceptable' | 'good';
    recommendation: string;
  } {
    if (totalScore <= 20) {
      return {
        category: 'poor',
        recommendation:
          'Quality of life is very poor. Consider end-of-life options with veterinary guidance.',
      };
    } else if (totalScore <= 35) {
      return {
        category: 'fair',
        recommendation:
          'Quality of life is fair but concerning. Consult veterinarian for palliative care options.',
      };
    } else if (totalScore <= 50) {
      return {
        category: 'acceptable',
        recommendation:
          'Quality of life is acceptable. Continue monitoring and supportive care.',
      };
    } else {
      return {
        category: 'good',
        recommendation: 'Quality of life is good. Maintain current care regimen.',
      };
    }
  }
}
