/**
 * VaccineService - Vaccination Management Service Layer
 *
 * Handles vaccine operations:
 * - Recording vaccine administrations
 * - Scheduling upcoming vaccines
 * - Tracking reactions and adverse events
 * - Due date reminders
 * - Vaccine certificate generation
 *
 * @example
 * ```typescript
 * const service = new VaccineService(supabase);
 * const result = await service.recordVaccine({
 *   pet_id: 'pet-123',
 *   name: 'Rabies',
 *   administered_date: '2024-01-15',
 *   next_due_date: '2025-01-15'
 * });
 * ```
 */

import { BaseService, type ServiceResult } from './base-service';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type VaccineStatus = 'scheduled' | 'completed' | 'missed' | 'cancelled';
export type VaccineRoute = 'oral' | 'PO' | 'IV' | 'IM' | 'SC' | 'SQ' | 'topical' | 'inhaled' | 'rectal' | 'ophthalmic' | 'otic';
export type ReactionSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ReactionType = 'local' | 'systemic' | 'allergic' | 'anaphylactic' | 'other';

/**
 * Vaccine record from database
 */
export interface Vaccine {
  id: string;
  pet_id: string;
  administered_by_clinic: string | null;
  template_id: string | null;
  administered_by: string | null;
  name: string;
  batch_number: string | null;
  manufacturer: string | null;
  route: VaccineRoute | null;
  dosage: string | null;
  lot_expiry: string | null;
  administered_date: string;
  next_due_date: string | null;
  status: VaccineStatus;
  vet_signature: string | null;
  certificate_url: string | null;
  adverse_reactions: string | null;
  photos: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Vaccine with related data
 */
export interface VaccineWithRelations extends Vaccine {
  pet?: {
    id: string;
    name: string;
    species: string;
    owner?: { full_name: string };
  };
  administered_by_profile?: {
    id: string;
    full_name: string;
  };
}

/**
 * Vaccine template (schedule reference)
 */
export interface VaccineTemplate {
  id: string;
  tenant_id: string | null;
  name: string;
  code: string | null;
  species: string[];
  description: string | null;
  min_age_weeks: number | null;
  recommended_age_weeks: number | null;
  booster_interval_days: number | null;
  is_required: boolean;
  display_order: number;
  is_active: boolean;
}

/**
 * Vaccine reaction record
 */
export interface VaccineReaction {
  id: string;
  tenant_id: string;
  pet_id: string;
  vaccine_id: string | null;
  vaccine_name: string;
  vaccine_brand: string | null;
  reaction_date: string;
  onset_hours: number | null;
  severity: ReactionSeverity;
  reaction_type: ReactionType | null;
  symptoms: string[];
  treatment: string | null;
  outcome: string | null;
  hospitalization_required: boolean;
  recovery_days: number | null;
  notes: string | null;
  reported_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Input for recording a vaccine
 */
export interface RecordVaccineInput extends Record<string, unknown> {
  pet_id: string;
  name: string;
  administered_date: string;
  template_id?: string;
  batch_number?: string;
  manufacturer?: string;
  route?: VaccineRoute;
  dosage?: string;
  lot_expiry?: string;
  next_due_date?: string;
  vet_signature?: string;
  notes?: string;
  administered_by?: string;
}

/**
 * Input for scheduling a vaccine
 */
export interface ScheduleVaccineInput extends Record<string, unknown> {
  pet_id: string;
  name: string;
  scheduled_date: string;
  template_id?: string;
  notes?: string;
}

/**
 * Input for recording a reaction
 */
export interface RecordReactionInput extends Record<string, unknown> {
  pet_id: string;
  vaccine_id?: string;
  vaccine_name: string;
  vaccine_brand?: string;
  reaction_date: string;
  onset_hours?: number;
  severity: ReactionSeverity;
  reaction_type?: ReactionType;
  symptoms?: string[];
  treatment?: string;
  hospitalization_required?: boolean;
  notes?: string;
  reported_by?: string;
}

/**
 * Filter for listing vaccines
 */
export interface VaccineFilters {
  pet_id?: string;
  status?: VaccineStatus;
  from_date?: string;
  to_date?: string;
  overdue_only?: boolean;
  due_within_days?: number;
}

// =============================================================================
// VACCINE SERVICE
// =============================================================================

export class VaccineService extends BaseService {
  // ---------------------------------------------------------------------------
  // VACCINE RECORDS
  // ---------------------------------------------------------------------------

