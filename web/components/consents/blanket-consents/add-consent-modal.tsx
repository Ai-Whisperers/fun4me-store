'use client'

import type { JSX } from 'react'
import { useState, useRef, useEffect } from 'react'
import { X, Check, Edit3, Type, RotateCcw } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

interface AddConsentModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    consent_type: string
    scope: string
    conditions: string
    signature_data: string
    expires_at: string
  }) => Promise<void>
}

export default function AddConsentModal({
  isOpen,
  onClose,
  onSubmit,
}: AddConsentModalProps): JSX.Element | null {
  const { showToast } = useToast()
  const [consentType, setConsentType] = useState('')
  const [scope, setScope] = useState('')
  const [conditions, setConditions] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [signatureMode, setSignatureMode] = useState<'draw' | 'type'>('draw')
  const [signatureText, setSignatureText] = useState('')
  const [isDrawing, setIsDrawing] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const canvasContainerRef = useRef<HTMLDivElement>(null)

  // Resize canvas to match container
  const resizeCanvas = (): void => {
    const canvas = canvasRef.current
    const container = canvasContainerRef.current
    if (!canvas || !container) return
    const rect = container.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = Math.min(rect.width * 0.3, 150) * dpr
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.scale(dpr, dpr)
      ctx.strokeStyle = '#000'
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
    }
  }

  useEffect(() => {
    if (signatureMode === 'draw' && isOpen) {
      setTimeout(resizeCanvas, 100)
    }
  }, [signatureMode, isOpen])

  useEffect(() => {
    const handleResize = (): void => {
      if (signatureMode === 'draw' && isOpen) {
        resizeCanvas()
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [signatureMode, isOpen])

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ): void => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    setIsDrawing(true)

    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top

    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ): void => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top

    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = (): void => {
    setIsDrawing(false)
  }

  const clearSignature = (): void => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const getSignatureData = (): string => {
    if (signatureMode === 'draw') {
      return canvasRef.current?.toDataURL() || ''
    }
    return signatureText
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()

    const signatureData = getSignatureData()
    if (!signatureData) {
      // BUG-009: Replace alert with toast notification
      showToast({
        title: 'Debe proporcionar una firma',
        variant: 'warning',
      })
      return
    }

    setSubmitting(true)

    try {
      await onSubmit({
        consent_type: consentType,
        scope,
        conditions,
        signature_data: signatureData,
        expires_at: expiresAt,
      })

      // Reset form
      setConsentType('')
      setScope('')
      setConditions('')
      setExpiresAt('')
      setSignatureText('')
      clearSignature()
      onClose()
    } catch (_error) {
      // BUG-009: Replace alert with toast notification
      showToast({
        title: 'Error al crear el consentimiento permanente',
        variant: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4">
      <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-[var(--bg-paper)] sm:max-h-[90vh]">
        <div className="border-[var(--primary)]/20 sticky top-0 border-b bg-[var(--bg-paper)] p-4 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-[var(--text-primary)] sm:text-2xl">
              Nuevo Consentimiento Permanente
            </h2>
            <button
              onClick={onClose}
              className="-m-2 flex min-h-[44px] min-w-[44px] items-center justify-center p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-4 sm:space-y-6 sm:p-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
              Tipo de consentimiento <span className="text-red-600">*</span>
            </label>
            <select
              value={consentType}
              onChange={(e) => setConsentType(e.target.value)}
              required
              className="border-[var(--primary)]/20 w-full rounded-lg border bg-[var(--bg-default)] px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            >
              <option value="">Seleccionar...</option>
              <option value="emergency_treatment">Tratamiento de Emergencia</option>
              <option value="routine_procedures">Procedimientos de Rutina</option>
              <option value="vaccination">Vacunación</option>
              <option value="diagnostic_tests">Pruebas Diagnósticas</option>
              <option value="grooming">Peluquería</option>
              <option value="boarding">Hospedaje</option>
              <option value="other">Otro</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
              Alcance <span className="text-red-600">*</span>
            </label>
            <textarea
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              required
              rows={3}
              placeholder="Describa el alcance de este consentimiento..."
              className="border-[var(--primary)]/20 w-full rounded-lg border bg-[var(--bg-default)] px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
              Condiciones (opcional)
            </label>
            <textarea
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              rows={2}
              placeholder="Condiciones especiales o limitaciones..."
              className="border-[var(--primary)]/20 w-full rounded-lg border bg-[var(--bg-default)] px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
              Fecha de expiración (opcional)
            </label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="border-[var(--primary)]/20 w-full rounded-lg border bg-[var(--bg-default)] px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Dejar vacío para consentimiento sin fecha de expiración
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
              Firma <span className="text-red-600">*</span>
            </label>

            <div className="mb-4 flex gap-2">
              <button
                type="button"
                onClick={() => setSignatureMode('draw')}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 transition-colors ${
                  signatureMode === 'draw'
                    ? 'bg-[var(--primary)] text-white'
                    : 'border-[var(--primary)]/20 border bg-[var(--bg-default)] text-[var(--text-primary)]'
                }`}
              >
                <Edit3 className="h-4 w-4" />
                Dibujar
              </button>
              <button
                type="button"
                onClick={() => setSignatureMode('type')}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 transition-colors ${
                  signatureMode === 'type'
                    ? 'bg-[var(--primary)] text-white'
                    : 'border-[var(--primary)]/20 border bg-[var(--bg-default)] text-[var(--text-primary)]'
                }`}
              >
                <Type className="h-4 w-4" />
                Escribir
              </button>
            </div>

            {signatureMode === 'draw' ? (
              <div className="space-y-2">
                <div ref={canvasContainerRef} className="w-full">
                  <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={(e) => {
                      e.preventDefault()
                      startDrawing(e)
                    }}
                    onTouchMove={(e) => {
                      e.preventDefault()
                      draw(e)
                    }}
                    onTouchEnd={stopDrawing}
                    className="border-[var(--primary)]/20 w-full cursor-crosshair touch-none rounded-lg border-2 border-dashed bg-white"
                    style={{ height: 'min(30vw, 150px)', minHeight: '100px' }}
                  />
                </div>
                <button
                  type="button"
                  onClick={clearSignature}
                  className="flex min-h-[44px] items-center gap-2 px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  <RotateCcw className="h-4 w-4" />
                  Limpiar firma
                </button>
              </div>
            ) : (
              <input
                type="text"
                value={signatureText}
                onChange={(e) => setSignatureText(e.target.value)}
                placeholder="Escriba su nombre completo"
                className="border-[var(--primary)]/20 w-full rounded-lg border-2 border-dashed bg-white px-4 py-3 font-serif text-2xl text-black focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                style={{ fontFamily: 'cursive' }}
              />
            )}
          </div>

          <div className="border-[var(--primary)]/20 flex flex-col-reverse justify-end gap-3 border-t pt-4 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="hover:bg-[var(--primary)]/10 border-[var(--primary)]/20 min-h-[48px] rounded-lg border bg-[var(--bg-default)] px-4 py-3 text-[var(--text-primary)] transition-colors disabled:opacity-50 sm:px-6"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-3 text-white transition-opacity hover:opacity-90 disabled:opacity-50 sm:px-6"
            >
              {submitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Guardar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
