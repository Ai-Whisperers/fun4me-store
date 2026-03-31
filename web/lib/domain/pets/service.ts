/**
 * Pet service
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { PetRepository } from './repository'
import type { Pet, CreatePetData, UpdatePetData, PetFilters, PetStats } from './types'
import { businessRuleViolation, notFound } from '@/lib/errors'

export class PetService {
  private repository: PetRepository

  constructor(supabase: SupabaseClient) {
    this.repository = new PetRepository(supabase)
  }

  async getPet(id: string): Promise<Pet | null> {
    return this.repository.findById(id)
  }

  async getPets(filters: PetFilters = {}): Promise<Pet[]> {
    return this.repository.findMany(filters)
  }

  async createPet(data: CreatePetData, ownerId: string, tenantId: string): Promise<Pet> {
    // Validate pet data
    this.validatePetData(data)

    // Verify owner belongs to tenant
    await this.verifyOwnerTenant(ownerId, tenantId)

    return this.repository.create(data, ownerId, tenantId)
  }

  async updatePet(id: string, data: UpdatePetData, userId: string, tenantId: string): Promise<Pet> {
    const pet = await this.repository.findById(id)
    if (!pet) {
      throw notFound('Mascota')
    }

    // Check ownership or staff access
    if (pet.owner_id !== userId && pet.tenant_id !== tenantId) {
      throw businessRuleViolation('No tienes permiso para modificar esta mascota')
    }

    this.validatePetData(data)
    return this.repository.update(id, data)
  }

  async deletePet(id: string, userId: string, tenantId: string): Promise<void> {
    const pet = await this.repository.findById(id)
    if (!pet) {
      throw notFound('Mascota')
    }

    if (pet.owner_id !== userId && pet.tenant_id !== tenantId) {
      throw businessRuleViolation('No tienes permiso para eliminar esta mascota')
    }

    return this.repository.delete(id)
  }

  async getPetStats(tenantId: string): Promise<PetStats> {
    return this.repository.getStats(tenantId)
  }

  private validatePetData(data: Partial<CreatePetData>): void {
    if (data.name && data.name.trim().length === 0) {
      throw businessRuleViolation('El nombre de la mascota es requerido')
    }

    if (data.date_of_birth && data.date_of_birth > new Date()) {
      throw businessRuleViolation('La fecha de nacimiento no puede ser futura')
    }

    if (data.weight_kg && (data.weight_kg <= 0 || data.weight_kg > 200)) {
      throw businessRuleViolation('El peso debe estar entre 0.1 y 200 kg')
    }
  }

  private async verifyOwnerTenant(ownerId: string, tenantId: string): Promise<void> {
    const { data: owner, error } = await this.repository
      .getClient()
      .from('profiles')
      .select('tenant_id')
      .eq('id', ownerId)
      .single()

    if (error || !owner || owner.tenant_id !== tenantId) {
      throw businessRuleViolation('El dueño no pertenece a esta clínica')
    }
  }
}