  /**
   * List vaccines for a tenant
   *
   * @param tenantId - Tenant ID
   * @param filters - Optional filters
   * @returns List of vaccine records
   */
  async list(
    tenantId: string,
    filters?: VaccineFilters
  ): Promise<ServiceResult<VaccineWithRelations[]>> {
    return this.handleError(async () => {
      let query = this.supabase
        .from('vaccines')
        .select(`
          *,
          pet:pets!inner(id, name, species, tenant_id, owner:profiles(full_name)),
          administered_by_profile:profiles(id, full_name)
        `)
        .eq('pets.tenant_id', tenantId)
        .is('deleted_at', null)
        .order('administered_date', { ascending: false });

      // Apply filters
      if (filters?.pet_id) {
        query = query.eq('pet_id', filters.pet_id);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.from_date) {
        query = query.gte('administered_date', filters.from_date);
      }

      if (filters?.to_date) {
        query = query.lte('administered_date', filters.to_date);
      }

      const { data, error } = await query;

      if (error) throw error;

      let result = data || [];

      // Apply client-side filters
      if (filters?.overdue_only) {
        const today = new Date().toISOString().split('T')[0];
        result = result.filter(
          (v: { next_due_date: string | null; status: string }) =>
            v.next_due_date && v.next_due_date < today && v.status === 'completed'
        );
      }

      if (filters?.due_within_days) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + filters.due_within_days);
        const futureDateStr = futureDate.toISOString().split('T')[0];
        const today = new Date().toISOString().split('T')[0];
        result = result.filter(
          (v: { next_due_date: string | null; status: string }) =>
            v.next_due_date &&
            v.next_due_date >= today &&
            v.next_due_date <= futureDateStr &&
            v.status === 'completed'
        );
      }

      return result as VaccineWithRelations[];
    }, 'Error al cargar vacunas');
  }

  /**
   * Get pet's vaccination history
   *
   * @param petId - Pet ID
   * @param tenantId - Tenant ID for access control
   * @returns List of vaccines for the pet
   */
  async getPetVaccines(
    petId: string,
    tenantId: string
  ): Promise<ServiceResult<VaccineWithRelations[]>> {
    return this.handleError(async () => {
      // Verify pet belongs to tenant
      const { data: pet, error: petError } = await this.supabase
        .from('pets')
        .select('id, tenant_id')
        .eq('id', petId)
        .single();

      if (petError || !pet) {
        throw new Error('Mascota no encontrada');
      }

      this.validateTenantAccess(pet.tenant_id, tenantId, 'mascota');

      const { data, error } = await this.supabase
        .from('vaccines')
        .select(`
          *,
          administered_by_profile:profiles(id, full_name)
        `)
        .eq('pet_id', petId)
        .is('deleted_at', null)
        .order('administered_date', { ascending: false });

      if (error) throw error;
      return (data || []) as VaccineWithRelations[];
    }, 'Error al cargar historial de vacunación');
  }

