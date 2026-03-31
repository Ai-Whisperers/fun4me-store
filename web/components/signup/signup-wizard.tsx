'use client'

/**
 * SignupWizard - Multi-step clinic registration wizard
 *
 * Orchestrates the 5-step signup flow:
 * 1. Clinic Info
 * 2. Contact Details
 * 3. Admin Account
 * 4. Branding
 * 5. Confirmation
 */

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Loader2, CheckCircle2 } from 'lucide-react'
import { ClinicInfoStep } from './steps/clinic-info-step'
import { ContactStep } from './steps/contact-step'
import { AdminAccountStep } from './steps/admin-account-step'
import { BrandingStep } from './steps/branding-step'
import { ConfirmationStep } from './steps/confirmation-step'
import { validateStep } from '@/lib/signup/schema'
import type { SignupFormData, WizardStep, SignupResponse, SignupErrorResponse } from '@/lib/signup/types'

// ============================================================================
// Types
// ============================================================================

interface WizardStepConfig {
  id: WizardStep
  label: string
  shortLabel: string
}

const STEPS: WizardStepConfig[] = [
  { id: 1, label: 'Informacion de la Clinica', shortLabel: 'Clinica' },
  { id: 2, label: 'Datos de Contacto', shortLabel: 'Contacto' },
  { id: 3, label: 'Cuenta de Administrador', shortLabel: 'Cuenta' },
  { id: 4, label: 'Personalizacion', shortLabel: 'Marca' },
  { id: 5, label: 'Confirmacion', shortLabel: 'Confirmar' },
]

const INITIAL_DATA: SignupFormData = {
  clinicName: '',
  slug: '',
  ruc: null,
  email: '',
  phone: '',
  whatsapp: '595',
  address: '',
  city: '',
  adminEmail: '',
  adminPassword: '',
  adminFullName: '',
  referralCode: null,
  logoUrl: null,
  primaryColor: '#3B82F6',
  secondaryColor: '#10B981',
}

// ============================================================================
// Main Component
// ============================================================================

