/**
 * Order Edit Fields Component
 *
 * Additional form fields for delivery date, shipping address, and notes.
 */

'use client'

interface OrderEditFieldsProps {
  expectedDelivery: string
  onExpectedDeliveryChange: (value: string) => void
  shippingAddress: string
  onShippingAddressChange: (value: string) => void
  notes: string
  onNotesChange: (value: string) => void
}

export function OrderEditFields({
  expectedDelivery,
  onExpectedDeliveryChange,
  shippingAddress,
  onShippingAddressChange,
  notes,
  onNotesChange,
}: OrderEditFieldsProps) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Fecha de Entrega Esperada
          </label>
          <input
            type="date"
            value={expectedDelivery}
            onChange={(e) => onExpectedDeliveryChange(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[var(--primary)] focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Dirección de Entrega</label>
          <input
            type="text"
            value={shippingAddress}
            onChange={(e) => onShippingAddressChange(e.target.value)}
            placeholder="Dirección de entrega..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[var(--primary)] focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Notas</label>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={2}
          placeholder="Notas adicionales para el proveedor..."
          className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-[var(--primary)] focus:outline-none"
        />
      </div>
    </>
  )
}
