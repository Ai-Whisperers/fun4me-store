'use client'

/**
 * Feedback Notification Component
 *
 * Displays success/error notifications.
 */

import { CheckCircle, XCircle, X } from 'lucide-react'
import type { FeedbackState } from './types'

interface FeedbackNotificationProps {
  feedback: FeedbackState
  onDismiss: () => void
}

export function FeedbackNotification({
  feedback,
  onDismiss,
}: FeedbackNotificationProps): React.ReactElement {
  return (
    <div
      className={`fixed right-4 top-4 z-50 flex items-center gap-3 rounded-lg p-4 shadow-lg ${
        feedback.type === 'success'
          ? 'border border-green-300 bg-green-100 text-green-800'
          : 'border border-red-300 bg-red-100 text-red-800'
      }`}
    >
      {feedback.type === 'success' ? (
        <CheckCircle className="h-5 w-5" />
      ) : (
        <XCircle className="h-5 w-5" />
      )}
      <span className="font-medium">{feedback.message}</span>
      <button onClick={onDismiss} className="ml-2 hover:opacity-70">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
