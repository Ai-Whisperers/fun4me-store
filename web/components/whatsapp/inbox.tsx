'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import * as Icons from 'lucide-react'
import { ConversationList } from './conversation-list'
import { ConversationHeader } from './conversation-header'
import { MessageThread } from './message-thread'
import { MessageInput } from './message-input'
import { TemplateSelector } from './template-selector'
import { sendMessage, getMessages, getTemplates } from '@/app/actions/whatsapp'
import type { WhatsAppConversation, WhatsAppMessage, WhatsAppTemplate } from '@/lib/types/whatsapp'
import { useToast } from '@/components/ui/Toast'

interface InboxProps {
  conversations: WhatsAppConversation[]
  clinic: string
}

export function Inbox({ conversations, clinic }: InboxProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null)
  const [messages, setMessages] = useState<WhatsAppMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [showTemplates, setShowTemplates] = useState(false)

  // Get selected conversation details
  const selectedConversation = conversations.find((c) => c.phone_number === selectedPhone)

  // Load messages for selected conversation
  const loadMessages = useCallback(async () => {
    if (!selectedPhone) return

    setLoading(true)
    const result = await getMessages(clinic, selectedPhone)
    if ('data' in result && result.data) {
      setMessages(result.data)
    }
    setLoading(false)
  }, [clinic, selectedPhone])

  // Load templates
  const loadTemplates = useCallback(async () => {
    const result = await getTemplates(clinic)
    if ('data' in result && result.data) {
      setTemplates(result.data)
    }
  }, [clinic])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  const handleSendMessage = async (content: string) => {
    if (!selectedPhone) return

    const formData = new FormData()
    formData.append('phone', selectedPhone)
    formData.append('message', content)
    if (selectedConversation?.client_id) {
      formData.append('clientId', selectedConversation.client_id)
    }
    formData.append('conversationType', 'general')

    const result = await sendMessage(formData)

    if (result.success) {
      // Reload messages
      loadMessages()
      router.refresh()
    } else {
      showToast({ title: result.error || 'Error al enviar mensaje', variant: 'error' })
    }
  }

  const handleTemplateSelect = async (
    template: WhatsAppTemplate,
    variables: Record<string, string>
  ) => {
    // Replace variables in content
    let content = template.content
    Object.entries(variables).forEach(([key, value]) => {
      content = content.replace(new RegExp(`{{${key}}}`, 'g'), value)
    })

    await handleSendMessage(content)
  }

  return (
    <div className="flex h-[calc(100vh-120px)] min-h-[400px] overflow-hidden rounded-xl border border-gray-100 bg-white sm:h-[calc(100vh-200px)] sm:min-h-[500px]">
      {/* Conversation list */}
      <div
        className={`flex w-full flex-col border-r border-gray-100 md:w-80 ${
          selectedPhone ? 'hidden md:flex' : ''
        }`}
      >
        <div className="border-b border-gray-100 p-3 sm:p-4">
          <h2 className="font-bold text-[var(--text-primary)]">Conversaciones</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            {conversations.length} chat{conversations.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          <ConversationList
            conversations={conversations}
            selectedPhone={selectedPhone}
            onSelect={setSelectedPhone}
          />
        </div>
      </div>

      {/* Message area */}
      <div className={`flex flex-1 flex-col ${!selectedPhone ? 'hidden md:flex' : ''}`}>
        {selectedPhone ? (
          <>
            <ConversationHeader
              phoneNumber={selectedPhone}
              clientName={selectedConversation?.client_name}
              clientId={selectedConversation?.client_id ?? undefined}
              petName={undefined}
              petId={undefined}
              clinic={clinic}
              onClose={() => setSelectedPhone(null)}
            />

            {loading ? (
              <div className="flex flex-1 items-center justify-center">
                <Icons.Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
              </div>
            ) : (
              <MessageThread messages={messages} />
            )}

            <MessageInput
              onSend={handleSendMessage}
              onTemplateClick={() => setShowTemplates(true)}
              disabled={loading}
            />
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-[var(--text-secondary)]">
            <Icons.MessageSquare className="mb-4 h-16 w-16 text-gray-200" />
            <p className="text-lg font-medium">Selecciona una conversación</p>
            <p className="text-sm">o inicia un nuevo chat</p>
          </div>
        )}
      </div>

      {/* Template selector */}
      <TemplateSelector
        isOpen={showTemplates}
        onClose={() => setShowTemplates(false)}
        onSelect={handleTemplateSelect}
        templates={templates}
        clientName={selectedConversation?.client_name}
        petName={undefined}
      />
    </div>
  )
}
