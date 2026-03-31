'use client'

/**
 * Reminders Dashboard Component
 *
 * RES-001: Migrated to React Query for data fetching
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bell,
  Calendar,
  Mail,
  MessageSquare,
  Phone,
  RefreshCw,
  Play,
  Settings,
  Clock,
  CheckCircle,
  XCircle,
  Syringe,
  TrendingUp,
} from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { staleTimes, gcTimes } from '@/lib/queries/utils'

interface ReminderStats {
  reminders: {
    pending: number
    processing: number
    sent: number
    failed: number
    cancelled: number
    skipped: number
  }
  notifications: {
    total: number
    email: number
    sms: number
    whatsapp: number
    delivered: number
    failed: number
  }
  upcoming: {
    vaccines_due: number
    appointments_24h: number
  }
  recent_jobs: Array<{
    job_name: string
    status: string
    started_at: string
    duration_ms: number
  }>
}

interface Reminder {
  id: string
  type: string
  reference_type: string | null
  reference_id: string | null
  scheduled_at: string
  status: string
  attempts: number
  error_message: string | null
  created_at: string
  client: { id: string; full_name: string; email: string; phone: string } | null
  pet: { id: string; name: string } | null
}

interface ReminderRule {
  id: string
  name: string
  type: string
  days_offset: number
  time_of_day: string
  channels: string[]
  is_active: boolean
}

interface Props {
  clinic: string
  isAdmin: boolean
}

export default function RemindersDashboard({ clinic: _clinic, isAdmin }: Props) {
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'overview' | 'reminders' | 'rules'>('overview')
  const [statusFilter, setStatusFilter] = useState('all')

  // React Query: Fetch stats
  const {
    data: stats,
    isLoading: loadingStats,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['reminders', 'stats'],
    queryFn: async (): Promise<ReminderStats> => {
      const res = await fetch('/api/reminders/stats')
      if (!res.ok) throw new Error('Error al cargar estadísticas')
      return res.json()
    },
    staleTime: staleTimes.SHORT,
    gcTime: gcTimes.SHORT,
  })

  // React Query: Fetch reminders list
  const {
    data: remindersData,
    isLoading: loadingReminders,
    refetch: refetchReminders,
  } = useQuery({
    queryKey: ['reminders', 'list', statusFilter],
    queryFn: async (): Promise<Reminder[]> => {
      const res = await fetch(`/api/reminders?status=${statusFilter}&limit=50`)
      if (!res.ok) throw new Error('Error al cargar recordatorios')
      const data = await res.json()
      return data.data || []
    },
    enabled: activeTab === 'reminders' || activeTab === 'overview',
    staleTime: staleTimes.SHORT,
    gcTime: gcTimes.SHORT,
  })

  // React Query: Fetch rules (admin only)
  const {
    data: rulesData,
    isLoading: loadingRules,
    refetch: refetchRules,
  } = useQuery({
    queryKey: ['reminders', 'rules'],
    queryFn: async (): Promise<ReminderRule[]> => {
      const res = await fetch('/api/reminders/rules')
      if (!res.ok) throw new Error('Error al cargar reglas')
      const data = await res.json()
      return data.data || []
    },
    enabled: isAdmin && activeTab === 'rules',
    staleTime: staleTimes.MEDIUM,
    gcTime: gcTimes.MEDIUM,
  })

  const reminders = remindersData || []
  const rules = rulesData || []
  const loading = loadingStats || loadingReminders || loadingRules

  // Mutation: Trigger job
  const triggerMutation = useMutation({
    mutationFn: async (jobType: string) => {
      const res = await fetch('/api/reminders/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_type: jobType }),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Error al ejecutar')
      }

      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] })
    },
    onError: (err) => {
      showToast({ title: err instanceof Error ? err.message : 'Error al ejecutar job', variant: 'error' })
    },
  })

  // Mutation: Toggle rule
  const toggleRuleMutation = useMutation({
    mutationFn: async (rule: ReminderRule) => {
      const res = await fetch('/api/reminders/rules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rule.id, is_active: !rule.is_active }),
      })

      if (!res.ok) throw new Error('Error al actualizar regla')
      return { ...rule, is_active: !rule.is_active }
    },
    onSuccess: (updatedRule) => {
      queryClient.setQueryData<ReminderRule[]>(['reminders', 'rules'], (old) =>
        old?.map((r) => (r.id === updatedRule.id ? updatedRule : r)) || []
      )
    },
  })

  const fetchData = async () => {
    await Promise.all([refetchStats(), refetchReminders(), isAdmin ? refetchRules() : Promise.resolve()])
  }

  const triggerJob = (jobType: string) => {
    triggerMutation.mutate(jobType)
  }

  const toggleRule = (rule: ReminderRule) => {
    toggleRuleMutation.mutate(rule)
  }

  const triggering = triggerMutation.isPending ? triggerMutation.variables : null

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      processing: 'bg-blue-100 text-blue-700',
      sent: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      cancelled: 'bg-gray-100 text-gray-700',
      skipped: 'bg-gray-100 text-gray-500',
    }
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      processing: 'Procesando',
      sent: 'Enviado',
      failed: 'Fallido',
      cancelled: 'Cancelado',
      skipped: 'Omitido',
    }
    return (
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-bold ${styles[status] || 'bg-gray-100'}`}
      >
        {labels[status] || status}
      </span>
    )
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      vaccine_reminder: 'Vacuna',
      vaccine_overdue: 'Vacuna Vencida',
      appointment_reminder: 'Cita',
      appointment_confirmation: 'Confirmación',
      birthday: 'Cumpleaños',
      follow_up: 'Seguimiento',
      custom: 'Personalizado',
    }
    return labels[type] || type
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Sistema de Recordatorios
          </h1>
          <p className="text-[var(--text-secondary)]">
            Automatización de notificaciones para vacunas, citas y más
          </p>
        </div>

        <button
          onClick={fetchData}
          className="flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2 font-medium transition-colors hover:bg-gray-200"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { id: 'overview', label: 'Resumen', icon: TrendingUp },
          { id: 'reminders', label: 'Recordatorios', icon: Bell },
          ...(isAdmin ? [{ id: 'rules', label: 'Reglas', icon: Settings }] : []),
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {loading && !stats ? (
        <div className="h-96 w-full animate-pulse rounded-2xl bg-gray-100" />
      ) : (
        <>
          {/* Overview Tab */}
          {activeTab === 'overview' && stats && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="mb-2 flex items-center gap-3">
                    <div className="rounded-xl bg-yellow-100 p-2">
                      <Clock className="h-5 w-5 text-yellow-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-500">Pendientes</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{stats.reminders.pending}</p>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="mb-2 flex items-center gap-3">
                    <div className="rounded-xl bg-green-100 p-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-500">Enviados (30d)</span>
                  </div>
                  <p className="text-3xl font-bold text-green-600">{stats.reminders.sent}</p>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="mb-2 flex items-center gap-3">
                    <div className="rounded-xl bg-red-100 p-2">
                      <XCircle className="h-5 w-5 text-red-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-500">Fallidos</span>
                  </div>
                  <p className="text-3xl font-bold text-red-600">{stats.reminders.failed}</p>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="mb-2 flex items-center gap-3">
                    <div className="rounded-xl bg-purple-100 p-2">
                      <Mail className="h-5 w-5 text-purple-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-500">Notificaciones</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{stats.notifications.total}</p>
                </div>
              </div>

              {/* Channel Stats */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <h3 className="mb-4 font-bold text-gray-900">Notificaciones por Canal (30d)</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-blue-500" />
                        <span className="font-medium">Email</span>
                      </div>
                      <span className="font-bold">{stats.notifications.email}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-green-500" />
                        <span className="font-medium">SMS</span>
                      </div>
                      <span className="font-bold">{stats.notifications.sms}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <MessageSquare className="h-5 w-5 text-emerald-500" />
                        <span className="font-medium">WhatsApp</span>
                      </div>
                      <span className="font-bold">{stats.notifications.whatsapp}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <h3 className="mb-4 font-bold text-gray-900">Próximos a Vencer</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Syringe className="h-5 w-5 text-amber-500" />
                        <span className="font-medium">Vacunas (7 días)</span>
                      </div>
                      <span className="font-bold text-amber-600">
                        {stats.upcoming.vaccines_due}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-blue-500" />
                        <span className="font-medium">Citas (24 horas)</span>
                      </div>
                      <span className="font-bold text-blue-600">
                        {stats.upcoming.appointments_24h}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Manual Triggers */}
              {isAdmin && (
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <h3 className="mb-4 font-bold text-gray-900">Ejecutar Manualmente</h3>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => triggerJob('vaccine')}
                      disabled={triggering === 'vaccine'}
                      className="flex items-center gap-2 rounded-xl bg-amber-100 px-4 py-2 font-medium text-amber-700 hover:bg-amber-200 disabled:opacity-50"
                    >
                      <Play className="h-4 w-4" />
                      {triggering === 'vaccine'
                        ? 'Ejecutando...'
                        : 'Generar Recordatorios de Vacunas'}
                    </button>
                    <button
                      onClick={() => triggerJob('appointment')}
                      disabled={triggering === 'appointment'}
                      className="flex items-center gap-2 rounded-xl bg-blue-100 px-4 py-2 font-medium text-blue-700 hover:bg-blue-200 disabled:opacity-50"
                    >
                      <Play className="h-4 w-4" />
                      {triggering === 'appointment'
                        ? 'Ejecutando...'
                        : 'Generar Recordatorios de Citas'}
                    </button>
                    <button
                      onClick={() => triggerJob('process')}
                      disabled={triggering === 'process'}
                      className="flex items-center gap-2 rounded-xl bg-green-100 px-4 py-2 font-medium text-green-700 hover:bg-green-200 disabled:opacity-50"
                    >
                      <Play className="h-4 w-4" />
                      {triggering === 'process'
                        ? 'Procesando...'
                        : 'Procesar Cola de Notificaciones'}
                    </button>
                  </div>
                </div>
              )}

              {/* Recent Jobs */}
              {stats.recent_jobs.length > 0 && (
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <h3 className="mb-4 font-bold text-gray-900">Ejecuciones Recientes</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b text-xs uppercase text-gray-500">
                        <tr>
                          <th className="p-3 text-left">Job</th>
                          <th className="p-3 text-left">Estado</th>
                          <th className="p-3 text-left">Fecha</th>
                          <th className="p-3 text-right">Duración</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {stats.recent_jobs.map((job, i) => (
                          <tr key={i}>
                            <td className="p-3 font-medium">{job.job_name}</td>
                            <td className="p-3">
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                                  job.status === 'completed'
                                    ? 'bg-green-100 text-green-700'
                                    : job.status === 'failed'
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {job.status}
                              </span>
                            </td>
                            <td className="p-3 text-gray-500">
                              {new Date(job.started_at).toLocaleString()}
                            </td>
                            <td className="p-3 text-right font-mono text-gray-500">
                              {job.duration_ms}ms
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reminders Tab */}
          {activeTab === 'reminders' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  <option value="all">Todos los estados</option>
                  <option value="pending">Pendientes</option>
                  <option value="sent">Enviados</option>
                  <option value="failed">Fallidos</option>
                </select>
              </div>

              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="p-4 text-left">Tipo</th>
                      <th className="p-4 text-left">Cliente</th>
                      <th className="p-4 text-left">Mascota</th>
                      <th className="p-4 text-left">Programado</th>
                      <th className="p-4 text-center">Estado</th>
                      <th className="p-4 text-center">Intentos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {reminders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-500">
                          No hay recordatorios
                        </td>
                      </tr>
                    ) : (
                      reminders.map((reminder) => (
                        <tr key={reminder.id} className="hover:bg-gray-50">
                          <td className="p-4 font-medium">{getTypeLabel(reminder.type)}</td>
                          <td className="p-4">{reminder.client?.full_name || '-'}</td>
                          <td className="p-4">{reminder.pet?.name || '-'}</td>
                          <td className="p-4 text-gray-500">
                            {new Date(reminder.scheduled_at).toLocaleString()}
                          </td>
                          <td className="p-4 text-center">{getStatusBadge(reminder.status)}</td>
                          <td className="p-4 text-center font-mono">{reminder.attempts}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Rules Tab */}
          {activeTab === 'rules' && isAdmin && (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="p-4 text-left">Nombre</th>
                      <th className="p-4 text-left">Tipo</th>
                      <th className="p-4 text-left">Días</th>
                      <th className="p-4 text-left">Hora</th>
                      <th className="p-4 text-left">Canales</th>
                      <th className="p-4 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rules.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-500">
                          No hay reglas configuradas
                        </td>
                      </tr>
                    ) : (
                      rules.map((rule) => (
                        <tr key={rule.id} className="hover:bg-gray-50">
                          <td className="p-4 font-medium">{rule.name}</td>
                          <td className="p-4">{getTypeLabel(rule.type)}</td>
                          <td className="p-4">
                            {rule.days_offset < 0
                              ? `${Math.abs(rule.days_offset)} días antes`
                              : rule.days_offset > 0
                                ? `${rule.days_offset} días después`
                                : 'Mismo día'}
                          </td>
                          <td className="p-4 font-mono">{rule.time_of_day.slice(0, 5)}</td>
                          <td className="p-4">
                            <div className="flex gap-1">
                              {rule.channels.map((ch) => (
                                <span key={ch} className="rounded bg-gray-100 px-2 py-0.5 text-xs">
                                  {ch}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => toggleRule(rule)}
                              className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                                rule.is_active
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                              }`}
                            >
                              {rule.is_active ? 'Activo' : 'Inactivo'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
