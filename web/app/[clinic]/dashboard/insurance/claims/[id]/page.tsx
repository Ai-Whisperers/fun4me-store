'use client'

/**
 * Claim Detail Page
 *
 * RES-001: Migrated to React Query for data fetching
 */

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { staleTimes, gcTimes } from '@/lib/queries/utils'
import { useToast } from '@/components/ui/Toast'
import ClaimTracker from '@/components/insurance/claim-tracker'
import ClaimStatusBadge from '@/components/insurance/claim-status-badge'
import {
  ArrowLeft,
  FileText,
  Upload,
  MessageSquare,
  DollarSign,
  Send,
  CheckCircle,
  XCircle,
} from 'lucide-react'

interface ClaimDetailPageProps {
  params: Promise<{
    id: string
    clinic: string
  }>
}

interface ClaimItem {
  id: string
  service_date: string
  service_code: string
  description: string
  quantity: number
  unit_price: number
  total_price: number
  approved_amount: number | null
  denial_reason: string | null
}

interface ClaimDocument {
  id: string
  document_type: string
  title: string
  file_url: string
  sent_to_insurance: boolean
  sent_at: string | null
  created_at: string
}

interface ClaimCommunication {
  id: string
  direction: string
  channel: string
  subject: string | null
  content: string
  contact_name: string | null
  created_at: string
  requires_follow_up: boolean
  follow_up_date: string | null
}

interface Claim {
  id: string
  claim_number: string
  provider_claim_number: string | null
  status: string
  claim_type: string
  date_of_service: string
  diagnosis: string
  diagnosis_code: string | null
  treatment_description: string
  total_charges: number
  claimed_amount: number
  approved_amount: number | null
  paid_amount: number | null
  deductible_applied: number
  coinsurance_amount: number
  denial_reason: string | null
  internal_notes: string | null
  provider_notes: string | null
  submitted_at: string | null
  acknowledged_at: string | null
  processed_at: string | null
  paid_at: string | null
  created_at: string
  pets: {
    id: string
    name: string
    species: string
    breed: string | null
  }
  pet_insurance_policies: {
    id: string
    policy_number: string
    plan_name: string
    deductible_amount: number | null
    coinsurance_percentage: number | null
    insurance_providers: {
      id: string
      name: string
      logo_url: string | null
      claims_email: string | null
      claims_phone: string | null
    }
  }
  insurance_claim_items: ClaimItem[]
  insurance_claim_documents: ClaimDocument[]
  insurance_claim_communications: ClaimCommunication[]
  insurance_eob: Array<{
    id: string
    eob_number: string | null
    eob_date: string
    billed_amount: number
    paid_amount: number
    patient_responsibility: number | null
  }>
}

