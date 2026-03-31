export interface Pet {
  id: string
  name: string
  species: string
  breed: string | null
  birth_date: string | null
  photo_url: string | null
  sex: string | null
  is_neutered: boolean | null
  microchip_number: string | null
}

export interface Owner {
  id: string
  full_name: string
  email: string
  phone: string | null
  address: string | null
  created_at: string
  last_visit: string | null
  pets: Pet[]
}

export interface FilterOptions {
  searchQuery: string
  species: 'all' | 'dog' | 'cat' | 'other'
  vaccine: 'all' | 'overdue' | 'due-soon' | 'up-to-date' | 'none'
  lastVisit: 'all' | 'recent' | '1-3' | '3-6' | '6+' | 'never'
  neutered: 'all' | 'yes' | 'no'
}

export interface VaccineStatus {
  petId: string
  hasOverdue: boolean
  hasDueSoon: boolean
  hasVaccines: boolean
}

export interface InsightsData {
  dogs: number
  cats: number
  others: number
  vaccinesPending: number
  vaccinesOverdue: number
  pendingFiles: number
  needsFollowUp: number
  newThisMonth: number
}

export interface PetsByOwnerProps {
  clinic: string
  owners: Owner[]
  insights: InsightsData
  vaccineStatusByPet: Record<string, VaccineStatus>
}
