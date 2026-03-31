/**
 * Hospitalizations Repository
 *
 * Data access layer for kennels, hospitalizations, vitals, medications, treatments, feedings, and notes.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Kennel,
  KennelFilters,
  CreateKennelInput,
  UpdateKennelInput,
  Hospitalization,
  HospitalizationFilters,
  AdmitPatientInput,
  UpdateHospitalizationInput,
  DischargePatientInput,
  HospitalizationStatus,
  HospitalizationVitals,
  RecordVitalsInput,
  HospitalizationMedication,
  MedicationStatus,
  ScheduleMedicationInput,
  HospitalizationTreatment,
  TreatmentStatus,
  ScheduleTreatmentInput,
  HospitalizationFeeding,
  FeedingStatus,
  ScheduleFeedingInput,
  HospitalizationNote,
  NoteType,
  CreateNoteInput,
} from './types'

export class HospitalizationRepository {
  constructor(private supabase: SupabaseClient) {}

  // ===========================================================================
  // KENNELS
  // ===========================================================================

  async findKennelById(id: string, tenantId: string): Promise<Kennel | null> {
    const { data, error } = await this.supabase
      .from('kennels')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) throw new Error(`Error al cargar canil: ${error.message}`)
    return data as Kennel | null
  }

  async findManyKennels(tenantId: string, filters: KennelFilters = {}): Promise<Kennel[]> {
    let query = this.supabase
      .from('kennels')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('name', { ascending: true })

    if (filters.status) query = query.eq('current_status', filters.status)
    if (filters.type) query = query.eq('kennel_type', filters.type)
    if (filters.isActive !== undefined) query = query.eq('is_active', filters.isActive)
    if (filters.minWeight) query = query.gte('max_weight_kg', filters.minWeight)

    const { data, error } = await query
    if (error) throw new Error(`Error al cargar caniles: ${error.message}`)
    return (data || []) as Kennel[]
  }

  async createKennel(tenantId: string, input: CreateKennelInput): Promise<Kennel> {
    const { data, error } = await this.supabase
      .from('kennels')
      .insert({ ...input, tenant_id: tenantId })
      .select()
      .single()

    if (error) throw new Error(`Error al crear canil: ${error.message}`)
    return data as Kennel
  }

  async updateKennel(id: string, tenantId: string, input: UpdateKennelInput): Promise<Kennel> {
    const { data, error } = await this.supabase
      .from('kennels')
      .update(input)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) throw new Error(`Error al actualizar canil: ${error.message}`)
    return data as Kennel
  }

  // ===========================================================================
  // HOSPITALIZATIONS
  // ===========================================================================

  async findHospitalizationById(id: string, tenantId: string): Promise<Hospitalization | null> {
    const { data, error } = await this.supabase
      .from('hospitalizations')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) throw new Error(`Error al cargar hospitalización: ${error.message}`)
    return data as Hospitalization | null
  }

  async findManyHospitalizations(
    tenantId: string,
    filters: HospitalizationFilters = {}
  ): Promise<Hospitalization[]> {
    let query = this.supabase
      .from('hospitalizations')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('admitted_at', { ascending: false })

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status)
      } else {
        query = query.eq('status', filters.status)
      }
    }
    if (filters.activeOnly) {
      query = query.not('status', 'in', '(discharged,deceased,transferred)')
    }
    if (filters.acuityLevel) query = query.eq('acuity_level', filters.acuityLevel)
    if (filters.petId) query = query.eq('pet_id', filters.petId)
    if (filters.vetId) query = query.eq('primary_vet_id', filters.vetId)
    if (filters.kennelId) query = query.eq('kennel_id', filters.kennelId)

    const { data, error } = await query
    if (error) throw new Error(`Error al cargar hospitalizaciones: ${error.message}`)
    return (data || []) as Hospitalization[]
  }

  async findActiveHospitalization(petId: string, tenantId: string): Promise<Hospitalization | null> {
    const { data, error } = await this.supabase
      .from('hospitalizations')
      .select('*')
      .eq('pet_id', petId)
      .eq('tenant_id', tenantId)
      .not('status', 'in', '(discharged,deceased,transferred)')
      .is('deleted_at', null)
      .order('admitted_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw new Error(`Error al cargar hospitalización activa: ${error.message}`)
    return data as Hospitalization | null
  }

  async createHospitalization(
    tenantId: string,
    admissionNumber: string,
    input: AdmitPatientInput
  ): Promise<Hospitalization> {
    const { data, error } = await this.supabase
      .from('hospitalizations')
      .insert({
        ...input,
        tenant_id: tenantId,
        admission_number: admissionNumber,
        admitted_at: new Date().toISOString(),
        status: 'admitted',
      })
      .select()
      .single()

    if (error) throw new Error(`Error al crear hospitalización: ${error.message}`)
    return data as Hospitalization
  }

  async updateHospitalization(
    id: string,
    tenantId: string,
    input: UpdateHospitalizationInput
  ): Promise<Hospitalization> {
    const { data, error } = await this.supabase
      .from('hospitalizations')
      .update(input)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) throw new Error(`Error al actualizar hospitalización: ${error.message}`)
    return data as Hospitalization
  }

  async updateHospitalizationStatus(
    id: string,
    tenantId: string,
    status: HospitalizationStatus
  ): Promise<Hospitalization> {
    const { data, error } = await this.supabase
      .from('hospitalizations')
      .update({ status })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) throw new Error(`Error al actualizar estado: ${error.message}`)
    return data as Hospitalization
  }

  async dischargePatient(
    id: string,
    tenantId: string,
    input: DischargePatientInput
  ): Promise<Hospitalization> {
    const { data, error } = await this.supabase
      .from('hospitalizations')
      .update({
        ...input,
        status: 'discharged',
        actual_discharge: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .not('status', 'in', '(discharged,deceased,transferred)')
      .is('deleted_at', null)
      .select()
      .single()

    if (error) throw new Error(`Error al dar de alta: ${error.message}`)
    return data as Hospitalization
  }

  async generateAdmissionNumber(tenantId: string): Promise<string> {
    const { data, error } = await this.supabase.rpc('generate_admission_number', {
      p_tenant_id: tenantId,
    })

    if (error) throw new Error(`Error al generar número de admisión: ${error.message}`)
    return data as string
  }

  // ===========================================================================
  // VITALS
  // ===========================================================================

  async findManyVitals(hospitalizationId: string, tenantId: string): Promise<HospitalizationVitals[]> {
    const { data, error } = await this.supabase
      .from('hospitalization_vitals')
      .select('*')
      .eq('hospitalization_id', hospitalizationId)
      .eq('tenant_id', tenantId)
      .order('recorded_at', { ascending: false })

    if (error) throw new Error(`Error al cargar signos vitales: ${error.message}`)
    return (data || []) as HospitalizationVitals[]
  }

  async createVitals(
    hospitalizationId: string,
    tenantId: string,
    input: RecordVitalsInput
  ): Promise<HospitalizationVitals> {
    const { data, error } = await this.supabase
      .from('hospitalization_vitals')
      .insert({
        ...input,
        hospitalization_id: hospitalizationId,
        tenant_id: tenantId,
        recorded_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw new Error(`Error al registrar signos vitales: ${error.message}`)
    return data as HospitalizationVitals
  }

  async findLatestVitals(
    hospitalizationId: string,
    tenantId: string
  ): Promise<HospitalizationVitals | null> {
    const { data, error } = await this.supabase
      .from('hospitalization_vitals')
      .select('*')
      .eq('hospitalization_id', hospitalizationId)
      .eq('tenant_id', tenantId)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw new Error(`Error al cargar últimos signos vitales: ${error.message}`)
    return data as HospitalizationVitals | null
  }

  // ===========================================================================
  // MEDICATIONS
  // ===========================================================================

  async findManyMedications(
    hospitalizationId: string,
    tenantId: string,
    status?: MedicationStatus
  ): Promise<HospitalizationMedication[]> {
    let query = this.supabase
      .from('hospitalization_medications')
      .select('*')
      .eq('hospitalization_id', hospitalizationId)
      .eq('tenant_id', tenantId)
      .order('scheduled_at', { ascending: true })

    if (status) query = query.eq('status', status)

    const { data, error } = await query
    if (error) throw new Error(`Error al cargar medicamentos: ${error.message}`)
    return (data || []) as HospitalizationMedication[]
  }

  async createMedication(
    hospitalizationId: string,
    tenantId: string,
    input: ScheduleMedicationInput
  ): Promise<HospitalizationMedication> {
    const { data, error } = await this.supabase
      .from('hospitalization_medications')
      .insert({
        ...input,
        hospitalization_id: hospitalizationId,
        tenant_id: tenantId,
        status: 'scheduled',
      })
      .select()
      .single()

    if (error) throw new Error(`Error al programar medicamento: ${error.message}`)
    return data as HospitalizationMedication
  }

  async administerMedication(
    id: string,
    tenantId: string,
    administeredBy?: string,
    administeredAt?: string,
    notes?: string
  ): Promise<HospitalizationMedication> {
    const { data, error } = await this.supabase
      .from('hospitalization_medications')
      .update({
        status: 'administered',
        administered_at: administeredAt || new Date().toISOString(),
        administered_by: administeredBy,
        notes,
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('status', 'scheduled')
      .select()
      .single()

    if (error) throw new Error(`Error al administrar medicamento: ${error.message}`)
    return data as HospitalizationMedication
  }

  async skipMedication(
    id: string,
    tenantId: string,
    reason: string
  ): Promise<HospitalizationMedication> {
    const { data, error } = await this.supabase
      .from('hospitalization_medications')
      .update({ status: 'skipped', skipped_reason: reason })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('status', 'scheduled')
      .select()
      .single()

    if (error) throw new Error(`Error al omitir medicamento: ${error.message}`)
    return data as HospitalizationMedication
  }

  // ===========================================================================
  // TREATMENTS
  // ===========================================================================

  async findManyTreatments(
    hospitalizationId: string,
    tenantId: string,
    status?: TreatmentStatus
  ): Promise<HospitalizationTreatment[]> {
    let query = this.supabase
      .from('hospitalization_treatments')
      .select('*')
      .eq('hospitalization_id', hospitalizationId)
      .eq('tenant_id', tenantId)
      .order('scheduled_at', { ascending: true })

    if (status) query = query.eq('status', status)

    const { data, error } = await query
    if (error) throw new Error(`Error al cargar tratamientos: ${error.message}`)
    return (data || []) as HospitalizationTreatment[]
  }

  async createTreatment(
    hospitalizationId: string,
    tenantId: string,
    input: ScheduleTreatmentInput
  ): Promise<HospitalizationTreatment> {
    const { data, error } = await this.supabase
      .from('hospitalization_treatments')
      .insert({
        ...input,
        hospitalization_id: hospitalizationId,
        tenant_id: tenantId,
        status: 'scheduled',
      })
      .select()
      .single()

    if (error) throw new Error(`Error al programar tratamiento: ${error.message}`)
    return data as HospitalizationTreatment
  }

  async performTreatment(
    id: string,
    tenantId: string,
    performedBy?: string,
    performedAt?: string,
    notes?: string
  ): Promise<HospitalizationTreatment> {
    const { data, error } = await this.supabase
      .from('hospitalization_treatments')
      .update({
        status: 'performed',
        performed_at: performedAt || new Date().toISOString(),
        performed_by: performedBy,
        notes,
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .in('status', ['scheduled', 'pending'])
      .select()
      .single()

    if (error) throw new Error(`Error al realizar tratamiento: ${error.message}`)
    return data as HospitalizationTreatment
  }

  // ===========================================================================
  // FEEDINGS
  // ===========================================================================

  async findManyFeedings(
    hospitalizationId: string,
    tenantId: string,
    status?: FeedingStatus
  ): Promise<HospitalizationFeeding[]> {
    let query = this.supabase
      .from('hospitalization_feedings')
      .select('*')
      .eq('hospitalization_id', hospitalizationId)
      .eq('tenant_id', tenantId)
      .order('scheduled_at', { ascending: true })

    if (status) query = query.eq('status', status)

    const { data, error } = await query
    if (error) throw new Error(`Error al cargar alimentaciones: ${error.message}`)
    return (data || []) as HospitalizationFeeding[]
  }

  async createFeeding(
    hospitalizationId: string,
    tenantId: string,
    input: ScheduleFeedingInput
  ): Promise<HospitalizationFeeding> {
    const { data, error } = await this.supabase
      .from('hospitalization_feedings')
      .insert({
        ...input,
        hospitalization_id: hospitalizationId,
        tenant_id: tenantId,
        status: 'scheduled',
      })
      .select()
      .single()

    if (error) throw new Error(`Error al programar alimentación: ${error.message}`)
    return data as HospitalizationFeeding
  }

  async completeFeeding(
    id: string,
    tenantId: string,
    status: FeedingStatus,
    fedBy?: string,
    fedAt?: string,
    consumedAmount?: string,
    appetiteScore?: number,
    vomited?: boolean,
    notes?: string
  ): Promise<HospitalizationFeeding> {
    const { data, error } = await this.supabase
      .from('hospitalization_feedings')
      .update({
        status,
        fed_at: fedAt || new Date().toISOString(),
        fed_by: fedBy,
        consumed_amount: consumedAmount,
        appetite_score: appetiteScore,
        vomited,
        notes,
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('status', 'scheduled')
      .select()
      .single()

    if (error) throw new Error(`Error al completar alimentación: ${error.message}`)
    return data as HospitalizationFeeding
  }

  // ===========================================================================
  // NOTES
  // ===========================================================================

  async findManyNotes(
    hospitalizationId: string,
    tenantId: string,
    noteType?: NoteType
  ): Promise<HospitalizationNote[]> {
    let query = this.supabase
      .from('hospitalization_notes')
      .select('*')
      .eq('hospitalization_id', hospitalizationId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (noteType) query = query.eq('note_type', noteType)

    const { data, error } = await query
    if (error) throw new Error(`Error al cargar notas: ${error.message}`)
    return (data || []) as HospitalizationNote[]
  }

  async createNote(
    hospitalizationId: string,
    tenantId: string,
    input: CreateNoteInput
  ): Promise<HospitalizationNote> {
    const { data, error } = await this.supabase
      .from('hospitalization_notes')
      .insert({
        ...input,
        hospitalization_id: hospitalizationId,
        tenant_id: tenantId,
        note_type: input.note_type || 'progress',
      })
      .select()
      .single()

    if (error) throw new Error(`Error al agregar nota: ${error.message}`)
    return data as HospitalizationNote
  }
}
