'use client'

/**
 * Consent Detail Page
 *
 * RES-001: Migrated to React Query for data fetching
 */

import type { JSX } from 'react'
import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { staleTimes, gcTimes } from '@/lib/queries/utils'
import { pdf } from '@react-pdf/renderer'
import { ConsentPDF } from '@/components/consents/consent-pdf'
import { useToast } from '@/components/ui/Toast'
import {
  Calendar,
  AlertCircle,
  Download,
  Mail,
  XCircle,
  CheckCircle,
  Clock,
  Shield,
} from 'lucide-react'
import { createSanitizedHtml } from '@/lib/utils'

interface AuditLogEntry {
  id: string
  action: string
  created_at: string
  details: Record<string, unknown> | null
  performed_by: {
    full_name: string
  }
}

interface ConsentDocument {
  id: string
  status: string
  custom_content: string | null
  field_values: Record<string, string | number | boolean | null>
  signature_data: string
  signed_at: string
  signed_by_id: string
  witness_signature_data: string | null
  witness_name: string | null
  id_verification_type: string | null
  id_verification_number: string | null
  expires_at: string | null
  can_be_revoked: boolean
  revoked_at: string | null
  revoked_by_id: string | null
  revocation_reason: string | null
  email_sent_at: string | null
  pet: {
    id: string
    name: string
    species: string
    breed: string
  }
  owner: {
    id: string
    full_name: string
    email: string
    phone: string
  }
  template: {
    id: string
    name: string
    category: string
    content: string
    requires_witness: boolean
    can_be_revoked: boolean
  }
  signed_by_user: {
    id: string
    full_name: string
  }
  audit_log: AuditLogEntry[]
}

