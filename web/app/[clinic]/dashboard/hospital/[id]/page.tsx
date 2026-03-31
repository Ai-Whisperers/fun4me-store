'use client'

/**
 * Hospitalization Detail Page
 *
 * RES-001: Migrated to React Query for data fetching
 */

import type { JSX } from 'react'
import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, FileText, Heart, Activity, Utensils, Clock } from 'lucide-react'
import { PatientHeader } from '@/components/hospital/patient-header'
import { PatientInfoCard } from '@/components/hospital/patient-info-card'
import { OverviewPanel } from '@/components/hospital/overview-panel'
import { VitalsPanel } from '@/components/hospital/vitals-panel'
import { FeedingsPanel } from '@/components/hospital/feedings-panel'
import { TimelinePanel } from '@/components/hospital/timeline-panel'
import TreatmentSheet from '@/components/hospital/treatment-sheet'
import { useToast } from '@/components/ui/Toast'
import { staleTimes, gcTimes } from '@/lib/queries/utils'

interface HospitalizationDetail {
  id: string
  hospitalization_number: string
  hospitalization_type: string
  admission_date: string
  discharge_date?: string
  admission_diagnosis: string
  treatment_plan?: string
  diet_instructions?: string
  acuity_level: string
  status: string
  estimated_discharge_date?: string
  discharge_notes?: string
  discharge_instructions?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  pet: {
    id: string
    name: string
    species: string
    breed: string
    date_of_birth: string
    weight: number
    owner: {
      full_name: string
      email: string
      phone: string
    }
  }
  kennel: {
    id: string
    kennel_number: string
    kennel_type: string
    size: string
    location: string
  }
  admitted_by?: {
    full_name: string
  }
  discharged_by?: {
    full_name: string
  }
  vitals: Array<{
    id: string
    recorded_at: string
    temperature?: number
    heart_rate?: number
    respiratory_rate?: number
    weight?: number
    blood_pressure_systolic?: number
    blood_pressure_diastolic?: number
    mucous_membrane_color?: string
    capillary_refill_time?: string
    pain_score?: number
    notes?: string
    recorded_by?: {
      full_name: string
    }
  }>
  treatments: Array<{
    id: string
    treatment_type: string
    medication_name?: string
    dosage?: string
    route?: string
    frequency?: string
    scheduled_time: string
    administered_at?: string
    status: string
    notes?: string
    administered_by?: {
      full_name: string
    }
  }>
  feedings: Array<{
    id: string
    feeding_time: string
    food_type: string
    amount_offered: number
    amount_consumed: number
    appetite_level: string
    notes?: string
    fed_by?: {
      full_name: string
    }
  }>
  transfers: Array<{
    id: string
    from_kennel: {
      kennel_number: string
      location: string
    }
    to_kennel: {
      kennel_number: string
      location: string
    }
    transfer_date: string
    reason: string
    transferred_by?: {
      full_name: string
    }
  }>
  visits: Array<{
    id: string
    visitor_name: string
    visit_start: string
    visit_end?: string
    notes?: string
    authorized_by?: {
      full_name: string
    }
  }>
}

