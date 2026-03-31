/**
 * Clinical Tools Repository
 *
 * Data access layer for clinical reference data.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
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
  Species,
} from './types'

export class ClinicalToolsRepository {
  constructor(private supabase: SupabaseClient) {}

  // ===========================================================================
  // DIAGNOSIS CODES
  // ===========================================================================

  async findDiagnosisCodes(filters: DiagnosisCodeFilters = {}): Promise<DiagnosisCode[]> {
    let query = this.supabase
      .from('diagnosis_codes')
      .select('*')
      .is('deleted_at', null)
      .order('term', { ascending: true })

    if (filters.search) {
      query = query.or(`code.ilike.%${filters.search}%,term.ilike.%${filters.search}%`)
    }

    if (filters.standard) {
      query = query.eq('standard', filters.standard)
    }

    if (filters.category) {
      query = query.eq('category', filters.category)
    }

    if (filters.species) {
      query = query.contains('species', [filters.species])
    }

    if (filters.severity) {
      query = query.eq('severity', filters.severity)
    }

    const { data, error } = await query.limit(100)

    if (error) throw new Error(`Error al buscar códigos de diagnóstico: ${error.message}`)
    return (data || []) as DiagnosisCode[]
  }

  async findDiagnosisCodeByCode(code: string): Promise<DiagnosisCode | null> {
    const { data, error } = await this.supabase
      .from('diagnosis_codes')
      .select('*')
      .eq('code', code)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) throw new Error(`Error al obtener código de diagnóstico: ${error.message}`)
    return data as DiagnosisCode | null
  }

  // ===========================================================================
  // DRUG DOSAGES
  // ===========================================================================

  async findDrugs(filters: DrugFilters = {}): Promise<DrugDosage[]> {
    let query = this.supabase
      .from('drug_dosages')
      .select('*')
      .is('deleted_at', null)
      .order('name', { ascending: true })

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,generic_name.ilike.%${filters.search}%`)
    }

    if (filters.species) {
      query = query.or(`species.eq.${filters.species},species.eq.all`)
    }

    if (filters.category) {
      query = query.eq('category', filters.category)
    }

    if (filters.route) {
      query = query.eq('route', filters.route)
    }

    if (filters.requiresPrescription !== undefined) {
      query = query.eq('requires_prescription', filters.requiresPrescription)
    }

    const { data, error } = await query.limit(100)

    if (error) throw new Error(`Error al buscar medicamentos: ${error.message}`)
    return (data || []) as DrugDosage[]
  }

  async findDrugByName(name: string, species?: Species): Promise<DrugDosage | null> {
    let query = this.supabase
      .from('drug_dosages')
      .select('*')
      .ilike('name', name)
      .is('deleted_at', null)

    if (species) {
      query = query.or(`species.eq.${species},species.eq.all`)
    }

    const { data, error } = await query.order('species', { ascending: true }).limit(1)

    if (error) throw new Error(`Error al obtener medicamento: ${error.message}`)
    return data?.[0] as DrugDosage | null
  }

  async calculateDoseFromDb(
    drugName: string,
    species: string,
    weightKg: number
  ): Promise<Record<string, unknown> | null> {
    const { data, error } = await this.supabase.rpc('calculate_drug_dose', {
      p_drug_name: drugName,
      p_species: species,
      p_weight_kg: weightKg,
    })

    if (error) throw new Error(`Error al calcular dosis: ${error.message}`)
    return data?.[0] || null
  }

  // ===========================================================================
  // GROWTH STANDARDS
  // ===========================================================================

  async findGrowthStandards(filters: GrowthStandardFilters): Promise<GrowthStandard[]> {
    let query = this.supabase
      .from('growth_standards')
      .select('*')
      .eq('species', filters.species)
      .is('deleted_at', null)
      .order('age_weeks', { ascending: true })

    if (filters.breed) {
      query = query.ilike('breed', filters.breed)
    }

    if (filters.breedCategory) {
      query = query.eq('breed_category', filters.breedCategory)
    }

    if (filters.gender) {
      query = query.eq('gender', filters.gender)
    }

    if (filters.ageWeeks !== undefined) {
      query = query.eq('age_weeks', filters.ageWeeks)
    }

    const { data, error } = await query

    if (error) throw new Error(`Error al obtener estándares de crecimiento: ${error.message}`)
    return (data || []) as GrowthStandard[]
  }

  async findGrowthStandardsForPercentile(
    species: 'dog' | 'cat',
    breed: string,
    gender: 'male' | 'female',
    ageWeeks: number
  ): Promise<Array<{ percentile: string; weight_kg: number }>> {
    const { data, error } = await this.supabase
      .from('growth_standards')
      .select('percentile, weight_kg')
      .eq('species', species)
      .ilike('breed', breed)
      .eq('gender', gender)
      .eq('age_weeks', ageWeeks)
      .is('deleted_at', null)

    if (error) throw new Error(`Error al obtener percentiles: ${error.message}`)
    return (data || []) as Array<{ percentile: string; weight_kg: number }>
  }

  // ===========================================================================
  // VACCINE PROTOCOLS
  // ===========================================================================

  async findVaccineProtocols(filters: VaccineProtocolFilters = {}): Promise<VaccineProtocol[]> {
    let query = this.supabase
      .from('vaccine_protocols')
      .select('*')
      .is('deleted_at', null)
      .order('vaccine_name', { ascending: true })

    if (filters.species) {
      query = query.or(`species.eq.${filters.species},species.eq.all`)
    }

    if (filters.protocolType) {
      query = query.eq('protocol_type', filters.protocolType)
    }

    if (filters.search) {
      query = query.or(
        `vaccine_name.ilike.%${filters.search}%,vaccine_code.ilike.%${filters.search}%`
      )
    }

    const { data, error } = await query

    if (error) throw new Error(`Error al obtener protocolos de vacunación: ${error.message}`)
    return (data || []) as VaccineProtocol[]
  }

  async findVaccineProtocolByCode(code: string): Promise<VaccineProtocol | null> {
    const { data, error } = await this.supabase
      .from('vaccine_protocols')
      .select('*')
      .eq('vaccine_code', code)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) throw new Error(`Error al obtener protocolo: ${error.message}`)
    return data as VaccineProtocol | null
  }

  // ===========================================================================
  // REPRODUCTIVE CYCLES
  // ===========================================================================

  async findReproductiveCycles(tenantId: string, petId?: string): Promise<ReproductiveCycle[]> {
    let query = this.supabase
      .from('reproductive_cycles')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('cycle_start', { ascending: false })

    if (petId) {
      query = query.eq('pet_id', petId)
    }

    const { data, error } = await query

    if (error) throw new Error(`Error al listar ciclos reproductivos: ${error.message}`)
    return (data || []) as ReproductiveCycle[]
  }

  async createReproductiveCycle(
    tenantId: string,
    input: CreateReproductiveCycleInput
  ): Promise<ReproductiveCycle> {
    const { data, error } = await this.supabase
      .from('reproductive_cycles')
      .insert({
        ...input,
        tenant_id: tenantId,
      })
      .select()
      .single()

    if (error) throw new Error(`Error al crear ciclo reproductivo: ${error.message}`)
    return data as ReproductiveCycle
  }

  async updateReproductiveCycle(
    cycleId: string,
    tenantId: string,
    updates: UpdateReproductiveCycleInput
  ): Promise<ReproductiveCycle> {
    const { data, error } = await this.supabase
      .from('reproductive_cycles')
      .update(updates)
      .eq('id', cycleId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) throw new Error(`Error al actualizar ciclo reproductivo: ${error.message}`)
    return data as ReproductiveCycle
  }

  async findCurrentCycle(petId: string, tenantId: string): Promise<ReproductiveCycle | null> {
    const { data, error } = await this.supabase
      .from('reproductive_cycles')
      .select('*')
      .eq('pet_id', petId)
      .eq('tenant_id', tenantId)
      .is('cycle_end', null)
      .is('deleted_at', null)
      .order('cycle_start', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw new Error(`Error al obtener ciclo actual: ${error.message}`)
    return data as ReproductiveCycle | null
  }

  // ===========================================================================
  // EUTHANASIA ASSESSMENTS
  // ===========================================================================

  async findAssessments(tenantId: string, petId?: string): Promise<EuthanasiaAssessment[]> {
    let query = this.supabase
      .from('euthanasia_assessments')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('assessed_at', { ascending: false })

    if (petId) {
      query = query.eq('pet_id', petId)
    }

    const { data, error } = await query

    if (error) throw new Error(`Error al listar evaluaciones: ${error.message}`)
    return (data || []) as EuthanasiaAssessment[]
  }

  async createAssessment(
    tenantId: string,
    input: CreateAssessmentInput,
    totalScore: number
  ): Promise<EuthanasiaAssessment> {
    const { data, error } = await this.supabase
      .from('euthanasia_assessments')
      .insert({
        ...input,
        tenant_id: tenantId,
        total_score: totalScore,
        assessed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw new Error(`Error al crear evaluación: ${error.message}`)
    return data as EuthanasiaAssessment
  }

  async findLatestAssessment(
    petId: string,
    tenantId: string
  ): Promise<EuthanasiaAssessment | null> {
    const { data, error } = await this.supabase
      .from('euthanasia_assessments')
      .select('*')
      .eq('pet_id', petId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('assessed_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw new Error(`Error al obtener última evaluación: ${error.message}`)
    return data as EuthanasiaAssessment | null
  }
}