  /**
   * Get a single vaccine by ID
   *
   * @param id - Vaccine ID
   * @param tenantId - Tenant ID for access control
   * @returns Vaccine record
   */
  async getById(id: string, tenantId: string): Promise<ServiceResult<VaccineWithRelations>> {
    return this.handleError(async () => {
      const { data, error } = await this.supabase
        .from('vaccines')
        .select(`
          *,
          pet:pets(id, name, species, tenant_id, owner:profiles(full_name)),
          administered_by_profile:profiles(id, full_name)
        `)
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Vacuna no encontrada');

      // Verify access through pet's tenant
      this.validateTenantAccess(data.pet.tenant_id, tenantId, 'vacuna');

      return data as VaccineWithRelations;
    }, 'Error al cargar vacuna');
  }

  /**
   * Record a vaccine administration
   *
   * @param tenantId - Tenant ID (clinic administering)
   * @param input - Vaccine data
   * @returns Created vaccine record
   */
  async recordVaccine(
    tenantId: string,
    input: RecordVaccineInput
  ): Promise<ServiceResult<Vaccine>> {
    return this.handleError(async () => {
      this.validateRequiredFields(input, ['pet_id', 'name', 'administered_date']);

      // Verify pet exists and belongs to tenant
      const { data: pet, error: petError } = await this.supabase
        .from('pets')
        .select('id, tenant_id')
        .eq('id', input.pet_id)
        .single();

      if (petError || !pet) {
        throw new Error('Mascota no encontrada');
      }

      this.validateTenantAccess(pet.tenant_id, tenantId, 'mascota');

      const { data, error } = await this.supabase
        .from('vaccines')
        .insert({
          pet_id: input.pet_id,
          administered_by_clinic: tenantId,
          template_id: input.template_id || null,
          name: input.name,
          batch_number: input.batch_number || null,
          manufacturer: input.manufacturer || null,
          route: input.route || null,
          dosage: input.dosage || null,
          lot_expiry: input.lot_expiry || null,
          administered_date: input.administered_date,
          next_due_date: input.next_due_date || null,
          status: 'completed',
          vet_signature: input.vet_signature || null,
          notes: input.notes || null,
          administered_by: input.administered_by || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Vaccine;
    }, 'Error al registrar vacuna');
  }

  /**
   * Schedule an upcoming vaccine
   *
   * @param tenantId - Tenant ID
   * @param input - Schedule data
   * @returns Created scheduled vaccine
   */
  async scheduleVaccine(
    tenantId: string,
    input: ScheduleVaccineInput
  ): Promise<ServiceResult<Vaccine>> {
    return this.handleError(async () => {
      this.validateRequiredFields(input, ['pet_id', 'name', 'scheduled_date']);

      // Verify pet exists and belongs to tenant
      const { data: pet, error: petError } = await this.supabase
        .from('pets')
        .select('id, tenant_id')
        .eq('id', input.pet_id)
        .single();

      if (petError || !pet) {
        throw new Error('Mascota no encontrada');
      }

      this.validateTenantAccess(pet.tenant_id, tenantId, 'mascota');

      const { data, error } = await this.supabase
        .from('vaccines')
        .insert({
          pet_id: input.pet_id,
          administered_by_clinic: tenantId,
          template_id: input.template_id || null,
          name: input.name,
          administered_date: input.scheduled_date,
          status: 'scheduled',
          notes: input.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Vaccine;
    }, 'Error al programar vacuna');
  }

  /**
   * Update a vaccine record
   *
   * @param id - Vaccine ID
   * @param tenantId - Tenant ID for access control
   * @param updates - Fields to update
   * @returns Updated vaccine record
   */
  async update(
    id: string,
    tenantId: string,
    updates: Partial<RecordVaccineInput>
  ): Promise<ServiceResult<Vaccine>> {
    return this.handleError(async () => {
      // Verify vaccine exists and get pet's tenant
      const existing = await this.getById(id, tenantId);
      if (!existing.success) {
        throw new Error('Vacuna no encontrada');
      }

      const { data, error } = await this.supabase
        .from('vaccines')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Vaccine;
    }, 'Error al actualizar vacuna');
  }

  /**
   * Mark a scheduled vaccine as completed
   *
   * @param id - Vaccine ID
   * @param tenantId - Tenant ID
   * @param completionData - Completion details
   * @returns Updated vaccine
   */
  async markCompleted(
    id: string,
    tenantId: string,
    completionData: {
      administered_by?: string;
      batch_number?: string;
      manufacturer?: string;
      route?: VaccineRoute;
      dosage?: string;
      next_due_date?: string;
      notes?: string;
    }
  ): Promise<ServiceResult<Vaccine>> {
    return this.handleError(async () => {
      const existing = await this.getById(id, tenantId);
      if (!existing.success) {
        throw new Error('Vacuna no encontrada');
      }

      if (existing.data.status !== 'scheduled') {
        throw new Error('Solo se pueden completar vacunas programadas');
      }

      const { data, error } = await this.supabase
        .from('vaccines')
        .update({
          status: 'completed',
          administered_date: new Date().toISOString().split('T')[0],
          ...completionData,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Vaccine;
    }, 'Error al completar vacuna');
  }

  /**
   * Soft delete a vaccine record
   *
   * @param id - Vaccine ID
   * @param tenantId - Tenant ID for access control
   * @param deletedBy - User ID performing deletion
   * @returns Success status
   */
  async delete(
    id: string,
    tenantId: string,
    deletedBy: string
  ): Promise<ServiceResult<void>> {
    return this.handleError(async () => {
      const existing = await this.getById(id, tenantId);
      if (!existing.success) {
        throw new Error('Vacuna no encontrada');
      }

      const { error } = await this.supabase
        .from('vaccines')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: deletedBy,
        })
        .eq('id', id);

      if (error) throw error;
    }, 'Error al eliminar vacuna');
  }

  // ---------------------------------------------------------------------------
  // TEMPLATES
  // ---------------------------------------------------------------------------

  /**
   * Get vaccine templates for scheduling
   *
   * @param tenantId - Tenant ID (gets tenant + global templates)
   * @param species - Filter by species
   * @returns List of templates
   */
  async getTemplates(
    tenantId: string,
    species?: string
  ): Promise<ServiceResult<VaccineTemplate[]>> {
    return this.handleError(async () => {
      let query = this.supabase
        .from('vaccine_templates')
        .select('*')
        .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('display_order', { ascending: true });

      if (species) {
        query = query.contains('species', [species]);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as VaccineTemplate[];
    }, 'Error al cargar plantillas de vacunas');
  }

  // ---------------------------------------------------------------------------
  // REACTIONS
  // ---------------------------------------------------------------------------

  /**
   * Record a vaccine reaction
   *
   * @param tenantId - Tenant ID
   * @param input - Reaction data
   * @returns Created reaction record
   */
  async recordReaction(
    tenantId: string,
    input: RecordReactionInput
  ): Promise<ServiceResult<VaccineReaction>> {
    return this.handleError(async () => {
      this.validateRequiredFields(input, ['pet_id', 'vaccine_name', 'reaction_date', 'severity']);

      // Verify pet belongs to tenant
      const { data: pet, error: petError } = await this.supabase
        .from('pets')
        .select('id, tenant_id')
        .eq('id', input.pet_id)
        .single();

      if (petError || !pet) {
        throw new Error('Mascota no encontrada');
      }

      this.validateTenantAccess(pet.tenant_id, tenantId, 'mascota');

      const { data, error } = await this.supabase
        .from('vaccine_reactions')
        .insert({
          tenant_id: tenantId,
          pet_id: input.pet_id,
          vaccine_id: input.vaccine_id || null,
          vaccine_name: input.vaccine_name,
          vaccine_brand: input.vaccine_brand || null,
          reaction_date: input.reaction_date,
          onset_hours: input.onset_hours || null,
          severity: input.severity,
          reaction_type: input.reaction_type || null,
          symptoms: input.symptoms || [],
          treatment: input.treatment || null,
          hospitalization_required: input.hospitalization_required || false,
          notes: input.notes || null,
          reported_by: input.reported_by || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as VaccineReaction;
    }, 'Error al registrar reacción');
  }

  /**
   * Get reactions for a pet
   *
   * @param petId - Pet ID
   * @param tenantId - Tenant ID for access control
   * @returns List of reactions
   */
  async getPetReactions(
    petId: string,
    tenantId: string
  ): Promise<ServiceResult<VaccineReaction[]>> {
    return this.handleError(async () => {
      // Verify pet belongs to tenant
      const { data: pet, error: petError } = await this.supabase
        .from('pets')
        .select('id, tenant_id')
        .eq('id', petId)
        .single();

      if (petError || !pet) {
        throw new Error('Mascota no encontrada');
      }

      this.validateTenantAccess(pet.tenant_id, tenantId, 'mascota');

      const { data, error } = await this.supabase
        .from('vaccine_reactions')
        .select('*')
        .eq('pet_id', petId)
        .order('reaction_date', { ascending: false });

      if (error) throw error;
      return (data || []) as VaccineReaction[];
    }, 'Error al cargar reacciones');
  }

  // ---------------------------------------------------------------------------
  // REMINDERS & ALERTS
  // ---------------------------------------------------------------------------

  /**
   * Get vaccines due soon for reminders
   *
   * @param tenantId - Tenant ID
   * @param daysAhead - Days to look ahead (default 30)
   * @returns List of due vaccines with pet info
   */
  async getDueVaccines(
    tenantId: string,
    daysAhead: number = 30
  ): Promise<ServiceResult<VaccineWithRelations[]>> {
    return this.list(tenantId, { due_within_days: daysAhead });
  }

  /**
   * Get overdue vaccines
   *
   * @param tenantId - Tenant ID
   * @returns List of overdue vaccines
   */
  async getOverdueVaccines(tenantId: string): Promise<ServiceResult<VaccineWithRelations[]>> {
    return this.list(tenantId, { overdue_only: true });
  }

  /**
   * Get vaccination statistics
   *
   * @param tenantId - Tenant ID
   * @returns Vaccination stats
   */
  async getStats(tenantId: string): Promise<ServiceResult<{
    total_vaccines: number;
    completed_this_month: number;
    scheduled_upcoming: number;
    overdue_count: number;
    reactions_this_year: number;
  }>> {
    return this.handleError(async () => {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startOfYear = new Date(today.getFullYear(), 0, 1);

      // Get all vaccines for tenant
      const { data: vaccines, error: vaccinesError } = await this.supabase
        .from('vaccines')
        .select('id, status, administered_date, next_due_date, pets!inner(tenant_id)')
        .eq('pets.tenant_id', tenantId)
        .is('deleted_at', null);

      if (vaccinesError) throw vaccinesError;

      // Get reactions count
      const { count: reactionsCount, error: reactionsError } = await this.supabase
        .from('vaccine_reactions')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('reaction_date', startOfYear.toISOString().split('T')[0]);

      if (reactionsError) throw reactionsError;

      const todayStr = today.toISOString().split('T')[0];
      const monthStartStr = startOfMonth.toISOString().split('T')[0];

      const stats = {
        total_vaccines: vaccines?.length || 0,
        completed_this_month: vaccines?.filter(
          (v: { status: string; administered_date: string }) =>
            v.status === 'completed' && v.administered_date >= monthStartStr
        ).length || 0,
        scheduled_upcoming: vaccines?.filter(
          (v: { status: string }) => v.status === 'scheduled'
        ).length || 0,
        overdue_count: vaccines?.filter(
          (v: { status: string; next_due_date: string | null }) =>
            v.status === 'completed' && v.next_due_date && v.next_due_date < todayStr
        ).length || 0,
        reactions_this_year: reactionsCount || 0,
      };

      return stats;
    }, 'Error al obtener estadísticas');
  }
}
