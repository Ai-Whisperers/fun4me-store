/**
 * Vaccines Service
 *
 * Business logic for vaccine records, templates, and reactions.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { VaccineRepository } from './repository'
import type {
  Vaccine,
  VaccineWithRelations,
  VaccineFilters,
  RecordVaccineInput,
  ScheduleVaccineInput,
  CompleteVaccineInput,
  VaccineTemplate,
  VaccineReaction,
  RecordReactionInput,
  VaccineStats,
} from './types'
import { logger } from '@/lib/logger'

export class VaccineService {
  private repository: VaccineRepository

  constructor(private supabase: SupabaseClient) {
    this.repository = new VaccineRepository(supabase)
  }

  // ===========================================================================
  // VACCINE RECORDS
  // ===========================================================================

  async list(tenantId: string, filters?: VaccineFilters): Promise<VaccineWithRelations[]> {
    let results = await this.repository.findVaccines(tenantId, filters)

    // Client-side filters for overdue and due within days
    if (filters?.overdue_only) {
      const today = new Date().toISOString().split('T')[0]
      results = results.filter(
        (v) => v.next_due_date && v.next_due_date < today && v.status === 'completed'
      )
    }

    if (filters?.due_within_days) {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + filters.due_within_days)
      const futureDateStr = futureDate.toISOString().split('T')[0]
      const today = new Date().toISOString().split('T')[0]
      results = results.filter(
        (v) =>
          v.next_due_date &&
          v.next_due_date >= today &&
          v.next_due_date <= futureDateStr &&
          v.status === 'completed'
      )
    }

    return results
  }

  async getPetVaccines(petId: string, tenantId: string): Promise<VaccineWithRelations[]> {
    // Verify pet belongs to tenant
    const pet = await this.repository.findPetByIdForTenantCheck(petId)
    if (!pet) {
      throw new Error('Mascota no encontrada')
    }

    if (pet.tenant_id !== tenantId) {
      throw new Error('Acceso denegado a esta mascota')
    }

    return this.repository.findPetVaccines(petId)
  }

  async getById(id: string, tenantId: string): Promise<VaccineWithRelations | null> {
    const vaccine = await this.repository.findVaccineById(id)
    if (!vaccine) return null

    // Verify access through pet's tenant
    if (vaccine.pet?.tenant_id && vaccine.pet.tenant_id !== tenantId) {
      throw new Error('Acceso denegado a esta vacuna')
    }

    return vaccine
  }

  async recordVaccine(tenantId: string, input: RecordVaccineInput): Promise<Vaccine> {
    if (!input.pet_id || !input.name || !input.administered_date) {
      throw new Error('Campos requeridos: pet_id, name, administered_date')
    }

    // Verify pet belongs to tenant
    const pet = await this.repository.findPetByIdForTenantCheck(input.pet_id)
    if (!pet) {
      throw new Error('Mascota no encontrada')
    }

    if (pet.tenant_id !== tenantId) {
      throw new Error('Acceso denegado a esta mascota')
    }

    const vaccine = await this.repository.createVaccine(tenantId, input)

    logger.info('[VaccineService] Vaccine recorded', {
      vaccineId: vaccine.id,
      petId: input.pet_id,
      name: input.name,
    })

    return vaccine
  }

  async scheduleVaccine(tenantId: string, input: ScheduleVaccineInput): Promise<Vaccine> {
    if (!input.pet_id || !input.name || !input.scheduled_date) {
      throw new Error('Campos requeridos: pet_id, name, scheduled_date')
    }

    // Verify pet belongs to tenant
    const pet = await this.repository.findPetByIdForTenantCheck(input.pet_id)
    if (!pet) {
      throw new Error('Mascota no encontrada')
    }

    if (pet.tenant_id !== tenantId) {
      throw new Error('Acceso denegado a esta mascota')
    }

    const vaccine = await this.repository.scheduleVaccine(tenantId, input)

    logger.info('[VaccineService] Vaccine scheduled', {
      vaccineId: vaccine.id,
      petId: input.pet_id,
      scheduledDate: input.scheduled_date,
    })

    return vaccine
  }

  async update(
    id: string,
    tenantId: string,
    updates: Partial<RecordVaccineInput>
  ): Promise<Vaccine> {
    // Verify vaccine exists and user has access
    const existing = await this.getById(id, tenantId)
    if (!existing) {
      throw new Error('Vacuna no encontrada')
    }

    return this.repository.updateVaccine(id, updates)
  }

  async markCompleted(
    id: string,
    tenantId: string,
    completionData: CompleteVaccineInput
  ): Promise<Vaccine> {
    const existing = await this.getById(id, tenantId)
    if (!existing) {
      throw new Error('Vacuna no encontrada')
    }

    if (existing.status !== 'scheduled') {
      throw new Error('Solo se pueden completar vacunas programadas')
    }

    const vaccine = await this.repository.completeVaccine(id, completionData)

    logger.info('[VaccineService] Vaccine completed', { vaccineId: id })

    return vaccine
  }

  async delete(id: string, tenantId: string, deletedBy: string): Promise<void> {
    const existing = await this.getById(id, tenantId)
    if (!existing) {
      throw new Error('Vacuna no encontrada')
    }

    await this.repository.softDeleteVaccine(id, deletedBy)

    logger.info('[VaccineService] Vaccine deleted', { vaccineId: id, deletedBy })
  }

  // ===========================================================================
  // TEMPLATES
  // ===========================================================================

  async getTemplates(tenantId: string, species?: string): Promise<VaccineTemplate[]> {
    return this.repository.findTemplates(tenantId, species)
  }

  // ===========================================================================
  // REACTIONS
  // ===========================================================================

  async recordReaction(tenantId: string, input: RecordReactionInput): Promise<VaccineReaction> {
    if (!input.pet_id || !input.vaccine_name || !input.reaction_date || !input.severity) {
      throw new Error('Campos requeridos: pet_id, vaccine_name, reaction_date, severity')
    }

    // Verify pet belongs to tenant
    const pet = await this.repository.findPetByIdForTenantCheck(input.pet_id)
    if (!pet) {
      throw new Error('Mascota no encontrada')
    }

    if (pet.tenant_id !== tenantId) {
      throw new Error('Acceso denegado a esta mascota')
    }

    const reaction = await this.repository.createReaction(tenantId, input)

    logger.info('[VaccineService] Reaction recorded', {
      reactionId: reaction.id,
      petId: input.pet_id,
      severity: input.severity,
    })

    return reaction
  }

  async getPetReactions(petId: string, tenantId: string): Promise<VaccineReaction[]> {
    // Verify pet belongs to tenant
    const pet = await this.repository.findPetByIdForTenantCheck(petId)
    if (!pet) {
      throw new Error('Mascota no encontrada')
    }

    if (pet.tenant_id !== tenantId) {
      throw new Error('Acceso denegado a esta mascota')
    }

    return this.repository.findPetReactions(petId)
  }

  // ===========================================================================
  // REMINDERS & ALERTS
  // ===========================================================================

  async getDueVaccines(tenantId: string, daysAhead: number = 30): Promise<VaccineWithRelations[]> {
    return this.list(tenantId, { due_within_days: daysAhead })
  }

  async getOverdueVaccines(tenantId: string): Promise<VaccineWithRelations[]> {
    return this.list(tenantId, { overdue_only: true })
  }

  // ===========================================================================
  // STATISTICS
  // ===========================================================================

  async getStats(tenantId: string): Promise<VaccineStats> {
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const startOfYear = new Date(today.getFullYear(), 0, 1)

    const vaccines = await this.repository.getVaccinesForStats(tenantId)
    const reactionsCount = await this.repository.getReactionsCountThisYear(
      tenantId,
      startOfYear.toISOString().split('T')[0]
    )

    const todayStr = today.toISOString().split('T')[0]
    const monthStartStr = startOfMonth.toISOString().split('T')[0]

    return {
      total_vaccines: vaccines.length,
      completed_this_month: vaccines.filter(
        (v) => v.status === 'completed' && v.administered_date >= monthStartStr
      ).length,
      scheduled_upcoming: vaccines.filter((v) => v.status === 'scheduled').length,
      overdue_count: vaccines.filter(
        (v) => v.status === 'completed' && v.next_due_date && v.next_due_date < todayStr
      ).length,
      reactions_this_year: reactionsCount,
    }
  }
}
