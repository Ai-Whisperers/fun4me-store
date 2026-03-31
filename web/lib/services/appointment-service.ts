/**
 * AppointmentService - Business Logic for Appointment Management
 *
 * Handles all appointment-related operations including:
 * - CRUD operations
 * - Slot availability checking
 * - Status transitions (check-in, complete, cancel)
 * - Waitlist management
 * - Recurring appointments
 *
 * @example
 * ```typescript
 * const service = new AppointmentService(supabase);
 * const result = await service.list(tenantId, { status: 'pending' });
 * if (result.success) {
 *   console.log(result.data);
 * }
 * ```
 */

import { BaseService, type ServiceResult } from './base-service';
import type {
  Appointment,
  AppointmentWithDetails,
  CreateAppointmentInput,
  UpdateAppointmentInput,
  AppointmentSlot,
} from '@/lib/types/entities/appointment';
import {
  mapAppointmentsWithDetails,
  mapAppointmentWithDetails,
  type RawAppointmentWithDetails,
} from './mappers/appointment-mapper';

// =============================================================================
// SERVICE-SPECIFIC TYPES
// =============================================================================

/**
 * Filters for listing appointments
 */
export interface AppointmentListFilters {
  /** Filter by appointment status */
  status?: string;
  /** Filter by pet ID */
  pet_id?: string;
  /** Filter by vet ID */
  vet_id?: string;
  /** Filter by service ID */
  service_id?: string;
  /** Start date filter (ISO string) */
  start_date?: string;
  /** End date filter (ISO string) */
  end_date?: string;
  /** Include deleted appointments */
  include_deleted?: boolean;
}

/**
 * Options for slot availability checking
 */
export interface SlotAvailabilityOptions {
  /** Date to check (YYYY-MM-DD) */
  date: string;
  /** Optional vet filter */
  vet_id?: string;
  /** Optional service filter (affects duration) */
  service_id?: string;
  /** Custom slot duration in minutes */
  slot_duration?: number;
}

/**
 * Result from slot availability check
 */
export interface SlotAvailabilityResult {
  date: string;
  clinic: string;
  slotDuration: number;
  slots: AppointmentSlot[];
}

/**
 * Analytics for appointment dashboard
 */
export interface AppointmentAnalytics {
  total_appointments: number;
  completed: number;
  cancelled: number;
  no_shows: number;
  completion_rate: string;
  period_start: string;
}

// =============================================================================
// APPOINTMENT SERVICE
// =============================================================================

export class AppointmentService extends BaseService {
  /**
   * List appointments with optional filters
   *
   * @param tenantId - Tenant ID for isolation
   * @param filters - Optional filters (status, pet, vet, dates)
   * @returns List of appointments with details
   */
  async list(
    tenantId: string,
    filters: AppointmentListFilters = {}
  ): Promise<ServiceResult<AppointmentWithDetails[]>> {
    return this.handleError(
      async () => {
        let query = this.supabase
          .from('appointments')
          .select(`
            id,
            tenant_id,
            pet_id,
            vet_id,
            service_id,
            created_by,
            start_time,
            end_time,
            status,
            reason,
            notes,
            created_at,
            updated_at,
            pet:pets!inner (
              id,
              name,
              species,
              breed,
              photo_url,
              owner:profiles!pets_owner_id_fkey (
                id,
                full_name,
                email,
                phone
              )
            ),
            service:services (
              id,
              name,
              duration_minutes,
              base_price
            ),
            vet:profiles!appointments_vet_id_fkey (
              id,
              full_name
            )
          `)
          .eq('tenant_id', tenantId)
          .order('start_time', { ascending: false });

        // Apply filters
        if (!filters.include_deleted) {
          query = query.is('deleted_at', null);
        }
        if (filters.status) {
          query = query.eq('status', filters.status);
        }
        if (filters.pet_id) {
          query = query.eq('pet_id', filters.pet_id);
        }
        if (filters.vet_id) {
          query = query.eq('vet_id', filters.vet_id);
        }
        if (filters.service_id) {
          query = query.eq('service_id', filters.service_id);
        }
        if (filters.start_date) {
          query = query.gte('start_time', filters.start_date);
        }
        if (filters.end_date) {
          query = query.lte('start_time', filters.end_date);
        }

        const { data, error } = await query;

        if (error) throw error;
        return mapAppointmentsWithDetails(data as RawAppointmentWithDetails[]);
      },
      'Error al obtener las citas',
      { context: { tenantId, filters } }
    );
  }

