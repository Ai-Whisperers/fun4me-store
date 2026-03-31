/**
 * Clinical Tools Service
 *
 * Business logic for clinical reference data and assessments.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { ClinicalToolsRepository } from './repository'
import type {
  DiagnosisCode,
  DiagnosisCodeFilters,
  DrugDosage,
  DrugFilters,
  GrowthStandard,
  GrowthStandardFilters,
  VaccineProtocol,
  VaccineProtocolFilters,
  ReproductiveCycle,
  CreateReproductiveCycleInput,
  UpdateReproductiveCycleInput,
  EuthanasiaAssessment,
  CreateAssessmentInput,
  DoseCalculationResult,
  GrowthPercentileResult,
  QoLInterpretation,
  Species,
} from './types'

export class ClinicalToolsService {
  private repository: ClinicalToolsRepository

  constructor(private supabase: SupabaseClient) {
    this.repository = new ClinicalToolsRepository(supabase)
  }

  // ===========================================================================
  // DIAGNOSIS CODES
  // ===========================================================================

  async searchDiagnosisCodes(filters?: DiagnosisCodeFilters): Promise<DiagnosisCode[]> {
    return this.repository.findDiagnosisCodes(filters)
  }

  async getDiagnosisCodeByCode(code: string): Promise<DiagnosisCode | null> {
    return this.repository.findDiagnosisCodeByCode(code)
  }

  // ===========================================================================
  // DRUG DOSAGES
  // ===========================================================================

  async searchDrugs(filters?: DrugFilters): Promise<DrugDosage[]> {
    return this.repository.findDrugs(filters)
  }

  async getDrugByName(name: string, species?: Species): Promise<DrugDosage | null> {
    return this.repository.findDrugByName(name, species)
  }

  /**
   * Calculate drug dose for a given weight (pure calculation, no DB call)
   */
  calculateDose(drug: DrugDosage, weightKg: number): DoseCalculationResult {
    const minDoseMg = drug.min_dose_mg_kg ? drug.min_dose_mg_kg * weightKg : null
    const maxDoseMg = drug.max_dose_mg_kg ? drug.max_dose_mg_kg * weightKg : null

    let minMl: number | null = null
    let maxMl: number | null = null

    if (drug.concentration_mg_ml && drug.concentration_mg_ml > 0) {
      if (minDoseMg) {
        minMl = Math.round((minDoseMg / drug.concentration_mg_ml) * 100) / 100
      }
      if (maxDoseMg) {
        maxMl = Math.round((maxDoseMg / drug.concentration_mg_ml) * 100) / 100
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
    }
  }

  /**
   * Calculate dose using the database function
   */
  async calculateDoseFromDb(
    drugName: string,
    species: string,
    weightKg: number
  ): Promise<DoseCalculationResult | null> {
    const result = await this.repository.calculateDoseFromDb(drugName, species, weightKg)
    return result as DoseCalculationResult | null
  }

  // ===========================================================================
  // GROWTH STANDARDS
  // ===========================================================================

  async getGrowthStandards(filters: GrowthStandardFilters): Promise<GrowthStandard[]> {
    return this.repository.findGrowthStandards(filters)
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
  ): Promise<GrowthPercentileResult> {
    const standards = await this.repository.findGrowthStandardsForPercentile(
      species,
      breed,
      gender,
      ageWeeks
    )

    if (!standards || standards.length === 0) {
      return {
        percentile: 'No data',
        weightKg,
        expectedP50: null,
        status: 'no_data',
      }
    }

    const p50 = standards.find((s) => s.percentile === 'P50')
    const p25 = standards.find((s) => s.percentile === 'P25')
    const p75 = standards.find((s) => s.percentile === 'P75')

    let percentile = '50th'
    let status: 'underweight' | 'normal' | 'overweight' = 'normal'

    if (p25 && weightKg < p25.weight_kg) {
      percentile = 'Below 25th'
      status = 'underweight'
    } else if (p50 && weightKg < p50.weight_kg) {
      percentile = '25th-50th'
      status = 'normal'
    } else if (p75 && weightKg < p75.weight_kg) {
      percentile = '50th-75th'
      status = 'normal'
    } else if (p75 && weightKg >= p75.weight_kg) {
      percentile = 'Above 75th'
      status = 'overweight'
    }

    return {
      percentile,
      weightKg,
      expectedP50: p50?.weight_kg || null,
      status,
    }
  }

  // ===========================================================================
  // VACCINE PROTOCOLS
  // ===========================================================================

  async getVaccineProtocols(filters?: VaccineProtocolFilters): Promise<VaccineProtocol[]> {
    return this.repository.findVaccineProtocols(filters)
  }

  async getVaccineProtocolByCode(code: string): Promise<VaccineProtocol | null> {
    return this.repository.findVaccineProtocolByCode(code)
  }

  // ===========================================================================
  // REPRODUCTIVE CYCLES
  // ===========================================================================

  async listReproductiveCycles(tenantId: string, petId?: string): Promise<ReproductiveCycle[]> {
    return this.repository.findReproductiveCycles(tenantId, petId)
  }

  async createReproductiveCycle(
    tenantId: string,
    input: CreateReproductiveCycleInput
  ): Promise<ReproductiveCycle> {
    return this.repository.createReproductiveCycle(tenantId, input)
  }

  async updateReproductiveCycle(
    cycleId: string,
    tenantId: string,
    updates: UpdateReproductiveCycleInput
  ): Promise<ReproductiveCycle> {
    return this.repository.updateReproductiveCycle(cycleId, tenantId, updates)
  }

  async getCurrentCycle(petId: string, tenantId: string): Promise<ReproductiveCycle | null> {
    return this.repository.findCurrentCycle(petId, tenantId)
  }

  // ===========================================================================
  // EUTHANASIA ASSESSMENTS (Quality of Life)
  // ===========================================================================

  async listAssessments(tenantId: string, petId?: string): Promise<EuthanasiaAssessment[]> {
    return this.repository.findAssessments(tenantId, petId)
  }

  async createAssessment(
    tenantId: string,
    input: CreateAssessmentInput
  ): Promise<EuthanasiaAssessment> {
    // Calculate total score (sum of all HHHHHMM scores)
    const totalScore =
      input.hurt_score +
      input.hunger_score +
      input.hydration_score +
      input.hygiene_score +
      input.happiness_score +
      input.mobility_score +
      input.more_good_days_score

    return this.repository.createAssessment(tenantId, input, totalScore)
  }

  async getLatestAssessment(
    petId: string,
    tenantId: string
  ): Promise<EuthanasiaAssessment | null> {
    return this.repository.findLatestAssessment(petId, tenantId)
  }

  /**
   * Interpret quality of life score
   * Based on HHHHHMM scale: 0-70 total, >35 generally acceptable
   */
  interpretQoLScore(totalScore: number): QoLInterpretation {
    if (totalScore <= 20) {
      return {
        category: 'poor',
        recommendation:
          'Quality of life is very poor. Consider end-of-life options with veterinary guidance.',
      }
    } else if (totalScore <= 35) {
      return {
        category: 'fair',
        recommendation:
          'Quality of life is fair but concerning. Consult veterinarian for palliative care options.',
      }
    } else if (totalScore <= 50) {
      return {
        category: 'acceptable',
        recommendation:
          'Quality of life is acceptable. Continue monitoring and supportive care.',
      }
    } else {
      return {
        category: 'good',
        recommendation: 'Quality of life is good. Maintain current care regimen.',
      }
    }
  }
}
