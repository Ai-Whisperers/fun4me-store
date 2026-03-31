'use client'

/**
 * Invoice Form Wrapper Component
 *
 * RES-001: Migrated to React Query for data fetching
 * - Replaced useEffect+fetch with useQuery hooks
 */

import { Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { InvoiceForm } from '@/components/invoices/invoice-form'
import { getClinicServices, getClinicPets } from '@/app/actions/invoices'
import { staleTimes, gcTimes } from '@/lib/queries/utils'

interface Pet {
  id: string
  name: string
  species: string
  breed?: string
  photo_url?: string
  owner?: {
    id: string
    full_name: string
    phone?: string
    email?: string
  }
}

interface Service {
  id: string
  name: string
  base_price: number
  category?: string
}

interface InvoiceFormWrapperProps {
  clinic: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function InvoiceFormWrapper({
  clinic,
  onSuccess,
  onCancel,
}: InvoiceFormWrapperProps): React.ReactElement {
  // React Query: Fetch services
  const { data: services = [], isLoading: loadingServices, error: servicesError } = useQuery({
    queryKey: ['services', clinic],
    queryFn: async (): Promise<Service[]> => {
      const result = await getClinicServices(clinic)
      if ('error' in result && result.error) {
        throw new Error(result.error)
      }
      return ('data' in result ? result.data : []) as Service[]
    },
    staleTime: staleTimes.MEDIUM,
    gcTime: gcTimes.MEDIUM,
  })

  // React Query: Fetch pets
  const { data: pets = [], isLoading: loadingPets, error: petsError } = useQuery({
    queryKey: ['pets', clinic, 'for-invoice'],
    queryFn: async (): Promise<Pet[]> => {
      const result = await getClinicPets(clinic)
      if ('error' in result && result.error) {
        throw new Error(result.error)
      }
      return ('data' in result ? result.data : []) as Pet[]
    },
    staleTime: staleTimes.MEDIUM,
    gcTime: gcTimes.MEDIUM,
  })

  const loading = loadingServices || loadingPets
  const error = servicesError?.message || petsError?.message || null

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-[var(--status-error-border)] bg-[var(--status-error-bg)] p-4 text-sm text-[var(--status-error)]">
        {error}
      </div>
    )
  }

  return (
    <div className="invoice-form-wrapper">
      <InvoiceForm clinic={clinic} pets={pets} services={services} mode="create" />
      {onCancel && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-xl px-4 py-2 font-medium text-gray-600 transition-colors hover:bg-gray-100"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  )
}