  /**
   * Get a single appointment by ID
   *
   * @param id - Appointment ID
   * @param tenantId - Tenant ID for validation
   * @returns Appointment with details
   */
  async getById(
    id: string,
    tenantId: string
  ): Promise<ServiceResult<AppointmentWithDetails>> {
    return this.handleError(
      async () => {
        const { data, error } = await this.supabase
          .from('appointments')
          .select(`
            *,
            pet:pets!inner (
              id,
              name,
              species,
              breed,
              photo_url,
              owner:profiles!pets_owner_id_fkey (
                id,
                full_name,
                email,
                phone
              )
            ),
            service:services (
              id,
              name,
              duration_minutes,
              base_price
            ),
            vet:profiles!appointments_vet_id_fkey (
              id,
              full_name
            )
          `)
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .is('deleted_at', null)
          .single();

        if (error) throw error;
        if (!data) throw new Error('Cita no encontrada');

        return mapAppointmentWithDetails(data as RawAppointmentWithDetails);
      },
      'Error al obtener la cita',
      { context: { appointmentId: id, tenantId } }
    );
  }

  /**
   * Create a new appointment
   *
   * @param input - Appointment creation data
   * @returns Created appointment
   */
  async create(input: CreateAppointmentInput): Promise<ServiceResult<Appointment>> {
    return this.handleError(
      async () => {
        // Validate required fields using type-safe approach
        const requiredFields = ['tenant_id', 'pet_id', 'start_time', 'end_time', 'reason', 'created_by'] as const;
        for (const field of requiredFields) {
          if (!input[field]) {
            throw new Error(`Campo requerido: ${field}`);
          }
        }

        // Check for overlapping appointments
        const { data: overlapping } = await this.supabase
          .from('appointments')
          .select('id')
          .eq('tenant_id', input.tenant_id)
          .is('deleted_at', null)
          .not('status', 'in', '(cancelled,completed)')
          .or(`start_time.lte.${input.end_time},end_time.gte.${input.start_time}`)
          .limit(1);

        if (overlapping && overlapping.length > 0) {
          throw new Error('Ya existe una cita en este horario');
        }

        // Create appointment
        const { data, error } = await this.supabase
          .from('appointments')
          .insert({
            tenant_id: input.tenant_id,
            pet_id: input.pet_id,
            vet_id: input.vet_id || null,
            service_id: input.service_id || null,
            created_by: input.created_by,
            start_time: input.start_time,
            end_time: input.end_time,
            status: 'pending',
            reason: input.reason,
            notes: input.notes || null,
          })
          .select()
          .single();

        if (error) {
          const message = this.mapDatabaseError(error);
          throw new Error(message);
        }

        return data as Appointment;
      },
      'Error al crear la cita',
      { context: { input } }
    );
  }

  /**
   * Update an existing appointment
   *
   * @param id - Appointment ID
   * @param tenantId - Tenant ID for validation
   * @param updates - Fields to update
   * @returns Updated appointment
   */
  async update(
    id: string,
    tenantId: string,
    updates: UpdateAppointmentInput
  ): Promise<ServiceResult<Appointment>> {
    return this.handleError(
      async () => {
        // Verify appointment exists and belongs to tenant
        const { data: existing } = await this.supabase
          .from('appointments')
          .select('tenant_id, status')
          .eq('id', id)
          .single();

        if (!existing) {
          throw new Error('Cita no encontrada');
        }

        this.validateTenantAccess(existing.tenant_id, tenantId, 'cita');

        // Check if appointment can be updated
        if (['completed', 'cancelled'].includes(existing.status)) {
          throw new Error(`No se puede modificar una cita ${existing.status}`);
        }

        // Update appointment
        const { data, error } = await this.supabase
          .from('appointments')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single();

        if (error) {
          const message = this.mapDatabaseError(error);
          throw new Error(message);
        }

        return data as Appointment;
      },
      'Error al actualizar la cita',
      { context: { appointmentId: id, tenantId, updates } }
    );
  }

