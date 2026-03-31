import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getClinicData } from '@/lib/clinics'
import { getPetProfile } from '@/app/actions/pets'
import { getPetDocuments } from '@/app/actions/pet-documents'
import { PetProfileHeader } from '@/components/pets/pet-profile-header'
import { VaccineReactionAlert } from '@/components/pets/vaccine-reaction-alert'
import { PetDetailContent } from '@/components/pets/pet-detail-content'
import { ArrowLeft } from 'lucide-react'
import type { MedicalRecord, Prescription } from '@/lib/types/database'

interface Props {
  params: Promise<{ clinic: string; id: string }>
}

interface VaccineReaction {
  id: string
  reaction_detail: string
  occurred_at: string
}

interface TimelineItem {
  id: string
  created_at: string
  type: 'record' | 'prescription'
  record_type?: string
  title: string
  diagnosis?: string | null
  notes?: string | null
  vitals?: {
    weight?: number
    temp?: number
    hr?: number
    rr?: number
  } | null
  medications?: Array<{
    name: string
    dose: string
    frequency: string
    duration: string
  }>
  attachments?: string[]
  vet_name?: string
}

interface WeightRecord {
  date: string
  weight_kg: number
  age_weeks?: number
}

export default async function PatientDetailPage({ params }: Props): Promise<React.ReactElement> {
  const { clinic, id } = await params

  // Verify clinic exists
  const clinicData = await getClinicData(clinic)
  if (!clinicData) {
    notFound()
  }

  // Check authentication & staff role
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${clinic}/portal/login`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['vet', 'admin'].includes(profile.role)) {
    redirect(`/${clinic}/portal/dashboard`)
  }

  // Use the same action as portal for unified data fetching
  const result = await getPetProfile(clinic, id)

  if (!result.success) {
    if (result.error === 'Mascota no encontrada') {
      notFound()
    }
    return (
      <div className="rounded-2xl bg-red-50 p-8 text-center text-red-600">
        <p className="font-bold">Error al cargar perfil</p>
        <p className="text-sm">{result.error}</p>
      </div>
    )
  }

  const pet = result.data

  // Process medical records and prescriptions for timeline
  const records = ((pet.medical_records as MedicalRecord[]) || []).sort(
    (a: MedicalRecord, b: MedicalRecord) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  const prescriptions = ((pet.prescriptions as Prescription[]) || []).sort(
    (a: Prescription, b: Prescription) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  // Build timeline items
  const timelineItems: TimelineItem[] = [
    ...records.map(
      (r: MedicalRecord): TimelineItem => ({
        id: r.id,
        created_at: r.created_at,
        type: 'record',
        record_type: r.type,
        title: r.title || 'Consulta',
        diagnosis: r.diagnosis || null,
        vitals: r.vital_signs as TimelineItem['vitals'],
        notes: r.notes || null,
        attachments: r.attachments || undefined,
        vet_name: undefined,
      })
    ),
    ...prescriptions.map(
      (p: Prescription): TimelineItem => ({
        id: p.id,
        created_at: p.created_at,
        type: 'prescription',
        title: 'Receta Médica',
        medications: [],
      })
    ),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // Fetch weight history from dedicated table
  const { data: weightHistoryData } = await supabase
    .from('pet_weight_history')
    .select('id, weight_kg, recorded_at, notes, recorded_by')
    .eq('pet_id', id)
    .is('deleted_at', null)
    .order('recorded_at', { ascending: true })

  // Extract weight from medical records (legacy source)
  const weightFromRecords: WeightRecord[] = records
    .filter(
      (r): r is MedicalRecord & { vital_signs: { weight: number } } =>
        r.vital_signs !== null && typeof r.vital_signs === 'object' && 'weight' in r.vital_signs
    )
    .map((r): WeightRecord => {
      const recordDate = new Date(r.created_at)
      const birthDate = pet.birth_date ? new Date(pet.birth_date) : null
      let age_weeks = undefined
      if (birthDate) {
        age_weeks = Math.floor(
          (recordDate.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 7)
        )
      }
      return {
        date: r.created_at,
        weight_kg: Number(r.vital_signs.weight),
        age_weeks,
      }
    })

  // Convert dedicated weight history to same format
  const birthDate = pet.birth_date ? new Date(pet.birth_date) : null
  const weightFromHistory: WeightRecord[] = (weightHistoryData || []).map((w) => {
    const recordDate = new Date(w.recorded_at)
    let age_weeks = undefined
    if (birthDate) {
      age_weeks = Math.floor(
        (recordDate.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 7)
      )
    }
    return {
      date: w.recorded_at,
      weight_kg: Number(w.weight_kg),
      age_weeks,
    }
  })

  // Merge and deduplicate (prefer dedicated history over medical records)
  const allWeights = [...weightFromHistory, ...weightFromRecords]
  const seenDates = new Set<string>()
  const weightHistory: WeightRecord[] = allWeights
    .filter((w) => {
      // Deduplicate by date (same day = same record)
      const dateKey = w.date.substring(0, 10) // YYYY-MM-DD
      if (seenDates.has(dateKey)) return false
      seenDates.add(dateKey)
      return true
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Fetch appointments for this pet
  const { data: appointments } = await supabase
    .from('appointments')
    .select(
      `
      id,
      start_time,
      end_time,
      status,
      notes,
      cancellation_reason,
      services (id, name, category),
      profiles:vet_id (id, full_name)
    `
    )
    .eq('pet_id', id)
    .eq('tenant_id', profile.tenant_id)
    .order('start_time', { ascending: false })
    .limit(50)

  // Transform appointments to match expected format
  const formattedAppointments = (appointments || []).map((apt) => {
    const service = apt.services as unknown as { id: string; name: string; category: string } | null
    const vet = apt.profiles as unknown as { id: string; full_name: string } | null
    return {
      id: apt.id,
      start_time: apt.start_time,
      end_time: apt.end_time,
      status: apt.status as
        | 'confirmed'
        | 'in_progress'
        | 'completed'
        | 'cancelled'
        | 'no_show'
        | 'scheduled',
      notes: apt.notes,
      cancellation_reason: apt.cancellation_reason,
      service: service
        ? {
            id: service.id,
            name: service.name,
            category: service.category,
          }
        : null,
      vet: vet
        ? {
            id: vet.id,
            full_name: vet.full_name,
          }
        : null,
    }
  })

  // Fetch pet documents
  const documentsResult = await getPetDocuments(id)
  const documents = documentsResult.success ? documentsResult.data || [] : []

  // Fetch invoices for this pet's owner
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, invoice_number, total, status, due_date, created_at')
    .eq('tenant_id', profile.tenant_id)
    .eq('client_id', pet.owner_id)
    .order('created_at', { ascending: false })
    .limit(20)

  // Fetch payments
  const { data: payments } = await supabase
    .from('payments')
    .select('id, amount, payment_date, payment_method')
    .eq('tenant_id', profile.tenant_id)
    .order('payment_date', { ascending: false })
    .limit(20)

  const formattedPayments = (payments || []).map((p) => ({
    id: p.id,
    amount: p.amount,
    payment_date: p.payment_date,
    method: p.payment_method || 'Efectivo',
  }))

  return (
    <div className="space-y-6">
      {/* Back Navigation */}
      <Link
        href={`/${clinic}/dashboard/patients`}
        className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Pacientes
      </Link>

      {/* Vaccine Reaction Alert */}
      <VaccineReactionAlert reactions={pet.vaccine_reactions as VaccineReaction[]} />

      {/* Pet Profile Header */}
      <PetProfileHeader pet={pet} clinic={clinic} isStaff={true} />

      {/* Tab-based Content */}
      <PetDetailContent
        pet={pet}
        clinic={clinic}
        clinicName={clinicData?.config?.name}
        isStaff={true}
        weightHistory={weightHistory}
        timelineItems={timelineItems}
        appointments={formattedAppointments}
        documents={documents}
        invoices={(invoices || []) as Parameters<typeof PetDetailContent>[0]['invoices']}
        payments={formattedPayments}
      />
    </div>
  )
}
