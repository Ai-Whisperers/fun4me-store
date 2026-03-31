/**
 * Appointment Factory - Builder pattern for creating appointments
 */

import { apiClient } from '../api-client'
import { testContext } from '../context'
import { generateId, pick, randomPastDate, randomFutureDate } from './base'
import { AppointmentScenario, DEFAULT_BUSINESS_HOURS } from './types'
import { TENANT_IDS } from '@/lib/constants/tenants';

interface AppointmentData {
  id: string
  tenant_id: string
  pet_id: string
  vet_id: string | null
  service_id: string | null
  created_by: string
  start_time: string
  end_time: string
  duration_minutes: number
  status:
    | 'scheduled'
    | 'confirmed'
    | 'checked_in'
    | 'in_progress'
    | 'completed'
    | 'cancelled'
    | 'no_show'
  reason: string | null
  notes: string | null
  internal_notes: string | null
  confirmed_at: string | null
  checked_in_at: string | null
  started_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  cancellation_reason: string | null
}

interface MedicalRecordData {
  id: string
  tenant_id: string
  pet_id: string
  vet_id: string | null
  record_type: string
  visit_date: string
  chief_complaint: string | null
  history: string | null
  physical_exam: string | null
  weight_kg: number | null
  temperature_celsius: number | null
  heart_rate_bpm: number | null
  respiratory_rate_rpm: number | null
  diagnosis_code: string | null
  diagnosis_text: string | null
  assessment: string | null
  treatment_plan: string | null
  medications_prescribed: string | null
  follow_up_notes: string | null
  notes: string | null
}

const SCENARIO_CONFIGS: Record<AppointmentScenario, { reason: string; durationMinutes: number }> = {
  routine: {
    reason: 'Consulta de rutina',
    durationMinutes: 30,
  },
  vaccine: {
    reason: 'Vacunación',
    durationMinutes: 20,
  },
  emergency: {
    reason: 'Emergencia',
    durationMinutes: 60,
  },
  surgery: {
    reason: 'Cirugía programada',
    durationMinutes: 120,
  },
  followup: {
    reason: 'Control post-tratamiento',
    durationMinutes: 20,
  },
  grooming: {
    reason: 'Peluquería y baño',
    durationMinutes: 90,
  },
  dental: {
    reason: 'Limpieza dental',
    durationMinutes: 60,
  },
  lab: {
    reason: 'Análisis de laboratorio',
    durationMinutes: 15,
  },
  consultation: {
    reason: 'Consulta general',
    durationMinutes: 30,
  },
}

const CHIEF_COMPLAINTS = [
  'Vómitos frecuentes',
  'Pérdida de apetito',
  'Letargia',
  'Tos persistente',
  'Diarrea',
  'Cojera',
  'Prurito intenso',
  'Pérdida de peso',
  'Dificultad para respirar',
  'Control de rutina',
]

const DIAGNOSES = [
  'Gastroenteritis aguda',
  'Dermatitis alérgica',
  'Otitis externa',
  'Infección urinaria',
  'Parásitos intestinales',
  'Enfermedad dental',
  'Sin patología aparente',
  'Artritis leve',
]

export class AppointmentFactory {
  private data: Partial<AppointmentData>
  private scenario: AppointmentScenario = 'consultation'
  private shouldPersist: boolean = true
  private createMedicalRecord: boolean = false
  private timeRange: 'past' | 'future' | 'today' = 'future'

  private constructor() {
    this.data = {
      id: generateId(),
      tenant_id: TENANT_IDS.ADRIS,
      status: 'scheduled',
      vet_id: null,
      service_id: null,
      reason: null,
      notes: null,
      internal_notes: null,
      confirmed_at: null,
      checked_in_at: null,
      started_at: null,
      completed_at: null,
      cancelled_at: null,
      cancellation_reason: null,
    }
  }

  /**
   * Start building an appointment
   */
  static create(): AppointmentFactory {
    return new AppointmentFactory()
  }

  /**
   * Set appointment scenario
   */
  withScenario(scenario: AppointmentScenario): AppointmentFactory {
    this.scenario = scenario
    const config = SCENARIO_CONFIGS[scenario]
    this.data.reason = config.reason
    return this
  }

  /**
   * Set tenant ID
   */
  forTenant(tenantId: string): AppointmentFactory {
    this.data.tenant_id = tenantId
    return this
  }

  /**
   * Set pet ID
   */
  forPet(petId: string): AppointmentFactory {
    this.data.pet_id = petId
    return this
  }

  /**
   * Set vet ID
   */
  withVet(vetId: string): AppointmentFactory {
    this.data.vet_id = vetId
    return this
  }

  /**
   * Set service ID
   */
  forService(serviceId: string): AppointmentFactory {
    this.data.service_id = serviceId
    return this
  }

