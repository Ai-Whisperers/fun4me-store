'use client'

import type { JSX } from 'react'
import { CheckCircle, XCircle, Clock } from 'lucide-react'
import type { BlanketConsent } from './types'

interface ConsentCardProps {
  consent: BlanketConsent
  onRevoke: (consentId: string) => void
  getTypeLabel: (type: string) => string
}

export default function ConsentCard({
  consent,
  onRevoke,
  getTypeLabel,
}: ConsentCardProps): JSX.Element {
  return (
    <div
      className={`rounded-lg border bg-[var(--bg-paper)] p-4 ${
        consent.is_active ? 'border-[var(--primary)]/20' : 'border-red-300 bg-red-50/50'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <h4 className="font-semibold text-[var(--text-primary)]">
              {getTypeLabel(consent.consent_type)}
            </h4>
            {consent.is_active ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
          </div>

          <p className="mb-2 text-sm text-[var(--text-secondary)]">{consent.scope}</p>

          {consent.conditions && (
            <p className="mb-2 text-xs text-[var(--text-secondary)]">
              <strong>Condiciones:</strong> {consent.conditions}
            </p>
          )}

          <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
            <span>Firmado: {new Date(consent.granted_at).toLocaleDateString('es-PY')}</span>
            {consent.expires_at && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Expira: {new Date(consent.expires_at).toLocaleDateString('es-PY')}
              </span>
            )}
          </div>

          {!consent.is_active && consent.revocation_reason && (
            <div className="mt-2 rounded bg-red-100 p-2 text-xs text-red-800">
              <strong>Revocado:</strong> {consent.revocation_reason}
            </div>
          )}
        </div>

        {consent.is_active && (
          <button
            onClick={() => onRevoke(consent.id)}
            className="ml-4 rounded p-2 text-red-600 transition-colors hover:bg-red-50"
            title="Revocar"
          >
            <XCircle className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  )
}
