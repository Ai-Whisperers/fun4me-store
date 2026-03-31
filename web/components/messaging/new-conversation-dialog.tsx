'use client'

import { useState, useEffect } from 'react'
import { X, Send, MessageSquare, Search, User, PawPrint } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Pet {
  id: string
  name: string
}

interface Client {
  id: string
  full_name: string
  email: string
}

interface Props {
  clinic: string
  onClose: () => void
  isOpen: boolean
  isStaff: boolean
  pets?: Pet[]
}

export default function NewConversationDialog({
  clinic,
  onClose,
  isOpen,
  isStaff,
  pets = [],
}: Props) {
  const router = useRouter()
  const [subject, setSubject] = useState('')
  const [petId, setPetId] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Staff-specific state
  const [clientSearch, setClientSearch] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSubject('')
      setPetId('')
      setMessage('')
      setError('')
      setClientSearch('')
      setClients([])
      setSelectedClient(null)
    }
  }, [isOpen])

  // Search for clients (staff only)
  useEffect(() => {
    if (!isStaff || !clientSearch.trim()) {
      setClients([])
      return
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const response = await fetch(`/api/clients/search?q=${encodeURIComponent(clientSearch)}`)
        if (response.ok) {
          const data = await response.json()
          setClients(data.clients || [])
        }
      } catch (_error: unknown) {
        // Error searching clients - silently fail
      } finally {
        setSearchLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [clientSearch, isStaff])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!subject.trim()) {
      setError('El asunto es obligatorio')
      return
    }

    if (!message.trim()) {
      setError('El mensaje es obligatorio')
      return
    }

    if (isStaff && !selectedClient) {
      setError('Debes seleccionar un cliente')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: subject.trim(),
          pet_id: petId || null,
          initial_message: message.trim(),
          recipient_id: isStaff ? selectedClient?.id : null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al crear la conversación')
      }

      const data = await response.json()

      // Redirect to the new conversation
      router.push(`/${clinic}/portal/messages/${data.conversation.id}`)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la conversación')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="animate-fadeIn fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="animate-scaleIn max-h-[90vh] w-full overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="bg-[var(--primary)]/10 shrink-0 rounded-xl p-2">
              <MessageSquare className="h-5 w-5 text-[var(--primary)] sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-[var(--text-primary)] sm:text-xl">
                Nueva Conversación
              </h2>
              <p className="truncate text-xs text-[var(--text-secondary)] sm:text-sm">
                {isStaff ? 'Iniciar conversación con un cliente' : 'Enviar mensaje a la clínica'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl p-2 transition-colors hover:bg-gray-100"
            disabled={loading}
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="max-h-[calc(90vh-200px)] overflow-y-auto p-4 sm:max-h-[calc(90vh-180px)] sm:p-6"
        >
          <div className="space-y-4 sm:space-y-5">
            {/* Client selector (staff only) */}
            {isStaff && (
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                  Cliente <span className="text-[var(--status-error)]">*</span>
                </label>
                {!selectedClient ? (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      placeholder="Buscar por nombre o email..."
                      className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 py-3 pl-11 pr-4 outline-none transition-all focus:border-[var(--primary)] focus:ring-2"
                      disabled={loading}
                    />
                    {searchLoading && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
                      </div>
                    )}
                    {clients.length > 0 && (
                      <div className="absolute z-10 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                        {clients.map((client) => (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => {
                              setSelectedClient(client)
                              setClientSearch('')
                              setClients([])
                            }}
                            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
                          >
                            <User className="h-5 w-5 text-gray-400" />
                            <div>
                              <p className="font-medium text-[var(--text-primary)]">
                                {client.full_name}
                              </p>
                              <p className="text-sm text-[var(--text-secondary)]">{client.email}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3 sm:p-4">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <User className="h-5 w-5 shrink-0 text-gray-400" />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[var(--text-primary)]">
                          {selectedClient.full_name}
                        </p>
                        <p className="truncate text-sm text-[var(--text-secondary)]">
                          {selectedClient.email}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedClient(null)}
                      className="flex min-h-[40px] min-w-[40px] shrink-0 items-center justify-center rounded-lg p-2 transition-colors hover:bg-gray-200"
                      disabled={loading}
                    >
                      <X className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Subject */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                Asunto <span className="text-[var(--status-error)]">*</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ej: Consulta sobre vacunación"
                className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition-all focus:border-[var(--primary)] focus:ring-2"
                disabled={loading}
                maxLength={200}
              />
            </div>

            {/* Pet selector (optional) */}
            {!isStaff && pets.length > 0 && (
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                  Mascota (opcional)
                </label>
                <div className="relative">
                  <PawPrint className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <select
                    value={petId}
                    onChange={(e) => setPetId(e.target.value)}
                    className="focus:ring-[var(--primary)]/20 w-full appearance-none rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 outline-none transition-all focus:border-[var(--primary)] focus:ring-2"
                    disabled={loading}
                  >
                    <option value="">Seleccionar mascota...</option>
                    {pets.map((pet) => (
                      <option key={pet.id} value={pet.id}>
                        {pet.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Message */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                Mensaje <span className="text-[var(--status-error)]">*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Escribe tu mensaje aquí..."
                rows={6}
                className="focus:ring-[var(--primary)]/20 w-full resize-none rounded-xl border border-gray-200 px-4 py-3 outline-none transition-all focus:border-[var(--primary)] focus:ring-2"
                disabled={loading}
                maxLength={2000}
              />
              <p className="mt-1 text-right text-xs text-[var(--text-secondary)]">
                {message.length}/2000
              </p>
            </div>

            {/* Error message - TICKET-A11Y-004: Added role="alert" for screen readers */}
            {error && (
              <div
                role="alert"
                aria-live="assertive"
                className="rounded-xl border border-[var(--status-error-border)] bg-[var(--status-error-bg)] p-4"
              >
                <p className="text-sm text-[var(--status-error-text)]">{error}</p>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex flex-col-reverse items-stretch justify-end gap-3 border-t border-gray-100 p-4 sm:flex-row sm:items-center sm:p-6">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[48px] rounded-xl border border-gray-200 px-6 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !subject.trim() || !message.trim() || (isStaff && !selectedClient)}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />
                Enviar Mensaje
              </>
            )}
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-scaleIn {
          animation: scaleIn 0.2s ease-out;
        }
      `}</style>
    </div>
  )
}
