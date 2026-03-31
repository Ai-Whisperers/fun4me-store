/**
 * Quick Add Modal Component
 *
 * Main orchestrator for quick appointment creation modal.
 */

'use client'

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useQuickAddForm } from './use-quick-add-form'
import { PetSelector } from './PetSelector'
import { TimeInputs } from './TimeInputs'
import { AppointmentFields } from './AppointmentFields'
import { ConflictWarning } from './ConflictWarning'
import type { QuickAddModalProps } from './types'

export function QuickAddModal({
  isOpen,
  onClose,
  onSave,
  slotInfo,
  pets,
  services,
  staff,
  isLoading = false,
}: QuickAddModalProps): React.ReactElement | null {
  const {
    formState,
    setPetId,
    setServiceId,
    setVetId,
    setReason,
    setNotes,
    setStartTime,
    setEndTime,
    setPetSearch,
    setIsSaving,
    validateAndBuildData,
  } = useQuickAddForm({ slotInfo, isOpen, services })

  if (!isOpen || !slotInfo) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const data = validateAndBuildData()
    if (!data) return

    setIsSaving(true)

    try {
      await onSave(data)
      onClose()
    } catch (_error: unknown) {
      // Error is handled by the hook
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg transform overflow-hidden rounded-lg bg-[var(--bg-paper)] shadow-xl transition-all">
          {/* Header */}
          <div className="border-b border-[var(--border-light,#f3f4f6)] px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Nueva Cita</h3>
                <p className="text-sm text-gray-500">
                  {format(slotInfo.start, "EEEE, d 'de' MMMM", { locale: es })}
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="max-h-[60vh] space-y-4 overflow-y-auto px-6 py-4">
              {/* Error message */}
              {formState.error && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="rounded-lg border border-[var(--status-error-border)] bg-[var(--status-error-bg)] p-3 text-sm text-[var(--status-error-text)]"
                >
                  {formState.error}
                </div>
              )}

              {/* Conflict warning */}
              <ConflictWarning
                conflicts={formState.conflicts}
                isCheckingAvailability={formState.isCheckingAvailability}
              />

              {/* Pet selection */}
              <PetSelector
                pets={pets}
                selectedPetId={formState.petId}
                searchValue={formState.petSearch}
                onPetSelect={setPetId}
                onSearchChange={setPetSearch}
              />

              {/* Time inputs */}
              <TimeInputs
                startTime={formState.startTime}
                endTime={formState.endTime}
                onStartTimeChange={setStartTime}
                onEndTimeChange={setEndTime}
              />

              {/* Appointment fields */}
              <AppointmentFields
                services={services}
                staff={staff}
                serviceId={formState.serviceId}
                vetId={formState.vetId}
                reason={formState.reason}
                notes={formState.notes}
                onServiceChange={setServiceId}
                onVetChange={setVetId}
                onReasonChange={setReason}
                onNotesChange={setNotes}
              />
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={formState.isSaving || isLoading}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: 'var(--primary, #3B82F6)' }}
              >
                {(formState.isSaving || isLoading) && (
                  <svg
                    className="h-4 w-4 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                )}
                {formState.isSaving ? 'Guardando...' : 'Crear Cita'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
