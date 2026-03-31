/**
 * MedicalRecordService - Medical Records, Vaccines & Prescriptions Service Layer
 *
 * Handles medical data operations:
 * - Medical records (consultation, surgery, exams, etc.)
 * - Vaccines (tracking, due dates, reactions)
 * - Prescriptions (digital prescriptions, medications)
 *
 * @example
 * ```typescript
 * const service = new MedicalRecordService(supabase);
 * const result = await service.createMedicalRecord('pet-123', 'terrapet', {
 *   type: 'consultation',
 *   title: 'Check-up anual',
 *   diagnosis: 'Saludable'
 * });
 * ```
 */

import { BaseService, type ServiceResult } from './base-service';
import { logger } from '@/lib/logger';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Medical record types
 */
export type MedicalRecordType =
  | 'consultation'
  | 'exam'
  | 'surgery'
  | 'hospitalization'
  | 'wellness'
  | 'emergency'
  | 'follow_up'
  | 'vaccination'
  | 'lab_result'
  | 'imaging';

/**
 * Vaccine status
 */
export type VaccineStatus = 'pending' | 'verified' | 'expired';

/**
 * Medical record data structure (matches actual DB schema)
 */
export interface MedicalRecord {
  id: string;
  pet_id: string;
  tenant_id: string;
  vet_id: string | null;
  record_type: MedicalRecordType;
  visit_date: string;
  chief_complaint?: string | null;
  history?: string | null;
  physical_exam?: string | null;
  
  // Individual vitals columns
  weight_kg?: number | null;
  temperature_celsius?: number | null;
  heart_rate_bpm?: number | null;
  respiratory_rate_rpm?: number | null;
  blood_pressure?: string | null;
  body_condition_score?: number | null;
  
  // Assessment
  diagnosis_code?: string | null;
  diagnosis_text?: string | null;
  assessment?: string | null;
  clinical_notes?: string | null;
  
  // Plan
  treatment_plan?: string | null;
  medications_prescribed?: string | null;
  followup_date?: string | null;
  follow_up_notes?: string | null;
  
  // Flags
  is_emergency?: boolean;
  requires_followup?: boolean;
  
  notes?: string | null;
  attachments?: string[];
  
  deleted_at?: string | null;
  deleted_by?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Vaccine data structure
 */
export interface Vaccine {
  id: string;
  pet_id: string;
  name: string;
  administered_date: string;
  next_due_date?: string | null;
  batch_number?: string | null;
  administered_by?: string | null;
  verified_by?: string | null;
  status: VaccineStatus;
  notes?: string | null;
  certificate_url?: string | null;
  photos?: string[];
  created_at: string;
  updated_at: string;
}

/**
 * Medication item in prescription
 */
export interface MedicationItem {
  name: string;
  dose: string;
  frequency: string;
  duration?: string;
  instructions?: string;
}

/**
 * Prescription data structure
 */
export interface Prescription {
  id: string;
  pet_id: string;
  tenant_id: string;
  vet_id: string;
  medications: MedicationItem[]; // JSONB array
  diagnosis?: string | null;
  notes?: string | null;
  valid_until: string;
  signature_url?: string | null;
  created_at: string;
}

/**
 * Input for creating a medical record (matches actual DB schema)
 */
export interface CreateMedicalRecordData {
  pet_id: string;
  vet_id?: string | null;
  record_type: MedicalRecordType;
  visit_date?: string;
  chief_complaint?: string | null;
  history?: string | null;
  physical_exam?: string | null;
  
  // Individual vitals
  weight_kg?: number | null;
  temperature_celsius?: number | null;
  heart_rate_bpm?: number | null;
  respiratory_rate_rpm?: number | null;
  blood_pressure?: string | null;
  body_condition_score?: number | null;
  
  // Assessment
  diagnosis_code?: string | null;
  diagnosis_text?: string | null;
  assessment?: string | null;
  clinical_notes?: string | null;
  
  // Plan
  treatment_plan?: string | null;
  medications_prescribed?: string | null;
  followup_date?: string | null;
  follow_up_notes?: string | null;
  
  // Flags
  is_emergency?: boolean;
  requires_followup?: boolean;
  