export default function ClaimDetailPage({ params }: ClaimDetailPageProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  // Use React 19 use() hook for async params
  const { id: claimId } = use(params)

  const [showStatusModal, setShowStatusModal] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [newNote, setNewNote] = useState('')

  // React Query: Fetch claim details
  const { data: claim, isLoading: loading, refetch } = useQuery({
    queryKey: ['insurance-claim', claimId],
    queryFn: async (): Promise<Claim> => {
      const response = await fetch(`/api/insurance/claims/${claimId}`)
      if (!response.ok) throw new Error('Error al cargar reclamo')
      return response.json()
    },
    enabled: !!claimId,
    staleTime: staleTimes.SHORT,
    gcTime: gcTimes.MEDIUM,
  })

  // Mutation: Update claim status
  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      const response = await fetch(`/api/insurance/claims/${claimId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!response.ok) throw new Error('Error al actualizar estado')
      return response.json()
    },
    onSuccess: () => {
      showToast({ title: 'Estado actualizado', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['insurance-claim', claimId] })
      queryClient.invalidateQueries({ queryKey: ['insurance-claims'] })
      setShowStatusModal(false)
    },
    onError: (error) => {
      showToast({ title: error instanceof Error ? error.message : 'Error desconocido', variant: 'error' })
    },
  })

  // Mutation: Add note
  const noteMutation = useMutation({
    mutationFn: async (noteText: string) => {
      const response = await fetch(`/api/insurance/claims/${claimId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internal_notes:
            (claim?.internal_notes || '') + '\n\n' + new Date().toISOString() + ':\n' + noteText,
        }),
      })
      if (!response.ok) throw new Error('Error al agregar nota')
      return response.json()
    },
    onSuccess: () => {
      showToast({ title: 'Nota agregada', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['insurance-claim', claimId] })
      setNewNote('')
      setShowNoteModal(false)
    },
    onError: (error) => {
      showToast({ title: error instanceof Error ? error.message : 'Error desconocido', variant: 'error' })
    },
  })

  const updateClaimStatus = (status: string) => {
    statusMutation.mutate(status)
  }

  const addNote = () => {
    if (!newNote.trim()) return
    noteMutation.mutate(newNote)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[var(--text-secondary)]">Cargando reclamo...</p>
      </div>
    )
  }

  if (!claim) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <p className="mb-4 text-[var(--text-secondary)]">Reclamo no encontrado</p>
        <button
          onClick={() => router.back()}
          className="rounded-md bg-[var(--primary)] px-4 py-2 text-white"
        >
          Volver
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-default)] p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="mb-4 flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <ArrowLeft className="h-5 w-5" />
            Volver a Reclamos
          </button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[var(--text-primary)]">
                Reclamo {claim.claim_number}
              </h1>
              <p className="mt-1 text-[var(--text-secondary)]">
                {claim.pets.name} - {claim.diagnosis}
              </p>
            </div>
            <ClaimStatusBadge status={claim.status} className="px-3 py-1 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="space-y-6 lg:col-span-2">
            {/* Claim Tracker */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
                Estado del Reclamo
              </h2>
              <ClaimTracker
                status={claim.status}
                submittedAt={claim.submitted_at}
                acknowledgedAt={claim.acknowledged_at}
                processedAt={claim.processed_at}
                paidAt={claim.paid_at}
              />
            </div>

            {/* Claim Details */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
                Detalles del Reclamo
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Tipo de Reclamo</p>
                  <p className="font-medium capitalize text-[var(--text-primary)]">
                    {claim.claim_type}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Fecha de Servicio</p>
                  <p className="font-medium text-[var(--text-primary)]">
                    {new Date(claim.date_of_service).toLocaleDateString('es-PY')}
                  </p>
                </div>

                <div className="col-span-2">
                  <p className="text-sm text-[var(--text-secondary)]">Diagnóstico</p>
                  <p className="font-medium text-[var(--text-primary)]">{claim.diagnosis}</p>
                  {claim.diagnosis_code && (
                    <p className="text-xs text-[var(--text-secondary)]">
                      Código: {claim.diagnosis_code}
                    </p>
                  )}
                </div>

                <div className="col-span-2">
                  <p className="text-sm text-[var(--text-secondary)]">
                    Descripción del Tratamiento
                  </p>
                  <p className="text-sm text-[var(--text-primary)]">
                    {claim.treatment_description}
                  </p>
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
                Servicios y Cargos
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)]">
                        Fecha
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-secondary)]">
                        Descripción
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-[var(--text-secondary)]">
                        Cant.
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-[var(--text-secondary)]">
                        Precio Unit.
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-[var(--text-secondary)]">
                        Total
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-[var(--text-secondary)]">
                        Aprobado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {claim.insurance_claim_items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2 text-sm text-[var(--text-primary)]">
                          {new Date(item.service_date).toLocaleDateString('es-PY')}
                        </td>
                        <td className="px-4 py-2 text-sm text-[var(--text-primary)]">
                          {item.description}
                          {item.service_code && (
                            <p className="text-xs text-[var(--text-secondary)]">
                              {item.service_code}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-2 text-center text-sm text-[var(--text-primary)]">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-2 text-right text-sm text-[var(--text-primary)]">
                          Gs. {item.unit_price.toLocaleString('es-PY')}
                        </td>
                        <td className="px-4 py-2 text-right text-sm font-medium text-[var(--text-primary)]">
                          Gs. {item.total_price.toLocaleString('es-PY')}
                        </td>
                        <td className="px-4 py-2 text-right text-sm">
                          {item.approved_amount !== null ? (
                            <span className="font-medium text-green-600">
                              Gs. {item.approved_amount.toLocaleString('es-PY')}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-3 text-right font-semibold text-[var(--text-primary)]"
                      >
                        Total Reclamado
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-[var(--text-primary)]">
                        Gs. {claim.claimed_amount.toLocaleString('es-PY')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {claim.approved_amount !== null && (
                          <span className="font-bold text-green-600">
                            Gs. {claim.approved_amount.toLocaleString('es-PY')}
                          </span>
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Documents */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Documentos</h2>
                <button className="flex items-center gap-2 rounded-md bg-[var(--primary)] px-3 py-1 text-sm text-white hover:opacity-90">
                  <Upload className="h-4 w-4" />
                  Subir Documento
                </button>
              </div>

              {claim.insurance_claim_documents.length === 0 ? (
                <p className="py-4 text-center text-[var(--text-secondary)]">
                  No hay documentos adjuntos
                </p>
              ) : (
                <div className="space-y-2">
                  {claim.insurance_claim_documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between rounded-md bg-gray-50 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-[var(--primary)]" />
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">{doc.title}</p>
                          <p className="text-xs text-[var(--text-secondary)]">
                            {doc.document_type} -{' '}
                            {new Date(doc.created_at).toLocaleDateString('es-PY')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.sent_to_insurance && (
                          <span className="text-xs text-green-600">Enviado</span>
                        )}
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-[var(--primary)] hover:underline"
                        >
                          Ver
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Communications */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
                Comunicaciones
              </h2>

              {claim.insurance_claim_communications.length === 0 ? (
                <p className="py-4 text-center text-[var(--text-secondary)]">
                  No hay comunicaciones registradas
                </p>
              ) : (
                <div className="space-y-3">
                  {claim.insurance_claim_communications.map((comm) => (
                    <div key={comm.id} className="rounded-md bg-gray-50 p-4">
                      <div className="mb-2 flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-[var(--primary)]" />
                          <span
                            className={`rounded px-2 py-0.5 text-xs ${
                              comm.direction === 'inbound'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {comm.direction === 'inbound' ? 'Recibido' : 'Enviado'}
                          </span>
                          <span className="text-xs text-[var(--text-secondary)]">
                            {comm.channel}
                          </span>
                        </div>
                        <span className="text-xs text-[var(--text-secondary)]">
                          {new Date(comm.created_at).toLocaleDateString('es-PY')}
                        </span>
                      </div>
                      {comm.subject && (
                        <p className="mb-1 text-sm font-medium text-[var(--text-primary)]">
                          {comm.subject}
                        </p>
                      )}
                      <p className="text-sm text-[var(--text-primary)]">{comm.content}</p>
                      {comm.contact_name && (
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">
                          Contacto: {comm.contact_name}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Policy Info */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
                Información de Póliza
              </h3>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-[var(--text-secondary)]">Aseguradora</p>
                  <p className="font-medium text-[var(--text-primary)]">
                    {claim.pet_insurance_policies.insurance_providers.name}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-[var(--text-secondary)]">Número de Póliza</p>
                  <p className="font-medium text-[var(--text-primary)]">
                    {claim.pet_insurance_policies.policy_number}
                  </p>
                </div>

                {claim.provider_claim_number && (
                  <div>
                    <p className="text-xs text-[var(--text-secondary)]">Nº Reclamo Aseguradora</p>
                    <p className="font-medium text-[var(--text-primary)]">
                      {claim.provider_claim_number}
                    </p>
                  </div>
                )}

                <div className="border-t border-gray-200 pt-3">
                  {claim.pet_insurance_policies.insurance_providers?.claims_email && (
                    <p className="text-xs text-[var(--text-secondary)]">
                      Email: {claim.pet_insurance_policies.insurance_providers.claims_email}
                    </p>
                  )}
                  {claim.pet_insurance_policies.insurance_providers?.claims_phone && (
                    <p className="text-xs text-[var(--text-secondary)]">
                      Teléfono: {claim.pet_insurance_policies.insurance_providers.claims_phone}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
                Resumen Financiero
              </h3>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-[var(--text-secondary)]">Total Cargos</span>
                  <span className="font-medium text-[var(--text-primary)]">
                    Gs. {claim.total_charges.toLocaleString('es-PY')}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm text-[var(--text-secondary)]">Monto Reclamado</span>
                  <span className="font-medium text-[var(--text-primary)]">
                    Gs. {claim.claimed_amount.toLocaleString('es-PY')}
                  </span>
                </div>

                {claim.deductible_applied > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-[var(--text-secondary)]">Deducible Aplicado</span>
                    <span className="font-medium text-red-600">
                      - Gs. {claim.deductible_applied.toLocaleString('es-PY')}
                    </span>
                  </div>
                )}

                {claim.coinsurance_amount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-[var(--text-secondary)]">Coaseguro</span>
                    <span className="font-medium text-red-600">
                      - Gs. {claim.coinsurance_amount.toLocaleString('es-PY')}
                    </span>
                  </div>
                )}

                {claim.approved_amount !== null && (
                  <>
                    <div className="border-t border-gray-200 pt-2" />
                    <div className="flex justify-between">
                      <span className="text-sm font-semibold text-[var(--text-secondary)]">
                        Monto Aprobado
                      </span>
                      <span className="font-bold text-green-600">
                        Gs. {claim.approved_amount.toLocaleString('es-PY')}
                      </span>
                    </div>
                  </>
                )}

                {claim.paid_amount !== null && (
                  <div className="flex justify-between">
                    <span className="text-sm font-semibold text-[var(--text-secondary)]">
                      Monto Pagado
                    </span>
                    <span className="font-bold text-emerald-600">
                      Gs. {claim.paid_amount.toLocaleString('es-PY')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">Acciones</h3>

              <div className="space-y-2">
                {claim.status === 'draft' && (
                  <button
                    onClick={() => updateClaimStatus('submitted')}
                    className="flex w-full items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-4 py-2 text-white hover:opacity-90"
                  >
                    <Send className="h-4 w-4" />
                    Enviar Reclamo
                  </button>
                )}

                {['submitted', 'under_review'].includes(claim.status) && (
                  <>
                    <button
                      onClick={() => {
                        setNewStatus('approved')
                        setShowStatusModal(true)
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2 text-white hover:opacity-90"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Marcar Aprobado
                    </button>

                    <button
                      onClick={() => {
                        setNewStatus('denied')
                        setShowStatusModal(true)
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2 text-white hover:opacity-90"
                    >
                      <XCircle className="h-4 w-4" />
                      Marcar Denegado
                    </button>
                  </>
                )}

                {claim.status === 'approved' && (
                  <button
                    onClick={() => updateClaimStatus('paid')}
                    className="flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-white hover:opacity-90"
                  >
                    <DollarSign className="h-4 w-4" />
                    Marcar como Pagado
                  </button>
                )}

                <button
                  onClick={() => setShowNoteModal(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-md border border-[var(--primary)] px-4 py-2 text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white"
                >
                  <MessageSquare className="h-4 w-4" />
                  Agregar Nota
                </button>

                <button className="flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-[var(--text-primary)] hover:bg-gray-50">
                  <Upload className="h-4 w-4" />
                  Subir Documento
                </button>
              </div>
            </div>

            {/* Notes */}
            {claim.internal_notes && (
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
                  Notas Internas
                </h3>
                <div className="whitespace-pre-wrap text-sm text-[var(--text-primary)]">
                  {claim.internal_notes}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status Change Modal */}
        {showStatusModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
            onClick={() => setShowStatusModal(false)}
          >
            <div
              className="w-full max-w-md rounded-lg bg-white p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="mb-4 text-xl font-bold text-[var(--text-primary)]">
                Confirmar Cambio de Estado
              </h2>
              <p className="mb-6 text-[var(--text-secondary)]">
                ¿Está seguro que desea marcar este reclamo como{' '}
                <strong>{newStatus === 'approved' ? 'aprobado' : 'denegado'}</strong>?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-[var(--text-primary)] hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => updateClaimStatus(newStatus)}
                  className={`flex-1 rounded-md px-4 py-2 text-white hover:opacity-90 ${
                    newStatus === 'approved' ? 'bg-green-600' : 'bg-red-600'
                  }`}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Note Modal */}
        {showNoteModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
            onClick={() => setShowNoteModal(false)}
          >
            <div
              className="w-full max-w-md rounded-lg bg-white p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="mb-4 text-xl font-bold text-[var(--text-primary)]">
                Agregar Nota Interna
              </h2>
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                rows={4}
                placeholder="Escriba su nota aquí..."
              />
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => setShowNoteModal(false)}
                  className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-[var(--text-primary)] hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={addNote}
                  className="flex-1 rounded-md bg-[var(--primary)] px-4 py-2 text-white hover:opacity-90"
                >
                  Guardar Nota
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
