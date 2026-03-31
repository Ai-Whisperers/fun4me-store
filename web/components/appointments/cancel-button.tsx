'use client'

import { useState } from 'react'
import * as Icons from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cancelAppointment } from '@/app/actions/appointments'

interface CancelButtonProps {
  appointmentId: string
  onSuccess?: () => void
  variant?: 'button' | 'icon' | 'text'
  className?: string
}

export function CancelButton({
  appointmentId,
  onSuccess,
  variant = 'text',
  className = '',
}: CancelButtonProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const t = useTranslations('appointments')

  async function handleCancel() {
    setLoading(true)
    setError(null)

    const result = await cancelAppointment(appointmentId, reason || undefined)

    if (!result.success) {
      setError(result.error)
      setLoading(false)
    } else {
      setShowDialog(false)
      setReason('')
      onSuccess?.()
    }
  }

  function handleClose() {
    if (!loading) {
      setShowDialog(false)
      setReason('')
      setError(null)
    }
  }

  const buttonContent = {
    button: (
      <button
        onClick={() => setShowDialog(true)}
        className={`flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-600 transition-all hover:bg-red-100 ${className}`}
      >
        <Icons.X className="h-4 w-4" />
        {t('cancel.buttonLabel')}
      </button>
    ),
    icon: (
      <button
        onClick={() => setShowDialog(true)}
        className={`rounded-xl p-2 text-red-500 transition-all hover:bg-red-50 ${className}`}
        title={t('cancel.buttonTitle')}
      >
        <Icons.X className="h-5 w-5" />
      </button>
    ),
    text: (
      <button
        onClick={() => setShowDialog(true)}
        className={`text-sm font-medium text-red-600 hover:text-red-800 hover:underline ${className}`}
      >
        {t('cancel.buttonText')}
      </button>
    ),
  }

  return (
    <>
      {buttonContent[variant]}

      {showDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={handleClose}
        >
          <div
            className="animate-in zoom-in-95 w-full max-w-md rounded-3xl bg-white shadow-2xl duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="border-b border-gray-100 p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50">
                  <Icons.AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">{t('cancel.dialogTitle')}</h3>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {t('cancel.dialogSubtitle')}
                  </p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">
                {t('cancel.reasonLabel')}
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('cancel.reasonPlaceholder')}
                className="focus:ring-[var(--primary)]/20 w-full resize-none rounded-2xl border border-gray-200 p-4 text-sm outline-none transition-all focus:border-[var(--primary)] focus:ring-2"
                rows={3}
                disabled={loading}
              />

              {error && (
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
                  <Icons.AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
                  <p className="text-sm font-medium text-red-600">{error}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t border-gray-100 p-6">
              <button
                onClick={handleClose}
                className="rounded-xl px-6 py-3 font-bold text-[var(--text-secondary)] transition-all hover:bg-gray-50"
                disabled={loading}
              >
                {t('cancel.backButton')}
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-bold text-white transition-all hover:bg-red-700 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Icons.Loader2 className="h-4 w-4 animate-spin" />
                    {t('cancel.cancelling')}
                  </>
                ) : (
                  <>
                    <Icons.X className="h-4 w-4" />
                    {t('cancel.confirmButton')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
