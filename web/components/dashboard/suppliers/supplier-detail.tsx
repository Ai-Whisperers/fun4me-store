'use client'

/**
 * Supplier Detail Modal Component
 *
 * RES-001: Migrated to React Query for data fetching
 * - Replaced useEffect+fetch with useQuery hook
 * - Replaced manual mutation with useMutation hook
 */

import {
  X,
  Building2,
  Phone,
  Mail,
  MapPin,
  User,
  Clock,
  CreditCard,
  Package,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/Toast'
import { queryKeys } from '@/lib/queries'
import { staleTimes, gcTimes } from '@/lib/queries/utils'

interface SupplierProduct {
  id: string
  unit_cost: number
  minimum_order_qty: number | null
  lead_time_days: number | null
  is_preferred: boolean
  catalog_products: {
    id: string
    sku: string
    name: string
    base_unit: string
  } | null
}

interface SupplierDetail {
  id: string
  name: string
  legal_name: string | null
  tax_id: string | null
  contact_info: {
    email?: string
    phone?: string
    address?: string
    city?: string
    contact_person?: string
  } | null
  supplier_type: 'products' | 'services' | 'both'
  minimum_order_amount: number | null
  payment_terms: string | null
  delivery_time_days: number | null
  verification_status: 'pending' | 'verified' | 'rejected'
  notes: string | null
  created_at: string
  procurement_leads?: SupplierProduct[]
}

interface SupplierDetailModalProps {
  supplierId: string
  onClose: () => void
  onVerify?: () => void
}

const VERIFICATION_STATUS = {
  pending: { label: 'Pendiente de Verificación', icon: AlertCircle, color: 'text-[var(--status-warning)]', bg: 'bg-[var(--status-warning-bg)]' },
  verified: { label: 'Verificado', icon: CheckCircle, color: 'text-[var(--status-success)]', bg: 'bg-[var(--status-success-bg)]' },
  rejected: { label: 'Rechazado', icon: XCircle, color: 'text-[var(--status-error)]', bg: 'bg-[var(--status-error-bg)]' },
}

export function SupplierDetailModal({ supplierId, onClose, onVerify }: SupplierDetailModalProps): React.ReactElement {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // React Query: Fetch supplier details
  const { data: supplier, isLoading, error } = useQuery({
    queryKey: queryKeys.suppliers.detail(supplierId),
    queryFn: async (): Promise<SupplierDetail> => {
      const res = await fetch(`/api/suppliers/${supplierId}`)
      if (!res.ok) throw new Error('Error al cargar proveedor')
      return res.json()
    },
    staleTime: staleTimes.MEDIUM,
    gcTime: gcTimes.MEDIUM,
  })

  // Mutation: Verify/reject supplier
  const verifyMutation = useMutation({
    mutationFn: async (status: 'verified' | 'rejected') => {
      const res = await fetch(`/api/suppliers/${supplierId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Error al verificar proveedor')
      return { data: await res.json(), status }
    },
    onSuccess: ({ data, status }) => {
      // Optimistic update for detail
      queryClient.setQueryData(
        queryKeys.suppliers.detail(supplierId),
        (old: SupplierDetail | undefined) =>
          old ? { ...old, verification_status: status } : old
      )
      // Invalidate list to refresh statuses
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all })

      toast({
        title: status === 'verified' ? 'Proveedor Verificado' : 'Proveedor Rechazado',
        description: data.message,
      })
      onVerify?.()
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo verificar el proveedor',
        variant: 'destructive',
      })
    },
  })

  const handleVerify = (status: 'verified' | 'rejected') => {
    if (!supplier) return
    verifyMutation.mutate(status)
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="rounded-2xl bg-white p-8">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
        </div>
      </div>
    )
  }

  if (error || !supplier) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="rounded-2xl bg-white p-8 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-[var(--status-error)]" />
          <p className="text-gray-600">Proveedor no encontrado</p>
          <button
            onClick={onClose}
            className="mt-4 rounded-lg bg-gray-100 px-4 py-2 font-medium text-gray-700 hover:bg-gray-200"
          >
            Cerrar
          </button>
        </div>
      </div>
    )
  }

  const statusInfo = VERIFICATION_STATUS[supplier.verification_status]
  const StatusIcon = statusInfo.icon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)]/10">
              <Building2 className="h-6 w-6 text-[var(--primary)]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">{supplier.name}</h2>
              {supplier.legal_name && (
                <p className="text-sm text-gray-500">{supplier.legal_name}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100" aria-label="Cerrar detalles del proveedor">
            <X className="h-5 w-5 text-gray-500" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6">
          {/* Verification Status Banner */}
          <div className={`mb-6 flex items-center justify-between rounded-xl ${statusInfo.bg} p-4`}>
            <div className="flex items-center gap-3">
              <StatusIcon className={`h-5 w-5 ${statusInfo.color}`} />
              <span className={`font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
            </div>

            {supplier.verification_status === 'pending' && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleVerify('rejected')}
                  disabled={verifyMutation.isPending}
                  className="rounded-lg border border-[var(--status-error-border)] bg-white px-3 py-1.5 text-sm font-medium text-[var(--status-error)] hover:bg-[var(--status-error-bg)] disabled:opacity-50"
                >
                  Rechazar
                </button>
                <button
                  onClick={() => handleVerify('verified')}
                  disabled={verifyMutation.isPending}
                  className="flex items-center gap-1 rounded-lg bg-[var(--status-success)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--status-success)]/90 disabled:opacity-50"
                >
                  {verifyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Verificar
                </button>
              </div>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Contact Info */}
            <Card>
              <CardContent className="p-4">
                <h3 className="mb-4 font-semibold text-[var(--text-primary)]">Información de Contacto</h3>
                <div className="space-y-3">
                  {supplier.contact_info?.contact_person && (
                    <div className="flex items-center gap-3 text-sm">
                      <User className="h-4 w-4 text-gray-400" />
                      <span>{supplier.contact_info.contact_person}</span>
                    </div>
                  )}
                  {supplier.contact_info?.phone && (
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <a href={`tel:${supplier.contact_info.phone}`} className="text-[var(--primary)] hover:underline">
                        {supplier.contact_info.phone}
                      </a>
                    </div>
                  )}
                  {supplier.contact_info?.email && (
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <a href={`mailto:${supplier.contact_info.email}`} className="text-[var(--primary)] hover:underline">
                        {supplier.contact_info.email}
                      </a>
                    </div>
                  )}
                  {(supplier.contact_info?.address || supplier.contact_info?.city) && (
                    <div className="flex items-start gap-3 text-sm">
                      <MapPin className="mt-0.5 h-4 w-4 text-gray-400" />
                      <span>
                        {supplier.contact_info.address}
                        {supplier.contact_info.address && supplier.contact_info.city && ', '}
                        {supplier.contact_info.city}
                      </span>
                    </div>
                  )}
                  {supplier.tax_id && (
                    <div className="flex items-center gap-3 text-sm">
                      <CreditCard className="h-4 w-4 text-gray-400" />
                      <span>RUC: {supplier.tax_id}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Commercial Terms */}
            <Card>
              <CardContent className="p-4">
                <h3 className="mb-4 font-semibold text-[var(--text-primary)]">Condiciones Comerciales</h3>
                <div className="space-y-3">
                  {supplier.delivery_time_days && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-gray-600">
                        <Clock className="h-4 w-4 text-gray-400" />
                        Tiempo de Entrega
                      </span>
                      <span className="font-medium">{supplier.delivery_time_days} días</span>
                    </div>
                  )}
                  {supplier.minimum_order_amount && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-gray-600">
                        <Package className="h-4 w-4 text-gray-400" />
                        Pedido Mínimo
                      </span>
                      <span className="font-medium">₲{supplier.minimum_order_amount.toLocaleString()}</span>
                    </div>
                  )}
                  {supplier.payment_terms && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-gray-600">
                        <CreditCard className="h-4 w-4 text-gray-400" />
                        Condiciones de Pago
                      </span>
                      <span className="font-medium">{supplier.payment_terms}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Products/Price Quotes */}
          {supplier.procurement_leads && supplier.procurement_leads.length > 0 && (
            <Card className="mt-6">
              <CardContent className="p-4">
                <h3 className="mb-4 font-semibold text-[var(--text-primary)]">
                  Productos ({supplier.procurement_leads.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="pb-2 text-left font-medium text-gray-600">Producto</th>
                        <th className="pb-2 text-left font-medium text-gray-600">SKU</th>
                        <th className="pb-2 text-right font-medium text-gray-600">Costo Unit.</th>
                        <th className="pb-2 text-right font-medium text-gray-600">Min. Orden</th>
                        <th className="pb-2 text-right font-medium text-gray-600">Lead Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supplier.procurement_leads.map((lead) => (
                        <tr key={lead.id} className="border-b border-gray-50">
                          <td className="py-2">
                            <div className="flex items-center gap-2">
                              {lead.catalog_products?.name || 'Producto'}
                              {lead.is_preferred && (
                                <span className="rounded-full bg-[var(--status-warning-bg)] px-1.5 py-0.5 text-xs text-[var(--status-warning)]">
                                  Preferido
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 text-gray-500">{lead.catalog_products?.sku || '-'}</td>
                          <td className="py-2 text-right font-medium">₲{lead.unit_cost.toLocaleString()}</td>
                          <td className="py-2 text-right">{lead.minimum_order_qty || '-'}</td>
                          <td className="py-2 text-right">{lead.lead_time_days ? `${lead.lead_time_days}d` : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {supplier.notes && (
            <Card className="mt-6">
              <CardContent className="p-4">
                <h3 className="mb-2 font-semibold text-[var(--text-primary)]">Notas</h3>
                <p className="text-sm text-gray-600">{supplier.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
