'use client'

/**
 * Vaccine Registration Form Component
 *
 * RES-001: Migrated to React Query for data fetching
 * - Replaced useEffect+Supabase with useQuery hook
 * - Replaced manual mutation with useMutation hook
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Syringe, Calendar, PawPrint, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { staleTimes, gcTimes } from '@/lib/queries/utils'

interface Pet {
  id: string
  name: string
  species: string
  owner_id: string
  profiles?: {
    full_name: string
  }
}

interface VaccineRegistrationFormProps {
  clinic: string
  preselectedPetId?: string
  onSuccess?: () => void
  onCancel?: () => void
}

const VACCINE_OPTIONS = [
  { value: 'Rabia', label: 'Antirrábica' },
  { value: 'Parvovirus', label: 'Parvovirus' },
  { value: 'Moquillo', label: 'Moquillo (Distemper)' },
  { value: 'Hepatitis', label: 'Hepatitis' },
  { value: 'Leptospirosis', label: 'Leptospirosis' },
  { value: 'Bordetella', label: 'Bordetella (Tos de las perreras)' },
  { value: 'Triple Felina', label: 'Triple Felina' },
  { value: 'Leucemia Felina', label: 'Leucemia Felina (FeLV)' },
  { value: 'Polivalente Canina', label: 'Polivalente Canina' },
  { value: 'Polivalente Felina', label: 'Polivalente Felina' },
  { value: 'Otra', label: 'Otra' },
]

export function VaccineRegistrationForm({
  clinic,
  preselectedPetId,
  onSuccess,
  onCancel,
}: VaccineRegistrationFormProps): React.ReactElement {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Form state
  const [selectedPetId, setSelectedPetId] = useState(preselectedPetId || '')
  const [vaccineName, setVaccineName] = useState('')
  const [customVaccineName, setCustomVaccineName] = useState('')
  const [administeredDate, setAdministeredDate] = useState(new Date().toISOString().split('T')[0])
  const [nextDueDate, setNextDueDate] = useState('')
  const [batchNumber, setBatchNumber] = useState('')
  const [manufacturer, setManufacturer] = useState('')
  const [notes, setNotes] = useState('')

  // React Query: Fetch pets
  const { data: pets = [], isLoading: loading } = useQuery({
    queryKey: ['pets', clinic, 'for-vaccine'],
    queryFn: async (): Promise<Pet[]> => {
      const supabase = createClient()

      const { data, error: fetchError } = await supabase
        .from('pets')
        .select('id, name, species, owner_id, profiles!pets_owner_id_fkey(full_name)')
        .eq('tenant_id', clinic)
        .order('name')

      if (fetchError) {
        throw new Error('Error al cargar mascotas')
      }

      return (data || []) as unknown as Pet[]
    },
    staleTime: staleTimes.MEDIUM,
    gcTime: gcTimes.MEDIUM,
  })

  // Auto-calculate next due date based on vaccine type
  const handleVaccineChange = (vaccine: string): void => {
    setVaccineName(vaccine)

    // Set default next due date based on vaccine type
    if (administeredDate) {
      const adminDate = new Date(administeredDate)
      let monthsToAdd = 12 // Default 1 year

      if (vaccine === 'Rabia') {
        monthsToAdd = 12 // 1 year for rabies
      } else if (vaccine.includes('Polivalente') || vaccine === 'Triple Felina') {
        monthsToAdd = 12 // 1 year
      } else if (vaccine === 'Bordetella') {
        monthsToAdd = 6 // 6 months
      }

      const nextDate = new Date(adminDate)
      nextDate.setMonth(nextDate.getMonth() + monthsToAdd)
      setNextDueDate(nextDate.toISOString().split('T')[0])
    }
  }

  // Mutation: Register vaccine
  const registerMutation = useMutation({
    mutationFn: async (params: {
      clinic: string
      petId: string
      vaccineName: string
      customVaccineName: string
      administeredDate: string
      nextDueDate: string
      batchNumber: string
      manufacturer: string
      notes: string
    }) => {
      const supabase = createClient()

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('No autorizado')
      }

      const finalVaccineName = params.vaccineName === 'Otra' ? params.customVaccineName : params.vaccineName

      if (!finalVaccineName) {
        throw new Error('Debe especificar el nombre de la vacuna')
      }

      // Create vaccine record
      const { error: insertError } = await supabase.from('vaccines').insert({
        tenant_id: params.clinic,
        pet_id: params.petId,
        vaccine_name: finalVaccineName,
        administered_date: params.administeredDate,
        next_due_date: params.nextDueDate || null,
        batch_number: params.batchNumber || null,
        manufacturer: params.manufacturer || null,
        notes: params.notes || null,
        administered_by: user.id,
        status: 'verified',
      })

      if (insertError) {
        throw new Error('Error al registrar la vacuna')
      }
    },
    onSuccess: () => {
      setSuccess(true)
      router.refresh()

      // Auto-close after success
      setTimeout(() => {
        onSuccess?.()
      }, 1500)
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Error al registrar vacuna')
    },
  })

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    setError(null)

    registerMutation.mutate({
      clinic,
      petId: selectedPetId,
      vaccineName,
      customVaccineName,
      administeredDate,
      nextDueDate,
      batchNumber,
      manufacturer,
      notes,
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    )
  }

  if (success) {
    return (
      <div className="py-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--status-success-bg)]">
          <CheckCircle className="h-8 w-8 text-[var(--status-success)]" />
        </div>
        <h2 className="mb-2 text-xl font-bold text-[var(--status-success-text)]">Vacuna Registrada</h2>
        <p className="text-[var(--status-success-text)]">La vacuna ha sido registrada exitosamente.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-[var(--status-error-border)] bg-[var(--status-error-bg)] p-4 text-sm text-[var(--status-error-text)]">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Pet Selection */}
      <div className="space-y-4">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-400">
          <PawPrint className="h-4 w-4" />
          Paciente
        </h3>

        <div>
          <label htmlFor="petId" className="mb-1 block text-sm font-medium text-gray-600">
            Mascota *
          </label>
          <select
            id="petId"
            value={selectedPetId}
            onChange={(e) => setSelectedPetId(e.target.value)}
            required
            className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[var(--primary)] focus:ring-2"
          >
            <option value="">Seleccionar mascota...</option>
            {pets.map((pet) => {
              const ownerName = pet.profiles
                ? Array.isArray(pet.profiles)
                  ? pet.profiles[0]?.full_name
                  : pet.profiles.full_name
                : ''
              return (
                <option key={pet.id} value={pet.id}>
                  {pet.name} ({pet.species}) {ownerName ? `- ${ownerName}` : ''}
                </option>
              )
            })}
          </select>
        </div>
      </div>

      {/* Vaccine Info */}
      <div className="space-y-4">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-400">
          <Syringe className="h-4 w-4" />
          Información de la Vacuna
        </h3>

        <div>
          <label htmlFor="vaccineName" className="mb-1 block text-sm font-medium text-gray-600">
            Vacuna *
          </label>
          <select
            id="vaccineName"
            value={vaccineName}
            onChange={(e) => handleVaccineChange(e.target.value)}
            required
            className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[var(--primary)] focus:ring-2"
          >
            <option value="">Seleccionar vacuna...</option>
            {VACCINE_OPTIONS.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </select>
        </div>

        {vaccineName === 'Otra' && (
          <div>
            <label
              htmlFor="customVaccineName"
              className="mb-1 block text-sm font-medium text-gray-600"
            >
              Nombre de la Vacuna *
            </label>
            <input
              id="customVaccineName"
              type="text"
              value={customVaccineName}
              onChange={(e) => setCustomVaccineName(e.target.value)}
              required
              placeholder="Nombre de la vacuna"
              className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[var(--primary)] focus:ring-2"
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="administeredDate"
              className="mb-1 block text-sm font-medium text-gray-600"
            >
              Fecha de Aplicación *
            </label>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
              <input
                id="administeredDate"
                type="date"
                value={administeredDate}
                onChange={(e) => setAdministeredDate(e.target.value)}
                required
                className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 py-3 pl-12 pr-4 outline-none focus:border-[var(--primary)] focus:ring-2"
              />
            </div>
          </div>

          <div>
            <label htmlFor="nextDueDate" className="mb-1 block text-sm font-medium text-gray-600">
              Próxima Dosis
            </label>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
              <input
                id="nextDueDate"
                type="date"
                value={nextDueDate}
                onChange={(e) => setNextDueDate(e.target.value)}
                className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 py-3 pl-12 pr-4 outline-none focus:border-[var(--primary)] focus:ring-2"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="batchNumber" className="mb-1 block text-sm font-medium text-gray-600">
              Número de Lote
            </label>
            <input
              id="batchNumber"
              type="text"
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
              placeholder="ABC123"
              className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[var(--primary)] focus:ring-2"
            />
          </div>

          <div>
            <label htmlFor="manufacturer" className="mb-1 block text-sm font-medium text-gray-600">
              Fabricante
            </label>
            <input
              id="manufacturer"
              type="text"
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
              placeholder="Laboratorio"
              className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[var(--primary)] focus:ring-2"
            />
          </div>
        </div>

        <div>
          <label htmlFor="notes" className="mb-1 block text-sm font-medium text-gray-600">
            Notas
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Observaciones adicionales..."
            className="focus:ring-[var(--primary)]/20 w-full resize-none rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[var(--primary)] focus:ring-2"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 border-t border-gray-100 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={registerMutation.isPending}
          className="flex-1 rounded-xl px-4 py-3 font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={registerMutation.isPending || !selectedPetId || !vaccineName}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-3 font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {registerMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Registrando...
            </>
          ) : (
            <>
              <Syringe className="h-4 w-4" />
              Registrar Vacuna
            </>
          )}
        </button>
      </div>
    </form>
  )
}
