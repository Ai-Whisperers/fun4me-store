/**
 * Hospitalization Service
 *
 * Handles patient hospitalization management:
 * - Kennel management
 * - Patient admissions and discharges
 * - Vital signs monitoring
 * - Medication administration
 * - Treatments and procedures
 * - Feeding logs
 * - Progress notes
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { BaseService, ServiceResult } from './base-service';

// ============================================================================
// Types
// ============================================================================

export type KennelType =
  | 'standard'
  | 'isolation'
  | 'icu'
  | 'recovery'
  | 'large'
  | 'small'
  | 'extra-large'
  | 'oxygen'
  | 'exotic';
export type KennelStatus = 'available' | 'occupied' | 'cleaning' | 'maintenance' | 'reserved';
export type HospitalizationStatus =
  | 'admitted'
  | 'in_treatment'
  | 'stable'
  | 'critical'
  | 'recovering'
  | 'discharged'
  | 'deceased'
  | 'transferred';
export type AcuityLevel = 'low' | 'normal' | 'high' | 'critical';
export type MedicationStatus = 'scheduled' | 'administered' | 'skipped' | 'held';
export type TreatmentStatus = 'scheduled' | 'performed' | 'skipped' | 'pending';
export type FeedingStatus = 'scheduled' | 'completed' | 'refused' | 'partial';
export type FeedingMethod = 'oral' | 'syringe' | 'tube' | 'assisted';
export type NoteType = 'progress' | 'doctor' | 'nursing' | 'discharge' | 'owner_update' | 'other';
export type Mentation = 'bright' | 'quiet' | 'dull' | 'obtunded' | 'comatose';
export type HydrationStatus = 'normal' | 'mild' | 'moderate' | 'severe';
export type MedicationRoute =
  | 'oral'
  | 'IV'
  | 'IM'
  | 'SQ'
  | 'topical'
  | 'inhaled'
  | 'rectal'
  | 'ophthalmic'
  | 'otic';

export interface Kennel {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  location: string | null;
  kennel_type: KennelType;
  max_occupancy: number;
  current_occupancy: number;
  max_weight_kg: number | null;
  features: string[] | null;
  daily_rate: number;
  current_status: KennelStatus;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Hospitalization {
  id: string;
  tenant_id: string;
  pet_id: string;
  kennel_id: string | null;
  primary_vet_id: string | null;
  admitted_by: string | null;
  admission_number: string;
  admitted_at: string;
  expected_discharge: string | null;
  actual_discharge: string | null;
  reason: string;
  diagnosis: string | null;
  notes: string | null;
  discharge_instructions: string | null;
  acuity_level: AcuityLevel;
  status: HospitalizationStatus;
  discharge_notes: string | null;
  discharged_by: string | null;
  follow_up_required: boolean;
  follow_up_date: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  invoice_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface HospitalizationVitals {
  id: string;
  hospitalization_id: string;
  tenant_id: string;
  temperature: number | null;
  heart_rate: number | null;
  respiratory_rate: number | null;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  spo2: number | null;
  weight_kg: number | null;
  pain_score: number | null;
  mentation: Mentation | null;
  hydration_status: HydrationStatus | null;
  notes: string | null;
  recorded_by: string | null;
  recorded_at: string;
  created_at: string;
}

export interface HospitalizationMedication {
  id: string;
  hospitalization_id: string;
  tenant_id: string;
  medication_name: string;
  dose: string;
  route: MedicationRoute | null;
  frequency: string | null;
  scheduled_at: string | null;
  administered_at: string | null;
  skipped_reason: string | null;
  status: MedicationStatus;
  administered_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface HospitalizationTreatment {
  id: string;
  hospitalization_id: string;
  tenant_id: string;
  treatment_type: string;
  description: string;
  scheduled_at: string | null;
  performed_at: string | null;
  status: TreatmentStatus;
  performed_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface HospitalizationFeeding {
  id: string;
  hospitalization_id: string;
  tenant_id: string;
  food_type: string;
  amount: string | null;
  method: FeedingMethod | null;
  scheduled_at: string | null;
  fed_at: string | null;
  consumed_amount: string | null;
  appetite_score: number | null;
  vomited: boolean;
  status: FeedingStatus;
  fed_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface HospitalizationNote {
  id: string;
  hospitalization_id: string;
  tenant_id: string;
  note_type: NoteType;
  content: string;
  created_by: string | null;
  created_at: string;
}

// ============================================================================
// Data Types
// ============================================================================

export interface KennelFilters {
  status?: KennelStatus;
  type?: KennelType;
  isActive?: boolean;
  minWeight?: number;
}

export interface HospitalizationFilters {
  status?: HospitalizationStatus | HospitalizationStatus[];
  acuityLevel?: AcuityLevel;
  petId?: string;
  vetId?: string;
  kennelId?: string;
  activeOnly?: boolean;
}

export interface CreateKennelData {
  name: string;
  code: string;
  location?: string;
  kennel_type?: KennelType;
  max_occupancy?: number;
  max_weight_kg?: number;
  features?: string[];
  daily_rate?: number;
}

export interface UpdateKennelData {
  name?: string;
  location?: string;
  kennel_type?: KennelType;
  max_occupancy?: number;
  max_weight_kg?: number;
  features?: string[];
  daily_rate?: number;
  current_status?: KennelStatus;
  is_active?: boolean;
}

export interface AdmitPatientData {
  pet_id: string;
  kennel_id?: string;
  primary_vet_id?: string;
  admitted_by?: string;
  reason: string;
  diagnosis?: string;
  notes?: string;
  acuity_level?: AcuityLevel;
  expected_discharge?: string;
  estimated_cost?: number;
}

export interface UpdateHospitalizationData {
  kennel_id?: string;
  primary_vet_id?: string;
  diagnosis?: string;
  notes?: string;
  acuity_level?: AcuityLevel;
  expected_discharge?: string;
  estimated_cost?: number;
}

export interface DischargePatientData {
  discharge_notes?: string;
  discharge_instructions?: string;
  discharged_by?: string;
  actual_cost?: number;
  follow_up_required?: boolean;
  follow_up_date?: string;
  invoice_id?: string;
}

export interface RecordVitalsData {
  temperature?: number;
  heart_rate?: number;
  respiratory_rate?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  spo2?: number;
  weight_kg?: number;
  pain_score?: number;
  mentation?: Mentation;
  hydration_status?: HydrationStatus;
  notes?: string;
  recorded_by?: string;
}

export interface ScheduleMedicationData {
  medication_name: string;
  dose: string;
  route?: MedicationRoute;
  frequency?: string;
  scheduled_at?: string;
  notes?: string;
}

export interface AdministerMedicationData {
  administered_by?: string;
  administered_at?: string;
  notes?: string;
}

export interface SkipMedicationData {
  skipped_reason: string;
}

export interface ScheduleTreatmentData {
  treatment_type: string;
  description: string;
  scheduled_at?: string;
  notes?: string;
}

export interface PerformTreatmentData {
  performed_by?: string;
  performed_at?: string;
  notes?: string;
}

export interface ScheduleFeedingData {
  food_type: string;
  amount?: string;
  method?: FeedingMethod;
  scheduled_at?: string;
  notes?: string;
}

export interface CompleteFeedingData {
  fed_by?: string;
  fed_at?: string;
  consumed_amount?: string;
  appetite_score?: number;
  vomited?: boolean;
  notes?: string;
}

export interface CreateNoteData {
  note_type?: NoteType;
  content: string;
  created_by?: string;
}

// ============================================================================
// Service
// ============================================================================

export class HospitalizationService extends BaseService {
  constructor(supabase: SupabaseClient) {
    super(supabase);
  }

  // ==========================================================================
  // Kennels
  // ==========================================================================

  async listKennels(
    tenantId: string,
    filters?: KennelFilters
  ): Promise<ServiceResult<Kennel[]>> {
    return this.handleError(async () => {
      let query = this.supabase
        .from('kennels')
        .select('*')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('name', { ascending: true });

      if (filters?.status) {
        query = query.eq('current_status', filters.status);
      }

      if (filters?.type) {
        query = query.eq('kennel_type', filters.type);
      }

      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }

      if (filters?.minWeight) {
        query = query.gte('max_weight_kg', filters.minWeight);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    }, 'Failed to list kennels');
  }

  async getKennel(kennelId: string, tenantId: string): Promise<ServiceResult<Kennel | null>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('kennels')
        .select('*')
        .eq('id', kennelId)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .maybeSingle();

      if (error) throw error;
      return data;
    }, 'Failed to get kennel');
  }

  async createKennel(
    tenantId: string,
    data: CreateKennelData
  ): Promise<ServiceResult<Kennel>> {
    return this.handleError(async () => {
      const { data: kennel, error } = await this.supabase
        .from('kennels')
        .insert({
          ...data,
          tenant_id: tenantId,
        })
        .select()
        .single();

      if (error) throw error;
      return kennel;
    }, 'Failed to create kennel');
  }

  async updateKennel(
    kennelId: string,
    tenantId: string,
    data: UpdateKennelData
  ): Promise<ServiceResult<Kennel>> {
    return this.handleError(async () => {
      const { data: kennel, error } = await this.supabase
        .from('kennels')
        .update(data)
        .eq('id', kennelId)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) throw error;
      return kennel;
    }, 'Failed to update kennel');
  }

  async getAvailableKennels(
    tenantId: string,
    minWeight?: number
  ): Promise<ServiceResult<Kennel[]>> {
    return this.listKennels(tenantId, {
      status: 'available',
      isActive: true,
      minWeight,
    });
  }

  // ==========================================================================
  // Hospitalizations
  // ==========================================================================

  async listHospitalizations(
    tenantId: string,
    filters?: HospitalizationFilters
  ): Promise<ServiceResult<Hospitalization[]>> {
    return this.handleError(async () => {
      let query = this.supabase
        .from('hospitalizations')
        .select('*')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('admitted_at', { ascending: false });

      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status);
        } else {
          query = query.eq('status', filters.status);
        }
      }

      if (filters?.activeOnly) {
        query = query.not('status', 'in', '(discharged,deceased,transferred)');
      }

      if (filters?.acuityLevel) {
        query = query.eq('acuity_level', filters.acuityLevel);
      }

      if (filters?.petId) {
        query = query.eq('pet_id', filters.petId);
      }

      if (filters?.vetId) {
        query = query.eq('primary_vet_id', filters.vetId);
      }

      if (filters?.kennelId) {
        query = query.eq('kennel_id', filters.kennelId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    }, 'Failed to list hospitalizations');
  }

  async getHospitalization(
    hospitalizationId: string,
    tenantId: string
  ): Promise<ServiceResult<Hospitalization | null>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('hospitalizations')
        .select('*')
        .eq('id', hospitalizationId)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .maybeSingle();

      if (error) throw error;
      return data;
    }, 'Failed to get hospitalization');
  }

  async getActiveHospitalization(
    petId: string,
    tenantId: string
  ): Promise<ServiceResult<Hospitalization | null>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('hospitalizations')
        .select('*')
        .eq('pet_id', petId)
        .eq('tenant_id', tenantId)
        .not('status', 'in', '(discharged,deceased,transferred)')
        .is('deleted_at', null)
        .order('admitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    }, 'Failed to get active hospitalization');
  }

  async admitPatient(
    tenantId: string,
    data: AdmitPatientData
  ): Promise<ServiceResult<Hospitalization>> {
    return this.handleError(async () => {
      // Generate admission number using RPC
      const { data: admissionNumber, error: seqError } = await this.supabase.rpc(
        'generate_admission_number',
        { p_tenant_id: tenantId }
      );

      if (seqError) throw seqError;

      const { data: hospitalization, error } = await this.supabase
        .from('hospitalizations')
        .insert({
          ...data,
          tenant_id: tenantId,
          admission_number: admissionNumber,
          admitted_at: new Date().toISOString(),
          status: 'admitted',
        })
        .select()
        .single();

      if (error) throw error;
      return hospitalization;
    }, 'Failed to admit patient');
  }

  async updateHospitalization(
    hospitalizationId: string,
    tenantId: string,
    data: UpdateHospitalizationData
  ): Promise<ServiceResult<Hospitalization>> {
    return this.handleError(async () => {
      const { data: hospitalization, error } = await this.supabase
        .from('hospitalizations')
        .update(data)
        .eq('id', hospitalizationId)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) throw error;
      return hospitalization;
    }, 'Failed to update hospitalization');
  }

  async updateStatus(
    hospitalizationId: string,
    tenantId: string,
    status: HospitalizationStatus
  ): Promise<ServiceResult<Hospitalization>> {
    return this.handleError(async () => {
      const { data: hospitalization, error } = await this.supabase
        .from('hospitalizations')
        .update({ status })
        .eq('id', hospitalizationId)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) throw error;
      return hospitalization;
    }, 'Failed to update status');
  }

  async dischargePatient(
    hospitalizationId: string,
    tenantId: string,
    data: DischargePatientData
  ): Promise<ServiceResult<Hospitalization>> {
    return this.handleError(async () => {
      const { data: hospitalization, error } = await this.supabase
        .from('hospitalizations')
        .update({
          ...data,
          status: 'discharged',
          actual_discharge: new Date().toISOString(),
        })
        .eq('id', hospitalizationId)
        .eq('tenant_id', tenantId)
        .not('status', 'in', '(discharged,deceased,transferred)')
        .is('deleted_at', null)
        .select()
        .single();

      if (error) throw error;
      return hospitalization;
    }, 'Failed to discharge patient');
  }

  // ==========================================================================
  // Vitals
  // ==========================================================================

  async listVitals(
    hospitalizationId: string,
    tenantId: string
  ): Promise<ServiceResult<HospitalizationVitals[]>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('hospitalization_vitals')
        .select('*')
        .eq('hospitalization_id', hospitalizationId)
        .eq('tenant_id', tenantId)
        .order('recorded_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }, 'Failed to list vitals');
  }

  async recordVitals(
    hospitalizationId: string,
    tenantId: string,
    data: RecordVitalsData
  ): Promise<ServiceResult<HospitalizationVitals>> {
    return this.handleError(async () => {
      const { data: vitals, error } = await this.supabase
        .from('hospitalization_vitals')
        .insert({
          ...data,
          hospitalization_id: hospitalizationId,
          tenant_id: tenantId,
          recorded_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return vitals;
    }, 'Failed to record vitals');
  }

  async getLatestVitals(
    hospitalizationId: string,
    tenantId: string
  ): Promise<ServiceResult<HospitalizationVitals | null>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('hospitalization_vitals')
        .select('*')
        .eq('hospitalization_id', hospitalizationId)
        .eq('tenant_id', tenantId)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    }, 'Failed to get latest vitals');
  }

  // ==========================================================================
  // Medications
  // ==========================================================================

  async listMedications(
    hospitalizationId: string,
    tenantId: string,
    status?: MedicationStatus
  ): Promise<ServiceResult<HospitalizationMedication[]>> {
    return this.handleError(async () => {
      let query = this.supabase
        .from('hospitalization_medications')
        .select('*')
        .eq('hospitalization_id', hospitalizationId)
        .eq('tenant_id', tenantId)
        .order('scheduled_at', { ascending: true });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    }, 'Failed to list medications');
  }

  async scheduleMedication(
    hospitalizationId: string,
    tenantId: string,
    data: ScheduleMedicationData
  ): Promise<ServiceResult<HospitalizationMedication>> {
    return this.handleError(async () => {
      const { data: medication, error } = await this.supabase
        .from('hospitalization_medications')
        .insert({
          ...data,
          hospitalization_id: hospitalizationId,
          tenant_id: tenantId,
          status: 'scheduled',
        })
        .select()
        .single();

      if (error) throw error;
      return medication;
    }, 'Failed to schedule medication');
  }

  async administerMedication(
    medicationId: string,
    tenantId: string,
    data: AdministerMedicationData
  ): Promise<ServiceResult<HospitalizationMedication>> {
    return this.handleError(async () => {
      const { data: medication, error } = await this.supabase
        .from('hospitalization_medications')
        .update({
          ...data,
          status: 'administered',
          administered_at: data.administered_at || new Date().toISOString(),
        })
        .eq('id', medicationId)
        .eq('tenant_id', tenantId)
        .eq('status', 'scheduled')
        .select()
        .single();

      if (error) throw error;
      return medication;
    }, 'Failed to administer medication');
  }

  async skipMedication(
    medicationId: string,
    tenantId: string,
    data: SkipMedicationData
  ): Promise<ServiceResult<HospitalizationMedication>> {
    return this.handleError(async () => {
      const { data: medication, error } = await this.supabase
        .from('hospitalization_medications')
        .update({
          status: 'skipped',
          skipped_reason: data.skipped_reason,
        })
        .eq('id', medicationId)
        .eq('tenant_id', tenantId)
        .eq('status', 'scheduled')
        .select()
        .single();

      if (error) throw error;
      return medication;
    }, 'Failed to skip medication');
  }

  // ==========================================================================
  // Treatments
  // ==========================================================================

  async listTreatments(
    hospitalizationId: string,
    tenantId: string,
    status?: TreatmentStatus
  ): Promise<ServiceResult<HospitalizationTreatment[]>> {
    return this.handleError(async () => {
      let query = this.supabase
        .from('hospitalization_treatments')
        .select('*')
        .eq('hospitalization_id', hospitalizationId)
        .eq('tenant_id', tenantId)
        .order('scheduled_at', { ascending: true });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    }, 'Failed to list treatments');
  }

  async scheduleTreatment(
    hospitalizationId: string,
    tenantId: string,
    data: ScheduleTreatmentData
  ): Promise<ServiceResult<HospitalizationTreatment>> {
    return this.handleError(async () => {
      const { data: treatment, error } = await this.supabase
        .from('hospitalization_treatments')
        .insert({
          ...data,
          hospitalization_id: hospitalizationId,
          tenant_id: tenantId,
          status: 'scheduled',
        })
        .select()
        .single();

      if (error) throw error;
      return treatment;
    }, 'Failed to schedule treatment');
  }

  async performTreatment(
    treatmentId: string,
    tenantId: string,
    data: PerformTreatmentData
  ): Promise<ServiceResult<HospitalizationTreatment>> {
    return this.handleError(async () => {
      const { data: treatment, error } = await this.supabase
        .from('hospitalization_treatments')
        .update({
          ...data,
          status: 'performed',
          performed_at: data.performed_at || new Date().toISOString(),
        })
        .eq('id', treatmentId)
        .eq('tenant_id', tenantId)
        .in('status', ['scheduled', 'pending'])
        .select()
        .single();

      if (error) throw error;
      return treatment;
    }, 'Failed to perform treatment');
  }

  // ==========================================================================
  // Feedings
  // ==========================================================================

  async listFeedings(
    hospitalizationId: string,
    tenantId: string,
    status?: FeedingStatus
  ): Promise<ServiceResult<HospitalizationFeeding[]>> {
    return this.handleError(async () => {
      let query = this.supabase
        .from('hospitalization_feedings')
        .select('*')
        .eq('hospitalization_id', hospitalizationId)
        .eq('tenant_id', tenantId)
        .order('scheduled_at', { ascending: true });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    }, 'Failed to list feedings');
  }

  async scheduleFeeding(
    hospitalizationId: string,
    tenantId: string,
    data: ScheduleFeedingData
  ): Promise<ServiceResult<HospitalizationFeeding>> {
    return this.handleError(async () => {
      const { data: feeding, error } = await this.supabase
        .from('hospitalization_feedings')
        .insert({
          ...data,
          hospitalization_id: hospitalizationId,
          tenant_id: tenantId,
          status: 'scheduled',
        })
        .select()
        .single();

      if (error) throw error;
      return feeding;
    }, 'Failed to schedule feeding');
  }

  async completeFeeding(
    feedingId: string,
    tenantId: string,
    data: CompleteFeedingData
  ): Promise<ServiceResult<HospitalizationFeeding>> {
    return this.handleError(async () => {
      const status: FeedingStatus =
        data.consumed_amount === '0' || data.appetite_score === 0 ? 'refused' : 'completed';

      const { data: feeding, error } = await this.supabase
        .from('hospitalization_feedings')
        .update({
          ...data,
          status,
          fed_at: data.fed_at || new Date().toISOString(),
        })
        .eq('id', feedingId)
        .eq('tenant_id', tenantId)
        .eq('status', 'scheduled')
        .select()
        .single();

      if (error) throw error;
      return feeding;
    }, 'Failed to complete feeding');
  }

  // ==========================================================================
  // Notes
  // ==========================================================================

  async listNotes(
    hospitalizationId: string,
    tenantId: string,
    noteType?: NoteType
  ): Promise<ServiceResult<HospitalizationNote[]>> {
    return this.handleError(async () => {
      let query = this.supabase
        .from('hospitalization_notes')
        .select('*')
        .eq('hospitalization_id', hospitalizationId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (noteType) {
        query = query.eq('note_type', noteType);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    }, 'Failed to list notes');
  }

  async addNote(
    hospitalizationId: string,
    tenantId: string,
    data: CreateNoteData
  ): Promise<ServiceResult<HospitalizationNote>> {
    return this.handleError(async () => {
      const { data: note, error } = await this.supabase
        .from('hospitalization_notes')
        .insert({
          ...data,
          hospitalization_id: hospitalizationId,
          tenant_id: tenantId,
          note_type: data.note_type || 'progress',
        })
        .select()
        .single();

      if (error) throw error;
      return note;
    }, 'Failed to add note');
  }

  // ==========================================================================
  // Statistics
  // ==========================================================================

  async getStats(
    tenantId: string
  ): Promise<
    ServiceResult<{
      totalKennels: number;
      availableKennels: number;
      occupiedKennels: number;
      activeHospitalizations: number;
      criticalPatients: number;
      dischargedToday: number;
    }>
  > {
    return this.handleError(async () => {
      // Get kennel stats
      const { data: kennels, error: kennelError } = await this.supabase
        .from('kennels')
        .select('current_status')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .is('deleted_at', null);

      if (kennelError) throw kennelError;

      const totalKennels = kennels?.length || 0;
      const availableKennels =
        kennels?.filter((k) => k.current_status === 'available').length || 0;
      const occupiedKennels =
        kennels?.filter((k) => k.current_status === 'occupied').length || 0;

      // Get hospitalization stats
      const { data: hospitalizations, error: hospError } = await this.supabase
        .from('hospitalizations')
        .select('status, acuity_level, actual_discharge')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null);

      if (hospError) throw hospError;

      const activeHospitalizations =
        hospitalizations?.filter(
          (h) => !['discharged', 'deceased', 'transferred'].includes(h.status)
        ).length || 0;

      const criticalPatients =
        hospitalizations?.filter(
          (h) =>
            h.acuity_level === 'critical' &&
            !['discharged', 'deceased', 'transferred'].includes(h.status)
        ).length || 0;

      const today = new Date().toISOString().split('T')[0];
      const dischargedToday =
        hospitalizations?.filter((h) => h.actual_discharge?.startsWith(today)).length || 0;

      return {
        totalKennels,
        availableKennels,
        occupiedKennels,
        activeHospitalizations,
        criticalPatients,
        dischargedToday,
      };
    }, 'Failed to get stats');
  }
}
