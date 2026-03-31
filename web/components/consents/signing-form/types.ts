export interface TemplateField {
  id: string
  field_name: string
  field_type: string
  field_label: string
  is_required: boolean
  field_options: string[] | null
}

export interface ConsentTemplate {
  id: string
  name: string
  category: string
  content: string
  requires_witness: boolean
  requires_id_verification: boolean
  fields?: TemplateField[]
}

export interface Pet {
  id: string
  name: string
  species: string
  breed: string
  owner_id: string
}

export interface Owner {
  id: string
  full_name: string
  email: string
  phone: string
}

export interface SigningFormData {
  template_id: string
  pet_id: string
  owner_id: string
  field_values: Record<string, unknown>
  signature_data: string
  witness_signature_data?: string
  witness_name?: string
  id_verification_type?: string
  id_verification_number?: string
}
