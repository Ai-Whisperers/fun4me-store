'use client'

import { useEffect, useState, useCallback } from 'react'
import { PrivacyUpdateModal } from './privacy-update-modal'
import type { AcceptanceStatus } from '@/lib/privacy'

interface PrivacyStatusCheckerProps {
  /** Children to render when privacy is accepted */
  children: React.ReactNode
  /** Whether to block access until privacy is accepted */
  blocking?: boolean
  /** Optional callback when status changes */
  onStatusChange?: (status: AcceptanceStatus) => void
}

/**
 * Privacy Status Checker
 *
 * COMP-002: Component that checks user's privacy policy acceptance status
 * and shows the update modal if needed.
 *
 * Usage:
 * ```tsx
 * <PrivacyStatusChecker blocking>
 *   <YourProtectedContent />
 * </PrivacyStatusChecker>
 * ```
 */
export function PrivacyStatusChecker({
  children,
  blocking = false,
  onStatusChange,
}: PrivacyStatusCheckerProps) {
  const [status, setStatus] = useState<AcceptanceStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const checkStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/privacy/status')
      if (response.ok) {
        const data: AcceptanceStatus = await response.json()
        setStatus(data)
        onStatusChange?.(data)

        // Show modal if needs re-acceptance
        if (data.needsReacceptance && data.policy) {
          setShowModal(true)
        }
      }
    } catch (error) {
      console.error('Error checking privacy status:', error)
    } finally {
      setIsLoading(false)
    }
  }, [onStatusChange])

  useEffect(() => {
    checkStatus()
  }, [checkStatus])

  const handleAccepted = () => {
    setShowModal(false)
    // Re-check status after acceptance
    checkStatus()
  }

  const handleDeclined = () => {
    if (!blocking) {
      setShowModal(false)
    }
  }

  // Still loading - show nothing or a loading state
  if (isLoading) {
    return <>{children}</>
  }

  // If blocking and needs acceptance, don't render children
  if (blocking && status?.needsReacceptance) {
    return (
      <>
        {status.policy && (
          <PrivacyUpdateModal
            isOpen={showModal}
            policy={status.policy}
            acceptedVersion={status.acceptedVersion}
            onAccepted={handleAccepted}
            // No onDeclined for blocking mode
          />
        )}
        <div className="flex min-h-[200px] items-center justify-center">
          <p className="text-[var(--text-secondary)]">
            Por favor acepta la política de privacidad para continuar.
          </p>
        </div>
      </>
    )
  }

  return (
    <>
      {status?.needsReacceptance && status.policy && (
        <PrivacyUpdateModal
          isOpen={showModal}
          policy={status.policy}
          acceptedVersion={status.acceptedVersion}
          onAccepted={handleAccepted}
          onDeclined={handleDeclined}
        />
      )}
      {children}
    </>
  )
}
