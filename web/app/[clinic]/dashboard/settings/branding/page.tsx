'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Palette, Save, Loader2, CheckCircle, AlertCircle, Upload, Eye } from 'lucide-react'

interface ThemeColors {
  primary: { main: string; light: string; dark: string }
  secondary: { main: string }
  background: { default: string; paper: string; subtle: string }
  text: { primary: string; secondary: string }
}

interface BrandingSettings {
  logo_url: string
  favicon_url: string
  hero_image_url: string
  colors: ThemeColors
}

const colorPresets = [
  { name: 'Esmeralda', primary: '#10B981', secondary: '#059669' },
  { name: 'Azul Océano', primary: '#0EA5E9', secondary: '#0284C7' },
  { name: 'Púrpura Real', primary: '#8B5CF6', secondary: '#7C3AED' },
  { name: 'Rosa Coral', primary: '#F43F5E', secondary: '#E11D48' },
  { name: 'Naranja Cálido', primary: '#F97316', secondary: '#EA580C' },
  { name: 'Índigo', primary: '#6366F1', secondary: '#4F46E5' },
]

export default function BrandingSettingsPage(): React.ReactElement {
  const { clinic } = useParams() as { clinic: string }
  const [branding, setBranding] = useState<BrandingSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [previewColor, setPreviewColor] = useState<string | null>(null)

  useEffect(() => {
    const fetchBranding = async (): Promise<void> => {
      try {
        const res = await fetch(`/api/settings/branding?clinic=${clinic}`)
        if (res.ok) {
          const data = await res.json()
          setBranding(data)
        }
      } catch (error) {
        // Client-side error logging - only in development
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching branding:', error)
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchBranding()
  }, [clinic])

  const handleSave = async (): Promise<void> => {
    if (!branding) return

    setIsSaving(true)
    setSaveStatus('idle')

    try {
      const res = await fetch('/api/settings/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinic, ...branding }),
      })

      if (res.ok) {
        setSaveStatus('success')
        setTimeout(() => setSaveStatus('idle'), 3000)
      } else {
        setSaveStatus('error')
      }
    } catch (error) {
      // Client-side error logging - only in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Error saving branding:', error)
      }
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }

  const applyPreset = (preset: { primary: string; secondary: string }): void => {
    if (!branding) return
    setBranding({
      ...branding,
      colors: {
        ...branding.colors,
        primary: { ...branding.colors.primary, main: preset.primary },
        secondary: { ...branding.colors.secondary, main: preset.secondary },
      },
    })
  }

  const updateColor = (path: string, value: string): void => {
    if (!branding) return
    const [category, shade] = path.split('.')
    setBranding({
      ...branding,
      colors: {
        ...branding.colors,
        [category]: {
          ...branding.colors[category as keyof ThemeColors],
          [shade]: value,
        },
      },
    })
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    )
  }

  if (!branding) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
        <div className="text-center text-gray-500">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <p>No se pudieron cargar los ajustes de marca</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Color Presets */}
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4">
          <Palette className="h-5 w-5 text-[var(--primary)]" />
          <h2 className="font-semibold text-gray-900">Paleta de Colores</h2>
        </div>
        <div className="p-6">
          <p className="mb-4 text-sm text-gray-500">
            Selecciona un preset o personaliza los colores
          </p>
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
            {colorPresets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                onMouseEnter={() => setPreviewColor(preset.primary)}
                onMouseLeave={() => setPreviewColor(null)}
                className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 transition-all hover:border-gray-300 hover:shadow-sm"
              >
                <div
                  className="h-8 w-8 rounded-full shadow-inner"
                  style={{ backgroundColor: preset.primary }}
                />
                <span className="text-sm font-medium text-gray-700">{preset.name}</span>
              </button>
            ))}
          </div>

          {/* Custom Colors */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Color Primario</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={previewColor || branding.colors.primary.main}
                  onChange={(e) => updateColor('primary.main', e.target.value)}
                  className="h-12 w-12 cursor-pointer rounded-lg border border-gray-200"
                />
                <input
                  type="text"
                  value={branding.colors.primary.main}
                  onChange={(e) => updateColor('primary.main', e.target.value)}
                  className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 font-mono text-sm"
                  placeholder="#10B981"
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Color Secundario
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={branding.colors.secondary.main}
                  onChange={(e) => updateColor('secondary.main', e.target.value)}
                  className="h-12 w-12 cursor-pointer rounded-lg border border-gray-200"
                />
                <input
                  type="text"
                  value={branding.colors.secondary.main}
                  onChange={(e) => updateColor('secondary.main', e.target.value)}
                  className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 font-mono text-sm"
                  placeholder="#059669"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
          <div className="mb-3 flex items-center gap-2">
            <Eye className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Vista Previa</span>
          </div>
          <div className="flex gap-3">
            <button
              style={{ backgroundColor: previewColor || branding.colors.primary.main }}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white"
            >
              Botón Primario
            </button>
            <button
              style={{
                borderColor: previewColor || branding.colors.primary.main,
                color: previewColor || branding.colors.primary.main,
              }}
              className="rounded-lg border-2 bg-white px-4 py-2 text-sm font-medium"
            >
              Botón Secundario
            </button>
            <span
              style={{ color: previewColor || branding.colors.primary.main }}
              className="px-4 py-2 text-sm font-medium"
            >
              Texto con color
            </span>
          </div>
        </div>
      </div>

      {/* Logo & Images */}
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4">
          <Upload className="h-5 w-5 text-[var(--primary)]" />
          <h2 className="font-semibold text-gray-900">Logo e Imágenes</h2>
        </div>
        <div className="space-y-6 p-6">
          {/* Logo */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Logo (URL)</label>
            <div className="flex items-center gap-4">
              {branding.logo_url && (
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg bg-gray-100">
                  <img
                    src={branding.logo_url}
                    alt="Logo"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              )}
              <div className="flex-1">
                <input
                  type="url"
                  value={branding.logo_url || ''}
                  onChange={(e) => setBranding({ ...branding, logo_url: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5"
                  placeholder="https://ejemplo.com/logo.png"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Recomendado: PNG transparente, 200x60px mínimo
                </p>
              </div>
            </div>
          </div>

          {/* Favicon */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Favicon (URL)</label>
            <div className="flex items-center gap-4">
              {branding.favicon_url && (
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-gray-100">
                  <img
                    src={branding.favicon_url}
                    alt="Favicon"
                    className="h-8 w-8 object-contain"
                  />
                </div>
              )}
              <input
                type="url"
                value={branding.favicon_url || ''}
                onChange={(e) => setBranding({ ...branding, favicon_url: e.target.value })}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5"
                placeholder="https://ejemplo.com/favicon.ico"
              />
            </div>
          </div>

          {/* Hero Image */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Imagen Hero (URL)
            </label>
            <input
              type="url"
              value={branding.hero_image_url || ''}
              onChange={(e) => setBranding({ ...branding, hero_image_url: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5"
              placeholder="https://ejemplo.com/hero.jpg"
            />
            <p className="mt-1 text-xs text-gray-500">
              Imagen de fondo para la sección principal. Recomendado: 1920x1080px
            </p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center gap-2">
          {saveStatus === 'success' && (
            <>
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium text-green-600">Marca actualizada</span>
            </>
          )}
          {saveStatus === 'error' && (
            <>
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span className="text-sm font-medium text-red-600">Error al guardar</span>
            </>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-6 py-2.5 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar Cambios
        </button>
      </div>
    </div>
  )
}
