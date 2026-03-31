'use client'

import { useActionState, useState, useCallback } from 'react'
import {
  ArrowLeft,
  AlertTriangle,
  Loader2,
  Check,
  X,
  Trash2,
  Camera,
  AlertCircle,
  FileText,
  Upload,
  Info,
  CheckCircle2,
  Calendar,
  Syringe,
} from 'lucide-react'
import { createVaccine } from '@/app/actions/create-vaccine'
import { validateImageQuality } from '@/lib/validation/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ActionResult, FieldErrors } from '@/lib/types/action-result'

// Helper component for field errors
function FieldError({ error }: { error?: string }) {
  if (!error) return null
  return (
    <p className="mt-1 flex items-start gap-1 text-sm text-red-600">
      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <span>{error}</span>
    </p>
  )
}

// Helper component for field hints
function FieldHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1 flex items-start gap-1 text-xs text-[var(--text-muted)]">
      <Info className="mt-0.5 h-3 w-3 flex-shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  )
}

// Get field errors from state
function getFieldErrors(state: ActionResult | null): FieldErrors {
  if (!state || state.success) return {}
  return state.fieldErrors || {}
}

// Input class with error state
function inputClass(hasError: boolean) {
  const base = 'w-full px-4 py-3 rounded-xl border outline-none transition-colors'
  return hasError
    ? `${base} border-red-300 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200`
    : `${base} border-gray-200 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20`
}

