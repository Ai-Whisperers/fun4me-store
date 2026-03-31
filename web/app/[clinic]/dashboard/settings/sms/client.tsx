'use client'

/**
 * SMS Settings Client
 *
 * RES-001: Migrated to React Query for data fetching
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { staleTimes, gcTimes } from '@/lib/queries/utils'
import {
  Phone,
  Save,
  Send,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Settings,
  BarChart2,
  ExternalLink,
} from 'lucide-react'

interface SmsConfig {
  configured: boolean
  provider: string
  from_number: string | null
  api_key_set: boolean
  api_secret_set: boolean
}

interface SmsStats {
  stats: {
    total: number
    sent: number
    delivered: number
    failed: number
    total_cost: number
  }
  daily: Array<{ date: string; count: number }>
}

interface Props {
  clinic: string
  userPhone: string | null
}

export default function SmsSettings({ clinic: _clinic, userPhone }: Props) {
  const queryClient = useQueryClient()
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'config' | 'stats'>('config')

  // Form state
  const [formData, setFormData] = useState({
    sms_api_key: '',
    sms_api_secret: '',
    sms_from: '',
    test_phone: userPhone || '',
  })

  // React Query: Fetch config and stats
  const {
    data: dataResult,
    isLoading: loading,
  } = useQuery({
    queryKey: ['sms-settings'],
    queryFn: async (): Promise<{ config: SmsConfig | null; stats: SmsStats | null }> => {
      const [configRes, statsRes] = await Promise.all([
        fetch('/api/sms/config'),
        fetch('/api/sms?view=stats&days=30'),
      ])

      const config = configRes.ok ? await configRes.json() : null
      const stats = statsRes.ok ? await statsRes.json() : null

      return { config, stats }
    },
    staleTime: staleTimes.MEDIUM,
    gcTime: gcTimes.MEDIUM,
  })

  const config = dataResult?.config || null
  const stats = dataResult?.stats || null

  // Mutation: Save config
  const saveMutation = useMutation({
    mutationFn: async (data: { sms_api_key?: string; sms_api_secret?: string; sms_from?: string }) => {
      const res = await fetch('/api/sms/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Error al guardar')
      }

      return { json, warning: json.warning }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['sms-settings'] })
      setTestResult({
        success: true,
        message: result.warning || 'Configuración guardada correctamente',
      })
      setFormData({ ...formData, sms_api_key: '', sms_api_secret: '' })
    },
    onError: (err) => {
      setTestResult({ success: false, message: err instanceof Error ? err.message : 'Error al guardar' })
    },
  })

  // Mutation: Test SMS
  const testMutation = useMutation({
    mutationFn: async (testPhone: string) => {
      const res = await fetch('/api/sms/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test_phone: testPhone }),
      })

      const json = await res.json()

      return {
        success: res.ok,
        message: json.message || json.error,
      }
    },
    onSuccess: (result) => {
      setTestResult(result)
    },
    onError: () => {
      setTestResult({ success: false, message: 'Error al enviar prueba' })
    },
  })

  const saving = saveMutation.isPending
  const testing = testMutation.isPending

  const handleSave = async () => {
    setTestResult(null)
    await saveMutation.mutateAsync({
      sms_api_key: formData.sms_api_key || undefined,
      sms_api_secret: formData.sms_api_secret || undefined,
      sms_from: formData.sms_from || undefined,
    })
  }

  const handleTest = async () => {
    setTestResult(null)
    await testMutation.mutateAsync(formData.test_phone)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Configuración de SMS</h1>
          <p className="text-[var(--text-secondary)]">
            Integración con Twilio para envío de mensajes
          </p>
        </div>

        <div className="flex items-center gap-3">
          {config?.configured ? (
            <span className="flex items-center gap-2 rounded-full bg-green-100 px-3 py-1.5 text-sm font-medium text-green-700">
              <CheckCircle className="h-4 w-4" />
              Configurado
            </span>
          ) : (
            <span className="flex items-center gap-2 rounded-full bg-yellow-100 px-3 py-1.5 text-sm font-medium text-yellow-700">
              <AlertTriangle className="h-4 w-4" />
              No configurado
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('config')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 font-medium transition-colors ${
            activeTab === 'config'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Settings className="h-4 w-4" />
          Configuración
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 font-medium transition-colors ${
            activeTab === 'stats'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <BarChart2 className="h-4 w-4" />
          Estadísticas
        </button>
      </div>

      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-gray-100" />
      ) : (
        <>
          {/* Config Tab */}
          {activeTab === 'config' && (
            <div className="space-y-6">
              {/* Twilio Info */}
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6">
                <h3 className="mb-2 font-bold text-blue-900">Acerca de Twilio</h3>
                <p className="mb-4 text-sm text-blue-700">
                  Vetic usa Twilio para enviar mensajes SMS. Necesitarás una cuenta de Twilio con
                  un número de teléfono habilitado para SMS.
                </p>
                <a
                  href="https://www.twilio.com/console"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800"
                >
                  Ir a Twilio Console
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>

              {/* Current Config */}
              {config?.configured && (
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <h3 className="mb-4 font-bold text-gray-900">Configuración Actual</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-500">Proveedor</span>
                      <p className="font-medium">{config.provider}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Número de envío</span>
                      <p className="font-mono">{config.from_number || 'No configurado'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">API Key</span>
                      <p className="font-mono">
                        {config.api_key_set ? '••••••••' : 'No configurado'}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">API Secret</span>
                      <p className="font-mono">
                        {config.api_secret_set ? '••••••••' : 'No configurado'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Config Form */}
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <h3 className="mb-4 font-bold text-gray-900">
                  {config?.configured ? 'Actualizar Credenciales' : 'Configurar Twilio'}
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Account SID
                    </label>
                    <input
                      type="text"
                      value={formData.sms_api_key}
                      onChange={(e) => setFormData({ ...formData, sms_api_key: e.target.value })}
                      placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full rounded-xl border border-gray-200 px-4 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                    <p className="mt-1 text-xs text-gray-500">Encontrado en Twilio Console</p>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Auth Token
                    </label>
                    <input
                      type="password"
                      value={formData.sms_api_secret}
                      onChange={(e) => setFormData({ ...formData, sms_api_secret: e.target.value })}
                      placeholder="••••••••••••••••••••••••••••••••"
                      className="w-full rounded-xl border border-gray-200 px-4 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Número de Twilio (From)
                    </label>
                    <input
                      type="tel"
                      value={formData.sms_from}
                      onChange={(e) => setFormData({ ...formData, sms_from: e.target.value })}
                      placeholder="+1234567890"
                      className="w-full rounded-xl border border-gray-200 px-4 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Número de teléfono de Twilio en formato E.164
                    </p>
                  </div>

                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-2 font-medium text-white hover:opacity-90 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? 'Guardando...' : 'Guardar Configuración'}
                  </button>
                </div>
              </div>

              {/* Test SMS */}
              {config?.configured && (
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <h3 className="mb-4 font-bold text-gray-900">Enviar SMS de Prueba</h3>

                  <div className="flex gap-4">
                    <div className="flex-1">
                      <input
                        type="tel"
                        value={formData.test_phone}
                        onChange={(e) => setFormData({ ...formData, test_phone: e.target.value })}
                        placeholder="0981 123 456"
                        className="w-full rounded-xl border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                      />
                    </div>
                    <button
                      onClick={handleTest}
                      disabled={testing || !formData.test_phone}
                      className="flex items-center gap-2 rounded-xl bg-green-600 px-6 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                      {testing ? 'Enviando...' : 'Enviar Prueba'}
                    </button>
                  </div>
                </div>
              )}

              {/* Result Message */}
              {testResult && (
                <div
                  className={`flex items-center gap-3 rounded-2xl p-4 ${
                    testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle className="h-5 w-5 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 flex-shrink-0" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>
          )}

          {/* Stats Tab */}
          {activeTab === 'stats' && stats && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="mb-2 flex items-center gap-3">
                    <div className="rounded-xl bg-blue-100 p-2">
                      <Phone className="h-5 w-5 text-blue-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-500">Total (30d)</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{stats.stats.total}</p>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="mb-2 flex items-center gap-3">
                    <div className="rounded-xl bg-green-100 p-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-500">Entregados</span>
                  </div>
                  <p className="text-3xl font-bold text-green-600">{stats.stats.delivered}</p>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="mb-2 flex items-center gap-3">
                    <div className="rounded-xl bg-red-100 p-2">
                      <XCircle className="h-5 w-5 text-red-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-500">Fallidos</span>
                  </div>
                  <p className="text-3xl font-bold text-red-600">{stats.stats.failed}</p>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="mb-2 flex items-center gap-3">
                    <div className="rounded-xl bg-purple-100 p-2">
                      <BarChart2 className="h-5 w-5 text-purple-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-500">Tasa Éxito</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats.stats.total > 0
                      ? Math.round((stats.stats.delivered / stats.stats.total) * 100)
                      : 0}
                    %
                  </p>
                </div>
              </div>

              {/* Daily Chart */}
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <h3 className="mb-4 font-bold text-gray-900">Mensajes por Día (últimos 30 días)</h3>
                {stats.daily.length > 0 ? (
                  <div className="flex h-48 items-end gap-1">
                    {stats.daily.slice(-30).map((day, i) => {
                      const maxCount = Math.max(...stats.daily.map((d) => d.count))
                      const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0
                      return (
                        <div
                          key={i}
                          className="flex-1 rounded-t bg-[var(--primary)] opacity-80 transition-opacity hover:opacity-100"
                          style={{ height: `${Math.max(height, 2)}%` }}
                          title={`${day.date}: ${day.count} mensajes`}
                        />
                      )
                    })}
                  </div>
                ) : (
                  <p className="py-8 text-center text-gray-500">No hay datos para mostrar</p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
