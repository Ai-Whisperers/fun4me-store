'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { SlideOver } from '@/components/ui/slide-over'
import { AppointmentForm } from './appointment-form'
import { InvoiceFormWrapper } from './invoice-form-wrapper'
import { LabOrderFormWrapper } from './lab-order-form-wrapper'
import { ClientInviteForm } from './client-invite-form'
import { VaccineRegistrationForm } from './vaccine-registration-form'
import { PetQuickAddForm } from './pet-quick-add-form'

type ActionType =
  | 'new'
  | 'new-appointment'
  | 'new-invoice'
  | 'new-lab'
  | 'new-client'
  | 'new-pet'
  | 'new-vaccine'

interface QuickActionsHandlerProps {
  clinic: string
}

export function QuickActionsHandler({
  clinic,
}: QuickActionsHandlerProps): React.ReactElement | null {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const [activeAction, setActiveAction] = useState<ActionType | null>(null)

  // Check for action param on mount and when params change
  useEffect(() => {
    const action = searchParams.get('action') as ActionType | null

    if (action) {
      // Determine which form to show based on current path and action
      if (action === 'new') {
        if (pathname.includes('/appointments')) {
          setActiveAction('new-appointment')
        } else if (pathname.includes('/invoices')) {
          setActiveAction('new-invoice')
        } else if (pathname.includes('/lab')) {
          setActiveAction('new-lab')
        } else if (pathname.includes('/clients')) {
          setActiveAction('new-client')
        } else if (pathname.includes('/vaccines')) {
          setActiveAction('new-vaccine')
        } else {
          // Default to appointment
          setActiveAction('new-appointment')
        }
      } else {
        setActiveAction(action)
      }
    }
  }, [searchParams, pathname])

  const handleClose = (): void => {
    setActiveAction(null)
    // Remove action param from URL
    const params = new URLSearchParams(searchParams.toString())
    params.delete('action')
    const newUrl = params.toString() ? `${pathname}?${params}` : pathname
    router.replace(newUrl, { scroll: false })
  }

  const handleSuccess = (): void => {
    handleClose()
    router.refresh()
  }

  // Slide-over configurations
  const slideOverConfig: Record<
    ActionType,
    { title: string; description: string; size: 'sm' | 'md' | 'lg' | 'xl' | 'full' }
  > = {
    new: { title: 'Nueva Cita', description: 'Agendar una cita', size: 'lg' },
    'new-appointment': {
      title: 'Nueva Cita',
      description: 'Agendar una cita para un paciente',
      size: 'lg',
    },
    'new-invoice': {
      title: 'Nueva Factura',
      description: 'Crear una factura para un cliente',
      size: 'full',
    },
    'new-lab': {
      title: 'Nueva Orden de Laboratorio',
      description: 'Crear una orden de laboratorio',
      size: 'full',
    },
    'new-client': { title: 'Nuevo Cliente', description: 'Registrar un nuevo cliente', size: 'lg' },
    'new-pet': { title: 'Nueva Mascota', description: 'Registrar una nueva mascota', size: 'lg' },
    'new-vaccine': {
      title: 'Registrar Vacuna',
      description: 'Agregar registro de vacunación',
      size: 'lg',
    },
  }

  const renderForm = (): React.ReactNode => {
    switch (activeAction) {
      case 'new':
      case 'new-appointment':
        return <AppointmentForm clinic={clinic} onSuccess={handleSuccess} onCancel={handleClose} />
      case 'new-invoice':
        return (
          <InvoiceFormWrapper clinic={clinic} onSuccess={handleSuccess} onCancel={handleClose} />
        )
      case 'new-lab':
        return (
          <LabOrderFormWrapper clinic={clinic} onSuccess={handleSuccess} onCancel={handleClose} />
        )
      case 'new-client':
        return <ClientInviteForm clinic={clinic} onSuccess={handleSuccess} onCancel={handleClose} />
      case 'new-pet':
        return <PetQuickAddForm clinic={clinic} onSuccess={handleSuccess} onCancel={handleClose} />
      case 'new-vaccine':
        return (
          <VaccineRegistrationForm
            clinic={clinic}
            onSuccess={handleSuccess}
            onCancel={handleClose}
          />
        )
      default:
        return null
    }
  }

  if (!activeAction) return null

  const config = slideOverConfig[activeAction] || slideOverConfig['new']

  return (
    <SlideOver
      isOpen={true}
      onClose={handleClose}
      title={config.title}
      description={config.description}
      size={config.size}
    >
      {renderForm()}
    </SlideOver>
  )
}
