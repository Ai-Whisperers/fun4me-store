/**
 * Medical Records Domain
 * Barrel export for medical records repository and types
 *
 * Note: This module exports Vaccine types for medical records repository compatibility.
 * For new vaccine functionality, use lib/domain/vaccines instead.
 */

// Export all types EXCEPT Vaccine-related (to avoid conflicts with vaccines domain)
export type {
  MedicalRecord,
  MedicalRecordWithDetails,
  MedicalRecordFilters,
  CreateMedicalRecordInput,
  Prescription,
  PrescriptionWithDetails,
  CreatePrescriptionInput,
  MedicationItem,
  MedicalRecordListResult,
} from './types'

// Export repository
export * from './repository'

// Note: Vaccine, VaccineFilters, etc. are NOT re-exported here to avoid conflicts
// They are available from ./types for internal use by the repository
