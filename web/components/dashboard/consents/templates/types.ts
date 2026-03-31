/**
 * Consent Templates Types
 *
 * Type definitions and constants for the consent templates module.
 */

export interface TemplateField {
  id: string
  field_name: string
  field_type: string
  field_label: string
  is_required: boolean
  field_options: string[] | null
  display_order: number
}

export interface ConsentTemplate {
  id: string
  tenant_id: string | null
  name: string
  category: string
  content: string
  requires_witness: boolean
  requires_id_verification: boolean
  can_be_revoked: boolean
  default_expiry_days: number | null
  is_active: boolean
  fields: TemplateField[]
}

export interface NewTemplateData {
  name: string
  category: string
  content: string
  requires_witness: boolean
  requires_id_verification: boolean
  can_be_revoked: boolean
  default_expiry_days: number | null
  fields: TemplateField[]
}

export interface FeedbackState {
  type: 'success' | 'error'
  message: string
}

// Constants
export const CATEGORIES = [
  { value: 'surgery', label: 'Cirugía' },
  { value: 'anesthesia', label: 'Anestesia' },
  { value: 'euthanasia', label: 'Eutanasia' },
  { value: 'boarding', label: 'Hospedaje' },
  { value: 'treatment', label: 'Tratamiento' },
  { value: 'vaccination', label: 'Vacunación' },
  { value: 'diagnostic', label: 'Diagnóstico' },
  { value: 'other', label: 'Otro' },
] as const

export const FIELD_TYPES = [
  { value: 'text', label: 'Texto' },
  { value: 'textarea', label: 'Texto largo' },
  { value: 'number', label: 'Número' },
  { value: 'date', label: 'Fecha' },
  { value: 'select', label: 'Selección' },
  { value: 'checkbox', label: 'Casilla' },
] as const

export const CATEGORY_LABELS: Record<string, string> = {
  surgery: 'Cirugía',
  anesthesia: 'Anestesia',
  euthanasia: 'Eutanasia',
  boarding: 'Hospedaje',
  treatment: 'Tratamiento',
  vaccination: 'Vacunación',
  diagnostic: 'Diagnóstico',
  other: 'Otro',
}

export const DEFAULT_NEW_TEMPLATE: NewTemplateData = {
  name: '',
  category: 'treatment',
  content: '',
  requires_witness: false,
  requires_id_verification: false,
  can_be_revoked: true,
  default_expiry_days: null,
  fields: [],
}
