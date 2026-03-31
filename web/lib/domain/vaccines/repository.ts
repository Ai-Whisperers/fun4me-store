/**
 * Vaccines Repository
 *
 * Data access layer for vaccine records, templates, and reactions.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Vaccine,
  VaccineWithRelations,
  VaccineFilters,
  RecordVaccineInput,
  ScheduleVaccineInput,
  VaccineTemplate,
  VaccineReaction,
  RecordReactionInput,
  VaccineStatus,
} from './types'

export class VaccineRepository {
  constructor(private supabase: SupabaseClient) {}

  // ===========================================================================
  // VACCINE RECORDS
  // ===========================================================================

  async findVaccines(tenantId: string, filters: VaccineFilters = {}): Promise<VaccineWithRelations[]> {
    let query = this.supabase
      .from('vaccines')
      .select(
        `
        *,
        pet:pets!inner(id, name, species, tenant_id, owner:profiles(full_name)),
        administered_by_profile:profiles(id, full_name)
      `
      )
      .eq('pets.tenant_id', tenantId)
      .is('deleted_at', null)
      .order('administered_date', { ascending: false })

    if (filters.pet_id) {
      query = query.eq('pet_id', filters.pet_id)
    }

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.from_date) {
      query = query.gte('administered_date', filters.from_date)
    }

    if (filters.to_date) {
      query = query.lte('administered_date', filters.to_date)
    }

    const { data, error } = await query

    if (error) throw new Error(`Error al cargar vacunas: ${error.message}`)
    return (data || []) as VaccineWithRelations[]
  }

  async findPetVaccines(petId: string): Promise<VaccineWithRelations[]> {
    const { data, error } = await this.supabase
      .from('vaccines')
      .select(
        `
        *,
        administered_by_profile:profiles(id, full_name)
      `
      )
      .eq('pet_id', petId)
      .is('deleted_at', null)
      .order('administered_date', { ascending: false })

    if (error) throw new Error(`Error al cargar historial: ${error.message}`)
    return (data || []) as VaccineWithRelations[]
  }

  async findVaccineById(id: string): Promise<VaccineWithRelations | null> {
    const { data, error } = await this.supabase
      .from('vaccines')
      .select(
        `
        *,
        pet:pets(id, name, species, tenant_id, owner:profiles(full_name)),
        administered_by_profile:profiles(id, full_name)
      `
      )
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Error al cargar vacuna: ${error.message}`)
    }

    return data as VaccineWithRelations
  }

  async findPetByIdForTenantCheck(petId: string): Promise<{ id: string; tenant_id: string } | null> {
    const { data, error } = await this.supabase
      .from('pets')
      .select('id, tenant_id')
      .eq('id', petId)
      .single()

    if (error) return null
    return data
  }

  async createVaccine(tenantId: string, input: RecordVaccineInput): Promise<Vaccine> {
    const { data, error } = await this.supabase
      .from('vaccines')
      .insert({
        pet_id: input.pet_id,
        administered_by_clinic: tenantId,
        template_id: input.template_id || null,
        name: input.name,
        batch_number: input.batch_number || null,
        manufacturer: input.manufacturer || null,
        route: input.route || null,
        dosage: input.dosage || null,
        lot_expiry: input.lot_expiry || null,
        administered_date: input.administered_date,
        next_due_date: input.next_due_date || null,
        status: 'completed',
        vet_signature: input.vet_signature || null,
        notes: input.notes || null,
        administered_by: input.administered_by || null,
      })
      .select()
      .single()

    if (error) throw new Error(`Error al registrar vacuna: ${error.message}`)
    return data as Vaccine
  }

  async scheduleVaccine(tenantId: string, input: ScheduleVaccineInput): Promise<Vaccine> {
    const { data, error } = await this.supabase
      .from('vaccines')
      .insert({
        pet_id: input.pet_id,
        administered_by_clinic: tenantId,
        template_id: input.template_id || null,
        name: input.name,
        administered_date: input.scheduled_date,
        status: 'scheduled',
        notes: input.notes || null,
      })
      .select()
      .single()

    if (error) throw new Error(`Error al programar vacuna: ${error.message}`)
    return data as Vaccine
  }

  async updateVaccine(id: string, updates: Partial<RecordVaccineInput>): Promise<Vaccine> {
    const { data, error } = await this.supabase
      .from('vaccines')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(`Error al actualizar vacuna: ${error.message}`)
    return data as Vaccine
  }

  async updateVaccineStatus(id: string, status: VaccineStatus): Promise<Vaccine> {
    const { data, error } = await this.supabase
      .from('vaccines')
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(`Error al actualizar estado: ${error.message}`)
    return data as Vaccine
  }

  async completeVaccine(id: string, completionData: Record<string, unknown>): Promise<Vaccine> {
    const { data, error } = await this.supabase
      .from('vaccines')
      .update({
        status: 'completed',
        administered_date: new Date().toISOString().split('T')[0],
        ...completionData,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(`Error al completar vacuna: ${error.message}`)
    return data as Vaccine
  }

  async softDeleteVaccine(id: string, deletedBy: string): Promise<void> {
    const { error } = await this.supabase
      .from('vaccines')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: deletedBy,
      })
      .eq('id', id)

    if (error) throw new Error(`Error al eliminar vacuna: ${error.message}`)
  }

  // ===========================================================================
  // TEMPLATES
  // ===========================================================================

  async findTemplates(tenantId: string, species?: string): Promise<VaccineTemplate[]> {
    let query = this.supabase
      .from('vaccine_templates')
      .select('*')
      .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('display_order', { ascending: true })

    if (species) {
      query = query.contains('species', [species])
    }

    const { data, error } = await query

    if (error) throw new Error(`Error al cargar plantillas: ${error.message}`)
    return (data || []) as VaccineTemplate[]
  }

  // ===========================================================================
  // REACTIONS
  // ===========================================================================

  async createReaction(tenantId: string, input: RecordReactionInput): Promise<VaccineReaction> {
    const { data, error } = await this.supabase
      .from('vaccine_reactions')
      .insert({
        tenant_id: tenantId,
        pet_id: input.pet_id,
        vaccine_id: input.vaccine_id || null,
        vaccine_name: input.vaccine_name,
        vaccine_brand: input.vaccine_brand || null,
        reaction_date: input.reaction_date,
        onset_hours: input.onset_hours || null,
        severity: input.severity,
        reaction_type: input.reaction_type || null,
        symptoms: input.symptoms || [],
        treatment: input.treatment || null,
        hospitalization_required: input.hospitalization_required || false,
        notes: input.notes || null,
        reported_by: input.reported_by || null,
      })
      .select()
      .single()

    if (error) throw new Error(`Error al registrar reacción: ${error.message}`)
    return data as VaccineReaction
  }

  async findPetReactions(petId: string): Promise<VaccineReaction[]> {
    const { data, error } = await this.supabase
      .from('vaccine_reactions')
      .select('*')
      .eq('pet_id', petId)
      .order('reaction_date', { ascending: false })

    if (error) throw new Error(`Error al cargar reacciones: ${error.message}`)
    return (data || []) as VaccineReaction[]
  }

  // ===========================================================================
  // STATISTICS
  // ===========================================================================

  async getVaccinesForStats(
    tenantId: string
  ): Promise<Array<{ id: string; status: string; administered_date: string; next_due_date: string | null }>> {
    const { data, error } = await this.supabase
      .from('vaccines')
      .select('id, status, administered_date, next_due_date, pets!inner(tenant_id)')
      .eq('pets.tenant_id', tenantId)
      .is('deleted_at', null)

    if (error) throw new Error(`Error al obtener estadísticas: ${error.message}`)
    return data || []
  }

  async getReactionsCountThisYear(tenantId: string, yearStart: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('vaccine_reactions')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('reaction_date', yearStart)

    if (error) throw new Error(`Error al contar reacciones: ${error.message}`)
    return count || 0
  }
}
