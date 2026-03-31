'use client'

import { ShieldAlert, User, Clock, Monitor, Activity } from 'lucide-react'

interface AuditLog {
  id: string
  action: string
  resource: string
  details: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
  profiles: {
    email: string
    full_name: string
    role: string
  } | null
}

interface AuditLogsListProps {
  logs: AuditLog[]
}

export function AuditLogsList({ logs }: AuditLogsListProps): React.ReactElement {
  const getActionColor = (action: string): string => {
    if (action.includes('delete') || action.includes('remove')) return 'text-red-600 bg-red-100'
    if (action.includes('create') || action.includes('add')) return 'text-green-600 bg-green-100'
    if (action.includes('update') || action.includes('edit')) return 'text-blue-600 bg-blue-100'
    if (action.includes('login') || action.includes('auth')) return 'text-purple-600 bg-purple-100'
    return 'text-gray-600 bg-gray-100'
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('es-PY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-600">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Registro de Auditoría</h1>
          <p className="text-[var(--text-secondary)]">Seguimiento de acciones del sistema</p>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-1 flex items-center gap-2 text-blue-600">
            <Activity className="h-4 w-4" />
            <span className="text-xs font-medium">Total</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{logs.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-1 flex items-center gap-2 text-green-600">
            <Activity className="h-4 w-4" />
            <span className="text-xs font-medium">Creaciones</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">
            {logs.filter((l) => l.action.includes('create') || l.action.includes('add')).length}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-1 flex items-center gap-2 text-blue-600">
            <Activity className="h-4 w-4" />
            <span className="text-xs font-medium">Actualizaciones</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">
            {logs.filter((l) => l.action.includes('update') || l.action.includes('edit')).length}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-1 flex items-center gap-2 text-red-600">
            <Activity className="h-4 w-4" />
            <span className="text-xs font-medium">Eliminaciones</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">
            {logs.filter((l) => l.action.includes('delete') || l.action.includes('remove')).length}
          </p>
        </div>
      </div>

      {/* Logs */}
      {logs.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <ShieldAlert className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <p className="text-[var(--text-secondary)]">No hay registros de auditoria</p>
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="space-y-3 md:hidden">
            {logs.map((log) => (
              <div key={log.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${getActionColor(log.action)}`}
                  >
                    {log.action}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                    <Clock className="h-3 w-3" />
                    {formatDate(log.created_at)}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 flex-shrink-0 text-gray-400" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                        {log.profiles?.full_name || 'Sistema'}
                      </p>
                      <p className="truncate text-xs text-[var(--text-secondary)]">
                        {log.profiles?.email || '-'}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-[var(--text-primary)]">
                    <span className="text-[var(--text-secondary)]">Recurso:</span> {log.resource}
                  </div>
                  {log.ip_address && (
                    <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                      <Monitor className="h-3 w-3" />
                      {log.ip_address}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-gray-100 bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">
                      Accion
                    </th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">
                      Usuario
                    </th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">
                      Recurso
                    </th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">
                      Fecha
                    </th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">
                      IP
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="transition-colors hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${getActionColor(log.action)}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-[var(--text-primary)]">
                              {log.profiles?.full_name || 'Sistema'}
                            </p>
                            <p className="text-xs text-[var(--text-secondary)]">
                              {log.profiles?.email || '-'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-[var(--text-primary)]">{log.resource}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                          <Clock className="h-4 w-4" />
                          {formatDate(log.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                          <Monitor className="h-4 w-4" />
                          {log.ip_address || '-'}
                        </div>
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
