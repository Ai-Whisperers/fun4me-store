'use client'

import * as Icons from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { whatsAppStatusConfig, type Conversation } from '@/lib/types/whatsapp'

interface ConversationListProps {
  conversations: Conversation[]
  selectedPhone: string | null
  onSelect: (phone: string) => void
}

export function ConversationList({
  conversations,
  selectedPhone,
  onSelect,
}: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="p-8 text-center">
        <Icons.MessageSquare className="mx-auto mb-3 h-12 w-12 text-gray-300" />
        <p className="text-[var(--text-secondary)]">No hay conversaciones</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-100">
      {conversations.map((conversation) => {
        const isSelected = selectedPhone === conversation.phone_number
        const statusConfig = conversation.last_message_status
          ? whatsAppStatusConfig[conversation.last_message_status]
          : undefined

        return (
          <button
            key={conversation.phone_number}
            onClick={() => onSelect(conversation.phone_number)}
            className={`min-h-[60px] w-full p-4 text-left transition-colors hover:bg-gray-50 ${
              isSelected ? 'bg-[var(--primary)]/5 border-l-4 border-[var(--primary)]' : ''
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="bg-[var(--primary)]/10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full">
                <Icons.User className="h-5 w-5 text-[var(--primary)]" />
              </div>

              <div className="min-w-0 flex-1">
                {/* Name and time */}
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="truncate font-medium text-[var(--text-primary)]">
                    {conversation.client_name || conversation.phone_number}
                  </span>
                  <span className="flex-shrink-0 text-xs text-[var(--text-secondary)]">
                    {conversation.last_message_at &&
                      formatDistanceToNow(new Date(conversation.last_message_at), {
                        addSuffix: true,
                        locale: es,
                      })}
                  </span>
                </div>

                {/* Phone and last message preview */}
                {conversation.client_name && (
                  <p className="mb-1 text-xs text-[var(--text-secondary)]">
                    {conversation.phone_number}
                  </p>
                )}

                {/* Last message */}
                <div className="flex items-center gap-2">
                  {conversation.last_message_direction === 'outbound' && (
                    <span className={`flex-shrink-0 ${statusConfig?.className || 'text-gray-400'}`}>
                      {conversation.last_message_status === 'read' ? (
                        <Icons.CheckCheck className="h-4 w-4" />
                      ) : conversation.last_message_status === 'delivered' ? (
                        <Icons.CheckCheck className="h-4 w-4" />
                      ) : conversation.last_message_status === 'sent' ? (
                        <Icons.Check className="h-4 w-4" />
                      ) : conversation.last_message_status === 'failed' ? (
                        <Icons.AlertCircle className="h-4 w-4" />
                      ) : (
                        <Icons.Clock className="h-4 w-4" />
                      )}
                    </span>
                  )}
                  <p className="truncate text-sm text-[var(--text-secondary)]">
                    {conversation.last_message}
                  </p>
                </div>

                {/* Unread badge */}
                {conversation.unread_count > 0 && (
                  <div className="mt-2">
                    <span className="inline-flex items-center justify-center rounded-full bg-[var(--primary)] px-2 py-0.5 text-xs font-medium text-white">
                      {conversation.unread_count}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
