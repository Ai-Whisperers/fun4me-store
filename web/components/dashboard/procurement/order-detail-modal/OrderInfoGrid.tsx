/**
 * Order Info Grid Component
 *
 * Supplier and order information display.
 */

'use client'

import { Building2, Phone, Mail } from 'lucide-react'
import { formatDate } from './types'
import type { PurchaseOrder } from './types'

interface OrderInfoGridProps {
  order: PurchaseOrder
}

export function OrderInfoGrid({ order }: OrderInfoGridProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Supplier Info */}
      <div className="rounded-lg border border-gray-200 p-4">
        <h3 className="mb-3 flex items-center gap-2 font-medium text-[var(--text-primary)]">
          <Building2 className="h-4 w-4" />
          Proveedor
        </h3>
        <div className="space-y-2 text-sm">
          <p className="font-medium">{order.suppliers?.name || '-'}</p>
          {order.suppliers?.contact_name && (
            <p className="text-gray-500">{order.suppliers.contact_name}</p>
          )}
          {order.suppliers?.email && (
            <p className="flex items-center gap-1 text-gray-500">
              <Mail className="h-3.5 w-3.5" />
              {order.suppliers.email}
            </p>
          )}
          {order.suppliers?.phone && (
            <p className="flex items-center gap-1 text-gray-500">
              <Phone className="h-3.5 w-3.5" />
              {order.suppliers.phone}
            </p>
          )}
        </div>
      </div>

      {/* Order Info */}
      <div className="rounded-lg border border-gray-200 p-4">
        <h3 className="mb-3 font-medium text-[var(--text-primary)]">Información de la Orden</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Creada:</span>
            <span>{formatDate(order.created_at)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Creada por:</span>
            <span>{order.created_by_profile?.full_name || '-'}</span>
          </div>
          {order.expected_delivery_date && (
            <div className="flex justify-between">
              <span className="text-gray-500">Entrega esperada:</span>
              <span>{formatDate(order.expected_delivery_date)}</span>
            </div>
          )}
          {order.received_at && (
            <div className="flex justify-between">
              <span className="text-gray-500">Recibida:</span>
              <span>{formatDate(order.received_at)}</span>
            </div>
          )}
          {order.received_by_profile && (
            <div className="flex justify-between">
              <span className="text-gray-500">Recibida por:</span>
              <span>{order.received_by_profile.full_name}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
