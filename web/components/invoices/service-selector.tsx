'use client'

import { Service } from '@/lib/types/invoicing'

interface Props {
  services: Service[]
  value: string
  onChange: (service: Service | null) => void
  disabled?: boolean
}

export function ServiceSelector({
  services,
  value,
  onChange,
  disabled,
}: Props): React.ReactElement {
  // Group services by category
  const groupedServices = services.reduce(
    (acc, service) => {
      const category = service.category || 'Otros'
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(service)
      return acc
    },
    {} as Record<string, Service[]>
  )

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>): void {
    const serviceId = e.target.value
    if (!serviceId) {
      onChange(null)
      return
    }
    const service = services.find((s) => s.id === serviceId)
    onChange(service || null)
  }

  return (
    <select
      value={value}
      onChange={handleChange}
      disabled={disabled}
      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--primary)] disabled:cursor-not-allowed disabled:bg-gray-50"
    >
      <option value="">Seleccionar servicio...</option>
      {Object.entries(groupedServices).map(([category, categoryServices]) => (
        <optgroup key={category} label={category}>
          {categoryServices.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name} - Gs. {(service.base_price ?? 0).toLocaleString()}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}
