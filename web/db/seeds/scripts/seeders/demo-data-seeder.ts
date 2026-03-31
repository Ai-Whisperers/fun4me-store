/**
 * Demo Data Seeder
 *
 * Comprehensive seeder that generates realistic demo data for visual testing.
 * Creates: owners, pets, vaccines, medical records, prescriptions, lab orders,
 * appointments, hospitalizations with vitals.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { BaseSeeder, SeederOptions, SeederResult } from './base-seeder'
import { createSeederResult } from '../utils/reporting'

interface DemoOwner {
  id?: string
  full_name: string
  email: string
  phone: string
}

interface DemoPet {
  name: string
  species: 'dog' | 'cat'
  breed: string
  birth_date: string
  weight_kg: number
  sex: 'male' | 'female'
  is_neutered: boolean
}

/**
 * Generate demo owners with pets and full clinical history
 */
export class DemoDataSeeder {
  private client: SupabaseClient
  private tenantId: string
  private vetId: string | null = null
  private verbose: boolean

  constructor(client: SupabaseClient, tenantId: string, verbose = false) {
    this.client = client
    this.tenantId = tenantId
    this.verbose = verbose
  }

  private log(message: string): void {
    if (this.verbose) {
      console.log(`[DemoDataSeeder] ${message}`)
    }
  }

  /**
   * Run the full demo data generation
   */
  async seed(): Promise<{ success: boolean; counts: Record<string, number> }> {
    const counts: Record<string, number> = {}

    try {
      // 1. Get or create vet for this tenant
      this.vetId = await this.getVetId()
      if (!this.vetId) {
        throw new Error('No vet found for tenant')
      }
      this.log(`Using vet: ${this.vetId}`)

      // 2. Get existing owners and pets
      const { owners, pets } = await this.getExistingData()
      this.log(`Found ${owners.length} owners, ${pets.length} pets`)

      // 3. Generate medical records for all pets
      counts.medical_records = await this.seedMedicalRecords(pets)
      this.log(`Created ${counts.medical_records} medical records`)

      // 4. Generate vaccines for pets without vaccines
      counts.vaccines = await this.seedVaccines(pets)
      this.log(`Created ${counts.vaccines} vaccines`)

      // 5. Generate prescriptions
      counts.prescriptions = await this.seedPrescriptions(pets)
      this.log(`Created ${counts.prescriptions} prescriptions`)

      // 6. Generate lab orders
      counts.lab_orders = await this.seedLabOrders(pets)
      this.log(`Created ${counts.lab_orders} lab orders`)

      // 7. Generate appointments
      counts.appointments = await this.seedAppointments(pets)
      this.log(`Created ${counts.appointments} appointments`)

      // 8. Generate hospitalizations
      counts.hospitalizations = await this.seedHospitalizations(pets)
      this.log(`Created ${counts.hospitalizations} hospitalizations`)

      // 9. Generate invoices
      counts.invoices = await this.seedInvoices(owners)
      this.log(`Created ${counts.invoices} invoices`)

      return { success: true, counts }
    } catch (error) {
      console.error('[DemoDataSeeder] Error:', error)
      return { success: false, counts }
    }
  }

  private async getVetId(): Promise<string | null> {
    const { data } = await this.client
      .from('profiles')
      .select('id')
      .eq('tenant_id', this.tenantId)
      .eq('role', 'vet')
      .limit(1)
      .single()
    return data?.id || null
  }

  private async getExistingData(): Promise<{
    owners: Array<{ id: string; full_name: string }>
    pets: Array<{ id: string; name: string; species: string; owner_id: string }>
  }> {
    const { data: owners } = await this.client
      .from('profiles')
      .select('id, full_name')
      .eq('tenant_id', this.tenantId)
      .eq('role', 'owner')

    const { data: pets } = await this.client
      .from('pets')
      .select('id, name, species, owner_id')
      .in(
        'owner_id',
        (owners || []).map((o) => o.id)
      )

    return {
      owners: owners || [],
      pets: pets || [],
    }
  }

