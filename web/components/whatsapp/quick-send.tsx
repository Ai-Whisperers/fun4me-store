'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import * as Icons from 'lucide-react'
import { sendMessage } from '@/app/actions/whatsapp'
import { formatParaguayPhone } from '@/lib/types/whatsapp'

interface QuickSendProps {
  isOpen: boolean
  onClose: () => void
  defaultPhone?: string
  clientName?: string
  clientId?: string
  petId?: string
}

export function QuickSend({
  isOpen,
  onClose,
  defaultPhone = '',
  clientName,
  clientId,
  petId,
}: QuickSendProps) {
  const router = useRouter()
  const [phone, setPhone] = useState(defaultPhone)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSend = async () => {
    if (!phone.trim() || !message.trim()) return

    // FORM-004: Prevent double-submit
    if (sending) return

    setSending(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('phone', phone)
      formData.append('message', message)
      if (clientId) formData.append('clientId', clientId)
      if (petId) formData.append('petId', petId)
      formData.append('conversationType', 'general')

      const result = await sendMessage(formData)

      if (result.success) {
        setPhone('')
        setMessage('')
        onClose()
        router.refresh()
      } else {
        setError(result.error || 'Error al enviar mensaje')
      }
    } catch (_error) {
      setError('Error de conexión. Por favor intenta de nuevo.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Envío Rápido</h2>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100" aria-label="Cerrar envío rápido">
            <Icons.X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 p-4">
          {/* Phone input */}
          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)]">
              Número de WhatsApp
            </label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                +595
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9XX XXX XXX"
                className="focus:ring-[var(--primary)]/50 w-full rounded-lg border border-gray-200 py-2 pl-14 pr-4 focus:outline-none focus:ring-2"
              />
            </div>
            {phone && (
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                Se enviará a: {formatParaguayPhone(phone)}
              </p>
            )}
          </div>

          {/* Client name (if provided) */}
          {clientName && (
            <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-2">
              <Icons.User className="h-4 w-4 text-[var(--text-secondary)]" />
              <span className="text-sm text-[var(--text-primary)]">{clientName}</span>
            </div>
          )}

          {/* Message input */}
          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)]">Mensaje</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escribe tu mensaje..."
              rows={4}
              className="focus:ring-[var(--primary)]/50 mt-1 w-full resize-none rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2"
            />
          </div>

          {/* Error */}
          {error && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-lg bg-[var(--status-error-bg)] p-3 text-sm text-[var(--status-error)]"
            >
              <Icons.AlertCircle className="h-4 w-4" aria-hidden="true" />
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 py-2 text-[var(--text-secondary)] hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSend}
              disabled={!phone.trim() || !message.trim() || sending}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] py-2 text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? (
                <>
                  <Icons.Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Icons.Send className="h-4 w-4" />
                  Enviar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