  /**
   * Set who created the appointment
   */
  createdBy(userId: string): AppointmentFactory {
    this.data.created_by = userId
    return this
  }

  /**
   * Schedule in the past (for historical data)
   */
  inPast(): AppointmentFactory {
    this.timeRange = 'past'
    return this
  }

  /**
   * Schedule in the future
   */
  inFuture(): AppointmentFactory {
    this.timeRange = 'future'
    return this
  }

  /**
   * Schedule for today
   */
  forToday(): AppointmentFactory {
    this.timeRange = 'today'
    return this
  }

  /**
   * Set specific start time
   */
  atTime(startTime: Date): AppointmentFactory {
    const config = SCENARIO_CONFIGS[this.scenario]
    const endTime = new Date(startTime.getTime() + config.durationMinutes * 60 * 1000)
    this.data.start_time = startTime.toISOString()
    this.data.end_time = endTime.toISOString()
    return this
  }

  /**
   * Set status
   */
  withStatus(status: AppointmentData['status']): AppointmentFactory {
    this.data.status = status
    return this
  }

  /**
   * Mark as completed (for past appointments)
   */
  completed(): AppointmentFactory {
    this.data.status = 'completed'
    return this
  }

  /**
   * Mark as cancelled
   */
  cancelled(reason?: string): AppointmentFactory {
    this.data.status = 'cancelled'
    this.data.cancelled_at = new Date().toISOString()
    this.data.cancellation_reason = reason || 'Cancelado por el cliente'
    return this
  }

  /**
   * Mark as no-show
   */
  noShow(): AppointmentFactory {
    this.data.status = 'no_show'
    return this
  }

  /**
   * Add notes
   */
  withNotes(notes: string): AppointmentFactory {
    this.data.notes = notes
    return this
  }

  /**
   * Set ID explicitly
   */
  withId(id: string): AppointmentFactory {
    this.data.id = id
    return this
  }

  /**
   * Create associated medical record
   */
  withMedicalRecord(): AppointmentFactory {
    this.createMedicalRecord = true
    return this
  }

  /**
   * Don't persist to database
   */
  inMemoryOnly(): AppointmentFactory {
    this.shouldPersist = false
    return this
  }

  /**
   * Build appointment data (without persisting)
   */
  buildData(): AppointmentData {
    const config = SCENARIO_CONFIGS[this.scenario]

    // Generate time if not set
    if (!this.data.start_time) {
      let startTime: Date

      switch (this.timeRange) {
        case 'past':
          startTime = randomPastDate(3)
          break
        case 'today':
          startTime = new Date()
          startTime.setHours(
            DEFAULT_BUSINESS_HOURS.startHour +
              Math.floor(
                Math.random() * (DEFAULT_BUSINESS_HOURS.endHour - DEFAULT_BUSINESS_HOURS.startHour)
              ),
            Math.floor(Math.random() * 4) * 15,
            0,
            0
          )
          break
        default:
          startTime = randomFutureDate(30)
      }

      const endTime = new Date(startTime.getTime() + config.durationMinutes * 60 * 1000)
      this.data.start_time = startTime.toISOString()
      this.data.end_time = endTime.toISOString()
    }

    // Calculate duration_minutes from start/end times
    // Non-null assertions safe: start_time and end_time always set above (lines 341-342)
    /* eslint-disable @typescript-eslint/no-non-null-assertion */
    const startMs = new Date(this.data.start_time!).getTime()
    const endMs = new Date(this.data.end_time!).getTime()
    /* eslint-enable @typescript-eslint/no-non-null-assertion */
    this.data.duration_minutes = Math.round((endMs - startMs) / (60 * 1000))

    // Set reason if not set
    if (!this.data.reason) {
      this.data.reason = config.reason
    }

    // Auto-complete past appointments
    if (this.timeRange === 'past' && this.data.status === 'scheduled') {
      this.data.status = 'completed'
      this.data.confirmed_at = this.data.start_time
      this.data.checked_in_at = this.data.start_time
      this.data.started_at = this.data.start_time
      this.data.completed_at = this.data.end_time
    }

    return this.data as AppointmentData
  }

