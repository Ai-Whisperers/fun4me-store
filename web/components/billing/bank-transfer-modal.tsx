'use client'

/**
 * Bank Transfer Modal Component
 *
 * Displays bank account details for manual payment.
 */

import { Modal, ModalFooter } from '@/components/ui/modal'
import { Building2, Copy, CheckCircle, Info } from 'lucide-react'
import { useState } from 'react'
import { useCopyTimeout } from '@/lib/hooks'

interface BankTransferModalProps {
  isOpen: boolean
  onClose: () => void
}

// Bank account details (could be fetched from config in future)
const BANK_DETAILS = {
  bank_name: 'Banco Itau',
  account_holder: 'Vetic Paraguay S.A.',
  account_number: '1234567890',
  account_type: 'Cuenta Corriente',
  ruc: '80123456-7',
  alias: 'vetic.pagos',
  currency: 'Guaranies (PYG)',
}

export function BankTransferModal({
  isOpen,
  onClose,
}: BankTransferModalProps): React.ReactElement {
  const [copiedField, setCopiedField] = useState<string | null>(null)

  // BUG-008: Safe timeout with cleanup for copy feedback
  useCopyTimeout(copiedField !== null, () => setCopiedField(null))

  async function copyToClipboard(text: string, field: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      // BUG-008: Timer handled by useCopyTimeout hook
    } catch (_error: unknown) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopiedField(field)
      // BUG-008: Timer handled by useCopyTimeout hook
    }
  }

  function CopyButton({ text, field }: { text: string; field: string }): React.ReactElement {
    const isCopied = copiedField === field

    return (
      <button
        onClick={() => copyToClipboard(text, field)}
        className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--primary)]"
        title="Copiar"
      >
        {isCopied ? (
          <CheckCircle className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </button>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Datos para Transferencia Bancaria"
      size="md"
    >
      {/* Header Icon */}
      <div className="mb-6 flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100">
          <Building2 className="h-8 w-8 text-green-600" />
        </div>
      </div>

      {/* Bank Details */}
      <div className="space-y-4">
        <DetailRow
          label="Banco"
          value={BANK_DETAILS.bank_name}
          copyButton={<CopyButton text={BANK_DETAILS.bank_name} field="bank" />}
        />
        <DetailRow
          label="Titular"
          value={BANK_DETAILS.account_holder}
          copyButton={<CopyButton text={BANK_DETAILS.account_holder} field="holder" />}
        />
        <DetailRow
          label="Numero de Cuenta"
          value={BANK_DETAILS.account_number}
          copyButton={<CopyButton text={BANK_DETAILS.account_number} field="account" />}
          highlight
        />
        <DetailRow
          label="Tipo de Cuenta"
          value={BANK_DETAILS.account_type}
        />
        <DetailRow
          label="RUC"
          value={BANK_DETAILS.ruc}
          copyButton={<CopyButton text={BANK_DETAILS.ruc} field="ruc" />}
        />
        <DetailRow
          label="Alias"
          value={BANK_DETAILS.alias}
          copyButton={<CopyButton text={BANK_DETAILS.alias} field="alias" />}
          highlight
        />
        <DetailRow
          label="Moneda"
          value={BANK_DETAILS.currency}
        />
      </div>

      {/* Instructions */}
      <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">Instrucciones:</p>
            <ol className="mt-2 list-inside list-decimal space-y-1 text-blue-700">
              <li>Realiza la transferencia desde tu banco</li>
              <li>Incluye tu numero de factura en el concepto</li>
              <li>Reporta la transferencia usando el boton en la factura</li>
              <li>Verificaremos el pago en 24-48 horas habiles</li>
            </ol>
          </div>
        </div>
      </div>

      <ModalFooter className="mt-6">
        <button
          onClick={onClose}
          className="rounded-xl bg-[var(--primary)] px-6 py-2 font-bold text-white transition-colors hover:bg-[var(--primary-dark)]"
        >
          Entendido
        </button>
      </ModalFooter>
    </Modal>
  )
}

interface DetailRowProps {
  label: string
  value: string
  copyButton?: React.ReactNode
  highlight?: boolean
}

function DetailRow({ label, value, copyButton, highlight }: DetailRowProps): React.ReactElement {
  return (
    <div
      className={`flex items-center justify-between rounded-lg p-3 ${
        highlight ? 'bg-[var(--primary)]/5' : 'bg-[var(--bg-subtle)]'
      }`}
    >
      <div>
        <p className="text-xs text-[var(--text-muted)]">{label}</p>
        <p
          className={`font-medium ${
            highlight ? 'text-[var(--primary)]' : 'text-[var(--text-primary)]'
          }`}
        >
          {value}
        </p>
      </div>
      {copyButton}
    </div>
  )
}
