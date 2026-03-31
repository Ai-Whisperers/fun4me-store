'use client'

import { useState } from 'react'
import { X, Mail, Loader2, Send, AlertCircle, CheckCircle } from 'lucide-react'

interface BulkEmailModalProps {
  isOpen: boolean
  onClose: () => void
  selectedCount: number
  selectedIds: string[]
  onSuccess: () => void
}

interface BulkEmailResult {
  success: boolean
  sent: number
  failed: number
  skipped: number
  errors: Array<{ clientId: string; error: string }>
}

export function BulkEmailModal({
  isOpen,
  onClose,
  selectedCount,
  selectedIds,
  onSuccess,
}: BulkEmailModalProps): React.ReactElement | null {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<BulkEmailResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/clients/bulk-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_ids: selectedIds,
          subject: subject.trim(),
          message: message.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Error al enviar emails')
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
    setSubject('')
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
            <div className="rounded-lg bg-blue-100 p-2">
              <Mail className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Enviar Email Masivo</h2>
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
                  {result.sent} enviados, {result.failed} fallidos, {result.skipped} omitidos
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
                <label className="mb-1 block text-sm font-medium text-gray-700">Asunto</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Asunto del email..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                  required
                  maxLength={200}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Mensaje</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Escribe tu mensaje aquí... Puedes usar {nombre} para personalizar."
                  rows={6}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                  required
                  maxLength={5000}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Usa {'{nombre}'} para incluir el nombre del cliente
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
                disabled={loading || !subject.trim() || !message.trim()}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Enviar Emails
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
