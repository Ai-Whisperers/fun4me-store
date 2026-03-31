'use client'

import { motion } from 'framer-motion'
import { Loader2, Check } from 'lucide-react'
import type { SendResult } from './types'

interface SendProgressProps {
  progress: number
  result: SendResult | null
  labels: {
    sending: string
    completed: string
    sent_count: string
    failed_count: string
    close: string
  }
  onClose: () => void
}

export function SendProgress({
  progress,
  result,
  labels,
  onClose,
}: SendProgressProps): React.ReactElement {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6">
      {!result ? (
        <SendingState progress={progress} label={labels.sending} />
      ) : (
        <CompletedState result={result} labels={labels} onClose={onClose} />
      )}
    </div>
  )
}

/**
 * Sending in progress state
 */
function SendingState({
  progress,
  label,
}: {
  progress: number
  label: string
}): React.ReactElement {
  return (
    <div className="text-center">
      <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-[var(--primary)]" />
      <p className="mb-2 text-lg font-medium text-gray-900">{label}</p>
      <p className="mb-4 text-sm text-gray-500">{progress}%</p>
      <div className="h-2 w-64 overflow-hidden rounded-full bg-gray-200">
        <motion.div
          className="h-full bg-[var(--primary)]"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

/**
 * Completed state with results
 */
function CompletedState({
  result,
  labels,
  onClose,
}: {
  result: SendResult
  labels: {
    completed: string
    sent_count: string
    failed_count: string
    close: string
  }
  onClose: () => void
}): React.ReactElement {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--status-success-bg)]">
        <Check className="h-8 w-8 text-[var(--status-success)]" />
      </div>
      <p className="mb-2 text-lg font-medium text-gray-900">{labels.completed}</p>
      <p className="mb-6 text-sm text-gray-500">
        {labels.sent_count.replace('{success}', String(result.success))}
        {result.failed > 0 && `, ${labels.failed_count.replace('{failed}', String(result.failed))}`}
      </p>
      <button
        onClick={onClose}
        className="rounded-lg bg-[var(--primary)] px-6 py-3 font-medium text-white transition-colors hover:opacity-90"
      >
        {labels.close}
      </button>
    </div>
  )
}
