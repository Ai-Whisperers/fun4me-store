/**
 * Test Fixtures: Appointments
 *
 * Pre-defined appointment data for testing booking functionality.
 */

import { APPOINTMENT_STATUSES, type AppointmentStatus } from '@/lib/types/status'

export { type AppointmentStatus }
export type AppointmentType =
  | 'consultation'
  | 'vaccination'
  | 'surgery'
  | 'grooming'
  | 'checkup'
  | 'emergency'

export interface AppointmentFixture {
  id: string
  tenantId: string
  petId: string
  ownerId: string
  vetId?: string
  type: AppointmentType
  date: string
  time: string
  duration: number // minutes
  status: AppointmentStatus
  notes?: string
  reason?: string
}

/** Pre-defined test appointments */
export const APPOINTMENTS: Record<string, AppointmentFixture> = {
  maxCheckup: {
    id: '00000000-0000-0000-0003-000000000001',
    tenantId: 'terrapet',
    petId: '00000000-0000-0000-0001-000000000001',
    ownerId: '00000000-0000-0000-0000-000000000001',
    vetId: '00000000-0000-0000-0000-000000000010',
    type: 'checkup',
    date: '2025-01-15',
    time: '09:00',
    duration: 30,
    status: 'confirmed',
    reason: 'Control anual',
  },
  maxVaccination: {
    id: '00000000-0000-0000-0003-000000000002',
    tenantId: 'terrapet',
    petId: '00000000-0000-0000-0001-000000000001',
    ownerId: '00000000-0000-0000-0000-000000000001',
    vetId: '00000000-0000-0000-0000-000000000010',
    type: 'vaccination',
    date: '2025-02-01',
    time: '10:30',
    duration: 15,
    status: 'scheduled',
    reason: 'Vacuna antirrábica anual',
  },
  lunaGrooming: {
    id: '00000000-0000-0000-0003-000000000003',
    tenantId: 'terrapet',
    petId: '00000000-0000-0000-0001-000000000002',
    ownerId: '00000000-0000-0000-0000-000000000001',
    type: 'grooming',
    date: '2025-01-20',
    time: '14:00',
    duration: 60,
    status: 'confirmed',
    reason: 'Baño y corte',
  },
  mishiConsultation: {
    id: '00000000-0000-0000-0003-000000000004',
    tenantId: 'terrapet',
    petId: '00000000-0000-0000-0001-000000000003',
    ownerId: '00000000-0000-0000-0000-000000000002',
    vetId: '00000000-0000-0000-0000-000000000011',
    type: 'consultation',
    date: '2025-01-18',
    time: '11:00',
    duration: 30,
    status: 'scheduled',
    reason: 'Perdida de apetito',
    notes: 'Gata no come hace 2 días',
  },
  completedAppointment: {
    id: '00000000-0000-0000-0003-000000000005',
    tenantId: 'terrapet',
    petId: '00000000-0000-0000-0001-000000000001',
    ownerId: '00000000-0000-0000-0000-000000000001',
    vetId: '00000000-0000-0000-0000-000000000010',
    type: 'checkup',
    date: '2024-12-15',
    time: '09:00',
    duration: 30,
    status: 'completed',
    reason: 'Control semestral',
  },
  cancelledAppointment: {
    id: '00000000-0000-0000-0003-000000000006',
    tenantId: 'terrapet',
    petId: '00000000-0000-0000-0001-000000000002',
    ownerId: '00000000-0000-0000-0000-000000000001',
    type: 'grooming',
    date: '2024-12-20',
    time: '15:00',
    duration: 60,
    status: 'cancelled',
    reason: 'Baño',
    notes: 'Cancelado por cliente',
  },
}

/** Get appointment by key */
export function getAppointment(key: string): AppointmentFixture {
  const appointment = APPOINTMENTS[key]
  if (!appointment) {
    throw new Error(`Unknown appointment: ${key}`)
  }
  return appointment
}

/** Get appointments by status */
export function getAppointmentsByStatus(status: AppointmentStatus): AppointmentFixture[] {
  return Object.values(APPOINTMENTS).filter((appt) => appt.status === status)
}

/** Get appointments by pet */
export function getAppointmentsByPet(petId: string): AppointmentFixture[] {
  return Object.values(APPOINTMENTS).filter((appt) => appt.petId === petId)
}

/** Get appointments by owner */
export function getAppointmentsByOwner(ownerId: string): AppointmentFixture[] {
  return Object.values(APPOINTMENTS).filter((appt) => appt.ownerId === ownerId)
}

/** Get appointments by vet */
export function getAppointmentsByVet(vetId: string): AppointmentFixture[] {
  return Object.values(APPOINTMENTS).filter((appt) => appt.vetId === vetId)
}

/** Get appointments by date range */
export function getAppointmentsByDateRange(
  startDate: string,
  endDate: string
): AppointmentFixture[] {
  return Object.values(APPOINTMENTS).filter((appt) => {
    return appt.date >= startDate && appt.date <= endDate
  })
}

/** All appointment types */
export const ALL_APPOINTMENT_TYPES: AppointmentType[] = [
  'consultation',
  'vaccination',
  'surgery',
  'grooming',
  'checkup',
  'emergency',
]

/** All appointment statuses - using canonical source */
export const ALL_APPOINTMENT_STATUSES = APPOINTMENT_STATUSES

/** Generate appointment data for creation tests */
export function generateAppointmentData(
  overrides: Partial<AppointmentFixture> = {}
): Omit<AppointmentFixture, 'id'> {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)

  return {
    tenantId: 'terrapet',
    petId: '00000000-0000-0000-0001-000000000001',
    ownerId: '00000000-0000-0000-0000-000000000001',
    type: 'consultation',
    date: tomorrow.toISOString().split('T')[0],
    time: '10:00',
    duration: 30,
    status: 'scheduled',
    reason: 'Consulta general',
    ...overrides,
  }
}

/** Available time slots for testing */
export const TIME_SLOTS = [
  '08:00',
  '08:30',
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
]
