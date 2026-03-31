'use client'

import { useEffect, useCallback, useRef } from 'react'
import { X } from 'lucide-react'
import { clsx } from 'clsx'
import { useTranslations } from 'next-intl'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  showCloseButton?: boolean
  closeOnBackdrop?: boolean
  closeOnEscape?: boolean
  className?: string
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnBackdrop = true,
  closeOnEscape = true,
  className,
}: ModalProps): React.ReactElement | null {
  const t = useTranslations('common')
  const modalRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<Element | null>(null)

  // Handle keyboard events (escape and focus trap)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      // Close on Escape
      if (e.key === 'Escape' && closeOnEscape) {
        onClose()
        return
      }

      // Focus trap on Tab
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, closeOnEscape])

  // Lock body scroll and manage focus
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement
      document.body.style.overflow = 'hidden'
      modalRef.current?.focus()
    } else {
      document.body.style.overflow = ''
      if (previousActiveElement.current instanceof HTMLElement) {
        previousActiveElement.current.focus()
      }
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (closeOnBackdrop && e.target === e.currentTarget) {
        onClose()
      }
    },
    [closeOnBackdrop, onClose]
  )

  if (!isOpen) return null

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-4xl',
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="animate-fade-in fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div
        className="flex min-h-full items-center justify-center p-4"
        onClick={handleBackdropClick}
      >
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
          aria-describedby={description ? 'modal-description' : undefined}
          tabIndex={-1}
          className={clsx(
            'animate-scale-in relative w-full transform rounded-3xl bg-[var(--bg-paper)] shadow-2xl transition-all',
            sizes[size],
            className
          )}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-start justify-between p-6 pb-0">
              <div>
                {title && (
                  <h2 id="modal-title" className="text-xl font-bold text-[var(--text-primary)]">
                    {title}
                  </h2>
                )}
                {description && (
                  <p id="modal-description" className="mt-1 text-sm text-[var(--text-secondary)]">
                    {description}
                  </p>
                )}
              </div>
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="-mr-2 -mt-2 rounded-xl p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text-secondary)]"
                  aria-label={t('close')}
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          )}

          {/* Content */}
          <div className="p-6">{children}</div>
        </div>
      </div>
    </div>
  )
}

// Modal Footer component for consistent action buttons
interface ModalFooterProps {
  children: React.ReactNode
  className?: string
}

export function ModalFooter({ children, className }: ModalFooterProps): React.ReactElement {
  return (
    <div
      className={clsx(
        'flex items-center justify-end gap-3 border-t border-[var(--border-light,#f3f4f6)] pt-4',
        className
      )}
    >
      {children}
    </div>
  )
}

// Confirm Modal - a pre-built confirmation dialog
interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'info'
  isLoading?: boolean
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = 'danger',
  isLoading = false,
}: ConfirmModalProps): React.ReactElement {
  const t = useTranslations('common')
  const variantStyles = {
    danger:
      'bg-[var(--status-error,#ef4444)] hover:bg-[var(--status-error-dark,#dc2626)] text-white',
    warning:
      'bg-[var(--status-warning,#eab308)] hover:bg-[var(--status-warning-dark,#ca8a04)] text-white',
    info: 'bg-[var(--status-info,#3b82f6)] hover:bg-[var(--status-info-dark,#2563eb)] text-white',
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="mb-6 text-[var(--text-secondary)]">{message}</p>
      <ModalFooter>
        <button
          onClick={onClose}
          disabled={isLoading}
          className="rounded-xl px-4 py-2 font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-subtle)]"
        >
          {cancelLabel || t('cancel')}
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className={clsx(
            'rounded-xl px-4 py-2 font-bold transition-colors disabled:opacity-50',
            variantStyles[variant]
          )}
        >
          {isLoading ? t('processing') : (confirmLabel || t('confirm'))}
        </button>
      </ModalFooter>
    </Modal>
  )
}
