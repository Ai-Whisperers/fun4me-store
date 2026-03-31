'use client'

import { AlertCircle, Send } from 'lucide-react'
import type { MessageChannel } from './types'

interface MessageReviewProps {
  selectedCount: number
  channel: MessageChannel
  message: string
  labels: {
    client_label: string
    channel_label: string
    message_label: string
    confirm_send: string
    send_warning: string
    edit: string
    send: string
  }
  onBack: () => void
  onSend: () => void
}

export function MessageReview({
  selectedCount,
  channel,
  message,
  labels,
  onBack,
  onSend,
}: MessageReviewProps): React.ReactElement {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        {/* Summary */}
        <div className="space-y-3 rounded-lg bg-gray-50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">{labels.client_label}</span>
            <span className="font-medium">{selectedCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">{labels.channel_label}</span>
            <span className="font-medium capitalize">{channel}</span>
          </div>
        </div>

        {/* Message Preview */}
        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">{labels.message_label}</p>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="whitespace-pre-wrap text-gray-900">{message}</p>
          </div>
        </div>

        {/* Warning */}
        <div className="rounded-lg border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--status-warning)]" />
            <div>
              <p className="font-medium text-[var(--status-warning-text)]">{labels.confirm_send}</p>
              <p className="mt-1 text-sm text-[var(--status-warning)]">
                {labels.send_warning.replace('{count}', String(selectedCount))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex gap-3 border-t border-gray-100 bg-gray-50 p-4">
        <button
          onClick={onBack}
          className="rounded-lg border border-gray-300 px-6 py-3 font-medium transition-colors hover:bg-gray-100"
        >
          {labels.edit}
        </button>
        <button
          onClick={onSend}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] py-3 font-medium text-white transition-colors hover:opacity-90"
        >
          <Send className="h-5 w-5" />
          {labels.send}
        </button>
      </div>
    </div>
  )
}
