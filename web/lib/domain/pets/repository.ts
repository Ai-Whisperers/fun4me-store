/**
 * Pet repository
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Pet, CreatePetData, UpdatePetData, PetFilters, PetStats } from './types'

export class PetRepository {
  constructor(private supabase: SupabaseClient) {}

  getClient(): SupabaseClient {
    return this.supabase
  }

  async findById(id: string): Promise<Pet | null> {
    const { data, error } = await this.supabase
      .from('pets')
      .select(
        `
        *,
        profiles!pets_owner_id_fkey (
          id,
          full_name,
          phone,
          email
        )
      `
      )
      .eq('id', id)
      .single()

    if (error || !data) return null
    return this.transformPet(data)
  }

  async findMany(filters: PetFilters = {}): Promise<Pet[]> {
    let query = this.supabase.from('pets').select(`
        *,
        profiles!pets_owner_id_fkey (
          id,
          full_name,
          phone,
          email
        )
      `)

    if (filters.owner_id) {
      query = query.eq('owner_id', filters.owner_id)
    }
    if (filters.species?.length) {
      query = query.in('species', filters.species)
    }
    if (filters.breed) {
      query = query.ilike('breed', `%${filters.breed}%`)
    }
    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active)
    }

    query = query.order('name', { ascending: true })

    const { data, error } = await query
    if (error) throw error

    return data.map(this.transformPet)
  }

  async create(data: CreatePetData, ownerId: string, tenantId: string): Promise<Pet> {
    const { data: pet, error } = await this.supabase
      .from('pets')
      .insert({
        ...data,
        owner_id: ownerId,
        tenant_id: tenantId,
        is_active: true,
      })
      .select()
      .single()

    if (error) throw error

    const result = await this.findById(pet.id)
    if (!result) throw new Error('Failed to create pet')

    return result
  }

  async update(id: string, data: UpdatePetData): Promise<Pet> {
    const { data: pet, error } = await this.supabase
      .from('pets')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    const result = await this.findById(pet.id)
    if (!result) throw new Error('Failed to update pet')

    return result
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from('pets').delete().eq('id', id)

    if (error) throw error
  }

  async getStats(tenantId: string): Promise<PetStats> {
    // Use optimized database function instead of fetching all records
    const { data, error } = await this.supabase.rpc('get_pet_stats_optimized', {
      p_tenant_id: tenantId
    })

    if (error) throw error

    // The function returns a JSON object with the stats
    return data as PetStats
  }

  private transformPet(data: Record<string, unknown>): Pet {
    const profiles = data.profiles as Record<string, unknown> | null

    return {
      id: data.id as string,
      tenant_id: data.tenant_id as string,
      owner_id: data.owner_id as string,
      name: data.name as string,
      species: data.species as Pet['species'],
      breed: (data.breed as string | null) ?? undefined,
      date_of_birth: data.date_of_birth ? new Date(data.date_of_birth as string) : undefined,
      gender: (data.gender as Pet['gender'] | null) ?? undefined,
      color: (data.color as string | null) ?? undefined,
      weight_kg: (data.weight_kg as number | null) ?? undefined,
      microchip_number: (data.microchip_number as string | null) ?? undefined,
      photo_url: (data.photo_url as string | null) ?? undefined,
      notes: (data.notes as string | null) ?? undefined,
      is_active: data.is_active as boolean,
      created_at: new Date(data.created_at as string),
      updated_at: new Date(data.updated_at as string),
      owner: profiles
        ? {
            id: profiles.id as string,
            full_name: profiles.full_name as string,
            phone: (profiles.phone as string | null) ?? undefined,
            email: (profiles.email as string | null) ?? undefined,
          }
        : undefined,
    }
  }
}
