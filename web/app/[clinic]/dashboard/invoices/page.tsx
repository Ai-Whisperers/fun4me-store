import { createClient } from '@/lib/supabase/server'
import { requireStaff } from '@/lib/auth'
import Link from 'next/link'
import * as Icons from 'lucide-react'
import { InvoiceList } from '@/components/invoices/invoice-list'
import { getInvoices } from '@/app/actions/invoices'

interface Props {
  params: Promise<{ clinic: string }>
  searchParams: Promise<{ status?: string; page?: string }>
}

export default async function InvoicesPage({ params, searchParams }: Props) {
  const { clinic } = await params
  const { status, page } = await searchParams

  // SEC-009: Require staff authentication with tenant verification
  await requireStaff(clinic)

  const supabase = await createClient()

  // Fetch invoices
  const result = await getInvoices({
    clinic,
    status: status || 'all',
    page: parseInt(page || '1'),
    limit: 20,
  })

  if (!result.success) {
    return (
      <div className="mx-auto max-w-7xl p-6">
        <div
          className="rounded-lg p-4"
          style={{ backgroundColor: 'var(--status-error-bg)', color: 'var(--status-error-dark)' }}
        >
          {result.error}
        </div>
      </div>
    )
  }

  // Extract data from the ActionResult
  const invoices = result.data?.data || []
  const total = result.data?.total || 0
  const currentPage = parseInt(page || '1')
  const limit = 20

  // Calculate stats
  const stats = {
    total: invoices.length,
    draft: invoices.filter((i) => i.status === 'draft').length,
    pending: invoices.filter((i) => ['sent', 'partial'].includes(i.status)).length,
    paid: invoices.filter((i) => i.status === 'paid').length,
    overdue: invoices.filter((i) => i.status === 'overdue').length,
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Facturas</h1>
          <p className="text-[var(--text-secondary)]">Gestiona las facturas de la clínica</p>
        </div>

        <Link
          href={`/${clinic}/dashboard/invoices/new`}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-white transition-opacity hover:opacity-90"
        >
          <Icons.Plus className="h-4 w-4" />
          Nueva Factura
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-[var(--border-light)] bg-white p-4">
          <div className="mb-1 flex items-center gap-2 text-[var(--text-secondary)]">
            <Icons.FileEdit className="h-4 w-4" />
            <span className="text-xs font-medium">Borradores</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.draft}</p>
        </div>

        <div className="rounded-xl border border-[var(--border-light)] bg-white p-4">
          <div className="mb-1 flex items-center gap-2" style={{ color: 'var(--status-info)' }}>
            <Icons.Clock className="h-4 w-4" />
            <span className="text-xs font-medium">Pendientes</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.pending}</p>
        </div>

        <div className="rounded-xl border border-[var(--border-light)] bg-white p-4">
          <div className="mb-1 flex items-center gap-2" style={{ color: 'var(--status-success)' }}>
            <Icons.CheckCircle className="h-4 w-4" />
            <span className="text-xs font-medium">Pagadas</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.paid}</p>
        </div>

        <div className="rounded-xl border border-[var(--border-light)] bg-white p-4">
          <div className="mb-1 flex items-center gap-2" style={{ color: 'var(--status-error)' }}>
            <Icons.AlertCircle className="h-4 w-4" />
            <span className="text-xs font-medium">Vencidas</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.overdue}</p>
        </div>
      </div>

      {/* Invoice List */}
      <InvoiceList
        invoices={invoices}
        pagination={{ total, page: currentPage, limit }}
        clinic={clinic}
        currentStatus={status || 'all'}
      />
    </div>
  )
}
