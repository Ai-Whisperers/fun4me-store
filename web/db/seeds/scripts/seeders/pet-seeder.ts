/**
 * Pet Seeder
 *
 * Creates demo pets for owner profiles.
 * Idempotent: skips existing pets (by owner + name).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { SeederOptions } from './base-seeder'
import { SeederResult, createSeederResult } from '../utils/reporting'

interface DemoPet {
  name: string
  species: 'dog' | 'cat'
  breed: string
  birth_date: string
  weight_kg: number
  sex: 'male' | 'female'
  is_neutered: boolean
  color: string
}

/**
 * Pet templates to assign to owners
 */
const PET_TEMPLATES: DemoPet[] = [
  // Dogs
  {
    name: 'Luna',
    species: 'dog',
    breed: 'Labrador Retriever',
    birth_date: '2021-03-15',
    weight_kg: 28.5,
    sex: 'female',
    is_neutered: true,
    color: 'Dorado',
  },
  {
    name: 'Max',
    species: 'dog',
    breed: 'Pastor Alemán',
    birth_date: '2020-07-22',
    weight_kg: 35.0,
    sex: 'male',
    is_neutered: true,
    color: 'Negro y canela',
  },
  {
    name: 'Rocky',
    species: 'dog',
    breed: 'Bulldog Francés',
    birth_date: '2022-01-10',
    weight_kg: 12.0,
    sex: 'male',
    is_neutered: false,
    color: 'Atigrado',
  },
  {
    name: 'Bella',
    species: 'dog',
    breed: 'Golden Retriever',
    birth_date: '2019-11-05',
    weight_kg: 30.0,
    sex: 'female',
    is_neutered: true,
    color: 'Dorado',
  },
  {
    name: 'Bruno',
    species: 'dog',
    breed: 'Boxer',
    birth_date: '2021-06-20',
    weight_kg: 32.0,
    sex: 'male',
    is_neutered: true,
    color: 'Atigrado',
  },
  {
    name: 'Thor',
    species: 'dog',
    breed: 'Rottweiler',
    birth_date: '2020-09-12',
    weight_kg: 45.0,
    sex: 'male',
    is_neutered: false,
    color: 'Negro y fuego',
  },
  {
    name: 'Simba',
    species: 'dog',
    breed: 'Husky Siberiano',
    birth_date: '2022-02-28',
    weight_kg: 25.0,
    sex: 'male',
    is_neutered: true,
    color: 'Gris y blanco',
  },
  {
    name: 'Coco',
    species: 'dog',
    breed: 'Cocker Spaniel',
    birth_date: '2021-08-15',
    weight_kg: 14.0,
    sex: 'female',
    is_neutered: true,
    color: 'Dorado',
  },
  {
    name: 'Rex',
    species: 'dog',
    breed: 'Doberman',
    birth_date: '2020-04-10',
    weight_kg: 38.0,
    sex: 'male',
    is_neutered: true,
    color: 'Negro y fuego',
  },
  {
    name: 'Toby',
    species: 'dog',
    breed: 'Beagle',
    birth_date: '2022-05-18',
    weight_kg: 11.0,
    sex: 'male',
    is_neutered: false,
    color: 'Tricolor',
  },
  {
    name: 'Duke',
    species: 'dog',
    breed: 'Border Collie',
    birth_date: '2021-01-25',
    weight_kg: 20.0,
    sex: 'male',
    is_neutered: true,
    color: 'Negro y blanco',
  },
  {
    name: 'Buddy',
    species: 'dog',
    breed: 'Poodle',
    birth_date: '2022-09-08',
    weight_kg: 8.0,
    sex: 'male',
    is_neutered: false,
    color: 'Blanco',
  },
  // Cats
  {
    name: 'Michi',
    species: 'cat',
    breed: 'Siamés',
    birth_date: '2022-04-12',
    weight_kg: 4.5,
    sex: 'female',
    is_neutered: true,
    color: 'Crema con puntos marrones',
  },
  {
    name: 'Pelusa',
    species: 'cat',
    breed: 'Persa',
    birth_date: '2021-10-30',
    weight_kg: 5.2,
    sex: 'female',
    is_neutered: true,
    color: 'Blanco',
  },
  {
    name: 'Nieve',
    species: 'cat',
    breed: 'Angora',
    birth_date: '2023-01-15',
    weight_kg: 3.8,
    sex: 'female',
    is_neutered: false,
    color: 'Blanco puro',
  },
  {
    name: 'Tigre',
    species: 'cat',
    breed: 'Bengalí',
    birth_date: '2022-07-20',
    weight_kg: 5.0,
    sex: 'male',
    is_neutered: true,
    color: 'Manchado dorado',
  },
  {
    name: 'Salem',
    species: 'cat',
    breed: 'Bombay',
    birth_date: '2021-12-25',
    weight_kg: 4.8,
    sex: 'male',
    is_neutered: true,
    color: 'Negro',
  },
  {
    name: 'Whiskers',
    species: 'cat',
    breed: 'Maine Coon',
    birth_date: '2020-08-18',
    weight_kg: 7.5,
    sex: 'male',
    is_neutered: true,
    color: 'Atigrado marrón',
  },
  {
    name: 'Garfield',
    species: 'cat',
    breed: 'Exótico de pelo corto',
    birth_date: '2022-03-05',
    weight_kg: 5.5,
    sex: 'male',
    is_neutered: true,
    color: 'Naranja atigrado',
  },
  {
    name: 'Oreo',
    species: 'cat',
    breed: 'Común europeo',
    birth_date: '2023-06-10',
    weight_kg: 4.2,
    sex: 'male',
    is_neutered: false,
    color: 'Negro y blanco',
  },
  {
    name: 'Cleo',
    species: 'cat',
    breed: 'Abisinio',
    birth_date: '2022-11-22',
    weight_kg: 4.0,
    sex: 'female',
    is_neutered: true,
    color: 'Ruddy',
  },
  {
    name: 'Kitty',
    species: 'cat',
    breed: 'Ragdoll',
    birth_date: '2021-09-14',
    weight_kg: 5.8,
    sex: 'female',
    is_neutered: true,
    color: 'Bicolor azul',
  },
  {
    name: 'Mia',
    species: 'cat',
    breed: 'Británico de pelo corto',
    birth_date: '2022-06-30',
    weight_kg: 5.0,
    sex: 'female',
    is_neutered: true,
    color: 'Gris azulado',
  },
]