  private async seedMedicalRecords(
    pets: Array<{ id: string; name: string; species: string }>
  ): Promise<number> {
    // Check existing records per pet
    const { data: existing } = await this.client
      .from('medical_records')
      .select('pet_id')
      .eq('tenant_id', this.tenantId)

    const petsWithRecords = new Set((existing || []).map((r) => r.pet_id))

    const recordTypes = ['consultation', 'checkup', 'vaccination', 'dental', 'surgery', 'emergency']
    const diagnoses = [
      { text: 'Paciente saludable', complaint: 'Control de rutina' },
      { text: 'Dermatitis alérgica', complaint: 'Rascado excesivo' },
      { text: 'Gastroenteritis leve', complaint: 'Vómitos y diarrea' },
      { text: 'Otitis externa', complaint: 'Se rasca las orejas' },
      { text: 'Conjuntivitis', complaint: 'Ojos llorosos' },
      { text: 'Gingivitis', complaint: 'Mal aliento' },
      { text: 'Sobrepeso', complaint: 'Control de peso' },
      { text: 'Esguince leve', complaint: 'Cojera' },
    ]

    const records: unknown[] = []

    for (const pet of pets) {
      // Skip if pet already has 2+ records
      if (petsWithRecords.has(pet.id)) continue

      // Create 1-3 records per pet
      const numRecords = Math.floor(Math.random() * 3) + 1

      for (let i = 0; i < numRecords; i++) {
        const daysAgo = Math.floor(Math.random() * 180) + 1
        const diagnosis = diagnoses[Math.floor(Math.random() * diagnoses.length)]
        const recordType = recordTypes[Math.floor(Math.random() * recordTypes.length)]
        const isCat = pet.species === 'cat'

        records.push({
          tenant_id: this.tenantId,
          pet_id: pet.id,
          vet_id: this.vetId,
          record_type: recordType,
          visit_date: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
          chief_complaint: diagnosis.complaint,
          diagnosis_text: diagnosis.text,
          clinical_notes: `Examen realizado. ${diagnosis.text}. Paciente ${isCat ? 'felino' : 'canino'} en condición estable.`,
          weight_kg: isCat ? 3 + Math.random() * 4 : 8 + Math.random() * 25,
          temperature_celsius: 38 + Math.random() * 1.5,
          heart_rate_bpm: isCat
            ? 140 + Math.floor(Math.random() * 40)
            : 70 + Math.floor(Math.random() * 40),
          respiratory_rate_rpm: isCat
            ? 20 + Math.floor(Math.random() * 15)
            : 15 + Math.floor(Math.random() * 10),
          treatment_plan: 'Seguimiento según indicaciones',
          is_emergency: recordType === 'emergency',
          requires_followup: Math.random() > 0.5,
        })
      }
    }

    if (records.length > 0) {
      const { error } = await this.client.from('medical_records').insert(records)
      if (error) {
        this.log(`Error inserting medical records: ${error.message}`)
        return 0
      }
    }

    return records.length
  }

