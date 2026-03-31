'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  LandingNav,
  LandingFooter,
  FloatingWhatsApp,
} from '@/components/landing'
import {
  Check,
  Loader2,
  AlertCircle,
  Globe,
  Calendar,
  MessageCircle,
  Shield,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'
import { trialConfig, roiGuarantee } from '@/lib/pricing/tiers'

interface ClinicInfo {
  name: string
  type?: string
  zone?: string
  isPregenerated?: boolean
}

interface FormData {
  ownerName: string
  ownerEmail: string
  ownerPhone: string
  password: string
  confirmPassword: string
}

type ClaimStatus = 'loading' | 'available' | 'claimed' | 'not_found' | 'error'

export default function ReclamarPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const slug = searchParams.get('slug')

  const [status, setStatus] = useState<ClaimStatus>('loading')
  const [clinic, setClinic] = useState<ClinicInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    password: '',
    confirmPassword: '',
  })
  const [formErrors, setFormErrors] = useState<Partial<FormData>>({})

  // Check clinic availability on mount
  useEffect(() => {
    async function checkAvailability() {
      if (!slug) {
        setStatus('not_found')
        setError('No se especificó una clínica')
        return
      }

      try {
        const response = await fetch(`/api/claim?slug=${encodeURIComponent(slug)}`)
        const data = await response.json()

        if (data.available) {
          setStatus('available')
          setClinic(data.clinic)
        } else if (data.message === 'Esta clínica ya fue reclamada') {
          setStatus('claimed')
          setClinic(data.clinic)
        } else {
          setStatus('not_found')
          setError(data.message || 'Clínica no encontrada')
        }
      } catch (_error: unknown) {
        setStatus('error')
        setError('Error al verificar disponibilidad')
      }
    }

    checkAvailability()
  }, [slug])

  // Form validation
  function validateForm(): boolean {
    const errors: Partial<FormData> = {}

    if (!formData.ownerName || formData.ownerName.length < 2) {
      errors.ownerName = 'El nombre es requerido'
    }

    if (!formData.ownerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.ownerEmail)) {
      errors.ownerEmail = 'Email inválido'
    }

    if (!formData.ownerPhone || formData.ownerPhone.length < 8) {
      errors.ownerPhone = 'Teléfono es requerido (mínimo 8 caracteres)'
    }

    if (!formData.password || formData.password.length < 6) {
      errors.password = 'Contraseña debe tener al menos 6 caracteres'
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle form submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!validateForm() || !slug) return

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicSlug: slug,
          ownerName: formData.ownerName,
          ownerEmail: formData.ownerEmail,
          ownerPhone: formData.ownerPhone,
          password: formData.password,
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Redirect to dashboard
        router.push(data.redirectUrl || `/${slug}/dashboard`)
      } else {
        setError(data.message || 'Error al reclamar la clínica')
      }
    } catch (_error: unknown) {
      setError('Error de conexión. Intentá de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle input changes
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error when user types
    if (formErrors[name as keyof FormData]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <LandingNav />

      <div className="container mx-auto px-4 py-24 md:py-32">
        {/* Loading State */}
        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-12 w-12 animate-spin text-teal-600" />
            <p className="mt-4 text-lg text-slate-600">Verificando disponibilidad...</p>
          </div>
        )}

        {/* Not Found State */}
        {status === 'not_found' && (
          <div className="mx-auto max-w-lg text-center">
            <div className="mb-6 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <h1 className="mb-4 text-2xl font-bold text-slate-900">
              Clínica no encontrada
            </h1>
            <p className="mb-8 text-slate-600">
              {error || 'El sitio que buscás no existe o el enlace es incorrecto.'}
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full bg-teal-600 px-6 py-3 font-bold text-white transition-all hover:bg-teal-700"
            >
              Volver al inicio
            </Link>
          </div>
        )}

        {/* Already Claimed State */}
        {status === 'claimed' && (
          <div className="mx-auto max-w-lg text-center">
            <div className="mb-6 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                <AlertCircle className="h-8 w-8 text-amber-600" />
              </div>
            </div>
            <h1 className="mb-4 text-2xl font-bold text-slate-900">
              Esta clínica ya fue reclamada
            </h1>
            <p className="mb-4 text-slate-600">
              {clinic?.name ? `"${clinic.name}"` : 'Este sitio'} ya pertenece a otro usuario.
            </p>
            <p className="mb-8 text-slate-600">
              Si creés que esto es un error, contactanos por WhatsApp.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-slate-200 bg-white px-6 py-3 font-bold text-slate-700 transition-all hover:border-slate-300"
              >
                Volver al inicio
              </Link>
              <a
                href={`https://wa.me/595991234567?text=${encodeURIComponent(
                  `Hola! Quiero reclamar mi veterinaria pero dice que ya fue reclamada. El slug es: ${slug}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-teal-600 px-6 py-3 font-bold text-white transition-all hover:bg-teal-700"
              >
                <MessageCircle className="h-5 w-5" />
                Contactar Soporte
              </a>
            </div>
          </div>
        )}

        {/* Available - Show Claim Form */}
        {status === 'available' && clinic && (
          <div className="mx-auto max-w-4xl">
            <div className="grid gap-8 lg:grid-cols-2">
              {/* Left Column - Site Preview Info */}
              <div>
                <div className="mb-6">
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                    <Check className="h-4 w-4" />
                    Disponible para reclamar
                  </span>
                </div>

                <h1 className="mb-4 text-3xl font-bold text-slate-900 md:text-4xl">
                  {clinic.name}
                </h1>

                <p className="mb-6 text-lg text-slate-600">
                  Tu página web ya está lista. Solo tenés que reclamarla para empezar a usarla.
                </p>

                {/* Site Preview Link */}
                <a
                  href={`/${slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-8 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-teal-300 hover:shadow-md"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-teal-100">
                    <Globe className="h-6 w-6 text-teal-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">Ver tu sitio web</p>
                    <p className="text-sm text-slate-500">vetic.com/{slug}</p>
                  </div>
                  <ExternalLink className="h-5 w-5 text-slate-400" />
                </a>

                {/* Benefits */}
                <div className="space-y-4">
                  <h3 className="font-bold text-slate-900">Al reclamar tu sitio obtenés:</h3>

                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-teal-100">
                      <Calendar className="h-4 w-4 text-teal-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">
                        {trialConfig.freeMonths} meses GRATIS
                      </p>
                      <p className="text-sm text-slate-600">
                        Plan Profesional completo sin costo
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-100">
                      <Shield className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Garantía ROI</p>
                      <p className="text-sm text-slate-600">
                        {roiGuarantee.evaluationMonths} clientes nuevos en {roiGuarantee.evaluationMonths} meses o {roiGuarantee.freeMonthsIfFailed} meses gratis
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
                      <MessageCircle className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Onboarding personalizado</p>
                      <p className="text-sm text-slate-600">
                        Te acompañamos en la configuración
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Claim Form */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                <h2 className="mb-6 text-xl font-bold text-slate-900">
                  Reclamá tu sitio web
                </h2>

                {error && (
                  <div className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4">
                    <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Owner Name */}
                  <div>
                    <label
                      htmlFor="ownerName"
                      className="mb-1 block text-sm font-medium text-slate-700"
                    >
                      Tu nombre completo
                    </label>
                    <input
                      type="text"
                      id="ownerName"
                      name="ownerName"
                      value={formData.ownerName}
                      onChange={handleChange}
                      placeholder="Dr. Juan Pérez"
                      className={`w-full rounded-lg border px-4 py-3 transition-colors focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 ${
                        formErrors.ownerName ? 'border-red-300' : 'border-slate-300'
                      }`}
                    />
                    {formErrors.ownerName && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.ownerName}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label
                      htmlFor="ownerEmail"
                      className="mb-1 block text-sm font-medium text-slate-700"
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      id="ownerEmail"
                      name="ownerEmail"
                      value={formData.ownerEmail}
                      onChange={handleChange}
                      placeholder="juan@tuvet.com"
                      className={`w-full rounded-lg border px-4 py-3 transition-colors focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 ${
                        formErrors.ownerEmail ? 'border-red-300' : 'border-slate-300'
                      }`}
                    />
                    {formErrors.ownerEmail && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.ownerEmail}</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label
                      htmlFor="ownerPhone"
                      className="mb-1 block text-sm font-medium text-slate-700"
                    >
                      WhatsApp / Teléfono
                    </label>
                    <input
                      type="tel"
                      id="ownerPhone"
                      name="ownerPhone"
                      value={formData.ownerPhone}
                      onChange={handleChange}
                      placeholder="+595 981 123 456"
                      className={`w-full rounded-lg border px-4 py-3 transition-colors focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 ${
                        formErrors.ownerPhone ? 'border-red-300' : 'border-slate-300'
                      }`}
                    />
                    {formErrors.ownerPhone && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.ownerPhone}</p>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <label
                      htmlFor="password"
                      className="mb-1 block text-sm font-medium text-slate-700"
                    >
                      Contraseña
                    </label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Mínimo 6 caracteres"
                      className={`w-full rounded-lg border px-4 py-3 transition-colors focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 ${
                        formErrors.password ? 'border-red-300' : 'border-slate-300'
                      }`}
                    />
                    {formErrors.password && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.password}</p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="mb-1 block text-sm font-medium text-slate-700"
                    >
                      Confirmar contraseña
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Repetí tu contraseña"
                      className={`w-full rounded-lg border px-4 py-3 transition-colors focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 ${
                        formErrors.confirmPassword ? 'border-red-300' : 'border-slate-300'
                      }`}
                    />
                    {formErrors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.confirmPassword}</p>
                    )}
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 py-4 font-bold text-white transition-all hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        Reclamar Mi Sitio
                        <ArrowRight className="h-5 w-5" />
                      </>
                    )}
                  </button>

                  <p className="text-center text-xs text-slate-500">
                    Al reclamar aceptás nuestros{' '}
                    <Link href="/terminos" className="text-teal-600 hover:underline">
                      términos de servicio
                    </Link>{' '}
                    y{' '}
                    <Link href="/privacidad" className="text-teal-600 hover:underline">
                      política de privacidad
                    </Link>
                    .
                  </p>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="mx-auto max-w-lg text-center">
            <div className="mb-6 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <h1 className="mb-4 text-2xl font-bold text-slate-900">
              Error de conexión
            </h1>
            <p className="mb-8 text-slate-600">
              {error || 'No pudimos verificar la disponibilidad. Intentá de nuevo.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-full bg-teal-600 px-6 py-3 font-bold text-white transition-all hover:bg-teal-700"
            >
              Reintentar
            </button>
          </div>
        )}
      </div>

      <LandingFooter />
      <FloatingWhatsApp />
    </main>
  )
}
