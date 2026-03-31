'use client'

/**
 * Insurance Dashboard Page
 *
 * RES-001: Migrated to React Query for data fetching
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { staleTimes, gcTimes } from '@/lib/queries/utils'
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Search,
} from 'lucide-react'
import ClaimStatusBadge from '@/components/insurance/claim-status-badge'

interface Claim {
  id: string
  claim_number: string
  status: string
  date_of_service: string
  diagnosis: string
  claimed_amount: number
  approved_amount: number | null
  paid_amount: number | null
  created_at: string
  pets: {
    name: string
    species: string
  }
  pet_insurance_policies: {
    policy_number: string
    insurance_providers: {
      name: string
      logo_url: string | null
    }
  }
}

interface DashboardStats {
  pending_count: number
  pending_value: number
  awaiting_docs_count: number
  recently_paid_count: number
  recently_paid_value: number
}

export default function InsuranceDashboardPage() {
  const router = useRouter()

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [searchTrigger, setSearchTrigger] = useState(0)

  // React Query: Fetch claims with filters
  const { data: claimsData, isLoading: claimsLoading, refetch: refetchClaims } = useQuery({
    queryKey: ['insurance-claims', statusFilter, searchTrigger],
    queryFn: async (): Promise<{ data: Claim[] }> => {
      const url = new URL('/api/insurance/claims', window.location.origin)
      if (statusFilter) {
        url.searchParams.set('status', statusFilter)
      }
      if (searchQuery) {
        url.searchParams.set('search', searchQuery)
      }
      const response = await fetch(url.toString())
      if (!response.ok) throw new Error('Error al cargar reclamos')
      return response.json()
    },
    staleTime: staleTimes.MEDIUM,
    gcTime: gcTimes.MEDIUM,
  })

  // React Query: Fetch all claims for stats calculation
  const { data: statsData } = useQuery({
    queryKey: ['insurance-claims-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      const response = await fetch('/api/insurance/claims?limit=1000')
      if (!response.ok) throw new Error('Error al cargar estadísticas')
      const result = await response.json()
      const allClaims: Claim[] = result.data || []

      const pendingClaims = allClaims.filter((c) =>
        ['submitted', 'under_review'].includes(c.status)
      )
      const awaitingDocsClaims = allClaims.filter((c) => c.status === 'pending_documents')
      const recentlyPaidClaims = allClaims.filter((c) => {
        if (c.status !== 'paid') return false
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        return new Date(c.created_at) >= thirtyDaysAgo
      })

      return {
        pending_count: pendingClaims.length,
        pending_value: pendingClaims.reduce((sum, c) => sum + (c.claimed_amount || 0), 0),
        awaiting_docs_count: awaitingDocsClaims.length,
        recently_paid_count: recentlyPaidClaims.length,
        recently_paid_value: recentlyPaidClaims.reduce((sum, c) => sum + (c.paid_amount || 0), 0),
      }
    },
    staleTime: staleTimes.MEDIUM,
    gcTime: gcTimes.MEDIUM,
  })

  const claims = claimsData?.data || []
  const stats = statsData || {
    pending_count: 0,
    pending_value: 0,
    awaiting_docs_count: 0,
    recently_paid_count: 0,
    recently_paid_value: 0,
  }
  const loading = claimsLoading

  const handleSearch = () => {
    setSearchTrigger((prev) => prev + 1)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[var(--text-secondary)]">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-default)] p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">Seguros</h1>
            <p className="mt-1 text-[var(--text-secondary)]">
              Gestión de reclamos y pólizas de seguro
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="./insurance/policies"
              className="rounded-md border border-[var(--primary)] px-4 py-2 text-[var(--primary)] transition-colors hover:bg-[var(--primary)] hover:text-white"
            >
              Ver Pólizas
            </Link>
            <Link
              href="./insurance/claims/new"
              className="flex items-center gap-2 rounded-md bg-[var(--primary)] px-4 py-2 text-white hover:opacity-90"
            >
              <Plus className="h-5 w-5" />
              Nuevo Reclamo
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Pendientes</p>
                <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
                  {stats.pending_count}
                </p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  Gs. {stats.pending_value.toLocaleString('es-PY')}
                </p>
              </div>
              <div className="rounded-full bg-blue-50 p-3">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Docs. Pendientes</p>
                <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
                  {stats.awaiting_docs_count}
                </p>
              </div>
              <div className="rounded-full bg-orange-50 p-3">
                <AlertCircle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Pagados (30d)</p>
                <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
                  {stats.recently_paid_count}
                </p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  Gs. {stats.recently_paid_value.toLocaleString('es-PY')}
                </p>
              </div>
              <div className="rounded-full bg-green-50 p-3">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Total Reclamos</p>
                <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
                  {claims.length}
                </p>
              </div>
              <div className="rounded-full bg-purple-50 p-3">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Buscar por número de reclamo, diagnóstico..."
                className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-4"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border border-gray-300 bg-white px-4 py-2"
              >
                <option value="">Todos los estados</option>
                <option value="draft">Borrador</option>
                <option value="pending_documents">Docs. Pendientes</option>
                <option value="submitted">Enviado</option>
                <option value="under_review">En Revisión</option>
                <option value="approved">Aprobado</option>
                <option value="denied">Denegado</option>
                <option value="paid">Pagado</option>
              </select>

              <button
                onClick={handleSearch}
                className="rounded-md bg-[var(--primary)] px-4 py-2 text-white hover:opacity-90"
              >
                Buscar
              </button>
            </div>
          </div>
        </div>

        {/* Claims List */}
        <div>
          <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Reclamos</h2>
          </div>

          {claims.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
              <FileText className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <p className="text-[var(--text-secondary)]">No se encontraron reclamos</p>
              <Link
                href="./insurance/claims/new"
                className="mt-4 inline-flex items-center gap-2 rounded-md bg-[var(--primary)] px-4 py-2 text-white hover:opacity-90"
              >
                <Plus className="h-5 w-5" />
                Crear Primer Reclamo
              </Link>
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="space-y-3 md:hidden">
                {claims.map((claim) => (
                  <Link
                    key={claim.id}
                    href={`./insurance/claims/${claim.id}`}
                    className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-[var(--primary)]"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-[var(--primary)]">{claim.claim_number}</p>
                        <p className="text-sm text-[var(--text-primary)]">{claim.pets.name}</p>
                      </div>
                      <ClaimStatusBadge status={claim.status} />
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[var(--text-secondary)]">Aseguradora</span>
                        <span className="text-[var(--text-primary)]">
                          {claim.pet_insurance_policies.insurance_providers.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-secondary)]">Fecha</span>
                        <span className="text-[var(--text-primary)]">
                          {new Date(claim.date_of_service).toLocaleDateString('es-PY')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-secondary)]">Reclamado</span>
                        <span className="font-medium text-[var(--text-primary)]">
                          Gs. {claim.claimed_amount.toLocaleString('es-PY')}
                        </span>
                      </div>
                      {claim.approved_amount && (
                        <div className="flex justify-between">
                          <span className="text-[var(--text-secondary)]">Aprobado</span>
                          <span className="font-medium text-green-600">
                            Gs. {claim.approved_amount.toLocaleString('es-PY')}
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="mt-3 truncate text-xs text-[var(--text-secondary)]">
                      {claim.diagnosis}
                    </p>
                  </Link>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm md:block">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[var(--text-secondary)]">
                          Numero
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[var(--text-secondary)]">
                          Mascota
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[var(--text-secondary)]">
                          Aseguradora
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[var(--text-secondary)]">
                          Diagnostico
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[var(--text-secondary)]">
                          Fecha Servicio
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase text-[var(--text-secondary)]">
                          Reclamado
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[var(--text-secondary)]">
                          Estado
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase text-[var(--text-secondary)]">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {claims.map((claim) => (
                        <tr key={claim.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <Link
                              href={`./insurance/claims/${claim.id}`}
                              className="font-medium text-[var(--primary)] hover:underline"
                            >
                              {claim.claim_number}
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-[var(--text-primary)]">
                                {claim.pets.name}
                              </p>
                              <p className="text-xs text-[var(--text-secondary)]">
                                {claim.pets.species}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-[var(--text-primary)]">
                              {claim.pet_insurance_policies.insurance_providers.name}
                            </p>
                            <p className="text-xs text-[var(--text-secondary)]">
                              {claim.pet_insurance_policies.policy_number}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="max-w-xs truncate text-sm text-[var(--text-primary)]">
                              {claim.diagnosis}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-[var(--text-primary)]">
                              {new Date(claim.date_of_service).toLocaleDateString('es-PY')}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <p className="text-sm font-medium text-[var(--text-primary)]">
                              Gs. {claim.claimed_amount.toLocaleString('es-PY')}
                            </p>
                            {claim.approved_amount && (
                              <p className="text-xs text-green-600">
                                Aprobado: Gs. {claim.approved_amount.toLocaleString('es-PY')}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <ClaimStatusBadge status={claim.status} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              href={`./insurance/claims/${claim.id}`}
                              className="text-sm text-[var(--primary)] hover:underline"
                            >
                              Ver Detalles
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
      </div>
    </div>
  )
}
