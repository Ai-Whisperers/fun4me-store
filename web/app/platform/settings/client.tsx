'use client'

/**
 * Platform Settings Client Component
 *
 * Manage platform-wide configuration and feature flags.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Settings,
  Shield,
  Bell,
  Palette,
  Globe,
  Save,
  RefreshCw,
  AlertCircle,
  Check,
} from 'lucide-react'

interface PlatformSetting {
  key: string
  value: unknown
  updated_at: string
  updated_by: string | null
}

interface SettingsSection {
  id: string
  title: string
  description: string
  icon: typeof Settings
  settings: {
    key: string
    label: string
    type: 'boolean' | 'string' | 'number' | 'select'
    options?: { value: string; label: string }[]
    description?: string
  }[]
}

const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: 'general',
    title: 'General',
    description: 'Configuración general de la plataforma',
    icon: Globe,
    settings: [
      {
        key: 'platform_name',
        label: 'Nombre de la plataforma',
        type: 'string',
        description: 'Nombre mostrado en el encabezado',
      },
      {
        key: 'support_email',
        label: 'Email de soporte',
        type: 'string',
        description: 'Email para consultas de soporte',
      },
      {
        key: 'maintenance_mode',
        label: 'Modo mantenimiento',
        type: 'boolean',
        description: 'Bloquea el acceso a usuarios no administradores',
      },
    ],
  },
  {
    id: 'security',
    title: 'Seguridad',
    description: 'Configuración de seguridad y autenticación',
    icon: Shield,
    settings: [
      {
        key: 'require_2fa_admins',
        label: 'Requerir 2FA para administradores',
        type: 'boolean',
        description: 'Obliga a los administradores a usar autenticación de dos factores',
      },
      {
        key: 'session_timeout_minutes',
        label: 'Timeout de sesión (minutos)',
        type: 'number',
        description: 'Tiempo de inactividad antes de cerrar sesión',
      },
      {
        key: 'max_login_attempts',
        label: 'Intentos máximos de login',
        type: 'number',
        description: 'Número de intentos antes de bloquear cuenta',
      },
    ],
  },
  {
    id: 'notifications',
    title: 'Notificaciones',
    description: 'Configuración de notificaciones por defecto',
    icon: Bell,
    settings: [
      {
        key: 'enable_email_notifications',
        label: 'Notificaciones por email',
        type: 'boolean',
        description: 'Habilita el envío de emails automáticos',
      },
      {
        key: 'enable_sms_notifications',
        label: 'Notificaciones por SMS',
        type: 'boolean',
        description: 'Habilita el envío de SMS (requiere integración)',
      },
      {
        key: 'enable_whatsapp_notifications',
        label: 'Notificaciones por WhatsApp',
        type: 'boolean',
        description: 'Habilita el envío de mensajes por WhatsApp',
      },
    ],
  },
  {
    id: 'appearance',
    title: 'Apariencia',
    description: 'Configuración visual por defecto',
    icon: Palette,
    settings: [
      {
        key: 'default_theme',
        label: 'Tema por defecto',
        type: 'select',
        options: [
          { value: 'light', label: 'Claro' },
          { value: 'dark', label: 'Oscuro' },
          { value: 'system', label: 'Sistema' },
        ],
      },
      {
        key: 'default_language',
        label: 'Idioma por defecto',
        type: 'select',
        options: [
          { value: 'es', label: 'Español' },
          { value: 'en', label: 'English' },
        ],
      },
    ],
  },
]

export function PlatformSettingsClient() {
  const [settings, setSettings] = useState<Record<string, unknown>>({})
  const [originalSettings, setOriginalSettings] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState('general')

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/platform/settings')
      if (!res.ok) {
        throw new Error('Error al cargar configuración')
      }
      const data: PlatformSetting[] = await res.json()

      const settingsMap: Record<string, unknown> = {}
      data.forEach((s) => {
        settingsMap[s.key] = s.value
      })
      setSettings(settingsMap)
      setOriginalSettings(settingsMap)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      // Only save changed settings
      const changedSettings = Object.entries(settings).filter(
        ([key, value]) => JSON.stringify(value) !== JSON.stringify(originalSettings[key])
      )

      for (const [key, value] of changedSettings) {
        const res = await fetch('/api/platform/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, value }),
        })

        if (!res.ok) {
          throw new Error(`Error al guardar ${key}`)
        }
      }

      setOriginalSettings({ ...settings })
      setSuccessMessage('Configuración guardada correctamente')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings)

  const updateSetting = (key: string, value: unknown) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const renderSettingInput = (setting: SettingsSection['settings'][0]) => {
    const value = settings[setting.key]

    switch (setting.type) {
      case 'boolean':
        return (
          <button
            type="button"
            onClick={() => updateSetting(setting.key, !value)}
            className={`relative h-6 w-11 rounded-full transition ${
              value ? 'bg-[var(--primary)]' : 'bg-[var(--border-light,#e5e7eb)]'
            }`}
          >
            <span
              className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition ${
                value ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        )
      case 'string':
        return (
          <input
            type="text"
            value={(value as string) || ''}
            onChange={(e) => updateSetting(setting.key, e.target.value)}
            className="w-full max-w-xs rounded-lg border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
          />
        )
      case 'number':
        return (
          <input
            type="number"
            value={(value as number) || 0}
            onChange={(e) => updateSetting(setting.key, parseInt(e.target.value) || 0)}
            className="w-24 rounded-lg border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
          />
        )
      case 'select':
        return (
          <select
            value={(value as string) || setting.options?.[0]?.value}
            onChange={(e) => updateSetting(setting.key, e.target.value)}
            className="rounded-lg border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
          >
            {setting.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    )
  }

  const currentSection = SETTINGS_SECTIONS.find((s) => s.id === activeSection)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Configuración</h1>
          <p className="text-[var(--text-muted)]">Configuración global de la plataforma</p>
        </div>
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar cambios
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-lg border border-[var(--status-error,#dc2626)] bg-[var(--status-error-bg,#fef2f2)] p-4 text-[var(--status-error,#dc2626)]">
          <AlertCircle className="mr-2 inline h-5 w-5" />
          {error}
        </div>
      )}

      {successMessage && (
        <div className="rounded-lg border border-[var(--status-success,#16a34a)] bg-[var(--status-success-bg,#dcfce7)] p-4 text-[var(--status-success,#16a34a)]">
          <Check className="mr-2 inline h-5 w-5" />
          {successMessage}
        </div>
      )}

      <div className="flex gap-6">
        {/* Sidebar */}
        <nav className="w-64 flex-shrink-0 space-y-1">
          {SETTINGS_SECTIONS.map((section) => {
            const Icon = section.icon
            const isActive = activeSection === section.id
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition ${
                  isActive
                    ? 'bg-[var(--primary)] text-white'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary,#f3f4f6)]'
                }`}
              >
                <Icon className="h-5 w-5" />
                {section.title}
              </button>
            )
          })}
        </nav>

        {/* Settings Panel */}
        <div className="flex-1 rounded-xl border border-[var(--border-light,#e5e7eb)] bg-[var(--bg-primary,#fff)] p-6">
          {currentSection && (
            <>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  {currentSection.title}
                </h2>
                <p className="text-sm text-[var(--text-muted)]">{currentSection.description}</p>
              </div>

              <div className="space-y-6">
                {currentSection.settings.map((setting) => (
                  <div
                    key={setting.key}
                    className="flex items-center justify-between border-b border-[var(--border-light,#e5e7eb)] pb-6 last:border-0 last:pb-0"
                  >
                    <div className="flex-1">
                      <label className="block font-medium text-[var(--text-primary)]">
                        {setting.label}
                      </label>
                      {setting.description && (
                        <p className="text-sm text-[var(--text-muted)]">{setting.description}</p>
                      )}
                    </div>
                    <div className="ml-4">{renderSettingInput(setting)}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