export function SignupWizard() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<WizardStep>(1)
  const [formData, setFormData] = useState<SignupFormData>(INITIAL_DATA)
  const [errors, setErrors] = useState<Partial<Record<keyof SignupFormData, string>>>({})
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Update a field in the form data
   
  const handleFieldChange = useCallback(
    (field: keyof SignupFormData, value: SignupFormData[keyof SignupFormData]) => {
      setFormData((prev) => ({ ...prev, [field]: value }))
      // Clear error for this field when user types
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
      setSubmitError(null)
    },
    []
  )

  // Get data subset for current step
  const getStepData = useCallback(
    (step: WizardStep): Record<string, unknown> => {
      switch (step) {
        case 1:
          return {
            clinicName: formData.clinicName,
            slug: formData.slug,
            ruc: formData.ruc,
          }
        case 2:
          return {
            email: formData.email,
            phone: formData.phone,
            whatsapp: formData.whatsapp,
            address: formData.address,
            city: formData.city,
          }
        case 3:
          return {
            adminEmail: formData.adminEmail,
            adminPassword: formData.adminPassword,
            adminFullName: formData.adminFullName,
            referralCode: formData.referralCode,
          }
        case 4:
          return {
            logoUrl: formData.logoUrl,
            primaryColor: formData.primaryColor,
            secondaryColor: formData.secondaryColor,
          }
        default:
          return {}
      }
    },
    [formData]
  )

  // Validate current step
  const validateCurrentStep = useCallback((): boolean => {
    const stepData = getStepData(currentStep)
    const result = validateStep(currentStep, stepData)

    if (!result.success) {
      setErrors(result.errors)
      return false
    }

    setErrors({})
    return true
  }, [currentStep, getStepData])

  // Navigate to next step
  const handleNext = useCallback(() => {
    if (currentStep === 5) return

    // Skip validation for step 4 (branding is optional)
    if (currentStep !== 4 && !validateCurrentStep()) {
      return
    }

    setCurrentStep((prev) => (prev + 1) as WizardStep)
  }, [currentStep, validateCurrentStep])

  // Navigate to previous step
  const handleBack = useCallback(() => {
    if (currentStep === 1) return
    setCurrentStep((prev) => (prev - 1) as WizardStep)
  }, [currentStep])

  // Jump to specific step (for editing from confirmation)
  const handleGoToStep = useCallback((step: number) => {
    setCurrentStep(step as WizardStep)
  }, [])

  // Submit the form
  const handleSubmit = useCallback(async () => {
    if (!termsAccepted) {
      setSubmitError('Debes aceptar los terminos de servicio')
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data: SignupResponse | SignupErrorResponse = await response.json()

      if (!response.ok || !data.success) {
        const errorData = data as SignupErrorResponse
        setSubmitError(errorData.error)

        // If error is for a specific field, go to that step
        if (errorData.field) {
          const fieldStepMap: Record<string, WizardStep> = {
            clinicName: 1,
            slug: 1,
            ruc: 1,
            email: 2,
            phone: 2,
            whatsapp: 2,
            address: 2,
            city: 2,
            adminEmail: 3,
            adminPassword: 3,
            adminFullName: 3,
            logoUrl: 4,
            primaryColor: 4,
            secondaryColor: 4,
          }
          const targetStep = fieldStepMap[errorData.field]
          if (targetStep) {
            setCurrentStep(targetStep)
            setErrors({ [errorData.field]: errorData.error })
          }
        }
        return
      }

      // Success! Redirect to dashboard
      const successData = data as SignupResponse
      router.push(successData.redirectUrl)
    } catch (error) {
      console.error('Signup error:', error)
      setSubmitError('Error de conexion. Por favor intenta nuevamente.')
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, termsAccepted, router])

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white py-8 px-4">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Registra tu Clinica</h1>
          <p className="mt-2 text-gray-600">
            Crea tu cuenta y comienza a gestionar tu clinica veterinaria en minutos
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                {/* Step Circle */}
                <div
                  className={`
                    flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-colors
                    ${currentStep > step.id
                      ? 'bg-green-500 text-white'
                      : currentStep === step.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }
                  `}
                >
                  {currentStep > step.id ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    step.id
                  )}
                </div>

                {/* Connector Line */}
                {index < STEPS.length - 1 && (
                  <div
                    className={`
                      mx-2 h-1 w-8 rounded sm:w-16 md:w-24 transition-colors
                      ${currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'}
                    `}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step Labels (desktop only) */}
          <div className="mt-2 hidden sm:flex items-center justify-between">
            {STEPS.map((step) => (
              <span
                key={step.id}
                className={`text-xs ${currentStep === step.id ? 'text-blue-600 font-medium' : 'text-gray-500'}`}
              >
                {step.shortLabel}
              </span>
            ))}
          </div>
        </div>

        {/* Form Card */}
        <div className="rounded-2xl bg-white p-6 shadow-lg sm:p-8">
          {/* Step Content */}
          <div className="min-h-[400px]">
            {currentStep === 1 && (
              <ClinicInfoStep
                data={{
                  clinicName: formData.clinicName,
                  slug: formData.slug,
                  ruc: formData.ruc,
                }}
                errors={errors}
                onChange={handleFieldChange}
                disabled={isSubmitting}
              />
            )}

            {currentStep === 2 && (
              <ContactStep
                data={{
                  email: formData.email,
                  phone: formData.phone,
                  whatsapp: formData.whatsapp,
                  address: formData.address,
                  city: formData.city,
                }}
                errors={errors}
                onChange={handleFieldChange}
                disabled={isSubmitting}
              />
            )}

            {currentStep === 3 && (
              <AdminAccountStep
                data={{
                  adminEmail: formData.adminEmail,
                  adminPassword: formData.adminPassword,
                  adminFullName: formData.adminFullName,
                  referralCode: formData.referralCode,
                }}
                errors={errors}
                onChange={handleFieldChange}
                disabled={isSubmitting}
              />
            )}

            {currentStep === 4 && (
              <BrandingStep
                data={{
                  logoUrl: formData.logoUrl,
                  primaryColor: formData.primaryColor,
                  secondaryColor: formData.secondaryColor,
                }}
                slug={formData.slug}
                errors={errors}
                onChange={handleFieldChange}
                disabled={isSubmitting}
              />
            )}

            {currentStep === 5 && (
              <ConfirmationStep
                data={formData}
                termsAccepted={termsAccepted}
                onTermsChange={setTermsAccepted}
                onEditStep={handleGoToStep}
                disabled={isSubmitting}
              />
            )}
          </div>

          {/* Error Message */}
          {submitError && (
            <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
              {submitError}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-6">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 1 || isSubmitting}
              className={`
                flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors
                ${currentStep === 1 || isSubmitting
                  ? 'cursor-not-allowed text-gray-300'
                  : 'text-gray-600 hover:bg-gray-100'
                }
              `}
            >
              <ChevronLeft className="h-4 w-4" />
              Atras
            </button>

            {currentStep < 5 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !termsAccepted}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-400"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    Crear Clinica
                    <CheckCircle2 className="h-4 w-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-gray-500">
          ¿Ya tienes cuenta? Ve a tu clínica (ej: vetic.app/tu-clinica) e{' '}
          <span className="text-blue-600">inicia sesión desde ahí</span>
        </p>
      </div>
    </div>
  )
}
