'use client'

import { useState, useRef } from 'react'
import * as Icons from 'lucide-react'

interface MessageInputProps {
  onSend: (message: string) => Promise<void>
  onTemplateClick?: () => void
  disabled?: boolean
  placeholder?: string
}

export function MessageInput({
  onSend,
  onTemplateClick,
  disabled = false,
  placeholder = 'Escribe un mensaje...',
}: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = async () => {
    const trimmedMessage = message.trim()
    if (!trimmedMessage || sending) return

    setSending(true)
    try {
      await onSend(trimmedMessage)
      setMessage('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)

    // Auto-resize textarea
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
  }

  return (
    <div className="border-t border-gray-100 bg-white p-3 sm:p-4">
      <div className="flex items-end gap-2">
        {/* Template button */}
        {onTemplateClick && (
          <button
            onClick={onTemplateClick}
            disabled={disabled}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-3 hover:bg-gray-100 disabled:opacity-50"
            title="Usar plantilla"
          >
            <Icons.FileText className="h-5 w-5 text-[var(--text-secondary)]" />
          </button>
        )}

        {/* Message input */}
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || sending}
            rows={1}
            className="focus:ring-[var(--primary)]/50 w-full resize-none rounded-2xl bg-gray-100 px-4 py-3 text-base text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 disabled:opacity-50"
            style={{ minHeight: '48px', maxHeight: '120px' }}
          />
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!message.trim() || disabled || sending}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-[var(--primary)] p-3 text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? (
            <Icons.Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Icons.Send className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  )
}