  /**
   * Mark appointment as checked in
   *
   * @param id - Appointment ID
   * @param tenantId - Tenant ID for validation
   * @param userId - User performing the check-in
   * @returns Updated appointment
   */
  async checkIn(
    id: string,
    tenantId: string,
    userId: string
  ): Promise<ServiceResult<Appointment>> {
    return this.handleError(
      async () => {
        const { data: appointment } = await this.supabase
          .from('appointments')
          .select('status, tenant_id')
          .eq('id', id)
          .single();

        if (!appointment) {
          throw new Error('Cita no encontrada');
        }

        this.validateTenantAccess(appointment.tenant_id, tenantId, 'cita');

        if (appointment.status !== 'pending' && appointment.status !== 'confirmed') {
          throw new Error(
            `No se puede registrar una cita con estado: ${appointment.status}`
          );
        }

        const { data, error } = await this.supabase
          .from('appointments')
          .update({
            status: 'checked_in',
            checked_in_at: new Date().toISOString(),
            checked_in_by: userId,
          })
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return data as Appointment;
      },
      'Error al registrar la cita',
      { context: { appointmentId: id, tenantId, userId } }
    );
  }

  /**
   * Mark appointment as completed
   *
   * @param id - Appointment ID
   * @param tenantId - Tenant ID for validation
   * @param userId - User completing the appointment
   * @param notes - Optional completion notes
   * @returns Updated appointment
   */
  async complete(
    id: string,
    tenantId: string,
    userId: string,
    notes?: string
  ): Promise<ServiceResult<Appointment>> {
    return this.handleError(
      async () => {
        const { data: appointment } = await this.supabase
          .from('appointments')
          .select('status, tenant_id, notes')
          .eq('id', id)
          .single();

        if (!appointment) {
          throw new Error('Cita no encontrada');
        }

        this.validateTenantAccess(appointment.tenant_id, tenantId, 'cita');

        if (!['checked_in', 'in_progress'].includes(appointment.status)) {
          throw new Error(
            `No se puede completar una cita con estado: ${appointment.status}`
          );
        }

        const updateData: Record<string, unknown> = {
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: userId,
        };

        if (notes) {
          updateData.notes = appointment.notes
            ? `${appointment.notes}\n[Notas de cierre] ${notes}`
            : `[Notas de cierre] ${notes}`;
        }

        const { data, error } = await this.supabase
          .from('appointments')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return data as Appointment;
      },
      'Error al completar la cita',
      { context: { appointmentId: id, tenantId, userId, notes } }
    );
  }

  /**
   * Cancel an appointment
   *
   * @param id - Appointment ID
   * @param tenantId - Tenant ID for validation
   * @param userId - User cancelling the appointment
   * @param reason - Cancellation reason
   * @returns Updated appointment
   */
  async cancel(
    id: string,
    tenantId: string,
    userId: string,
    reason?: string
  ): Promise<ServiceResult<Appointment>> {
    return this.handleError(
      async () => {
        const { data: appointment } = await this.supabase
          .from('appointments')
          .select('status, tenant_id')
          .eq('id', id)
          .single();

        if (!appointment) {
          throw new Error('Cita no encontrada');
        }

        this.validateTenantAccess(appointment.tenant_id, tenantId, 'cita');

        if (['completed', 'cancelled'].includes(appointment.status)) {
          throw new Error(`No se puede cancelar una cita ${appointment.status}`);
        }

        const updateData: Record<string, unknown> = {
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: userId,
        };

        if (reason) {
          updateData.cancellation_reason = reason;
        }

        const { data, error } = await this.supabase
          .from('appointments')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return data as Appointment;
      },
      'Error al cancelar la cita',
      { context: { appointmentId: id, tenantId, userId, reason } }
    );
  }

