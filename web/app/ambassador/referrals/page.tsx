'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { logger } from '@/lib/logger'
import {
  Users,
  ArrowLeft,
  Filter,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import Link from 'next/link'

interface Referral {
  id: string
  status: string
  referred_at: string
  trial_started_at: string | null
  converted_at: string | null
  subscription_amount: number | null
  commission_rate: number | null
  commission_amount: number | null
  payout_status: string
  tenant: { id: string; name: string; zone: string } | null
}

interface Pagination {
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export default function AmbassadorReferralsPage() {
  const router = useRouter()
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(0)
  const limit = 10

  const fetchReferrals = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(page * limit),
      })
      if (statusFilter) {
        params.set('status', statusFilter)
      }

      const res = await fetch(`/api/ambassador/referrals?${params}`)

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/ambassador/login')
          return
        }
        throw new Error('Error fetching referrals')
      }

      const data = await res.json()
      setReferrals(data.referrals || [])
      setPagination(data.pagination)
    } catch (error) {
      logger.error('Error loading referrals', {
        error: error instanceof Error ? error.message : 'Unknown error',
        page,
        limit,
        statusFilter
      })
    } finally {
      setIsLoading(false)
    }
  }, [limit, page, statusFilter, router])

  useEffect(() => {
    fetchReferrals()
  }, [fetchReferrals])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-PY', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const formatCurrency = (amount: number) => {
    return `Gs ${amount.toLocaleString('es-PY')}`
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: <Clock className="h-4 w-4" /> },
      trial_started: { bg: 'bg-blue-100', text: 'text-blue-800', icon: <AlertCircle className="h-4 w-4" /> },
      converted: { bg: 'bg-green-100', text: 'text-green-800', icon: <CheckCircle className="h-4 w-4" /> },
      expired: { bg: 'bg-gray-100', text: 'text-gray-800', icon: <XCircle className="h-4 w-4" /> },
    }
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      trial_started: 'En prueba',
      converted: 'Convertido',
      expired: 'Expirado',
    }
    const style = styles[status] || styles.pending
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${style.bg} ${style.text}`}>
        {style.icon}
        {labels[status] || status}
      </span>
    )
  }

  const totalPages = pagination ? Math.ceil(pagination.total / limit) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/ambassador" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-5 w-5" />
            <span>Volver al Panel</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mis Referidos</h1>
            <p className="text-gray-600">
              {pagination?.total || 0} referidos en total
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(0)
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Todos los estados</option>
              <option value="pending">Pendiente</option>
              <option value="trial_started">En prueba</option>
              <option value="converted">Convertido</option>
              <option value="expired">Expirado</option>
            </select>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white">
          {isLoading ? (
            <div className="animate-pulse p-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="mb-4 h-16 rounded-lg bg-gray-200" />
              ))}
            </div>
          ) : referrals.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Users className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-gray-500">
                {statusFilter ? 'No hay referidos con este estado' : 'Aún no tienes referidos'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-gray-100 bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Clínica
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Fecha
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Comisión
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {referrals.map((referral) => (
                      <tr key={referral.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                              <Users className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {referral.tenant?.name || 'Clínica'}
                              </p>
                              <p className="text-sm text-gray-500">
                                {referral.tenant?.zone || '-'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-gray-900">{formatDate(referral.referred_at)}</p>
                          {referral.converted_at && (
                            <p className="text-xs text-green-600">
                              Convertido: {formatDate(referral.converted_at)}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(referral.status)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {referral.commission_amount ? (
                            <div>
                              <p className="font-semibold text-green-600">
                                {formatCurrency(referral.commission_amount)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {referral.commission_rate}% de {formatCurrency(referral.subscription_amount || 0)}
                              </p>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
                  <p className="text-sm text-gray-600">
                    Mostrando {page * limit + 1} - {Math.min((page + 1) * limit, pagination?.total || 0)} de {pagination?.total || 0}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </button>
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!pagination?.hasMore}
                      className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Siguiente
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
