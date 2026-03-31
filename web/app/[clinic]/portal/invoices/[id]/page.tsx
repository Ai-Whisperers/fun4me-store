import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  CreditCard,
  FileText,
} from 'lucide-react'
import { InvoiceActions } from '@/components/portal/invoice-actions'

interface Props {
  params: Promise<{ clinic: string; id: string }>
}

interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  total: number
}

interface Invoice {
  id: string
  invoice_number: string
  status: 'draft' | 'sent' | 'paid' | 'cancelled' | 'overdue'
  subtotal: number
  tax_amount: number
  tax_rate?: number
  discount_amount: number
  total: number
  notes: string | null
  due_date: string | null
  created_at: string
  paid_at: string | null
  pet_id: string | null
  invoice_items: InvoiceItem[]
}

const statusConfig = {
  draft: { label: 'Borrador', color: 'bg-gray-100 text-gray-700', icon: FileText },
  sent: { label: 'Enviada', color: 'bg-blue-100 text-blue-700', icon: Clock },
  paid: { label: 'Pagada', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  cancelled: { label: 'Cancelada', color: 'bg-red-100 text-red-700', icon: XCircle },
  overdue: { label: 'Vencida', color: 'bg-amber-100 text-amber-700', icon: Clock },
}

export default async function PortalInvoiceDetailPage({
  params,
}: Props): Promise<React.ReactElement> {
  const { clinic, id } = await params
  const supabase = await createClient()

  // Auth check - only invoice owner can view
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/${clinic}/portal/login`)
  }

  // Fetch invoice with items
  const { data: invoice, error } = await supabase
    .from('invoices')
    .select(
      `
      id,
      invoice_number,
      status,
      subtotal,
      tax_amount,
      tax_rate,
      discount_amount,
      total,
      notes,
      due_date,
      created_at,
      paid_at,
      pet_id,
      invoice_items (
        id,
        description,
        quantity,
        unit_price,
        total
      )
    `
    )
    .eq('id', id)
    .eq('tenant_id', clinic)
    .eq('client_id', user.id) // Only show invoices for this user
    .single()

  if (error || !invoice) {
    notFound()
  }

  const typedInvoice = invoice as unknown as Invoice

  // Fetch owner (current user) profile
  const { data: ownerProfile } = await supabase
    .from('profiles')
    .select('full_name, email, phone')
    .eq('id', user.id)
    .single()

  // Fetch pet info if linked
  let petInfo: { name: string; species: string } | undefined
  if (typedInvoice.pet_id) {
    const { data: pet } = await supabase
      .from('pets')
      .select('name, species')
      .eq('id', typedInvoice.pet_id)
      .single()
    if (pet) {
      petInfo = pet
    }
  }

  // Build invoice data for PDF
  const invoiceForPdf = {
    ...typedInvoice,
    owner: ownerProfile
      ? {
          full_name: ownerProfile.full_name || '',
          email: ownerProfile.email || '',
          phone: ownerProfile.phone || undefined,
        }
      : undefined,
    pet: petInfo,
  }
  const status = statusConfig[typedInvoice.status] || statusConfig.draft
  const StatusIcon = status.icon

  // Get clinic info
  const { data: tenant } = await supabase.from('tenants').select('name').eq('id', clinic).single()

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString('es-PY', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/${clinic}/portal/payments`}
          className="mb-4 inline-flex items-center gap-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Pagos
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-black text-[var(--text-primary)]">
              Factura {typedInvoice.invoice_number}
            </h1>
            <p className="mt-1 text-[var(--text-secondary)]">{tenant?.name || clinic}</p>
          </div>
          <div
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${status.color}`}
          >
            <StatusIcon className="h-4 w-4" />
            {status.label}
          </div>
        </div>
      </div>

      {/* Invoice Card */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {/* Invoice Meta */}
        <div className="grid grid-cols-2 gap-4 border-b border-gray-100 p-6 md:grid-cols-4">
          <div>
            <p className="mb-1 text-xs font-bold uppercase text-gray-400">Fecha</p>
            <p className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
              <Calendar className="h-4 w-4 text-gray-400" />
              {formatDate(typedInvoice.created_at)}
            </p>
          </div>
          {typedInvoice.due_date && (
            <div>
              <p className="mb-1 text-xs font-bold uppercase text-gray-400">Vencimiento</p>
              <p className="font-medium text-[var(--text-primary)]">
                {formatDate(typedInvoice.due_date)}
              </p>
            </div>
          )}
          {typedInvoice.paid_at && (
            <div>
              <p className="mb-1 text-xs font-bold uppercase text-gray-400">Pagado</p>
              <p className="flex items-center gap-2 font-medium text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                {formatDate(typedInvoice.paid_at)}
              </p>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="p-6">
          <h3 className="mb-4 text-sm font-bold uppercase text-gray-400">Detalle</h3>
          <div className="space-y-3">
            {typedInvoice.invoice_items?.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between border-b border-gray-50 py-3 last:border-0"
              >
                <div className="flex-1">
                  <p className="font-medium text-[var(--text-primary)]">{item.description}</p>
                  <p className="text-sm text-gray-500">
                    {item.quantity} x {formatCurrency(item.unit_price)}
                  </p>
                </div>
                <p className="font-bold text-[var(--text-primary)]">{formatCurrency(item.total)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="space-y-2 bg-gray-50 p-6">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span className="text-[var(--text-primary)]">
              {formatCurrency(typedInvoice.subtotal)}
            </span>
          </div>
          {typedInvoice.discount_amount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-green-600">Descuento</span>
              <span className="text-green-600">
                -{formatCurrency(typedInvoice.discount_amount)}
              </span>
            </div>
          )}
          {typedInvoice.tax_amount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">IVA</span>
              <span className="text-[var(--text-primary)]">
                {formatCurrency(typedInvoice.tax_amount)}
              </span>
            </div>
          )}
          <div className="flex justify-between border-t border-gray-200 pt-3">
            <span className="text-lg font-bold text-[var(--text-primary)]">Total</span>
            <span className="text-lg font-black text-[var(--primary)]">
              {formatCurrency(typedInvoice.total)}
            </span>
          </div>
        </div>

        {/* Notes */}
        {typedInvoice.notes && (
          <div className="border-t border-gray-100 p-6">
            <h3 className="mb-2 text-sm font-bold uppercase text-gray-400">Notas</h3>
            <p className="text-sm text-[var(--text-secondary)]">{typedInvoice.notes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3 border-t border-gray-100 p-6">
          <InvoiceActions invoice={invoiceForPdf} clinicName={tenant?.name || clinic} />
          {typedInvoice.status !== 'paid' && typedInvoice.status !== 'cancelled' && (
            <Link
              href={`/${clinic}/portal/payments?pay=${typedInvoice.id}`}
              className="ml-auto flex items-center gap-2 rounded-lg bg-[var(--primary)] px-6 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              <CreditCard className="h-4 w-4" />
              Pagar Ahora
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
