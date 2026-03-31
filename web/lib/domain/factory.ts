/**
 * Domain service factory
 * Provides a centralized way to create domain services with proper dependencies
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { AppointmentService } from './appointments'
import { PetService } from './pets'
import { InvoiceService } from './invoices'
import { PaymentService } from './payments'
import { MedicalRecordRepository } from './medical-records'
import { HospitalizationRepository } from './hospitalizations'
import { LabRepository } from './lab'
// All core services have been migrated to domain pattern
import { ClinicalToolsService } from './clinical-tools'
import { MessagingService } from './messaging'
import { ReminderService } from './reminders'
import { SafetyService } from './safety'
import { VaccineService } from './vaccines'
import { UserService } from './users'
import { InventoryService } from './inventory'
import { ConsentService } from './consent'
import { StoreService } from './store'

export class DomainFactory {
  constructor(private supabase: SupabaseClient) {}

  // ===========================================================================
  // CORE DOMAINS
  // ===========================================================================

  createAppointmentService(): AppointmentService {
    return new AppointmentService(this.supabase)
  }

  createPetService(): PetService {
    return new PetService(this.supabase)
  }

  createInvoiceService(): InvoiceService {
    return new InvoiceService(this.supabase)
  }

  createPaymentService(): PaymentService {
    return new PaymentService(this.supabase)
  }

  createUserService(): UserService {
    return new UserService(this.supabase)
  }

  // ===========================================================================
  // CLINICAL DOMAINS
  // ===========================================================================

  createMedicalRecordRepository(): MedicalRecordRepository {
    return new MedicalRecordRepository(this.supabase)
  }

  createHospitalizationRepository(): HospitalizationRepository {
    return new HospitalizationRepository(this.supabase)
  }

  createLabRepository(): LabRepository {
    return new LabRepository(this.supabase)
  }

  createVaccineService(): VaccineService {
    return new VaccineService(this.supabase)
  }

  createClinicalToolsService(): ClinicalToolsService {
    return new ClinicalToolsService(this.supabase)
  }

  // ===========================================================================
  // OPERATIONAL DOMAINS
  // ===========================================================================

  createInventoryService(): InventoryService {
    return new InventoryService(this.supabase)
  }

  createStoreService(): StoreService {
    return new StoreService(this.supabase)
  }

  createConsentService(): ConsentService {
    return new ConsentService(this.supabase)
  }

  // ===========================================================================
  // COMMUNICATION DOMAINS
  // ===========================================================================

  createMessagingService(): MessagingService {
    return new MessagingService(this.supabase)
  }

  createReminderService(): ReminderService {
    return new ReminderService(this.supabase)
  }

  // ===========================================================================
  // PUBLIC HEALTH DOMAINS
  // ===========================================================================

  createSafetyService(): SafetyService {
    return new SafetyService(this.supabase)
  }
}

/**
 * Global domain factory instance
 * Use this for convenience, or create your own instance for testing
 */
let globalFactory: DomainFactory | null = null

export function getDomainFactory(supabase?: SupabaseClient): DomainFactory {
  if (!globalFactory) {
    if (!supabase) {
      throw new Error('Supabase client required for first domain factory creation')
    }
    globalFactory = new DomainFactory(supabase)
  }
  return globalFactory
}
