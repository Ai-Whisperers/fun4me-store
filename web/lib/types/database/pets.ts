/**
 * Pet & Medical Database Tables
 * Pet, Vaccine, MedicalRecord, Prescription, Appointment
 */

import type {
  PetSpecies,
  PetSex,
  PetTemperament,
  DietCategory,
  VaccineStatus,
  MedicalRecordType,
  AppointmentStatus,
} from './enums'

// =============================================================================
// PETS & MEDICAL
// =============================================================================

export interface Pet {
  id: string
  owner_id: string
  tenant_id: string
  name: string
  species: PetSpecies
  breed: string | null
  birth_date: string | null
  weight_kg: number | null
  microchip_number: string | null
  photo_url: string | null
  sex: PetSex | null
  color: string | null
  is_neutered: boolean | null
  temperament: PetTemperament | null
  diet_category: DietCategory | null
  diet_notes: string | null
  allergies: string[] | null
  chronic_conditions: string[] | null
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

export interface Vaccine {
  id: string
  pet_id: string
  name: string
  administered_date: string | null
  next_due_date: string | null
  batch_number: string | null
  manufacturer: string | null
  administered_by: string | null
  status: VaccineStatus
  notes: string | null
  photo_url: string | null
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

export interface MedicalRecord {
  id: string
  pet_id: string
  tenant_id: string
  performed_by: string | null
  type: MedicalRecordType
  title: string
  diagnosis: string | null
  treatment: string | null
  notes: string | null
  attachments: string[] | null
  vital_signs: Record<string, unknown> | null
  weight_kg: number | null
  follow_up_date: string | null
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

export interface Prescription {
  id: string
  pet_id: string
  tenant_id: string
  medical_record_id: string | null
  prescribed_by: string
  medication_name: string
  dosage: string
  frequency: string
  duration: string | null
  quantity: number | null
  instructions: string | null
  start_date: string
  end_date: string | null
  is_active: boolean
  refills_remaining: number
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

export interface Appointment {
  id: string
  tenant_id: string
  pet_id: string
  vet_id: string | null
  created_by: string
  start_time: string
  end_time: string
  status: AppointmentStatus
  reason: string
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at?: string | null
}
