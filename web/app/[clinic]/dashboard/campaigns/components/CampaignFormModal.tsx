'use client'

/**
 * Campaign Form Modal Component
 *
 * REF-006: Extracted create/edit modal from client component
 */

import { X, Percent, DollarSign, Tag, Gift, Package, Zap, Sun } from 'lucide-react'
import type { Campaign, CampaignFormData } from '../types'
import { CAMPAIGN_TYPE_OPTIONS, DISCOUNT_TYPE_OPTIONS } from '../constants'

interface CampaignFormModalProps {
  editingCampaign: Campaign | null
  formData: CampaignFormData
  saving: boolean
  onClose: () => void
  onSubmit: (e: React.FormEvent) => Promise<void>
  onFormChange: React.Dispatch<React.SetStateAction<CampaignFormData>>
}

const typeIconMap = {
  Tag,
  Gift,
  Package,
  Zap,
  Sun,
}

const discountIconMap = {
  Percent,
  DollarSign,
}

export function CampaignFormModal({
  editingCampaign,
  formData,
  saving,
  onClose,
  onSubmit,
  onFormChange,
}: CampaignFormModalProps): React.ReactElement {
  const updateField = <K extends keyof CampaignFormData>(
    field: K,
    value: CampaignFormData[K]
  ): void => {
    onFormChange((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            {editingCampaign ? 'Editar Campaña' : 'Nueva Campaña'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 transition-colors hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 p-6">
          {/* Name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
              Nombre de la Campaña *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Ej: Ofertas de Verano"
              required
              className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:border-[var(--primary)] focus:ring-2"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
              Descripción (opcional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Descripción de la campaña..."
              rows={2}
              className="focus:ring-[var(--primary)]/20 w-full resize-none rounded-xl border border-gray-200 px-4 py-2.5 focus:border-[var(--primary)] focus:ring-2"
            />
          </div>

          {/* Campaign Type */}
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
              Tipo de Campaña *
            </label>
            <div className="grid grid-cols-5 gap-2">
              {CAMPAIGN_TYPE_OPTIONS.map((opt) => {
                const IconComponent = typeIconMap[opt.iconName]
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateField('campaign_type', opt.value)}
                    className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition-all ${
                      formData.campaign_type === opt.value
                        ? 'bg-[var(--primary)]/5 border-[var(--primary)]'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <IconComponent
                      className={`h-5 w-5 ${
                        formData.campaign_type === opt.value
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

          {/* Discount Type */}
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
              Tipo de Descuento *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {DISCOUNT_TYPE_OPTIONS.map((opt) => {
                const IconComponent = discountIconMap[opt.iconName]
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateField('discount_type', opt.value)}
                    className={`flex items-center justify-center gap-2 rounded-xl border-2 p-3 transition-all ${
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
                    <span className="text-sm font-medium">{opt.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Discount Value */}
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

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
                Fecha de Inicio *
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => updateField('start_date', e.target.value)}
                required
                className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:border-[var(--primary)] focus:ring-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
                Fecha de Fin *
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => updateField('end_date', e.target.value)}
                min={formData.start_date}
                required
                className="focus:ring-[var(--primary)]/20 w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:border-[var(--primary)] focus:ring-2"
              />
            </div>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between rounded-xl bg-gray-50 p-4">
            <div>
              <p className="font-medium text-[var(--text-primary)]">Campaña Activa</p>
              <p className="text-sm text-[var(--text-secondary)]">
                La campaña se mostrará en la tienda
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
              {saving ? 'Guardando...' : editingCampaign ? 'Guardar Cambios' : 'Crear Campaña'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