  /**
   * Build and persist appointment
   */
  async build(): Promise<{
    appointment: AppointmentData
    medicalRecord: MedicalRecordData | null
  }> {
    const appointmentData = this.buildData()
    let medicalRecord: MedicalRecordData | null = null

    if (!this.shouldPersist) {
      return { appointment: appointmentData, medicalRecord }
    }

    if (!appointmentData.pet_id) {
      throw new Error('Appointment must have a pet_id. Use .forPet(petId) before building.')
    }

    if (!appointmentData.created_by) {
      throw new Error('Appointment must have a created_by. Use .createdBy(userId) before building.')
    }

    // Insert appointment
    const { error: apptError } = await apiClient.dbInsert('appointments', {
      id: appointmentData.id,
      tenant_id: appointmentData.tenant_id,
      pet_id: appointmentData.pet_id,
      vet_id: appointmentData.vet_id,
      service_id: appointmentData.service_id,
      created_by: appointmentData.created_by,
      start_time: appointmentData.start_time,
      end_time: appointmentData.end_time,
      duration_minutes: appointmentData.duration_minutes,
      status: appointmentData.status,
      reason: appointmentData.reason,
      notes: appointmentData.notes,
      internal_notes: appointmentData.internal_notes,
      confirmed_at: appointmentData.confirmed_at,
      checked_in_at: appointmentData.checked_in_at,
      started_at: appointmentData.started_at,
      completed_at: appointmentData.completed_at,
      cancelled_at: appointmentData.cancelled_at,
      cancellation_reason: appointmentData.cancellation_reason,
    })

    if (apptError) {
      throw new Error(`Failed to create appointment: ${apptError}`)
    }

    testContext.track('appointments', appointmentData.id, appointmentData.tenant_id)

    // Create medical record if requested
    if (this.createMedicalRecord && appointmentData.status === 'completed') {
      medicalRecord = await this.createMedicalRecordFor(appointmentData)
    }

    return { appointment: appointmentData, medicalRecord }
  }

  /**
   * Create medical record for completed appointment
   */
  private async createMedicalRecordFor(appointment: AppointmentData): Promise<MedicalRecordData> {
    const recordData: MedicalRecordData = {
      id: generateId(),
      tenant_id: appointment.tenant_id,
      pet_id: appointment.pet_id,
      vet_id: appointment.vet_id,
      record_type: this.scenario === 'emergency' ? 'emergency' : 'consultation',
      visit_date: appointment.start_time,
      chief_complaint: pick(CHIEF_COMPLAINTS),
      history: 'Paciente presenta síntomas desde hace unos días.',
      physical_exam:
        'General appearance: Alerta y responsivo. Hydration: Normal. Mucous membranes: Rosadas.',
      weight_kg: Math.round((5 + Math.random() * 30) * 10) / 10,
      temperature_celsius: Math.round((38 + Math.random() * 1.5) * 10) / 10,
      heart_rate_bpm: Math.floor(80 + Math.random() * 60),
      respiratory_rate_rpm: Math.floor(15 + Math.random() * 15),
      diagnosis_code: null,
      diagnosis_text: pick(DIAGNOSES),
      assessment: 'Paciente estable. Se recomienda seguimiento.',
      treatment_plan: 'Se administra tratamiento sintomático.',
      medications_prescribed: null,
      follow_up_notes: 'Control en 7 días si persisten síntomas.',
      notes: null,
    }

    const { error } = await apiClient.dbInsert(
      'medical_records',
      recordData as unknown as Record<string, unknown>
    )
    if (error) {
      throw new Error(`Failed to create medical record: ${error}`)
    }

    testContext.track('medical_records', recordData.id, appointment.tenant_id)
    return recordData
  }
}

/**
 * Create appointment history for a pet
 */
export async function createAppointmentHistory(
  petId: string,
  ownerId: string,
  vetId: string | null,
  tenantId: string = 'terrapet',
  options: { past?: number; future?: number; includeRecords?: boolean } = {}
): Promise<Array<{ appointment: AppointmentData; medicalRecord: MedicalRecordData | null }>> {
  const { past = 5, future = 2, includeRecords = true } = options
  const results: Array<{ appointment: AppointmentData; medicalRecord: MedicalRecordData | null }> =
    []

  const scenarios: AppointmentScenario[] = [
    'routine',
    'vaccine',
    'consultation',
    'followup',
    'dental',
  ]

  // Create past appointments
  for (let i = 0; i < past; i++) {
    const scenario = pick(scenarios)
    const factory = AppointmentFactory.create()
      .forTenant(tenantId)
      .forPet(petId)
      .createdBy(ownerId)
      .withScenario(scenario)
      .inPast()
      .completed()

    if (vetId) {
      factory.withVet(vetId)
    }

    if (includeRecords) {
      factory.withMedicalRecord()
    }

    // Some appointments might be cancelled or no-show
    if (Math.random() < 0.1) {
      factory.cancelled()
    } else if (Math.random() < 0.05) {
      factory.noShow()
    }

    const result = await factory.build()
    results.push(result)
  }

  // Create future appointments
  for (let i = 0; i < future; i++) {
    const scenario = pick(scenarios)
    const factory = AppointmentFactory.create()
      .forTenant(tenantId)
      .forPet(petId)
      .createdBy(ownerId)
      .withScenario(scenario)
      .inFuture()

    if (vetId) {
      factory.withVet(vetId)
    }

    const result = await factory.build()
    results.push(result)
  }

  return results
}
