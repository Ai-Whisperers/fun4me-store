'use client'

import * as Icons from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { whatsAppStatusConfig, type WhatsAppMessage } from '@/lib/types/whatsapp'

interface MessageBubbleProps {
  message: WhatsAppMessage
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isOutbound = message.direction === 'outbound'
  const statusConfig = whatsAppStatusConfig[message.status]

  return (
    <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2 ${
          isOutbound
            ? 'rounded-br-sm bg-[var(--primary)] text-white'
            : 'rounded-bl-sm bg-gray-100 text-[var(--text-primary)]'
        }`}
      >
        {/* Message content */}
        <p className="whitespace-pre-wrap break-words">{message.content}</p>

        {/* Time and status */}
        <div
          className={`mt-1 flex items-center justify-end gap-1 ${
            isOutbound ? 'text-white/70' : 'text-[var(--text-secondary)]'
          }`}
        >
          <span className="text-xs">
            {message.sent_at && format(new Date(message.sent_at), 'HH:mm', { locale: es })}
          </span>

          {isOutbound && (
            <span className={isOutbound ? 'text-white/70' : statusConfig?.className}>
              {message.status === 'read' ? (
                <Icons.CheckCheck className="h-4 w-4" />
              ) : message.status === 'delivered' ? (
                <Icons.CheckCheck className="h-4 w-4" />
              ) : message.status === 'sent' ? (
                <Icons.Check className="h-4 w-4" />
              ) : message.status === 'failed' ? (
                <Icons.AlertCircle className="h-4 w-4" />
              ) : (
                <Icons.Clock className="h-4 w-4" />
              )}
            </span>
          )}
        </div>

        {/* Error message */}
        {message.status === 'failed' && message.error_message && (
          <p className={`mt-1 text-xs ${isOutbound ? 'text-red-200' : 'text-red-500'}`}>
            Error: {message.error_message}
          </p>
        )}
      </div>
    </div>
  )
}
