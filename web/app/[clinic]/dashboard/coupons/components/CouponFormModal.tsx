'use client'

/**
 * Coupon Form Modal Component
 *
 * REF-006: Extracted create/edit modal from client component
 */

import { X, Percent, DollarSign, Truck } from 'lucide-react'
import type { Coupon, CouponFormData } from '../types'
import { DISCOUNT_TYPE_OPTIONS } from '../constants'
import { generateRandomCode } from '../utils'

interface CouponFormModalProps {
  editingCoupon: Coupon | null
  formData: CouponFormData
  saving: boolean
  onClose: () => void
  onSubmit: (e: React.FormEvent) => Promise<void>
  onFormChange: React.Dispatch<React.SetStateAction<CouponFormData>>
}

const iconMap = {
  Percent,
  DollarSign,
  Truck,
}

export function CouponFormModal({
  editingCoupon,
  formData,
  saving,
  onClose,
  onSubmit,
  onFormChange,
}: CouponFormModalProps): React.ReactElement {
  const handleGenerateCode = (): void => {
    onFormChange((prev) => ({ ...prev, code: generateRandomCode() }))
  }

  const updateField = <K extends keyof CouponFormData>(
    field: K,
    value: CouponFormData[K]
  ): void => {
    onFormChange((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            {editingCoupon ? 'Editar Cupón' : 'Nuevo Cupón'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 transition-colors hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 p-6">
          {/* Code */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
              Código del Cupón *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.code}
                onChange={(e) => updateField('code', e.target.value.toUpperCase())}
                placeholder="Ej: VERANO20"
                required
                className="focus:ring-[var(--primary)]/20 flex-1 rounded-xl border border-gray-200 px-4 py-2.5 font-mono uppercase focus:border-[var(--primary)] focus:ring-2"
              />
              <button
                type="button"
                onClick={handleGenerateCode}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50"
              >
                Generar
              </button>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
              Nombre (opcional)
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Ej: Descuento de Verano"
              className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:border-[var(--primary)] focus:ring-2"
            />
          </div>

          {/* Discount Type */}
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
              Tipo de Descuento *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {DISCOUNT_TYPE_OPTIONS.map((opt) => {
                const IconComponent = iconMap[opt.iconName]
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateField('discount_type', opt.value)}
                    className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition-all ${
                      formData.discount_type === opt.value
                        ? 'bg-[var(--primary)]/5 border-[var(--primary)]'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <IconComponent
                      className={`h-5 w-5 ${
                        formData.discount_type === opt.value
                          ? 'text-[var(--primary)]'
                          : 'text-gray-400'
                      }`}
                    />
                    <span className="text-xs font-medium">{opt.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Discount Value */}
          {formData.discount_type !== 'free_shipping' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
                Valor del Descuento *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  {formData.discount_type === 'percentage' ? '%' : '₲'}
                </span>
                <input
                  type="number"
                  value={formData.discount_value}
                  onChange={(e) =>
                    updateField('discount_value', parseFloat(e.target.value) || 0)
                  }
                  min={1}
                  max={formData.discount_type === 'percentage' ? 100 : undefined}
                  required
                  className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 focus:border-[var(--primary)] focus:ring-2"
                />
              </div>
            </div>
          )}

          {/* Min/Max Purchase */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
                Compra Mínima
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  ₲
                </span>
                <input
                  type="number"
                  value={formData.min_purchase_amount || ''}
                  onChange={(e) =>
                    updateField('min_purchase_amount', parseFloat(e.target.value) || 0)
                  }
                  min={0}
                  placeholder="0"
                  className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 focus:border-[var(--primary)] focus:ring-2"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
                Descuento Máximo
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  ₲
                </span>
                <input
                  type="number"
                  value={formData.max_discount_amount || ''}
                  onChange={(e) =>
                    updateField('max_discount_amount', parseFloat(e.target.value) || 0)
                  }
                  min={0}
                  placeholder="Sin límite"
                  className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 focus:border-[var(--primary)] focus:ring-2"
                />
              </div>
            </div>
          </div>

          {/* Usage Limits */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
                Límite de Usos Total
              </label>
              <input
                type="number"
                value={formData.usage_limit || ''}
                onChange={(e) =>
                  updateField('usage_limit', parseInt(e.target.value) || 0)
                }
                min={0}
                placeholder="Sin límite"
                className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:border-[var(--primary)] focus:ring-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
                Usos por Usuario
              </label>
              <input
                type="number"
                value={formData.usage_limit_per_user}
                onChange={(e) =>
                  updateField('usage_limit_per_user', parseInt(e.target.value) || 1)
                }
                min={1}
                className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:border-[var(--primary)] focus:ring-2"
              />
            </div>
          </div>

          {/* Validity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
                Válido Desde *
              </label>
              <input
                type="date"
                value={formData.valid_from}
                onChange={(e) => updateField('valid_from', e.target.value)}
                required
                className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:border-[var(--primary)] focus:ring-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
                Válido Hasta
              </label>
              <input
                type="date"
                value={formData.valid_until}
                onChange={(e) => updateField('valid_until', e.target.value)}
                min={formData.valid_from}
                className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:border-[var(--primary)] focus:ring-2"
              />
            </div>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between rounded-xl bg-gray-50 p-4">
            <div>
              <p className="font-medium text-[var(--text-primary)]">Cupón Activo</p>
              <p className="text-sm text-[var(--text-secondary)]">
                Los clientes podrán usar este cupón
              </p>
            </div>
            <button
              type="button"
              onClick={() => updateField('is_active', !formData.is_active)}
              className={`relative h-6 w-12 rounded-full transition-colors ${
                formData.is_active ? 'bg-[var(--primary)]' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  formData.is_active ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 font-medium text-[var(--text-primary)] transition-colors hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-[var(--primary)] px-4 py-2.5 font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : editingCoupon ? 'Guardar Cambios' : 'Crear Cupón'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
