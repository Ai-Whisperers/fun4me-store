'use client'

/**
 * Alert Settings Client
 *
 * RES-001: Migrated to React Query for data fetching
 */

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { staleTimes, gcTimes } from '@/lib/queries/utils'
import {
  Bell,
  Mail,
  MessageCircle,
  Package,
  Clock,
  AlertCircle,
  Save,
  Loader2,
  CheckCircle,
  ArrowLeft,
  Settings2,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'

interface AlertPreferences {
  id: string | null
  profile_id: string
  tenant_id: string
  low_stock_alerts: boolean
  expiry_alerts: boolean
  out_of_stock_alerts: boolean
  email_enabled: boolean
  whatsapp_enabled: boolean
  in_app_enabled: boolean
  low_stock_threshold: number
  expiry_days_warning: number
  notification_email: string | null
  notification_phone: string | null
  digest_frequency: string
}

interface AlertSettingsClientProps {
  clinic: string
}

const defaultPreferences: AlertPreferences = {
  id: null,
  profile_id: '',
  tenant_id: '',
  low_stock_alerts: true,
  expiry_alerts: true,
  out_of_stock_alerts: true,
  email_enabled: true,
  whatsapp_enabled: false,
  in_app_enabled: true,
  low_stock_threshold: 5,
  expiry_days_warning: 30,
  notification_email: null,
  notification_phone: null,
  digest_frequency: 'immediate',
}

export default function AlertSettingsClient({
  clinic,
}: AlertSettingsClientProps): React.ReactElement {
  const queryClient = useQueryClient()
  const [preferences, setPreferences] = useState<AlertPreferences>(defaultPreferences)
  const [success, setSuccess] = useState<string | null>(null)

  // React Query: Fetch preferences
  const {
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: ['alert-preferences'],
    queryFn: async (): Promise<AlertPreferences> => {
      const response = await fetch('/api/dashboard/alert-preferences')

      if (!response.ok) {
        throw new Error('Error al cargar preferencias')
      }

      const data = await response.json()
      const prefs = data.preferences || defaultPreferences
      setPreferences(prefs)
      return prefs
    },
    staleTime: staleTimes.MEDIUM,
    gcTime: gcTimes.MEDIUM,
  })

  // Mutation: Save preferences
  const saveMutation = useMutation({
    mutationFn: async (prefs: AlertPreferences) => {
      const response = await fetch('/api/dashboard/alert-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      })

      if (!response.ok) {
        throw new Error('Error al guardar preferencias')
      }

      return response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['alert-preferences'] })
      setPreferences(data.preferences)
      setSuccess('Preferencias guardadas correctamente')
      setTimeout(() => setSuccess(null), 3000)
    },
  })

  // Mutation: Reset preferences
  const resetMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/dashboard/alert-preferences', {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Error al restablecer preferencias')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-preferences'] })
      setPreferences(defaultPreferences)
      setSuccess('Preferencias restablecidas')
      setTimeout(() => setSuccess(null), 3000)
    },
  })

  const error = queryError?.message || saveMutation.error?.message || resetMutation.error?.message || null
  const saving = saveMutation.isPending

  const handleSave = async (): Promise<void> => {
    await saveMutation.mutateAsync(preferences)
  }

  const handleReset = async (): Promise<void> => {
    if (!confirm('¿Restablecer las preferencias a valores predeterminados?')) {
      return
    }
    await resetMutation.mutateAsync()
  }

  const updatePreference = <K extends keyof AlertPreferences>(
    key: K,
    value: AlertPreferences[K]
  ): void => {
    setPreferences((prev) => ({ ...prev, [key]: value }))
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-[var(--primary)]" />
          <p className="text-[var(--text-secondary)]">Cargando preferencias...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <Link
              href={`/${clinic}/dashboard/settings`}
              className="rounded-lg p-2 transition-colors hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-[var(--text-primary)]">
              <Bell className="h-7 w-7 text-[var(--primary)]" />
              Alertas de Inventario
            </h1>
          </div>
          <p className="ml-12 text-[var(--text-secondary)]">
            Configura cómo y cuándo recibir notificaciones sobre el inventario
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="rounded-xl px-4 py-2.5 font-medium text-gray-600 transition-colors hover:bg-gray-100"
          >
            Restablecer
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-700">
          <CheckCircle className="h-5 w-5" />
          {success}
        </div>
      )}

      {/* Alert Types */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--text-primary)]">
            <Settings2 className="h-5 w-5 text-gray-400" />
            Tipos de Alerta
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Selecciona qué tipo de alertas deseas recibir
          </p>
        </div>

        <div className="space-y-4 p-6">
          {/* Low Stock Alerts */}
          <label className="flex cursor-pointer items-start gap-4 rounded-xl border border-gray-100 p-4 transition-colors hover:bg-gray-50">
            <input
              type="checkbox"
              checked={preferences.low_stock_alerts}
              onChange={(e) => updatePreference('low_stock_alerts', e.target.checked)}
              className="mt-1 h-5 w-5 rounded border-gray-300 text-[var(--primary)] focus:ring-[var(--primary)]"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-orange-100 p-2">
                  <Package className="h-4 w-4 text-orange-600" />
                </div>
                <span className="font-semibold text-[var(--text-primary)]">Stock Bajo</span>
              </div>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Recibe alertas cuando productos tengan stock por debajo del mínimo
              </p>
              {preferences.low_stock_alerts && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm text-[var(--text-secondary)]">Umbral mínimo:</span>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={preferences.low_stock_threshold}
                    onChange={(e) =>
                      updatePreference('low_stock_threshold', Number(e.target.value))
                    }
                    className="focus:ring-[var(--primary)]/20 w-20 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-[var(--primary)] focus:ring-2"
                  />
                  <span className="text-sm text-[var(--text-secondary)]">unidades</span>
                </div>
              )}
            </div>
          </label>

          {/* Out of Stock Alerts */}
          <label className="flex cursor-pointer items-start gap-4 rounded-xl border border-gray-100 p-4 transition-colors hover:bg-gray-50">
            <input
              type="checkbox"
              checked={preferences.out_of_stock_alerts}
              onChange={(e) => updatePreference('out_of_stock_alerts', e.target.checked)}
              className="mt-1 h-5 w-5 rounded border-gray-300 text-[var(--primary)] focus:ring-[var(--primary)]"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-red-100 p-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                </div>
                <span className="font-semibold text-[var(--text-primary)]">Sin Stock</span>
              </div>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Recibe alertas inmediatas cuando un producto se quede sin stock
              </p>
            </div>
          </label>

          {/* Expiry Alerts */}
          <label className="flex cursor-pointer items-start gap-4 rounded-xl border border-gray-100 p-4 transition-colors hover:bg-gray-50">
            <input
              type="checkbox"
              checked={preferences.expiry_alerts}
              onChange={(e) => updatePreference('expiry_alerts', e.target.checked)}
              className="mt-1 h-5 w-5 rounded border-gray-300 text-[var(--primary)] focus:ring-[var(--primary)]"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-blue-100 p-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                </div>
                <span className="font-semibold text-[var(--text-primary)]">
                  Productos por Vencer
                </span>
              </div>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Recibe alertas sobre productos próximos a vencer
              </p>
              {preferences.expiry_alerts && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm text-[var(--text-secondary)]">Advertir con:</span>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={preferences.expiry_days_warning}
                    onChange={(e) =>
                      updatePreference('expiry_days_warning', Number(e.target.value))
                    }
                    className="focus:ring-[var(--primary)]/20 w-20 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-[var(--primary)] focus:ring-2"
                  />
                  <span className="text-sm text-[var(--text-secondary)]">días de anticipación</span>
                </div>
              )}
            </div>
          </label>
        </div>
      </div>

      {/* Notification Channels */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--text-primary)]">
            <Bell className="h-5 w-5 text-gray-400" />
            Canales de Notificación
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Elige cómo quieres recibir las alertas
          </p>
        </div>

        <div className="space-y-4 p-6">
          {/* Email */}
          <div className="flex items-start gap-4 rounded-xl border border-gray-100 p-4">
            <input
              type="checkbox"
              checked={preferences.email_enabled}
              onChange={(e) => updatePreference('email_enabled', e.target.checked)}
              className="mt-1 h-5 w-5 rounded border-gray-300 text-[var(--primary)] focus:ring-[var(--primary)]"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-purple-100 p-2">
                  <Mail className="h-4 w-4 text-purple-600" />
                </div>
                <span className="font-semibold text-[var(--text-primary)]">Correo Electrónico</span>
              </div>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Recibe alertas por correo electrónico
              </p>
              {preferences.email_enabled && (
                <div className="mt-3">
                  <input
                    type="email"
                    value={preferences.notification_email || ''}
                    onChange={(e) => updatePreference('notification_email', e.target.value || null)}
                    placeholder="Usar email de mi perfil"
                    className="focus:ring-[var(--primary)]/20 w-full max-w-sm rounded-xl border border-gray-200 px-4 py-2 text-sm focus:border-[var(--primary)] focus:ring-2"
                  />
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Deja vacío para usar el email de tu perfil
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* WhatsApp */}
          <div className="flex items-start gap-4 rounded-xl border border-gray-100 p-4">
            <input
              type="checkbox"
              checked={preferences.whatsapp_enabled}
              onChange={(e) => updatePreference('whatsapp_enabled', e.target.checked)}
              className="mt-1 h-5 w-5 rounded border-gray-300 text-[var(--primary)] focus:ring-[var(--primary)]"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-green-100 p-2">
                  <MessageCircle className="h-4 w-4 text-green-600" />
                </div>
                <span className="font-semibold text-[var(--text-primary)]">WhatsApp</span>
              </div>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Recibe alertas por WhatsApp
              </p>
              {preferences.whatsapp_enabled && (
                <div className="mt-3">
                  <input
                    type="tel"
                    value={preferences.notification_phone || ''}
                    onChange={(e) => updatePreference('notification_phone', e.target.value || null)}
                    placeholder="Ej: 0981123456"
                    className="focus:ring-[var(--primary)]/20 w-full max-w-sm rounded-xl border border-gray-200 px-4 py-2 text-sm focus:border-[var(--primary)] focus:ring-2"
                  />
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Número de WhatsApp para recibir alertas
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* In-App */}
          <label className="flex cursor-pointer items-start gap-4 rounded-xl border border-gray-100 p-4 transition-colors hover:bg-gray-50">
            <input
              type="checkbox"
              checked={preferences.in_app_enabled}
              onChange={(e) => updatePreference('in_app_enabled', e.target.checked)}
              className="mt-1 h-5 w-5 rounded border-gray-300 text-[var(--primary)] focus:ring-[var(--primary)]"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-indigo-100 p-2">
                  <Bell className="h-4 w-4 text-indigo-600" />
                </div>
                <span className="font-semibold text-[var(--text-primary)]">En la Aplicación</span>
              </div>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Ver alertas en el panel de control al iniciar sesión
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Frequency */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--text-primary)]">
            <Clock className="h-5 w-5 text-gray-400" />
            Frecuencia de Notificaciones
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            ¿Con qué frecuencia deseas recibir las alertas?
          </p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label
              className={`flex cursor-pointer flex-col items-center rounded-xl border-2 p-4 transition-all ${
                preferences.digest_frequency === 'immediate'
                  ? 'bg-[var(--primary)]/5 border-[var(--primary)]'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <input
                type="radio"
                name="digest_frequency"
                value="immediate"
                checked={preferences.digest_frequency === 'immediate'}
                onChange={(e) => updatePreference('digest_frequency', e.target.value)}
                className="sr-only"
              />
              <AlertCircle
                className={`mb-2 h-8 w-8 ${
                  preferences.digest_frequency === 'immediate'
                    ? 'text-[var(--primary)]'
                    : 'text-gray-400'
                }`}
              />
              <span className="font-semibold text-[var(--text-primary)]">Inmediato</span>
              <span className="mt-1 text-center text-xs text-[var(--text-secondary)]">
                Recibe alertas al instante
              </span>
            </label>

            <label
              className={`flex cursor-pointer flex-col items-center rounded-xl border-2 p-4 transition-all ${
                preferences.digest_frequency === 'daily'
                  ? 'bg-[var(--primary)]/5 border-[var(--primary)]'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <input
                type="radio"
                name="digest_frequency"
                value="daily"
                checked={preferences.digest_frequency === 'daily'}
                onChange={(e) => updatePreference('digest_frequency', e.target.value)}
                className="sr-only"
              />
              <Clock
                className={`mb-2 h-8 w-8 ${
                  preferences.digest_frequency === 'daily'
                    ? 'text-[var(--primary)]'
                    : 'text-gray-400'
                }`}
              />
              <span className="font-semibold text-[var(--text-primary)]">Diario</span>
              <span className="mt-1 text-center text-xs text-[var(--text-secondary)]">
                Resumen cada 24 horas
              </span>
            </label>

            <label
              className={`flex cursor-pointer flex-col items-center rounded-xl border-2 p-4 transition-all ${
                preferences.digest_frequency === 'weekly'
                  ? 'bg-[var(--primary)]/5 border-[var(--primary)]'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <input
                type="radio"
                name="digest_frequency"
                value="weekly"
                checked={preferences.digest_frequency === 'weekly'}
                onChange={(e) => updatePreference('digest_frequency', e.target.value)}
                className="sr-only"
              />
              <Bell
                className={`mb-2 h-8 w-8 ${
                  preferences.digest_frequency === 'weekly'
                    ? 'text-[var(--primary)]'
                    : 'text-gray-400'
                }`}
              />
              <span className="font-semibold text-[var(--text-primary)]">Semanal</span>
              <span className="mt-1 text-center text-xs text-[var(--text-secondary)]">
                Resumen cada 7 días
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Save Button (Mobile) */}
      <div className="sm:hidden">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-3 font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar Preferencias
        </button>
      </div>
    </div>
  )
}
