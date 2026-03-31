'use client'

/**
 * Recent Tenants Table
 *
 * Shows recently registered clinics.
 */

import Link from 'next/link'
import { Building2, ArrowRight } from 'lucide-react'

interface Tenant {
  id: string
  name: string
  subscription_tier: string | null
  is_trial: boolean | null
  trial_end_date: string | null
  created_at: string
}

interface RecentTenantsTableProps {
  tenants: Tenant[]
}

const tierLabels: Record<string, string> = {
  gratis: 'Gratis',
  profesional: 'Profesional',
}

const tierColors: Record<string, string> = {
  gratis: 'bg-gray-100 text-gray-700',
  profesional: 'bg-purple-100 text-purple-700',
}

export function RecentTenantsTable({ tenants }: RecentTenantsTableProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-PY', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const getDaysRemaining = (endDateStr: string | null) => {
    if (!endDateStr) return null
    const endDate = new Date(endDateStr)
    const today = new Date()
    const diffTime = endDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Clínicas Recientes
        </h2>
        <Link
          href="/admin/tenants"
          className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Ver todas
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Clínica
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Plan
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Estado
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Registrado
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {tenants.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-sm text-gray-500">
                  No hay clínicas registradas todavía
                </td>
              </tr>
            ) : (
              tenants.map((tenant) => {
                const tier = tenant.subscription_tier || 'gratis'
                const daysRemaining = tenant.is_trial ? getDaysRemaining(tenant.trial_end_date) : null

                return (
                  <tr key={tenant.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                          <Building2 className="h-5 w-5 text-gray-500" />
                        </div>
                        <div>
                          <Link
                            href={`/admin/tenants/${tenant.id}`}
                            className="font-medium text-gray-900 hover:text-blue-600"
                          >
                            {tenant.name}
                          </Link>
                          <p className="text-xs text-gray-500">{tenant.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tierColors[tier] || tierColors.gratis}`}>
                        {tierLabels[tier] || tier}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {tenant.is_trial ? (
                        <div>
                          <span className="inline-flex rounded-full bg-orange-100 px-2.5 py-1 text-xs font-medium text-orange-700">
                            En prueba
                          </span>
                          {daysRemaining !== null && (
                            <p className="mt-1 text-xs text-gray-500">
                              {daysRemaining > 0
                                ? `${daysRemaining} días restantes`
                                : 'Prueba expirada'}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                          Activo
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500">
                      {formatDate(tenant.created_at)}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
