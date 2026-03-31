'use client'

import { useState } from 'react'
import { X, Gift, Loader2, AlertCircle, CheckCircle, Percent, DollarSign } from 'lucide-react'

interface BulkDiscountModalProps {
  isOpen: boolean
  onClose: () => void
  selectedCount: number
  selectedIds: string[]
  onSuccess: () => void
}

interface BulkDiscountResult {
  success: boolean
  created: number
  failed: number
  coupons: Array<{ code: string; clientId: string }>
  errors: Array<{ clientId: string; error: string }>
}

export function BulkDiscountModal({
  isOpen,
  onClose,
  selectedCount,
  selectedIds,
  onSuccess,
}: BulkDiscountModalProps): React.ReactElement | null {
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed_amount'>('percentage')
  const [discountValue, setDiscountValue] = useState('')
  const [validDays, setValidDays] = useState('30')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<BulkDiscountResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!discountValue || !reason.trim()) return

    const value = parseFloat(discountValue)
    if (isNaN(value) || value <= 0) {
      setError('El valor del descuento debe ser mayor a 0')
      return
    }

    if (discountType === 'percentage' && value > 100) {
      setError('El porcentaje no puede ser mayor a 100%')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/clients/bulk-discount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_ids: selectedIds,
          discount_type: discountType,
          discount_value: value,
          valid_days: parseInt(validDays, 10),
          reason: reason.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Error al crear descuentos')
      }

      setResult(data)
      if (data.created > 0) {
        onSuccess()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setDiscountType('percentage')
    setDiscountValue('')
    setValidDays('30')
    setReason('')
    setResult(null)
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-lg rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-2">
              <Gift className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Aplicar Descuento Masivo</h2>
              <p className="text-sm text-gray-500">{selectedCount} clientes seleccionados</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        {result ? (
          <div className="p-6">
            <div className="mb-4 flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="font-semibold text-gray-900">Descuentos creados</p>
                <p className="text-sm text-gray-500">
                  {result.created} cupones creados, {result.failed} fallidos
                </p>
              </div>
            </div>
            {result.coupons.length > 0 && (
              <div className="mt-4 max-h-40 overflow-y-auto rounded-lg bg-gray-50 p-3">
                <p className="mb-2 text-sm font-medium text-gray-700">Códigos generados:</p>
                <div className="flex flex-wrap gap-2">
                  {result.coupons.slice(0, 10).map((c, i) => (
                    <span
                      key={i}
                      className="rounded bg-purple-100 px-2 py-1 text-xs font-mono text-purple-700"
                    >
                      {c.code}
                    </span>
                  ))}
                  {result.coupons.length > 10 && (
                    <span className="text-xs text-gray-500">
                      ... y {result.coupons.length - 10} más
                    </span>
                  )}
                </div>
              </div>
            )}
            {result.errors.length > 0 && (
              <div className="mt-4 rounded-lg bg-red-50 p-3">
                <p className="text-sm font-medium text-red-800">Errores:</p>
                <ul className="mt-1 text-sm text-red-600">
                  {result.errors.slice(0, 5).map((err, i) => (
                    <li key={i}>- {err.error}</li>
                  ))}
                </ul>
              </div>
            )}
            <button
              onClick={handleClose}
              className="mt-6 w-full rounded-lg bg-[var(--primary)] py-2 font-medium text-white hover:opacity-90"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6">
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Discount Type */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Tipo de Descuento
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDiscountType('percentage')}
                    className={`flex items-center justify-center gap-2 rounded-lg border-2 p-3 transition-colors ${
                      discountType === 'percentage'
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Percent className="h-4 w-4" />
                    Porcentaje
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType('fixed_amount')}
                    className={`flex items-center justify-center gap-2 rounded-lg border-2 p-3 transition-colors ${
                      discountType === 'fixed_amount'
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <DollarSign className="h-4 w-4" />
                    Monto Fijo
                  </button>
                </div>
              </div>

              {/* Discount Value */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {discountType === 'percentage' ? 'Porcentaje de Descuento' : 'Monto de Descuento (Gs.)'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder={discountType === 'percentage' ? 'Ej: 15' : 'Ej: 50000'}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 pr-12 focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                    required
                    min="1"
                    max={discountType === 'percentage' ? 100 : undefined}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {discountType === 'percentage' ? '%' : 'Gs.'}
                  </span>
                </div>
              </div>

              {/* Valid Days */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Días de Validez
                </label>
                <select
                  value={validDays}
                  onChange={(e) => setValidDays(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                >
                  <option value="7">7 días</option>
                  <option value="14">14 días</option>
                  <option value="30">30 días</option>
                  <option value="60">60 días</option>
                  <option value="90">90 días</option>
                </select>
              </div>

              {/* Reason */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Razón del Descuento
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ej: Campaña de fidelización, Promoción especial..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                  required
                  maxLength={500}
                />
              </div>

              <div className="rounded-lg bg-blue-50 p-3">
                <p className="text-sm text-blue-800">
                  Se creará un cupón personal único para cada cliente. Los clientes recibirán una
                  notificación con su código de descuento.
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 rounded-lg border border-gray-200 py-2 font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !discountValue || !reason.trim()}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-purple-600 py-2 font-medium text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Gift className="h-4 w-4" />
                    Crear Descuentos
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
