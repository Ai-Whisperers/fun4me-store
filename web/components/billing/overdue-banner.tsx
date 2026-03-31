'use client'

/**
 * Overdue Invoice Banner
 *
 * Displays a soft warning banner when the clinic has overdue invoices.
 * This is part of the "soft enforcement" strategy - reminders but no feature restrictions.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, X, CreditCard, FileText } from 'lucide-react'

interface OverdueInvoice {
  id: string
  invoice_number: string
  total: number
  due_date: string
  days_overdue: number
}

interface OverdueBannerProps {
  clinic: string
}

export function OverdueBanner({ clinic }: OverdueBannerProps) {
  const [overdueInvoice, setOverdueInvoice] = useState<OverdueInvoice | null>(null)
  const [isDismissed, setIsDismissed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if banner was dismissed in this session
    const dismissed = sessionStorage.getItem('billing-banner-dismissed')
    if (dismissed) {
      setIsDismissed(true)
      setIsLoading(false)
      return
    }

    fetchOverdueInvoice()
  }, [])

  const fetchOverdueInvoice = async () => {
    try {
      const response = await fetch('/api/billing/overview')
      if (!response.ok) {
        setIsLoading(false)
        return
      }

      const data = await response.json()

      // Check if there's an overdue invoice
      if (data.outstanding_balance > 0 && data.overdue_invoices?.length > 0) {
        const invoice = data.overdue_invoices[0]
        const dueDate = new Date(invoice.due_date)
        const today = new Date()
        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000))

        setOverdueInvoice({
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          total: invoice.total,
          due_date: invoice.due_date,
          days_overdue: daysOverdue,
        })
      }
    } catch (error) {
      console.error('Error fetching billing status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    // Remember dismissal for this session only
    sessionStorage.setItem('billing-banner-dismissed', 'true')
  }

  if (isLoading || isDismissed || !overdueInvoice) {
    return null
  }

  // Determine urgency level
  const getUrgencyStyle = () => {
    if (overdueInvoice.days_overdue >= 30) {
      return {
        bg: 'bg-red-50 border-red-200',
        text: 'text-red-800',
        icon: 'text-red-500',
        button: 'bg-red-600 hover:bg-red-700 text-white',
      }
    }
    if (overdueInvoice.days_overdue >= 14) {
      return {
        bg: 'bg-orange-50 border-orange-200',
        text: 'text-orange-800',
        icon: 'text-orange-500',
        button: 'bg-orange-600 hover:bg-orange-700 text-white',
      }
    }
    return {
      bg: 'bg-yellow-50 border-yellow-200',
      text: 'text-yellow-800',
      icon: 'text-yellow-500',
      button: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    }
  }

  const style = getUrgencyStyle()

  const formatCurrency = (amount: number) => {
    return `₲${amount.toLocaleString('es-PY')}`
  }

  return (
    <div className={`${style.bg} border rounded-lg p-4 mb-4 relative`}>
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-black/5 transition-colors"
        aria-label="Cerrar"
      >
        <X className={`h-4 w-4 ${style.text}`} />
      </button>

      <div className="flex items-start gap-3 pr-8">
        <AlertTriangle className={`h-5 w-5 mt-0.5 flex-shrink-0 ${style.icon}`} />

        <div className="flex-1">
          <p className={`font-medium ${style.text}`}>
            {overdueInvoice.days_overdue >= 30
              ? 'Factura con mas de 30 dias de atraso'
              : overdueInvoice.days_overdue >= 14
                ? 'Factura pendiente de pago'
                : 'Tienes una factura vencida'}
          </p>

          <p className={`text-sm mt-1 ${style.text} opacity-90`}>
            La factura{' '}
            <span className="font-mono font-medium">{overdueInvoice.invoice_number}</span> por{' '}
            <span className="font-medium">{formatCurrency(overdueInvoice.total)}</span> esta
            vencida hace{' '}
            <span className="font-medium">
              {overdueInvoice.days_overdue} {overdueInvoice.days_overdue === 1 ? 'dia' : 'dias'}
            </span>
            . Por favor actualiza tu metodo de pago.
          </p>

          <div className="flex flex-wrap gap-2 mt-3">
            <Link
              href={`/${clinic}/dashboard/settings/billing/invoices/${overdueInvoice.id}`}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${style.button}`}
            >
              <FileText className="h-4 w-4" />
              Ver Factura
            </Link>

            <Link
              href={`/${clinic}/dashboard/settings/billing?pay=${overdueInvoice.id}`}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${style.button}`}
            >
              <CreditCard className="h-4 w-4" />
              Pagar Ahora
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Compact version for sidebar or narrow spaces
 */
export function OverdueBannerCompact({ clinic }: OverdueBannerProps) {
  const [hasOverdue, setHasOverdue] = useState(false)
  const [amount, setAmount] = useState(0)

  useEffect(() => {
    fetchOverdueStatus()
  }, [])

  const fetchOverdueStatus = async () => {
    try {
      const response = await fetch('/api/billing/overview')
      if (!response.ok) return

      const data = await response.json()
      if (data.outstanding_balance > 0) {
        setHasOverdue(true)
        setAmount(data.outstanding_balance)
      }
    } catch (error) {
      console.error('Error fetching billing status:', error)
    }
  }

  if (!hasOverdue) {
    return null
  }

  return (
    <Link
      href={`/${clinic}/dashboard/settings/billing`}
      className="flex items-center gap-2 px-3 py-2 text-sm bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800 hover:bg-yellow-100 transition-colors"
    >
      <AlertTriangle className="h-4 w-4 text-yellow-600" />
      <span>Factura pendiente: ₲{amount.toLocaleString('es-PY')}</span>
    </Link>
  )
}
