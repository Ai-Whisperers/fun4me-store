'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  User,
  Mail,
  Phone,
  PawPrint,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useForm } from '@/hooks/use-form'
import { useMutation } from '@tanstack/react-query'
import { required, email, createValidator } from '@/lib/utils/validation'
import { ErrorBoundary } from '@/components/shared'

interface ClientInviteFormProps {
  clinic: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function ClientInviteForm({
  clinic,
  onSuccess,
  onCancel,
}: ClientInviteFormProps): React.ReactElement {
  const router = useRouter()
  const [success, setSuccess] = useState(false)
  const [showPetSection, setShowPetSection] = useState(false)

  // Form state management
  const form = useForm({
    initialValues: {
      fullName: '',
      email: '',
      phone: '',
      petName: '',
      petSpecies: 'dog',
      petBreed: '',
    },
    validationRules: {
      fullName: required('El nombre completo es requerido'),
      email: createValidator(
        required('El correo electrónico es requerido'),
        email('Correo electrónico inválido')
      ),
    },
  })

  // API call for creating client
  const {
    isPending: isSubmitting,
    error: submitError,
    mutateAsync: submitForm,
  } = useMutation({
    mutationFn: async () => {
      const supabase = createClient()

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('No autorizado')
      }

      // Check for existing email
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', form.values.email.toLowerCase())
        .eq('tenant_id', clinic)
        .single()

      if (existingProfile) {
        throw new Error('Ya existe un cliente con este correo electrónico')
      }

      // Create profile directly (for walk-in clients without auth)
      const { data: newProfile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          tenant_id: clinic,
          full_name: form.values.fullName,
          email: form.values.email.toLowerCase(),
          phone: form.values.phone || null,
          role: 'owner',
        })
        .select('id')
        .single()

      if (profileError) {
        // Client-side error logging - only in development
        if (process.env.NODE_ENV === 'development') {
          console.error('Profile creation error:', profileError)
        }
        throw new Error('Error al crear el perfil del cliente')
      }

      // Create pet if provided
      if (showPetSection && form.values.petName) {
        const { error: petError } = await supabase.from('pets').insert({
          tenant_id: clinic,
          owner_id: newProfile.id,
          name: form.values.petName,
          species: form.values.petSpecies,
          breed: form.values.petBreed || null,
        })

        if (petError) {
          // Client-side error logging - only in development
          if (process.env.NODE_ENV === 'development') {
            console.error('Pet creation error:', petError)
          }
          // Don't fail the whole operation if pet creation fails
        }
      }

      return newProfile
    },
  })

  const handleSubmit = form.handleSubmit(async () => {
    try {
      await submitForm()
      setSuccess(true)
      router.refresh()

      // Auto-close after success
      setTimeout(() => {
        onSuccess?.()
      }, 1500)
    } catch (_err) {
      // Error is handled by useMutation
    }
  })

  if (success) {
    return (
      <div className="py-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--status-success-bg)]">
          <CheckCircle className="h-8 w-8 text-[var(--status-success)]" />
        </div>
        <h2 className="mb-2 text-xl font-bold text-[var(--status-success-text)]">Cliente Registrado</h2>
        <p className="text-[var(--status-success-text)]">El cliente ha sido agregado exitosamente.</p>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* TICKET-FORM-005: Added role="alert" for accessibility */}
        {submitError && (
          <div
            role="alert"
            aria-live="assertive"
            id="form-error"
            className="flex items-start gap-2 rounded-xl border border-[var(--status-error-border)] bg-[var(--status-error-bg)] p-4 text-sm text-[var(--status-error-text)]"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <span>{submitError?.message || 'Error al registrar el cliente'}</span>
          </div>
        )}

        {/* Client Info */}
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-400">
            <User className="h-4 w-4" />
            Información del Cliente
          </h3>

          <div>
            <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-gray-600">
              Nombre Completo *
            </label>
            <input
              id="fullName"
              type="text"
              {...form.getFieldProps('fullName')}
              required
              placeholder="Juan Pérez"
              aria-invalid={submitError ? 'true' : 'false'}
              aria-describedby={submitError ? 'form-error' : undefined}
              className={`w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 ${
                form.getFieldProps('fullName').error
                  ? 'border-[var(--status-error-border)] focus:border-[var(--status-error)] focus:ring-[var(--status-error)]/20'
                  : 'focus:ring-[var(--primary)]/20 border-gray-200 focus:border-[var(--primary)]'
              }`}
            />
            {form.getFieldProps('fullName').error && (
              <p className="mt-1 text-xs text-[var(--status-error)]">{form.getFieldProps('fullName').error}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-600">
              Correo Electrónico *
            </label>
            <div className="relative">
              <Mail
                className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-gray-400"
                aria-hidden="true"
              />
              <input
                id="email"
                type="email"
                {...form.getFieldProps('email')}
                required
                placeholder="cliente@email.com"
                aria-invalid={submitError ? 'true' : 'false'}
                aria-describedby={submitError ? 'form-error' : undefined}
                className={`w-full rounded-xl border py-3 pl-12 pr-4 outline-none focus:ring-2 ${
                  form.getFieldProps('email').error
                    ? 'border-[var(--status-error-border)] focus:border-[var(--status-error)] focus:ring-[var(--status-error)]/20'
                    : 'focus:ring-[var(--primary)]/20 border-gray-200 focus:border-[var(--primary)]'
                }`}
              />
            </div>
            {form.getFieldProps('email').error && (
              <p className="mt-1 text-xs text-[var(--status-error)]">{form.getFieldProps('email').error}</p>
            )}
          </div>

          <div>
            <label htmlFor="phone" className="mb-1 block text-sm font-medium text-gray-600">
              Teléfono
            </label>
            <div className="relative">
              <Phone
                className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-gray-400"
                aria-hidden="true"
              />
              <input
                id="phone"
                type="tel"
                {...form.getFieldProps('phone')}
                placeholder="0981 123 456"
                aria-invalid="false"
                className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 py-3 pl-12 pr-4 outline-none focus:border-[var(--primary)] focus:ring-2"
              />
            </div>
          </div>
        </div>

        {/* Pet Section Toggle */}
        <button
          type="button"
          onClick={() => setShowPetSection(!showPetSection)}
          className="flex w-full items-center justify-between rounded-xl bg-gray-50 px-4 py-3 transition-colors hover:bg-gray-100"
        >
          <span className="flex items-center gap-2 font-medium text-gray-700">
            <PawPrint className="h-5 w-5 text-[var(--primary)]" />
            Agregar Mascota (opcional)
          </span>
          {showPetSection ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </button>

        {/* Pet Info */}
        {showPetSection && (
          <div className="space-y-4 rounded-xl bg-gray-50 p-4">
            <div>
              <label htmlFor="petName" className="mb-1 block text-sm font-medium text-gray-600">
                Nombre de la Mascota
              </label>
              <input
                id="petName"
                type="text"
                {...form.getFieldProps('petName')}
                placeholder="Max, Luna, etc."
                aria-invalid="false"
                className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-[var(--primary)] focus:ring-2"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="petSpecies"
                  className="mb-1 block text-sm font-medium text-gray-600"
                >
                  Especie
                </label>
                <select
                  id="petSpecies"
                  value={form.getFieldProps('petSpecies').value as string}
                  onChange={(e) => form.setValue('petSpecies', e.target.value)}
                  onBlur={() => form.setTouched('petSpecies')}
                  aria-invalid="false"
                  className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-[var(--primary)] focus:ring-2"
                >
                  <option value="dog">Perro</option>
                  <option value="cat">Gato</option>
                  <option value="bird">Ave</option>
                  <option value="rabbit">Conejo</option>
                  <option value="hamster">Hámster</option>
                  <option value="fish">Pez</option>
                  <option value="reptile">Reptil</option>
                  <option value="other">Otro</option>
                </select>
              </div>

              <div>
                <label htmlFor="petBreed" className="mb-1 block text-sm font-medium text-gray-600">
                  Raza
                </label>
                <input
                  id="petBreed"
                  type="text"
                  {...form.getFieldProps('petBreed')}
                  placeholder="Golden Retriever, etc."
                  aria-invalid="false"
                  className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-[var(--primary)] focus:ring-2"
                />
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 rounded-xl px-4 py-3 font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !form.isValid}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-3 font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <User className="h-4 w-4" />
                Registrar Cliente
              </>
            )}
          </button>
        </div>
      </form>
    </ErrorBoundary>
  )
}