  private async seedVaccines(
    pets: Array<{ id: string; name: string; species: string }>
  ): Promise<number> {
    // Check existing vaccines per pet
    const { data: existing } = await this.client.from('vaccines').select('pet_id')

    const petsWithVaccines = new Set((existing || []).map((v) => v.pet_id))

    const dogVaccines = ['Séxtuple', 'Antirrábica', 'Bordetella', 'Leptospirosis', 'Giardia']
    const catVaccines = ['Triple Felina', 'Antirrábica', 'Leucemia Felina', 'PIF']

    const vaccines: unknown[] = []

    for (const pet of pets) {
      if (petsWithVaccines.has(pet.id)) continue

      const vaccineList = pet.species === 'cat' ? catVaccines : dogVaccines
      const numVaccines = Math.floor(Math.random() * 3) + 2

      for (let i = 0; i < Math.min(numVaccines, vaccineList.length); i++) {
        const daysAgo = Math.floor(Math.random() * 300) + 30
        const daysUntilDue = Math.floor(Math.random() * 400) - 50 // Some past due
        const status = daysUntilDue < 0 ? 'missed' : daysUntilDue < 30 ? 'scheduled' : 'completed'

        vaccines.push({
          pet_id: pet.id,
          name: vaccineList[i],
          administered_date: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
          next_due_date: new Date(Date.now() + daysUntilDue * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
          status,
          batch_number: `VAC-${new Date().getFullYear()}-${String(i + 1).padStart(3, '0')}`,
          administered_by: status === 'scheduled' ? null : this.vetId,
          notes: status === 'scheduled' ? 'Programada' : 'Aplicada sin reacciones',
        })
      }
    }

    if (vaccines.length > 0) {
      const { error } = await this.client.from('vaccines').insert(vaccines)
      if (error) {
        this.log(`Error inserting vaccines: ${error.message}`)
        return 0
      }
    }

    return vaccines.length
  }

  private async seedPrescriptions(
    pets: Array<{ id: string; name: string; species: string }>
  ): Promise<number> {
    const { data: existing } = await this.client
      .from('prescriptions')
      .select('id')
      .eq('tenant_id', this.tenantId)

    if ((existing || []).length >= 10) return 0 // Already have enough

    const medications = [
      { name: 'Amoxicilina-Clavulánico', dose: '12.5 mg/kg', freq: 'Cada 12 horas', dur: '7 días' },
      { name: 'Meloxicam', dose: '0.1 mg/kg', freq: 'Una vez al día', dur: '5 días' },
      { name: 'Metronidazol', dose: '15 mg/kg', freq: 'Cada 12 horas', dur: '7 días' },
      { name: 'Cetirizina', dose: '10 mg', freq: 'Una vez al día', dur: '14 días' },
      { name: 'Omeprazol', dose: '1 mg/kg', freq: 'Una vez al día', dur: '10 días' },
    ]

    const prescriptions: unknown[] = []
    const petsToUse = pets.slice(0, Math.min(8, pets.length))
    let rxNumber = (existing || []).length + 1

    for (const pet of petsToUse) {
      const daysAgo = Math.floor(Math.random() * 60)
      const validDays = Math.floor(Math.random() * 20) + 10
      const med = medications[Math.floor(Math.random() * medications.length)]

      prescriptions.push({
        tenant_id: this.tenantId,
        pet_id: pet.id,
        vet_id: this.vetId,
        prescription_number: `RX-${new Date().getFullYear()}-${String(rxNumber++).padStart(6, '0')}`,
        prescribed_date: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        valid_until: new Date(
          Date.now() - daysAgo * 24 * 60 * 60 * 1000 + validDays * 24 * 60 * 60 * 1000
        )
          .toISOString()
          .split('T')[0],
        medications: JSON.stringify([
          {
            name: med.name,
            dose: med.dose,
            frequency: med.freq,
            duration: med.dur,
            instructions: 'Administrar con comida',
          },
        ]),
        status: daysAgo > validDays ? 'expired' : daysAgo > 30 ? 'dispensed' : 'active',
        notes: `Tratamiento para ${pet.name}`,
      })
    }

    if (prescriptions.length > 0) {
      const { error } = await this.client.from('prescriptions').insert(prescriptions)
      if (error) {
        this.log(`Error inserting prescriptions: ${error.message}`)
        return 0
      }
    }

    return prescriptions.length
  }

  private async seedLabOrders(
    pets: Array<{ id: string; name: string; species: string }>
  ): Promise<number> {
    // Get test catalog
    const { data: tests } = await this.client
      .from('lab_test_catalog')
      .select('id, code')
      .in('code', ['CBC', 'CHEM10', 'UA', 'HW', 'FECAL'])

    if (!tests || tests.length === 0) return 0

    const { data: existing } = await this.client
      .from('lab_orders')
      .select('id')
      .eq('tenant_id', this.tenantId)

    if ((existing || []).length >= 10) return 0

    const orders: unknown[] = []
    const petsToUse = pets.slice(0, Math.min(6, pets.length))
    let orderNum = (existing || []).length + 1

    const statuses = ['completed', 'completed', 'completed', 'processing', 'pending']

    for (const pet of petsToUse) {
      const daysAgo = Math.floor(Math.random() * 90)
      const status = statuses[Math.floor(Math.random() * statuses.length)]

      orders.push({
        tenant_id: this.tenantId,
        order_number: `LAB-${new Date().getFullYear()}-${String(orderNum++).padStart(6, '0')}`,
        pet_id: pet.id,
        ordered_by: this.vetId,
        priority: Math.random() > 0.8 ? 'stat' : Math.random() > 0.5 ? 'urgent' : 'routine',
        clinical_notes: `Análisis para ${pet.name}`,
        status,
        lab_type: 'in_house',
        collected_at:
          status !== 'pending'
            ? new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString()
            : null,
        collected_by: status !== 'pending' ? this.vetId : null,
        completed_at:
          status === 'completed'
            ? new Date(Date.now() - (daysAgo - 1) * 24 * 60 * 60 * 1000).toISOString()
            : null,
      })
    }

    if (orders.length > 0) {
      const { data: insertedOrders, error } = await this.client
        .from('lab_orders')
        .insert(orders)
        .select('id, status')

      if (error) {
        this.log(`Error inserting lab orders: ${error.message}`)
        return 0
      }

      // Add order items and results for completed orders
      if (insertedOrders) {
        for (const order of insertedOrders) {
          const test = tests[Math.floor(Math.random() * tests.length)]

          await this.client.from('lab_order_items').insert({
            lab_order_id: order.id,
            tenant_id: this.tenantId,
            test_id: test.id,
            status: order.status === 'completed' ? 'completed' : order.status,
            price: 45000 + Math.floor(Math.random() * 40000),
          })

          if (order.status === 'completed') {
            const isAbnormal = Math.random() > 0.7
            await this.client.from('lab_results').insert({
              lab_order_id: order.id,
              tenant_id: this.tenantId,
              test_id: test.id,
              value: isAbnormal ? '10.5' : '14.2',
              numeric_value: isAbnormal ? 10.5 : 14.2,
              unit: 'g/dL',
              reference_min: 12.0,
              reference_max: 18.0,
              flag: isAbnormal ? 'low' : 'normal',
              is_abnormal: isAbnormal,
              entered_by: this.vetId,
            })
          }
        }
      }
    }

    return orders.length
  }

  private async seedAppointments(
    pets: Array<{ id: string; name: string; species: string }>
  ): Promise<number> {
    // Get a service
    const { data: service } = await this.client
      .from('services')
      .select('id')
      .eq('tenant_id', this.tenantId)
      .limit(1)
      .single()

    if (!service) return 0

    const { data: existing } = await this.client
      .from('appointments')
      .select('id')
      .eq('tenant_id', this.tenantId)

    if ((existing || []).length >= 25) return 0

    const appointments: unknown[] = []
    const notes = [
      'Consulta general',
      'Control de vacunas',
      'Chequeo anual',
      'Seguimiento tratamiento',
      'Limpieza dental',
      'Control de peso',
      'Consulta dermatológica',
      'Emergencia',
    ]

    // Past appointments
    for (let i = 0; i < Math.min(15, pets.length); i++) {
      const pet = pets[i % pets.length]
      const daysAgo = Math.floor(Math.random() * 120) + 1
      const hour = 8 + Math.floor(Math.random() * 10)
      const startTime = new Date()
      startTime.setDate(startTime.getDate() - daysAgo)
      startTime.setHours(hour, 0, 0, 0)

      appointments.push({
        tenant_id: this.tenantId,
        pet_id: pet.id,
        service_id: service.id,
        vet_id: this.vetId,
        start_time: startTime.toISOString(),
        end_time: new Date(startTime.getTime() + 30 * 60 * 1000).toISOString(),
        duration_minutes: 30,
        status: 'completed',
        notes: notes[Math.floor(Math.random() * notes.length)],
      })
    }

    // Today's appointments
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    for (let hour = 9; hour <= 17; hour += 1) {
      if (Math.random() > 0.4) {
        const pet = pets[Math.floor(Math.random() * pets.length)]
        const startTime = new Date(today)
        startTime.setHours(hour, 0, 0, 0)
        const currentHour = new Date().getHours()

        let status = 'confirmed'
        if (hour < currentHour - 1) status = 'completed'
        else if (hour === currentHour) status = 'in_progress'
        else if (hour === currentHour + 1) status = 'checked_in'

        appointments.push({
          tenant_id: this.tenantId,
          pet_id: pet.id,
          service_id: service.id,
          vet_id: this.vetId,
          start_time: startTime.toISOString(),
          end_time: new Date(startTime.getTime() + 30 * 60 * 1000).toISOString(),
          duration_minutes: 30,
          status,
          notes: notes[Math.floor(Math.random() * notes.length)],
        })
      }
    }

    // Future appointments
    for (let i = 0; i < 5; i++) {
      const pet = pets[Math.floor(Math.random() * pets.length)]
      const daysAhead = Math.floor(Math.random() * 14) + 1
      const hour = 9 + Math.floor(Math.random() * 8)
      const startTime = new Date()
      startTime.setDate(startTime.getDate() + daysAhead)
      startTime.setHours(hour, 0, 0, 0)

      appointments.push({
        tenant_id: this.tenantId,
        pet_id: pet.id,
        service_id: service.id,
        vet_id: this.vetId,
        start_time: startTime.toISOString(),
        end_time: new Date(startTime.getTime() + 30 * 60 * 1000).toISOString(),
        duration_minutes: 30,
        status: 'confirmed',
        notes: notes[Math.floor(Math.random() * notes.length)],
      })
    }

    if (appointments.length > 0) {
      const { error } = await this.client.from('appointments').insert(appointments)
      if (error) {
        this.log(`Error inserting appointments: ${error.message}`)
        return 0
      }
    }

    return appointments.length
  }

  private async seedHospitalizations(
    pets: Array<{ id: string; name: string; species: string }>
  ): Promise<number> {
    // Get available kennels
    const { data: kennels } = await this.client
      .from('kennels')
      .select('id')
      .eq('tenant_id', this.tenantId)
      .eq('current_status', 'available')
      .limit(3)

    if (!kennels || kennels.length === 0) return 0

    const { data: existing } = await this.client
      .from('hospitalizations')
      .select('id')
      .eq('tenant_id', this.tenantId)

    if ((existing || []).length >= 3) return 0

    const hospitalizations: unknown[] = []
    const reasons = [
      { reason: 'Cirugía programada', diagnosis: 'Procedimiento quirúrgico' },
      { reason: 'Observación post-operatoria', diagnosis: 'Recuperación de cirugía' },
      { reason: 'Tratamiento IV', diagnosis: 'Deshidratación/Infección' },
      { reason: 'Emergencia', diagnosis: 'Intoxicación' },
    ]

    let admissionNum = (existing || []).length + 1
    const petsToUse = pets.slice(0, Math.min(2, kennels.length))

    for (let i = 0; i < petsToUse.length; i++) {
      const pet = petsToUse[i]
      const kennel = kennels[i]
      const daysAgo = Math.floor(Math.random() * 3)
      const r = reasons[Math.floor(Math.random() * reasons.length)]

      hospitalizations.push({
        tenant_id: this.tenantId,
        pet_id: pet.id,
        kennel_id: kennel.id,
        admission_number: `ADM-${new Date().getFullYear()}-${String(admissionNum++).padStart(4, '0')}`,
        admitted_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
        expected_discharge: new Date(
          Date.now() + (3 - daysAgo) * 24 * 60 * 60 * 1000
        ).toISOString(),
        reason: r.reason,
        diagnosis: r.diagnosis,
        status: 'admitted',
        acuity_level: Math.random() > 0.7 ? 'high' : 'normal',
        primary_vet_id: this.vetId,
        admitted_by: this.vetId,
        notes: `Paciente ingresado para ${r.reason.toLowerCase()}`,
      })
    }

    if (hospitalizations.length > 0) {
      const { data: inserted, error } = await this.client
        .from('hospitalizations')
        .insert(hospitalizations)
        .select('id')

      if (error) {
        this.log(`Error inserting hospitalizations: ${error.message}`)
        return 0
      }

      // Add vitals for each hospitalization
      if (inserted) {
        for (const hosp of inserted) {
          const vitals = []
          for (let i = 0; i < 3; i++) {
            vitals.push({
              hospitalization_id: hosp.id,
              temperature: 38 + Math.random() * 1.5,
              heart_rate: 80 + Math.floor(Math.random() * 40),
              respiratory_rate: 15 + Math.floor(Math.random() * 15),
              pain_score: Math.floor(Math.random() * 4),
              mentation: ['bright', 'quiet', 'dull'][Math.floor(Math.random() * 3)],
              recorded_at: new Date(Date.now() - (3 - i) * 8 * 60 * 60 * 1000).toISOString(),
              recorded_by: this.vetId,
            })
          }
          await this.client.from('hospitalization_vitals').insert(vitals)
        }
      }
    }

    return hospitalizations.length
  }

  private async seedInvoices(owners: Array<{ id: string; full_name: string }>): Promise<number> {
    const { data: existing } = await this.client
      .from('invoices')
      .select('id')
      .eq('tenant_id', this.tenantId)

    if ((existing || []).length >= 10) return 0

    const invoices: unknown[] = []
    const statuses = ['paid', 'paid', 'sent', 'overdue', 'draft', 'partial']
    let invoiceNum = (existing || []).length + 1

    for (const owner of owners.slice(0, 8)) {
      const daysAgo = Math.floor(Math.random() * 60)
      const status = statuses[Math.floor(Math.random() * statuses.length)]
      const subtotal = 50000 + Math.floor(Math.random() * 200000)
      const tax = Math.round(subtotal * 0.1)

      invoices.push({
        tenant_id: this.tenantId,
        client_id: owner.id,
        invoice_number: `INV-${new Date().getFullYear()}-${String(invoiceNum++).padStart(6, '0')}`,
        invoice_date: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        due_date: new Date(Date.now() - (daysAgo - 30) * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        subtotal,
        tax_amount: tax,
        total: subtotal + tax,
        status,
        notes: `Factura para ${owner.full_name}`,
      })
    }

    if (invoices.length > 0) {
      const { error } = await this.client.from('invoices').insert(invoices)
      if (error) {
        this.log(`Error inserting invoices: ${error.message}`)
        return 0
      }
    }

    return invoices.length
  }
}

/**
 * Run demo data seeder for a tenant
 */
export async function seedDemoData(
  client: SupabaseClient,
  tenantId: string,
  verbose = false
): Promise<{ success: boolean; counts: Record<string, number> }> {
  const seeder = new DemoDataSeeder(client, tenantId, verbose)
  return seeder.seed()
}
