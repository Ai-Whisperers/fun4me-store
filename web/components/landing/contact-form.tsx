'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import {
  Building2,
  User,
  Phone,
  MessageCircle,
  CheckCircle,
  Loader2,
  ArrowRight,
} from 'lucide-react'
import { getWhatsAppUrl } from '@/lib/whatsapp'

interface FormData {
  clinicName: string
  contactName: string
  phone: string
}

const initialFormData: FormData = {
  clinicName: '',
  contactName: '',
  phone: '',
}

export function ContactForm() {
  const [mounted, setMounted] = useState(false)
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [errors, setErrors] = useState<Partial<FormData>>({})

  useEffect(() => {
    setMounted(true)
  }, [])

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {}

    if (!formData.clinicName.trim()) {
      newErrors.clinicName = 'Ingresa el nombre de tu clínica'
    }
    if (!formData.contactName.trim()) {
      newErrors.contactName = 'Ingresa tu nombre'
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Ingresa tu WhatsApp'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)

    // Build WhatsApp message
    const message = `Hola! Soy ${formData.contactName} de ${formData.clinicName}. Me gustaría recibir más información sobre Vetic.`

    // Simulate a brief delay for UX
    await new Promise((resolve) => setTimeout(resolve, 800))

    // Open WhatsApp with pre-filled message
    window.open(getWhatsAppUrl(message), '_blank')

    setIsSubmitting(false)
    setIsSubmitted(true)
  }

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  if (!mounted) {
    return (
      <section id="contacto" className="relative overflow-hidden bg-slate-50 py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mx-auto max-w-lg space-y-6">
             <div className="h-8 w-1/3 bg-slate-200 rounded animate-pulse mx-auto" />
             <div className="h-64 bg-slate-200 rounded-2xl animate-pulse" />
          </div>
        </div>
      </section>
    )
  }

  if (isSubmitted) {
    return (
      <section id="contacto" className="relative overflow-hidden bg-slate-50 py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mx-auto max-w-lg text-center rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/50 ring-1 ring-slate-100">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-teal-50">
              <CheckCircle className="h-8 w-8 text-teal-500" />
            </div>
            <h2 className="mb-4 text-2xl font-bold text-slate-900">¡Listo, gracias!</h2>
            <p className="mb-8 text-slate-600">
              Se abrió WhatsApp con tus datos. Si no se abrió automáticamente, hace click abajo.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <a
                href={getWhatsAppUrl(`Hola! Soy ${formData.contactName} de ${formData.clinicName}. Me gustaría recibir más información sobre Vetic.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-3 font-bold text-white transition-all hover:bg-[#20BD5A] hover:shadow-lg hover:shadow-green-500/20"
              >
                <MessageCircle className="h-5 w-5" />
                Continuar al Chat
              </a>
              <button
                onClick={() => {
                  setIsSubmitted(false)
                  setFormData(initialFormData)
                }}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 font-medium text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900"
              >
                Volver al formulario
              </button>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="contacto" className="relative overflow-hidden bg-slate-50 py-16 md:py-24">
      <div className="container relative z-10 mx-auto px-4 md:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Left Column: Copy */}
            <div className="text-center lg:text-left">
              <h2 className="mb-6 text-3xl font-black text-[var(--landing-text-primary)] md:text-4xl lg:text-5xl">
                Contanos sobre <span className="text-3xl md:text-4xl lg:text-5xl text-[var(--landing-primary)]">tu clínica.</span>
              </h2>
              <p className="mb-8 text-lg text-slate-600 leading-relaxed">
                Completa estos 3 datos y hablemos por WhatsApp. Sin compromisos ni llamadas molestas.
              </p>
              
              {/* Left Column: Image */}
            <div className="relative hidden h-full min-h-[400px] lg:block">
              <div className="absolute inset-0 overflow-hidden rounded-l-2xl">
                <Image
                  src="/vetic-contact.png"
                  alt="Equipo de soporte Vetic"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />
              </div>
            </div>
            </div>

            {/* Right Column: Form */}
            <div className="rounded-3xl bg-white p-6 shadow-xl shadow-slate-200/50 ring-1 ring-slate-100 md:p-8">
              <form onSubmit={handleSubmit} className="space-y-5" aria-label="Formulario de contacto">
                {/* Contact Name */}
                <div>
                  <label htmlFor="contactName" className="mb-1.5 block text-sm font-medium text-slate-700">Tu Nombre</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <input
                      id="contactName"
                      name="contactName"
                      type="text"
                      value={formData.contactName}
                      onChange={(e) => handleChange('contactName', e.target.value)}
                      placeholder="Ej: Dr. Juan Pérez"
                      aria-invalid={errors.contactName ? 'true' : 'false'}
                      aria-describedby={errors.contactName ? 'contactName-error' : undefined}
                      className={`w-full rounded-xl border bg-slate-50 py-3 pl-11 pr-4 text-slate-900 placeholder-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-2 ${
                        errors.contactName
                          ? 'border-red-300 focus:ring-red-200'
                          : 'border-slate-200 focus:border-teal-500 focus:ring-teal-100'
                      }`}
                    />
                  </div>
                  {errors.contactName && (
                    <p id="contactName-error" className="mt-1 text-xs text-red-500 font-medium" role="alert">{errors.contactName}</p>
                  )}
                </div>

                {/* Clinic Name */}
                <div>
                  <label htmlFor="clinicName" className="mb-1.5 block text-sm font-medium text-slate-700">Nombre de la Clínica</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <input
                      id="clinicName"
                      name="clinicName"
                      type="text"
                      value={formData.clinicName}
                      onChange={(e) => handleChange('clinicName', e.target.value)}
                      placeholder="Ej: Veterinaria San Roque"
                      aria-invalid={errors.clinicName ? 'true' : 'false'}
                      aria-describedby={errors.clinicName ? 'clinicName-error' : undefined}
                      className={`w-full rounded-xl border bg-slate-50 py-3 pl-11 pr-4 text-slate-900 placeholder-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-2 ${
                        errors.clinicName
                          ? 'border-red-300 focus:ring-red-200'
                          : 'border-slate-200 focus:border-teal-500 focus:ring-teal-100'
                      }`}
                    />
                  </div>
                  {errors.clinicName && (
                    <p id="clinicName-error" className="mt-1 text-xs text-red-500 font-medium" role="alert">{errors.clinicName}</p>
                  )}
                </div>

                {/* WhatsApp */}
                <div>
                  <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-slate-700">Celular / WhatsApp</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      placeholder="0981 123 456"
                      aria-invalid={errors.phone ? 'true' : 'false'}
                      aria-describedby={errors.phone ? 'phone-error' : undefined}
                      className={`w-full rounded-xl border bg-slate-50 py-3 pl-11 pr-4 text-slate-900 placeholder-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-2 ${
                        errors.phone
                          ? 'border-red-300 focus:ring-red-200'
                          : 'border-slate-200 focus:border-teal-500 focus:ring-teal-100'
                      }`}
                    />
                  </div>
                  {errors.phone && <p id="phone-error" className="mt-1 text-xs text-red-500 font-medium" role="alert">{errors.phone}</p>}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="group relative w-full overflow-hidden rounded-xl bg-teal-600 px-6 py-4 text-base font-bold text-white shadow-md shadow-teal-500/20 transition-all hover:-translate-y-0.5 hover:bg-teal-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
                >
                  <span className="relative flex items-center justify-center gap-2">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        Solicitar Info
                        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </span>
                </button>
                
                <p className="text-center text-xs text-slate-400">
                  Te responderemos en minutos durante horario laboral.
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
