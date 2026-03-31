'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ConfirmModal } from './modal'

interface ConfirmDialogProps {
  trigger: React.ReactNode
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'info'
  onConfirm: () => Promise<void> | void
}

/**
 * ConfirmDialog - A trigger-based confirmation dialog
 *
 * Wraps ConfirmModal to provide a declarative API where you pass a trigger element
 * instead of managing isOpen state yourself.
 *
 * @example
 * <ConfirmDialog
 *   trigger={<Button variant="destructive">Eliminar</Button>}
 *   title="¿Eliminar mascota?"
 *   description="Esta acción no se puede deshacer."
 *   variant="danger"
 *   onConfirm={async () => await deletePet(petId)}
 * />
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = 'danger',
  onConfirm,
}: ConfirmDialogProps): React.ReactElement {
  const t = useTranslations('common')
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const effectiveConfirmLabel = confirmLabel ?? t('confirm')
  const effectiveCancelLabel = cancelLabel ?? t('cancel')

  async function handleConfirm() {
    setIsLoading(true)
    try {
      await onConfirm()
      setIsOpen(false)
    } catch (error) {
      console.error('Confirm action failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div onClick={() => setIsOpen(true)}>{trigger}</div>
      <ConfirmModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={handleConfirm}
        title={title}
        message={description}
        confirmLabel={effectiveConfirmLabel}
        cancelLabel={effectiveCancelLabel}
        variant={variant}
        isLoading={isLoading}
      />
    </>
  )
}
