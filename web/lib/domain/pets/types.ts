/**
 * Domain types for pets
 */

export type PetSpecies = 'dog' | 'cat' | 'bird' | 'rabbit' | 'other'

export interface Pet {
  id: string
  tenant_id: string
  owner_id: string
  name: string
  species: PetSpecies
  breed?: string
  date_of_birth?: Date
  gender?: 'male' | 'female'
  color?: string
  weight_kg?: number
  microchip_number?: string
  photo_url?: string
  notes?: string
  is_active: boolean
  created_at: Date
  updated_at: Date

  // Relations
  owner?: {
    id: string
    full_name: string
    phone?: string
    email?: string
  }
}

export interface CreatePetData {
  name: string
  species: PetSpecies
  breed?: string
  date_of_birth?: Date
  gender?: 'male' | 'female'
  color?: string
  weight_kg?: number
  microchip_number?: string
  photo_url?: string
  notes?: string
}

export interface UpdatePetData {
  name?: string
  species?: PetSpecies
  breed?: string
  date_of_birth?: Date
  gender?: 'male' | 'female'
  color?: string
  weight_kg?: number
  microchip_number?: string
  photo_url?: string
  notes?: string
  is_active?: boolean
}

export interface PetFilters {
  owner_id?: string
  species?: PetSpecies[]
  breed?: string
  is_active?: boolean
}

export interface PetStats {
  total: number
  by_species: Record<PetSpecies, number>
  active: number
  inactive: number
}
