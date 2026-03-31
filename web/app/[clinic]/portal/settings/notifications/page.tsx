'use client'

/**
 * Notification Settings Page
 *
 * RES-001: Migrated to React Query for data fetching
 */

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { staleTimes, gcTimes } from '@/lib/queries/utils'
import {
  ArrowLeft,
  Mail,
  MessageSquare,
  Calendar,
  Syringe,
  Sparkles,
  Loader2,
  Check,
  AlertCircle,
} from 'lucide-react'

interface NotificationSettings {
  email_vaccine_reminders: boolean
  email_appointment_reminders: boolean
  email_promotions: boolean
  sms_vaccine_reminders: boolean
  sms_appointment_reminders: boolean
  whatsapp_enabled: boolean
}

const defaultSettings: NotificationSettings = {
  email_vaccine_reminders: true,
  email_appointment_reminders: true,
  email_promotions: false,
  sms_vaccine_reminders: false,
  sms_appointment_reminders: true,
  whatsapp_enabled: true,
}

export default function NotificationSettingsPage(): React.ReactElement {
  const params = useParams()
  const router = useRouter()
  const clinic = params?.clinic as string
  const queryClient = useQueryClient()

  const [localSettings, setLocalSettings] = useState<NotificationSettings | null>(null)
  const [saved, setSaved] = useState(false)

  // React Query: Fetch notification settings
  const { data: fetchedSettings, isLoading: loading } = useQuery({
    queryKey: ['notification-settings', clinic],
    queryFn: async (): Promise<NotificationSettings> => {
      const res = await fetch(`/api/user/notification-settings?clinic=${clinic}`)
      if (!res.ok) throw new Error('Error al cargar configuración')
      return res.json()
    },
    staleTime: staleTimes.LONG,
    gcTime: gcTimes.LONG,
  })

  // Use local settings if modified, otherwise use fetched data
  const settings = localSettings || fetchedSettings || defaultSettings

  // Mutation: Save settings
  const saveMutation = useMutation({
    mutationFn: async (newSettings: NotificationSettings) => {
      const res = await fetch('/api/user/notification-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinic, settings: newSettings }),
      })
      if (!res.ok) throw new Error('Failed to save')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings', clinic] })
      setLocalSettings(null)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  const handleToggle = (key: keyof NotificationSettings) => {
    const newSettings = { ...settings, [key]: !settings[key] }
    setLocalSettings(newSettings)
    setSaved(false)
  }

  const handleSave = () => {
    saveMutation.mutate(settings)
  }

  const saving = saveMutation.isPending
  const error = saveMutation.error ? 'Error al guardar. Intenta de nuevo.' : null

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-subtle)]">
      <div className="container mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Link
            href={`/${clinic}/portal/dashboard`}
            className="rounded-xl p-2 transition-colors hover:bg-white"
            aria-label="Volver al dashboard"
          >
            <ArrowLeft className="h-6 w-6 text-[var(--text-secondary)]" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-[var(--text-primary)]">Notificaciones</h1>
            <p className="text-sm text-gray-500">Configura cómo quieres recibir alertas</p>
          </div>
        </div>

        {/* Email Notifications */}
        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
              <Mail className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Correo Electrónico</h2>
          </div>

          <div className="space-y-4">
            <label className="flex cursor-pointer items-center justify-between rounded-xl bg-gray-50 p-4 transition-colors hover:bg-gray-100">
              <div className="flex items-center gap-3">
                <Syringe className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-800">Recordatorios de vacunas</p>
                  <p className="text-sm text-gray-500">Cuando una vacuna está por vencer</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.email_vaccine_reminders}
                onChange={() => handleToggle('email_vaccine_reminders')}
                className="h-6 w-6 rounded text-[var(--primary)] focus:ring-[var(--primary)]"
              />
            </label>

            <label className="flex cursor-pointer items-center justify-between rounded-xl bg-gray-50 p-4 transition-colors hover:bg-gray-100">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-800">Recordatorios de citas</p>
                  <p className="text-sm text-gray-500">24 horas antes de tu cita</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.email_appointment_reminders}
                onChange={() => handleToggle('email_appointment_reminders')}
                className="h-6 w-6 rounded text-[var(--primary)] focus:ring-[var(--primary)]"
              />
            </label>

            <label className="flex cursor-pointer items-center justify-between rounded-xl bg-gray-50 p-4 transition-colors hover:bg-gray-100">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-800">Ofertas y promociones</p>
                  <p className="text-sm text-gray-500">Descuentos exclusivos</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.email_promotions}
                onChange={() => handleToggle('email_promotions')}
                className="h-6 w-6 rounded text-[var(--primary)] focus:ring-[var(--primary)]"
              />
            </label>
          </div>
        </div>

        {/* SMS/WhatsApp Notifications */}
        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
              <MessageSquare className="h-5 w-5 text-green-600" />
            </div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">SMS y WhatsApp</h2>
          </div>

          <div className="space-y-4">
            <label className="flex cursor-pointer items-center justify-between rounded-xl bg-gray-50 p-4 transition-colors hover:bg-gray-100">
              <div className="flex items-center gap-3">
                <Syringe className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-800">SMS de vacunas</p>
                  <p className="text-sm text-gray-500">Alertas por mensaje de texto</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.sms_vaccine_reminders}
                onChange={() => handleToggle('sms_vaccine_reminders')}
                className="h-6 w-6 rounded text-[var(--primary)] focus:ring-[var(--primary)]"
              />
            </label>

            <label className="flex cursor-pointer items-center justify-between rounded-xl bg-gray-50 p-4 transition-colors hover:bg-gray-100">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-800">SMS de citas</p>
                  <p className="text-sm text-gray-500">Confirmación y recordatorios</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.sms_appointment_reminders}
                onChange={() => handleToggle('sms_appointment_reminders')}
                className="h-6 w-6 rounded text-[var(--primary)] focus:ring-[var(--primary)]"
              />
            </label>

            <label className="flex cursor-pointer items-center justify-between rounded-xl bg-gray-50 p-4 transition-colors hover:bg-gray-100">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-800">WhatsApp habilitado</p>
                  <p className="text-sm text-gray-500">Recibir mensajes por WhatsApp</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.whatsapp_enabled}
                onChange={() => handleToggle('whatsapp_enabled')}
                className="h-6 w-6 rounded text-[var(--primary)] focus:ring-[var(--primary)]"
              />
            </label>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div
            role="alert"
            className="mb-6 flex items-center gap-2 rounded-xl bg-red-50 p-4 text-red-600"
          >
            <AlertCircle className="h-5 w-5" aria-hidden="true" />
            {error}
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex w-full items-center justify-center gap-2 rounded-xl py-4 font-bold transition-all ${
            saved ? 'bg-green-500 text-white' : 'bg-[var(--primary)] text-white hover:shadow-lg'
          }`}
        >
          {saving ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Guardando...
            </>
          ) : saved ? (
            <>
              <Check className="h-5 w-5" />
              Guardado
            </>
          ) : (
            'Guardar Cambios'
          )}
        </button>
      </div>
    </div>
  )
}