export default function HospitalizationDetailPage({
  params,
}: {
  params: Promise<{ clinic: string; id: string }>
}): JSX.Element {
  const resolvedParams = use(params)
  const { id } = resolvedParams

  const [activeTab, setActiveTab] = useState<
    'overview' | 'vitals' | 'treatments' | 'feedings' | 'timeline'
  >('overview')

  const router = useRouter()
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  // React Query: Fetch hospitalization
  const {
    data: hospitalization,
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: ['hospitalization', id],
    queryFn: async (): Promise<HospitalizationDetail> => {
      const response = await fetch(`/api/hospitalizations/${id}`)
      if (!response.ok) throw new Error('Error al cargar hospitalización')
      return response.json()
    },
    staleTime: staleTimes.SHORT,
    gcTime: gcTimes.SHORT,
  })

  // Mutation: Discharge patient
  const dischargeMutation = useMutation({
    mutationFn: async (dischargeNotes?: string) => {
      const response = await fetch(`/api/hospitalizations/${id}/discharge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discharge_notes: dischargeNotes || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al dar de alta')
      }

      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['hospitalization'] })
      showToast({
        title: `Paciente dado de alta exitosamente. Factura ${data.invoice?.invoice_number || ''} generada.`,
        variant: 'success',
      })

      if (data.invoice?.id && confirm('¿Desea ver la factura generada ahora?')) {
        router.push(`/dashboard/invoices/${data.invoice.id}`)
      } else {
        router.push('/dashboard/hospital')
      }
    },
    onError: (error) => {
      showToast({ title: error instanceof Error ? error.message : 'Error al dar de alta al paciente', variant: 'error' })
    },
  })

  // Mutation: Generate invoice
  const invoiceMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/hospitalizations/${id}/invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.invoice_id) {
          // Return special case for existing invoice
          return { existing: true, invoice_id: data.invoice_id, error: data.error }
        }
        throw new Error(data.error || 'Error al generar factura')
      }

      return { existing: false, invoice: data.invoice }
    },
    onSuccess: (data) => {
      if (data.existing) {
        if (confirm(`${data.error}. ¿Desea ver la factura existente?`)) {
          router.push(`/dashboard/invoices/${data.invoice_id}`)
        }
      } else {
        showToast({
          title: `Factura ${data.invoice.invoice_number} generada exitosamente. Total: ${new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 }).format(data.invoice.total)}`,
          variant: 'success',
        })

        if (confirm('¿Desea ir a la factura?')) {
          router.push(`/dashboard/invoices/${data.invoice.id}`)
        }
      }
    },
    onError: (error) => {
      showToast({ title: error instanceof Error ? error.message : 'Error al generar factura', variant: 'error' })
    },
  })

  const saving = dischargeMutation.isPending || invoiceMutation.isPending

  const handleDischarge = async (): Promise<void> => {
    if (
      !confirm(
        '¿Está seguro que desea dar de alta a este paciente? Esta acción generará la factura final automáticamente.'
      )
    )
      return

    const dischargeNotes = prompt('Notas de alta (opcional):')
    dischargeMutation.mutate(dischargeNotes || undefined)
  }

  const handleGenerateInvoice = async (): Promise<void> => {
    if (!confirm('¿Generar factura para esta hospitalización?')) return
    invoiceMutation.mutate()
  }

  const fetchHospitalization = async (): Promise<void> => {
    await refetch()
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[var(--text-secondary)]">Cargando...</p>
      </div>
    )
  }

  if (!hospitalization) {
    return (
      <div className="p-6">
        <div className="py-12 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-[var(--text-secondary)]" />
          <p className="text-[var(--text-secondary)]">Hospitalización no encontrada</p>
          <button
            onClick={() => router.push('/dashboard/hospital')}
            className="mt-4 rounded-lg bg-[var(--primary)] px-4 py-2 text-white"
          >
            Volver
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <PatientHeader
        hospitalization={hospitalization}
        saving={saving}
        onBack={() => router.push('/dashboard/hospital')}
        onGenerateInvoice={handleGenerateInvoice}
        onDischarge={handleDischarge}
      />

      <PatientInfoCard hospitalization={hospitalization} />

      {/* Tabs */}
      <div className="border-b border-[var(--border)]">
        <div className="flex gap-4">
          {[
            { id: 'overview', label: 'Resumen', icon: FileText },
            { id: 'vitals', label: 'Signos Vitales', icon: Heart },
            { id: 'treatments', label: 'Tratamientos', icon: Activity },
            { id: 'feedings', label: 'Alimentación', icon: Utensils },
            { id: 'timeline', label: 'Línea de Tiempo', icon: Clock },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 transition-colors ${
                activeTab === tab.id
                  ? 'border-[var(--primary)] text-[var(--primary)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-6">
        {activeTab === 'overview' && <OverviewPanel hospitalization={hospitalization} />}

        {activeTab === 'vitals' && (
          <VitalsPanel
            hospitalizationId={id}
            vitals={hospitalization.vitals}
            onVitalsSaved={fetchHospitalization}
          />
        )}

        {activeTab === 'treatments' && (
          <TreatmentSheet
            hospitalizationId={id}
            treatments={hospitalization.treatments || []}
            onTreatmentUpdate={fetchHospitalization}
          />
        )}

        {activeTab === 'feedings' && (
          <FeedingsPanel
            hospitalizationId={id}
            feedings={hospitalization.feedings}
            onFeedingSaved={fetchHospitalization}
          />
        )}

        {activeTab === 'timeline' && <TimelinePanel hospitalization={hospitalization} />}
      </div>
    </div>
  )
}
