'use client'

import { useState } from 'react'
import { Modal, ModalFooter } from '@/components/ui/modal'
import { Shield, Check, Loader2, FileText, ChevronDown, ChevronUp } from 'lucide-react'
import type { PrivacyPolicy, AcceptanceMethod } from '@/lib/privacy'

interface PrivacyUpdateModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** The policy to accept */
  policy: PrivacyPolicy
  /** Current accepted version (if any) */
  acceptedVersion?: string
  /** Location context for audit trail */
  locationContext?: string
  /** Callback after successful acceptance */
  onAccepted: () => void
  /** Optional callback for declined (may just continue without accepting) */
  onDeclined?: () => void
}

/**
 * Privacy Policy Update Modal
 *
 * COMP-002: Modal shown to users when they need to accept/re-accept
 * the privacy policy.
 */
export function PrivacyUpdateModal({
  isOpen,
  policy,
  acceptedVersion,
  locationContext = 'policy_update',
  onAccepted,
  onDeclined,
}: PrivacyUpdateModalProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [hasRead, setHasRead] = useState(false)
  const [isAccepting, setIsAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isUpdate = !!acceptedVersion

  const handleAccept = async () => {
    setIsAccepting(true)
    setError(null)

    try {
      const response = await fetch('/api/privacy/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policyId: policy.id,
          acceptanceMethod: 'button' as AcceptanceMethod,
          locationContext,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.details?.message || 'Error al aceptar la política')
      }

      onAccepted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsAccepting(false)
    }
  }

  const handleDecline = () => {
    if (onDeclined) {
      onDeclined()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}} // Prevent backdrop close
      title={isUpdate ? 'Actualización de Política de Privacidad' : 'Política de Privacidad'}
      description={
        isUpdate
          ? `Versión ${policy.version} - Por favor revisa los cambios`
          : `Versión ${policy.version}`
      }
      size="lg"
      showCloseButton={false}
      closeOnBackdrop={false}
      closeOnEscape={false}
    >
      <div className="space-y-4">
        {/* Icon and intro */}
        <div className="flex items-start gap-4 rounded-xl bg-[var(--primary)]/5 p-4">
          <div className="rounded-full bg-[var(--primary)]/10 p-3">
            <Shield className="h-6 w-6 text-[var(--primary)]" />
          </div>
          <div>
            <h3 className="font-bold text-[var(--text-primary)]">
              {isUpdate ? 'Hemos actualizado nuestra política' : 'Tu privacidad es importante'}
            </h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {isUpdate
                ? 'Para seguir usando el servicio, necesitamos que revises y aceptes la nueva versión.'
                : 'Antes de continuar, por favor lee y acepta nuestra política de privacidad.'}
            </p>
          </div>
        </div>

        {/* Change summary (for updates) */}
        {isUpdate && policy.changeSummary && policy.changeSummary.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <h4 className="mb-2 font-bold text-amber-800">Cambios principales:</h4>
            <ul className="space-y-1">
              {policy.changeSummary.map((change, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-amber-700">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  {change}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Policy content collapsible */}
        <div className="rounded-xl border border-[var(--border-light)]">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-[var(--bg-subtle)]"
          >
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[var(--text-secondary)]" />
              <span className="font-medium text-[var(--text-primary)]">
                Ver política completa
              </span>
            </div>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-[var(--text-muted)]" />
            ) : (
              <ChevronDown className="h-5 w-5 text-[var(--text-muted)]" />
            )}
          </button>

          {isExpanded && (
            <div
              className="prose prose-sm max-h-64 overflow-y-auto border-t border-[var(--border-light)] p-4"
              onScroll={(e) => {
                const target = e.currentTarget
                const scrolledToBottom =
                  target.scrollHeight - target.scrollTop <= target.clientHeight + 20
                if (scrolledToBottom) {
                  setHasRead(true)
                }
              }}
            >
              <div
                className="text-sm text-[var(--text-secondary)]"
                dangerouslySetInnerHTML={{ __html: policy.contentEs }}
              />
            </div>
          )}
        </div>

        {/* Checkbox confirmation */}
        <label className="flex cursor-pointer items-start gap-3 rounded-xl p-3 transition-colors hover:bg-[var(--bg-subtle)]">
          <input
            type="checkbox"
            checked={hasRead}
            onChange={(e) => setHasRead(e.target.checked)}
            className="mt-1 h-5 w-5 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
          />
          <span className="text-sm text-[var(--text-secondary)]">
            He leído y acepto la política de privacidad
            {isUpdate && ' actualizada'}
          </span>
        </label>

        {/* Error message */}
        {error && (
          <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        {/* Footer Actions */}
        <ModalFooter>
          {onDeclined && (
            <button
              type="button"
              onClick={handleDecline}
              disabled={isAccepting}
              className="rounded-xl px-4 py-2 font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-subtle)] disabled:opacity-50"
            >
              Ahora no
            </button>
          )}
          <button
            type="button"
            onClick={handleAccept}
            disabled={!hasRead || isAccepting}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-2 font-bold text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isAccepting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Aceptar
              </>
            )}
          </button>
        </ModalFooter>
      </div>
    </Modal>
  )
}
