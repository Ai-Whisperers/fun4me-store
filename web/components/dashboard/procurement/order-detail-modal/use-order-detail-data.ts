/**
 * Order Detail Data Hook
 *
 * Manages data fetching and mutations for order detail modal.
 */

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/Toast'
import { queryKeys } from '@/lib/queries'
import { staleTimes, gcTimes } from '@/lib/queries/utils'
import { STATUS_TIMELINE } from './types'
import type { PurchaseOrder, TimelineStatus } from './types'

interface UseOrderDetailDataOptions {
  orderId: string
  isOpen: boolean
  onOrderUpdated: () => void
}

interface StatusUpdateParams {
  status: string
  received_items?: { item_id: string; received_quantity: number }[]
}

export function useOrderDetailData({ orderId, isOpen, onOrderUpdated }: UseOrderDetailDataOptions) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch order details
  const {
    data: order,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.procurement.order(orderId),
    queryFn: async (): Promise<PurchaseOrder> => {
      const res = await fetch(`/api/procurement/orders/${orderId}`)
      if (!res.ok) throw new Error('Error al cargar la orden')
      return res.json()
    },
    enabled: isOpen && !!orderId,
    staleTime: staleTimes.SHORT,
    gcTime: gcTimes.SHORT,
  })

  // Update order status mutation
  const statusMutation = useMutation({
    mutationFn: async (params: StatusUpdateParams) => {
      const res = await fetch(`/api/procurement/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al actualizar la orden')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      toast({
        title: 'Orden Actualizada',
        description: `La orden ha sido ${variables.status === 'cancelled' ? 'cancelada' : 'actualizada'} exitosamente`,
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.procurement.order(orderId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.procurement.all })
      onOrderUpdated()
    },
    onError: (err) => {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Error al actualizar la orden',
        variant: 'destructive',
      })
    },
  })

  // Get the next status in the timeline
  const getNextStatus = (): TimelineStatus | null => {
    if (!order) return null
    const currentIndex = STATUS_TIMELINE.indexOf(order.status as TimelineStatus)
    if (currentIndex === -1 || currentIndex >= STATUS_TIMELINE.length - 1) return null
    return STATUS_TIMELINE[currentIndex + 1]
  }

  // Get label for next status action
  const getNextStatusLabel = (): string => {
    const nextStatus = getNextStatus()
    if (!nextStatus) return ''
    const labels: Record<string, string> = {
      submitted: 'Enviar al Proveedor',
      confirmed: 'Marcar Confirmado',
      shipped: 'Marcar Enviado',
      received: 'Recibir Orden',
    }
    return labels[nextStatus] || ''
  }

  return {
    order,
    isLoading,
    error,
    statusMutation,
    getNextStatus,
    getNextStatusLabel,
  }
}
