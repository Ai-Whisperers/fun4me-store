/**
 * Appointment Booking WhatsApp Messages
 *
 * Messages related to appointment booking, scheduling, and reminders.
 */

import type { AppointmentBookingParams } from '../types'

export const bookingMessages = {
  // ============ Booking Inquiries ============

  /**
   * General booking inquiry
   */
  bookAppointment: () => 'Hola! Quiero agendar una cita para mi mascota',

  /**
   * Booking with pet name
   */
  bookForPet: ({ petName }: AppointmentBookingParams) =>
    petName ? `Hola! Quiero agendar una cita para ${petName}` : 'Hola! Quiero agendar una cita para mi mascota',

  /**
   * Booking with service
   */
  bookService: ({ serviceName }: AppointmentBookingParams) =>
    serviceName
      ? `Hola! Quiero agendar una cita para ${serviceName}`
      : 'Hola! Quiero agendar una cita para mi mascota',

  /**
   * Full booking context
   */
  bookFull: ({ petName, serviceName, clinicName }: AppointmentBookingParams) => {
    const parts = ['Hola! Quiero agendar una cita']
    if (serviceName) parts.push(`para ${serviceName}`)
    if (petName) parts.push(`para ${petName}`)
    if (clinicName) parts.push(`en ${clinicName}`)
    return parts.join(' ')
  },

  // ============ Appointment Changes ============

  /**
   * Reschedule appointment
   */
  reschedule: () => 'Hola! Necesito reagendar mi cita',

  /**
   * Cancel appointment
   */
  cancel: () => 'Hola! Necesito cancelar mi cita',

  /**
   * Appointment confirmation question
   */
  confirm: () => 'Hola! Quiero confirmar mi cita',

  // ============ Availability ============

  /**
   * Check availability
   */
  checkAvailability: () => 'Hola! Quiero consultar horarios disponibles',

  /**
   * Urgent/emergency appointment
   */
  urgent: () => 'Hola! Necesito una cita urgente para mi mascota',

  // ============ Waitlist ============

  /**
   * Join waitlist
   */
  joinWaitlist: () => 'Hola! Quiero anotarme en la lista de espera',

  /**
   * Waitlist status check
   */
  waitlistStatus: () => 'Hola! Quiero saber mi posicion en la lista de espera',
}

export type BookingMessageKey = keyof typeof bookingMessages
