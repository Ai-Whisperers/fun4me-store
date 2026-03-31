import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

// Raw response shape from Supabase (nested relations come as arrays)
interface RawAppointmentFromDB {
  id: string
  start_time: string
  end_time: string
  status: string
  reason: string
  pets:
    | {
        id: string
        name: string
        species: string
        photo_url?: string | null
        owner:
          | {
              id: string
              full_name: string
              phone?: string | null
            }
          | {
              id: string
              full_name: string
              phone?: string | null
            }[]
          | null
      }
    | {
        id: string
        name: string
        species: string
        photo_url?: string | null
        owner:
          | {
              id: string
              full_name: string
              phone?: string | null
            }
          | {
              id: string
              full_name: string
              phone?: string | null
            }[]
          | null
      }[]
    | null
}

interface TodayAppointment {
  id: string
  start_time: string
  end_time: string
  status: string
  reason: string
  pets: {
    id: string
    name: string
    species: string
    photo_url?: string | null
    owner?: {
      id: string
      full_name: string
      phone?: string | null
    }
  } | null
}

export async function getTodayAppointmentsForClinic(clinicId: string): Promise<TodayAppointment[]> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('appointments')
    .select(
      `
      id,
      start_time,
      end_time,
      status,
      reason,
      pets (
        id,
        name,
        species,
        photo_url,
        owner:profiles!pets_owner_id_fkey (
          id,
          full_name,
          phone
        )
      )
    `
    )
    .eq('tenant_id', clinicId)
    .gte('start_time', `${today}T00:00:00`)
    .lt('start_time', `${today}T23:59:59`)
    .order('start_time', { ascending: true })

  if (error) {
    logger.error('[Appointments] Error fetching today\'s appointments', {
      error: error.message,
      clinicId,
    })
    // In a real app, you might want to throw the error
    // or handle it more gracefully.
    return []
  }

  // The database returns an array of pets for each appointment,
  // but our UI expects a single pet object. This transforms the data.
  const transformedData = ((data || []) as RawAppointmentFromDB[]).map((apt) => {
    const pet = Array.isArray(apt.pets) ? apt.pets[0] : apt.pets
    const owner = pet?.owner ? (Array.isArray(pet.owner) ? pet.owner[0] : pet.owner) : undefined
    return {
      ...apt,
      pets: pet ? { ...pet, owner } : null,
    }
  })

  return transformedData
}