  /**
   * Soft delete an appointment (admin only)
   *
   * @param id - Appointment ID
   * @param tenantId - Tenant ID for validation
   * @returns Deleted appointment
   */
  async softDelete(id: string, tenantId: string): Promise<ServiceResult<Appointment>> {
    return this.handleError(
      async () => {
        const { data: appointment } = await this.supabase
          .from('appointments')
          .select('tenant_id')
          .eq('id', id)
          .single();

        if (!appointment) {
          throw new Error('Cita no encontrada');
        }

        this.validateTenantAccess(appointment.tenant_id, tenantId, 'cita');

        const { data, error } = await this.supabase
          .from('appointments')
          .update({
            deleted_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return data as Appointment;
      },
      'Error al eliminar la cita',
      { context: { appointmentId: id, tenantId } }
    );
  }

  /**
   * Get available appointment slots for a date
   *
   * @param tenantId - Tenant ID
   * @param options - Slot availability options
   * @returns Available slots for the date
   */
  async getAvailableSlots(
    tenantId: string,
    options: SlotAvailabilityOptions
  ): Promise<ServiceResult<SlotAvailabilityResult>> {
    return this.handleError(
      async () => {
        // Get service duration if service_id provided
        let slotDuration = options.slot_duration || 30; // default 30 minutes
        if (options.service_id) {
          const { data: service } = await this.supabase
            .from('services')
            .select('duration_minutes')
            .eq('id', options.service_id)
            .single();

          if (service?.duration_minutes) {
            slotDuration = service.duration_minutes;
          }
        }

        // Define working hours (could be fetched from tenant config)
        const workingHours = {
          start: '08:00',
          end: '18:00',
          breakStart: '12:00',
          breakEnd: '14:00',
        };

        // Use database function for slot availability
        const { data: slotsData, error } = await this.supabase.rpc(
          'get_available_slots',
          {
            p_tenant_id: tenantId,
            p_date: options.date,
            p_slot_duration_minutes: slotDuration,
            p_work_start: workingHours.start,
            p_work_end: workingHours.end,
            p_break_start: workingHours.breakStart,
            p_break_end: workingHours.breakEnd,
            p_vet_id: options.vet_id || null,
          }
        );

        if (error) throw error;

        // Transform database response
        const slots: AppointmentSlot[] =
          slotsData?.map((slot: { slot_time: string; is_available: boolean }) => ({
            start_time: slot.slot_time,
            end_time: slot.slot_time, // Will be calculated based on duration
            is_available: slot.is_available,
          })) || [];

        return {
          date: options.date,
          clinic: tenantId,
          slotDuration,
          slots,
        };
      },
      'Error al obtener horarios disponibles',
      { context: { tenantId, options } }
    );
  }

  /**
   * Get appointment analytics for dashboard
   *
   * @param tenantId - Tenant ID
   * @param period - Period to analyze (day, week, month)
   * @returns Analytics data
   */
  async getAnalytics(
    tenantId: string,
    period: 'day' | 'week' | 'month' = 'month'
  ): Promise<ServiceResult<AppointmentAnalytics[]>> {
    return this.handleError(
      async () => {
        // Try materialized view first
        const { data: analytics, error } = await this.supabase
          .from('mv_appointment_analytics')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('period_start', { ascending: false })
          .limit(30);

        if (!error && analytics) {
          return analytics as AppointmentAnalytics[];
        }

        // Fallback to live query
        const now = new Date();
        const startDate = new Date();

        if (period === 'day') {
          startDate.setDate(now.getDate() - 7);
        } else if (period === 'week') {
          startDate.setDate(now.getDate() - 28);
        } else {
          startDate.setMonth(now.getMonth() - 6);
        }

        const { data: appointments } = await this.supabase
          .from('appointments')
          .select('id, status, start_time')
          .eq('tenant_id', tenantId)
          .is('deleted_at', null)
          .gte('start_time', startDate.toISOString())
          .order('start_time', { ascending: true });

        // Group by date
        interface DailyStats {
          total: number;
          completed: number;
          cancelled: number;
          no_show: number;
        }

        const grouped = appointments?.reduce<Record<string, DailyStats>>(
          (acc, apt) => {
            const date = apt.start_time.split('T')[0];
            if (!acc[date]) {
              acc[date] = { total: 0, completed: 0, cancelled: 0, no_show: 0 };
            }
            acc[date].total++;
            if (apt.status === 'completed') acc[date].completed++;
            if (apt.status === 'cancelled') acc[date].cancelled++;
            if (apt.status === 'no_show') acc[date].no_show++;
            return acc;
          },
          {}
        );

        const result: AppointmentAnalytics[] = Object.entries(grouped || {}).map(
          ([date, stats]) => ({
            period_start: date,
            total_appointments: stats.total,
            completed: stats.completed,
            cancelled: stats.cancelled,
            no_shows: stats.no_show,
            completion_rate:
              stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : '0',
          })
        );

        return result;
      },
      'Error al obtener estadísticas de citas',
      { context: { tenantId, period } }
    );
  }
}
