'use client'

/**
 * ConsentPreferenceCenter Component
 *
 * COMP-003: Main preference center for managing all consent preferences
 */

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { ConsentToggle } from './consent-toggle'
import {
  Settings,
  Mail,
  Shield,
  Camera,
  RefreshCw,
  Download,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import {
  CONSENT_TYPES,
  CONSENT_DESCRIPTIONS,
  REQUIRED_CONSENT_TYPES,
  MARKETING_CONSENT_TYPES,
  type ConsentType,
  type ConsentStatus,
} from '@/lib/consent'

interface PreferenceCenterProps {
  /** Initial consent status (for SSR) */
  initialStatus?: ConsentStatus
  /** Callback when preferences change */
  onPreferencesChange?: () => void
}

export function ConsentPreferenceCenter({
  initialStatus,
  onPreferencesChange,
}: PreferenceCenterProps) {
  const [status, setStatus] = useState<ConsentStatus | null>(initialStatus ?? null)
  const [loading, setLoading] = useState(!initialStatus)
  const [updating, setUpdating] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Fetch preferences on mount
  const fetchPreferences = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/consents/preferences?format=status')
      if (!response.ok) {
        throw new Error('Error al cargar preferencias')
      }
      const data = await response.json()
      setStatus(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!initialStatus) {
      fetchPreferences()
    }
  }, [fetchPreferences, initialStatus])

  // Handle preference toggle
  const handleToggle = async (consentType: ConsentType, granted: boolean) => {
    setUpdating((prev) => ({ ...prev, [consentType]: true }))
    setError(null)
    setSuccessMessage(null)

    try {
      const response = await fetch('/api/consents/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consentType, granted, source: 'settings' }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.details?.message || 'Error al actualizar preferencia')
      }

      const updatedPref = await response.json()

      // Update local state
      setStatus((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          preferences: {
            ...prev.preferences,
            [consentType]: updatedPref,
          },
          lastUpdated: new Date().toISOString(),
        }
      })

      setSuccessMessage('Preferencia actualizada correctamente')
      setTimeout(() => setSuccessMessage(null), 3000)

      onPreferencesChange?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setUpdating((prev) => ({ ...prev, [consentType]: false }))
    }
  }

  // Export consent data
  const handleExport = async () => {
    try {
      const response = await fetch('/api/consents/preferences/export')
      if (!response.ok) {
        throw new Error('Error al exportar datos')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `consent-data-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      setSuccessMessage('Datos exportados correctamente')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al exportar')
    }
  }

  // Get consent value
  const getConsentValue = (type: ConsentType): boolean => {
    return status?.preferences[type]?.granted ?? false
  }

  // Loading skeleton
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between py-4">
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-64" />
              </div>
              <Skeleton className="h-6 w-12 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Preferencias de Consentimiento
            </CardTitle>
            <CardDescription>
              Gestiona tus preferencias de comunicación y uso de datos
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchPreferences}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Success message */}
        {successMessage && (
          <Alert className="mb-4 bg-green-50 border-green-200">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-700">{successMessage}</AlertDescription>
          </Alert>
        )}

        {/* Error message */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="marketing">Marketing</TabsTrigger>
            <TabsTrigger value="privacy">Privacidad</TabsTrigger>
          </TabsList>

          {/* All preferences */}
          <TabsContent value="all" className="space-y-0">
            {Object.values(CONSENT_TYPES).map((type) => (
              <ConsentToggle
                key={type}
                consentType={type}
                label={CONSENT_DESCRIPTIONS[type]?.label ?? type}
                description={CONSENT_DESCRIPTIONS[type]?.description}
                checked={getConsentValue(type)}
                required={REQUIRED_CONSENT_TYPES.includes(type)}
                loading={updating[type]}
                onChange={(granted) => handleToggle(type, granted)}
              />
            ))}
          </TabsContent>

          {/* Marketing preferences */}
          <TabsContent value="marketing" className="space-y-0">
            <div className="flex items-center gap-2 pb-4 mb-2 border-b border-[var(--border-primary)]">
              <Mail className="w-5 h-5 text-[var(--primary)]" />
              <span className="text-sm font-medium text-[var(--text-primary)]">
                Preferencias de comunicación
              </span>
            </div>
            {MARKETING_CONSENT_TYPES.map((type) => (
              <ConsentToggle
                key={type}
                consentType={type}
                label={CONSENT_DESCRIPTIONS[type]?.label ?? type}
                description={CONSENT_DESCRIPTIONS[type]?.description}
                checked={getConsentValue(type)}
                loading={updating[type]}
                onChange={(granted) => handleToggle(type, granted)}
              />
            ))}
          </TabsContent>

          {/* Privacy preferences */}
          <TabsContent value="privacy" className="space-y-0">
            <div className="flex items-center gap-2 pb-4 mb-2 border-b border-[var(--border-primary)]">
              <Shield className="w-5 h-5 text-[var(--primary)]" />
              <span className="text-sm font-medium text-[var(--text-primary)]">
                Privacidad y datos
              </span>
            </div>
            <ConsentToggle
              consentType={CONSENT_TYPES.DATA_PROCESSING}
              label={CONSENT_DESCRIPTIONS[CONSENT_TYPES.DATA_PROCESSING]?.label ?? 'Procesamiento de datos'}
              description={CONSENT_DESCRIPTIONS[CONSENT_TYPES.DATA_PROCESSING]?.description}
              checked={getConsentValue(CONSENT_TYPES.DATA_PROCESSING)}
              required
              loading={updating[CONSENT_TYPES.DATA_PROCESSING]}
              onChange={(granted) => handleToggle(CONSENT_TYPES.DATA_PROCESSING, granted)}
            />
            <ConsentToggle
              consentType={CONSENT_TYPES.THIRD_PARTY_SHARING}
              label={CONSENT_DESCRIPTIONS[CONSENT_TYPES.THIRD_PARTY_SHARING]?.label ?? 'Compartir con terceros'}
              description={CONSENT_DESCRIPTIONS[CONSENT_TYPES.THIRD_PARTY_SHARING]?.description}
              checked={getConsentValue(CONSENT_TYPES.THIRD_PARTY_SHARING)}
              loading={updating[CONSENT_TYPES.THIRD_PARTY_SHARING]}
              onChange={(granted) => handleToggle(CONSENT_TYPES.THIRD_PARTY_SHARING, granted)}
            />
            <ConsentToggle
              consentType={CONSENT_TYPES.ANALYTICS_COOKIES}
              label={CONSENT_DESCRIPTIONS[CONSENT_TYPES.ANALYTICS_COOKIES]?.label ?? 'Cookies analíticas'}
              description={CONSENT_DESCRIPTIONS[CONSENT_TYPES.ANALYTICS_COOKIES]?.description}
              checked={getConsentValue(CONSENT_TYPES.ANALYTICS_COOKIES)}
              loading={updating[CONSENT_TYPES.ANALYTICS_COOKIES]}
              onChange={(granted) => handleToggle(CONSENT_TYPES.ANALYTICS_COOKIES, granted)}
            />
            <div className="flex items-center gap-2 py-4 mt-4 border-t border-[var(--border-primary)]">
              <Camera className="w-5 h-5 text-[var(--primary)]" />
              <span className="text-sm font-medium text-[var(--text-primary)]">
                Contenido multimedia
              </span>
            </div>
            <ConsentToggle
              consentType={CONSENT_TYPES.PHOTO_SHARING}
              label={CONSENT_DESCRIPTIONS[CONSENT_TYPES.PHOTO_SHARING]?.label ?? 'Compartir fotos'}
              description={CONSENT_DESCRIPTIONS[CONSENT_TYPES.PHOTO_SHARING]?.description}
              checked={getConsentValue(CONSENT_TYPES.PHOTO_SHARING)}
              loading={updating[CONSENT_TYPES.PHOTO_SHARING]}
              onChange={(granted) => handleToggle(CONSENT_TYPES.PHOTO_SHARING, granted)}
            />
          </TabsContent>
        </Tabs>

        {/* Last updated */}
        {status?.lastUpdated && (
          <p className="text-xs text-[var(--text-muted)] mt-4 pt-4 border-t border-[var(--border-primary)]">
            Última actualización: {new Date(status.lastUpdated).toLocaleString('es-PY')}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
