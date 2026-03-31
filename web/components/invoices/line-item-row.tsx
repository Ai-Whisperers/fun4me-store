'use client'

import * as Icons from 'lucide-react'
import { useTranslations } from 'next-intl'
import { calculateLineTotal, formatCurrency } from '@/lib/types/invoicing'

interface Service {
  id: string
  name: string
  base_price: number
  category?: string
}

interface LineItem {
  id: string
  service_id: string | null
  description: string
  quantity: number
  unit_price: number
  discount_percent: number
}

interface LineItemRowProps {
  item: LineItem
  services: Service[]
  onUpdate: (item: LineItem) => void
  onRemove: () => void
  disabled?: boolean
}

export function LineItemRow({ item, services, onUpdate, onRemove, disabled }: LineItemRowProps) {
  const t = useTranslations('invoices.lineItem')
  const lineTotal = calculateLineTotal(item.quantity, item.unit_price, item.discount_percent)

  const handleServiceChange = (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId)
    onUpdate({
      ...item,
      service_id: serviceId || null,
      description: service?.name || item.description,
      unit_price: service?.base_price || item.unit_price,
    })
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-gray-50 p-4 md:flex-row">
      {/* Service/Description */}
      <div className="flex-1">
        <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
          {t('serviceDescription')}
        </label>
        <select
          value={item.service_id || ''}
          onChange={(e) => handleServiceChange(e.target.value)}
          disabled={disabled}
          className="w-full rounded-lg border border-gray-200 p-2 text-sm outline-none focus:border-[var(--primary)]"
        >
          <option value="">{t('custom')}</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name} - {formatCurrency(service.base_price)}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={item.description}
          onChange={(e) => onUpdate({ ...item, description: e.target.value })}
          disabled={disabled}
          placeholder={t('descriptionPlaceholder')}
          className="mt-2 w-full rounded-lg border border-gray-200 p-2 text-sm outline-none focus:border-[var(--primary)]"
        />
      </div>

      {/* Quantity */}
      <div className="w-24">
        <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
          {t('quantity')}
        </label>
        <input
          type="number"
          value={item.quantity}
          onChange={(e) =>
            onUpdate({ ...item, quantity: Math.max(1, parseInt(e.target.value) || 1) })
          }
          disabled={disabled}
          min="1"
          className="w-full rounded-lg border border-gray-200 p-2 text-center text-sm outline-none focus:border-[var(--primary)]"
        />
      </div>

      {/* Unit Price */}
      <div className="w-32">
        <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
          {t('unitPrice')}
        </label>
        <input
          type="number"
          value={item.unit_price}
          onChange={(e) =>
            onUpdate({ ...item, unit_price: Math.max(0, parseFloat(e.target.value) || 0) })
          }
          disabled={disabled}
          min="0"
          className="w-full rounded-lg border border-gray-200 p-2 text-right text-sm outline-none focus:border-[var(--primary)]"
        />
      </div>

      {/* Discount */}
      <div className="w-24">
        <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
          {t('discount')}
        </label>
        <input
          type="number"
          value={item.discount_percent}
          onChange={(e) =>
            onUpdate({
              ...item,
              discount_percent: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)),
            })
          }
          disabled={disabled}
          min="0"
          max="100"
          className="w-full rounded-lg border border-gray-200 p-2 text-center text-sm outline-none focus:border-[var(--primary)]"
        />
      </div>

      {/* Line Total */}
      <div className="flex w-32 flex-col justify-between">
        <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
          {t('subtotal')}
        </label>
        <p className="p-2 text-right font-medium text-[var(--text-primary)]">
          {formatCurrency(lineTotal)}
        </p>
      </div>

      {/* Remove Button */}
      {!disabled && (
        <div className="flex items-end">
          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50"
            title={t('remove')}
          >
            <Icons.Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
