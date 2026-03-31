'use client'

/**
 * Report Transfer Modal Component
 *
 * Form for reporting a bank transfer payment.
 */

import { useState } from 'react'
import { Modal, ModalFooter } from '@/components/ui/modal'
import { Building2, Upload, Loader2, AlertCircle, Calendar, FileText } from 'lucide-react'

interface ReportTransferModalProps {
  isOpen: boolean
  onClose: () => void
  invoiceId: string | undefined
  clinic: string
  onSuccess: () => void
}

export function ReportTransferModal({
  isOpen,
  onClose,
  invoiceId,
  clinic,
  onSuccess,
}: ReportTransferModalProps): React.ReactElement {
  const [reference, setReference] = useState('')
  const [transferDate, setTransferDate] = useState('')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function resetForm(): void {
    setReference('')
    setTransferDate('')
    setProofFile(null)
    setError(null)
  }

  function handleClose(): void {
    resetForm()
    onClose()
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()

    if (!invoiceId) {
      setError('No se especifico la factura')
      return
    }

    if (!reference.trim()) {
      setError('Por favor ingresa el numero de referencia')
      return
    }

    if (!transferDate) {
      setError('Por favor selecciona la fecha de la transferencia')
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      // Upload proof file if provided
      let proofUrl: string | undefined
      if (proofFile) {
        const formData = new FormData()
        formData.append('file', proofFile)
        formData.append('clinic', clinic)
        formData.append('type', 'transfer_proof')

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json()
          proofUrl = uploadData.url
        }
      }

      // Report transfer
      const response = await fetch('/api/billing/confirm-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: invoiceId,
          transfer_reference: reference.trim(),
          transfer_date: transferDate,
          proof_url: proofUrl,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error?.message || 'Error al reportar transferencia')
      }

      onSuccess()
      handleClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
      if (!validTypes.includes(file.type)) {
        setError('Solo se aceptan imagenes (JPG, PNG, WebP) o PDF')
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('El archivo no puede superar 5MB')
        return
      }

      setProofFile(file)
      setError(null)
    }
  }

  if (!invoiceId) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Reportar Transferencia" size="md">
        <div className="py-8 text-center text-[var(--text-muted)]">
          No se especifico la factura
        </div>
      </Modal>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Reportar Transferencia" size="md">
      <form onSubmit={handleSubmit}>
        {/* Header Icon */}
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100">
            <Building2 className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <p className="mb-6 text-center text-sm text-[var(--text-secondary)]">
          Completa los datos de tu transferencia para que podamos verificar el pago.
        </p>

        <div className="space-y-4">
          {/* Reference Number */}
          <div>
            <label
              htmlFor="reference"
              className="mb-2 block text-sm font-medium text-[var(--text-primary)]"
            >
              Numero de Referencia / Comprobante
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ej: 123456789"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-paper)] py-3 pl-10 pr-4 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                required
              />
            </div>
          </div>

          {/* Transfer Date */}
          <div>
            <label
              htmlFor="transferDate"
              className="mb-2 block text-sm font-medium text-[var(--text-primary)]"
            >
              Fecha de Transferencia
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="date"
                id="transferDate"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-paper)] py-3 pl-10 pr-4 text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                required
              />
            </div>
          </div>

          {/* Proof Upload */}
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
              Comprobante (Opcional)
            </label>
            <div className="relative">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="hidden"
                id="proof-upload"
              />
              <label
                htmlFor="proof-upload"
                className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--bg-subtle)] p-6 transition-colors hover:border-[var(--primary)] hover:bg-[var(--primary)]/5"
              >
                <Upload className="h-5 w-5 text-[var(--text-muted)]" />
                <span className="text-sm text-[var(--text-secondary)]">
                  {proofFile ? proofFile.name : 'Subir imagen o PDF del comprobante'}
                </span>
              </label>
            </div>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              JPG, PNG, WebP o PDF. Maximo 5MB.
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Info Note */}
        <div className="mt-4 rounded-lg bg-[var(--bg-subtle)] p-3 text-xs text-[var(--text-muted)]">
          Verificaremos tu pago en 24-48 horas habiles. Te notificaremos cuando se acredite.
        </div>

        {/* Actions */}
        <ModalFooter className="mt-6">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="rounded-xl px-4 py-2 font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-subtle)]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-6 py-2 font-bold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Building2 className="h-4 w-4" />
                Reportar Transferencia
              </>
            )}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  )
}
