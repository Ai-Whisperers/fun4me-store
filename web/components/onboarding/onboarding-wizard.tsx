'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2,
  Dog,
  Bell,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  PawPrint,
  Mail,
  Check,
} from 'lucide-react'
import { PhotoUpload } from '@/components/pets/photo-upload'

interface OnboardingWizardProps {
  clinic: string
  userEmail?: string
  userName?: string
}

type Step = 'welcome' | 'add-pet' | 'preferences' | 'complete'

interface PetData {
  name: string
  species: 'dog' | 'cat'
  breed: string
  photo?: File
}

interface Preferences {
  vaccineReminders: boolean
  appointmentReminders: boolean
  promotions: boolean
}

export function OnboardingWizard({
  clinic,
  userEmail,
  userName,
}: OnboardingWizardProps): React.ReactElement {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<Step>('welcome')
  const [petData, setPetData] = useState<PetData>({
    name: '',
    species: 'dog',
    breed: '',
  })
  const [preferences, setPreferences] = useState<Preferences>({
    vaccineReminders: true,
    appointmentReminders: true,
    promotions: false,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const steps: { id: Step; label: string; icon: React.ReactNode }[] = [
    { id: 'welcome', label: 'Bienvenida', icon: <Sparkles className="h-5 w-5" /> },
    { id: 'add-pet', label: 'Tu Mascota', icon: <PawPrint className="h-5 w-5" /> },
    { id: 'preferences', label: 'Preferencias', icon: <Bell className="h-5 w-5" /> },
    { id: 'complete', label: 'Listo', icon: <CheckCircle2 className="h-5 w-5" /> },
  ]

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep)

  const goNext = useCallback(() => {
    const nextIndex = currentStepIndex + 1
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id)
    }
  }, [currentStepIndex, steps])

  const goBack = useCallback(() => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id)
    }
  }, [currentStepIndex, steps])

  const handleComplete = useCallback(async () => {
    setIsSubmitting(true)
    try {
      // Save pet if provided
      if (petData.name) {
        const formData = new FormData()
        formData.append('clinic', clinic)
        formData.append('name', petData.name)
        formData.append('species', petData.species)
        formData.append('breed', petData.breed)
        if (petData.photo) {
          formData.append('photo', petData.photo)
        }

        await fetch('/api/pets', {
          method: 'POST',
          body: formData,
        })
      }

      // Save preferences
      await fetch('/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinic,
          preferences,
        }),
      })

      // Mark onboarding as complete
      await fetch('/api/user/onboarding-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinic }),
      })

      setCurrentStep('complete')
    } catch (_error: unknown) {
      // Onboarding error - silently fail
    } finally {
      setIsSubmitting(false)
    }
  }, [clinic, petData, preferences])

  const goToDashboard = useCallback(() => {
    router.push(`/${clinic}/portal/dashboard`)
  }, [clinic, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--bg-subtle)] to-white">
      <div className="container mx-auto max-w-2xl px-4 py-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full transition-all ${
                    index <= currentStepIndex
                      ? 'bg-[var(--primary)] text-white'
                      : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'
                  }`}
                >
                  {index < currentStepIndex ? <Check className="h-5 w-5" /> : step.icon}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`mx-2 h-1 w-12 rounded transition-colors md:w-20 ${
                      index < currentStepIndex ? 'bg-[var(--primary)]' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-500">
            Paso {currentStepIndex + 1} de {steps.length}
          </p>
        </div>

        {/* Step Content */}
        <div className="rounded-3xl bg-white p-8 shadow-xl">
          {/* Welcome Step */}
          {currentStep === 'welcome' && (
            <div className="space-y-6 text-center">
              <div className="bg-[var(--primary)]/10 mx-auto flex h-20 w-20 items-center justify-center rounded-full">
                <Sparkles className="h-10 w-10 text-[var(--primary)]" />
              </div>
              <h1 className="text-3xl font-black text-[var(--text-primary)]">
                ¡Bienvenido{userName ? `, ${userName}` : ''}!
              </h1>
              <p className="mx-auto max-w-md text-gray-600">
                Estamos felices de tenerte aquí. Vamos a configurar tu cuenta en solo unos pasos
                para que puedas aprovechar todas las funciones.
              </p>
              {userEmail && (
                <div className="inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-sm text-green-700">
                  <Mail className="h-4 w-4" />
                  {userEmail}
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              )}
              <button
                onClick={goNext}
                className="mx-auto flex w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-4 font-bold text-white shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                Comenzar
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* Add Pet Step */}
          {currentStep === 'add-pet' && (
            <div className="space-y-6">
              <div className="mb-8 text-center">
                <h2 className="text-2xl font-black text-[var(--text-primary)]">
                  Cuéntanos sobre tu mascota
                </h2>
                <p className="mt-2 text-gray-500">Puedes agregar más mascotas después</p>
              </div>

              {/* Photo Upload */}
              <PhotoUpload
                name="pet-photo"
                onFileSelect={(file) => setPetData((p) => ({ ...p, photo: file }))}
                onFileRemove={() => setPetData((p) => ({ ...p, photo: undefined }))}
                placeholder="Foto de mascota"
                shape="circle"
                size={120}
              />

              {/* Species Selection */}
              <div className="flex justify-center gap-4">
                <button
                  type="button"
                  onClick={() => setPetData((p) => ({ ...p, species: 'dog' }))}
                  className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition-all ${
                    petData.species === 'dog'
                      ? 'bg-[var(--primary)]/5 border-[var(--primary)]'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Dog
                    className={`h-8 w-8 ${petData.species === 'dog' ? 'text-[var(--primary)]' : 'text-gray-400'}`}
                  />
                  <span
                    className={`font-bold ${petData.species === 'dog' ? 'text-[var(--primary)]' : 'text-gray-600'}`}
                  >
                    Perro
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setPetData((p) => ({ ...p, species: 'cat' }))}
                  className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition-all ${
                    petData.species === 'cat'
                      ? 'bg-[var(--primary)]/5 border-[var(--primary)]'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <PawPrint
                    className={`h-8 w-8 ${petData.species === 'cat' ? 'text-[var(--primary)]' : 'text-gray-400'}`}
                  />
                  <span
                    className={`font-bold ${petData.species === 'cat' ? 'text-[var(--primary)]' : 'text-gray-600'}`}
                  >
                    Gato
                  </span>
                </button>
              </div>

              {/* Name & Breed */}
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-600">
                    Nombre de tu mascota
                  </label>
                  <input
                    type="text"
                    value={petData.name}
                    onChange={(e) => setPetData((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Ej: Firulais"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[var(--primary)]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-600">
                    Raza (opcional)
                  </label>
                  <input
                    type="text"
                    value={petData.breed}
                    onChange={(e) => setPetData((p) => ({ ...p, breed: e.target.value }))}
                    placeholder="Ej: Golden Retriever"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[var(--primary)]"
                  />
                </div>
              </div>

              {/* Navigation */}
              <div className="flex gap-4 pt-4">
                <button
                  onClick={goBack}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 px-6 py-4 font-bold text-gray-600 transition-colors hover:bg-gray-50"
                >
                  <ArrowLeft className="h-5 w-5" />
                  Atrás
                </button>
                <button
                  onClick={goNext}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-4 font-bold text-white shadow-lg transition-all hover:shadow-xl"
                >
                  {petData.name ? 'Continuar' : 'Saltar'}
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {/* Preferences Step */}
          {currentStep === 'preferences' && (
            <div className="space-y-6">
              <div className="mb-8 text-center">
                <h2 className="text-2xl font-black text-[var(--text-primary)]">
                  Configura tus notificaciones
                </h2>
                <p className="mt-2 text-gray-500">Elige qué información quieres recibir</p>
              </div>

              <div className="space-y-4">
                <label className="flex cursor-pointer items-center justify-between rounded-xl bg-gray-50 p-4 transition-colors hover:bg-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                      <Bell className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">Recordatorios de vacunas</p>
                      <p className="text-sm text-gray-500">
                        Te avisamos cuando una vacuna está por vencer
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.vaccineReminders}
                    onChange={(e) =>
                      setPreferences((p) => ({ ...p, vaccineReminders: e.target.checked }))
                    }
                    className="h-6 w-6 rounded text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                </label>

                <label className="flex cursor-pointer items-center justify-between rounded-xl bg-gray-50 p-4 transition-colors hover:bg-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">Recordatorios de citas</p>
                      <p className="text-sm text-gray-500">
                        Confirmaciones y recordatorios de tus citas
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.appointmentReminders}
                    onChange={(e) =>
                      setPreferences((p) => ({ ...p, appointmentReminders: e.target.checked }))
                    }
                    className="h-6 w-6 rounded text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                </label>

                <label className="flex cursor-pointer items-center justify-between rounded-xl bg-gray-50 p-4 transition-colors hover:bg-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                      <Sparkles className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">Ofertas y promociones</p>
                      <p className="text-sm text-gray-500">Descuentos exclusivos y novedades</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.promotions}
                    onChange={(e) =>
                      setPreferences((p) => ({ ...p, promotions: e.target.checked }))
                    }
                    className="h-6 w-6 rounded text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                </label>
              </div>

              {/* Navigation */}
              <div className="flex gap-4 pt-4">
                <button
                  onClick={goBack}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 px-6 py-4 font-bold text-gray-600 transition-colors hover:bg-gray-50"
                >
                  <ArrowLeft className="h-5 w-5" />
                  Atrás
                </button>
                <button
                  onClick={handleComplete}
                  disabled={isSubmitting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-4 font-bold text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-50"
                >
                  {isSubmitting ? 'Guardando...' : 'Finalizar'}
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {/* Complete Step */}
          {currentStep === 'complete' && (
            <div className="space-y-6 py-8 text-center">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
              <h2 className="text-3xl font-black text-[var(--text-primary)]">¡Todo listo!</h2>
              <p className="mx-auto max-w-md text-gray-600">
                Tu cuenta está configurada. Ahora puedes explorar todas las funciones del portal de
                mascotas.
              </p>

              <div className="bg-[var(--primary)]/5 mx-auto max-w-sm rounded-2xl p-6 text-left">
                <h3 className="mb-3 font-bold text-[var(--primary)]">Próximos pasos:</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Agendar tu primera cita
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Completar el perfil de tu mascota
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Explorar nuestra tienda
                  </li>
                </ul>
              </div>

              <button
                onClick={goToDashboard}
                className="mx-auto flex w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-4 font-bold text-white shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                Ir al Dashboard
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
