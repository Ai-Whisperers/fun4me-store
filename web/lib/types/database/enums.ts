/**
 * Database Enum Types
 * All enum types used across database tables
 */

// Re-export core status types from canonical source
import type { AppointmentStatus, InvoiceStatus } from '../status'
export type { AppointmentStatus, InvoiceStatus }

// =============================================================================
// User & Profile
// =============================================================================

export type UserRole = 'owner' | 'vet' | 'admin'

// =============================================================================
// Pet
// =============================================================================

export type PetSpecies =
  | 'dog'
  | 'cat'
  | 'bird'
  | 'rabbit'
  | 'hamster'
  | 'fish'
  | 'reptile'
  | 'other'

export type PetSex = 'male' | 'female' | 'unknown'
export type PetTemperament = 'friendly' | 'shy' | 'aggressive' | 'nervous' | 'calm'
export type DietCategory =
  | 'dry'
  | 'wet'
  | 'raw'
  | 'homemade'
  | 'prescription'
  | 'mixed'
  | 'balanced'

// =============================================================================
// Medical
// =============================================================================

export type VaccineStatus = 'pending' | 'verified' | 'expired' | 'exempted'

export type MedicalRecordType =
  | 'consultation'
  | 'exam'
  | 'surgery'
  | 'vaccination'
  | 'emergency'
  | 'follow_up'
  | 'lab'
  | 'imaging'
  | 'dental'
  | 'grooming'
  | 'other'

// =============================================================================
// Payment
// =============================================================================

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'check' | 'credit' | 'other'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled'

// =============================================================================
// Reminders & Notifications
// =============================================================================

export type ReminderType =
  | 'vaccine'
  | 'appointment'
  | 'follow_up'
  | 'medication'
  | 'checkup'
  | 'custom'

export type ReminderStatus = 'pending' | 'sent' | 'acknowledged' | 'snoozed' | 'cancelled'
export type NotificationChannel = 'in_app' | 'sms' | 'whatsapp' | 'email' | 'push'

// =============================================================================
// Hospitalization
// =============================================================================

export type HospitalizationType =
  | 'medical'
  | 'surgical'
  | 'boarding'
  | 'observation'
  | 'emergency'
  | 'quarantine'

export type HospitalizationStatus = 'active' | 'discharged' | 'transferred' | 'deceased' | 'escaped'
export type AcuityLevel = 'critical' | 'unstable' | 'stable' | 'improving' | 'ready_for_discharge'

export type KennelType =
  | 'standard'
  | 'large'
  | 'small'
  | 'icu'
  | 'isolation'
  | 'exotic'
  | 'recovery'

export type KennelStatus = 'available' | 'occupied' | 'cleaning' | 'maintenance' | 'reserved'

// =============================================================================
// Laboratory
// =============================================================================

export type LabCategory =
  | 'hematology'
  | 'chemistry'
  | 'urinalysis'
  | 'serology'
  | 'microbiology'
  | 'cytology'
  | 'histopathology'
  | 'parasitology'
  | 'endocrinology'
  | 'coagulation'
  | 'immunology'
  | 'toxicology'
  | 'genetics'
  | 'other'

export type LabOrderStatus =
  | 'ordered'
  | 'specimen_collected'
  | 'in_progress'
  | 'completed'
  | 'partial'
  | 'cancelled'
  | 'rejected'

export type LabResultFlag =
  | 'normal'
  | 'low'
  | 'high'
  | 'critical_low'
  | 'critical_high'
  | 'abnormal'

// =============================================================================
// Consent
// =============================================================================

export type ConsentCategory =
  | 'surgery'
  | 'anesthesia'
  | 'treatment'
  | 'euthanasia'
  | 'boarding'
  | 'grooming'
  | 'dental'
  | 'vaccination'
  | 'diagnostic'
  | 'general'
  | 'release'
  | 'financial'
  | 'emergency'
  | 'research'

export type ConsentStatus = 'pending' | 'active' | 'expired' | 'revoked' | 'superseded'
export type SignatureType = 'digital' | 'typed' | 'drawn' | 'biometric' | 'in_person'

// =============================================================================
// Staff
// =============================================================================

export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'intern' | 'volunteer'
export type EmploymentStatus = 'active' | 'on_leave' | 'suspended' | 'terminated'
export type ShiftType = 'regular' | 'overtime' | 'on_call' | 'emergency' | 'training' | 'meeting'
export type TimeOffRequestStatus = 'pending' | 'approved' | 'denied' | 'cancelled' | 'withdrawn'

// =============================================================================
// Messaging
// =============================================================================

export type MessageType =
  | 'text'
  | 'image'
  | 'file'
  | 'audio'
  | 'video'
  | 'location'
  | 'appointment_card'
  | 'invoice_card'
  | 'prescription_card'
  | 'system'

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
export type ConversationStatus = 'open' | 'pending' | 'resolved' | 'closed' | 'spam'
export type ConversationPriority = 'low' | 'normal' | 'high' | 'urgent'

// =============================================================================
// Insurance
// =============================================================================

export type InsuranceClaimType =
  | 'accident'
  | 'illness'
  | 'wellness'
  | 'preventive'
  | 'emergency'
  | 'surgery'
  | 'hospitalization'

export type InsuranceClaimStatus =
  | 'draft'
  | 'pending_documents'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'partially_approved'
  | 'denied'
  | 'paid'
  | 'appealed'
  | 'closed'

export type InsurancePolicyStatus = 'pending' | 'active' | 'expired' | 'cancelled' | 'suspended'
