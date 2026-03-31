/**
 * Order Edit Data Hook
 *
 * Manages data fetching, search, and mutations for order editing.
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/Toast'
import { staleTimes, gcTimes } from '@/lib/queries/utils'
import type { Supplier, Product, PurchaseOrder, UpdateOrderParams } from './types'

interface UseOrderEditDataOptions {
  orderId: string
  isOpen: boolean
  onSuccess: () => void
  onClose: () => void
}

export function useOrderEditData({ orderId, isOpen, onSuccess, onClose }: UseOrderEditDataOptions) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Product search state
  const [productSearch, setProductSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(productSearch)
    }, 300)
    return () => clearTimeout(timer)
  }, [productSearch])

  // Fetch order details
  const {
    data: order,
    isLoading: loading,
    error: orderError,
  } = useQuery({
    queryKey: ['procurement', 'orders', orderId],
    queryFn: async (): Promise<PurchaseOrder> => {
      const res = await fetch(`/api/procurement/orders/${orderId}`)
      if (!res.ok) throw new Error('Error al cargar la orden')
      return res.json()
    },
    enabled: isOpen && !!orderId,
    staleTime: staleTimes.SHORT,
    gcTime: gcTimes.SHORT,
  })

  // Fetch suppliers
  const { data: suppliersData, isLoading: loadingSuppliers } = useQuery({
    queryKey: ['suppliers', 'verified'],
    queryFn: async (): Promise<{ suppliers: Supplier[] }> => {
      const res = await fetch('/api/suppliers?status=verified')
      if (!res.ok) throw new Error('Error al cargar proveedores')
      return res.json()
    },
    enabled: isOpen,
    staleTime: staleTimes.MEDIUM,
    gcTime: gcTimes.MEDIUM,
  })

  const suppliers = suppliersData?.suppliers || []

  // Product search
  const { data: searchData, isFetching: searching } = useQuery({
    queryKey: ['procurement', 'leads', 'search', debouncedSearch],
    queryFn: async (): Promise<Product[]> => {
      const res = await fetch(`/api/procurement/leads?limit=10`)
      if (!res.ok) return []
      const data = await res.json()
      return (
        data.leads
          ?.map((lead: { catalog_products: Product | null }) => lead.catalog_products)
          .filter((p: Product | null): p is Product => p !== null)
          .filter(
            (p: Product, i: number, arr: Product[]) =>
              arr.findIndex((x) => x.id === p.id) === i &&
              (p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                p.sku.toLowerCase().includes(debouncedSearch.toLowerCase()))
          )
          .slice(0, 5) || []
      )
    },
    enabled: debouncedSearch.length >= 2,
    staleTime: staleTimes.SHORT,
    gcTime: gcTimes.SHORT,
  })

  const searchResults = useMemo(() => {
    if (!debouncedSearch || debouncedSearch.length < 2) return []
    return searchData || []
  }, [searchData, debouncedSearch])

  // Derive error state
  const error = useMemo(() => {
    if (orderError) return 'Error al cargar los detalles de la orden'
    if (order && order.status !== 'draft') return 'Solo se pueden editar órdenes en estado borrador'
    return null
  }, [order, orderError])

  // Update order mutation (delete + recreate pattern)
  const updateMutation = useMutation({
    mutationFn: async (params: UpdateOrderParams) => {
      // Delete old order
      await fetch(`/api/procurement/orders/${params.orderId}`, {
        method: 'DELETE',
      })

      // Create new one
      const res = await fetch('/api/procurement/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_id: params.supplier_id,
          items: params.items,
          expected_delivery_date: params.expected_delivery_date,
          notes: params.notes,
          shipping_address: params.shipping_address,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al actualizar orden')
      }

      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procurement', 'orders'] })
      toast({
        title: 'Orden Actualizada',
        description: 'La orden de compra ha sido actualizada exitosamente',
      })
      onSuccess()
      onClose()
    },
    onError: (err) => {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Error al actualizar la orden',
        variant: 'destructive',
      })
    },
  })

  const clearSearch = () => {
    setProductSearch('')
    setDebouncedSearch('')
  }

  return {
    // Data
    order,
    suppliers,
    searchResults,
    error,

    // Loading states
    loading,
    loadingSuppliers,
    searching,

    // Search
    productSearch,
    setProductSearch,
    clearSearch,

    // Mutation
    updateMutation,
  }
}