export class PetSeeder {
  protected client: SupabaseClient
  protected options: SeederOptions

  constructor(client: SupabaseClient, options: SeederOptions) {
    this.client = client
    this.options = options
  }

  getTableName(): string {
    return 'pets'
  }

  async loadData(): Promise<DemoPet[]> {
    return PET_TEMPLATES
  }

  async seed(): Promise<SeederResult> {
    const startTime = new Date()
    const tenantId = this.options.tenantId

    if (!tenantId) {
      return createSeederResult('pets', 0, 0, [], [], startTime)
    }

    // Get owners for this tenant
    const { data: owners } = await this.client
      .from('profiles')
      .select('id, full_name')
      .eq('tenant_id', tenantId)
      .eq('role', 'owner')

    if (!owners || owners.length === 0) {
      return createSeederResult('pets', 0, 0, [], ['No owners found for tenant'], startTime)
    }

    // Check existing pets
    const { data: existingPets } = await this.client
      .from('pets')
      .select('owner_id, name')
      .eq('tenant_id', tenantId)

    const existingSet = new Set((existingPets || []).map((p) => `${p.owner_id}:${p.name}`))

    let created = 0
    let skipped = 0
    const errors: Array<{ error: Error }> = []

    const petTemplates = await this.loadData()
    let petIndex = 0

    // Assign 2-4 pets per owner
    for (const owner of owners) {
      const petsPerOwner = 2 + Math.floor(Math.random() * 3) // 2-4 pets

      for (let i = 0; i < petsPerOwner; i++) {
        const template = petTemplates[petIndex % petTemplates.length]
        petIndex++

        const key = `${owner.id}:${template.name}`
        if (existingSet.has(key)) {
          skipped++
          continue
        }

        if (this.options.dryRun) {
          created++
          continue
        }

        const { error } = await this.client.from('pets').insert({
          tenant_id: tenantId,
          owner_id: owner.id,
          name: template.name,
          species: template.species,
          breed: template.breed,
          birth_date: template.birth_date,
          weight_kg: template.weight_kg,
          sex: template.sex,
          is_neutered: template.is_neutered,
          color: template.color,
        })

        if (error) {
          // Skip duplicates silently
          if (!error.message.includes('duplicate')) {
            errors.push({
              error: new Error(`${template.name} for ${owner.full_name}: ${error.message}`),
            })
          } else {
            skipped++
          }
        } else {
          created++
        }
      }
    }

    return createSeederResult('pets', created, skipped, errors, [], startTime)
  }
}
