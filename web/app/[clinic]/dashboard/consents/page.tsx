'use client'

/**
 * Consents Page
 *
 * RES-001: Migrated to React Query for data fetching
 */

import type { JSX } from 'react'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { staleTimes, gcTimes } from '@/lib/queries/utils'
import {
  FileText,
  Search,
  Filter,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react'
import Link from 'next/link'

interface ConsentDocument {
  id: string
  status: string
  signed_at: string
  expires_at: string | null
  pet: {
    id: string
    name: string
  }
  owner: {
    id: string
    full_name: string
  }
  template: {
    id: string
    name: string
    category: string
  }
}

export default function ConsentsPage(): JSX.Element {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const router = useRouter()

  // React Query: Fetch consents
  const {
    data: consents = [],
    isLoading: loading,
  } = useQuery({
    queryKey: ['consents'],
    queryFn: async (): Promise<ConsentDocument[]> => {
      const response = await fetch('/api/consents')
      if (!response.ok) {
        throw new Error('Error al cargar consentimientos')
      }
      return response.json()
    },
    staleTime: staleTimes.SHORT,
    gcTime: gcTimes.SHORT,
  })

  // Filter consents using useMemo
  const filteredConsents = useMemo(() => {
    let filtered = [...consents]

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (consent) =>
          consent.pet.name.toLowerCase().includes(search) ||
          consent.owner.full_name.toLowerCase().includes(search) ||
          consent.template.name.toLowerCase().includes(search)
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((consent) => consent.status === statusFilter)
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((consent) => consent.template.category === categoryFilter)
    }

    return filtered
  }, [consents, searchTerm, statusFilter, categoryFilter])

  const getStatusBadge = (status: string): JSX.Element => {
    const statusConfig: Record<string, { color: string; icon: JSX.Element; label: string }> = {
      active: {
        color: 'bg-green-100 text-green-800',
        icon: <CheckCircle className="h-4 w-4" />,
        label: 'Activo',
      },
      expired: {
        color: 'bg-yellow-100 text-yellow-800',
        icon: <Clock className="h-4 w-4" />,
        label: 'Expirado',
      },
      revoked: {
        color: 'bg-red-100 text-red-800',
        icon: <XCircle className="h-4 w-4" />,
        label: 'Revocado',
      },
    }

    const config = statusConfig[status] || statusConfig.active

    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${config.color}`}
      >
        {config.icon}
        {config.label}
      </span>
    )
  }

  const getCategoryBadge = (category: string): JSX.Element => {
    const categoryLabels: Record<string, string> = {
      surgery: 'Cirugía',
      anesthesia: 'Anestesia',
      euthanasia: 'Eutanasia',
      boarding: 'Hospedaje',
      treatment: 'Tratamiento',
      vaccination: 'Vacunación',
      diagnostic: 'Diagnóstico',
      other: 'Otro',
    }

    return (
      <span className="bg-[var(--primary)]/10 inline-flex items-center rounded-md px-2 py-1 text-xs font-medium text-[var(--primary)]">
        {categoryLabels[category] || category}
      </span>
    )
  }

  const groupByStatus = (): Record<string, ConsentDocument[]> => {
    const grouped: Record<string, ConsentDocument[]> = {
      active: [],
      expired: [],
      revoked: [],
    }

    filteredConsents.forEach((consent) => {
      if (grouped[consent.status]) {
        grouped[consent.status].push(consent)
      }
    })

    return grouped
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-[var(--primary)]"></div>
            <p className="mt-4 text-[var(--text-secondary)]">Cargando consentimientos...</p>
          </div>
        </div>
      </div>
    )
  }

  const groupedConsents = groupByStatus()

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] md:text-3xl">
              Gestión de Consentimientos
            </h1>
            <p className="mt-1 text-[var(--text-secondary)]">
              Administra consentimientos informados de tus pacientes
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="./consents/templates"
              className="hover:bg-[var(--primary)]/10 border-[var(--primary)]/20 inline-flex items-center gap-2 rounded-lg border bg-[var(--bg-paper)] px-4 py-2 text-[var(--text-primary)] transition-colors"
            >
              <FileText className="h-4 w-4" />
              Plantillas
            </Link>
            <button
              onClick={() => router.push('./consents/new')}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-white transition-opacity hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Nuevo Consentimiento
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="border-[var(--primary)]/20 mb-6 rounded-lg border bg-[var(--bg-paper)] p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-[var(--text-secondary)]" />
            <input
              type="text"
              placeholder="Buscar por mascota, dueño o plantilla..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-[var(--primary)]/20 w-full rounded-lg border bg-[var(--bg-default)] py-2 pl-10 pr-4 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-[var(--text-secondary)]" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border-[var(--primary)]/20 w-full appearance-none rounded-lg border bg-[var(--bg-default)] py-2 pl-10 pr-4 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="expired">Expirados</option>
              <option value="revoked">Revocados</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="border-[var(--primary)]/20 w-full appearance-none rounded-lg border bg-[var(--bg-default)] px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            >
              <option value="all">Todas las categorías</option>
              <option value="surgery">Cirugía</option>
              <option value="anesthesia">Anestesia</option>
              <option value="euthanasia">Eutanasia</option>
              <option value="boarding">Hospedaje</option>
              <option value="treatment">Tratamiento</option>
              <option value="vaccination">Vacunación</option>
              <option value="diagnostic">Diagnóstico</option>
              <option value="other">Otro</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="border-[var(--primary)]/20 rounded-lg border bg-[var(--bg-paper)] p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {groupedConsents.active.length}
              </p>
              <p className="text-sm text-[var(--text-secondary)]">Activos</p>
            </div>
          </div>
        </div>

        <div className="border-[var(--primary)]/20 rounded-lg border bg-[var(--bg-paper)] p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-yellow-100 p-2">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {groupedConsents.expired.length}
              </p>
              <p className="text-sm text-[var(--text-secondary)]">Expirados</p>
            </div>
          </div>
        </div>

        <div className="border-[var(--primary)]/20 rounded-lg border bg-[var(--bg-paper)] p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-100 p-2">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {groupedConsents.revoked.length}
              </p>
              <p className="text-sm text-[var(--text-secondary)]">Revocados</p>
            </div>
          </div>
        </div>
      </div>

      {/* Consents List */}
      {filteredConsents.length === 0 ? (
        <div className="border-[var(--primary)]/20 rounded-lg border bg-[var(--bg-paper)] p-12 text-center">
          <div className="from-[var(--primary)]/10 to-[var(--accent)]/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br">
            <FileText className="h-8 w-8 text-[var(--primary)]" />
          </div>
          <h4 className="mb-2 text-lg font-bold text-[var(--text-primary)]">
            {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
              ? 'Sin resultados'
              : 'Sin consentimientos'}
          </h4>
          <p className="mx-auto mb-6 max-w-md text-[var(--text-secondary)]">
            {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
              ? 'No se encontraron consentimientos con los filtros aplicados. Prueba con otros criterios.'
              : 'Aún no tienes consentimientos registrados. Crea uno nuevo para empezar a gestionar los consentimientos informados de tus pacientes.'}
          </p>
          {!(searchTerm || statusFilter !== 'all' || categoryFilter !== 'all') && (
            <button
              onClick={() => router.push('./consents/new')}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Plus className="h-5 w-5" />
              Nuevo Consentimiento
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="space-y-3 md:hidden">
            {filteredConsents.map((consent) => (
              <Link
                key={consent.id}
                href={`./consents/${consent.id}`}
                className="border-[var(--primary)]/20 block rounded-lg border bg-[var(--bg-paper)] p-4 transition-colors hover:border-[var(--primary)]"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">{consent.pet.name}</p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {consent.owner.full_name}
                    </p>
                  </div>
                  {getStatusBadge(consent.status)}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-secondary)]">Plantilla</span>
                    <span className="ml-2 max-w-[60%] truncate text-right text-[var(--text-primary)]">
                      {consent.template.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-secondary)]">Categoria</span>
                    {getCategoryBadge(consent.template.category)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-secondary)]">Firmado</span>
                    <span className="text-[var(--text-primary)]">
                      {new Date(consent.signed_at).toLocaleDateString('es-PY')}
                    </span>
                  </div>
                  {consent.expires_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-secondary)]">Expira</span>
                      <span className="text-[var(--text-primary)]">
                        {new Date(consent.expires_at).toLocaleDateString('es-PY')}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="border-[var(--primary)]/20 hidden overflow-hidden rounded-lg border bg-[var(--bg-paper)] md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--primary)]/5">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                      Mascota / Dueño
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                      Plantilla
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                      Categoria
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                      Fecha Firma
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-[var(--primary)]/10 divide-y">
                  {filteredConsents.map((consent) => (
                    <tr key={consent.id} className="hover:bg-[var(--primary)]/5 transition-colors">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-[var(--text-primary)]">
                            {consent.pet.name}
                          </div>
                          <div className="text-sm text-[var(--text-secondary)]">
                            {consent.owner.full_name}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-[var(--text-primary)]">
                          {consent.template.name}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {getCategoryBadge(consent.template.category)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="text-sm text-[var(--text-primary)]">
                          {new Date(consent.signed_at).toLocaleDateString('es-PY')}
                        </div>
                        {consent.expires_at && (
                          <div className="text-xs text-[var(--text-secondary)]">
                            Expira: {new Date(consent.expires_at).toLocaleDateString('es-PY')}
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {getStatusBadge(consent.status)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <Link
                          href={`./consents/${consent.id}`}
                          className="text-[var(--primary)] hover:underline"
                        >
                          Ver detalles
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
