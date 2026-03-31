'use client'

/**
 * Insurance Policies Page
 *
 * RES-001: Migrated to React Query for data fetching
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { staleTimes, gcTimes } from '@/lib/queries/utils'
import { Plus, Shield, CheckCircle2, XCircle, Calendar, type LucideIcon } from 'lucide-react'

interface Policy {
  id: string
  policy_number: string
  plan_name: string
  plan_type: string
  status: string
  effective_date: string
  expiration_date: string | null
  annual_limit: number | null
  deductible_amount: number | null
  coinsurance_percentage: number | null
  policyholder_name: string
  pets: {
    id: string
    name: string
    species: string
  }
  insurance_providers: {
    id: string
    name: string
    logo_url: string | null
  }
}

export default function InsurancePoliciesPage() {
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null)

  // React Query: Fetch policies
  const { data: policiesData, isLoading: loading } = useQuery({
    queryKey: ['insurance-policies'],
    queryFn: async (): Promise<{ data: Policy[] }> => {
      const response = await fetch('/api/insurance/policies')
      if (!response.ok) throw new Error('Error al cargar pólizas')
      return response.json()
    },
    staleTime: staleTimes.MEDIUM,
    gcTime: gcTimes.MEDIUM,
  })

  const policies = policiesData?.data || []

  const getStatusBadge = (status: string) => {
    const configs: { [key: string]: { label: string; color: string; icon: LucideIcon } } = {
      active: { label: 'Activa', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
      expired: { label: 'Expirada', color: 'bg-gray-100 text-gray-700', icon: XCircle },
      cancelled: { label: 'Cancelada', color: 'bg-red-100 text-red-700', icon: XCircle },
      suspended: { label: 'Suspendida', color: 'bg-yellow-100 text-yellow-700', icon: XCircle },
      pending: { label: 'Pendiente', color: 'bg-blue-100 text-blue-700', icon: Calendar },
    }

    const config = configs[status] || configs.active
    const Icon = config.icon

    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.color}`}
      >
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
    )
  }

  const getPlanTypeLabel = (type: string) => {
    const types: { [key: string]: string } = {
      accident_only: 'Solo Accidentes',
      accident_illness: 'Accidente y Enfermedad',
      comprehensive: 'Completo',
      wellness: 'Bienestar',
      custom: 'Personalizado',
    }
    return types[type] || type
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[var(--text-secondary)]">Cargando pólizas...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-default)] p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">Pólizas de Seguro</h1>
            <p className="mt-1 text-[var(--text-secondary)]">
              Gestión de pólizas de seguros de mascotas
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-md bg-[var(--primary)] px-4 py-2 text-white hover:opacity-90"
          >
            <Plus className="h-5 w-5" />
            Nueva Póliza
          </button>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Total Pólizas</p>
                <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
                  {policies.length}
                </p>
              </div>
              <div className="rounded-full bg-blue-50 p-3">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Activas</p>
                <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
                  {policies.filter((p) => p.status === 'active').length}
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
                <p className="text-sm text-[var(--text-secondary)]">Expiradas</p>
                <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
                  {policies.filter((p) => p.status === 'expired').length}
                </p>
              </div>
              <div className="rounded-full bg-gray-50 p-3">
                <Calendar className="h-6 w-6 text-gray-600" />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Aseguradoras</p>
                <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
                  {new Set(policies.map((p) => p.insurance_providers.id)).size}
                </p>
              </div>
              <div className="rounded-full bg-purple-50 p-3">
                <Shield className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Policies Grid */}
        {policies.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
            <Shield className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <p className="mb-4 text-[var(--text-secondary)]">No hay pólizas registradas</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 rounded-md bg-[var(--primary)] px-4 py-2 text-white hover:opacity-90"
            >
              <Plus className="h-5 w-5" />
              Agregar Primera Póliza
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {policies.map((policy) => (
              <div
                key={policy.id}
                className="cursor-pointer rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                onClick={() => setSelectedPolicy(policy)}
              >
                {/* Header */}
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {policy.insurance_providers.logo_url ? (
                      <img
                        src={policy.insurance_providers.logo_url}
                        alt={policy.insurance_providers.name}
                        className="h-10 w-10 object-contain"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                        <Shield className="h-5 w-5 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-[var(--text-primary)]">
                        {policy.insurance_providers.name}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">{policy.policy_number}</p>
                    </div>
                  </div>
                  {getStatusBadge(policy.status)}
                </div>

                {/* Pet Info */}
                <div className="mb-4 border-b border-gray-200 pb-4">
                  <p className="text-sm text-[var(--text-secondary)]">Mascota</p>
                  <p className="font-medium text-[var(--text-primary)]">{policy.pets.name}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{policy.pets.species}</p>
                </div>

                {/* Plan Details */}
                <div className="mb-4 space-y-2">
                  <div>
                    <p className="text-xs text-[var(--text-secondary)]">Plan</p>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {policy.plan_name || getPlanTypeLabel(policy.plan_type)}
                    </p>
                  </div>

                  {policy.annual_limit && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--text-secondary)]">Límite Anual</span>
                      <span className="font-medium text-[var(--text-primary)]">
                        Gs. {policy.annual_limit.toLocaleString('es-PY')}
                      </span>
                    </div>
                  )}

                  {policy.deductible_amount !== null && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--text-secondary)]">Deducible</span>
                      <span className="font-medium text-[var(--text-primary)]">
                        Gs. {policy.deductible_amount.toLocaleString('es-PY')}
                      </span>
                    </div>
                  )}

                  {policy.coinsurance_percentage !== null && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--text-secondary)]">Cobertura</span>
                      <span className="font-medium text-[var(--text-primary)]">
                        {policy.coinsurance_percentage}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Dates */}
                <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                  <div>
                    <p>Vigencia desde</p>
                    <p className="font-medium text-[var(--text-primary)]">
                      {new Date(policy.effective_date).toLocaleDateString('es-PY')}
                    </p>
                  </div>
                  {policy.expiration_date && (
                    <div className="text-right">
                      <p>Vence</p>
                      <p className="font-medium text-[var(--text-primary)]">
                        {new Date(policy.expiration_date).toLocaleDateString('es-PY')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Policy Detail Modal (Placeholder) */}
        {selectedPolicy && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
            onClick={() => setSelectedPolicy(null)}
          >
            <div
              className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="mb-4 text-2xl font-bold text-[var(--text-primary)]">
                Detalles de Póliza
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-[var(--text-secondary)]">Aseguradora</p>
                    <p className="font-medium text-[var(--text-primary)]">
                      {selectedPolicy.insurance_providers.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--text-secondary)]">Número de Póliza</p>
                    <p className="font-medium text-[var(--text-primary)]">
                      {selectedPolicy.policy_number}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Titular de la Póliza</p>
                  <p className="font-medium text-[var(--text-primary)]">
                    {selectedPolicy.policyholder_name}
                  </p>
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => setSelectedPolicy(null)}
                    className="w-full rounded-md bg-gray-200 px-4 py-2 text-[var(--text-primary)] hover:bg-gray-300"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Policy Modal (Placeholder) */}
        {showAddModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
            onClick={() => setShowAddModal(false)}
          >
            <div
              className="w-full max-w-2xl rounded-lg bg-white p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="mb-4 text-2xl font-bold text-[var(--text-primary)]">
                Nueva Póliza de Seguro
              </h2>
              <p className="mb-4 text-[var(--text-secondary)]">
                Formulario de creación de póliza (implementar componente separado)
              </p>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-full rounded-md bg-gray-200 px-4 py-2 text-[var(--text-primary)] hover:bg-gray-300"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