  notes?: string | null;
  attachments?: string[];
}

/**
 * Input for creating a vaccine
 */
export interface CreateVaccineData {
  pet_id: string;
  name: string;
  administered_date: string;
  next_due_date?: string | null;
  batch_number?: string | null;
  notes?: string | null;
  certificate_url?: string | null;
  photos?: string[];
}

/**
 * Input for creating a prescription
 */
export interface CreatePrescriptionData {
  pet_id: string;
  medications: MedicationItem[]; // JSONB array
  diagnosis?: string | null;
  notes?: string | null;
  valid_until: string;
  signature_url?: string | null;
}

/**
 * Filters for listing medical records
 */
export interface MedicalRecordFilters {
  pet_id?: string;
  record_type?: MedicalRecordType;
  from_date?: string;
  to_date?: string;
  is_emergency?: boolean;
}

/**
 * Filters for listing vaccines
 */
export interface VaccineFilters {
  pet_id?: string;
  status?: VaccineStatus;
  upcoming?: boolean; // Due within 30 days
  overdue?: boolean; // Past due date
  from_date?: string;
  to_date?: string;
}

// =============================================================================
// MEDICAL RECORD SERVICE
// =============================================================================

export class MedicalRecordService extends BaseService {
  // ---------------------------------------------------------------------------
  // MEDICAL RECORDS
  // ---------------------------------------------------------------------------

