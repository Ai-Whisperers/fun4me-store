/**
 * Medical Records Repository
 *
 * Data access layer for medical records, vaccines, and prescriptions.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  MedicalRecordWithDetails,
  PrescriptionWithDetails,
  MedicalRecordFilters,
  CreateMedicalRecordInput,
  CreatePrescriptionInput,
  VaccineWithDetails,
  VaccineFilters,
  CreateVaccineInput,
} from './types'

const MEDICAL_RECORD_SELECT = `
  *,
  pet:pets!inner(id, name, species, breed, owner_id),
  vet:profiles!medical_records_vet_id_fkey(id, full_name)
`

const VACCINE_SELECT = `
  *,
  pet:pets!inner(id, name, species, breed, tenant_id),
  administered_by_profile:profiles!vaccines_administered_by_fkey(id, full_name),
  verified_by_profile:profiles!vaccines_verified_by_fkey(id, full_name),
  reactions:vaccine_reactions(id, reaction_detail, severity, created_at)
`

const PRESCRIPTION_SELECT = `
  *,
  pet:pets(id, name, species, breed, owner_id),
  vet:profiles!prescriptions_vet_id_fkey(id, full_name)
`

export class MedicalRecordRepository {
  constructor(private supabase: SupabaseClient) {}

  // ===========================================================================
  // MEDICAL RECORDS
  // ===========================================================================

  async findMedicalRecordById(
    id: string,
    tenantId: string
  ): Promise<MedicalRecordWithDetails | null> {
    const { data, error } = await this.supabase
      .from('medical_records')
      .select(MEDICAL_RECORD_SELECT)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single()

    if (error || !data) return null
    return data as MedicalRecordWithDetails
  }

  async findManyMedicalRecords(
    tenantId: string,
    filters: MedicalRecordFilters = {}
  ): Promise<MedicalRecordWithDetails[]> {
    let query = this.supabase
      .from('medical_records')
      .select(MEDICAL_RECORD_SELECT)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('visit_date', { ascending: false })

    if (filters.pet_id) {
      query = query.eq('pet_id', filters.pet_id)
    }
    if (filters.record_type) {
      query = query.eq('record_type', filters.record_type)
    }
    if (filters.is_emergency !== undefined) {
      query = query.eq('is_emergency', filters.is_emergency)
    }
    if (filters.from_date) {
      query = query.gte('visit_date', filters.from_date)
    }
    if (filters.to_date) {
      query = query.lte('visit_date', filters.to_date)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Error al cargar registros médicos: ${error.message}`)
    }

    return (data || []) as MedicalRecordWithDetails[]
  }

  async createMedicalRecord(
    tenantId: string,
    input: CreateMedicalRecordInput & { vet_id?: string | null }
  ): Promise<MedicalRecordWithDetails> {
    const { data, error } = await this.supabase
      .from('medical_records')
      .insert({
        ...input,
        tenant_id: tenantId,
        visit_date: input.visit_date || new Date().toISOString(),
        attachments: input.attachments || [],
      })
      .select(MEDICAL_RECORD_SELECT)
      .single()

    if (error) {
      throw new Error(`Error al crear registro médico: ${error.message}`)
    }

    return data as MedicalRecordWithDetails
  }

  async updateMedicalRecord(
    id: string,
    tenantId: string,
    updates: Partial<CreateMedicalRecordInput>
  ): Promise<MedicalRecordWithDetails> {
    const { data, error } = await this.supabase
      .from('medical_records')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .select(MEDICAL_RECORD_SELECT)
      .single()

    if (error) {
      throw new Error(`Error al actualizar registro médico: ${error.message}`)
    }

    return data as MedicalRecordWithDetails
  }

  async softDeleteMedicalRecord(
    id: string,
    tenantId: string,
    deletedBy: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('medical_records')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: deletedBy,
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    if (error) {
      throw new Error(`Error al eliminar registro médico: ${error.message}`)
    }
  }

  // ===========================================================================
  // VACCINES
  // ===========================================================================

  async findVaccineById(
    id: string,
    tenantId: string
  ): Promise<VaccineWithDetails | null> {
    const { data, error } = await this.supabase
      .from('vaccines')
      .select(VACCINE_SELECT)
      .eq('id', id)
      .eq('pet.tenant_id', tenantId)
      .single()

    if (error || !data) return null
    return data as VaccineWithDetails
  }

  async findManyVaccines(
    tenantId: string,
    filters: VaccineFilters = {}
  ): Promise<VaccineWithDetails[]> {
    let query = this.supabase
      .from('vaccines')
      .select(VACCINE_SELECT)
      .eq('pet.tenant_id', tenantId)
      .order('administered_date', { ascending: false })

    if (filters.pet_id) {
      query = query.eq('pet_id', filters.pet_id)
    }
    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    if (filters.upcoming) {
      const today = new Date().toISOString().split('T')[0]
      const thirtyDays = new Date()
      thirtyDays.setDate(thirtyDays.getDate() + 30)
      const thirtyDaysStr = thirtyDays.toISOString().split('T')[0]
      query = query.gte('next_due_date', today).lte('next_due_date', thirtyDaysStr)
    }
    if (filters.overdue) {
      const today = new Date().toISOString().split('T')[0]
      query = query.lt('next_due_date', today)
    }
    if (filters.from_date) {
      query = query.gte('administered_date', filters.from_date)
    }
    if (filters.to_date) {
      query = query.lte('administered_date', filters.to_date)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Error al cargar vacunas: ${error.message}`)
    }

    return (data || []) as VaccineWithDetails[]
  }

  async createVaccine(
    input: CreateVaccineInput & { administered_by: string }
  ): Promise<VaccineWithDetails> {
    const { data, error } = await this.supabase
      .from('vaccines')
      .insert({
        ...input,
        status: 'pending',
        photos: input.photos || [],
      })
      .select(`
        *,
        pet:pets(id, name, species),
        administered_by_profile:profiles!vaccines_administered_by_fkey(id, full_name)
      `)
      .single()

    if (error) {
      throw new Error(`Error al crear vacuna: ${error.message}`)
    }

    return data as VaccineWithDetails
  }

  async updateVaccine(
    id: string,
    updates: Partial<CreateVaccineInput> & { status?: string; verified_by?: string }
  ): Promise<VaccineWithDetails> {
    const { data, error } = await this.supabase
      .from('vaccines')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        pet:pets(id, name, species),
        administered_by_profile:profiles!vaccines_administered_by_fkey(id, full_name),
        verified_by_profile:profiles!vaccines_verified_by_fkey(id, full_name)
      `)
      .single()

    if (error) {
      throw new Error(`Error al actualizar vacuna: ${error.message}`)
    }

    return data as VaccineWithDetails
  }

  async deleteVaccine(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('vaccines')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Error al eliminar vacuna: ${error.message}`)
    }
  }

  // ===========================================================================
  // PRESCRIPTIONS
  // ===========================================================================

  async findPrescriptionById(
    id: string,
    tenantId: string
  ): Promise<PrescriptionWithDetails | null> {
    const { data, error } = await this.supabase
      .from('prescriptions')
      .select(PRESCRIPTION_SELECT)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (error || !data) return null
    return data as PrescriptionWithDetails
  }

  async findManyPrescriptions(
    tenantId: string,
    petId?: string
  ): Promise<PrescriptionWithDetails[]> {
    let query = this.supabase
      .from('prescriptions')
      .select(PRESCRIPTION_SELECT)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (petId) {
      query = query.eq('pet_id', petId)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Error al cargar recetas: ${error.message}`)
    }

    return (data || []) as PrescriptionWithDetails[]
  }

  async createPrescription(
    tenantId: string,
    vetId: string,
    input: CreatePrescriptionInput
  ): Promise<PrescriptionWithDetails> {
    const { data, error } = await this.supabase
      .from('prescriptions')
      .insert({
        ...input,
        tenant_id: tenantId,
        vet_id: vetId,
      })
      .select(PRESCRIPTION_SELECT)
      .single()

    if (error) {
      throw new Error(`Error al crear receta: ${error.message}`)
    }

    return data as PrescriptionWithDetails
  }

  async deletePrescription(id: string, tenantId: string): Promise<void> {
    const { error } = await this.supabase
      .from('prescriptions')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      throw new Error(`Error al eliminar receta: ${error.message}`)
    }
  }
}
