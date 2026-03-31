'use client'

import type { JSX } from 'react'
import { useState, useEffect } from 'react'
import { X, XCircle } from 'lucide-react'
import ProgressBar from './progress-bar'
import PetSearchStep from './pet-search-step'
import KennelSelectionStep from './kennel-selection-step'
import TreatmentPlanStep from './treatment-plan-step'
import type { Pet, Kennel, AdmissionFormData } from './types'

interface AdmissionFormProps {
  onSuccess: () => void
  onCancel: () => void
}

export default function AdmissionForm({ onSuccess, onCancel }: AdmissionFormProps): JSX.Element {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [kennels, setKennels] = useState<Kennel[]>([])
  const [formError, setFormError] = useState<string | null>(null)

  const [formData, setFormData] = useState<AdmissionFormData>({
    pet_id: '',
    kennel_id: '',
    hospitalization_type: 'medical',
    admission_diagnosis: '',
    treatment_plan: '',
    diet_instructions: '',
    acuity_level: 'routine',
    estimated_discharge_date: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
  })

  const [selectedPet, setSelectedPet] = useState<Pet | null>(null)
  const [selectedKennel, setSelectedKennel] = useState<Kennel | null>(null)

  useEffect(() => {
    fetchAvailableKennels()
  }, [])

  const fetchAvailableKennels = async (): Promise<void> => {
    try {
      const response = await fetch('/api/kennels?status=available')
      if (!response.ok) throw new Error('Error al cargar jaulas')
      const data = await response.json()
      setKennels(data)
    } catch (_error: unknown) {
      // Error fetching kennels - silently fail
    }
  }

  const handlePetSelect = (pet: Pet | null): void => {
    setSelectedPet(pet)
    if (pet) {
      setFormData((prev) => ({
        ...prev,
        pet_id: pet.id,
        emergency_contact_name: pet.owner?.full_name || '',
        emergency_contact_phone: pet.owner?.phone || '',
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        pet_id: '',
      }))
    }
  }

  const handleKennelSelect = (kennel: Kennel | null): void => {
    setSelectedKennel(kennel)
    setFormData((prev) => ({ ...prev, kennel_id: kennel?.id || '' }))
  }

  const handleFormDataChange = (data: Partial<AdmissionFormData>): void => {
    setFormData((prev) => ({ ...prev, ...data }))
  }

  const handleSubmit = async (): Promise<void> => {
    setLoading(true)
    setFormError(null)

    try {
      const response = await fetch('/api/hospitalizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al crear hospitalización')
      }

      onSuccess()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Error al crear hospitalización')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl rounded-lg bg-[var(--bg-default)] p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">Nueva Admisión</h2>
        <button onClick={onCancel} className="rounded-lg p-2 hover:bg-[var(--bg-secondary)]" aria-label="Cancelar admisión">
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {formError && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-6 rounded-lg border border-[var(--status-error-border)] bg-[var(--status-error-bg)] p-4"
        >
          <div className="flex items-center gap-3 text-[var(--status-error-text)]">
            <XCircle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            <p className="font-medium">{formError}</p>
            <button
              type="button"
              onClick={() => setFormError(null)}
              className="ml-auto hover:opacity-70"
              aria-label="Cerrar mensaje de error"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      <ProgressBar currentStep={step} totalSteps={3} />

      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSubmit()
        }}
        className="space-y-6"
      >
        {step === 1 && (
          <PetSearchStep
            selectedPet={selectedPet}
            onPetSelect={handlePetSelect}
            onNext={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <KennelSelectionStep
            kennels={kennels}
            selectedKennel={selectedKennel}
            onKennelSelect={handleKennelSelect}
            formData={formData}
            onFormDataChange={handleFormDataChange}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}

        {step === 3 && (
          <TreatmentPlanStep
            formData={formData}
            onFormDataChange={handleFormDataChange}
            onSubmit={handleSubmit}
            onBack={() => setStep(2)}
            loading={loading}
          />
        )}
      </form>
    </div>
  )
}