export default function NewVaccinePage() {
  const params = useParams()
  const [state, formAction, isPending] = useActionState(createVaccine, null)
  const fieldErrors = getFieldErrors(state)

  const [photos, setPhotos] = useState<
    { file: File; preview: string; status: 'validating' | 'valid' | 'invalid'; error?: string }[]
  >([])
  const [certificate, setCertificate] = useState<{ file: File; name: string } | null>(null)
  const [certificateError, setCertificateError] = useState<string | null>(null)

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newPhotos = Array.from(e.target.files).map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        status: 'validating' as const,
      }))

      setPhotos((prev) => [...prev, ...newPhotos])

      for (let i = 0; i < newPhotos.length; i++) {
        const result = await validateImageQuality(newPhotos[i].file)

        setPhotos((prev) =>
          prev.map((p) => {
            if (p.file === newPhotos[i].file) {
              return {
                ...p,
                status: result.isValid ? 'valid' : 'invalid',
                error: result.reason,
              }
            }
            return p
          })
        )
      }
    }
  }

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  const hasInvalidPhotos = photos.some((p) => p.status === 'invalid')
  const isValidatingPhotos = photos.some((p) => p.status === 'validating')

  const [reactionWarning, setReactionWarning] = useState<{ severity: string; date: string } | null>(
    null
  )

  const handleCertificateSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setCertificateError(null)

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setCertificateError('Formato no permitido. Usa PDF, JPG, PNG o WebP.')
      return
    }

    const maxSizeMB = 10
    if (file.size > maxSizeMB * 1024 * 1024) {
      setCertificateError(
        `El archivo es muy grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo ${maxSizeMB}MB.`
      )
      return
    }

    setCertificate({ file, name: file.name })
  }, [])

  const removeCertificate = useCallback(() => {
    setCertificate(null)
    setCertificateError(null)
  }, [])

  const checkReaction = async (brand: string) => {
    if (!brand || brand.length < 3) return
    try {
      const res = await fetch('/api/vaccine_reactions/check', {
        method: 'POST',
        body: JSON.stringify({ pet_id: params.id, brand }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.hasReaction) {
          setReactionWarning({
            severity: data.record.severity,
            date: data.record.reaction_date,
          })
        } else {
          setReactionWarning(null)
        }
      }
    } catch (e) {
      // Client-side error logging - only in development
      if (process.env.NODE_ENV === 'development') {
        console.error(e)
      }
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      {/* Reaction Warning */}
      {reactionWarning && (
        <div className="animate-in fade-in slide-in-from-top-2 mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="h-6 w-6 shrink-0 text-red-600" aria-hidden="true" />
          <div>
            <h4 className="font-bold text-red-700">¡Advertencia de Reacción Previa!</h4>
            <p className="mt-1 text-sm text-red-600">
              Este paciente registró una reacción{' '}
              <strong>{reactionWarning.severity.toUpperCase()}</strong> a esta vacuna el{' '}
              {new Date(reactionWarning.date).toLocaleDateString()}.
            </p>
            <p className="mt-2 text-xs font-medium text-red-500">
              Proceda con extrema precaución o considere alternativas.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <Link
          href={`/${params.clinic}/portal/pets/${params.id}`}
          className="rounded-xl p-2 transition-colors hover:bg-white"
          aria-label="Volver al perfil de mascota"
        >
          <ArrowLeft className="h-6 w-6 text-[var(--text-secondary)]" aria-hidden="true" />
        </Link>
        <div>
          <h1 className="font-heading text-3xl font-black text-[var(--text-primary)]">
            Nueva Vacuna
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Registra una vacuna aplicada a tu mascota
          </p>
        </div>
      </div>

      {/* Global error message */}
      {state && !state.success && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden="true" />
          <div>
            <p className="font-bold">No se pudo guardar</p>
            <p className="mt-1 text-sm">{state.error}</p>
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-xl">
        <form action={formAction} className="space-y-6">
          <input type="hidden" name="clinic" value={params.clinic} />
          <input type="hidden" name="petId" value={params.id} />

          {/* Required fields notice */}
          <div className="flex items-center gap-2 border-b border-gray-100 pb-2 text-sm text-[var(--text-muted)]">
            <Info className="h-4 w-4" aria-hidden="true" />
            <span>
              Los campos marcados con <span className="text-red-500">*</span> son obligatorios
            </span>
          </div>

          {/* Photo Upload Section */}
          <div>
            <label className="mb-2 block text-sm font-bold text-[var(--text-secondary)]">
              <Camera className="mr-1 inline h-4 w-4" aria-hidden="true" />
              Fotos de la Libreta / Sticker
            </label>
            <p className="mb-3 text-xs text-[var(--text-muted)]">
              Sube fotos del sticker de la vacuna o de la libreta sanitaria. Esto ayuda a verificar
              la vacunación.
            </p>

            <div className="grid grid-cols-2 gap-4">
              {photos.map((photo, idx) => (
                <div
                  key={photo.preview}
                  className={`group relative aspect-square overflow-hidden rounded-2xl border-2 ${photo.status === 'invalid' ? 'border-red-500' : photo.status === 'valid' ? 'border-green-500' : 'border-gray-200'}`}
                >
                  <img
                    src={photo.preview}
                    alt={`Vista previa ${idx + 1}`}
                    className="h-full w-full object-cover"
                  />

                  <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2 text-center backdrop-blur-sm">
                    {photo.status === 'validating' && (
                      <span className="flex items-center justify-center gap-1 text-xs text-white">
                        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />{' '}
                        Procesando...
                      </span>
                    )}
                    {photo.status === 'valid' && (
                      <span className="flex items-center justify-center gap-1 text-xs font-bold text-green-400">
                        <Check className="h-3 w-3" aria-hidden="true" /> Lista
                      </span>
                    )}
                    {photo.status === 'invalid' && (
                      <span className="flex items-center justify-center gap-1 text-xs font-bold text-red-400">
                        <X className="h-3 w-3" aria-hidden="true" /> Rechazada
                      </span>
                    )}
                  </div>

                  {photo.error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4 text-center">
                      <p className="text-xs font-medium text-white">{photo.error}</p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => removePhoto(idx)}
                    aria-label={`Eliminar foto ${idx + 1}`}
                    className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-red-500 opacity-0 shadow-sm transition-opacity hover:bg-red-50 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              <label className="border-[var(--primary)]/30 bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10 flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed transition-colors">
                <Camera className="h-8 w-8 text-[var(--primary)]" aria-hidden="true" />
                <span className="text-xs font-bold text-[var(--primary)]">Agregar Foto</span>
                <span className="text-[10px] text-[var(--text-muted)]">JPG, PNG, WebP</span>
                <input
                  type="file"
                  name="photos"
                  multiple
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </label>
            </div>

            <FieldError error={fieldErrors.photos} />

            {hasInvalidPhotos && (
              <p className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                Elimina las fotos rechazadas antes de continuar
              </p>
            )}
          </div>

          {/* Vaccine Details Section */}
          <div className="space-y-4 border-t border-gray-100 pt-4">
            <h3 className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
              <Syringe className="h-4 w-4 text-[var(--primary)]" aria-hidden="true" />
              Datos de la Vacuna
            </h3>

            <div>
              <label
                htmlFor="name"
                className="mb-1 block text-sm font-bold text-[var(--text-secondary)]"
              >
                Nombre de la Vacuna <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                name="name"
                required
                type="text"
                onBlur={(e) => checkReaction(e.target.value)}
                placeholder="Ej: Séxtuple, Antirrábica, Triple Felina"
                className={inputClass(!!fieldErrors.name)}
                aria-invalid={!!fieldErrors.name}
              />
              <FieldError error={fieldErrors.name} />
              <FieldHint>Escribe el nombre tal como aparece en el sticker o certificado</FieldHint>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="date"
                  className="mb-1 block text-sm font-bold text-[var(--text-secondary)]"
                >
                  <Calendar className="mr-1 inline h-3 w-3" aria-hidden="true" />
                  Fecha de Aplicación <span className="text-red-500">*</span>
                </label>
                <input
                  id="date"
                  name="date"
                  required
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  className={inputClass(!!fieldErrors.date)}
                  aria-invalid={!!fieldErrors.date}
                />
                <FieldError error={fieldErrors.date} />
              </div>
              <div>
                <label
                  htmlFor="nextDate"
                  className="mb-1 block text-sm font-bold text-[var(--text-secondary)]"
                >
                  <Calendar className="mr-1 inline h-3 w-3" aria-hidden="true" />
                  Próxima Dosis
                </label>
                <input
                  id="nextDate"
                  name="nextDate"
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  className={inputClass(!!fieldErrors.nextDate)}
                  aria-invalid={!!fieldErrors.nextDate}
                />
                <FieldError error={fieldErrors.nextDate} />
                <FieldHint>Te recordaremos cuando se acerque la fecha</FieldHint>
              </div>
            </div>

            <div>
              <label
                htmlFor="batch"
                className="mb-1 block text-sm font-bold text-[var(--text-secondary)]"
              >
                Número de Lote
              </label>
              <input
                id="batch"
                name="batch"
                type="text"
                placeholder="Ej: A-12345, LOT2024001"
                className={inputClass(!!fieldErrors.batch)}
                aria-invalid={!!fieldErrors.batch}
              />
              <FieldError error={fieldErrors.batch} />
              <FieldHint>
                Opcional. Lo encontrarás en el sticker o certificado de la vacuna
              </FieldHint>
            </div>
          </div>

          {/* Certificate Upload Section */}
          <div className="space-y-4 border-t border-gray-100 pt-4">
            <div>
              <label className="mb-2 block text-sm font-bold text-[var(--text-secondary)]">
                <FileText className="mr-1 inline h-4 w-4" aria-hidden="true" />
                Certificado de Vacunación
              </label>
              <p className="mb-3 text-xs text-[var(--text-muted)]">
                Opcional. Útil para viajes internacionales o requisitos especiales.
              </p>

              {certificate ? (
                <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-green-100">
                    <FileText className="h-5 w-5 text-green-600" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-green-700">
                      {certificate.name}
                    </p>
                    <p className="text-xs text-green-600">
                      {(certificate.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={removeCertificate}
                    aria-label="Eliminar certificado"
                    className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="hover:border-[var(--primary)]/50 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-200 p-6 transition-colors hover:bg-gray-50">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                    <Upload className="h-6 w-6 text-gray-400" aria-hidden="true" />
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      Subir certificado
                    </span>
                    <p className="mt-1 text-xs text-gray-400">PDF, JPG, PNG o WebP • Max 10MB</p>
                  </div>
                  <input
                    type="file"
                    name="certificate"
                    accept=".pdf,image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleCertificateSelect}
                    className="hidden"
                  />
                </label>
              )}

              {(certificateError || fieldErrors.certificate) && (
                <FieldError error={certificateError || fieldErrors.certificate} />
              )}
            </div>
          </div>

          {/* Tips */}
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2
                className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600"
                aria-hidden="true"
              />
              <div className="text-sm text-blue-800">
                <p className="font-bold">Consejos para el registro:</p>
                <ul className="mt-1 list-inside list-disc space-y-1 text-blue-700">
                  <li>Toma una foto clara del sticker de la vacuna</li>
                  <li>Asegúrate que se lea la fecha y el nombre</li>
                  <li>
                    Si la vacuna fue aplicada por un veterinario, será verificada automáticamente
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending || hasInvalidPhotos || isValidatingPhotos}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-4 font-bold text-white shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-lg"
          >
            {isPending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                <span>Guardando...</span>
              </>
            ) : (
              'Guardar en Libreta'
            )}
          </button>

          {(hasInvalidPhotos || isValidatingPhotos) && (
            <p className="text-center text-xs font-medium text-amber-600">
              {isValidatingPhotos
                ? 'Procesando fotos...'
                : 'Elimina las fotos rechazadas para continuar'}
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
