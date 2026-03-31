/**
 * Appointment service
 * Contains all business logic for appointment management
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { AppointmentRepository } from './repository'
import type {
  Appointment,
  CreateAppointmentData,
  UpdateAppointmentData,
  AppointmentFilters,
  AppointmentStats,
  AppointmentStatus,
  AvailabilityCheckParams,
  StatusTransition,
} from './types'
import { businessRuleViolation, notFound, conflict } from '@/lib/errors'

export class AppointmentService {
  private repository: AppointmentRepository

  constructor(supabase: SupabaseClient) {
    this.repository = new AppointmentRepository(supabase)
  }

  /**
   * Get appointment by ID
   */
  async getAppointment(id: string): Promise<Appointment | null> {
    return this.repository.findById(id)
  }

  /**
   * Get appointments with filters
   */
  async getAppointments(filters: AppointmentFilters = {}): Promise<Appointment[]> {
    return this.repository.findMany(filters)
  }

  /**
   * Create new appointment
   */
  async createAppointment(
    data: CreateAppointmentData,
    userId: string,
    tenantId: string
  ): Promise<Appointment> {
    // Business rules validation
    await this.validateAppointmentCreation(data, tenantId)

    // Check slot availability
    const isAvailable = await this.repository.checkSlotAvailability({
      tenant_id: tenantId,
      date: data.start_time.toISOString().split('T')[0],
      work_start: data.start_time.toTimeString().slice(0, 5),
      work_end: data.end_time.toTimeString().slice(0, 5),
      vet_id: data.vet_id,
    })

    if (!isAvailable) {
      throw conflict('horario no disponible')
    }

    return this.repository.create(data, userId, tenantId)
  }

  /**
   * Update appointment
   * Uses atomic reschedule function for time changes to prevent race conditions
   */
  async updateAppointment(
    id: string,
    data: UpdateAppointmentData,
    userId: string,
    isStaff: boolean = false
  ): Promise<Appointment> {
    const appointment = await this.repository.findById(id)
    if (!appointment) {
      throw notFound('Cita')
    }

    // Validate status transition if status is being changed
    if (data.status && data.status !== appointment.status) {
      this.validateStatusTransition(appointment.status, data.status, isStaff)
    }

    // Use atomic reschedule for time changes to prevent race conditions
    if (data.start_time || data.end_time) {
      const newStartTime = data.start_time || appointment.start_time
      const newEndTime = data.end_time || appointment.end_time

      // Call atomic reschedule function
      const { data: result, error: rpcError } = await this.repository
        .getClient()
        .rpc('reschedule_appointment_atomic', {
          p_appointment_id: id,
          p_new_start_time: newStartTime.toISOString(),
          p_new_end_time: newEndTime.toISOString(),
          p_performed_by: userId,
        })

      if (rpcError) {
        throw new Error(`Error al reprogramar: ${rpcError.message}`)
      }

      if (!result?.success) {
        if (result?.error_code === 'slot_taken') {
          throw conflict(result?.error || 'El horario no está disponible')
        }
        throw businessRuleViolation(result?.error || 'No se pudo reprogramar la cita')
      }

      // If there are other fields to update (notes, etc.), update them separately
      const otherFields = { ...data }
      delete otherFields.start_time
      delete otherFields.end_time

      if (Object.keys(otherFields).length > 0) {
        return this.repository.update(id, otherFields, userId)
      }

      // Refetch the updated appointment
      const updated = await this.repository.findById(id)
      if (!updated) throw new Error('Error al obtener cita actualizada')
      return updated
    }

    return this.repository.update(id, data, userId)
  }

  /**
   * Cancel appointment
   */
  async cancelAppointment(
    id: string,
    userId: string,
    reason?: string,
    isStaff: boolean = false
  ): Promise<Appointment> {
    const appointment = await this.repository.findById(id)
    if (!appointment) {
      throw notFound('Cita')
    }

    // Check permissions
    if (!isStaff && appointment.pet?.owner_id !== userId) {
      throw businessRuleViolation('Solo el dueño o personal pueden cancelar citas')
    }

    // Check if can be cancelled
    if (!this.canCancelAppointment(appointment)) {
      throw businessRuleViolation('Esta cita no puede ser cancelada')
    }

    const updateData: UpdateAppointmentData = {
      status: 'cancelled',
      notes: reason ? `[Cancelado] ${reason}` : '[Cancelado por el cliente]',
    }

    return this.repository.update(id, updateData, userId)
  }

  /**
   * Check in patient (staff only)
   */
  async checkInAppointment(id: string, userId: string, tenantId: string): Promise<Appointment> {
    const appointment = await this.repository.findById(id)
    if (!appointment) {
      throw notFound('Cita')
    }

    if (appointment.tenant_id !== tenantId) {
      throw businessRuleViolation('Acceso denegado')
    }

    if (!['pending', 'confirmed'].includes(appointment.status)) {
      throw businessRuleViolation(
        'La cita debe estar pendiente o confirmada para registrar llegada'
      )
    }

    return this.repository.update(
      id,
      {
        status: 'checked_in',
      },
      userId
    )
  }

  /**
   * Start appointment (staff only)
   */
  async startAppointment(id: string, userId: string, tenantId: string): Promise<Appointment> {
    const appointment = await this.repository.findById(id)
    if (!appointment) {
      throw notFound('Cita')
    }

    if (appointment.tenant_id !== tenantId) {
      throw businessRuleViolation('Acceso denegado')
    }

    if (appointment.status !== 'checked_in') {
      throw businessRuleViolation('El paciente debe estar registrado para iniciar la consulta')
    }

    return this.repository.update(
      id,
      {
        status: 'in_progress',
      },
      userId
    )
  }

  /**
   * Complete appointment (staff only)
   */
  async completeAppointment(
    id: string,
    userId: string,
    tenantId: string,
    notes?: string
  ): Promise<Appointment> {
    const appointment = await this.repository.findById(id)
    if (!appointment) {
      throw notFound('Cita')
    }

    if (appointment.tenant_id !== tenantId) {
      throw businessRuleViolation('Acceso denegado')
    }

    if (!['checked_in', 'in_progress'].includes(appointment.status)) {
      throw businessRuleViolation('La cita debe estar en progreso para completarse')
    }

    const updateData: UpdateAppointmentData = {
      status: 'completed',
    }

    if (notes) {
      updateData.notes = appointment.notes
        ? `${appointment.notes}\n[Notas de cierre] ${notes}`
        : `[Notas de cierre] ${notes}`
    }

    return this.repository.update(id, updateData, userId)
  }

  /**
   * Mark as no-show (staff only)
   */
  async markNoShow(id: string, userId: string, tenantId: string): Promise<Appointment> {
    const appointment = await this.repository.findById(id)
    if (!appointment) {
      throw notFound('Cita')
    }

    if (appointment.tenant_id !== tenantId) {
      throw businessRuleViolation('Acceso denegado')
    }

    if (!['pending', 'confirmed'].includes(appointment.status)) {
      throw businessRuleViolation(
        'Solo citas pendientes o confirmadas pueden marcarse como no presentadas'
      )
    }

    return this.repository.update(
      id,
      {
        status: 'no_show',
        notes: '[No se presentó]',
      },
      userId
    )
  }

  /**
   * Get appointment statistics
   */
  async getAppointmentStats(tenantId: string): Promise<AppointmentStats> {
    return this.repository.getStats(tenantId)
  }

  /**
   * Check slot availability
   */
  async checkSlotAvailability(params: AvailabilityCheckParams): Promise<boolean> {
    return this.repository.checkSlotAvailability(params)
  }

  /**
   * Delete appointment
   */
  async deleteAppointment(id: string, userId: string, tenantId: string): Promise<void> {
    const appointment = await this.repository.findById(id)
    if (!appointment) {
      throw notFound('Cita')
    }

    if (appointment.tenant_id !== tenantId) {
      throw businessRuleViolation('Acceso denegado')
    }

    // Only staff can delete appointments
    // Business rule: completed appointments cannot be deleted

    return this.repository.delete(id)
  }

  // Private business logic methods

  private async validateAppointmentCreation(
    data: CreateAppointmentData,
    tenantId: string
  ): Promise<void> {
    // Appointment must be in the future
    if (data.start_time <= new Date()) {
      throw businessRuleViolation('La cita debe ser programada para el futuro')
    }

    // End time must be after start time
    if (data.end_time <= data.start_time) {
      throw businessRuleViolation('La hora de fin debe ser posterior a la hora de inicio')
    }

    // Maximum duration check (e.g., 4 hours)
    const durationMs = data.end_time.getTime() - data.start_time.getTime()
    const maxDurationMs = 4 * 60 * 60 * 1000 // 4 hours
    if (durationMs > maxDurationMs) {
      throw businessRuleViolation('La duración máxima de una cita es 4 horas')
    }

    // Check if pet belongs to tenant
    const { data: pet, error } = await this.repository
      .getClient()
      .from('pets')
      .select('id, owner_id')
      .eq('id', data.pet_id)
      .single()

    if (error || !pet) {
      throw notFound('Mascota')
    }

    // Verify pet belongs to this tenant (through owner profile)
    const { data: owner } = await this.repository
      .getClient()
      .from('profiles')
      .select('tenant_id')
      .eq('id', pet.owner_id)
      .single()

    if (!owner || owner.tenant_id !== tenantId) {
      throw businessRuleViolation('La mascota no pertenece a esta clínica')
    }
  }

  private async validateAppointmentUpdate(
    appointment: Appointment,
    data: UpdateAppointmentData
  ): Promise<void> {
    const newStartTime = data.start_time || appointment.start_time
    const newEndTime = data.end_time || appointment.end_time

    if (newStartTime <= new Date()) {
      throw businessRuleViolation('La nueva fecha debe ser en el futuro')
    }

    if (newEndTime <= newStartTime) {
      throw businessRuleViolation('La hora de fin debe ser posterior a la hora de inicio')
    }

    // Check availability for new time slot (exclude current appointment)
    const isAvailable = await this.repository.checkSlotAvailability({
      tenant_id: appointment.tenant_id,
      date: newStartTime.toISOString().split('T')[0],
      work_start: newStartTime.toTimeString().slice(0, 5),
      work_end: newEndTime.toTimeString().slice(0, 5),
      vet_id: data.vet_id || appointment.vet_id,
    })

    if (!isAvailable) {
      throw conflict('El nuevo horario no está disponible')
    }
  }

  private validateStatusTransition(
    from: AppointmentStatus,
    to: AppointmentStatus,
    isStaff: boolean
  ): void {
    const transitions: StatusTransition[] = [
      { from: 'pending', to: 'confirmed', allowed: true },
      { from: 'pending', to: 'cancelled', allowed: true },
      { from: 'confirmed', to: 'checked_in', allowed: true, requires_staff: true },
      { from: 'confirmed', to: 'cancelled', allowed: true },
      { from: 'checked_in', to: 'in_progress', allowed: true, requires_staff: true },
      { from: 'checked_in', to: 'completed', allowed: true, requires_staff: true },
      { from: 'in_progress', to: 'completed', allowed: true, requires_staff: true },
      { from: 'confirmed', to: 'no_show', allowed: true, requires_staff: true },
      { from: 'pending', to: 'no_show', allowed: true, requires_staff: true },
    ]

    const transition = transitions.find((t) => t.from === from && t.to === to)
    if (!transition?.allowed) {
      throw businessRuleViolation(`Transición de estado no permitida: ${from} → ${to}`)
    }

    if (transition.requires_staff && !isStaff) {
      throw businessRuleViolation('Solo el personal puede realizar esta acción')
    }
  }

  private canCancelAppointment(appointment: Appointment): boolean {
    // Cannot cancel past appointments
    if (appointment.start_time < new Date()) {
      return false
    }

    // Cannot cancel already cancelled, completed, or no-show appointments
    return !['cancelled', 'completed', 'no_show'].includes(appointment.status)
  }
}
