'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Stethoscope, PawPrint, CheckCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useBookingStore } from '@/lib/store/booking-store'
import { ServiceSelection } from './ServiceSelection'
import { PetSelection } from './PetSelection'
import { Confirmation } from './Confirmation'
import { SuccessScreen } from './SuccessScreen'
import { BookingSummary } from './BookingSummary'
import { ProgressStepper, type Step } from '@/components/ui/progress-stepper'
import { ErrorBoundary } from '@/components/error/error-boundary'
import type { ClinicData } from '@/lib/types/clinic-config'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { Pet } from './types'

// Note: 'datetime' step removed - customers no longer select times
// Clinic will contact them to schedule
const STEP_ORDER = ['service', 'pet', 'confirm'] as const

interface BookingWizardProps {
  clinic: ClinicData
  user: SupabaseUser
  userPets: Pet[]
  initialServiceIds?: string[] // Support multiple services
  initialPetId?: string
}

/**
 * Main booking wizard orchestrator component
 * Manages the multi-step booking flow with multi-service support
 */
export default function BookingWizard({
  clinic,
  user: _user,
  userPets,
  initialServiceIds = [],
  initialPetId,
}: BookingWizardProps) {
  const [queryClient] = useState(() => new QueryClient())
  const t = useTranslations('booking.wizard')

  const {
    step,
    setStep,
    selection,
    updateSelection,
    services,
    isSubmitting,
    submitError,
    submitBooking,
    initialize,
    getSelectedServices,
  } = useBookingStore()

  // Initialize store with props on mount
  useEffect(() => {
    initialize(clinic, userPets, initialServiceIds, initialPetId)
  }, [clinic, userPets, initialServiceIds, initialPetId, initialize])

  // Derived values from store
  const selectedServices = useMemo(() => getSelectedServices(), [getSelectedServices, selection.serviceIds])

  const currentPet = useMemo(
    () => userPets.find((p) => p.id === selection.petId),
    [userPets, selection.petId]
  )

  // Generate step configuration with labels from translations
  // Note: datetime step removed - 3 steps instead of 4
  const BOOKING_STEPS: Step[] = useMemo(
    () => [
      {
        id: 'service',
        label: t('steps.service.label'),
        description: clinic.config.ui_labels?.booking?.select_service || t('steps.service.description'),
        icon: <Stethoscope className="h-4 w-4" />,
      },
      {
        id: 'pet',
        label: t('steps.pet.label'),
        description: clinic.config.ui_labels?.booking?.select_pet || t('steps.pet.description'),
        icon: <PawPrint className="h-4 w-4" />,
      },
      {
        id: 'confirm',
        label: clinic.config.ui_labels?.common?.actions?.confirm || t('steps.confirm.label'),
        description: t('steps.confirm.description'),
        icon: <CheckCircle className="h-4 w-4" />,
      },
    ],
    [clinic.config.ui_labels, t]
  )

  // Calculate current step index for progress stepper
  const currentStepIndex = useMemo(() => {
    return STEP_ORDER.indexOf(step as (typeof STEP_ORDER)[number])
  }, [step])

  // Handle step navigation from progress stepper clicks
  const handleStepClick = (stepIndex: number): void => {
    const targetStep = STEP_ORDER[stepIndex]
    if (targetStep) {
      setStep(targetStep)
    }
  }

  // Show success screen after booking
  if (step === 'success') {
    return <SuccessScreen clinicId={clinic.config.id} clinicName={clinic.config.name} />
  }

  // A11Y-001: Get current step info for screen reader announcement
  const currentStepInfo = BOOKING_STEPS[currentStepIndex]

  return (
    <QueryClientProvider client={queryClient}>
      <div className="mx-auto max-w-6xl px-4 py-12" role="region" aria-label={t('regionLabel')}>
        {/* A11Y-001: Screen reader announcement for step changes */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {currentStepInfo && t('stepAnnouncement', {
            current: currentStepIndex + 1,
            total: BOOKING_STEPS.length,
            label: currentStepInfo.label,
            description: currentStepInfo.description ?? ''
          })}
        </div>

        {/* Progress Stepper */}
        <div className="mx-auto mb-8 max-w-3xl sm:mb-12">
          <ProgressStepper
            steps={BOOKING_STEPS}
            currentStep={currentStepIndex}
            variant="default"
            onStepClick={handleStepClick}
            className="px-4"
          />
        </div>

        <div className="grid items-start gap-6 md:gap-8 lg:grid-cols-[1fr_350px] lg:gap-12">
          {/* Main Content Area */}
          <div className="relative min-h-[400px] overflow-hidden rounded-2xl border border-white/50 bg-white/70 p-6 shadow-2xl shadow-[var(--shadow-color)]/50 backdrop-blur-xl sm:min-h-[500px] sm:rounded-[3rem] md:p-12">
            {/* Background Decorations */}
            <div className="bg-[var(--primary)]/5 absolute -right-24 -top-24 h-64 w-64 rounded-full blur-3xl"></div>
            <div className="bg-[var(--primary)]/5 absolute -bottom-24 -left-24 h-64 w-64 rounded-full blur-3xl"></div>

            {/* Step 1: Service Selection */}
            {step === 'service' && (
              <ErrorBoundary>
                <ServiceSelection />
              </ErrorBoundary>
            )}

            {/* Step 2: Pet Selection */}
            {step === 'pet' && (
              <ErrorBoundary>
                <PetSelection />
              </ErrorBoundary>
            )}

            {/* Step 3: Confirmation (no datetime step - clinic will contact) */}
            {step === 'confirm' && (
              <ErrorBoundary>
                <Confirmation />
              </ErrorBoundary>
            )}
          </div>

          {/* Sidebar Summary */}
          <ErrorBoundary>
            <BookingSummary
              labels={{
                summary: t('summary.title'),
                service: t('summary.service'),
                services: t('summary.services'),
                patient: t('summary.patient'),
                schedule: t('summary.schedule'),
                notSelected: t('summary.notSelected'),
                toDefine: t('summary.toSchedule'),
                estimatedTotal: t('summary.estimatedTotal'),
              }}
            />
          </ErrorBoundary>
        </div>
      </div>
    </QueryClientProvider>
  )
}
