'use client'

import { useState } from 'react'
import { X, MessageSquare, Loader2, Send, AlertCircle, CheckCircle } from 'lucide-react'

interface BulkWhatsAppModalProps {
  isOpen: boolean
  onClose: () => void
  selectedCount: number
  selectedIds: string[]
  onSuccess: () => void
}

interface BulkWhatsAppResult {
  success: boolean
  sent: number
  failed: number
  skipped: number
  errors: Array<{ clientId: string; error: string }>
}

export function BulkWhatsAppModal({
  isOpen,
  onClose,
  selectedCount,
  selectedIds,
  onSuccess,
}: BulkWhatsAppModalProps): React.ReactElement | null {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<BulkWhatsAppResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/clients/bulk-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_ids: selectedIds,
          message: message.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Error al enviar mensajes')
      }

      setResult(data)
      if (data.sent > 0) {
        onSuccess()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setMessage('')
    setResult(null)
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-lg rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2">
              <MessageSquare className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Enviar WhatsApp Masivo</h2>
              <p className="text-sm text-gray-500">{selectedCount} clientes seleccionados</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        {result ? (
          <div className="p-6">
            <div className="mb-4 flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="font-semibold text-gray-900">Envío completado</p>
                <p className="text-sm text-gray-500">
                  {result.sent} enviados, {result.failed} fallidos, {result.skipped} sin teléfono
                </p>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="mt-4 rounded-lg bg-red-50 p-3">
                <p className="text-sm font-medium text-red-800">Errores:</p>
                <ul className="mt-1 text-sm text-red-600">
                  {result.errors.slice(0, 5).map((err, i) => (
                    <li key={i}>- {err.error}</li>
                  ))}
                  {result.errors.length > 5 && (
                    <li>... y {result.errors.length - 5} más</li>
                  )}
                </ul>
              </div>
            )}
            <button
              onClick={handleClose}
              className="mt-6 w-full rounded-lg bg-[var(--primary)] py-2 font-medium text-white hover:opacity-90"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6">
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Mensaje</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Escribe tu mensaje aquí... Puedes usar {nombre} para personalizar."
                  rows={6}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                  required
                  maxLength={4096}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Usa {'{nombre}'} para incluir el nombre del cliente. Máximo 4096 caracteres.
                </p>
              </div>

              <div className="rounded-lg bg-amber-50 p-3">
                <p className="text-sm text-amber-800">
                  <strong>Nota:</strong> Solo se enviarán mensajes a clientes con número de teléfono registrado.
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 rounded-lg border border-gray-200 py-2 font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !message.trim()}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 py-2 font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Enviar WhatsApp
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
