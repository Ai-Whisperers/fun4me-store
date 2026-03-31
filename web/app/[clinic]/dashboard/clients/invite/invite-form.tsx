'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { inviteClient } from '@/app/actions/invite-client'
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
  MessageCircle,
} from 'lucide-react'
import type { ClinicConfig } from '@/lib/clinics'

interface Props {
  clinic: string
  config: ClinicConfig
}

export default function InviteClientForm({ clinic, config }: Props) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(inviteClient, null)
  const [showPetSection, setShowPetSection] = useState(false)

  // Success redirect
  if (state?.success) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-green-800">Cliente Registrado</h2>
        <p className="mb-6 text-green-700">
          El cliente recibirá un correo para completar su cuenta. Puedes enviarle el enlace de
          registro por WhatsApp también.
        </p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <button
            onClick={() => router.push(`/${clinic}/dashboard/clients`)}
            className="rounded-xl bg-green-600 px-6 py-3 font-bold text-white transition-colors hover:bg-green-700"
          >
            Ver Directorio
          </button>
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl border-2 border-green-200 bg-white px-6 py-3 font-bold text-green-700 transition-colors hover:bg-green-50"
          >
            Agregar Otro Cliente
          </button>
        </div>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="clinic" value={clinic} />

      {/* Client Info Section */}
      <div className="rounded-2xl bg-[var(--bg-default)] p-6 shadow-md">
        <h2 className="mb-6 flex items-center gap-2 text-lg font-bold text-[var(--text-primary)]">
          <User className="h-5 w-5 text-[var(--primary)]" />
          Información del Cliente
        </h2>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="fullName"
              className="mb-1 block text-sm font-bold text-[var(--text-secondary)]"
            >
              Nombre Completo *
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              placeholder="Juan Pérez"
              className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition-all focus:border-[var(--primary)] focus:ring-2"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-bold text-[var(--text-secondary)]"
            >
              Correo Electrónico *
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="cliente@email.com"
                className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 py-3 pl-12 pr-4 outline-none transition-all focus:border-[var(--primary)] focus:ring-2"
              />
            </div>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              El cliente recibirá un correo para activar su cuenta
            </p>
          </div>

          <div>
            <label
              htmlFor="phone"
              className="mb-1 block text-sm font-bold text-[var(--text-secondary)]"
            >
              Teléfono / WhatsApp
            </label>
            <div className="relative">
              <Phone className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
              <input
                id="phone"
                name="phone"
                type="tel"
                placeholder="0981 123 456"
                className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 py-3 pl-12 pr-4 outline-none transition-all focus:border-[var(--primary)] focus:ring-2"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Pet Info Section (Collapsible) */}
      <div className="overflow-hidden rounded-2xl bg-[var(--bg-default)] shadow-md">
        <button
          type="button"
          onClick={() => setShowPetSection(!showPetSection)}
          className="flex w-full items-center justify-between p-6 transition-colors hover:bg-gray-50"
        >
          <div className="flex items-center gap-2">
            <PawPrint className="h-5 w-5 text-[var(--primary)]" />
            <span className="text-lg font-bold text-[var(--text-primary)]">
              Agregar Mascota (Opcional)
            </span>
          </div>
          {showPetSection ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </button>

        {showPetSection && (
          <div className="space-y-4 border-t border-gray-100 px-6 pb-6 pt-6">
            <p className="mb-4 text-sm text-[var(--text-secondary)]">
              Puedes agregar la mascota del cliente ahora o hacerlo después desde su perfil.
            </p>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="petName"
                  className="mb-1 block text-sm font-bold text-[var(--text-secondary)]"
                >
                  Nombre de la Mascota
                </label>
                <input
                  id="petName"
                  name="petName"
                  type="text"
                  placeholder="Max"
                  className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition-all focus:border-[var(--primary)] focus:ring-2"
                />
              </div>

              <div>
                <label
                  htmlFor="petSpecies"
                  className="mb-1 block text-sm font-bold text-[var(--text-secondary)]"
                >
                  Especie
                </label>
                <select
                  id="petSpecies"
                  name="petSpecies"
                  className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none transition-all focus:border-[var(--primary)] focus:ring-2"
                >
                  <option value="">Seleccionar...</option>
                  <option value="dog">Perro</option>
                  <option value="cat">Gato</option>
                  <option value="bird">Ave</option>
                  <option value="rabbit">Conejo</option>
                  <option value="rodent">Roedor</option>
                  <option value="reptile">Reptil</option>
                  <option value="fish">Pez</option>
                  <option value="other">Otro</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="petBreed"
                  className="mb-1 block text-sm font-bold text-[var(--text-secondary)]"
                >
                  Raza
                </label>
                <input
                  id="petBreed"
                  name="petBreed"
                  type="text"
                  placeholder="Golden Retriever"
                  className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition-all focus:border-[var(--primary)] focus:ring-2"
                />
              </div>

              <div>
                <label
                  htmlFor="petSex"
                  className="mb-1 block text-sm font-bold text-[var(--text-secondary)]"
                >
                  Sexo
                </label>
                <select
                  id="petSex"
                  name="petSex"
                  className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none transition-all focus:border-[var(--primary)] focus:ring-2"
                >
                  <option value="">Seleccionar...</option>
                  <option value="male">Macho</option>
                  <option value="female">Hembra</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="petWeight"
                  className="mb-1 block text-sm font-bold text-[var(--text-secondary)]"
                >
                  Peso (kg)
                </label>
                <input
                  id="petWeight"
                  name="petWeight"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="5.5"
                  className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition-all focus:border-[var(--primary)] focus:ring-2"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="petNotes"
                className="mb-1 block text-sm font-bold text-[var(--text-secondary)]"
              >
                Notas / Observaciones
              </label>
              <textarea
                id="petNotes"
                name="petNotes"
                rows={3}
                placeholder="Alergias, condiciones, temperamento, etc."
                className="focus:ring-[var(--primary)]/20 w-full resize-none rounded-xl border border-gray-200 px-4 py-3 outline-none transition-all focus:border-[var(--primary)] focus:ring-2"
              />
            </div>
          </div>
        )}
      </div>

      {/* WhatsApp Tip */}
      <div className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4">
        <MessageCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
        <div>
          <p className="text-sm font-medium text-green-800">Tip: Enviar enlace por WhatsApp</p>
          <p className="text-sm text-green-700">
            Después de registrar al cliente, puedes enviarle el enlace de registro directamente por
            WhatsApp para que active su cuenta más rápido.
          </p>
        </div>
      </div>

      {/* Error Message */}
      {state?.error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
          <p className="text-red-800">{state.error}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-4 font-bold text-white shadow-lg transition-all hover:opacity-90 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Registrando...
          </>
        ) : (
          <>
            <User className="h-5 w-5" />
            Registrar Cliente
          </>
        )}
      </button>
    </form>
  )
}
