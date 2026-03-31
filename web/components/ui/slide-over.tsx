'use client'

import { useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { clsx } from 'clsx'
import { useTranslations } from 'next-intl'

export interface SlideOverProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  side?: 'right' | 'left'
  showCloseButton?: boolean
  closeOnBackdrop?: boolean
  closeOnEscape?: boolean
  className?: string
  footer?: React.ReactNode
}

export function SlideOver({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  side = 'right',
  showCloseButton = true,
  closeOnBackdrop = true,
  closeOnEscape = true,
  className,
  footer,
}: SlideOverProps): React.ReactElement | null {
  const t = useTranslations('common')
  const panelRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<Element | null>(null)

  // Handle keyboard events (escape and focus trap)
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent): void => {
      // Close on Escape
      if (e.key === 'Escape' && closeOnEscape) {
        onClose()
        return
      }

      // Focus trap on Tab
      if (e.key === 'Tab' && panelRef.current) {
        const focusableElements = panelRef.current.querySelectorAll<HTMLElement>(
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
      setTimeout(() => panelRef.current?.focus(), 50)
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

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-2xl',
  }

  const slideVariants = {
    right: {
      hidden: { x: '100%' },
      visible: { x: 0 },
    },
    left: {
      hidden: { x: '-100%' },
      visible: { x: 0 },
    },
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleBackdropClick}
            aria-hidden="true"
          />

          {/* Panel Container */}
          <div
            className={clsx('fixed inset-y-0 flex', side === 'right' ? 'right-0' : 'left-0')}
            onClick={handleBackdropClick}
          >
            <motion.div
              ref={panelRef}
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={slideVariants[side]}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? 'slide-over-title' : undefined}
              aria-describedby={description ? 'slide-over-description' : undefined}
              tabIndex={-1}
              className={clsx(
                'relative flex w-screen flex-col bg-white shadow-2xl',
                sizes[size],
                className
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex shrink-0 items-start justify-between border-b border-gray-100 px-6 py-4">
                <div className="min-w-0 flex-1 pr-4">
                  {title && (
                    <h2
                      id="slide-over-title"
                      className="truncate text-xl font-bold text-[var(--text-primary)]"
                    >
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p
                      id="slide-over-description"
                      className="mt-1 text-sm text-[var(--text-secondary)]"
                    >
                      {description}
                    </p>
                  )}
                </div>
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="-mr-2 shrink-0 rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    aria-label={t('closePanel')}
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>

              {/* Footer */}
              {footer && (
                <div className="shrink-0 border-t border-gray-100 bg-gray-50 px-6 py-4">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  )
}

// Pre-built footer with standard buttons
interface SlideOverFooterProps {
  onCancel: () => void
  onSubmit?: () => void
  cancelLabel?: string
  submitLabel?: string
  isSubmitting?: boolean
  submitDisabled?: boolean
  submitVariant?: 'primary' | 'danger'
}

export function SlideOverFooter({
  onCancel,
  onSubmit,
  cancelLabel,
  submitLabel,
  isSubmitting = false,
  submitDisabled = false,
  submitVariant = 'primary',
}: SlideOverFooterProps): React.ReactElement {
  const t = useTranslations('common')
  const cancel = cancelLabel || t('cancel')
  const submit = submitLabel || t('save')
  const submitStyles = {
    primary:
      'bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 shadow-lg hover:shadow-xl',
    danger: 'bg-[var(--status-error)] text-white hover:bg-[var(--status-error)]/90 shadow-lg hover:shadow-xl',
  }

  return (
    <div className="flex items-center justify-end gap-3">
      <button
        type="button"
        onClick={onCancel}
        disabled={isSubmitting}
        className="rounded-xl px-4 py-2.5 font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50"
      >
        {cancel}
      </button>
      {onSubmit && (
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting || submitDisabled}
          className={clsx(
            'rounded-xl px-6 py-2.5 font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50',
            submitStyles[submitVariant]
          )}
        >
          {isSubmitting ? t('saving') : submit}
        </button>
      )}
    </div>
  )
}