  /**
   * List medical records for a tenant
   *
   * @param tenantId - Tenant ID
   * @param filters - Optional filters
   * @returns List of medical records with pet and vet info
   */
  async listMedicalRecords(
    tenantId: string,
    filters?: MedicalRecordFilters
  ): Promise<ServiceResult<MedicalRecord[]>> {
    return this.handleError(async () => {
      let query = this.supabase
        .from('medical_records')
        .select(
          `
          *,
          pet:pets!inner(id, name, species, breed),
          vet:profiles!medical_records_vet_id_fkey(id, full_name)
        `
        )
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('visit_date', { ascending: false });

      // Apply filters
      if (filters?.pet_id) {
        query = query.eq('pet_id', filters.pet_id);
      }

      if (filters?.record_type) {
        query = query.eq('record_type', filters.record_type);
      }

      if (filters?.is_emergency !== undefined) {
        query = query.eq('is_emergency', filters.is_emergency);
      }

      if (filters?.from_date) {
        query = query.gte('visit_date', filters.from_date);
      }

      if (filters?.to_date) {
        query = query.lte('visit_date', filters.to_date);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    }, 'Failed to fetch medical records');
  }

  /**
   * Get a medical record by ID
   *
   * @param id - Medical record ID
   * @param tenantId - Tenant ID for access control
   * @returns Medical record with relations
   */
  async getMedicalRecordById(id: string, tenantId: string): Promise<ServiceResult<MedicalRecord>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('medical_records')
        .select(
          `
          *,
          pet:pets!inner(id, name, species, breed, owner_id),
          vet:profiles!medical_records_vet_id_fkey(id, full_name)
        `
        )
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Medical record not found');
      return data;
    }, 'Failed to fetch medical record');
  }

  /**
   * Create a new medical record
   *
   * @param tenantId - Tenant ID
   * @param vetId - Vet user ID (optional)
   * @param recordData - Medical record data
   * @returns Created medical record
   */
  async createMedicalRecord(
    tenantId: string,
    vetId: string | null,
    recordData: CreateMedicalRecordData
  ): Promise<ServiceResult<MedicalRecord>> {
    return this.handleError(async () => {
      // Verify pet belongs to tenant
      const { data: pet } = await this.supabase
        .from('pets')
        .select('id, tenant_id')
        .eq('id', recordData.pet_id)
        .single();

      if (!pet || pet.tenant_id !== tenantId) {
        throw new Error('Pet not found or access denied');
      }

      // Verify diagnosis code if provided (now it's text, not UUID)
      if (recordData.diagnosis_code) {
        const { data: diagCode } = await this.supabase
          .from('diagnosis_codes')
          .select('code')
          .eq('code', recordData.diagnosis_code)
          .single();

        if (!diagCode) {
          logger.warn('Diagnosis code not found in reference table', {
            diagnosisCode: recordData.diagnosis_code,
            tenantId: tenantId
          });
        }
      }

      // Create medical record (tenant_id auto-set by trigger)
      const { data, error } = await this.supabase
        .from('medical_records')
        .insert({
          ...recordData,
          vet_id: vetId || recordData.vet_id,
          visit_date: recordData.visit_date || new Date().toISOString(),
          attachments: recordData.attachments || [],
        })
        .select(
          `
          *,
          pet:pets(id, name, species),
          vet:profiles!medical_records_vet_id_fkey(id, full_name)
        `
        )
        .single();

      if (error) throw error;
      return data;
    }, 'Failed to create medical record');
  }

  /**
   * Update a medical record
   *
   * @param id - Medical record ID
   * @param tenantId - Tenant ID for access control
   * @param updates - Fields to update
   * @returns Updated medical record
   */
  async updateMedicalRecord(
    id: string,
    tenantId: string,
    updates: Partial<CreateMedicalRecordData>
  ): Promise<ServiceResult<MedicalRecord>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('medical_records')
        .update(updates)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .select(
          `
          *,
          pet:pets(id, name, species),
          vet:profiles!medical_records_vet_id_fkey(id, full_name)
        `
        )
        .single();

      if (error) throw error;
      if (!data) throw new Error('Medical record not found');
      return data;
    }, 'Failed to update medical record');
  }

  /**
   * Soft delete a medical record
   *
   * @param id - Medical record ID
   * @param tenantId - Tenant ID for access control
   * @param deletedBy - User ID performing deletion
   * @returns Success boolean
   */
  async deleteMedicalRecord(
    id: string, 
    tenantId: string,
    deletedBy: string
  ): Promise<ServiceResult<boolean>> {
    return this.handleError(async () => {
      const { error } = await this.supabase
        .from('medical_records')
        .update({ 
          deleted_at: new Date().toISOString(),
          deleted_by: deletedBy
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null);

      if (error) throw error;
      return true;
    }, 'Failed to delete medical record');
  }

  // ---------------------------------------------------------------------------
  // VACCINES
  // ---------------------------------------------------------------------------

  /**
   * List vaccines for a tenant
   *
   * @param tenantId - Tenant ID
   * @param filters - Optional filters
   * @returns List of vaccines with pet and vet info
   */
  async listVaccines(tenantId: string, filters?: VaccineFilters): Promise<ServiceResult<Vaccine[]>> {
    return this.handleError(async () => {
      let query = this.supabase
        .from('vaccines')
        .select(
          `
          *,
          pet:pets!inner(id, name, species, breed, tenant_id),
          administered_by_profile:profiles!vaccines_administered_by_fkey(id, full_name),
          verified_by_profile:profiles!vaccines_verified_by_fkey(id, full_name),
          reactions:vaccine_reactions(id, reaction_detail, created_at)
        `
        )
        .eq('pet.tenant_id', tenantId)
        .order('administered_date', { ascending: false });

      // Apply filters
      if (filters?.pet_id) {
        query = query.eq('pet_id', filters.pet_id);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      // Upcoming: next_due_date within 30 days from today
      if (filters?.upcoming) {
        const today = new Date().toISOString().split('T')[0];
        const thirtyDays = new Date();
        thirtyDays.setDate(thirtyDays.getDate() + 30);
        const thirtyDaysStr = thirtyDays.toISOString().split('T')[0];
        query = query.gte('next_due_date', today).lte('next_due_date', thirtyDaysStr);
      }

      // Overdue: next_due_date before today
      if (filters?.overdue) {
        const today = new Date().toISOString().split('T')[0];
        query = query.lt('next_due_date', today);
      }

      if (filters?.from_date) {
        query = query.gte('administered_date', filters.from_date);
      }

      if (filters?.to_date) {
        query = query.lte('administered_date', filters.to_date);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    }, 'Failed to fetch vaccines');
  }

  /**
   * Get a vaccine by ID
   *
   * @param id - Vaccine ID
   * @param tenantId - Tenant ID for access control
   * @returns Vaccine with relations
   */
  async getVaccineById(id: string, tenantId: string): Promise<ServiceResult<Vaccine>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('vaccines')
        .select(
          `
          *,
          pet:pets!inner(id, name, species, breed, tenant_id, owner_id),
          administered_by_profile:profiles!vaccines_administered_by_fkey(id, full_name),
          verified_by_profile:profiles!vaccines_verified_by_fkey(id, full_name),
          reactions:vaccine_reactions(id, reaction_detail, severity, created_at)
        `
        )
        .eq('id', id)
        .eq('pet.tenant_id', tenantId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Vaccine not found');
      return data;
    }, 'Failed to fetch vaccine');
  }

  /**
   * Create a new vaccine record
   *
   * @param tenantId - Tenant ID
   * @param administeredBy - Vet user ID
   * @param vaccineData - Vaccine data
   * @returns Created vaccine
   */
  async createVaccine(
    tenantId: string,
    administeredBy: string,
    vaccineData: CreateVaccineData
  ): Promise<ServiceResult<Vaccine>> {
    return this.handleError(async () => {
      // Verify pet belongs to tenant
      const { data: pet } = await this.supabase
        .from('pets')
        .select('id, tenant_id')
        .eq('id', vaccineData.pet_id)
        .single();

      if (!pet || pet.tenant_id !== tenantId) {
        throw new Error('Pet not found or access denied');
      }

      // Create vaccine
      const { data, error } = await this.supabase
        .from('vaccines')
        .insert({
          ...vaccineData,
          administered_by: administeredBy,
          status: 'pending',
          photos: vaccineData.photos || [],
        })
        .select(
          `
          *,
          pet:pets(id, name, species),
          administered_by_profile:profiles!vaccines_administered_by_fkey(id, full_name)
        `
        )
        .single();

      if (error) throw error;
      return data;
    }, 'Failed to create vaccine');
  }

  /**
   * Update a vaccine record
   *
   * @param id - Vaccine ID
   * @param tenantId - Tenant ID for access control
   * @param updates - Fields to update
   * @returns Updated vaccine
   */
  async updateVaccine(
    id: string,
    tenantId: string,
    updates: Partial<CreateVaccineData>
  ): Promise<ServiceResult<Vaccine>> {
    return this.handleError(async () => {
      // Verify vaccine belongs to tenant
      const { data: vaccine } = await this.supabase
        .from('vaccines')
        .select('id, pet:pets!inner(tenant_id)')
        .eq('id', id)
        .single();

      const vaccinePet = vaccine?.pet as { tenant_id: string } | undefined;
      if (!vaccine || !vaccinePet || vaccinePet.tenant_id !== tenantId) {
        throw new Error('Vaccine not found or access denied');
      }

      const { data, error } = await this.supabase
        .from('vaccines')
        .update(updates)
        .eq('id', id)
        .select(
          `
          *,
          pet:pets(id, name, species),
          administered_by_profile:profiles!vaccines_administered_by_fkey(id, full_name)
        `
        )
        .single();

      if (error) throw error;
      if (!data) throw new Error('Vaccine not found');
      return data;
    }, 'Failed to update vaccine');
  }

  /**
   * Verify a vaccine (update status to verified)
   *
   * @param id - Vaccine ID
   * @param tenantId - Tenant ID for access control
   * @param verifiedBy - Vet user ID
   * @returns Updated vaccine
   */
  async verifyVaccine(
    id: string,
    tenantId: string,
    verifiedBy: string
  ): Promise<ServiceResult<Vaccine>> {
    return this.handleError(async () => {
      // Verify vaccine belongs to tenant
      const { data: vaccine } = await this.supabase
        .from('vaccines')
        .select('id, pet:pets!inner(tenant_id)')
        .eq('id', id)
        .single();

      const vaccinePet = vaccine?.pet as { tenant_id: string } | undefined;
      if (!vaccine || !vaccinePet || vaccinePet.tenant_id !== tenantId) {
        throw new Error('Vaccine not found or access denied');
      }

      const { data, error } = await this.supabase
        .from('vaccines')
        .update({
          status: 'verified',
          verified_by: verifiedBy,
        })
        .eq('id', id)
        .select(
          `
          *,
          pet:pets(id, name, species),
          administered_by_profile:profiles!vaccines_administered_by_fkey(id, full_name),
          verified_by_profile:profiles!vaccines_verified_by_fkey(id, full_name)
        `
        )
        .single();

      if (error) throw error;
      if (!data) throw new Error('Vaccine not found');
      return data;
    }, 'Failed to verify vaccine');
  }

  /**
   * Delete a vaccine record
   *
   * @param id - Vaccine ID
   * @param tenantId - Tenant ID for access control
   * @returns Success boolean
   */
  async deleteVaccine(id: string, tenantId: string): Promise<ServiceResult<boolean>> {
    return this.handleError(async () => {
      // Verify vaccine belongs to tenant
      const { data: vaccine } = await this.supabase
        .from('vaccines')
        .select('id, pet:pets!inner(tenant_id)')
        .eq('id', id)
        .single();

      const vaccinePet = vaccine?.pet as { tenant_id: string } | undefined;
      if (!vaccine || !vaccinePet || vaccinePet.tenant_id !== tenantId) {
        throw new Error('Vaccine not found or access denied');
      }

      const { error } = await this.supabase.from('vaccines').delete().eq('id', id);

      if (error) throw error;
      return true;
    }, 'Failed to delete vaccine');
  }

  // ---------------------------------------------------------------------------
  // PRESCRIPTIONS
  // ---------------------------------------------------------------------------

  /**
   * List prescriptions for a tenant
   *
   * @param tenantId - Tenant ID
   * @param petId - Optional pet ID filter
   * @returns List of prescriptions
   */
  async listPrescriptions(tenantId: string, petId?: string): Promise<ServiceResult<Prescription[]>> {
    return this.handleError(async () => {
      let query = this.supabase
        .from('prescriptions')
        .select(
          `
          *,
          pet:pets!inner(id, name, species, breed),
          vet:profiles!prescriptions_vet_id_fkey(id, full_name)
        `
        )
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (petId) {
        query = query.eq('pet_id', petId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    }, 'Failed to fetch prescriptions');
  }

  /**
   * Get a prescription by ID
   *
   * @param id - Prescription ID
   * @param tenantId - Tenant ID for access control
   * @returns Prescription with relations
   */
  async getPrescriptionById(id: string, tenantId: string): Promise<ServiceResult<Prescription>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('prescriptions')
        .select(
          `
          *,
          pet:pets(id, name, species, breed, owner_id),
          vet:profiles!prescriptions_vet_id_fkey(id, full_name)
        `
        )
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Prescription not found');
      return data;
    }, 'Failed to fetch prescription');
  }

  /**
   * Create a new prescription
   *
   * @param tenantId - Tenant ID
   * @param vetId - Vet user ID
   * @param prescriptionData - Prescription data
   * @returns Created prescription
   */
  async createPrescription(
    tenantId: string,
    vetId: string,
    prescriptionData: CreatePrescriptionData
  ): Promise<ServiceResult<Prescription>> {
    return this.handleError(async () => {
      // Verify pet belongs to tenant
      const { data: pet } = await this.supabase
        .from('pets')
        .select('id, tenant_id')
        .eq('id', prescriptionData.pet_id)
        .single();

      if (!pet || pet.tenant_id !== tenantId) {
        throw new Error('Pet not found or access denied');
      }

      // Create prescription
      const { data, error } = await this.supabase
        .from('prescriptions')
        .insert({
          ...prescriptionData,
          tenant_id: tenantId,
          vet_id: vetId,
        })
        .select(
          `
          *,
          pet:pets(id, name, species),
          vet:profiles!prescriptions_vet_id_fkey(id, full_name)
        `
        )
        .single();

      if (error) throw error;
      return data;
    }, 'Failed to create prescription');
  }

  /**
   * Delete a prescription
   *
   * @param id - Prescription ID
   * @param tenantId - Tenant ID for access control
   * @returns Success boolean
   */
  async deletePrescription(id: string, tenantId: string): Promise<ServiceResult<boolean>> {
    return this.handleError(async () => {
      const { error } = await this.supabase
        .from('prescriptions')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      return true;
    }, 'Failed to delete prescription');
  }
}
