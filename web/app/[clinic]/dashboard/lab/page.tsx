import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { logger } from '@/lib/logger'
import Link from 'next/link'
import * as Icons from 'lucide-react'
import { LabOrdersList } from '@/components/lab/lab-orders-list'
import { requireFeature } from '@/lib/features/server'
import { UpgradePromptServer } from '@/components/dashboard/upgrade-prompt-server'

interface Props {
  params: Promise<{ clinic: string }>
  searchParams: Promise<{ status?: string; q?: string }>
}

interface LabOrder {
  id: string
  order_number: string
  ordered_at: string
  status: string
  priority: string
  has_critical_values: boolean
  pets: {
    id: string
    name: string
    species: string
  }
}

export default async function LabOrdersPage({ params, searchParams }: Props) {
  const { clinic } = await params
  const { status: statusFilter, q: searchQuery } = await searchParams
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/${clinic}/portal/login`)
  }

  // Staff check
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['vet', 'admin'].includes(profile.role) || profile.tenant_id !== clinic) {
    redirect(`/${clinic}/portal/dashboard`)
  }

  // Feature gate: Laboratory requires 'laboratory' feature
  const featureError = await requireFeature(profile.tenant_id, 'laboratory')
  if (featureError) {
    return (
      <UpgradePromptServer
        feature="laboratory"
        title="Módulo de Laboratorio"
        description="Gestiona órdenes de laboratorio, registra resultados y rastrea valores críticos."
        clinic={clinic}
      />
    )
  }

  // Fetch lab orders with tenant filter
  const { data: orders, error } = await supabase
    .from('lab_orders')
    .select(
      `
      id,
      order_number,
      ordered_at,
      status,
      priority,
      has_critical_values,
      pets!inner(id, name, species)
    `
    )
    .eq('tenant_id', clinic)
    .order('ordered_at', { ascending: false })

  if (error) {
    logger.error('Error fetching lab orders', { error: error.message })
  }

  // Transform data - type the raw database row
  interface RawLabOrder {
    id: string
    order_number: string
    ordered_at: string
    status: string
    priority: string
    has_critical_values: boolean
    pets: { id: string; name: string; species: string } | Array<{ id: string; name: string; species: string }>
  }
  let labOrders: LabOrder[] = (orders || []).map((order: RawLabOrder) => ({
    id: order.id,
    order_number: order.order_number,
    ordered_at: order.ordered_at,
    status: order.status,
    priority: order.priority,
    has_critical_values: order.has_critical_values,
    pets: Array.isArray(order.pets) ? order.pets[0] : order.pets,
  }))

  // Apply search filter
  if (searchQuery) {
    const term = searchQuery.toLowerCase()
    labOrders = labOrders.filter(
      (order) =>
        order.pets?.name?.toLowerCase().includes(term) ||
        order.order_number?.toLowerCase().includes(term)
    )
  }

  // Apply status filter
  if (statusFilter && statusFilter !== 'all') {
    labOrders = labOrders.filter((order) => order.status === statusFilter)
  }

  // Calculate stats
  const stats = {
    pending: labOrders.filter((o) => o.status === 'ordered' || o.status === 'specimen_collected')
      .length,
    in_progress: labOrders.filter((o) => o.status === 'in_progress').length,
    completed: labOrders.filter((o) => o.status === 'completed').length,
    critical: labOrders.filter((o) => o.has_critical_values).length,
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-[var(--text-primary)]">
            Órdenes de Laboratorio
          </h1>
          <p className="text-[var(--text-secondary)]">
            Gestiona pruebas y resultados de laboratorio
          </p>
        </div>
        <Link
          href={`/${clinic}/dashboard/lab/new`}
          className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 font-medium text-white transition-opacity hover:opacity-90"
        >
          <Icons.Plus className="h-5 w-5" />
          Nueva Orden
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
        <Link
          href={`/${clinic}/dashboard/lab?status=ordered`}
          className={`rounded-xl border-2 p-4 transition-all ${
            statusFilter === 'ordered'
              ? 'bg-[var(--primary)]/5 border-[var(--primary)]'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--text-secondary)]">Pendientes</span>
            <Icons.Clock className="h-5 w-5" style={{ color: 'var(--status-info)' }} />
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.pending}</p>
        </Link>

        <Link
          href={`/${clinic}/dashboard/lab?status=in_progress`}
          className={`rounded-xl border-2 p-4 transition-all ${
            statusFilter === 'in_progress'
              ? 'bg-[var(--primary)]/5 border-[var(--primary)]'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--text-secondary)]">En Proceso</span>
            <Icons.Activity className="h-5 w-5" style={{ color: 'var(--status-warning)' }} />
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.in_progress}</p>
        </Link>

        <Link
          href={`/${clinic}/dashboard/lab?status=completed`}
          className={`rounded-xl border-2 p-4 transition-all ${
            statusFilter === 'completed'
              ? 'bg-[var(--primary)]/5 border-[var(--primary)]'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--text-secondary)]">Completados</span>
            <Icons.CheckCircle className="h-5 w-5" style={{ color: 'var(--status-success)' }} />
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.completed}</p>
        </Link>

        <Link
          href={`/${clinic}/dashboard/lab?critical=true`}
          className="rounded-xl border-2 border-gray-200 bg-white p-4 transition-all hover:border-gray-300"
          style={
            searchQuery === 'critical'
              ? {
                  borderColor: 'var(--status-error)',
                  backgroundColor: 'var(--status-error-bg)',
                }
              : undefined
          }
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--text-secondary)]">
              Valores Críticos
            </span>
            <Icons.AlertTriangle className="h-5 w-5" style={{ color: 'var(--status-error)' }} />
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.critical}</p>
        </Link>
      </div>

      {/* Lab Orders List with Search */}
      <LabOrdersList
        orders={labOrders}
        clinic={clinic}
        currentStatus={statusFilter || 'all'}
        currentSearch={searchQuery || ''}
      />
    </div>
  )
}
