'use client'

/**
 * Ambassador Registration Form
 *
 * Allows students, assistants, and teachers to register as ambassadors.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Gift, User, Mail, Phone, GraduationCap, Building, Loader2, CheckCircle } from 'lucide-react'

type AmbassadorType = 'student' | 'assistant' | 'teacher' | 'other'

interface FormData {
  fullName: string
  email: string
  phone: string
  password: string
  confirmPassword: string
  type: AmbassadorType
  university: string
  institution: string
}

export function AmbassadorRegisterForm() {
  const router = useRouter()
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    type: 'student',
    university: '',
    institution: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch('/api/ambassador', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          type: formData.type,
          university: formData.university || undefined,
          institution: formData.institution || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al registrar')
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-green-200 bg-green-50 p-8 text-center">
        <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
        <h2 className="mt-4 text-2xl font-bold text-green-800">¡Registro Exitoso!</h2>
        <p className="mt-2 text-green-700">
          Tu cuenta ha sido creada. Revisaremos tu solicitud y te enviaremos un email cuando sea aprobada.
        </p>
        <p className="mt-4 text-sm text-green-600">
          Revisa tu bandeja de entrada para verificar tu email.
        </p>
        <button
          onClick={() => router.push('/ambassador/login')}
          className="mt-6 rounded-lg bg-green-600 px-6 py-3 font-medium text-white hover:bg-green-700"
        >
          Ir a Iniciar Sesión
        </button>
      </div>
    )
  }

  const typeLabels: Record<AmbassadorType, string> = {
    student: 'Estudiante de Veterinaria',
    assistant: 'Asistente/Técnico en Clínica',
    teacher: 'Profesor/Docente',
    other: 'Otro',
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <Gift className="h-8 w-8 text-emerald-600" />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-gray-900">Conviértete en Embajador</h2>
        <p className="mt-2 text-gray-600">
          Gana comisiones refiriendo veterinarias a Vetic
        </p>
      </div>

      {/* Benefits */}
      <div className="rounded-lg bg-emerald-50 p-4">
        <h3 className="font-medium text-emerald-800">Beneficios del programa:</h3>
        <ul className="mt-2 space-y-1 text-sm text-emerald-700">
          <li>✓ Plan Professional gratis de por vida</li>
          <li>✓ 30-50% de comisión por cada clínica que se suscriba</li>
          <li>✓ Sin límite de referidos</li>
          <li>✓ Pagos mensuales directos a tu cuenta</li>
        </ul>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Personal Info */}
      <div className="space-y-4">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
            Nombre Completo
          </label>
          <div className="relative mt-1">
            <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="Tu nombre completo"
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <div className="relative mt-1">
            <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="tu@email.com"
            />
          </div>
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
            Teléfono/WhatsApp
          </label>
          <div className="relative mt-1">
            <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="+595 981 123 456"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Contraseña
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={6}
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="Mínimo 6 caracteres"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
            Confirmar Contraseña
          </label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="Repetir contraseña"
          />
        </div>
      </div>

      {/* Ambassador Type */}
      <div className="space-y-4">
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700">
            ¿Cuál es tu rol?
          </label>
          <select
            id="type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {Object.entries(typeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {(formData.type === 'student' || formData.type === 'teacher') && (
          <div>
            <label htmlFor="university" className="block text-sm font-medium text-gray-700">
              Universidad / Instituto
            </label>
            <div className="relative mt-1">
              <GraduationCap className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                id="university"
                name="university"
                value={formData.university}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="Ej: Universidad Nacional de Asunción"
              />
            </div>
          </div>
        )}

        {formData.type === 'assistant' && (
          <div>
            <label htmlFor="institution" className="block text-sm font-medium text-gray-700">
              Clínica / Institución donde trabajás
            </label>
            <div className="relative mt-1">
              <Building className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                id="institution"
                name="institution"
                value={formData.institution}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="Nombre de la clínica"
              />
            </div>
          </div>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3 font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Registrando...
          </>
        ) : (
          <>
            <Gift className="h-5 w-5" />
            Registrarme como Embajador
          </>
        )}
      </button>

      <p className="text-center text-xs text-gray-500">
        Al registrarte, aceptás nuestros{' '}
        <a href="/terms" className="text-emerald-600 hover:underline">
          Términos y Condiciones
        </a>{' '}
        del programa de embajadores.
      </p>
    </form>
  )
}

export default AmbassadorRegisterForm
