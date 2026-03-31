'use client'

import { useState } from 'react'
import * as Icons from 'lucide-react'
import { useTranslations } from 'next-intl'
import { rescheduleAppointment, checkAvailableSlots } from '@/app/actions/appointments'
import { useFormSubmit } from '@/hooks'
import { useQuery } from '@tanstack/react-query'

interface RescheduleDialogProps {
  appointmentId: string
  clinicId: string
  currentDate: string
  currentTime: string
  onSuccess?: () => void
}

interface RescheduleData {
  date: string
  time: string
}

export function RescheduleDialog({
  appointmentId,
  clinicId,
  currentDate,
  currentTime,
  onSuccess,
}: RescheduleDialogProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [newDate, setNewDate] = useState(currentDate)
  const [newTime, setNewTime] = useState('')
  const t = useTranslations('appointments')

  // Use the new useFormSubmit hook for submission handling
  const {
    submit,
    isSubmitting,
    error: submitError,
    reset: resetSubmit,
  } = useFormSubmit(
    async (data: RescheduleData) => {
      const result = await rescheduleAppointment(appointmentId, data.date, data.time)
      return result
    },
    {
      onSuccess: () => {
        setShowDialog(false)
        setNewDate('')
        setNewTime('')
        onSuccess?.()
      },
    }
  )

  // Get tomorrow's date as minimum
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  // Fetch available slots
  const {
    data: slots = [],
    isLoading: isLoadingSlots,
    error: slotsError,
  } = useQuery({
    queryKey: ['reschedule-slots', clinicId, newDate],
    queryFn: async () => {
      if (!newDate) return []
      const result = await checkAvailableSlots({
        clinicSlug: clinicId,
        date: newDate,
      })
      if (result.error) throw new Error(result.error)
      return result.data || []
    },
    enabled: !!newDate && showDialog,
  })

  async function handleReschedule() {
    if (!newDate || !newTime) {
      return
    }

    await submit({ date: newDate, time: newTime })
  }

  function handleClose() {
    if (!isSubmitting) {
      setShowDialog(false)
      setNewDate(currentDate)
      setNewTime('')
      resetSubmit()
    }
  }

  return (
    <>
      <button
        onClick={() => setShowDialog(true)}
        className="hover:bg-[var(--primary)]/10 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl p-2 text-[var(--primary)] transition-all"
        title={t('reschedule.buttonTitle')}
      >
        <Icons.CalendarClock className="h-5 w-5" />
      </button>

      {showDialog && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
          onClick={handleClose}
        >
          <div
            className="animate-in zoom-in-95 max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl duration-200 sm:max-w-lg sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="border-b border-gray-100 p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="bg-[var(--primary)]/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 sm:rounded-2xl">
                  <Icons.CalendarClock className="h-5 w-5 text-[var(--primary)] sm:h-6 sm:w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)] sm:text-lg">
                    {t('reschedule.dialogTitle')}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] sm:text-sm">
                    {t('reschedule.dialogSubtitle')}
                  </p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
              {/* Current appointment info */}
              <div className="rounded-xl bg-gray-50 p-3 sm:p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                  {t('reschedule.currentAppointment')}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-sm sm:gap-4">
                  <div className="flex items-center gap-2">
                    <Icons.Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">{currentDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Icons.Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">{currentTime}</span>
                  </div>
                </div>
              </div>

              {/* New Date */}
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">
                  {t('reschedule.newDate')}
                </label>
                <input
                  type="date"
                  value={newDate}
                  min={minDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="focus:ring-[var(--primary)]/20 min-h-[48px] w-full rounded-xl border border-gray-200 p-3 text-base outline-none transition-all focus:border-[var(--primary)] focus:ring-2 sm:p-4"
                  disabled={isSubmitting}
                />
              </div>

              {/* New Time */}
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">
                  {t('reschedule.newTime')}
                </label>

                {isLoadingSlots ? (
                  <div className="flex justify-center py-4">
                    <Icons.Loader2 className="h-6 w-6 animate-spin text-[var(--primary)]" />
                  </div>
                ) : slotsError ? (
                  <p className="text-sm text-red-500">{t('reschedule.errorLoadingSlots')}</p>
                ) : slots.length === 0 ? (
                  <p className="text-sm italic text-gray-500">{t('reschedule.noSlotsAvailable')}</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {slots.map((slot) => (
                      <button
                        key={slot.time}
                        onClick={() => setNewTime(slot.time)}
                        disabled={isSubmitting || !slot.available}
                        className={`min-h-[44px] rounded-xl py-3 text-sm font-bold transition-all ${
                          newTime === slot.time
                            ? 'bg-[var(--primary)] text-white shadow-lg'
                            : !slot.available
                              ? 'cursor-not-allowed bg-gray-50 text-gray-300'
                              : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* TICKET-A11Y-004: Added role="alert" for screen readers */}
              {submitError && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 p-3 sm:p-4"
                >
                  <Icons.AlertCircle className="h-5 w-5 shrink-0 text-red-500" aria-hidden="true" />
                  <p className="text-sm font-medium text-red-600">{submitError}</p>
                </div>
              )}

              <div className="flex items-start gap-3 rounded-xl border border-yellow-100 bg-yellow-50 p-3 sm:p-4">
                <Icons.Info className="mt-0.5 h-5 w-5 shrink-0 text-yellow-600" />
                <p className="text-sm text-yellow-700">
                  {t('reschedule.pendingConfirmation')}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-col-reverse gap-3 border-t border-gray-100 p-4 sm:flex-row sm:justify-end sm:p-6">
              <button
                onClick={handleClose}
                className="min-h-[48px] rounded-xl px-6 py-3 font-bold text-[var(--text-secondary)] transition-all hover:bg-gray-50"
                disabled={isSubmitting}
              >
                {t('reschedule.cancelButton')}
              </button>
              <button
                onClick={handleReschedule}
                className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
                disabled={isSubmitting || !newDate || !newTime}
              >
                {isSubmitting ? (
                  <>
                    <Icons.Loader2 className="h-4 w-4 animate-spin" />
                    {t('reschedule.rescheduling')}
                  </>
                ) : (
                  <>
                    <Icons.Check className="h-4 w-4" />
                    {t('reschedule.confirmButton')}
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
