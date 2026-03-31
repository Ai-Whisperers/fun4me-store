'use client'

import { Loader2, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface DeleteConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isDeleting: boolean
  title?: string
  message?: string
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
  title,
  message,
}: DeleteConfirmModalProps) {
  const t = useTranslations('inventory.deleteModal')
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-[var(--bg-default)] shadow-2xl">
        <div className="p-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--status-error-bg)]">
            <Trash2 className="h-8 w-8 text-[var(--status-error)]" />
          </div>
          <h3 className="mb-2 text-lg font-bold text-[var(--text-primary)]">{title || t('title')}</h3>
          <p className="text-sm text-[var(--text-muted)]">{message || t('message')}</p>
        </div>
        <div className="flex gap-3 bg-[var(--bg-subtle)] p-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 font-bold text-[var(--text-muted)] transition hover:text-[var(--text-secondary)]"
          >
            {t('cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--status-error)] py-3 font-bold text-white transition hover:bg-[var(--status-error-dark)] disabled:opacity-50"
          >
            {isDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : t('delete')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeleteConfirmModal
