'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'

interface TimeOffActionsProps {
  requestId: string
  clinic: string
}

export function TimeOffActions({ requestId, clinic: _clinic }: TimeOffActionsProps): React.ReactElement {
  const [isLoading, setIsLoading] = useState<'approve' | 'reject' | null>(null)
  const router = useRouter()
  const { showToast } = useToast()

  const handleAction = async (action: 'approved' | 'rejected'): Promise<void> => {
    setIsLoading(action === 'approved' ? 'approve' : 'reject')

    try {
      const response = await fetch(`/api/dashboard/time-off/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action }),
      })

      if (response.ok) {
        router.refresh()
      } else {
        // BUG-009: Replace alert with toast notification
        showToast({
          title: 'Error al actualizar la solicitud',
          variant: 'error',
        })
      }
    } catch (_error: unknown) {
      // BUG-009: Replace alert with toast notification
      showToast({
        title: 'Error de conexión',
        variant: 'error',
      })
    } finally {
      setIsLoading(null)
    }
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => handleAction('approved')}
        disabled={isLoading !== null}
        className="rounded-lg p-2 text-[var(--status-success)] transition-colors hover:bg-[var(--status-success-bg)] disabled:opacity-50"
        title="Aprobar"
      >
        {isLoading === 'approve' ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <CheckCircle2 className="h-5 w-5" />
        )}
      </button>
      <button
        onClick={() => handleAction('rejected')}
        disabled={isLoading !== null}
        className="rounded-lg p-2 text-[var(--status-error)] transition-colors hover:bg-[var(--status-error-bg)] disabled:opacity-50"
        title="Rechazar"
      >
        {isLoading === 'reject' ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <XCircle className="h-5 w-5" />
        )}
      </button>
    </div>
  )
}