export default function ConsentDetailPage(): JSX.Element {
  const [showRevokeModal, setShowRevokeModal] = useState(false)
  const [revocationReason, setRevocationReason] = useState('')
  const _router = useRouter() // Reserved for future use
  const params = useParams()
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  const consentId = params?.id as string

  // React Query: Fetch consent
  const {
    data: consent,
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: ['consent', consentId],
    queryFn: async (): Promise<ConsentDocument> => {
      const response = await fetch(`/api/consents/${consentId}`)
      if (!response.ok) {
        throw new Error('Error al cargar consentimiento')
      }
      return response.json()
    },
    enabled: !!consentId,
    staleTime: staleTimes.SHORT,
    gcTime: gcTimes.SHORT,
  })

  // Mutation: Revoke consent
  const revokeMutation = useMutation({
    mutationFn: async (reason: string) => {
      const response = await fetch(`/api/consents/${consentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'revoke',
          reason,
        }),
      })

      if (!response.ok) {
        throw new Error('Error al revocar consentimiento')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consent', consentId] })
      setShowRevokeModal(false)
      setRevocationReason('')
    },
    onError: () => {
      showToast({ title: 'Error al revocar el consentimiento', variant: 'error' })
    },
  })

  const revoking = revokeMutation.isPending

  const handleRevoke = async (): Promise<void> => {
    if (!consent) return
    await revokeMutation.mutateAsync(revocationReason)
  }

  const fetchConsent = async (): Promise<void> => {
    await refetch()
  }

  const handleDownloadPDF = async (): Promise<void> => {
    if (!consent) return

    try {
      // Generate PDF blob
      const blob = await pdf(
        <ConsentPDF
          clinicName={consent.template.name}
          templateName={consent.template.name}
          templateCategory={consent.template.category}
          documentNumber={consent.id.substring(0, 8).toUpperCase()}
          petName={consent.pet.name}
          petSpecies={consent.pet.species}
          petBreed={consent.pet.breed}
          ownerName={consent.owner.full_name}
          ownerEmail={consent.owner.email}
          ownerPhone={consent.owner.phone || ''}
          content={renderContent()}
          fieldValues={consent.field_values}
          signatureData={consent.signature_data}
          signedAt={consent.signed_at}
          witnessName={consent.witness_name || undefined}
          witnessSignatureData={consent.witness_signature_data || undefined}
          idVerificationType={consent.id_verification_type || undefined}
          idVerificationNumber={consent.id_verification_number || undefined}
          status={consent.status}
        />
      ).toBlob()

      // Create download link
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `consentimiento-${consent.pet.name}-${new Date(consent.signed_at).toLocaleDateString('es-PY')}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      // Log download action
      await fetch(`/api/consents/${consent.id}/audit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'downloaded',
        }),
      })
    } catch (error) {
      // Client-side error logging - only in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Error generating PDF:', error)
      }
      showToast({ title: 'Error al generar el PDF', variant: 'error' })
    }
  }

  const handleSendEmail = async (): Promise<void> => {
    if (!consent?.owner?.email) {
      showToast({ title: 'El propietario no tiene correo electrónico registrado', variant: 'warning' })
      return
    }

    if (!confirm(`¿Enviar el consentimiento firmado a ${consent.owner.email}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/consents/${consentId}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al enviar email')
      }

      showToast({ title: `Email enviado exitosamente a ${consent.owner.email}`, variant: 'success' })

      // Refresh to update audit log
      fetchConsent()
    } catch (error) {
      // Client-side error logging - only in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Error sending email:', error)
      }
      showToast({ title: error instanceof Error ? error.message : 'Error al enviar email', variant: 'error' })
    }
  }

  const renderContent = (): string => {
    if (!consent) return ''

    let content = consent.custom_content || consent.template.content

    // Replace pet placeholders
    content = content.replace(/{{pet_name}}/g, consent.pet.name)
    content = content.replace(/{{pet_species}}/g, consent.pet.species)
    content = content.replace(/{{pet_breed}}/g, consent.pet.breed)

    // Replace owner placeholders
    content = content.replace(/{{owner_name}}/g, consent.owner.full_name)
    content = content.replace(/{{owner_email}}/g, consent.owner.email)
    content = content.replace(/{{owner_phone}}/g, consent.owner.phone || '')

    // Replace custom field placeholders
    if (consent.field_values) {
      Object.keys(consent.field_values).forEach((key) => {
        const value = consent.field_values[key]
        content = content.replace(new RegExp(`{{${key}}}`, 'g'), String(value || ''))
      })
    }

    // Replace date placeholder
    content = content.replace(/{{date}}/g, new Date(consent.signed_at).toLocaleDateString('es-PY'))

    return content
  }

  const getStatusBadge = (status: string): JSX.Element => {
    const statusConfig: Record<string, { color: string; icon: JSX.Element; label: string }> = {
      active: {
        color: 'bg-green-100 text-green-800',
        icon: <CheckCircle className="h-5 w-5" />,
        label: 'Activo',
      },
      expired: {
        color: 'bg-yellow-100 text-yellow-800',
        icon: <Clock className="h-5 w-5" />,
        label: 'Expirado',
      },
      revoked: {
        color: 'bg-red-100 text-red-800',
        icon: <XCircle className="h-5 w-5" />,
        label: 'Revocado',
      },
    }

    const config = statusConfig[status] || statusConfig.active

    return (
      <div
        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium ${config.color}`}
      >
        {config.icon}
        {config.label}
      </div>
    )
  }

  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      surgery: 'Cirugía',
      anesthesia: 'Anestesia',
      euthanasia: 'Eutanasia',
      boarding: 'Hospedaje',
      treatment: 'Tratamiento',
      vaccination: 'Vacunación',
      diagnostic: 'Diagnóstico',
      other: 'Otro',
    }
    return labels[category] || category
  }

  const getActionLabel = (action: string): string => {
    const labels: Record<string, string> = {
      signed: 'Firmado',
      revoked: 'Revocado',
      viewed: 'Visualizado',
      downloaded: 'Descargado',
      sent: 'Enviado por email',
    }
    return labels[action] || action
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-[var(--primary)]"></div>
            <p className="mt-4 text-[var(--text-secondary)]">Cargando consentimiento...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!consent) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <div className="border-[var(--primary)]/20 rounded-lg border bg-[var(--bg-paper)] p-12 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-[var(--text-secondary)]" />
          <p className="text-[var(--text-secondary)]">Consentimiento no encontrado</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] md:text-3xl">
              {consent.template.name}
            </h1>
            <p className="mt-1 text-[var(--text-secondary)]">
              {getCategoryLabel(consent.template.category)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleDownloadPDF}
              className="hover:bg-[var(--primary)]/10 border-[var(--primary)]/20 inline-flex items-center gap-2 rounded-lg border bg-[var(--bg-paper)] px-4 py-2 text-[var(--text-primary)] transition-colors"
            >
              <Download className="h-4 w-4" />
              Descargar PDF
            </button>
            <button
              onClick={handleSendEmail}
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors ${
                consent.email_sent_at
                  ? 'border-green-500/30 bg-green-50 text-green-700 hover:bg-green-100'
                  : 'hover:bg-[var(--primary)]/10 border-[var(--primary)]/20 bg-[var(--bg-paper)] text-[var(--text-primary)]'
              }`}
              title={
                consent.email_sent_at
                  ? `Enviado el ${new Date(consent.email_sent_at).toLocaleString('es-PY')}`
                  : 'Enviar consentimiento firmado por email'
              }
            >
              <Mail className="h-4 w-4" />
              {consent.email_sent_at ? 'Reenviar email' : 'Enviar por email'}
            </button>
            {consent.can_be_revoked && consent.status === 'active' && (
              <button
                onClick={() => setShowRevokeModal(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
              >
                <XCircle className="h-4 w-4" />
                Revocar
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Status */}
          <div className="border-[var(--primary)]/20 rounded-lg border bg-[var(--bg-paper)] p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Estado</h2>
              {getStatusBadge(consent.status)}
            </div>
            {consent.status === 'revoked' && consent.revocation_reason && (
              <div className="mt-4 rounded-lg bg-red-50 p-4">
                <p className="text-sm text-red-800">
                  <strong>Motivo de revocación:</strong> {consent.revocation_reason}
                </p>
                {consent.revoked_at && (
                  <p className="mt-2 text-xs text-red-600">
                    Revocado el {new Date(consent.revoked_at).toLocaleString('es-PY')}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Document Content */}
          <div className="border-[var(--primary)]/20 rounded-lg border bg-[var(--bg-paper)] p-6">
            <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">Documento</h2>
            <div
              className="prose max-w-none text-[var(--text-primary)]"
              dangerouslySetInnerHTML={createSanitizedHtml(renderContent(), 'consent')}
            />
          </div>

          {/* Signatures */}
          <div className="border-[var(--primary)]/20 rounded-lg border bg-[var(--bg-paper)] p-6">
            <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">Firmas</h2>

            <div className="space-y-6">
              {/* Owner Signature */}
              <div>
                <h3 className="mb-2 text-sm font-medium text-[var(--text-secondary)]">
                  Firma del propietario
                </h3>
                <div className="border-[var(--primary)]/20 rounded-lg border bg-white p-4">
                  {consent.signature_data.startsWith('data:image') ? (
                    <img
                      src={consent.signature_data}
                      alt="Firma del propietario"
                      className="max-h-32"
                    />
                  ) : (
                    <p className="font-serif text-2xl" style={{ fontFamily: 'cursive' }}>
                      {consent.signature_data}
                    </p>
                  )}
                </div>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {consent.owner.full_name} - {new Date(consent.signed_at).toLocaleString('es-PY')}
                </p>
              </div>

              {/* Witness Signature */}
              {consent.witness_signature_data && (
                <div>
                  <h3 className="mb-2 text-sm font-medium text-[var(--text-secondary)]">
                    Firma del testigo
                  </h3>
                  <div className="border-[var(--primary)]/20 rounded-lg border bg-white p-4">
                    {consent.witness_signature_data.startsWith('data:image') ? (
                      <img
                        src={consent.witness_signature_data}
                        alt="Firma del testigo"
                        className="max-h-32"
                      />
                    ) : (
                      <p className="font-serif text-2xl" style={{ fontFamily: 'cursive' }}>
                        {consent.witness_signature_data}
                      </p>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    {consent.witness_name}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Audit Log */}
          {consent.audit_log && consent.audit_log.length > 0 && (
            <div className="border-[var(--primary)]/20 rounded-lg border bg-[var(--bg-paper)] p-6">
              <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
                Historial de auditoría
              </h2>
              <div className="space-y-3">
                {consent.audit_log.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 rounded-lg bg-[var(--bg-default)] p-3"
                  >
                    <div className="mt-1">
                      <Shield className="h-4 w-4 text-[var(--primary)]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {getActionLabel(entry.action)}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        Por {entry.performed_by.full_name} -{' '}
                        {new Date(entry.created_at).toLocaleString('es-PY')}
                      </p>
                      {entry.details && Object.keys(entry.details).length > 0 && (
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">
                          {JSON.stringify(entry.details)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Pet Info */}
          <div className="border-[var(--primary)]/20 rounded-lg border bg-[var(--bg-paper)] p-6">
            <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">Mascota</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Nombre</p>
                <p className="font-medium text-[var(--text-primary)]">{consent.pet.name}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Especie</p>
                <p className="font-medium text-[var(--text-primary)]">{consent.pet.species}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Raza</p>
                <p className="font-medium text-[var(--text-primary)]">{consent.pet.breed}</p>
              </div>
            </div>
          </div>

          {/* Owner Info */}
          <div className="border-[var(--primary)]/20 rounded-lg border bg-[var(--bg-paper)] p-6">
            <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">Propietario</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Nombre</p>
                <p className="font-medium text-[var(--text-primary)]">{consent.owner.full_name}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Email</p>
                <p className="font-medium text-[var(--text-primary)]">{consent.owner.email}</p>
              </div>
              {consent.owner.phone && (
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Teléfono</p>
                  <p className="font-medium text-[var(--text-primary)]">{consent.owner.phone}</p>
                </div>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="border-[var(--primary)]/20 rounded-lg border bg-[var(--bg-paper)] p-6">
            <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">Fechas</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Calendar className="mt-1 h-4 w-4 text-[var(--primary)]" />
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Firmado</p>
                  <p className="font-medium text-[var(--text-primary)]">
                    {new Date(consent.signed_at).toLocaleString('es-PY')}
                  </p>
                </div>
              </div>
              {consent.expires_at && (
                <div className="flex items-start gap-2">
                  <Clock className="mt-1 h-4 w-4 text-[var(--primary)]" />
                  <div>
                    <p className="text-sm text-[var(--text-secondary)]">Expira</p>
                    <p className="font-medium text-[var(--text-primary)]">
                      {new Date(consent.expires_at).toLocaleString('es-PY')}
                    </p>
                  </div>
                </div>
              )}
              {consent.email_sent_at && (
                <div className="flex items-start gap-2">
                  <Mail className="mt-1 h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm text-[var(--text-secondary)]">Enviado por email</p>
                    <p className="font-medium text-green-700">
                      {new Date(consent.email_sent_at).toLocaleString('es-PY')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ID Verification */}
          {consent.id_verification_type && consent.id_verification_number && (
            <div className="border-[var(--primary)]/20 rounded-lg border bg-[var(--bg-paper)] p-6">
              <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
                Verificación de identidad
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Tipo de documento</p>
                  <p className="font-medium text-[var(--text-primary)]">
                    {consent.id_verification_type.toUpperCase()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Número</p>
                  <p className="font-medium text-[var(--text-primary)]">
                    {consent.id_verification_number}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Revoke Modal */}
      {showRevokeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-[var(--bg-paper)] p-6">
            <h2 className="mb-4 text-2xl font-bold text-[var(--text-primary)]">
              Revocar Consentimiento
            </h2>
            <p className="mb-6 text-[var(--text-secondary)]">
              ¿Está seguro que desea revocar este consentimiento? Esta acción quedará registrada en
              el historial de auditoría.
            </p>
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                Motivo de revocación (opcional)
              </label>
              <textarea
                value={revocationReason}
                onChange={(e) => setRevocationReason(e.target.value)}
                rows={3}
                className="border-[var(--primary)]/20 w-full rounded-lg border bg-[var(--bg-default)] px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                placeholder="Describa el motivo..."
              />
            </div>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowRevokeModal(false)}
                disabled={revoking}
                className="hover:bg-[var(--primary)]/10 border-[var(--primary)]/20 rounded-lg border bg-[var(--bg-default)] px-4 py-2 text-[var(--text-primary)] transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleRevoke}
                disabled={revoking}
                className="rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {revoking ? 'Revocando...' : 'Confirmar revocación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
