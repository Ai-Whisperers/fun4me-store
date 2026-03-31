export interface Pet {
  id: string
  name: string
  species: string
  breed: string
  date_of_birth: string
  weight: number
  owner: {
    full_name: string
    phone: string
  }
}

export interface Kennel {
  id: string
  kennel_number: string
  kennel_type: string
  size: string
  location: string
}

export interface AdmissionFormData {
  pet_id: string
  kennel_id: string
  hospitalization_type: string
  admission_diagnosis: string
  treatment_plan: string
  diet_instructions: string
  acuity_level: string
  estimated_discharge_date: string
  emergency_contact_name: string
  emergency_contact_phone: string
}
