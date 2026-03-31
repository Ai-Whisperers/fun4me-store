'use client'

/**
 * Conversation Detail Page
 *
 * RES-001: Migrated to React Query for data fetching
 */

import { useState, useRef, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { staleTimes, gcTimes } from '@/lib/queries/utils'
import {
  ArrowLeft,
  Send,
  Paperclip,
  CheckCircle2,
  Clock,
  AlertCircle,
  User,
  MoreVertical,
  X,
  FileText,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react'
import { format, isToday, isYesterday } from 'date-fns'
import { es } from 'date-fns/locale'
import { useToast } from '@/components/ui/Toast'

interface Attachment {
  url: string
  name: string
  type: string
  size: number
}

interface Message {
  id: string
  content: string
  message_type: string
  attachments: Attachment[]
  created_at: string
  sender: {
    id: string
    full_name: string
    avatar_url: string | null
    role: string
  }
}

interface Conversation {
  id: string
  subject: string
  status: 'open' | 'pending' | 'closed'
  priority: string
  created_at: string
  client: {
    id: string
    full_name: string
    email: string
    phone: string | null
    avatar_url: string | null
  }
  pet: {
    id: string
    name: string
    species: string
    photo_url: string | null
  } | null
  assigned_staff: {
    id: string
    full_name: string
    avatar_url: string | null
  } | null
}

interface ConversationData {
  conversation: Conversation
  messages: Message[]
  total_messages: number
  page: number
  limit: number
}

export default function ConversationPage() {
  const params = useParams()
  const router = useRouter()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const clinic = params.clinic as string
  const conversationId = params.id as string

  const [newMessage, setNewMessage] = useState('')
  const [showActions, setShowActions] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageInputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // React Query: Fetch conversation data with polling
  const { data, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: async (): Promise<ConversationData> => {
      const response = await fetch(`/api/conversations/${conversationId}`)
      if (!response.ok) throw new Error('Error al cargar la conversación')
      return response.json()
    },
    refetchInterval: 5000, // Poll every 5 seconds
    staleTime: 1000,
    gcTime: gcTimes.SHORT,
  })

  const error = queryError?.message || null

  // React Query: Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async (): Promise<{ id: string; role: string } | null> => {
      const response = await fetch('/api/auth/me')
      if (!response.ok) return null
      const userData = await response.json()
      return { id: userData.id, role: userData.role }
    },
    staleTime: staleTimes.LONG,
    gcTime: gcTimes.LONG,
  })

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [data?.messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Limit to 5 files
    if (selectedFiles.length + files.length > 5) {
      showToast({ title: 'Máximo 5 archivos por mensaje', variant: 'warning' })
      return
    }

    // Validate file types and sizes
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]
    const maxSize = 10 * 1024 * 1024 // 10MB

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        showToast({ title: `Tipo de archivo no permitido: ${file.name}`, variant: 'error' })
        return
      }
      if (file.size > maxSize) {
        showToast({ title: `Archivo muy grande: ${file.name} (máximo 10MB)`, variant: 'error' })
        return
      }
    }

    setSelectedFiles((prev) => [...prev, ...files])
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Remove selected file
  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Mutation: Send message
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, attachments }: { content: string; attachments: Attachment[] }) => {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          content_type: 'text',
          attachments,
        }),
      })
      if (!response.ok) throw new Error('Error al enviar mensaje')
      return response.json()
    },
    onSuccess: () => {
      setNewMessage('')
      setSelectedFiles([])
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] })
      messageInputRef.current?.focus()
    },
    onError: (err) => {
      showToast({ title: err instanceof Error ? err.message : 'Error al enviar mensaje', variant: 'error' })
    },
  })

  const sending = sendMessageMutation.isPending

  // Send message
  const handleSendMessage = async () => {
    if ((!newMessage.trim() && selectedFiles.length === 0) || sending) return

    setUploading(selectedFiles.length > 0)

    try {
      let uploadedAttachments: Attachment[] = []

      // Upload files if any
      if (selectedFiles.length > 0) {
        const formData = new FormData()
        formData.append('conversation_id', conversationId)
        selectedFiles.forEach((file) => formData.append('files', file))

        const uploadResponse = await fetch('/api/messages/attachments', {
          method: 'POST',
          body: formData,
        })

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json()
          throw new Error(errorData.error || 'Error al subir archivos')
        }

        const uploadResult = await uploadResponse.json()
        uploadedAttachments = uploadResult.attachments
      }

      setUploading(false)

      // Send message with attachments
      sendMessageMutation.mutate({ content: newMessage, attachments: uploadedAttachments })
    } catch (err) {
      showToast({ title: err instanceof Error ? err.message : 'Error al subir archivos', variant: 'error' })
      setUploading(false)
    }
  }

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Mutation: Update conversation status
  const statusMutation = useMutation({
    mutationFn: async (newStatus: 'open' | 'pending' | 'closed') => {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!response.ok) throw new Error('Error al actualizar estado')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] })
      setShowActions(false)
    },
    onError: (err) => {
      showToast({ title: err instanceof Error ? err.message : 'Error al actualizar estado', variant: 'error' })
    },
  })

  // Update conversation status
  const updateStatus = (newStatus: 'open' | 'pending' | 'closed') => {
    statusMutation.mutate(newStatus)
  }

  // Format date for message grouping
  const formatMessageDate = (dateString: string) => {
    const date = new Date(dateString)
    if (isToday(date)) return 'Hoy'
    if (isYesterday(date)) return 'Ayer'
    return format(date, "EEEE, d 'de' MMMM", { locale: es })
  }

  // Group messages by date
  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {}
    messages.forEach((msg) => {
      const dateKey = formatMessageDate(msg.created_at)
      if (!groups[dateKey]) groups[dateKey] = []
      groups[dateKey].push(msg)
    })
    return groups
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent"></div>
          <p className="text-[var(--text-secondary)]">Cargando conversación...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 h-16 w-16 text-red-500" />
          <h2 className="mb-2 text-xl font-bold text-[var(--text-primary)]">
            Error al cargar conversación
          </h2>
          <p className="mb-6 text-[var(--text-secondary)]">{error}</p>
          <Link
            href={`/${clinic}/portal/messages`}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-6 py-3 text-white transition-opacity hover:opacity-90"
          >
            <ArrowLeft className="h-5 w-5" />
            Volver a Mensajes
          </Link>
        </div>
      </div>
    )
  }

  const { conversation, messages } = data
  const isStaff = currentUser?.role === 'vet' || currentUser?.role === 'admin'
  const messageGroups = groupMessagesByDate(messages)

  const statusConfig = {
    open: {
      label: 'Abierto',
      icon: CheckCircle2,
      className: 'bg-green-100 text-green-700',
    },
    pending: {
      label: 'Pendiente',
      icon: Clock,
      className: 'bg-yellow-100 text-yellow-700',
    },
    closed: {
      label: 'Cerrado',
      icon: AlertCircle,
      className: 'bg-gray-100 text-gray-700',
    },
  }

  const status = statusConfig[conversation.status]
  const StatusIcon = status.icon

  return (
    <div className="flex h-screen flex-col bg-[var(--bg-primary)]">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white shadow-sm">
        <div className="container mx-auto max-w-5xl px-4 py-4">
          <div className="flex items-center gap-4">
            {/* Back Button */}
            <Link
              href={`/${clinic}/portal/messages`}
              className="rounded-lg p-2 transition-colors hover:bg-gray-100"
            >
              <ArrowLeft className="h-6 w-6 text-[var(--text-secondary)]" />
            </Link>

            {/* Conversation Info */}
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-bold text-[var(--text-primary)]">
                {conversation.subject}
              </h1>
              <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                {isStaff ? (
                  <>
                    <User className="h-4 w-4" />
                    <span>{conversation.client.full_name}</span>
                    {conversation.pet && (
                      <>
                        <span>·</span>
                        <span>{conversation.pet.name}</span>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    {conversation.assigned_staff ? (
                      <>
                        <User className="h-4 w-4" />
                        <span>Asignado a {conversation.assigned_staff.full_name}</span>
                      </>
                    ) : (
                      <span>Clínica</span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${status.className}`}
              >
                <StatusIcon className="h-4 w-4" />
                {status.label}
              </span>

              {/* Actions Menu (Staff Only) */}
              {isStaff && (
                <div className="relative">
                  <button
                    onClick={() => setShowActions(!showActions)}
                    className="rounded-lg p-2 transition-colors hover:bg-gray-100"
                  >
                    <MoreVertical className="h-5 w-5 text-[var(--text-secondary)]" />
                  </button>

                  {showActions && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowActions(false)} />
                      <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                        {conversation.status !== 'open' && (
                          <button
                            onClick={() => updateStatus('open')}
                            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50"
                          >
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            Marcar como Abierto
                          </button>
                        )}
                        {conversation.status !== 'pending' && (
                          <button
                            onClick={() => updateStatus('pending')}
                            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50"
                          >
                            <Clock className="h-4 w-4 text-yellow-600" />
                            Marcar como Pendiente
                          </button>
                        )}
                        {conversation.status !== 'closed' && (
                          <button
                            onClick={() => updateStatus('closed')}
                            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50"
                          >
                            <X className="h-4 w-4 text-gray-600" />
                            Cerrar Conversación
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto max-w-5xl px-4 py-6">
          {Object.entries(messageGroups).map(([dateKey, dateMessages]) => (
            <div key={dateKey} className="mb-8">
              {/* Date Divider */}
              <div className="mb-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
                  {dateKey}
                </span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              {/* Messages for this date */}
              <div className="space-y-4">
                {dateMessages.map((message) => {
                  const isSentByMe = message.sender.id === currentUser?.id
                  const isStaffMessage = ['vet', 'admin'].includes(message.sender.role)

                  return (
                    <div
                      key={message.id}
                      className={`flex items-start gap-3 ${isSentByMe ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[var(--primary)]">
                          {message.sender.avatar_url ? (
                            <img
                              src={message.sender.avatar_url}
                              alt={message.sender.full_name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-medium text-white">
                              {message.sender.full_name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Message Bubble */}
                      <div
                        className={`max-w-lg flex-1 ${isSentByMe ? 'items-end' : 'items-start'} flex flex-col`}
                      >
                        {/* Sender Name (if not sent by me) */}
                        {!isSentByMe && (
                          <span className="mb-1 px-1 text-xs font-medium text-[var(--text-secondary)]">
                            {message.sender.full_name}
                            {isStaffMessage && (
                              <span className="ml-1 text-[var(--primary)]">(Personal)</span>
                            )}
                          </span>
                        )}

                        {/* Message Content */}
                        <div
                          className={`rounded-2xl px-4 py-3 ${
                            isSentByMe
                              ? 'rounded-br-sm bg-[var(--primary)] text-white'
                              : 'rounded-bl-sm border border-gray-200 bg-white text-[var(--text-primary)] shadow-sm'
                          }`}
                        >
                          {message.content && (
                            <p className="whitespace-pre-wrap break-words text-sm">
                              {message.content}
                            </p>
                          )}

                          {/* Attachments */}
                          {message.attachments && message.attachments.length > 0 && (
                            <div
                              className={`${message.content ? 'mt-2 border-t pt-2' : ''} ${isSentByMe ? 'border-white/20' : 'border-gray-200'} space-y-2`}
                            >
                              {message.attachments.map((attachment, idx) => (
                                <a
                                  key={idx}
                                  href={attachment.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`flex items-center gap-2 text-sm ${
                                    isSentByMe
                                      ? 'text-white hover:text-white/80'
                                      : 'text-[var(--primary)] hover:text-[var(--primary-dark)]'
                                  }`}
                                >
                                  {attachment.type.startsWith('image/') ? (
                                    <>
                                      <div className="relative h-24 w-32 overflow-hidden rounded bg-black/10">
                                        <img
                                          src={attachment.url}
                                          alt={attachment.name}
                                          className="h-full w-full object-cover"
                                        />
                                      </div>
                                    </>
                                  ) : (
                                    <div
                                      className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
                                        isSentByMe ? 'bg-white/10' : 'bg-gray-100'
                                      }`}
                                    >
                                      <FileText className="h-4 w-4 flex-shrink-0" />
                                      <span className="max-w-[150px] truncate">
                                        {attachment.name}
                                      </span>
                                    </div>
                                  )}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Timestamp */}
                        <span
                          className={`mt-1 px-1 text-xs text-[var(--text-tertiary)] ${isSentByMe ? 'text-right' : 'text-left'}`}
                        >
                          {format(new Date(message.created_at), 'HH:mm', { locale: es })}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Empty State */}
          {messages.length === 0 && (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <AlertCircle className="h-8 w-8 text-[var(--text-tertiary)]" />
              </div>
              <p className="text-[var(--text-secondary)]">
                No hay mensajes aún. Sé el primero en escribir.
              </p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Composer */}
      {conversation.status !== 'closed' ? (
        <div className="border-t border-gray-200 bg-white shadow-lg">
          <div className="container mx-auto max-w-5xl px-4 py-4">
            {/* Selected Files Preview */}
            {selectedFiles.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm"
                  >
                    {file.type.startsWith('image/') ? (
                      <ImageIcon className="h-4 w-4 text-[var(--text-secondary)]" />
                    ) : (
                      <FileText className="h-4 w-4 text-[var(--text-secondary)]" />
                    )}
                    <span className="max-w-[120px] truncate text-[var(--text-primary)]">
                      {file.name}
                    </span>
                    <span className="text-[var(--text-tertiary)]">
                      ({formatFileSize(file.size)})
                    </span>
                    <button
                      onClick={() => removeFile(index)}
                      className="rounded-full p-1 transition-colors hover:bg-gray-200"
                    >
                      <X className="h-3 w-3 text-[var(--text-secondary)]" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-end gap-3">
              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,.doc,.docx"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Attachment Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={sending || selectedFiles.length >= 5}
                className="p-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
                title="Adjuntar archivos (máx. 5)"
              >
                <Paperclip className="h-6 w-6" />
              </button>

              {/* Text Input */}
              <div className="relative flex-1">
                <textarea
                  ref={messageInputRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Escribe tu mensaje..."
                  rows={1}
                  disabled={sending}
                  className="max-h-32 w-full resize-none rounded-2xl border border-gray-300 px-4 py-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:bg-gray-50"
                  style={{
                    minHeight: '48px',
                    maxHeight: '128px',
                    overflowY: 'auto',
                  }}
                />
              </div>

              {/* Send Button */}
              <button
                onClick={handleSendMessage}
                disabled={(!newMessage.trim() && selectedFiles.length === 0) || sending}
                className="flex-shrink-0 rounded-2xl bg-[var(--primary)] p-3 text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <Send className="h-6 w-6" />
                )}
              </button>
            </div>

            {/* Help Text */}
            <p className="mt-2 text-center text-xs text-[var(--text-tertiary)]">
              {uploading
                ? 'Subiendo archivos...'
                : 'Presiona Enter para enviar, Shift+Enter para nueva línea'}
            </p>
          </div>
        </div>
      ) : (
        <div className="border-t border-gray-200 bg-gray-100 py-4">
          <div className="container mx-auto max-w-5xl px-4 text-center">
            <p className="text-sm text-[var(--text-secondary)]">
              Esta conversación está cerrada.{' '}
              {isStaff
                ? 'Reabre la conversación para continuar.'
                : 'Contacta a la clínica para reabrir.'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
