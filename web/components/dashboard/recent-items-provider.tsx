'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useRecentItems, RecentItem, RecentItemType } from '@/hooks/use-recent-items'

interface RecentItemsContextValue {
  items: RecentItem[]
  addItem: (item: Omit<RecentItem, 'timestamp'>) => void
  clearItems: () => void
  trackPatient: (id: string, name: string, species: string, ownerName?: string) => void
  trackClient: (id: string, name: string, email?: string) => void
  trackInvoice: (id: string, invoiceNumber: string, clientName?: string) => void
  trackAppointment: (id: string, petName: string, serviceName?: string) => void
  trackLabOrder: (id: string, petName: string) => void
}

const RecentItemsContext = createContext<RecentItemsContextValue | null>(null)

interface RecentItemsProviderProps {
  clinic: string
  children: ReactNode
}

export function RecentItemsProvider({
  clinic,
  children,
}: RecentItemsProviderProps): React.ReactElement {
  const { items, addItem, clearItems } = useRecentItems(clinic)

  // Convenience methods for common item types
  const trackPatient = (id: string, name: string, species: string, ownerName?: string): void => {
    addItem({
      id,
      type: 'patient',
      title: name,
      subtitle: ownerName ? `${species} · ${ownerName}` : species,
      href: `/${clinic}/portal/pets/${id}`,
    })
  }

  const trackClient = (id: string, name: string, email?: string): void => {
    addItem({
      id,
      type: 'client',
      title: name,
      subtitle: email,
      href: `/${clinic}/dashboard/clients/${id}`,
    })
  }

  const trackInvoice = (id: string, invoiceNumber: string, clientName?: string): void => {
    addItem({
      id,
      type: 'invoice',
      title: `Factura ${invoiceNumber}`,
      subtitle: clientName,
      href: `/${clinic}/dashboard/invoices/${id}`,
    })
  }

  const trackAppointment = (id: string, petName: string, serviceName?: string): void => {
    addItem({
      id,
      type: 'appointment',
      title: petName,
      subtitle: serviceName,
      href: `/${clinic}/dashboard/appointments/${id}`,
    })
  }

  const trackLabOrder = (id: string, petName: string): void => {
    addItem({
      id,
      type: 'lab-order',
      title: `Orden Lab - ${petName}`,
      href: `/${clinic}/dashboard/lab/${id}`,
    })
  }

  return (
    <RecentItemsContext.Provider
      value={{
        items,
        addItem,
        clearItems,
        trackPatient,
        trackClient,
        trackInvoice,
        trackAppointment,
        trackLabOrder,
      }}
    >
      {children}
    </RecentItemsContext.Provider>
  )
}

export function useRecentItemsContext(): RecentItemsContextValue {
  const context = useContext(RecentItemsContext)
  if (!context) {
    throw new Error('useRecentItemsContext must be used within a RecentItemsProvider')
  }
  return context
}

// Export types for convenience
export type { RecentItem, RecentItemType }
